import {
  db,
  doc,
  onSnapshot
}
from "./firebase.js";

const orderId =
  localStorage.getItem(
    "orderId"
  );

const paymentSection =
  document.getElementById(
    "paymentSection"
  );

if(orderId){

  const orderRef =
    doc(db, "orders", orderId);

  onSnapshot(
    orderRef,
    (snap) => {

      const data =
        snap.data();

      if(
        data.paymentOpened
      ){

        paymentSection.innerHTML = `

        <div class="payment-box">

          <h2>
            💳 Pembayaran
          </h2>

          <p>
            Total:
            Rp ${data.total}
          </p>

          <p>
            Robux:
            ${data.robux}
          </p>

          <select id="paymentMethod">

            <option>
              DANA
            </option>

            <option>
              GoPay
            </option>

            <option>
              ShopeePay
            </option>

          </select>

          <div id="paymentInfo"></div>

        </div>

        `;

        const method =
          document.getElementById(
            "paymentMethod"
          );

        const info =
          document.getElementById(
            "paymentInfo"
          );

        method.addEventListener(
          "change",
          () => {

            if(
              method.value ===
              "DANA"
            ){

              info.innerHTML = `

              <img
                src="./assets/dana.jpg"
                width="100%"
              />

              `;

            }

            else if(
              method.value ===
              "GoPay"
            ){

              info.innerHTML = `

              <img
                src="./assets/gopay.jpg"
                width="100%"
              />

              `;

            }

            else {

              info.innerHTML = `

              <div class="status-card">

                📱 ShopeePay:
                08xxxxxxxxxx

              </div>

              `;

            }

          }
        );
      }
    }
  );
}