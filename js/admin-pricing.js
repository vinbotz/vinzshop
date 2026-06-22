import {
  DEFAULT_PRICES,
  PRICE_CATEGORIES,
  getPrices,
  initPricing,
  resetPricesToDefault,
  savePrices,
  subscribePricing,
} from "./pricing.js";

const pricingSettingsRoot = document.getElementById("pricingSettings");
const togglePricingBtn = document.getElementById("togglePricingBtn");

let draftPrices = getPrices();
let isPricingPanelOpen = false;
let activeCategoryId = PRICE_CATEGORIES[0].id;
let usernameStock = {
  indo: true,
  malay: true,
};

function getActiveCategory() {
  return (
    PRICE_CATEGORIES.find((item) => item.id === activeCategoryId) ||
    PRICE_CATEGORIES[0]
  );
}

function sortCategoryPackages(region, key) {
  draftPrices[region][key].sort((a, b) => Number(a.robux) - Number(b.robux));
}

function setPricingPanelOpen(open) {
  isPricingPanelOpen = open;

  if (!togglePricingBtn || !pricingSettingsRoot) return;

  togglePricingBtn.classList.toggle("is-active", open);
  togglePricingBtn.textContent = open
    ? "✖ Tutup Pengaturan Pricelist"
    : "💸 Pengaturan Pricelist";
  pricingSettingsRoot.classList.toggle("is-open", open);

  if (open) {
    renderPricingEditor();
  } else {
    pricingSettingsRoot.innerHTML = "";
  }
}

function bindPricingInputs() {
  if (!pricingSettingsRoot) return;

  pricingSettingsRoot.querySelectorAll(".pricing-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const target = event.target;
      const region = target.dataset.region;
      const key = target.dataset.key;
      const index = Number(target.dataset.index);
      const field = target.dataset.field;
      const value = Number(target.value);

      if (!region || !key || Number.isNaN(index) || !field) return;

      draftPrices[region][key][index][field] = value;
    });
  });
}

function handleAddPackage() {
  const category = getActiveCategory();
  const newPackage = category.hasDefaultPrice
    ? { robux: 0, total: 0, defaultPrice: 0 }
    : { robux: 0, total: 0 };

  draftPrices[category.region][category.key].push(newPackage);
  renderPricingEditor();
}

function confirmDeletePackage(index) {
  const category = getActiveCategory();
  const packages = draftPrices[category.region][category.key];

  if (!packages[index]) return;

  const robux = packages[index].robux;
  const message = `Hapus paket ${robux || "(baru)"} Robux dari "${category.label}"?\n\nKlik Simpan Harga setelah hapus agar perubahan tersimpan.`;

  if (typeof window.showAdminConfirm === "function") {
    window.showAdminConfirm(message, () => handleDeletePackage(index));
    return;
  }

  if (window.confirm(message)) {
    handleDeletePackage(index);
  }
}

function handleDeletePackage(index) {
  const category = getActiveCategory();
  const packages = draftPrices[category.region][category.key];

  if (!packages[index]) return;

  packages.splice(index, 1);
  renderPricingEditor();
}

function validateDraftPrices() {
  for (const category of PRICE_CATEGORIES) {
    const packages = draftPrices[category.region][category.key] || [];
    const seenRobux = new Set();

    for (const pkg of packages) {
      const robux = Number(pkg.robux);
      const total = Number(pkg.total);

      if (!robux || Number.isNaN(robux) || robux <= 0) {
        return `Nominal Robux di "${category.label}" harus lebih dari 0.`;
      }

      if (Number.isNaN(total) || total < 0) {
        return `Harga di "${category.label}" untuk ${robux} Robux tidak valid.`;
      }

      if (category.hasDefaultPrice) {
        const defaultPrice = Number(pkg.defaultPrice);
        if (Number.isNaN(defaultPrice) || defaultPrice < 0) {
          return `Default Price di "${category.label}" untuk ${robux} Robux tidak valid.`;
        }
      }

      if (seenRobux.has(robux)) {
        return `Nominal ${robux} Robux duplikat di "${category.label}".`;
      }

      seenRobux.add(robux);
    }
  }

  return null;
}

