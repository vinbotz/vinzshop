import {
  buildRobuxSelectHtml,
  formatTotal,
  initPricing,
  isVilogAvailable,
  lookupPrice,
  subscribePricing,
} from "./pricing.js";

const regionSelect = document.getElementById("region");
const methodSelect = document.getElementById("method");
const dynamicForm = document.getElementById("dynamicForm");

function updateMethodOptions() {
  const region = regionSelect?.value || "";

  if (!methodSelect) return;

  methodSelect.innerHTML =
    region === "malay"
      ? '<option value="">Select method / Pilih kaedah</option>'
      : '<option value="">Pilih metode</option>';

  methodSelect.disabled = !region;

  if (!region) {
    if (dynamicForm) dynamicForm.innerHTML = "";
    return;
  }

  methodSelect.innerHTML += '<option value="Gamepass">Gamepass</option>';
  methodSelect.innerHTML +=
  '<option value="USERNAME">📦 Via Username</option>';

  if (isVilogAvailable(region)) {
    methodSelect.innerHTML +=
      '<option value="VILOG">⚡ VILOG (Fast Process)</option>';
  }
}

function bindRobuxPreview(region) {
  const robuxSelect = document.getElementById("robux");
  const preview = document.getElementById("selectedPricePreview");
  if (!robuxSelect || !preview) return;

  robuxSelect.addEventListener("change", () => {
    const method = methodSelect?.value || "";
    const pkg = lookupPrice(region, method, robuxSelect.value);

    if (!pkg) {
      preview.innerHTML = "";
      preview.style.display = "none";
      return;
    }

    preview.innerHTML = `💰 Total: <strong>${formatTotal(region, pkg.total)}</strong>`;
    preview.style.display = "block";
  });
}

function renderDynamicForm() {
  if (!dynamicForm || !regionSelect || !methodSelect) return;

  const region = regionSelect.value;
  const method = methodSelect.value;

  if (!region || !method) {
    dynamicForm.innerHTML = "";
    return;
  }

  const isMalay = region === "malay";

  const labels = isMalay
    ? {
        username: "Roblox Username",
        password: "Roblox Password",
        recovery: "5 Recovery codes (one per line)",
      }
    : {
        username: "Username Roblox",
        password: "Password Roblox",
        recovery: "5 Kode Pemulihan (pisahkan enter)",
      };

  let html = `
    <input
      type="text"
      id="username"
      placeholder="${labels.username}"
      required
    />
  `;

  if (method === "VILOG") {
    html += `
      <input
        type="password"
        id="password"
        placeholder="${labels.password}"
        required
      />
      <textarea
        id="recovery"
        placeholder="${labels.recovery}"
        required
      ></textarea>
    `;
  }

  html += buildRobuxSelectHtml(region, method);
  html += `<div id="selectedPricePreview" class="price-preview" style="display:none;"></div>`;

  dynamicForm.innerHTML = html;
  bindRobuxPreview(region);
}

async function initOrderForm() {
  await initPricing();

  if (!regionSelect || !methodSelect) return;

  regionSelect.addEventListener("change", () => {
    methodSelect.value = "";
    updateMethodOptions();
    renderDynamicForm();
  });

  methodSelect.addEventListener("change", renderDynamicForm);

  subscribePricing(() => {
    if (regionSelect.value && methodSelect.value) {
      renderDynamicForm();
    }
  });
}

initOrderForm();
