const STORE_FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
      <rect width="100%" height="100%" fill="#ece7df" />
      <rect x="36" y="44" width="328" height="472" rx="18" fill="#ffffff" stroke="#c6bfb3" stroke-width="3" />
      <text x="50%" y="46%" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" fill="#7a7268">BookStore</text>
      <text x="50%" y="54%" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="#9a9187">Hình ảnh đang cập nhật</text>
    </svg>
  `);

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

const STORE_LOCAL_COVERS = new Map([
  ["nghi giau lam giau|napoleon hill", "assets/books/nghi-giau-lam-giau.jpg"],
  ["muon kiep nhan sinh|nguyen phong", "assets/books/muon-kiep-nhan-sinh.jpg"],
  ["quoc gia khoi nghiep|dan senor", "assets/books/quoc-gia-khoi-nghiep.jpg"],
  ["dam bi ghet|koga fumitake", "assets/books/dam-bi-ghet.jpg"],
  ["nha gia kim|paulo coelho", "assets/books/nha-gia-kim.jpg"],
  ["dac nhan tam|dale carnegie", "assets/books/dac-nhan-tam.jpg"],
  ["tam ly hoc toi pham|steven g", "assets/books/tam-ly-hoc-toi-pham.jpg"],
  ["tu duy nguoc|adam grant", "assets/books/tu-duy-nguoc.jpg"],
  ["de men phieu luu ky|to hoai", "assets/books/de-men-phieu-luu-ky.jpg"],
  ["vu tru trong vo hat de|stephen hawking", "assets/books/vu-tru-trong-vo-hat-de.jpg"],
  ["but bi thien long tl 027|thien long", "assets/books/but-bi-thien-long-tl-027.jpg"],
  ["thuoc ke 20cm flexoffice|flexoffice", "assets/books/thuoc-ke-20cm-flexoffice-real.jpg"],
  ["tay pentel hi polymer|pentel", "assets/books/tay-pentel-hi-polymer-real.png"],
  ["so tay campus b5|campus", "assets/books/so-tay-campus-b5.jpg"],
  ["but chi 2b staedtler|staedtler", "assets/books/but-chi-2b-staedtler.jpg"],
]);

const CART_SNAPSHOT_KEY = "bookstore_cart_snapshot_v1";

function canUseLocalStorage() {
  try {
    return typeof window.localStorage !== "undefined";
  } catch (error) {
    return false;
  }
}

function saveCartSnapshot(cart) {
  if (!canUseLocalStorage() || !cart) {
    return;
  }

  if (!Array.isArray(cart.items) || !cart.items.length) {
    window.localStorage.removeItem(CART_SNAPSHOT_KEY);
    return;
  }

  const snapshot = {
    items: cart.items.map((item) => ({
      quantity: Number(item.quantity || 1),
      product: {
        id: item.product?.id || "",
        title: item.product?.title || "",
        author: item.product?.author || "",
        price: Number(item.product?.price || 0),
        image: item.product?.image || "",
      },
    })),
  };

  window.localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function readCartSnapshot() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(CART_SNAPSHOT_KEY);
    if (!value) {
      return null;
    }

    const snapshot = JSON.parse(value);
    return Array.isArray(snapshot?.items) ? snapshot : null;
  } catch (error) {
    return null;
  }
}

function clearCartSnapshot() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(CART_SNAPSHOT_KEY);
}

function createCartStateFromSnapshot(snapshot) {
  const snapshotItems = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const items = snapshotItems
    .filter((item) => item?.product?.id)
    .map((item, index) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const price = Number(item.product.price || 0);

      return {
        itemId: `snapshot-${index + 1}`,
        quantity,
        lineTotal: price * quantity,
        product: {
          id: item.product.id,
          title: item.product.title || "Sản phẩm",
          author: item.product.author || "",
          price,
          image: item.product.image || "",
          description: item.product.description || "",
          category: item.product.category || null,
        },
      };
    });

  return {
    id: "snapshot-cart",
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
    isEmpty: items.length === 0,
    isSnapshot: true,
  };
}

function upsertProductIntoSnapshot(product, quantity = 1) {
  if (!product?._id && !product?.id) {
    return createCartStateFromSnapshot(readCartSnapshot());
  }

  const productId = product.id || product._id;
  const snapshot = readCartSnapshot() || { items: [] };
  const existingItem = snapshot.items.find((item) => item?.product?.id === productId);

  if (existingItem) {
    existingItem.quantity = Math.max(1, Number(existingItem.quantity || 1)) + Math.max(1, Number(quantity || 1));
  } else {
    snapshot.items.push({
      quantity: Math.max(1, Number(quantity || 1)),
      product: {
        id: productId,
        title: product.title || "Sản phẩm",
        author: product.author || "",
        price: Number(product.price || 0),
        image: product.image || "",
        description: product.description || "",
        category: product.category
          ? {
              id: product.category.id || product.category._id || "",
              name: product.category.name || "",
            }
          : null,
      },
    });
  }

  if (canUseLocalStorage()) {
    window.localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  return createCartStateFromSnapshot(snapshot);
}

function normalizeStoreCoverKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getProductCoverKey(productMeta) {
  if (!productMeta) {
    return "";
  }

  return `${normalizeStoreCoverKey(productMeta.title)}|${normalizeStoreCoverKey(
    productMeta.author
  )}`;
}

function getLocalStoreCover(productMeta) {
  const coverKey = getProductCoverKey(productMeta);
  return STORE_LOCAL_COVERS.get(coverKey) || null;
}

const STORE_COVER_CACHE = new Map();
const STORE_COVER_PALETTES = [
  {
    background: "#efe3d4",
    panel: "#f9f5ef",
    accent: "#7d1010",
    soft: "#f3d9c8",
    text: "#243040",
    subtext: "#5c6675",
  },
  {
    background: "#e5efe5",
    panel: "#f7fbf7",
    accent: "#315f3f",
    soft: "#d7ebdb",
    text: "#21332c",
    subtext: "#587060",
  },
  {
    background: "#e3e7f6",
    panel: "#f7f8fd",
    accent: "#2f4f92",
    soft: "#d8e1fb",
    text: "#203150",
    subtext: "#5e6c8d",
  },
  {
    background: "#f3e3ef",
    panel: "#fff7fc",
    accent: "#8e326b",
    soft: "#f4d7ea",
    text: "#40263b",
    subtext: "#7d5d73",
  },
  {
    background: "#f2ead8",
    panel: "#fffaf1",
    accent: "#8d5a12",
    soft: "#f5e1bc",
    text: "#43331d",
    subtext: "#7a6954",
  },
];

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hashString(value) {
  return [...String(value || "")].reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 0);
}

function wrapCoverText(value, maxCharactersPerLine, maxLines) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return ["BookStore"];
  }

  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharactersPerLine) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    lines.push(word.slice(0, maxCharactersPerLine));
    currentLine = word.slice(maxCharactersPerLine);
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    const limitedLines = lines.slice(0, maxLines);
    const lastIndex = limitedLines.length - 1;
    limitedLines[lastIndex] = `${limitedLines[lastIndex].slice(
      0,
      Math.max(0, maxCharactersPerLine - 3)
    )}...`;
    return limitedLines;
  }

  return lines;
}

function getBookCategoryName(productMeta) {
  if (!productMeta) {
    return "Tuyen chon";
  }

  if (typeof productMeta.category === "string") {
    return productMeta.category;
  }

  return productMeta.category?.name || "Tuyen chon";
}

function createStoreCover(productMeta = {}) {
  const coverKey = JSON.stringify({
    title: productMeta.title || "",
    author: productMeta.author || "",
    category: getBookCategoryName(productMeta),
  });

  if (STORE_COVER_CACHE.has(coverKey)) {
    return STORE_COVER_CACHE.get(coverKey);
  }

  const palette =
    STORE_COVER_PALETTES[
      hashString(`${productMeta.title || ""}${productMeta.author || ""}`) %
        STORE_COVER_PALETTES.length
    ];
  const titleLines = wrapCoverText(productMeta.title || "BookStore", 16, 4);
  const authorLine = wrapCoverText(productMeta.author || "BookStore", 22, 1)[0];
  const categoryLine = wrapCoverText(getBookCategoryName(productMeta), 16, 1)[0];
  const firstTitleBlock = titleLines.slice(0, 2);
  const secondTitleBlock = titleLines.slice(2);

  const firstBlockSvg = firstTitleBlock
    .map(
      (line, index) => `
        <text x="48" y="${184 + index * 44}" font-size="34" font-weight="800" font-family="Arial, sans-serif" fill="${palette.text}">
          ${escapeSvgText(line)}
        </text>
      `
    )
    .join("");

  const secondBlockSvg = secondTitleBlock
    .map(
      (line, index) => `
        <text x="48" y="${308 + index * 40}" font-size="30" font-weight="800" font-family="Arial, sans-serif" fill="${palette.text}">
          ${escapeSvgText(line)}
        </text>
      `
    )
    .join("");

  const dataUri =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
        <rect width="400" height="560" fill="${palette.background}" />
        <rect x="28" y="28" width="344" height="504" rx="28" fill="${palette.panel}" />
        <circle cx="322" cy="102" r="56" fill="${palette.soft}" />
        <circle cx="302" cy="458" r="74" fill="${palette.soft}" opacity="0.9" />
        <rect x="48" y="48" width="122" height="34" rx="17" fill="${palette.accent}" opacity="0.12" />
        <text x="60" y="71" font-size="16" font-weight="700" font-family="Arial, sans-serif" fill="${palette.accent}">
          ${escapeSvgText(categoryLine)}
        </text>
        <rect x="48" y="110" width="130" height="4" rx="2" fill="${palette.accent}" />
        ${firstBlockSvg}
        ${secondBlockSvg}
        <rect x="48" y="420" width="126" height="2" fill="${palette.accent}" opacity="0.6" />
        <text x="48" y="456" font-size="18" font-weight="700" font-family="Arial, sans-serif" fill="${palette.subtext}">
          ${escapeSvgText(authorLine)}
        </text>
        <text x="48" y="494" font-size="14" font-family="Arial, sans-serif" fill="${palette.subtext}">
          BookStore Selection
        </text>
      </svg>
    `);

  STORE_COVER_CACHE.set(coverKey, dataUri);
  return dataUri;
}

