const path = require("path");
const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const Category = require("./models/Category");
const Product = require("./models/Product");
const User = require("./models/User");
const Cart = require("./models/Cart");
const Order = require("./models/Order");
const ContactMessage = require("./models/ContactMessage");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const { MONGO_URI, SESSION_SECRET = "bookstore_secret" } = process.env;
const ORDER_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const isProduction = process.env.NODE_ENV === "production";

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    maxAge: 0,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("trust proxy", 1);

app.use(
  session({
    secret: SESSION_SECRET,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24,
      autoRemove: "native",
      crypto: {
        secret: SESSION_SECRET,
      },
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function handleApiError(res, error, fallbackMessage) {
  if (error?.code === 11000) {
    const duplicatedFields = Object.keys(error.keyPattern || error.keyValue || {});
    const duplicatedFieldLabel = duplicatedFields.length
      ? duplicatedFields.join(", ")
      : "dữ liệu";

    return res.status(409).json({
      message: `Giá trị ${duplicatedFieldLabel} đã tồn tại.`,
    });
  }

  if (error?.status) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUsername(username) {
  return normalizeText(username).toLowerCase();
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return ["true", "1", "yes", "on"].includes(String(value || "").toLowerCase());
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function parsePositiveNumber(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw createHttpError(400, `${fieldName} không hợp lệ.`);
  }

  return parsedValue;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash || "").split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const hashedBuffer = scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (hashedBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashedBuffer, storedHashBuffer);
}

function createSessionUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập." });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập." });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập." });
  }

  return next();
}

function ensureGuestSession(req) {
  if (!req.session.cartGuest) {
    req.session.cartGuest = true;
  }
}

function getCartFilter(req) {
  if (req.session.user?.id) {
    return { user: req.session.user.id };
  }

  ensureGuestSession(req);
  return { sessionKey: req.sessionID, user: null };
}

async function populateCart(cart) {
  if (!cart) {
    return null;
  }

  await cart.populate({
    path: "items.product",
    populate: {
      path: "category",
      select: "name",
    },
  });

  return cart;
}

async function getExistingCart(req) {
  const cart = await Cart.findOne(getCartFilter(req));
  return populateCart(cart);
}

async function getOrCreateCart(req) {
  const filter = getCartFilter(req);
  let cart = await Cart.findOne(filter);

  if (!cart) {
    cart = await Cart.create({
      ...filter,
      items: [],
    });
  }

  return populateCart(cart);
}

async function mergeGuestCartIntoUserCart(req, userId) {
  const guestCart = await Cart.findOne({
    sessionKey: req.sessionID,
    user: null,
  });

  if (!guestCart) {
    return;
  }

  let userCart = await Cart.findOne({ user: userId });

  if (!userCart) {
    guestCart.user = userId;
    guestCart.sessionKey = null;
    await guestCart.save();
    return;
  }

  guestCart.items.forEach((guestItem) => {
    const existingItem = userCart.items.find(
      (item) => item.product.toString() === guestItem.product.toString()
    );

    if (existingItem) {
      existingItem.quantity += guestItem.quantity;
      return;
    }

    userCart.items.push({
      product: guestItem.product,
      quantity: guestItem.quantity,
    });
  });

  await userCart.save();
  await Cart.findByIdAndDelete(guestCart._id);
}

async function syncAuthenticatedCart(req) {
  if (!req.session.user?.id) {
    return;
  }

  await mergeGuestCartIntoUserCart(req, req.session.user.id);
}

async function addProductToCart(req, productId, quantity) {
  if (!isValidObjectId(productId)) {
    throw createHttpError(400, "Sản phẩm không hợp lệ.");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw createHttpError(404, "Không tìm thấy sản phẩm.");
  }

  const cart = await getOrCreateCart(req);
  const existingItem = cart.items.find((item) => {
    const itemProductId =
      item.product?._id?.toString?.() || item.product?.toString?.() || "";
    return itemProductId === productId;
  });

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
    });
  }

  await cart.save();
  await populateCart(cart);
  return serializeCart(cart);
}

