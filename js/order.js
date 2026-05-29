import { db } from "./firebase.js";

import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { buildOrderEmbed, sendDiscordWebhook } from "./webhook.js";
import { initLiveChat, resetLiveChat } from "./chat.js";
import { formatTotal, getRegionLabel, lookupPrice } from "./pricing.js";

const paymentModal = document.getElementById("paymentModal");

const paymentContent = document.getElementById("paymentContent");

const refreshBtn = document.getElementById("refreshBtn");

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

let orderUnsubscribe = null;
let lastOrderData = null;
let paymentModalShown = false;
let idleCheckTimer = null;
let idleListenersAttached = false;

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    location.reload();
  });
}

function touchActivity() {
  if (localStorage.getItem("orderId")) {
    localStorage.setItem("orderLastActive", String(Date.now()));
  }
}

function stopIdleWatch() {
  if (idleCheckTimer) {
    clearInterval(idleCheckTimer);
    idleCheckTimer = null;
  }
}

function startIdleWatch() {
  if (!localStorage.getItem("orderId")) return;

  touchActivity();

  if (!idleListenersAttached) {
    ["mousemove", "keydown", "click", "touchstart", "scroll"].forEach(
      (eventName) => {
        document.addEventListener(eventName, touchActivity, { passive: true });
      },
    );
    idleListenersAttached = true;
  }

  if (idleCheckTimer) return;

  idleCheckTimer = setInterval(() => {
    const orderId = localStorage.getItem("orderId");
    if (!orderId) return;

    const lastActive = Number(localStorage.getItem("orderLastActive") || 0);
    if (lastActive && Date.now() - lastActive > IDLE_TIMEOUT_MS) {
      resetCustomerSession({
        redirectToIndex: true,
      });
    }
  }, IDLE_CHECK_INTERVAL_MS);
}

function resetCustomerSession({ redirectToIndex = false, showMessage = "" } = {}) {
  if (orderUnsubscribe) {
    orderUnsubscribe();
    orderUnsubscribe = null;
  }

  stopIdleWatch();
  resetLiveChat();

  localStorage.removeItem("orderId");
  localStorage.removeItem("orderLastActive");

  lastOrderData = null;
  paymentModalShown = false;

  if (paymentModal) paymentModal.classList.remove("active");
  if (paymentContent) paymentContent.innerHTML = "";

  const orderForm = document.getElementById("orderForm");
  const regionSelect = document.getElementById("region");
  const methodSelect = document.getElementById("method");
  const dynamicForm = document.getElementById("dynamicForm");
  const statusBox = document.getElementById("statusBox");
  const tutorialSelect = document.getElementById("tutorialSelect");
  const tutorialVideo = document.getElementById("tutorialVideo");
  const liveChatArea = document.getElementById("liveChatArea");

  if (orderForm) orderForm.reset();
  if (method) method.value = "";
  if (dynamicForm) dynamicForm.innerHTML = "";
  if (statusBox) {
    statusBox.innerHTML = showMessage
      ? `<div class="status-card">${showMessage}</div>`
      : "";
  }
  if (tutorialSelect) tutorialSelect.value = "";
  if (tutorialVideo) {
    tutorialVideo.pause();
    tutorialVideo.removeAttribute("src");
    tutorialVideo.load();
    tutorialVideo.style.display = "none";
  }
  if (liveChatArea) liveChatArea.innerHTML = "";

  if (redirectToIndex) {
    window.location.href = "index.html";
  }
}

function checkIdleOnLoad() {
  const orderId = localStorage.getItem("orderId");
  if (!orderId) return false;

  const lastActive = Number(localStorage.getItem("orderLastActive") || 0);
  if (lastActive && Date.now() - lastActive > IDLE_TIMEOUT_MS) {
    resetCustomerSession({ redirectToIndex: true });
    return true;
  }

  return false;
}

function updateStatusBox(data) {
  const statusBox = document.getElementById("statusBox");
  if (!statusBox) return;

  if (data.status === "pending") {
    statusBox.innerHTML = `<div class="status-card">⏳ Menunggu admin dicek... Silakan tetap di halaman ini.</div>`;
  } else if (data.status === "payment") {
    statusBox.innerHTML = `
      <div class="status-card">
        💳 Admin sudah mengirim tagihan pembayaran.
        <button type="button" class="btn-reopen-payment" onclick="reopenPaymentModal()">
          💳 Pilih Metode Pembayaran
        </button>
      </div>`;
  } else if (data.status === "payment_verified") {
    statusBox.innerHTML = `<div class="status-card">✔️ Bukti pembayaran terkirim. Menunggu verifikasi admin...</div>`;
  } else if (data.status === "completed") {
    statusBox.innerHTML = `<div class="status-card">✅ Pesanan selesai. Anda dapat membuat order baru.</div>`;
  }
}