function shouldUseGeneratedCover(image) {
  return /fahasa\.com/i.test(String(image || "").trim());
}

function getStoreImage(image, productMeta = null) {
  const localCover = getLocalStoreCover(productMeta);

  if (localCover) {
    return localCover;
  }

  if (!image || typeof image !== "string") {
    return productMeta ? createStoreCover(productMeta) : STORE_FALLBACK_IMAGE;
  }

  const trimmedImage = image.trim();

  if (trimmedImage.startsWith("data:image/")) {
    return trimmedImage;
  }

  if (trimmedImage.startsWith("/")) {
    return trimmedImage;
  }

  if (shouldUseGeneratedCover(trimmedImage)) {
    return productMeta ? createStoreCover(productMeta) : STORE_FALLBACK_IMAGE;
  }

  if (trimmedImage.startsWith("http://") || trimmedImage.startsWith("https://")) {
    return trimmedImage;
  }

  return productMeta ? createStoreCover(productMeta) : STORE_FALLBACK_IMAGE;
}

function handleStoreImageError(imageElement) {
  if (!imageElement) {
    return;
  }

  imageElement.onerror = null;
  const productMeta = {
    title: imageElement.dataset.title || imageElement.alt || "BookStore",
    author: imageElement.dataset.author || "",
    category: imageElement.dataset.category || "",
  };
  imageElement.src = getLocalStoreCover(productMeta) || createStoreCover(productMeta);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({
    message: "Không thể xử lý phản hồi từ máy chủ.",
  }));

  if (!response.ok) {
    throw new Error(data.message || "Yêu cầu không thành công.");
  }

  return data;
}

