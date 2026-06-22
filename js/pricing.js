import { db, doc, getDoc, setDoc, onSnapshot } from "./firebase.js";

export const REGIONS = {
  indo: {
    label: "🇮🇩 Indonesia (Rupiah)",
    currency: "IDR",
    symbol: "Rp",
  },
  malay: {
    label: "🇲🇾 Malaysia (Ringgit)",
    currency: "MYR",
    symbol: "RM",
  },
};

export const DEFAULT_PRICES = {
  indo: {
    gamepassSilver: [
      { robux: 80, total: 16000, defaultPrice: 115 },
      { robux: 160, total: 31000, defaultPrice: 229 },
      { robux: 240, total: 46000, defaultPrice: 344 },
      { robux: 320, total: 61000, defaultPrice: 458 },
    ],
    gamepassGold: [
      { robux: 500, total: 73000, defaultPrice: 715 },
      { robux: 1000, total: 145000, defaultPrice: 1430 },
      { robux: 1500, total: 217000, defaultPrice: 2145 },
      { robux: 2000, total: 289000, defaultPrice: 2860 },
    ],
    vilog: [
      { robux: 80, total: 18000 },
      { robux: 160, total: 33000 },
      { robux: 240, total: 48000 },
      { robux: 320, total: 63000 },
      { robux: 500, total: 80000 },
      { robux: 1000, total: 148000 },
      { robux: 1500, total: 225000 },
      { robux: 2000, total: 300000 },
    ],
    username: [
      { robux: 100, total: 28000 },
      { robux: 200, total: 41000 },
      { robux: 300, total: 54000 },
      { robux: 400, total: 67000 },
      { robux: 500, total: 80000 },
      { robux: 600, total: 93000 },
      { robux: 700, total: 106000 },
      { robux: 800, total: 119000 },
      { robux: 900, total: 132000 },
      { robux: 1000, total: 145000 },
    ],
  },
  malay: {
    gamepass: [
      { robux: 80, total: 4 },
      { robux: 160, total: 8 },
      { robux: 240, total: 11 },
      { robux: 320, total: 15 },
      { robux: 500, total: 18 },
      { robux: 1000, total: 35, badge: "🔥" },
      { robux: 1500, total: 52 },
      { robux: 2000, total: 69, badge: "⭐" },
      { robux: 2500, total: 86 },
      { robux: 3000, total: 105 },
      { robux: 3500, total: 122 },
      { robux: 4000, total: 140 },
      { robux: 4500, total: 165 },
      { robux: 5000, total: 200, badge: "🔥" },
      { robux: 5500, total: 220 },
      { robux: 6000, total: 240 },
      { robux: 6500, total: 260 },
      { robux: 7000, total: 280 },
      { robux: 7500, total: 300 },
      { robux: 8000, total: 320 },
      { robux: 8500, total: 340 },
      { robux: 9000, total: 360 },
      { robux: 9500, total: 380 },
      { robux: 10000, total: 400, badge: "🔥" },
    ],
    vilog: [
      { robux: 80, total: 5 },
      { robux: 160, total: 9 },
      { robux: 240, total: 12 },
      { robux: 320, total: 16 },
      { robux: 500, total: 20 },
      { robux: 1000, total: 38, badge: "🔥" },
      { robux: 1500, total: 55 },
      { robux: 2000, total: 73, badge: "⭐" },
    ],
    username: [
      { robux: 100, total: 8 },
      { robux: 200, total: 12 },
      { robux: 300, total: 16 },
      { robux: 400, total: 20 },
      { robux: 500, total: 24 },
      { robux: 600, total: 28 },
      { robux: 700, total: 32 },
      { robux: 800, total: 36 },
      { robux: 900, total: 40 },
      { robux: 1000, total: 44 },
],
  },
};

export const DEFAULT_USERNAME_STOCK = {
  indo: true,
  malay: true,
};

const PRICES_DOC = doc(db, "settings", "prices");

let currentPrices = structuredClone(DEFAULT_PRICES);
let pricingReady = false;
let pricingReadyResolve;
const pricingReadyPromise = new Promise((resolve) => {
  pricingReadyResolve = resolve;
});
let initPromise = null;