function startOrderWatch(watchOrderId) {
  if (!watchOrderId) return;

  if (orderUnsubscribe) {
    orderUnsubscribe();
    orderUnsubscribe = null;
  }

  const orderRef = doc(db, "orders", watchOrderId);

  orderUnsubscribe = onSnapshot(orderRef, async (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    lastOrderData = data;

    updateStatusBox(data);

    if (data.status === "payment" && !paymentModalShown) {
      paymentModalShown = true;
      openPaymentModal(data);
    }

    if (data.status !== "payment") {
      paymentModalShown = false;
    }

    if (data.status === "completed" && data.resetForCustomer) {
      try {
        await updateDoc(orderRef, {
          resetForCustomer: false,
          paymentOpened: false,
        });

        resetCustomerSession({
          showMessage:
            "✅ Pesanan selesai! Form sudah direset. Silakan buat order baru.",
        });
      } catch (err) {
        console.error("Failed to reset client after completion:", err);
      }
    }
  });
}

if (!checkIdleOnLoad()) {
  const savedOrderId = localStorage.getItem("orderId");
  if (savedOrderId) {
    if (!localStorage.getItem("orderLastActive")) {
      localStorage.setItem("orderLastActive", String(Date.now()));
    }

    startOrderWatch(savedOrderId);
    initLiveChat(savedOrderId);
    startIdleWatch();
  }
}

window.reopenPaymentModal = () => {
  if (lastOrderData?.status === "payment") {
    openPaymentModal(lastOrderData);
  }
};

function openPaymentModal(data) {
  if (!paymentModal || !paymentContent) return;

  paymentModal.classList.add("active");

  paymentContent.innerHTML = `

    <h2>
      💳 Pilih Pembayaran
    </h2>

    <p>
      Pesanan:
      ${data.robux} Robux
    </p>

    <p>
      Total:
      ${formatTotal(data.region || "indo", data.total || 0)}
    </p>
    ${
      data.region === "malay"
        ? `<p style="color:#666;font-size:14px;">🇲🇾 Bayar melalui TNG eWallet. Lihat tutorial TNG di halaman order.</p>`
        : ""
    }

    <div class="payment-buttons">
      ${
        data.region === "malay"
          ? `
      <button onclick="selectPayment('TNG')" style="width:100%;">
        📱 Bayar via TNG
      </button>
      `
          : `
      <button onclick="selectPayment('DANA')">💳 DANA</button>
      <button onclick="selectPayment('GOPAY')">💳 GOPAY</button>
      <button onclick="selectPayment('SPAY')">💳 SPAY</button>
      `
      }
    </div>

    <button
      class="back-chat"
      onclick="
        closePaymentModal()
      "
    >
      🔙 Kembali Chat Live
    </button>

  `;
}