async function getCartState() {
  const cart = await requestJson("/api/cart", {
    headers: {},
  });

  if (!cart.isEmpty) {
    saveCartSnapshot(cart);
    return cart;
  }

  clearCartSnapshot();
  return cart;
}

function setPageMessage(selector, message, isError = false) {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  element.textContent = message;
  element.style.color = isError ? "#a80000" : "#1d6b3d";
}

let storeToastTimeoutId = null;
let storeBannerTimeoutId = null;

function showStoreToast(message, isError = false) {
  let toast = document.getElementById("store-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "store-toast";
    toast.style.position = "fixed";
    toast.style.top = "24px";
    toast.style.right = "24px";
    toast.style.zIndex = "2000";
    toast.style.minWidth = "280px";
    toast.style.maxWidth = "420px";
    toast.style.padding = "14px 18px";
    toast.style.borderRadius = "12px";
    toast.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.18)";
    toast.style.color = "#fff";
    toast.style.fontSize = "15px";
    toast.style.fontWeight = "600";
    toast.style.lineHeight = "1.5";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.background = isError ? "#a80000" : "#1d6b3d";
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  if (storeToastTimeoutId) {
    clearTimeout(storeToastTimeoutId);
  }

  storeToastTimeoutId = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
  }, 2400);
}

