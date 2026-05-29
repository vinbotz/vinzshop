import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    const deleteButton =
      !data.proofImage && data.status !== "completed"
        ? `<button onclick="deleteOrder('${orderId}')" style="flex: 1; background: #dc3545; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-left: 10px;">
          🗑️ Hapus
        </button>`
        : "";

    ordersContainer.innerHTML += `

        <div class="admin-order ${data.status === "payment_verified" ? "verified" : ""}">

          <div class="order-header">
            <h3>Order #${orderId}</h3>
            ${statusBadge}
          </div>

          <div class="order-info">
            <p><strong>👤 Username:</strong> ${data.username}</p>
            <p><strong>💰 Robux:</strong> ${data.robux}</p>
            <p><strong>💳 Metode:</strong> ${data.method}</p>
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
            ${deleteButton}
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
      total: 150000,
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
    });

    showAdminAlert(
      "✅ Order Selesai",
      `Order #${orderId}\nberhasil ditandai sebagai selesai!`,
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

  alert(`${icon} ${title}\n\n${message}`);
};

window.showAdminConfirm = (message, onConfirm) => {
  if (window.confirm(message)) {
    onConfirm();
  }
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

async function loadMessages(orderId) {
  const msgRef = collection(db, "orders", orderId, "messages");

  onSnapshot(msgRef, (snapshot) => {
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
  });
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
