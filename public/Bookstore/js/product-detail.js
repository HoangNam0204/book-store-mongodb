const productDetailApi = window.BookStore || {};
let currentProduct = null;

function getProductIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function renderProductDetail(product) {
  const titleElement = document.getElementById("product-title");
  const imageElement = document.getElementById("product-image");
  const authorElement = document.getElementById("product-author");
  const categoryElement = document.getElementById("product-category");
  const priceElement = document.getElementById("product-price");
  const descriptionElement = document.getElementById("product-description");
  const featuredBadge = document.getElementById("product-featured");

  document.title = `${product.title} - BookStore`;

  if (titleElement) {
    titleElement.textContent = product.title;
  }

  if (imageElement) {
    imageElement.src = productDetailApi.getStoreImage(product.image, product);
    imageElement.alt = product.title;
    imageElement.dataset.title = product.title;
    imageElement.dataset.author = product.author || "";
    imageElement.dataset.category = product.category?.name || "";
    imageElement.onerror = function onProductImageError() {
      window.handleStoreImageError(imageElement);
    };
  }

  if (authorElement) {
    authorElement.textContent = product.author || "Chưa cập nhật";
  }

  if (categoryElement) {
    categoryElement.textContent = product.category?.name || "Chưa phân loại";
  }

  if (priceElement) {
    priceElement.textContent = productDetailApi.formatCurrency(product.price);
  }

  if (descriptionElement) {
    descriptionElement.textContent =
      product.description || "Chưa có mô tả cho sản phẩm này.";
  }

  if (featuredBadge) {
    featuredBadge.style.display = product.featured ? "inline-flex" : "none";
  }
}

function renderRelatedProducts(products) {
  const container = document.getElementById("related-products");

  if (!container) {
    return;
  }

  if (!products.length) {
    container.innerHTML = "<p>Chưa có sản phẩm liên quan.</p>";
    return;
  }

  container.innerHTML = products
    .map(
      (product) => `
        <div class="product-item">
          <img
            src="${productDetailApi.getStoreImage(product.image, product)}"
            alt="${product.title}"
            data-title="${product.title}"
            data-author="${product.author || ""}"
            data-category="${product.category?.name || ""}"
            onerror="window.handleStoreImageError(this)"
          >
          <p class="related-title">${product.title}</p>
          <p class="related-price">${productDetailApi.formatCurrency(product.price)}</p>
          <button type="button" onclick="goToProductDetail('${product._id}')">Xem chi tiết</button>
        </div>
      `
    )
    .join("");
}

window.addCurrentProductToCart = async function addCurrentProductToCart() {
  const quantity = Math.max(1, Number(document.getElementById("quantity")?.value || 1));

  if (!currentProduct) {
    return;
  }

  await window.addToCart(currentProduct._id, quantity);
};

window.buyCurrentProduct = async function buyCurrentProduct() {
  const quantity = Math.max(1, Number(document.getElementById("quantity")?.value || 1));

  if (!currentProduct) {
    return;
  }

  await window.buyNow(currentProduct._id, quantity);
};

async function loadProductDetailPage() {
  const pageMessage = document.getElementById("product-detail-message");
  const productId = getProductIdFromUrl();

  if (!productId) {
    if (pageMessage) {
      pageMessage.textContent = "Không tìm thấy mã sản phẩm.";
    }
    return;
  }

  try {
    currentProduct = await productDetailApi.requestJson(`/api/products/${productId}`, {
      headers: {},
    });

    renderProductDetail(currentProduct);

    if (currentProduct.category?._id) {
      const relatedProducts = await productDetailApi.requestJson(
        `/api/products?category=${currentProduct.category._id}&limit=5&sort=newest`,
        { headers: {} }
      );

      renderRelatedProducts(
        relatedProducts.filter((product) => product._id !== currentProduct._id).slice(0, 4)
      );
    } else {
      const latestProducts = await productDetailApi.requestJson(
        "/api/products?limit=5&sort=newest",
        { headers: {} }
      );

      renderRelatedProducts(
        latestProducts.filter((product) => product._id !== currentProduct._id).slice(0, 4)
      );
    }
  } catch (error) {
    if (pageMessage) {
      pageMessage.textContent = error.message;
      pageMessage.style.color = "#a80000";
    }
  }
}

loadProductDetailPage();
