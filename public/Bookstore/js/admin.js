const adminApi = window.BookStore || {};
const adminState = {
  categories: [],
  products: [],
  orders: [],
  contactMessages: [],
  users: [],
};

function setAdminMessage(message, isError = false) {
  adminApi.setPageMessage("#admin-message", message, isError);
}

function setAdminNotice(message, isError = false) {
  setAdminMessage(message, isError);

  if (message && typeof adminApi.showStoreToast === "function") {
    adminApi.showStoreToast(message, isError);
  }
}

function setAdminAccessMessage(message, isError = false) {
  adminApi.setPageMessage("#admin-access-message", message, isError);
}

function resetCategoryForm() {
  const form = document.getElementById("category-form");
  const idInput = document.getElementById("category-id");
  const submitButton = document.getElementById("category-submit");

  if (form) {
    form.reset();
  }

  if (idInput) {
    idInput.value = "";
  }

  if (submitButton) {
    submitButton.textContent = "Thêm danh mục";
  }
}

function resetProductForm() {
  const form = document.getElementById("product-form");
  const idInput = document.getElementById("product-id");
  const submitButton = document.getElementById("product-submit");
  const featuredInput = document.getElementById("product-featured-input");

  if (form) {
    form.reset();
  }

  if (idInput) {
    idInput.value = "";
  }

  if (featuredInput) {
    featuredInput.checked = false;
  }

  if (submitButton) {
    submitButton.textContent = "Thêm sản phẩm";
  }
}

function fillProductCategoryOptions() {
  const categorySelect = document.getElementById("product-category");

  if (!categorySelect) {
    return;
  }

  categorySelect.innerHTML = `
    <option value="">Không có danh mục</option>
    ${adminState.categories
      .map(
        (category) => `
          <option value="${category._id}">${category.name}</option>
        `
      )
      .join("")}
  `;
}

