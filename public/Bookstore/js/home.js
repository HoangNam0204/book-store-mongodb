const homeApi = window.BookStore || {};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getProductKey(product) {
  return `${String(product.title || "").trim().toLowerCase()}|${String(
    product.author || ""
  )
    .trim()
    .toLowerCase()}`;
}

function getUniqueProducts(products, limit, excludedKeys = new Set()) {
  const uniqueProducts = [];
  const seenKeys = new Set(excludedKeys);

  products.forEach((product) => {
    const productKey = getProductKey(product);

    if (!productKey || seenKeys.has(productKey) || uniqueProducts.length >= limit) {
      return;
    }

    seenKeys.add(productKey);
    uniqueProducts.push(product);
  });

  return uniqueProducts;
}

function buildProductCard(product, badgeLabel, badgeVariant = "default") {
  const categoryName = product.category?.name || "Sách tuyển chọn";
  const description = String(product.description || "").trim();
  const shortDescription = description
    ? `${description.slice(0, 88)}${description.length > 88 ? "..." : ""}`
    : "Đầu sách phù hợp để đọc, tặng quà hoặc bổ sung vào tủ sách cá nhân.";

  return `
    <article class="book-item">
      <div class="book-card-top">
        <span class="book-chip">${escapeHtml(categoryName)}</span>
        <span class="book-badge book-badge--${badgeVariant}">${escapeHtml(
          badgeLabel
        )}</span>
      </div>
      <div class="book-cover" onclick="goToProductDetail('${product._id}')">
        <img
          src="${homeApi.getStoreImage(product.image, product)}"
          alt="${escapeHtml(product.title)}"
          data-title="${escapeHtml(product.title)}"
          data-author="${escapeHtml(product.author || "")}"
          data-category="${escapeHtml(categoryName)}"
          loading="lazy"
          onerror="window.handleStoreImageError(this)"
        >
      </div>
      <h3>${escapeHtml(product.title)}</h3>
      <p class="book-author">${escapeHtml(product.author || "Chưa cập nhật tác giả")}</p>
      <p class="book-description">${escapeHtml(shortDescription)}</p>
      <p class="book-price">${homeApi.formatCurrency(product.price)}</p>
      <div class="book-card-actions">
        <button type="button" onclick="goToProductDetail('${product._id}')">Chi tiết</button>
        <button type="button" onclick="addToCart('${product._id}')">Thêm vào giỏ</button>
        <button type="button" onclick="buyNow('${product._id}')">Mua ngay</button>
      </div>
    </article>
  `;
}

function renderHomeSection(containerId, products, badgeLabel, badgeVariant) {
  const container = document.getElementById(containerId);

  if (!container) {
    return;
  }

  if (!products.length) {
    container.innerHTML = `
      <div class="book-item">
        <p>Chưa có sản phẩm để hiển thị.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products
    .map((product) => buildProductCard(product, badgeLabel, badgeVariant))
    .join("");
}

async function loadHomeProducts() {
  try {
    const products = await homeApi.requestJson("/api/products?limit=30&sort=newest", {
      headers: {},
    });

    const newest = getUniqueProducts([...products], 4);
    const newestKeys = new Set(newest.map(getProductKey));
    const featured = getUniqueProducts(
      products.filter((product) => product.featured),
      4,
      newestKeys
    );
    const reservedKeys = new Set([
      ...newest.map(getProductKey),
      ...featured.map(getProductKey),
    ]);
    const budgetFriendly = getUniqueProducts(
      [...products].sort(
        (first, second) => Number(first.price || 0) - Number(second.price || 0)
      ),
      4,
      reservedKeys
    );

    renderHomeSection("new-books", newest, "Mới", "new");
    renderHomeSection(
      "featured-books-list",
      featured.length ? featured : newest,
      "Nổi bật",
      "featured"
    );
    renderHomeSection(
      "recommended-books",
      budgetFriendly.length ? budgetFriendly : newest,
      "Gợi ý",
      "recommended"
    );
  } catch (error) {
    ["new-books", "featured-books-list", "recommended-books"].forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `<div class="book-item"><p>${error.message}</p></div>`;
      }
    });
  }
}

loadHomeProducts();
