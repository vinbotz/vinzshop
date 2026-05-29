import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { buildOrderEmbed, sendDiscordWebhook } from "./webhook.js";
import { formatTotal, getRegionLabel } from "./pricing.js";

const ordersContainer = document.getElementById("ordersContainer");

const ordersRef = collection(db, "orders");

let allOrders = []; // Store all orders for export

onSnapshot(ordersRef, (snapshot) => {
  allOrders = []; // Reset orders

  ordersContainer.innerHTML = `
    <h1>📦 ADMIN PANEL</h1>
    <div class="admin-summary">
      <p>Total Pesanan: <strong>${snapshot.size}</strong></p>
      <button onclick="exportOrdersData()" style="background: white; color: #ff4fa0; border: 2px solid #ff4fa0; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: all 0.3s;">
        📊 Export Rekap Penjualan JSON
      </button>
    </div>
  `;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const orderId = docSnap.id;

    // Store for export
    allOrders.push({
      ...data,
      id: orderId,
    });

    const statusBadge = getStatusBadge(data.status);
    const proofSection = data.proofImage
      ? `
      <div class="proof-section">
        <h4>📸 Bukti Transfer</h4>
        <img src="${data.proofImage}" alt="Bukti Transfer" style="max-width: 100%; border-radius: 10px; margin: 10px 0;">
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button onclick="downloadProof('${orderId}', '${data.proofFileName}')" style="flex: 1; background: #0d6efd; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            ⬇️ Download Foto
          </button>
          <button onclick="markAsDone('${orderId}')" style="flex: 1; background: #28a745; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            ✅ Done
          </button>
        </div>
      </div>
      `
      : "";

    ordersContainer.innerHTML += `

        <div class="admin-order ${data.status === "payment_verified" ? "verified" : ""}">

          <div class="order-header">
            <h3>Order #${orderId}</h3>
            ${statusBadge}
          </div>

          <div class="order-info">
            <p><strong>🌍 Negara:</strong> ${data.region ? getRegionLabel(data.region) : "🇮🇩 Indonesia (Rupiah)"}</p>
            <p><strong>👤 Username:</strong> ${data.username}</p>
            <p><strong>💰 Robux:</strong> ${data.robux}</p>
            <p><strong>💳 Metode:</strong> ${data.method}</p>
            <p><strong>💵 Total:</strong> ${formatTotal(data.region || "indo", data.total || 0)}</p>
            <p><strong>📱 WhatsApp:</strong> ${data.whatsapp}</p>
            ${data.paymentMethod ? `<p><strong>💸 Metode Bayar:</strong> ${data.paymentMethod}</p>` : ""}
          </div>

          ${proofSection}

          <div class="order-actions">
            <button
              class="btn-payment ${data.status === "payment" ? "active" : ""}"
              onclick="acceptOrder('${orderId}')"
            >
              💳 Lanjut Pembayaran
            </button>
            <button
              class="btn-delete"
              onclick="deleteOrder('${orderId}')"
            >
              🗑️ Hapus
            </button>
          </div>

          <div class="admin-chat-section">
            <h4>💬 Chat dengan Customer</h4>
            <div
              id="chat-${orderId}"
              class="admin-chat"
            >
            </div>

            <form
              class="chat-form"
              onsubmit="
                sendAdminChat(
                  event,
                  '${orderId}'
                )
              "
            >

              <input
                type="text"
                id="input-${orderId}"
                placeholder="Balas chat..."
              >

              <button type="submit">
                Kirim
              </button>

            </form>
          </div>

        </div>

        `;

    loadMessages(orderId);
  });
});

function getStatusBadge(status) {
  const badges = {
    pending: '<span class="status-badge pending">⏳ Menunggu</span>',
    payment: '<span class="status-badge payment">💳 Pembayaran</span>',
    payment_verified:
      '<span class="status-badge payment_verified">✔️ Terverifikasi</span>',
    completed: '<span class="status-badge completed">✅ Selesai</span>',
  };
  return (
    badges[status] || '<span class="status-badge pending">⏳ Menunggu</span>'
  );
}

