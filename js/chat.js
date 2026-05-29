import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const chatBox = document.getElementById("chatBox");

const chatForm = document.getElementById("chatForm");

const chatInput = document.getElementById("chatInput");

const orderId = localStorage.getItem("orderId");

if (orderId) {
  const messagesRef = collection(db, "orders", orderId, "messages");

  const q = query(messagesRef, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();

      chatBox.innerHTML += `

          <div class="chat-message">

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

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (chatInput.value === "") return;

    await addDoc(messagesRef, {
      sender: "Customer",

      message: chatInput.value,

      createdAt: Date.now(),
    });

    chatInput.value = "";
  });
}