function renderPricingEditor() {
  if (!pricingSettingsRoot || !isPricingPanelOpen) return;

  const category = getActiveCategory();
  const packages = draftPrices[category.region][category.key] || [];

  const defaultPriceHeader = category.hasDefaultPrice
    ? "<th>Default Price</th>"
    : "";

  const rows = packages
    .map((pkg, index) => {
      const defaultPriceField = category.hasDefaultPrice
        ? `
          <td>
            <input
              type="number"
              min="0"
              class="pricing-input"
              data-region="${category.region}"
              data-key="${category.key}"
              data-index="${index}"
              data-field="defaultPrice"
              value="${pkg.defaultPrice ?? 0}"
            />
          </td>
        `
        : "";

      return `
        <tr>
          <td>
            <input
              type="number"
              min="1"
              class="pricing-input"
              data-region="${category.region}"
              data-key="${category.key}"
              data-index="${index}"
              data-field="robux"
              value="${pkg.robux || ""}"
              placeholder="Jumlah Robux"
            />
          </td>
          <td>
            <input
              type="number"
              min="0"
              class="pricing-input"
              data-region="${category.region}"
              data-key="${category.key}"
              data-index="${index}"
              data-field="total"
              value="${pkg.total ?? 0}"
              placeholder="Harga"
            />
          </td>
          ${defaultPriceField}
          <td class="pricing-action-cell">
            <button
              type="button"
              class="btn-delete-pricing-row"
              data-index="${index}"
              title="Hapus baris ini"
            >
              🗑️ Hapus
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  pricingSettingsRoot.innerHTML = `
    <section class="admin-pricing-panel">
    <div class="admin-stock-setting">
  <label>
    <input
      type="checkbox"
      id="indoUsernameStock"
      ${usernameStock.indo ? "checked" : ""}
    />
    🇮🇩 Username Ready
  </label>

  <label>
    <input
      type="checkbox"
      id="malayUsernameStock"
      ${usernameStock.malay ? "checked" : ""}
    />
    🇲🇾 Username Ready
  </label>
</div>

    
      <div class="admin-pricing-header">
        <h2>💸 Pengaturan Harga Pricelist</h2>
        <p>Harga di sini dipakai bersama untuk halaman pricelist dan combo box formulir order.</p>
      </div>

      <div class="admin-pricing-toolbar">
        <label for="pricingCategory">Kategori</label>
        <select id="pricingCategory">
          ${PRICE_CATEGORIES.map(
            (item) =>
              `<option value="${item.id}" ${item.id === category.id ? "selected" : ""}>${item.label}</option>`,
          ).join("")}
        </select>
      </div>

      <div class="admin-pricing-table-wrap">
        <table class="admin-pricing-table">
          <thead>
            <tr>
              <th>Jumlah Robux</th>
              <th>Harga (${category.currency})</th>
              ${defaultPriceHeader}
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <button type="button" id="addPricingRowBtn" class="btn-add-pricing-row">
        ➕ Tambah Nominal Baru
      </button>

      <div class="admin-pricing-actions">
        <button type="button" id="savePricingBtn" class="btn-save-pricing">
          💾 Simpan Harga
        </button>
        <button type="button" id="resetPricingBtn" class="btn-reset-pricing">
          ↩️ Reset ke Default
        </button>
      </div>
    </section>
  `;

  document
    .getElementById("pricingCategory")
    ?.addEventListener("change", (e) => {
      activeCategoryId = e.target.value;
      renderPricingEditor();
    });

  bindPricingInputs();

  pricingSettingsRoot
    .querySelectorAll(".btn-delete-pricing-row")
    .forEach((button) => {
      button.addEventListener("click", () => {
        confirmDeletePackage(Number(button.dataset.index));
      });
    });

  document
    .getElementById("addPricingRowBtn")
    ?.addEventListener("click", handleAddPackage);
  document
    .getElementById("savePricingBtn")
    ?.addEventListener("click", handleSavePricing);
  document
    .getElementById("resetPricingBtn")
    ?.addEventListener("click", handleResetPricing);
}

async function handleSavePricing() {
  const saveBtn = document.getElementById("savePricingBtn");
  if (!saveBtn) return;

  usernameStock.indo =
  document.getElementById("indoUsernameStock")?.checked;

  usernameStock.malay =
  document.getElementById("malayUsernameStock")?.checked;
  

  for (const category of PRICE_CATEGORIES) {
    sortCategoryPackages(category.region, category.key);
  }

  const validationError = validateDraftPrices();
  if (validationError) {
    window.showAdminAlert?.("⚠️ Data Belum Valid", validationError, "warning");
    if (isPricingPanelOpen) renderPricingEditor();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "⏳ Menyimpan...";

  try {
    await savePrices({
  ...draftPrices,
  usernameStock,
});
    window.showAdminAlert?.(
      "✅ Harga Tersimpan",
      "Harga pricelist dan combo box order sudah diperbarui.",
      "success",
    );
  } catch (error) {
    window.showAdminAlert?.(
      "❌ Gagal",
      `Gagal menyimpan harga.\n${error.message}`,
      "error",
    );
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Simpan Harga";
  }
}
async function handleResetPricing() {
  const confirmed = window.confirm(
    "Reset semua harga ke nilai default bawaan aplikasi?",
  );
  if (!confirmed) return;

  const resetBtn = document.getElementById("resetPricingBtn");
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.textContent = "⏳ Mereset...";
  }

  try {
    await resetPricesToDefault();
    draftPrices = structuredClone(DEFAULT_PRICES);
    renderPricingEditor();
    window.showAdminAlert?.(
      "✅ Reset Berhasil",
      "Semua harga kembali ke nilai default.",
      "success",
    );
  } catch (error) {
    window.showAdminAlert?.(
      "❌ Gagal",
      `Gagal reset harga.\n${error.message}`,
      "error",
    );
  } finally {
    if (resetBtn) {
      resetBtn.disabled = false;
      resetBtn.textContent = "↩️ Reset ke Default";
    }
  }
}

function bindPricingToggle() {
  if (!togglePricingBtn) return;

  togglePricingBtn.addEventListener("click", () => {
    setPricingPanelOpen(!isPricingPanelOpen);
  });
}

export async function initAdminPricing() {
  bindPricingToggle();
  await initPricing();
  draftPrices = getPrices();

  subscribePricing((prices) => {
    draftPrices = structuredClone(prices);
    if (isPricingPanelOpen) {
      renderPricingEditor();
    }
  });
}
