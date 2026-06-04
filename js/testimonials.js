import { buildTestimonialsUrl } from "./testimonials-config.js";

const grid = document.getElementById("testimonialsGrid");
const statusEl = document.getElementById("testimonialsStatus");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function parseTestimonialMessage(message) {
  if (!message?.trim()) {
    return { paket: "", robux: "", review: "" };
  }

  const paketMatch = message.match(/💰\s*Paket:\s*(.+)/i);
  const robuxMatch = message.match(/(\d[\d.,]*)\s*Robux/i);
  const reviewQuoted = message.match(/💬\s*Review:\s*\n?"([^"]+)"/i);
  const reviewPlain = message.match(/💬\s*Review:\s*\n?(.+?)(?:\n\n|━|$)/is);

  return {
    paket: paketMatch?.[1]?.trim() || "",
    robux: robuxMatch?.[1]?.replace(/[^\d]/g, "") || "",
    review: (reviewQuoted?.[1] || reviewPlain?.[1] || "").trim(),
  };
}

function normalizeTestimonials(rawList) {
  const sorted = [...rawList].sort(
    (a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp),
  );

  const merged = [];
  const usedImageIds = new Set();
  const textItems = sorted.filter((item) => item.message?.trim());
  const imageItems = sorted.filter(
    (item) => item.image && !item.message?.trim(),
  );

  for (const textItem of textItems) {
    const parsed = parseTestimonialMessage(textItem.message);
    let image = textItem.image || null;

    if (!image) {
      const textTime = new Date(textItem.date || textItem.timestamp).getTime();
      let closestImage = null;
      let closestDiff = Infinity;

      for (const imageItem of imageItems) {
        if (usedImageIds.has(imageItem.id)) continue;

        const imageTime = new Date(
          imageItem.date || imageItem.timestamp,
        ).getTime();
        const diff = Math.abs(imageTime - textTime);

        if (diff <= 5 * 60 * 1000 && diff < closestDiff) {
          closestDiff = diff;
          closestImage = imageItem;
        }
      }

      if (closestImage) {
        image = closestImage.image;
        usedImageIds.add(closestImage.id);
      }
    }

    merged.push({
      id: textItem.id,
      author: parsed.paket || "Testimoni Customer",
      content: parsed.review || textItem.message.trim(),
      robux: parsed.robux,
      image,
      timestamp: textItem.date || textItem.timestamp,
    });
  }

  return merged.filter((item) => item.content || item.image);
}

function getTestimonials(rawList) {
  return normalizeTestimonials(rawList).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );
}

function renderTestimonialCard(item) {
  const imageBlock = item.image
    ? `<button
        type="button"
        class="testimonial-image-btn"
        data-src="${escapeHtml(item.image)}"
        aria-label="Lihat bukti testimoni"
      >
        <img
          src="${escapeHtml(item.image)}"
          alt="Bukti testimoni"
          class="testimonial-image"
          loading="lazy"
        />
        <span class="testimonial-image-hint">🔍 Klik untuk perbesar</span>
      </button>`
    : "";

  const robuxBlock = item.robux
    ? `<span class="testimonial-robux">${escapeHtml(item.robux)} Robux</span>`
    : "";

  const content = item.content
    ? `<p class="testimonial-text">"${escapeHtml(item.content)}"</p>`
    : "";

  return `
    <article class="testimonial-card">
      ${imageBlock}
      <div class="testimonial-body">
        <div class="testimonial-meta">
          <strong class="testimonial-author">${escapeHtml(item.author)}</strong>
          ${robuxBlock}
        </div>
        ${content}
        <time class="testimonial-date">${formatDate(item.timestamp)}</time>
      </div>
    </article>
  `;
}

function setStatus(message, type = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `testimonials-status ${type}`;
  statusEl.style.display = message ? "block" : "none";
}

function initLightbox() {
  let modal = document.getElementById("testimonialLightbox");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "testimonialLightbox";
    modal.className = "testimonial-lightbox";
    modal.innerHTML = `
      <div class="testimonial-lightbox-backdrop"></div>
      <div class="testimonial-lightbox-content">
        <button type="button" class="testimonial-lightbox-close" aria-label="Tutup">✖</button>
        <img id="testimonialLightboxImage" alt="Bukti testimoni" />
      </div>
    `;
    document.body.appendChild(modal);

    modal
      .querySelector(".testimonial-lightbox-backdrop")
      .addEventListener("click", closeLightbox);
    modal
      .querySelector(".testimonial-lightbox-close")
      .addEventListener("click", closeLightbox);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeLightbox();
    });
  }

  return modal;
}

function openLightbox(src) {
  const modal = initLightbox();
  const imageEl = document.getElementById("testimonialLightboxImage");
  if (imageEl) imageEl.src = src;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const modal = document.getElementById("testimonialLightbox");
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

function bindImageClicks() {
  if (!grid) return;

  grid.querySelectorAll(".testimonial-image-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const src = button.dataset.src;
      if (src) openLightbox(src);
    });
  });
}

async function loadTestimonials() {
  if (!grid) return;

  setStatus("Memuat testimoni...", "loading");

  try {
    const response = await fetch(buildTestimonialsUrl());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawList = Array.isArray(data) ? data : data.testimonials || [];
    const items = getTestimonials(rawList);

    if (!items.length) {
      grid.innerHTML = "";
      setStatus("Belum ada testimoni ditampilkan.", "empty");
      return;
    }

    grid.innerHTML = items.map(renderTestimonialCard).join("");
    bindImageClicks();
    setStatus("", "info");
  } catch (error) {
    console.error("Gagal memuat testimoni:", error);
    grid.innerHTML = "";
    setStatus("Testimoni belum bisa dimuat.", "error");
  }
}

loadTestimonials();