window.selectPayment = (payment) => {
  const oldBox = document.querySelector(".payment-box");

  if (oldBox) {
    oldBox.remove();
  }

  let html = "";

  if (payment === "DANA") {
    html = `

    <div class="payment-box">

      <h3>
        💳 DANA
      </h3>

      <img
        src="./assets/dana.png"
        width="100%"
        style="border-radius: 12px; margin-bottom: 15px;"
      >

      <p style="text-align: center; color: #666; margin-bottom: 15px;">
        Scan QR Code atau gunakan nomor rekening di atas
      </p>

      <input
        id="fileInput-DANA"
        type="file"
        accept="image/*"
        placeholder="Upload bukti transfer"
      >

      <button onclick="validateAndSendProof('DANA')" style="margin-top: 10px;">
        ✅ Kirim Bukti Transfer
      </button>

    </div>

    `;
  } else if (payment === "GOPAY") {
    html = `

    <div class="payment-box">

      <h3>
        💳 GoPay
      </h3>

      <img
        src="./assets/gopay.png"
        width="100%"
        style="border-radius: 12px; margin-bottom: 15px;"
      >

      <p style="text-align: center; color: #666; margin-bottom: 15px;">
        Scan QR Code atau gunakan nomor telepon di atas
      </p>

      <input
        id="fileInput-GOPAY"
        type="file"
        accept="image/*"
        placeholder="Upload bukti transfer"
      >

      <button onclick="validateAndSendProof('GOPAY')" style="margin-top: 10px;">
        ✅ Kirim Bukti Transfer
      </button>

    </div>

    `;
  } else if (payment === "TNG") {
    html = `

    <div class="payment-box">

      <h3>📱 TNG eWallet (Malaysia)</h3>

      <p style="text-align: center; color: #666; margin-bottom: 15px;">
        Transfer <strong>${formatTotal("malay", lastOrderData?.total || 0)}</strong> melalui TNG,
        kemudian upload screenshot bukti bayar di bawah.
      </p>

      <input
        id="fileInput-TNG"
        type="file"
        accept="image/*"
      >

      <button onclick="validateAndSendProof('TNG')" style="margin-top: 10px;">
        ✅ Upload Bukti TNG
      </button>

    </div>

    `;
  } else if (payment === "SPAY") {
    html = `

    <div class="payment-box">

      <h3>
        📱 ShopeePay
      </h3>

      <p style="text-align: center; color: #666; margin-bottom: 10px;">
        <strong>Nomor Rekening:</strong>
      </p>

      <div style="background: #fff0f7; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 15px;">
        <b style="font-size: 18px; color: #ff4fa0; letter-spacing: 2px;">
          085943133200
        </b>
      </div>

      <p style="text-align: center; color: #666; margin-bottom: 15px; font-size: 13px;">
        Transfer ke nomor di atas, kemudian upload bukti transfer
      </p>

      <input
        id="fileInput-SPAY"
        type="file"
        accept="image/*"
        placeholder="Upload bukti transfer"
      >

      <button onclick="validateAndSendProof('SPAY')" style="margin-top: 10px;">
        ✅ Kirim Bukti Transfer
      </button>

    </div>

    `;
  }

  paymentContent.innerHTML += html;
};

window.validateAndSendProof = (paymentMethod) => {
  const fileInput = document.getElementById(`fileInput-${paymentMethod}`);

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showModalAlert(
      "⚠️ Upload Bukti Transfer",
      "Mohon upload foto/screenshot bukti transfer terlebih dahulu!",
      "warning",
    );
    return false;
  }

  const file = fileInput.files[0];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (file.size > maxSize) {
    showModalAlert(
      "❌ Ukuran File Terlalu Besar",
      "Maksimal ukuran file adalah 5MB. Ukuran file Anda: " +
        (file.size / 1024 / 1024).toFixed(2) +
        "MB",
      "error",
    );
    return false;
  }

  // Convert file to base64 dan kirim ke Firebase
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const currentOrderId = localStorage.getItem("orderId");
      if (!currentOrderId) {
        showModalAlert(
          "❌ Order Tidak Ditemukan",
          "Sesi order tidak ditemukan. Silakan buat order baru.",
          "error",
        );
        return;
      }

      const base64File = e.target.result;

      await updateDoc(doc(db, "orders", currentOrderId), {
        proofImage: base64File,
        proofFileName: file.name,
        paymentMethod: paymentMethod,
        proofSentAt: new Date().toISOString(),
        status: "payment_verified",
      });

      // Discord notify
      await sendDiscordWebhook({
        embeds: [
          buildOrderEmbed({
            title: "✅ Bukti pembayaran terkirim",
            color: 0x2ecc71,
            fields: [
              { name: "Order ID", value: currentOrderId, inline: false },
              { name: "Metode Bayar", value: paymentMethod, inline: true },
              { name: "Status", value: "payment_verified", inline: true },
            ],
            footer: "VinzShop",
          }),
        ],
      });

      showModalAlert(
        "✅ Bukti Transfer Dikirim",
        `Bukti transfer ${paymentMethod} Anda telah dikirim!\n\nAdmin akan segera memverifikasi pembayaran Anda.\nTerima kasih!`,
        "success",
      );

      console.log("File uploaded successfully:", file.name);
    } catch (error) {
      showModalAlert(
        "❌ Gagal Mengirim",
        "Terjadi kesalahan saat mengirim bukti transfer. Silakan coba lagi.",
        "error",
      );
      console.error("Error uploading file:", error);
    }
  };

  reader.readAsDataURL(file);

  return true;
};

