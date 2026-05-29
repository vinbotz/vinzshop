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

const GAMEPASS_INDO_SILVER = [
  { robux: 80, total: 16000, defaultPrice: 115 },
  { robux: 160, total: 31000, defaultPrice: 229 },
  { robux: 240, total: 46000, defaultPrice: 344 },
  { robux: 320, total: 61000, defaultPrice: 458 },
];

const GAMEPASS_INDO_GOLD = [
  { robux: 500, total: 73000, defaultPrice: 715 },
  { robux: 1000, total: 145000, defaultPrice: 1430 },
  { robux: 1500, total: 217000, defaultPrice: 2145 },
  { robux: 2000, total: 289000, defaultPrice: 2860 },
];

const VILOG_INDO = [
  { robux: 80, total: 18000 },
  { robux: 160, total: 33000 },
  { robux: 240, total: 48000 },
  { robux: 320, total: 63000 },
  { robux: 500, total: 80000 },
  { robux: 1000, total: 148000 },
  { robux: 1500, total: 225000 },
  { robux: 2000, total: 300000 },
];

const VILOG_MALAY = [
  { robux: 80, total: 5 },
  { robux: 160, total: 9 },
  { robux: 240, total: 12 },
  { robux: 320, total: 16 },
  { robux: 500, total: 20 },
  { robux: 1000, total: 38, badge: "🔥" },
  { robux: 1500, total: 55 },
  { robux: 2000, total: 73, badge: "⭐" },
];

const GAMEPASS_MALAY = [
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
];

function formatIdr(amount) {
  return Number(amount).toLocaleString("id-ID");
}

export function isVilogAvailable(region) {
  return region === "indo" || region === "malay";
}

export function getRobuxPackageGroups(region, method) {
  if (region === "malay" && method === "Gamepass") {
    return [{ label: "🇲🇾 MALAYSIA — GAMEPASS", packages: GAMEPASS_MALAY }];
  }

  if (region === "malay" && method === "VILOG") {
    return [{ label: "⚡ VILOG — REGULAR PACKAGE (MY)", packages: VILOG_MALAY }];
  }

  if (method === "Gamepass") {
    return [
      { label: "➤ SILVER", packages: GAMEPASS_INDO_SILVER },
      { label: "➤ GOLD", packages: GAMEPASS_INDO_GOLD },
    ];
  }

  if (method === "VILOG") {
    return [{ label: "⚡ VILOG — PAKET REGULER", packages: VILOG_INDO }];
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
