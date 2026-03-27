function setCheckoutMessage(message, isError = false) {
  const messageElement = document.getElementById("checkout-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.style.color = isError ? "#a80000" : "#1d6b3d";
  messageElement.style.background = message
    ? isError
      ? "#fff2f2"
      : "#eef9f1"
    : "transparent";
  messageElement.style.border = message
    ? `1px solid ${isError ? "rgba(168, 0, 0, 0.12)" : "rgba(29, 107, 61, 0.14)"}`
    : "none";
  messageElement.style.borderRadius = message ? "14px" : "0";
  messageElement.style.padding = message ? "14px 16px" : "0";
}

async function confirmPayment() {
  const name = document.getElementById("name")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const address = document.getElementById("address")?.value.trim();
  const city = document.getElementById("city")?.value.trim();
  const postalCode = document.getElementById("postal-code")?.value.trim();

  if (!name || !phone || !address || !city || !postalCode) {
    setCheckoutMessage("Vui lòng điền đầy đủ thông tin giao hàng.", true);
    return;
  }

  const paymentMethod =
    document.querySelector('input[name="payment"]:checked')?.value || "cash";

  if (paymentMethod === "credit-card") {
    const cardNumber = document.getElementById("card-number")?.value.trim();
    const expiryDate = document.getElementById("expiry-date")?.value.trim();
    const cvv = document.getElementById("cvv")?.value.trim();

    if (!cardNumber || !expiryDate || !cvv) {
      setCheckoutMessage("Vui lòng điền thông tin thẻ đầy đủ.", true);
      return;
    }
  }

  try {
    setCheckoutMessage("Đang xử lý đơn hàng...");
    await submitOrder();
  } catch (error) {
    setCheckoutMessage(error.message, true);
  }
}

loadCheckoutPage();
