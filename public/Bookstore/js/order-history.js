const orderHistoryApi = window.BookStore || {};

function renderOrderHistory(orders) {
  const container = document.getElementById("orders-container");

  if (!container) {
    return;
  }

  if (!orders.length) {
    container.innerHTML = `
      <article class="history-order-card">
        <h3>Chưa có đơn hàng nào</h3>
        <p>Bạn chưa thực hiện đơn hàng nào trên hệ thống.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = orders
    .map(
      (order) => `
        <article class="history-order-card">
          <div class="history-order-head">
            <div>
              <h3>Mã đơn: ${order._id}</h3>
              <p>Ngày đặt: ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div class="history-order-status">${order.status}</div>
          </div>
          <div class="history-order-meta">
            <span>Người nhận: ${order.customerName}</span>
            <span>Số điện thoại: ${order.phone}</span>
            <span>Thanh toán: ${order.paymentMethod}</span>
            <span>Tổng tiền: ${orderHistoryApi.formatCurrency(order.totalAmount)}</span>
          </div>
          <div class="history-order-items">
            ${order.items
              .map(
                (item) => `
                  <div class="history-order-item">
                    <img
                      src="${orderHistoryApi.getStoreImage(item.image, item)}"
                      alt="${item.title}"
                      data-title="${item.title}"
                      data-author="${item.author || ""}"
                      onerror="window.handleStoreImageError(this)"
                    >
                    <div>
                      <strong>${item.title}</strong>
                      <p>${item.quantity} x ${orderHistoryApi.formatCurrency(item.price)}</p>
                    </div>
                    <div>${orderHistoryApi.formatCurrency(item.lineTotal)}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

async function loadOrderHistory() {
  const messageElement = document.getElementById("orders-message");
  const container = document.getElementById("orders-container");

  if (!container) {
    return;
  }

  try {
    const authResponse = await fetch("/api/auth/me");
    const authData = await authResponse.json();

    if (!authData.isAuthenticated) {
      throw new Error("Bạn cần đăng nhập để xem lịch sử đơn hàng.");
    }

    const orders = await orderHistoryApi.requestJson("/api/orders", {
      headers: {},
    });

    if (messageElement) {
      messageElement.textContent = "";
    }

    renderOrderHistory(orders);
  } catch (error) {
    if (messageElement) {
      messageElement.textContent = error.message;
      messageElement.style.color = "#a80000";
    }

    container.innerHTML = `
      <article class="history-order-card">
        <h3>Không thể tải đơn hàng</h3>
        <p>${error.message}</p>
      </article>
    `;
  }
}

loadOrderHistory();
