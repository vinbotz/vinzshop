import { db } from "./firebase.js";

import {
  doc,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const orderId = localStorage.getItem("orderId");

const paymentModal = document.getElementById("paymentModal");

const paymentContent = document.getElementById("paymentContent");

const refreshBtn = document.getElementById("refreshBtn");

let lastPaymentStatus = null;

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    location.reload();
  });
}

if (orderId) {
  const orderRef = doc(db, "orders", orderId);

  onSnapshot(orderRef, async (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    // Open payment modal when status becomes 'payment'
    if (data.status === "payment" && data.status !== lastPaymentStatus) {
      lastPaymentStatus = data.status;

      openPaymentModal(data);
    }

    // When admin marks as done and requests reset for customer, clear client state
    if (data.status === "completed" && data.resetForCustomer) {
      try {
        // close modal and clear payment UI
        if (paymentModal) paymentModal.classList.remove("active");
        if (paymentContent) paymentContent.innerHTML = "";

        const paymentSection = document.getElementById("paymentSection");
        const paymentArea = document.getElementById("paymentArea");
        const statusBox = document.getElementById("statusBox");
        const liveChatArea = document.getElementById("liveChatArea");

        if (paymentSection) paymentSection.innerHTML = "";
        if (paymentArea) paymentArea.innerHTML = "";
        if (liveChatArea) liveChatArea.innerHTML = "";
        if (statusBox)
          statusBox.innerHTML = `<div class="status-card">✅ Pesanan selesai. Anda dapat membuat order baru.</div>`;

        // remove local orderId so customer can create a new order and chat resets
        localStorage.removeItem("orderId");

        // acknowledge reset on server to avoid repeated triggers
        await updateDoc(orderRef, {
          resetForCustomer: false,
          paymentOpened: false,
        });

        // optional: reload so page scripts re-init without orderId
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        console.error("Failed to reset client after completion:", err);
      }
    }
  });
}

function openPaymentModal(data) {
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
      Rp ${data.total || "-"}
    </p>

    <div class="payment-buttons">

      <button
        onclick="
          selectPayment(
            'DANA'
          )
        "
      >
        💳 DANA
      </button>

      <button
        onclick="
          selectPayment(
            'GOPAY'
          )
        "
      >
        💳 GOPAY
      </button>

      <button
        onclick="
          selectPayment(
            'SPAY'
          )
        "
      >
        💳 SPAY
      </button>

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
      const base64File = e.target.result;

      await updateDoc(doc(db, "orders", orderId), {
        proofImage: base64File,
        proofFileName: file.name,
        paymentMethod: paymentMethod,
        proofSentAt: new Date().toISOString(),
        status: "payment_verified",
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
  paymentModal.classList.remove("active");
};

window.addEventListener("click", (e) => {
  if (e.target === paymentModal) {
    paymentModal.classList.remove("active");
  }
});