function renderCategories() {
  const container = document.getElementById("category-list");

  if (!container) {
    return;
  }

  if (!adminState.categories.length) {
    container.innerHTML = "<p>Chưa có danh mục nào.</p>";
    return;
  }

  container.innerHTML = adminState.categories
    .map(
      (category) => `
        <tr>
          <td>${category.name}</td>
          <td>${category.description || "Không có mô tả"}</td>
          <td class="admin-actions-cell">
            <button type="button" onclick="editCategory('${category._id}')">Sửa</button>
            <button type="button" class="danger" onclick="deleteCategory('${category._id}')">Xóa</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderProducts() {
  const container = document.getElementById("product-list");

  if (!container) {
    return;
  }

  if (!adminState.products.length) {
    container.innerHTML = "<p>Chưa có sản phẩm nào.</p>";
    return;
  }

  container.innerHTML = adminState.products
    .map(
      (product) => `
        <tr>
          <td>
            <div class="admin-product-cell">
              <img
                src="${adminApi.getStoreImage(product.image, product)}"
                alt="${product.title}"
                data-title="${product.title}"
                data-author="${product.author || ""}"
                data-category="${product.category?.name || ""}"
                onerror="window.handleStoreImageError(this)"
              >
              <div>
                <strong>${product.title}</strong>
                <div>${product.author || "Chưa cập nhật tác giả"}</div>
              </div>
            </div>
          </td>
          <td>${product.category?.name || "Chưa phân loại"}</td>
          <td>${adminApi.formatCurrency(product.price)}</td>
          <td>${product.featured ? "Nổi bật" : "Thường"}</td>
          <td class="admin-actions-cell">
            <button type="button" onclick="editProduct('${product._id}')">Sửa</button>
            <button type="button" class="danger" onclick="deleteProduct('${product._id}')">Xóa</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderOrders() {
  const container = document.getElementById("order-list");

  if (!container) {
    return;
  }

  if (!adminState.orders.length) {
    container.innerHTML = "<p>Chưa có đơn hàng nào.</p>";
    return;
  }

  container.innerHTML = adminState.orders
    .map(
      (order) => `
        <article class="admin-order-card">
          <div class="admin-order-head">
            <div>
              <h4>Mã đơn: ${order._id}</h4>
              <p>${order.customerName} | ${order.phone}</p>
              <p>${order.address}, ${order.city}</p>
              <p>Tổng tiền: ${adminApi.formatCurrency(order.totalAmount)}</p>
            </div>
            <div class="admin-order-status">
              <label for="order-status-${order._id}">Trạng thái</label>
              <select id="order-status-${order._id}">
                ${["pending", "confirmed", "completed", "cancelled"]
                  .map(
                    (status) => `
                      <option value="${status}" ${
                        order.status === status ? "selected" : ""
                      }>${status}</option>
                    `
                  )
                  .join("")}
              </select>
              <button type="button" onclick="updateOrderStatus('${order._id}')">Cập nhật</button>
            </div>
          </div>
          <div class="admin-order-meta">
            <span>Thanh toán: ${order.paymentMethod}</span>
            <span>Khách hàng: ${order.user?.username || "Khách vãng lai"}</span>
            <span>Ngày tạo: ${new Date(order.createdAt).toLocaleString("vi-VN")}</span>
          </div>
          <div class="admin-order-items">
            ${order.items
              .map(
                (item) => `
                  <div class="admin-order-item">
                    <span>${item.title}</span>
                    <span>${item.quantity} x ${adminApi.formatCurrency(item.price)}</span>
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

function renderContactMessages() {
  const container = document.getElementById("contact-message-list");

  if (!container) {
    return;
  }

  if (!adminState.contactMessages.length) {
    container.innerHTML = "<p>Chưa có liên hệ nào từ khách hàng.</p>";
    return;
  }

  container.innerHTML = adminState.contactMessages
    .map(
      (contactMessage) => `
        <article class="admin-order-card">
          <div class="admin-order-head">
            <div>
              <h4>${contactMessage.subject}</h4>
              <p>${contactMessage.name} | ${contactMessage.email}</p>
              <p>${new Date(contactMessage.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div class="admin-order-status">
              <label for="contact-status-${contactMessage._id}">Trạng thái</label>
              <select id="contact-status-${contactMessage._id}">
                ${["new", "read", "replied"]
                  .map(
                    (status) => `
                      <option value="${status}" ${
                        contactMessage.status === status ? "selected" : ""
                      }>${status}</option>
                    `
                  )
                  .join("")}
              </select>
              <button type="button" onclick="updateContactStatus('${contactMessage._id}')">Cập nhật</button>
            </div>
          </div>
          <div class="admin-order-item">
            <span>${contactMessage.message}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderUsers() {
  const container = document.getElementById("user-list");

  if (!container) {
    return;
  }

  if (!adminState.users.length) {
    container.innerHTML = "<p>Chưa có tài khoản nào.</p>";
    return;
  }

  container.innerHTML = adminState.users
    .map(
      (user) => `
        <tr>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${new Date(user.createdAt).toLocaleDateString("vi-VN")}</td>
          <td>
            <select id="user-role-${user._id}">
              <option value="customer" ${
                user.role === "customer" ? "selected" : ""
              }>customer</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
            </select>
          </td>
          <td class="admin-actions-cell">
            <button type="button" onclick="updateUserRole('${user._id}')">Cập nhật quyền</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function updateSummary(summary) {
  const summaryMap = {
    "summary-users": summary.users,
    "summary-categories": summary.categories,
    "summary-products": summary.products,
    "summary-orders": summary.orders,
    "summary-pending-orders": summary.pendingOrders,
    "summary-contact-messages": summary.contactMessages,
    "summary-revenue": adminApi.formatCurrency(summary.totalRevenue),
  };

  Object.entries(summaryMap).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

async function loadSummary() {
  const summary = await adminApi.requestJson("/api/admin/summary", {
    headers: {},
  });
  updateSummary(summary);
}

async function loadCategories() {
  adminState.categories = await adminApi.requestJson("/api/admin/categories", {
    headers: {},
  });
  renderCategories();
  fillProductCategoryOptions();
}

async function loadProducts() {
  adminState.products = await adminApi.requestJson("/api/admin/products?limit=100&sort=newest", {
    headers: {},
  });
  renderProducts();
}

async function loadOrders() {
  adminState.orders = await adminApi.requestJson("/api/admin/orders", {
    headers: {},
  });
  renderOrders();
}

async function loadUsers() {
  adminState.users = await adminApi.requestJson("/api/admin/users", {
    headers: {},
  });
  renderUsers();
}

async function loadContactMessages() {
  adminState.contactMessages = await adminApi.requestJson(
    "/api/admin/contact-messages",
    {
      headers: {},
    }
  );
  renderContactMessages();
}

async function refreshAdminPage() {
  await Promise.all([
    loadSummary(),
    loadCategories(),
    loadProducts(),
    loadOrders(),
    loadContactMessages(),
    loadUsers(),
  ]);
}

window.editCategory = function editCategory(categoryId) {
  const category = adminState.categories.find((item) => item._id === categoryId);

  if (!category) {
    return;
  }

  document.getElementById("category-id").value = category._id;
  document.getElementById("category-name").value = category.name;
  document.getElementById("category-description").value = category.description || "";
  document.getElementById("category-submit").textContent = "Cập nhật danh mục";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteCategory = async function deleteCategory(categoryId) {
  if (!window.confirm("Bạn có chắc muốn xóa danh mục này?")) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/categories/${categoryId}`, {
      method: "DELETE",
    });
    setAdminMessage("Đã xóa danh mục.");
    await refreshAdminPage();
    resetCategoryForm();
  } catch (error) {
    setAdminMessage(error.message, true);
  }
};

window.editProduct = function editProduct(productId) {
  const product = adminState.products.find((item) => item._id === productId);

  if (!product) {
    return;
  }

  document.getElementById("product-id").value = product._id;
  document.getElementById("product-title").value = product.title;
  document.getElementById("product-author").value = product.author || "";
  document.getElementById("product-price").value = product.price || 0;
  document.getElementById("product-image").value = product.image || "";
  document.getElementById("product-description").value = product.description || "";
  document.getElementById("product-category").value = product.category?._id || "";
  document.getElementById("product-featured-input").checked = Boolean(product.featured);
  document.getElementById("product-submit").textContent = "Cập nhật sản phẩm";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = async function deleteProduct(productId) {
  if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/products/${productId}`, {
      method: "DELETE",
    });
    setAdminMessage("Đã xóa sản phẩm.");
    await refreshAdminPage();
    resetProductForm();
  } catch (error) {
    setAdminMessage(error.message, true);
  }
};

window.updateOrderStatus = async function updateOrderStatus(orderId) {
  const select = document.getElementById(`order-status-${orderId}`);

  if (!select) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value }),
    });
    setAdminMessage("Đã cập nhật trạng thái đơn hàng.");
    await refreshAdminPage();
  } catch (error) {
    setAdminMessage(error.message, true);
  }
};

window.updateContactStatus = async function updateContactStatus(contactMessageId) {
  const select = document.getElementById(`contact-status-${contactMessageId}`);

  if (!select) {
    return;
  }

  try {
    await adminApi.requestJson(
      `/api/admin/contact-messages/${contactMessageId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      }
    );
    setAdminMessage("Đã cập nhật trạng thái liên hệ.");
    await refreshAdminPage();
  } catch (error) {
    setAdminMessage(error.message, true);
  }
};

window.updateUserRole = async function updateUserRole(userId) {
  const select = document.getElementById(`user-role-${userId}`);

  if (!select) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: select.value }),
    });
    setAdminMessage("Đã cập nhật vai trò tài khoản.");
    await refreshAdminPage();
  } catch (error) {
    setAdminMessage(error.message, true);
  }
};

function bindCategoryForm() {
  const form = document.getElementById("category-form");
  const cancelButton = document.getElementById("category-cancel");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const categoryId = document.getElementById("category-id").value;
    const payload = {
      name: document.getElementById("category-name").value.trim(),
      description: document.getElementById("category-description").value.trim(),
    };

    try {
      await adminApi.requestJson(
        categoryId ? `/api/admin/categories/${categoryId}` : "/api/admin/categories",
        {
          method: categoryId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setAdminMessage(
        categoryId ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới."
      );
      await refreshAdminPage();
      resetCategoryForm();
    } catch (error) {
      setAdminMessage(error.message, true);
    }
  });

  if (cancelButton) {
    cancelButton.addEventListener("click", resetCategoryForm);
  }
}

function bindProductForm() {
  const form = document.getElementById("product-form");
  const cancelButton = document.getElementById("product-cancel");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const productId = document.getElementById("product-id").value;
    const payload = {
      title: document.getElementById("product-title").value.trim(),
      author: document.getElementById("product-author").value.trim(),
      price: document.getElementById("product-price").value,
      image: document.getElementById("product-image").value.trim(),
      description: document.getElementById("product-description").value.trim(),
      category: document.getElementById("product-category").value,
      featured: document.getElementById("product-featured-input").checked,
    };

    try {
      await adminApi.requestJson(
        productId ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: productId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setAdminMessage(productId ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.");
      await refreshAdminPage();
      resetProductForm();
    } catch (error) {
      setAdminMessage(error.message, true);
    }
  });

  if (cancelButton) {
    cancelButton.addEventListener("click", resetProductForm);
  }
}

window.deleteProduct = async function deleteProductWithNotice(productId) {
  if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
    return;
  }

  const product = adminState.products.find((item) => item._id === productId);
  const productTitle = product?.title || "sản phẩm";

  try {
    await adminApi.requestJson(`/api/admin/products/${productId}`, {
      method: "DELETE",
    });
    setAdminNotice(`Đã xóa sản phẩm "${productTitle}".`);
    await refreshAdminPage();
    resetProductForm();
  } catch (error) {
    setAdminNotice(error.message, true);
  }
};

function bindProductForm() {
  const form = document.getElementById("product-form");
  const cancelButton = document.getElementById("product-cancel");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const productId = document.getElementById("product-id").value;
    const payload = {
      title: document.getElementById("product-title").value.trim(),
      author: document.getElementById("product-author").value.trim(),
      price: document.getElementById("product-price").value,
      image: document.getElementById("product-image").value.trim(),
      description: document.getElementById("product-description").value.trim(),
      category: document.getElementById("product-category").value,
      featured: document.getElementById("product-featured-input").checked,
    };

    try {
      await adminApi.requestJson(
        productId ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: productId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setAdminNotice(
        productId
          ? `Đã cập nhật sản phẩm "${payload.title}".`
          : `Đã thêm sản phẩm "${payload.title}".`
      );
      await refreshAdminPage();
      resetProductForm();
    } catch (error) {
      setAdminNotice(error.message, true);
    }
  });

  if (cancelButton) {
    cancelButton.addEventListener("click", resetProductForm);
  }
}

window.updateOrderStatus = async function updateOrderStatusWithNotice(orderId) {
  const select = document.getElementById(`order-status-${orderId}`);

  if (!select) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value }),
    });
    setAdminNotice(`Đã cập nhật trạng thái đơn hàng thành "${select.value}".`);
    await refreshAdminPage();
  } catch (error) {
    setAdminNotice(error.message, true);
  }
};

window.updateContactStatus = async function updateContactStatusWithNotice(contactMessageId) {
  const select = document.getElementById(`contact-status-${contactMessageId}`);

  if (!select) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/contact-messages/${contactMessageId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value }),
    });
    setAdminNotice(`Đã cập nhật trạng thái liên hệ thành "${select.value}".`);
    await refreshAdminPage();
  } catch (error) {
    setAdminNotice(error.message, true);
  }
};

window.updateUserRole = async function updateUserRoleWithNotice(userId) {
  const select = document.getElementById(`user-role-${userId}`);

  if (!select) {
    return;
  }

  try {
    await adminApi.requestJson(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: select.value }),
    });
    setAdminNotice(`Đã cập nhật vai trò tài khoản thành "${select.value}".`);
    await refreshAdminPage();
  } catch (error) {
    setAdminNotice(error.message, true);
  }
};

async function ensureAdminPage() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();
  const adminPage = document.getElementById("admin-page");

  if (!data.isAuthenticated) {
    setAdminAccessMessage("Bạn cần đăng nhập để vào trang quản trị.", true);
    if (adminPage) {
      adminPage.style.display = "none";
    }
    return;
  }

  if (data.user.role !== "admin") {
    setAdminAccessMessage("Tài khoản hiện tại không có quyền quản trị.", true);
    if (adminPage) {
      adminPage.style.display = "none";
    }
    return;
  }

  if (adminPage) {
    adminPage.style.display = "block";
  }

  setAdminAccessMessage("");
  bindCategoryForm();
  bindProductForm();
  resetCategoryForm();
  resetProductForm();
  await refreshAdminPage();
}

ensureAdminPage().catch((error) => {
  setAdminAccessMessage(error.message, true);
});
