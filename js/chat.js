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
const chatContainer = document.querySelector(".chat-container");

let chatUnsubscribe = null;
let activeChatOrderId = null;

export function resetLiveChat() {
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }

  activeChatOrderId = null;

  if (chatBox) chatBox.innerHTML = "";
  if (chatInput) chatInput.value = "";
  if (chatContainer) chatContainer.style.display = "none";
}

export function initLiveChat(orderId) {
  if (!orderId || !chatBox || !chatForm || !chatInput) return;

  if (activeChatOrderId === orderId && chatUnsubscribe) return;

  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }

  activeChatOrderId = orderId;

  if (chatContainer) chatContainer.style.display = "block";

  const messagesRef = collection(db, "orders", orderId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  chatUnsubscribe = onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();

      chatBox.innerHTML += `
          <div class="chat-message">
            <b>${msg.sender}</b>
            <p>${msg.message}</p>
          </div>
          `;
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });

  chatForm.onsubmit = async (e) => {
    e.preventDefault();

    const text = chatInput.value.trim();
    if (!text) return;

    await addDoc(messagesRef, {
      sender: "Customer",
      message: text,
      createdAt: Date.now(),
    });

    chatInput.value = "";
  };
}

if (chatContainer && !localStorage.getItem("orderId")) {
  chatContainer.style.display = "none";
}