window.showModalAlert = (title, message, type = "info") => {
  let icon = "ℹ️";
  let bgColor = "#cfe2ff";
  let textColor = "#084298";
  let buttonBg = "#0d6efd";

  if (type === "warning") {
    icon = "⚠️";
    bgColor = "#fff3cd";
    textColor = "#856404";
    buttonBg = "#ffc107";
  } else if (type === "error") {
    icon = "❌";
    bgColor = "#f8d7da";
    textColor = "#842029";
    buttonBg = "#dc3545";
  } else if (type === "success") {
    icon = "✅";
    bgColor = "#d1e7dd";
    textColor = "#0f5132";
    buttonBg = "#198754";
  }

  const alertHTML = `
    <div class="modal-alert" style="background: ${bgColor}; border-left: 4px solid ${buttonBg}; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
      <h3 style="color: ${textColor}; margin: 0 0 10px 0; font-size: 18px;">
        ${icon} ${title}
      </h3>
      <p style="color: ${textColor}; margin: 0 0 15px 0; line-height: 1.6; white-space: pre-line;">
        ${message}
      </p>
      <button onclick="window.location.reload()" style="background: ${buttonBg}; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: opacity 0.3s;">
        👍 Mengerti
      </button>
    </div>
  `;

  paymentContent.innerHTML = alertHTML;
};

window.closePaymentModal = () => {
  if (paymentModal) paymentModal.classList.remove("active");
};

window.addEventListener("click", (e) => {
  if (e.target === paymentModal && paymentModal) {
    paymentModal.classList.remove("active");
  }
});

// Replace the above submit logic with deterministic doc id using setDoc
// (keeps admin panel + orderId consistent)

(function patchOrderSubmitDeterministic() {
  const orderForm = document.getElementById("orderForm");
  if (!orderForm) return;

  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const region = document.getElementById("region")?.value || "";
    const method = document.getElementById("method")?.value || "";
    const username = document.getElementById("username")?.value?.trim() || "";

    const robuxEl = document.getElementById("robux");
    const robuxRaw = robuxEl?.value || "";
    const robux = Number(String(robuxRaw).replace(/[^0-9]/g, ""));

    const password = document.getElementById("password")?.value?.trim() || "";
    const recovery = document.getElementById("recovery")?.value?.trim() || "";

    if (!region) return alert("Negara / region wajib dipilih");
    if (!method) return alert("Metode wajib dipilih");
    if (!username) return alert("Username wajib diisi");
    if (!robux || Number.isNaN(robux))
      return alert("Paket robux wajib dipilih");

    const priceInfo = lookupPrice(region, method, robux);
    if (!priceInfo) {
      return alert("Paket robux tidak valid. Silakan pilih ulang.");
    }

    const orderId =
      crypto && crypto.randomUUID && crypto.randomUUID()
        ? crypto.randomUUID()
        : `order_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    localStorage.setItem("orderId", orderId);
    localStorage.setItem("orderLastActive", String(Date.now()));

    const createdAt = new Date().toISOString();
    const total = priceInfo.total;

    const orderDocData = {
      username,
      region,
      method,
      robux,
      whatsapp: "-",
      status: "pending",
      createdAt,
      total,
      currency: priceInfo.currency,
      paymentOpened: false,
      resetForCustomer: false,
      ...(method === "VILOG" ? { password, recovery } : {}),
    };

    try {
      await setDoc(doc(db, "orders", orderId), orderDocData, { merge: false });

      await sendDiscordWebhook({
        embeds: [
          buildOrderEmbed({
            title: "🆕 Order dibuat",
            color: 0x00c2ff,
            fields: [
              { name: "Order ID", value: orderId, inline: false },
              { name: "Negara", value: getRegionLabel(region), inline: true },
              { name: "Username", value: username, inline: true },
              { name: "Metode", value: method, inline: true },
              { name: "Robux", value: String(robux), inline: true },
              {
                name: "Total",
                value: formatTotal(region, total),
                inline: true,
              },
            ],
          }),
        ],
      });

      startOrderWatch(orderId);
      initLiveChat(orderId);
      startIdleWatch();

      const statusBox = document.getElementById("statusBox");
      if (statusBox) {
        statusBox.innerHTML = `
          <div class="status-card">⏳ Menunggu admin dicek... Silakan tetap di halaman ini.</div>
        `;
      }
    } catch (err) {
      console.error("Failed to create order:", err);
      alert("❌ Gagal membuat order");
    }
  });
})();