window.acceptOrder = async (orderId) => {
  const orderDoc = doc(db, "orders", orderId);

  const button = event.target;

  button.disabled = true;
  button.textContent = "⏳ Mengirim...";

  try {
    await updateDoc(orderDoc, {
      status: "payment",
    });

    button.textContent = "✅ Pembayaran Dikirim!";
    setTimeout(() => {
      button.disabled = false;
      button.textContent = "💳 Lanjut Pembayaran";
    }, 2000);
  } catch (error) {
    console.error("Error:", error);
    button.disabled = false;
    button.textContent = "❌ Gagal";
    setTimeout(() => {
      button.textContent = "💳 Lanjut Pembayaran";
    }, 2000);
  }
};

window.downloadProof = (orderId, fileName) => {
  const orderDoc = doc(db, "orders", orderId);

  onSnapshot(orderDoc, (snap) => {
    if (snap.exists()) {
      const data = snap.data();

      if (data.proofImage) {
        const link = document.createElement("a");
        link.href = data.proofImage;
        link.download = `bukti_transfer_${orderId}_${fileName}`;
        link.click();
      }
    }
  });
};

window.markAsDone = async (orderId) => {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: "completed",
      completedAt: new Date().toISOString(),
      // signal customer client to reset UI and allow new order
      resetForCustomer: true,
      paymentOpened: false,
    });

    await sendDiscordWebhook({
      embeds: [
        buildOrderEmbed({
          title: "✅ Order selesai (Done)",
          color: 0x2ecc71,
          fields: [
            { name: "Order ID", value: orderId, inline: false },
            { name: "Status", value: "completed", inline: true },
          ],
          footer: "VinzShop",
        }),
      ],
    });

    showAdminAlert(
      "✅ Order Selesai",
      `Order #${orderId}\nberhasil ditandai sebagai selesai dan klien akan direset.`,
      "success",
    );
  } catch (error) {
    showAdminAlert(
      "❌ Gagal",
      `Gagal menandai order sebagai selesai!\n${error.message}`,
      "error",
    );
    console.error("Error:", error);
  }
};

window.deleteOrder = async (orderId) => {
  const confirmMsg = `Yakin ingin menghapus Order #${orderId}?\n\nTindakan ini tidak dapat dibatalkan!`;

  showAdminConfirm(confirmMsg, async () => {
    try {
      const messagesRef = collection(db, "orders", orderId, "messages");
      const messagesSnap = await getDocs(messagesRef);
      await Promise.all(
        messagesSnap.docs.map((messageDoc) => deleteDoc(messageDoc.ref)),
      );

      if (messageListeners.has(orderId)) {
        messageListeners.get(orderId)();
        messageListeners.delete(orderId);
      }

      await deleteDoc(doc(db, "orders", orderId));

      showAdminAlert(
        "✅ Order Dihapus",
        `Order #${orderId}\nberhasil dihapus dari sistem!`,
        "success",
      );
    } catch (error) {
      showAdminAlert(
        "❌ Gagal",
        `Gagal menghapus order!\n${error.message}`,
        "error",
      );
      console.error("Error:", error);
    }
  });
};