function showStoreBanner(message, isError = false) {
  let banner = document.getElementById("store-status-banner");

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "store-status-banner";
    banner.style.position = "sticky";
    banner.style.top = "96px";
    banner.style.zIndex = "1500";
    banner.style.width = "min(1200px, calc(100% - 32px))";
    banner.style.margin = "16px auto 0";
    banner.style.padding = "14px 18px";
    banner.style.borderRadius = "14px";
    banner.style.fontSize = "15px";
    banner.style.fontWeight = "600";
    banner.style.lineHeight = "1.5";
    banner.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.08)";
    banner.style.border = "1px solid rgba(119, 0, 0, 0.12)";

    const header = document.querySelector("header");

    if (header) {
      header.insertAdjacentElement("afterend", banner);
    } else {
      document.body.prepend(banner);
    }
  }

  banner.textContent = message;
  banner.style.display = "block";
  banner.style.background = isError ? "#fff2f2" : "#eef9f1";
  banner.style.color = isError ? "#a80000" : "#1d6b3d";

  if (storeBannerTimeoutId) {
    clearTimeout(storeBannerTimeoutId);
  }

  storeBannerTimeoutId = setTimeout(() => {
    banner.style.display = "none";
  }, 4200);
}

function handleCartStatusFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const cartStatus = params.get("cartStatus");

  if (!cartStatus) {
    return;
  }

  if (cartStatus === "added") {
    showStoreToast("Đã thêm sản phẩm vào giỏ hàng.");
  } else if (cartStatus === "error") {
    showStoreToast("Không thể thêm sản phẩm vào giỏ hàng.", true);
  }

  params.delete("cartStatus");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function handleCartStatusFeedback() {
  const params = new URLSearchParams(window.location.search);
  const cartStatus = params.get("cartStatus");

  if (!cartStatus) {
    return;
  }

  if (cartStatus === "added") {
    showStoreToast("Đã thêm vào giỏ hàng.");
    showStoreBanner("Đã thêm vào giỏ hàng.");
  } else if (cartStatus === "error") {
    showStoreToast("Không thể thêm vào giỏ hàng.", true);
    showStoreBanner("Không thể thêm vào giỏ hàng.", true);
  }

  params.delete("cartStatus");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function renderCartDropdown(cart) {
  const cartItemsContainer = document.querySelector(".cart-items");
  const cartButton = document.querySelector(".gio-hang > button");

  if (!cartItemsContainer) {
    return;
  }

  if (cartButton) {
    cartButton.innerHTML = `Giỏ hàng (${cart.totalItems}) <span class="arrow-down">▼</span>`;
  }

  if (!cart.items.length) {
    cartItemsContainer.innerHTML = `
      <li class="cart-item">
        <div class="cart-item-details">
          <span class="cart-item-name">Giỏ hàng đang trống</span>
        </div>
      </li>
    `;
    return;
  }

  cartItemsContainer.innerHTML = cart.items
    .map(
      (item) => `
        <li class="cart-item">
          <img
            src="${getStoreImage(item.product.image, item.product)}"
            alt="${item.product.title}"
            class="cart-item-image"
            onerror="window.handleStoreImageError(this)"
          >
          <div class="cart-item-details">
            <span class="cart-item-name">${item.product.title}</span>
            <span class="cart-item-price">${formatCurrency(item.product.price)}</span>
            <span class="cart-item-quantity">Số lượng: ${item.quantity}</span>
          </div>
        </li>
      `
    )
    .join("");
}

function renderCartPageState(cartList, cartCount, cartTotal, cart) {
  renderCartDropdown(cart);
  cartCount.textContent = `GIỎ HÀNG (${cart.totalItems} sản phẩm)`;
  cartTotal.textContent = formatCurrency(cart.totalAmount);

  if (!cart.items.length) {
    cartList.innerHTML = `
      <div class="cart-item">
        <div class="cart-item-details">
          <h3>Giỏ hàng đang trống</h3>
          <p>Hãy quay lại trang sản phẩm để thêm sách vào giỏ.</p>
        </div>
      </div>
    `;
    return;
  }

  cartList.innerHTML = cart.items
    .map((item) => {
      const isSnapshotItem = String(item.itemId || "").startsWith("snapshot-");

      return `
        <div class="cart-item">
          <img
            src="${getStoreImage(item.product.image, item.product)}"
            alt="${item.product.title}"
            onerror="window.handleStoreImageError(this)"
          >
          <div class="cart-item-details">
            <h3>${item.product.title}</h3>
            <p>Tác giả: ${item.product.author || "Chưa cập nhật"}</p>
            <p>Giá: ${formatCurrency(item.product.price)}</p>
            <label>
              Số lượng:
              <input
                type="number"
                min="1"
                value="${item.quantity}"
                ${isSnapshotItem ? "disabled" : ""}
                onchange="updateCartItemQuantity('${item.itemId}', Number(this.value))"
                style="width: 70px; margin-left: 8px;"
              >
            </label>
            ${
              isSnapshotItem
                ? '<p style="margin-top: 8px; color: #666; font-size: 14px;">Đang đồng bộ giỏ hàng...</p>'
                : ""
            }
          </div>
          <div class="cart-item-price">${formatCurrency(item.lineTotal)}</div>
          <div
            class="cart-item-remove"
            ${isSnapshotItem ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="removeCartItem('${item.itemId}')"`}>
            Xóa
          </div>
        </div>
      `;
    })
    .join("");
}

function renderCheckoutState(checkoutItems, checkoutTotal, confirmButton, cart) {
  renderCartDropdown(cart);
  checkoutTotal.textContent = formatCurrency(cart.totalAmount);

  if (!cart.items.length) {
    checkoutItems.innerHTML = `
      <div class="cart-item">
        <div class="cart-item-details">
          <h4>Giỏ hàng đang trống</h4>
          <p>Không có sản phẩm nào để thanh toán.</p>
        </div>
      </div>
    `;

    if (confirmButton) {
      confirmButton.disabled = true;
    }

    return;
  }

  if (confirmButton) {
    confirmButton.disabled = Boolean(cart.isSnapshot);
  }

  checkoutItems.innerHTML = cart.items
    .map(
      (item) => `
        <div class="cart-item">
          <img
            src="${getStoreImage(item.product.image, item.product)}"
            alt="${item.product.title}"
            onerror="window.handleStoreImageError(this)"
          >
          <div class="cart-item-details">
            <h4>${item.product.title}</h4>
            <p>Số lượng: ${item.quantity}</p>
            ${
              cart.isSnapshot
                ? '<p style="color: #666; font-size: 14px;">Đang đồng bộ giỏ hàng...</p>'
                : ""
            }
          </div>
          <div class="cart-item-price">${formatCurrency(item.lineTotal)}</div>
        </div>
      `
    )
    .join("");
}

function renderCheckoutStateModern(checkoutItems, checkoutTotal, confirmButton, cart) {
  const checkoutCount = document.getElementById("checkout-count");
  const checkoutTotalFinal = document.getElementById("checkout-total-final");

  renderCartDropdown(cart);
  checkoutTotal.textContent = formatCurrency(cart.totalAmount);

  if (checkoutTotalFinal) {
    checkoutTotalFinal.textContent = formatCurrency(cart.totalAmount);
  }

  if (checkoutCount) {
    checkoutCount.textContent = `${cart.totalItems} sản phẩm`;
  }

  if (!cart.items.length) {
    checkoutItems.innerHTML = `
      <div class="checkout-empty-state">
        <h4>Giỏ hàng đang trống</h4>
        <p>Không có sản phẩm nào để thanh toán. Hãy quay lại trang sản phẩm để tiếp tục mua sắm.</p>
      </div>
    `;

    if (confirmButton) {
      confirmButton.disabled = true;
    }

    return;
  }

  if (confirmButton) {
    confirmButton.disabled = Boolean(cart.isSnapshot);
  }

  checkoutItems.innerHTML = cart.items
    .map(
      (item) => `
        <div class="checkout-item">
          <img
            src="${getStoreImage(item.product.image, item.product)}"
            alt="${item.product.title}"
            onerror="window.handleStoreImageError(this)"
          >
          <div class="checkout-item-copy">
            <h4>${item.product.title}</h4>
            <p>${item.product.author || "Chưa cập nhật tác giả"}</p>
            <div class="checkout-item-meta">
              <span>Số lượng: ${item.quantity}</span>
              <span>Đơn giá: ${formatCurrency(item.product.price)}</span>
            </div>
            ${
              cart.isSnapshot
                ? '<p style="margin-top: 10px; color: #666; font-size: 13px;">Đang đồng bộ giỏ hàng...</p>'
                : ""
            }
          </div>
          <div class="checkout-item-price">${formatCurrency(item.lineTotal)}</div>
        </div>
      `
    )
    .join("");
}

async function loadCartPreview() {
  try {
    const cart = await getCartState();
    renderCartDropdown(cart);
    return cart;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function addToCart(productId, quantity = 1) {
  const result = await requestJson("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });

  renderCartDropdown(result.cart);
  saveCartSnapshot(result.cart);
  return result.cart;
}

function buildCartActionUrl(action, productId, quantity, redirectPath) {
  const params = new URLSearchParams();
  params.set("quantity", String(Math.max(1, Number(quantity || 1))));
  params.set("redirect", redirectPath || "/Bookstore/Gio_hang.html");
  return `/cart/${action}/${productId}?${params.toString()}`;
}

window.goToProductDetail = function goToProductDetail(productId) {
  window.location.href = `Chi_tiet_san_pham.html?id=${productId}`;
};

window.updateCartItemQuantity = async function updateCartItemQuantity(itemId, quantity) {
  try {
    const result = await requestJson(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });

    renderCartDropdown(result.cart);
    saveCartSnapshot(result.cart);
    await window.loadCartPage();
  } catch (error) {
    alert(error.message);
  }
};

window.removeCartItem = async function removeCartItem(itemId) {
  try {
    const result = await requestJson(`/api/cart/items/${itemId}`, {
      method: "DELETE",
    });

    renderCartDropdown(result.cart);
    saveCartSnapshot(result.cart);
    await window.loadCartPage();
  } catch (error) {
    alert(error.message);
  }
};

window.loadCartPage = async function loadCartPage() {
  const cartList = document.getElementById("cart-list");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");

  if (!cartList || !cartCount || !cartTotal) {
    return;
  }

  try {
    const cart = await getCartState();
    renderCartPageState(cartList, cartCount, cartTotal, cart);
    return;

    renderCartDropdown(cart);
    cartCount.textContent = `GIỎ HÀNG (${cart.totalItems} sản phẩm)`;
    cartTotal.textContent = formatCurrency(cart.totalAmount);

    if (!cart.items.length) {
      cartList.innerHTML = `
        <div class="cart-item">
          <div class="cart-item-details">
            <h3>Giỏ hàng đang trống</h3>
            <p>Hãy quay lại trang sản phẩm để thêm sách vào giỏ.</p>
          </div>
        </div>
      `;
      return;
    }

    cartList.innerHTML = cart.items
      .map(
        (item) => `
          <div class="cart-item">
            <img
              src="${getStoreImage(item.product.image, item.product)}"
              alt="${item.product.title}"
              onerror="window.handleStoreImageError(this)"
            >
            <div class="cart-item-details">
              <h3>${item.product.title}</h3>
              <p>Tác giả: ${item.product.author || "Chưa cập nhật"}</p>
              <p>Giá: ${formatCurrency(item.product.price)}</p>
              <label>
                Số lượng:
                <input
                  type="number"
                  min="1"
                  value="${item.quantity}"
                  onchange="updateCartItemQuantity('${item.itemId}', Number(this.value))"
                  style="width: 70px; margin-left: 8px;"
                >
              </label>
            </div>
            <div class="cart-item-price">${formatCurrency(item.lineTotal)}</div>
            <div class="cart-item-remove" onclick="removeCartItem('${item.itemId}')">Xóa</div>
          </div>
        `
      )
      .join("");
  } catch (error) {
    cartList.innerHTML = `
      <div class="cart-item">
        <div class="cart-item-details">
          <h3>Lỗi tải giỏ hàng</h3>
          <p>${error.message}</p>
        </div>
      </div>
    `;
  }
};

window.loadCheckoutPage = async function loadCheckoutPage() {
  const checkoutItems = document.getElementById("checkout-items");
  const checkoutTotal = document.getElementById("checkout-total");
  const confirmButton = document.getElementById("confirm-order-btn");

  if (!checkoutItems || !checkoutTotal) {
    return;
  }

  try {
    const cart = await getCartState();
    renderCheckoutStateModern(checkoutItems, checkoutTotal, confirmButton, cart);
    return;

    renderCartDropdown(cart);
    checkoutTotal.textContent = formatCurrency(cart.totalAmount);

    if (!cart.items.length) {
      checkoutItems.innerHTML = `
        <div class="cart-item">
          <div class="cart-item-details">
            <h4>Giỏ hàng đang trống</h4>
            <p>Không có sản phẩm nào để thanh toán.</p>
          </div>
        </div>
      `;

      if (confirmButton) {
        confirmButton.disabled = true;
      }

      return;
    }

    if (confirmButton) {
      confirmButton.disabled = false;
    }

    checkoutItems.innerHTML = cart.items
      .map(
        (item) => `
          <div class="cart-item">
            <img
              src="${getStoreImage(item.product.image, item.product)}"
              alt="${item.product.title}"
              onerror="window.handleStoreImageError(this)"
            >
            <div class="cart-item-details">
              <h4>${item.product.title}</h4>
              <p>Số lượng: ${item.quantity}</p>
            </div>
            <div class="cart-item-price">${formatCurrency(item.lineTotal)}</div>
          </div>
        `
      )
      .join("");
  } catch (error) {
    checkoutItems.innerHTML = `
      <div class="cart-item">
        <div class="cart-item-details">
          <h4>Lỗi tải đơn hàng</h4>
          <p>${error.message}</p>
        </div>
      </div>
    `;
  }
};

window.submitOrder = async function submitOrder() {
  const payload = {
    customerName: document.getElementById("name")?.value || "",
    phone: document.getElementById("phone")?.value || "",
    address: document.getElementById("address")?.value || "",
    city: document.getElementById("city")?.value || "",
    postalCode: document.getElementById("postal-code")?.value || "",
    paymentMethod:
      document.querySelector('input[name="payment"]:checked')?.value || "cash",
    cardNumber: document.getElementById("card-number")?.value || "",
    expiryDate: document.getElementById("expiry-date")?.value || "",
    cvv: document.getElementById("cvv")?.value || "",
  };

  const result = await requestJson("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  clearCartSnapshot();
  await loadCartPreview();
  const params = new URLSearchParams({
    orderId: result.orderId,
    totalAmount: String(result.totalAmount || 0),
  });

  window.location.href = `Dat_hang_thanh_cong.html?${params.toString()}`;
};

window.BookStore = {
  formatCurrency,
  getStoreImage,
  fallbackImage: STORE_FALLBACK_IMAGE,
  handleStoreImageError,
  requestJson,
  setPageMessage,
  showStoreToast,
  loadCartPreview,
  renderCartDropdown,
};

window.handleStoreImageError = handleStoreImageError;

window.addToCart = function addToCartHandler(productId, quantity = 1) {
  const redirectPath = `${window.location.pathname}${window.location.search}`;
  window.location.href = buildCartActionUrl("add", productId, quantity, redirectPath);
};

window.buyNow = function buyNowHandler(productId, quantity = 1) {
  window.location.href = buildCartActionUrl(
    "buy-now",
    productId,
    quantity,
    "/Bookstore/Thanh_toan.html"
  );
};

handleCartStatusFeedback();
loadCartPreview();

if (document.getElementById("cart-list")) {
  window.loadCartPage();
}

if (document.getElementById("checkout-items")) {
  window.loadCheckoutPage();
}
