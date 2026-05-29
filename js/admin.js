import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ordersContainer = document.getElementById("ordersContainer");

const ordersRef = collection(db, "orders");

onSnapshot(ordersRef, (snapshot) => {
  ordersContainer.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const orderId = docSnap.id;

    ordersContainer.innerHTML += `

        <div class="admin-order">

          <h3>
            Order #${orderId}
          </h3>

          <p>
            Username:
            ${data.username}
          </p>

          <p>
            Robux:
            ${data.robux}
          </p>

          <p>
            Metode:
            ${data.method}
          </p>

          <p>
            WhatsApp:
            ${data.whatsapp}
          </p>

          <button
            onclick="acceptOrder('${orderId}')"
          >
            Lanjut Pembayaran
          </button>

          <div
            id="chat-${orderId}"
            class="admin-chat"
          >
          </div>

          <form
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

            <button>
              Kirim
            </button>

          </form>

        </div>

        `;

    loadMessages(orderId);
  });
});

window.acceptOrder = async (orderId) => {
  const orderDoc = doc(db, "orders", orderId);

  await updateDoc(orderDoc, {
    status: "payment",
  });
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