window.showAdminAlert = (title, message, type = "info") => {
  // Modal-based alert (reuses #paymentModal and #paymentContent in admin.html)
  const paymentModal = document.getElementById("paymentModal");
  const paymentContent = document.getElementById("paymentContent");

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
    <div class="modal-alert" style="background: ${bgColor}; border-left: 4px solid ${buttonBg}; padding: 20px; border-radius: 12px;">
      <h3 style="color: ${textColor}; margin: 0 0 10px 0; font-size: 18px;">${icon} ${title}</h3>
      <p style="color: ${textColor}; margin: 0 0 15px 0; line-height: 1.6; white-space: pre-line;">${message}</p>
      <div style="text-align: right;"><button id="adminModalOk" style="background: ${buttonBg}; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">👍 Mengerti</button></div>
    </div>
  `;

  if (!paymentModal || !paymentContent) {
    // Fallback to native alert if modal not present
    alert(`${icon} ${title}\n\n${message}`);
    return;
  }

  paymentContent.innerHTML = alertHTML;
  paymentModal.classList.add("active");

  const ok = document.getElementById("adminModalOk");
  if (ok) {
    ok.addEventListener("click", () => {
      paymentModal.classList.remove("active");
    });
  }
};

window.showAdminConfirm = (message, onConfirm) => {
  const paymentModal = document.getElementById("paymentModal");
  const paymentContent = document.getElementById("paymentContent");

  const confirmHTML = `
    <div style="padding:20px;">
      <h3 style="color:#842029; margin:0 0 10px 0;">⚠️ Konfirmasi</h3>
      <p style="color:#842029; white-space: pre-line;">${message}</p>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button id="adminConfirmCancel" style="flex:1; background:#6c757d; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">Batal</button>
        <button id="adminConfirmOk" style="flex:1; background:#dc3545; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">Hapus</button>
      </div>
    </div>
  `;

  if (!paymentModal || !paymentContent) {
    if (window.confirm(message)) onConfirm();
    return;
  }

  paymentContent.innerHTML = confirmHTML;
  paymentModal.classList.add("active");

  const cancelBtn = document.getElementById("adminConfirmCancel");
  const okBtn = document.getElementById("adminConfirmOk");

  if (cancelBtn)
    cancelBtn.addEventListener("click", () =>
      paymentModal.classList.remove("active"),
    );
  if (okBtn)
    okBtn.addEventListener("click", () => {
      paymentModal.classList.remove("active");
      onConfirm();
    });
};

window.exportOrdersData = () => {
  if (allOrders.length === 0) {
    alert("❌ Tidak ada data pesanan untuk diekspor!");
    return;
  }

  // Format data untuk export
  const today = new Date().toISOString().split("T")[0];
  const exportData = {
    tanggal: today,
    jumlahPesanan: allOrders.length,
    totalRobux: allOrders.reduce((sum, order) => sum + (order.robux || 0), 0),
    totalPendapatan: allOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    ),
    daftarPesanan: allOrders.map((order) => ({
      orderId: order.id,
      username: order.username,
      robux: order.robux,
      metodeAwal: order.method,
      metodePeralihan: order.paymentMethod || "-",
      totalBayar: order.total,
      whatsapp: order.whatsapp,
      status: order.status,
      tanggalPesan: order.createdAt || "-",
    })),
  };

  // Create JSON string
  const jsonString = JSON.stringify(exportData, null, 2);

  // Create blob and download
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rekap_penjualan_${today}.json`;
  link.click();
  URL.revokeObjectURL(url);

  alert(
    `✅ Rekap penjualan tanggal ${today} berhasil diunduh!\n\nTotal Pesanan: ${allOrders.length}\nTotal Pendapatan: Rp ${exportData.totalPendapatan.toLocaleString("id-ID")}`,
  );
};

const messageListeners = new Map();

async function loadMessages(orderId) {
  if (messageListeners.has(orderId)) return;

  const msgRef = collection(db, "orders", orderId, "messages");
  const q = query(msgRef, orderBy("createdAt", "asc"));

  const unsub = onSnapshot(q, (snapshot) => {
    const chatBox = document.getElementById(`chat-${orderId}`);

    if (!chatBox) return;

    chatBox.innerHTML = "";

    snapshot.forEach((msgDoc) => {
      const msg = msgDoc.data();

      chatBox.innerHTML += `

          <div class="msg">

            <b>
              ${msg.sender}
            </b>

            <p>
              ${msg.message}
            </p>

          </div>

          `;
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });

  messageListeners.set(orderId, unsub);
}

window.sendAdminChat = async (e, orderId) => {
  e.preventDefault();

  const input = document.getElementById(`input-${orderId}`);

  if (input.value === "") return;

  await addDoc(
    collection(db, "orders", orderId, "messages"),

    {
      sender: "Admin",

      message: input.value,

      createdAt: Date.now(),
    },
  );

  input.value = "";
};
