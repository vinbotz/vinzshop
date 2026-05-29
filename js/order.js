import { webhook } from "./webhook.js";
import { db, collection, addDoc } from "./firebase.js";

const form = document.getElementById("orderForm");

const statusBox = document.getElementById("statusBox");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;

  const whatsapp = document.getElementById("whatsapp").value;

  const robux = document.getElementById("robux").value;

  const method = document.getElementById("method").value;

  const orderData = {
    username,
    whatsapp,
    robux,
    method,

    status: "Checking",

    paymentOpened: false,

    createdAt: Date.now(),
  };

  const orderRef = await addDoc(collection(db, "orders"), orderData);

  localStorage.setItem("orderId", orderRef.id);

  await fetch(webhook, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      embeds: [
        {
          title: "💖 ORDER BARU VINZSHOP",

          color: 16738740,

          fields: [
            {
              name: "👤 Username",
              value: username,
            },

            {
              name: "💎 Robux",
              value: robux,
            },

            {
              name: "⚡ Metode",
              value: method,
            },

            {
              name: "📱 WhatsApp",
              value: whatsapp,
            },
          ],
        },
      ],
    }),
  });

  statusBox.innerHTML = `

      <div class="status-card">

        💖 Data kamu sedang dicek terlebih dahulu yaa...
        Mohon tunggu admin 😏

      </div>

    `;

  form.style.display = "none";
});