const pricingListeners = new Set();
let unsubscribePricing = null;

function clonePrices(prices) {
  return structuredClone(prices);
}

let currentUsernameStock = structuredClone(
  DEFAULT_USERNAME_STOCK
);

function mergePackageArrays(defaultArr, storedArr) {
  if (!Array.isArray(storedArr)) return clonePrices(defaultArr);

  const defaultRobux = new Set(defaultArr.map((pkg) => pkg.robux));
  const storedMap = new Map(storedArr.map((pkg) => [pkg.robux, pkg]));

  const merged = defaultArr.map((pkg) => ({
    ...pkg,
    ...(storedMap.get(pkg.robux) || {}),
  }));

  for (const pkg of storedArr) {
    if (!defaultRobux.has(pkg.robux)) {
      merged.push({ ...pkg });
    }
  }

  merged.sort((a, b) => a.robux - b.robux);
  return merged;
}

function mergePrices(defaults, stored) {
  return {
    indo: {
      gamepassSilver: mergePackageArrays(
        defaults.indo.gamepassSilver,
        stored?.indo?.gamepassSilver,
      ),
      gamepassGold: mergePackageArrays(
        defaults.indo.gamepassGold,
        stored?.indo?.gamepassGold,
      ),
      vilog: mergePackageArrays(defaults.indo.vilog, stored?.indo?.vilog),
      username: mergePackageArrays(
        defaults.indo.username,
        stored?.indo?.username
      ),
    },
    malay: {
      gamepass: mergePackageArrays(
        defaults.malay.gamepass,
        stored?.malay?.gamepass,
      ),
      vilog: mergePackageArrays(defaults.malay.vilog, stored?.malay?.vilog),
      username: mergePackageArrays(
        defaults.malay.username,
        stored?.malay?.username,
      ),
    },
  };
}

function mergePrices(defaults, stored) {
  return {
    indo: {
      gamepassSilver: mergePackageArrays(
        defaults.indo.gamepassSilver,
        stored?.indo?.gamepassSilver,
      ),
      gamepassGold: mergePackageArrays(
        defaults.indo.gamepassGold,
        stored?.indo?.gamepassGold,
      ),
      vilog: mergePackageArrays(
        defaults.indo.vilog,
        stored?.indo?.vilog
      ),
      username: mergePackageArrays(
        defaults.indo.username,
        stored?.indo?.username
      ),
    },

    malay: {
      gamepass: mergePackageArrays(
        defaults.malay.gamepass,
        stored?.malay?.gamepass,
      ),
      vilog: mergePackageArrays(
        defaults.malay.vilog,
        stored?.malay?.vilog,
      ),
      username: mergePackageArrays(
        defaults.malay.username,
        stored?.malay?.username,
      ),
    },

    usernameStock: {
      ...DEFAULT_USERNAME_STOCK,
      ...(stored?.usernameStock || {}),
    },
  };
}

  pricingListeners.forEach((cb) =>
    cb(currentPrices, currentUsernameStock)
  );
}

function markPricingReady() {
  if (!pricingReady) {
    pricingReady = true;
    pricingReadyResolve();
  }
}

export function getPrices() {
  return clonePrices(currentPrices);
}

export function initPricing() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const snap = await getDoc(PRICES_DOC);
      if (snap.exists()) {
        applyPrices(mergePrices(DEFAULT_PRICES, snap.data()));
      } else {
        applyPrices({
  ...DEFAULT_PRICES,
  usernameStock: DEFAULT_USERNAME_STOCK,
});
      }
    } catch (error) {
      console.error("Gagal memuat harga:", error);
      applyPrices({
  ...DEFAULT_PRICES,
  usernameStock: DEFAULT_USERNAME_STOCK,
});
    } finally {
      markPricingReady();
    }

    return currentPrices;
  })();

  return initPromise;
}

export function whenPricingReady() {
  return pricingReadyPromise;
}

