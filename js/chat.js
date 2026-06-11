import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  bindChatImagePreview,
  buildChatMessageHtml,
  readFileAsDataUrl,
  validateChatImage,
} from "./chat-utils.js";

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatImage = document.getElementById("chatImage");
const chatContainer = document.querySelector(".chat-container");

bindChatImagePreview();

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
  if (chatImage) chatImage.value = "";
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
      chatBox.innerHTML += buildChatMessageHtml(docSnap.data());
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });

  chatForm.onsubmit = async (e) => {
    e.preventDefault();

    const text = chatInput.value.trim();
    const file = chatImage?.files?.[0];
    const submitBtn = chatForm.querySelector('button[type="submit"]');

    let imageData = "";

    try {
      if (file) {
        const validation = validateChatImage(file);
        if (!validation.ok) {
          alert(validation.error);
          return;
        }
        imageData = await readFileAsDataUrl(file);
      }

      if (!text && !imageData) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Mengirim...";
      }

      await addDoc(messagesRef, {
        sender: "Customer",
        message: text,
        image: imageData,
        createdAt: Date.now(),
      });

      chatInput.value = "";
      if (chatImage) chatImage.value = "";
    } catch (err) {
      console.error("Upload chat gagal:", err);
      alert("Gagal mengirim pesan. Coba lagi atau gunakan gambar lebih kecil.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim";
      }
    }
  };
}

if (chatContainer && !localStorage.getItem("orderId")) {
  chatContainer.style.display = "none";
}
