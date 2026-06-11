import {
  buildPricelistHtml,
  initPricing,
  subscribePricing,
} from "./pricing.js";

const pricelistContent = document.getElementById("pricelistContent");

function renderPricelist() {
  if (!pricelistContent) return;
  pricelistContent.innerHTML = buildPricelistHtml();
}

await initPricing();
renderPricelist();
subscribePricing(renderPricelist);