export function subscribePricing(callback) {
  pricingListeners.add(callback);

  if (!unsubscribePricing) {
    unsubscribePricing = onSnapshot(
      PRICES_DOC,
      (snap) => {
        if (snap.exists()) {
          applyPrices(mergePrices(DEFAULT_PRICES, snap.data()));
        } else {
          applyPrices(DEFAULT_PRICES);
        }
        markPricingReady();
      },
      (error) => console.error("Gagal subscribe harga:", error),
    );
  }

  if (pricingReady) {
  callback(currentPrices, currentUsernameStock);
  }

  return () => {
    pricingListeners.delete(callback);
  };
}

export async function savePrices(prices) {
  const payload = {
    ...clonePrices(prices),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(PRICES_DOC, payload);
  applyPrices(payload);
  return payload;
}

export async function resetPricesToDefault() {
  await setDoc(PRICES_DOC, {
  ...clonePrices(DEFAULT_PRICES),
  usernameStock: DEFAULT_USERNAME_STOCK,
  updatedAt: new Date().toISOString(),
});
  applyPrices(DEFAULT_PRICES);
}

function formatIdr(amount) {
  return Number(amount).toLocaleString("id-ID");
}

export function isVilogAvailable(region) {
  return region === "indo" || region === "malay";
}

export function getRobuxPackageGroups(region, method) {
  if (region === "malay" && method === "Gamepass") {
    return [
      {
        label: "🇲🇾 MALAYSIA — GAMEPASS",
        packages: currentPrices.malay.gamepass,
      },
    ];
  }

  if (region === "malay" && method === "VILOG") {
    return [
      {
        label: "⚡ VILOG — REGULAR PACKAGE (MY)",
        packages: currentPrices.malay.vilog,
      },
    ];
  }

  if (method === "USERNAME") {
    return [
    {
        label:
        region === "malay"
          ? "👤 VIA USERNAME (MY)"
          : "👤 VIA USERNAME",
      packages:
        region === "malay"
          ? currentPrices.malay.username
          : currentPrices.indo.username,
    },
  ];
  }

  if (method === "Gamepass") {
    return [
      {
        label: "➤ SILVER",
        packages: currentPrices.indo.gamepassSilver,
      },
      {
        label: "➤ GOLD",
        packages: currentPrices.indo.gamepassGold,
      },
    ];
  }

  if (method === "VILOG") {
    return [
      {
        label: "⚡ VILOG — PAKET REGULER",
        packages: currentPrices.indo.vilog,
      },
    ];
  }

  return [];
}

function formatRobuxOptionLabel(region, method, pkg) {
  const badge = pkg.badge ? ` ${pkg.badge}` : "";

  if (region === "malay") {
    return `${pkg.robux} Robux — RM${pkg.total}${badge}`;
  }

  if (method === "Gamepass" && pkg.defaultPrice) {
    return `${pkg.robux} Robux — Rp ${formatIdr(pkg.total)} (Default: ${pkg.defaultPrice})`;
  }

  return `${pkg.robux} Robux — Rp ${formatIdr(pkg.total)}`;
}

export function buildRobuxSelectHtml(region, method) {
  const groups = getRobuxPackageGroups(region, method);
  if (!groups.length) return "";

  const placeholder =
    region === "malay"
      ? "Pilih pakej Robux / Select package"
      : "Pilih paket Robux";

  let html = `<select id="robux" required><option value="">${placeholder}</option>`;

  for (const group of groups) {
    html += `<optgroup label="${group.label}">`;
    for (const pkg of group.packages) {
      html += `<option value="${pkg.robux}">${formatRobuxOptionLabel(region, method, pkg)}</option>`;
    }
    html += "</optgroup>";
  }

  html += "</select>";
  return html;
}

export function lookupPrice(region, method, robux) {
  const groups = getRobuxPackageGroups(region, method);
  const amount = Number(robux);

  for (const group of groups) {
    const found = group.packages.find((pkg) => pkg.robux === amount);
    if (found) {
      return {
        ...found,
        region,
        method,
        currency: region === "malay" ? "MYR" : "IDR",
      };
    }
  }

  return null;
}

export function formatTotal(region, total) {
  if (region === "malay") return `RM${total}`;
  return `Rp ${formatIdr(total)}`;
}

export function getRegionLabel(region) {
  return REGIONS[region]?.label || region;
}

function buildPriceItem(label, priceHtml) {
  return `<div class="price-item"><span>${label}</span><b>${priceHtml}</b></div>`;
}

function buildIndoGamepassPrice(pkg) {
  return `Rp ${formatIdr(pkg.total)} <small>(Default Price: ${pkg.defaultPrice})</small>`;
}

function buildIndoVilogPrice(pkg) {
  return `Rp ${formatIdr(pkg.total)}`;
}

function buildMalayPrice(pkg) {
  return `RM${pkg.total}`;
}

export function buildPricelistHtml() {
  const prices = currentPrices;

  let html = `
    <h2>🇮🇩 Indonesia</h2>
    <h3>GAMEPASS</h3>
    <h4>➤ SILVER</h4>
  `;

  for (const pkg of prices.indo.gamepassSilver) {
    html += buildPriceItem(`${pkg.robux} ROBUX`, buildIndoGamepassPrice(pkg));
  }

  html += `<h4>➤ GOLD</h4>`;
  for (const pkg of prices.indo.gamepassGold) {
    html += buildPriceItem(`${pkg.robux} ROBUX`, buildIndoGamepassPrice(pkg));
  }

  html += `
    <hr />
    <h3>⚡ VILOG (FAST PROCESS)</h3>
    <h4>PAKET REGULER</h4>
  `;

  for (const pkg of prices.indo.vilog) {
    html += buildPriceItem(`${pkg.robux} ROBUX`, buildIndoVilogPrice(pkg));
  }

  html += `
  <hr />
  <h3>👤 VIA USERNAME</h3>
  `;

  for (const pkg of prices.indo.username) {
    html += buildPriceItem(`${pkg.robux} ROBUX`, buildIndoVilogPrice(pkg));
}

  html += `
    <br />
    <h2>🇲🇾 VINZSHOP MALAYSIA PRICE LIST</h2>
    <p>
      Fast Process • Trusted • TNG Accepted<br />
      Harga mengikuti rate RM terbaru
    </p>
  `;

  for (const pkg of prices.malay.gamepass) {
    html += buildPriceItem(`${pkg.robux} Robux`, buildMalayPrice(pkg));
  }

  html += `
    <hr />
    <h3>⚡ VILOG (FAST PROCESS)</h3>
    <h4>REGULAR PACKAGE</h4>
  `;

  for (const pkg of prices.malay.vilog) {
    html += buildPriceItem(`${pkg.robux} Robux`, buildMalayPrice(pkg));
  }

  html += `
  <hr />
  <h3>👤 VIA USERNAME</h3>
`;

for (const pkg of prices.malay.username) {
  html += buildPriceItem(
    `${pkg.robux} Robux`,
    buildMalayPrice(pkg)
  );
    }

  return html;
}

export const PRICE_CATEGORIES = [
  {
    id: "indo_gamepassSilver",
    label: "🇮🇩 Gamepass — Silver",
    region: "indo",
    key: "gamepassSilver",
    hasDefaultPrice: true,
    currency: "IDR",
  },
  {
    id: "indo_gamepassGold",
    label: "🇮🇩 Gamepass — Gold",
    region: "indo",
    key: "gamepassGold",
    hasDefaultPrice: true,
    currency: "IDR",
  },
  {
    id: "indo_vilog",
    label: "🇮🇩 VILOG",
    region: "indo",
    key: "vilog",
    hasDefaultPrice: false,
    currency: "IDR",
  },
  {
    id: "indo_username",
    label: "🇮🇩 Via Username",
    region: "indo",
    key: "username",
    hasDefaultPrice: false,
    currency: "IDR",
},
  {
    id: "malay_gamepass",
    label: "🇲🇾 Gamepass",
    region: "malay",
    key: "gamepass",
    hasDefaultPrice: false,
    currency: "MYR",
  },
  {
    id: "malay_vilog",
    label: "🇲🇾 VILOG",
    region: "malay",
    key: "vilog",
    hasDefaultPrice: false,
    currency: "MYR",
  },
  ];

  export function getUsernameStock() {
  return structuredClone(currentUsernameStock);
}
