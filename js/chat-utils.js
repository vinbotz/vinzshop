export const CHAT_IMAGE_MAX_BYTES = 700 * 1024;

let lightboxReady = false;
let previewBound = false;

export function validateChatImage(file) {
  if (!file) return { ok: true };

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      error: "File harus berupa gambar (JPG, PNG, dll).",
    };
  }

  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    const maxKb = Math.round(CHAT_IMAGE_MAX_BYTES / 1024);
    return {
      ok: false,
      error: `Ukuran gambar maksimal ${maxKb}KB agar bisa terkirim.`,
    };
  }

  return { ok: true };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildChatMessageHtml(
  msg,
  { wrapperClass = "chat-message", imageClass = "chat-image" } = {},
) {
  const messageBlock = msg.message
    ? `<p>${escapeHtml(msg.message)}</p>`
    : "";

  const imageBlock = msg.image
    ? `<button
        type="button"
        class="chat-image-btn"
        aria-label="Lihat gambar chat"
      >
        <img
          src="${escapeAttr(msg.image)}"
          class="${imageClass}"
          alt="Gambar chat"
          loading="lazy"
        >
        <span class="chat-image-hint">🔍 Klik untuk perbesar</span>
      </button>`
    : "";

  return `
    <div class="${wrapperClass}">
      <b>${escapeHtml(msg.sender)}</b>
      ${messageBlock}
      ${imageBlock}
    </div>
  `;
}

function closeChatImageLightbox() {
  const modal = document.getElementById("chatLightbox");
  if (!modal) return;

  modal.classList.remove("active");
  document.body.style.overflow = "";

  const imageEl = document.getElementById("chatLightboxImage");
  if (imageEl) imageEl.removeAttribute("src");
}

export function openChatImageLightbox(src) {
  if (!src) return;

  initChatImageLightbox();

  const modal = document.getElementById("chatLightbox");
  const imageEl = document.getElementById("chatLightboxImage");

  if (!modal || !imageEl) return;

  imageEl.src = src;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

export function initChatImageLightbox() {
  if (lightboxReady) return;

  const modal = document.createElement("div");
  modal.id = "chatLightbox";
  modal.className = "testimonial-lightbox";
  modal.innerHTML = `
    <div class="testimonial-lightbox-backdrop"></div>
    <div class="testimonial-lightbox-content">
      <button type="button" class="testimonial-lightbox-close" aria-label="Tutup">✖</button>
      <img id="chatLightboxImage" alt="Gambar chat" />
    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector(".testimonial-lightbox-backdrop")
    .addEventListener("click", closeChatImageLightbox);
  modal
    .querySelector(".testimonial-lightbox-close")
    .addEventListener("click", closeChatImageLightbox);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeChatImageLightbox();
  });

  lightboxReady = true;
}

export function bindChatImagePreview() {
  if (previewBound) return;

  initChatImageLightbox();

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".chat-image-btn");
    if (!button) return;

    const image = button.querySelector("img");
    if (image?.src) {
      event.preventDefault();
      openChatImageLightbox(image.src);
    }
  });

  previewBound = true;
}