function getSafeRedirectTarget(value, fallbackPath) {
  const fallback = fallbackPath || "/Bookstore/Gio_hang.html";
  const normalized = normalizeText(value);

  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}

function appendQueryParamsToTarget(target, params = {}) {
  const [pathname, queryString = ""] = String(target || "").split("?");
  const searchParams = new URLSearchParams(queryString);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const nextQuery = searchParams.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}`;
}

function serializeCart(cart) {
  const items = Array.isArray(cart?.items)
    ? cart.items
        .filter((item) => item.product)
        .map((item) => {
          const price = Number(item.product.price || 0);
          const quantity = Number(item.quantity || 1);

          return {
            itemId: item._id.toString(),
            quantity,
            lineTotal: price * quantity,
            product: {
              id: item.product._id.toString(),
              title: item.product.title,
              author: item.product.author || "",
              price,
              image: item.product.image || "",
              description: item.product.description || "",
              category: item.product.category
                ? {
                    id: item.product.category._id?.toString?.() || "",
                    name: item.product.category.name || "",
                  }
                : null,
            },
          };
        })
    : [];

  return {
    id: cart?._id?.toString() || null,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
    isEmpty: items.length === 0,
  };
}

function buildProductFilter(query) {
  const filter = {};
  const search = normalizeText(query.search);
  const category = normalizeText(query.category);
  const featured = normalizeText(query.featured);

  if (search) {
    const keywordRegex = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { title: keywordRegex },
      { author: keywordRegex },
      { description: keywordRegex },
    ];
  }

  if (isValidObjectId(category)) {
    filter.category = category;
  }

  if (featured) {
    filter.featured = normalizeBoolean(featured);
  }

  return filter;
}

function buildProductSort(sortKey) {
  switch (String(sortKey || "newest")) {
    case "priceAsc":
      return { price: 1, _id: -1 };
    case "priceDesc":
      return { price: -1, _id: -1 };
    case "titleAsc":
      return { title: 1 };
    case "oldest":
      return { _id: 1 };
    case "newest":
    default:
      return { _id: -1 };
  }
}

async function listCategories(req, res) {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    handleApiError(res, error, "Không thể tải danh mục.");
  }
}

async function listProducts(req, res) {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 50), 100));
    const products = await Product.find(buildProductFilter(req.query))
      .populate("category", "name")
      .sort(buildProductSort(req.query.sort))
      .limit(limit);

    res.json(products);
  } catch (error) {
    handleApiError(res, error, "Không thể tải sản phẩm.");
  }
}

async function findCategoryById(categoryId, required = false) {
  const normalizedCategoryId = normalizeText(categoryId);

  if (!normalizedCategoryId) {
    return null;
  }

  if (!isValidObjectId(normalizedCategoryId)) {
    throw createHttpError(400, "Danh mục không hợp lệ.");
  }

  const category = await Category.findById(normalizedCategoryId);

  if (!category && required) {
    throw createHttpError(404, "Không tìm thấy danh mục.");
  }

  return category;
}

async function extractCategoryPayload(body, options = {}) {
  const payload = {};
  const isPartial = Boolean(options.partial);

  if (!isPartial || hasOwn(body, "name")) {
    const name = normalizeText(body.name);

    if (!name) {
      throw createHttpError(400, "Tên danh mục là bắt buộc.");
    }

    payload.name = name;
  }

  if (!isPartial || hasOwn(body, "description")) {
    payload.description = normalizeText(body.description);
  }

  return payload;
}

async function extractProductPayload(body, options = {}) {
  const payload = {};
  const isPartial = Boolean(options.partial);

  if (!isPartial || hasOwn(body, "title")) {
    const title = normalizeText(body.title);

    if (!title) {
      throw createHttpError(400, "Tên sản phẩm là bắt buộc.");
    }

    payload.title = title;
  }

  if (!isPartial || hasOwn(body, "author")) {
    payload.author = normalizeText(body.author);
  }

  if (!isPartial || hasOwn(body, "price")) {
    payload.price = parsePositiveNumber(body.price, "Giá sản phẩm");
  }

  if (!isPartial || hasOwn(body, "image")) {
    payload.image = normalizeText(body.image);
  }

  if (!isPartial || hasOwn(body, "description")) {
    payload.description = normalizeText(body.description);
  }

  if (!isPartial || hasOwn(body, "category")) {
    const category = await findCategoryById(body.category);
    payload.category = category ? category._id : null;
  }

  if (!isPartial || hasOwn(body, "featured")) {
    payload.featured = normalizeBoolean(body.featured);
  }

  return payload;
}

app.get("/", (req, res) => {
  res.redirect("/Bookstore/Trang_chu.html");
});

app.get("/Bookstore", (req, res) => {
  res.redirect("/Bookstore/Trang_chu.html");
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.json({
      isAuthenticated: false,
      user: null,
    });
  }

  return res.json({
    isAuthenticated: true,
    user: req.session.user,
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!username || !email || !password || !confirmPassword) {
      throw createHttpError(400, "Vui lòng nhập đầy đủ thông tin.");
    }

    if (username.length < 3) {
      throw createHttpError(400, "Tên đăng nhập phải có ít nhất 3 ký tự.");
    }

    if (!isValidEmail(email)) {
      throw createHttpError(400, "Email không hợp lệ.");
    }

    if (password.length < 6) {
      throw createHttpError(400, "Mật khẩu phải có ít nhất 6 ký tự.");
    }

    if (password !== confirmPassword) {
      throw createHttpError(400, "Mật khẩu xác nhận không khớp.");
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw createHttpError(409, "Tên đăng nhập hoặc email đã tồn tại.");
    }

    const user = await User.create({
      username,
      email,
      passwordHash: hashPassword(password),
    });

    req.session.user = createSessionUser(user);
    await mergeGuestCartIntoUserCart(req, user._id);
    await saveSession(req);

    return res.status(201).json({
      message: "Đăng ký tài khoản thành công.",
      user: req.session.user,
    });
  } catch (error) {
    return handleApiError(res, error, "Không thể đăng ký tài khoản.");
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const loginValue = normalizeText(req.body.username).toLowerCase();
    const password = String(req.body.password || "");

    if (!loginValue || !password) {
      throw createHttpError(400, "Vui lòng nhập tên đăng nhập và mật khẩu.");
    }

    const user = await User.findOne({
      $or: [{ username: loginValue }, { email: loginValue }],
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw createHttpError(401, "Tên đăng nhập hoặc mật khẩu không đúng.");
    }

    req.session.user = createSessionUser(user);
    await mergeGuestCartIntoUserCart(req, user._id);
    await saveSession(req);

    return res.json({
      message: "Đăng nhập thành công.",
      user: req.session.user,
    });
  } catch (error) {
    return handleApiError(res, error, "Không thể đăng nhập.");
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Không thể đăng xuất." });
    }

    res.clearCookie("connect.sid");
    return res.json({ message: "Đăng xuất thành công." });
  });
});

app.get("/api/categories", listCategories);
app.get("/categories", listCategories);

app.get("/api/products", listProducts);
app.get("/products", listProducts);

app.get("/api/products/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Sản phẩm không hợp lệ.");
    }

    const product = await Product.findById(req.params.id).populate(
      "category",
      "name"
    );

    if (!product) {
      throw createHttpError(404, "Không tìm thấy sản phẩm.");
    }

    res.json(product);
  } catch (error) {
    handleApiError(res, error, "Không thể tải chi tiết sản phẩm.");
  }
});

app.get("/api/cart", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const cart = await getExistingCart(req);
    res.json(serializeCart(cart));
  } catch (error) {
    handleApiError(res, error, "Không thể tải giỏ hàng.");
  }
});

app.post("/api/cart/items", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const productId = normalizeText(req.body.productId);
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const cart = await addProductToCart(req, productId, quantity);

    res.status(201).json({
      message: "Đã thêm sản phẩm vào giỏ hàng.",
      cart,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể thêm vào giỏ hàng.");
  }
});

app.get("/cart/add/:productId", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const quantity = Math.max(1, Number(req.query.quantity || 1));
    await addProductToCart(req, normalizeText(req.params.productId), quantity);

    const redirectTarget = appendQueryParamsToTarget(
      getSafeRedirectTarget(req.query.redirect, "/Bookstore/Gio_hang.html"),
      { cartStatus: "added" }
    );

    return res.redirect(redirectTarget);
  } catch (error) {
    console.error(error);

    return res.redirect(
      appendQueryParamsToTarget("/Bookstore/Gio_hang.html", {
        cartStatus: "error",
      })
    );
  }
});

app.get("/cart/buy-now/:productId", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const quantity = Math.max(1, Number(req.query.quantity || 1));
    await addProductToCart(req, normalizeText(req.params.productId), quantity);

    const redirectTarget = appendQueryParamsToTarget(
      getSafeRedirectTarget(req.query.redirect, "/Bookstore/Thanh_toan.html"),
      { cartStatus: "added" }
    );

    return res.redirect(redirectTarget);
  } catch (error) {
    console.error(error);

    return res.redirect(
      appendQueryParamsToTarget("/Bookstore/Thanh_toan.html", {
        cartStatus: "error",
      })
    );
  }
});

app.patch("/api/cart/items/:itemId", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw createHttpError(400, "Số lượng phải là số nguyên lớn hơn 0.");
    }

    const cart = await getOrCreateCart(req);
    const item = cart.items.id(req.params.itemId);

    if (!item) {
      throw createHttpError(404, "Không tìm thấy sản phẩm trong giỏ.");
    }

    item.quantity = quantity;
    await cart.save();
    await populateCart(cart);

    res.json({
      message: "Đã cập nhật giỏ hàng.",
      cart: serializeCart(cart),
    });
  } catch (error) {
    handleApiError(res, error, "Không thể cập nhật giỏ hàng.");
  }
});

app.delete("/api/cart/items/:itemId", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const cart = await getOrCreateCart(req);
    const item = cart.items.id(req.params.itemId);

    if (!item) {
      throw createHttpError(404, "Không tìm thấy sản phẩm trong giỏ.");
    }

    item.deleteOne();
    await cart.save();
    await populateCart(cart);

    res.json({
      message: "Đã xóa sản phẩm khỏi giỏ hàng.",
      cart: serializeCart(cart),
    });
  } catch (error) {
    handleApiError(res, error, "Không thể xóa sản phẩm khỏi giỏ hàng.");
  }
});

app.delete("/api/cart", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const cart = await getOrCreateCart(req);
    cart.items = [];
    await cart.save();

    res.json({
      message: "Đã làm trống giỏ hàng.",
      cart: serializeCart(cart),
    });
  } catch (error) {
    handleApiError(res, error, "Không thể làm trống giỏ hàng.");
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    await syncAuthenticatedCart(req);
    const customerName = normalizeText(req.body.customerName);
    const phone = normalizeText(req.body.phone);
    const address = normalizeText(req.body.address);
    const city = normalizeText(req.body.city);
    const postalCode = normalizeText(req.body.postalCode);
    const paymentMethod = normalizeText(req.body.paymentMethod) || "cash";
    const cardNumber = normalizeText(req.body.cardNumber);
    const expiryDate = normalizeText(req.body.expiryDate);
    const cvv = normalizeText(req.body.cvv);

    if (!customerName || !phone || !address || !city || !postalCode) {
      throw createHttpError(400, "Vui lòng điền đầy đủ thông tin giao hàng.");
    }

    if (!["cash", "credit-card"].includes(paymentMethod)) {
      throw createHttpError(400, "Phương thức thanh toán không hợp lệ.");
    }

    if (paymentMethod === "credit-card" && (!cardNumber || !expiryDate || !cvv)) {
      throw createHttpError(400, "Vui lòng điền đầy đủ thông tin thẻ.");
    }

    const cart = await getExistingCart(req);
    const serializedCart = serializeCart(cart);

    if (serializedCart.isEmpty) {
      throw createHttpError(400, "Giỏ hàng đang trống.");
    }

    const order = await Order.create({
      user: req.session.user?.id || null,
      sessionKey: req.session.user?.id ? null : req.sessionID,
      customerName,
      phone,
      address,
      city,
      postalCode,
      paymentMethod,
      totalAmount: serializedCart.totalAmount,
      items: serializedCart.items.map((item) => ({
        product: item.product.id,
        title: item.product.title,
        author: item.product.author,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(201).json({
      message: "Đặt hàng thành công.",
      orderId: order._id.toString(),
      totalAmount: order.totalAmount,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể tạo đơn hàng.");
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.user.id }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (error) {
    handleApiError(res, error, "Không thể tải danh sách đơn hàng.");
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const name = normalizeText(req.body.name);
    const email = normalizeEmail(req.body.email);
    const subject = normalizeText(req.body.subject);
    const message = normalizeText(req.body.message);

    if (!name || !email || !subject || !message) {
      throw createHttpError(400, "Vui lòng điền đầy đủ thông tin liên hệ.");
    }

    if (!isValidEmail(email)) {
      throw createHttpError(400, "Email không hợp lệ.");
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
    });

    res.status(201).json({
      message: "Yêu cầu của bạn đã được ghi nhận. BookStore sẽ phản hồi sớm nhất.",
      contactMessageId: contactMessage._id.toString(),
    });
  } catch (error) {
    handleApiError(res, error, "Không thể gửi liên hệ.");
  }
});

app.get("/api/admin/summary", requireAdmin, async (req, res) => {
  try {
    const [users, categories, products, orders, pendingOrders, contactMessages] =
      await Promise.all([
        User.countDocuments(),
        Category.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({ status: "pending" }),
        ContactMessage.countDocuments(),
      ]);

    const revenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: "$totalAmount",
          },
        },
      },
    ]);

    res.json({
      users,
      categories,
      products,
      orders,
      pendingOrders,
      contactMessages,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể tải thống kê quản trị.");
  }
});

app.get("/api/admin/categories", requireAdmin, listCategories);

app.post("/api/admin/categories", requireAdmin, async (req, res) => {
  try {
    const payload = await extractCategoryPayload(req.body);
    const category = await Category.create(payload);
    res.status(201).json({
      message: "Đã thêm danh mục mới.",
      category,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể thêm danh mục.");
  }
});

app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Danh mục không hợp lệ.");
    }

    const payload = await extractCategoryPayload(req.body, { partial: true });
    const category = await Category.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!category) {
      throw createHttpError(404, "Không tìm thấy danh mục.");
    }

    res.json({
      message: "Đã cập nhật danh mục.",
      category,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể cập nhật danh mục.");
  }
});

app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Danh mục không hợp lệ.");
    }

    const relatedProducts = await Product.countDocuments({ category: req.params.id });

    if (relatedProducts > 0) {
      throw createHttpError(
        400,
        "Không thể xóa danh mục đang có sản phẩm. Hãy chuyển hoặc xóa sản phẩm trước."
      );
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      throw createHttpError(404, "Không tìm thấy danh mục.");
    }

    res.json({ message: "Đã xóa danh mục." });
  } catch (error) {
    handleApiError(res, error, "Không thể xóa danh mục.");
  }
});

app.get("/api/admin/products", requireAdmin, listProducts);

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "username email role createdAt").sort({
      createdAt: -1,
    });

    res.json(users);
  } catch (error) {
    handleApiError(res, error, "Không thể tải danh sách tài khoản.");
  }
});

app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Tài khoản không hợp lệ.");
    }

    const role = normalizeText(req.body.role);

    if (!["customer", "admin"].includes(role)) {
      throw createHttpError(400, "Vai trò không hợp lệ.");
    }

    if (req.session.user.id === req.params.id && role !== "admin") {
      throw createHttpError(
        400,
        "Bạn không thể tự hạ quyền tài khoản quản trị đang đăng nhập."
      );
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { returnDocument: "after", runValidators: true }
    ).select("username email role createdAt");

    if (!user) {
      throw createHttpError(404, "Không tìm thấy tài khoản.");
    }

    res.json({
      message: "Đã cập nhật vai trò tài khoản.",
      user,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể cập nhật vai trò tài khoản.");
  }
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const payload = await extractProductPayload(req.body);
    const product = await Product.create(payload);
    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name"
    );

    res.status(201).json({
      message: "Đã thêm sản phẩm mới.",
      product: populatedProduct,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể thêm sản phẩm.");
  }
});

app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Sản phẩm không hợp lệ.");
    }

    const payload = await extractProductPayload(req.body, { partial: true });
    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    }).populate("category", "name");

    if (!product) {
      throw createHttpError(404, "Không tìm thấy sản phẩm.");
    }

    res.json({
      message: "Đã cập nhật sản phẩm.",
      product,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể cập nhật sản phẩm.");
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Sản phẩm không hợp lệ.");
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      throw createHttpError(404, "Không tìm thấy sản phẩm.");
    }

    await Cart.updateMany(
      {},
      {
        $pull: {
          items: {
            product: product._id,
          },
        },
      }
    );

    res.json({ message: "Đã xóa sản phẩm." });
  } catch (error) {
    handleApiError(res, error, "Không thể xóa sản phẩm.");
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    handleApiError(res, error, "Không thể tải danh sách đơn hàng.");
  }
});

app.get("/api/admin/contact-messages", requireAdmin, async (req, res) => {
  try {
    const contactMessages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(contactMessages);
  } catch (error) {
    handleApiError(res, error, "Không thể tải danh sách liên hệ.");
  }
});

app.patch(
  "/api/admin/contact-messages/:id/status",
  requireAdmin,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        throw createHttpError(400, "Liên hệ không hợp lệ.");
      }

      const status = normalizeText(req.body.status);

      if (!["new", "read", "replied"].includes(status)) {
        throw createHttpError(400, "Trạng thái liên hệ không hợp lệ.");
      }

      const contactMessage = await ContactMessage.findByIdAndUpdate(
        req.params.id,
        { status },
        { returnDocument: "after", runValidators: true }
      );

      if (!contactMessage) {
        throw createHttpError(404, "Không tìm thấy liên hệ.");
      }

      res.json({
        message: "Đã cập nhật trạng thái liên hệ.",
        contactMessage,
      });
    } catch (error) {
      handleApiError(res, error, "Không thể cập nhật trạng thái liên hệ.");
    }
  }
);

app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError(400, "Đơn hàng không hợp lệ.");
    }

    const status = normalizeText(req.body.status);

    if (!ORDER_STATUSES.includes(status)) {
      throw createHttpError(400, "Trạng thái đơn hàng không hợp lệ.");
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after", runValidators: true }
    ).populate("user", "username email");

    if (!order) {
      throw createHttpError(404, "Không tìm thấy đơn hàng.");
    }

    res.json({
      message: "Đã cập nhật trạng thái đơn hàng.",
      order,
    });
  } catch (error) {
    handleApiError(res, error, "Không thể cập nhật trạng thái đơn hàng.");
  }
});

app.get("/session", requireAuth, (req, res) => {
  res.json({
    message: "Phiên đăng nhập hợp lệ.",
    user: req.session.user,
  });
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Không tìm thấy tài nguyên." });
  }

  return res
    .status(404)
    .sendFile(path.join(__dirname, "public", "Bookstore", "404.html"));
});

async function startServer() {
  if (!MONGO_URI) {
    throw new Error("Thiếu biến môi trường MONGO_URI trong file .env");
  }

  await mongoose.connect(MONGO_URI);
  console.log("Kết nối MongoDB thành công");

  app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Lỗi khởi động server:", error.message);
});
