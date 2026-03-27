const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("./models/Category");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Order = require("./models/Order");

const { MONGO_URI } = process.env;

const CURATED_PRODUCTS = [
  {
    title: "Nhà giả kim",
    author: "Paulo Coelho",
    image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935235216921.jpg",
    description:
      "Cuốn tiểu thuyết truyền cảm hứng nổi tiếng về hành trình theo đuổi ước mơ.",
    categoryName: "Tiểu thuyết",
    featured: true,
  },
  {
    title: "Đắc nhân tâm",
    author: "Dale Carnegie",
    image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935086847398.jpg",
    description: "Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử.",
    categoryName: "Kỹ năng sống",
    featured: true,
  },
  {
    title: "Tâm lý học tội phạm",
    author: "Steven G",
    image:
      "https://cdn0.fahasa.com/media/catalog/product/t/_/t_m-l_-h_c-t_i-ph_m-1---b_a-1.jpg",
    description:
      "Sách khám phá các góc nhìn tâm lý học phía sau hành vi phạm tội.",
    categoryName: "Tâm lý học",
    featured: true,
  },
  {
    title: "Tư duy ngược",
    author: "Adam Grant",
    image: "https://cdn0.fahasa.com/media/catalog/product/9/7/9786043440287.jpg",
    description:
      "Góc nhìn khác biệt về cách suy nghĩ, phản biện và đổi mới.",
    categoryName: "Kỹ năng sống",
    featured: false,
  },
  {
    title: "Dám bị ghét",
    author: "Koga Fumitake",
    image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935251415900.jpg",
    description:
      "Cuốn sách giúp thay đổi cách nhìn về hạnh phúc và sự tự do cá nhân.",
    categoryName: "Tâm lý học",
    featured: false,
  },
  {
    title: "Quốc gia khởi nghiệp",
    author: "Dan Senor",
    image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935251411476.jpg",
    description:
      "Cuốn sách nổi tiếng về tư duy đổi mới và tinh thần khởi nghiệp.",
    categoryName: "Kinh doanh",
    featured: true,
  },
  {
    title: "Muôn kiếp nhân sinh",
    author: "Nguyên Phong",
    image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935270703042.jpg",
    description:
      "Tác phẩm gây chú ý với những câu chuyện về nhân sinh và trải nghiệm tâm linh.",
    categoryName: "Tiểu thuyết",
    featured: false,
  },
  {
    title: "Nghĩ giàu làm giàu",
    author: "Napoleon Hill",
    image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935086845967.jpg",
    description:
      "Cuốn sách kinh điển về thành công, mục tiêu và tư duy làm giàu.",
    categoryName: "Kinh doanh",
    featured: false,
  },
];

function normalizeKeyPart(value) {
  return String(value || "").trim().toLowerCase();
}

function getProductKey(product) {
  return `${normalizeKeyPart(product.title)}|${normalizeKeyPart(product.author)}`;
}

function getCategoryKey(category) {
  return normalizeKeyPart(category.name);
}

function hasRemoteImage(image) {
  return /^https?:\/\//i.test(String(image || "").trim());
}

function chooseBestCategory(categories) {
  return [...categories].sort((first, second) => {
    const firstScore = String(first.description || "").trim().length;
    const secondScore = String(second.description || "").trim().length;

    if (secondScore !== firstScore) {
      return secondScore - firstScore;
    }

    return String(first._id).localeCompare(String(second._id));
  })[0];
}

function scoreProduct(product) {
  let score = 0;

  if (hasRemoteImage(product.image)) {
    score += 3;
  }

  if (product.featured) {
    score += 2;
  }

  if (product.category) {
    score += 1;
  }

  score += Math.min(
    2,
    Math.floor(String(product.description || "").trim().length / 80)
  );

  return score;
}

function chooseBestProduct(products) {
  return [...products].sort((first, second) => {
    const firstScore = scoreProduct(first);
    const secondScore = scoreProduct(second);

    if (secondScore !== firstScore) {
      return secondScore - firstScore;
    }

    return String(first._id).localeCompare(String(second._id));
  })[0];
}

async function ensureConnection() {
  if (mongoose.connection.readyState === 1) {
    return false;
  }

  if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI in .env");
  }

  await mongoose.connect(MONGO_URI);
  return true;
}

async function replaceProductReferences(duplicateIds, keepId) {
  if (!duplicateIds.length) {
    return { updatedCarts: 0, updatedOrders: 0 };
  }

  const duplicateIdSet = new Set(duplicateIds.map((id) => String(id)));
  let updatedCarts = 0;
  let updatedOrders = 0;

  const carts = await Cart.find({
    "items.product": { $in: duplicateIds },
  });

  for (const cart of carts) {
    const mergedItems = new Map();

    cart.items.forEach((item) => {
      const nextProductId = duplicateIdSet.has(String(item.product))
        ? String(keepId)
        : String(item.product);

      if (!mergedItems.has(nextProductId)) {
        mergedItems.set(nextProductId, {
          product: nextProductId,
          quantity: 0,
        });
      }

      mergedItems.get(nextProductId).quantity += Number(item.quantity || 1);
    });

    cart.items = [...mergedItems.values()];
    await cart.save();
    updatedCarts += 1;
  }

  const orders = await Order.find({
    "items.product": { $in: duplicateIds },
  });

  for (const order of orders) {
    let changed = false;

    order.items.forEach((item) => {
      if (item.product && duplicateIdSet.has(String(item.product))) {
        item.product = keepId;
        changed = true;
      }
    });

    if (changed) {
      await order.save();
      updatedOrders += 1;
    }
  }

  return { updatedCarts, updatedOrders };
}

async function dedupeCategories(logger) {
  const categories = await Category.find().sort({ _id: 1 });
  const categoryGroups = new Map();
  let removedCategories = 0;

  categories.forEach((category) => {
    const key = getCategoryKey(category);

    if (!categoryGroups.has(key)) {
      categoryGroups.set(key, []);
    }

    categoryGroups.get(key).push(category);
  });

  for (const [, group] of categoryGroups.entries()) {
    if (group.length < 2) {
      continue;
    }

    const keepCategory = chooseBestCategory(group);
    const duplicateCategories = group.filter(
      (category) => String(category._id) !== String(keepCategory._id)
    );
    const duplicateIds = duplicateCategories.map((category) => category._id);

    await Product.updateMany(
      { category: { $in: duplicateIds } },
      { $set: { category: keepCategory._id } }
    );

    await Category.deleteMany({ _id: { $in: duplicateIds } });
    removedCategories += duplicateIds.length;
  }

  logger.log(`Removed duplicate categories: ${removedCategories}`);
  return removedCategories;
}

async function normalizeCuratedProducts(logger) {
  const categories = await Category.find({}, "name").lean();
  const categoryByName = new Map(
    categories.map((category) => [normalizeKeyPart(category.name), category._id])
  );
  const curatedByKey = new Map(
    CURATED_PRODUCTS.map((product) => [getProductKey(product), product])
  );
  const products = await Product.find();
  let normalizedProducts = 0;

  for (const product of products) {
    const curatedProduct = curatedByKey.get(getProductKey(product));

    if (!curatedProduct) {
      continue;
    }

    let changed = false;

    if (!hasRemoteImage(product.image) && curatedProduct.image) {
      product.image = curatedProduct.image;
      changed = true;
    }

    if (!String(product.description || "").trim() && curatedProduct.description) {
      product.description = curatedProduct.description;
      changed = true;
    }

    if (!product.category && curatedProduct.categoryName) {
      const categoryId = categoryByName.get(normalizeKeyPart(curatedProduct.categoryName));

      if (categoryId) {
        product.category = categoryId;
        changed = true;
      }
    }

    if (curatedProduct.featured && !product.featured) {
      product.featured = true;
      changed = true;
    }

    if (changed) {
      await product.save();
      normalizedProducts += 1;
    }
  }

  logger.log(`Normalized curated products: ${normalizedProducts}`);
  return normalizedProducts;
}

async function dedupeProducts(logger) {
  const products = await Product.find().sort({ _id: 1 });
  const productGroups = new Map();

  products.forEach((product) => {
    const key = getProductKey(product);

    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }

    productGroups.get(key).push(product);
  });

  let removedProducts = 0;
  let updatedCarts = 0;
  let updatedOrders = 0;

  for (const [key, group] of productGroups.entries()) {
    if (group.length < 2) {
      continue;
    }

    const keepProduct = chooseBestProduct(group);
    let keepChanged = false;

    group.forEach((product) => {
      if (String(product._id) === String(keepProduct._id)) {
        return;
      }

      if (!hasRemoteImage(keepProduct.image) && hasRemoteImage(product.image)) {
        keepProduct.image = product.image;
        keepChanged = true;
      }

      if (!keepProduct.category && product.category) {
        keepProduct.category = product.category;
        keepChanged = true;
      }

      if (
        String(product.description || "").trim().length >
        String(keepProduct.description || "").trim().length
      ) {
        keepProduct.description = product.description;
        keepChanged = true;
      }

      if (product.featured && !keepProduct.featured) {
        keepProduct.featured = true;
        keepChanged = true;
      }
    });

    if (keepChanged) {
      await keepProduct.save();
    }

    const duplicateProducts = group.filter(
      (product) => String(product._id) !== String(keepProduct._id)
    );
    const duplicateIds = duplicateProducts.map((product) => product._id);
    const replacementSummary = await replaceProductReferences(
      duplicateIds,
      keepProduct._id
    );

    updatedCarts += replacementSummary.updatedCarts;
    updatedOrders += replacementSummary.updatedOrders;

    await Product.deleteMany({ _id: { $in: duplicateIds } });
    removedProducts += duplicateIds.length;

    logger.log(
      `Merged duplicate product group "${key}" into ${String(keepProduct._id)}`
    );
  }

  logger.log(`Removed duplicate products: ${removedProducts}`);
  logger.log(`Updated carts: ${updatedCarts}`);
  logger.log(`Updated orders: ${updatedOrders}`);

  return {
    removedProducts,
    updatedCarts,
    updatedOrders,
  };
}

async function runCleanup({ logger = console } = {}) {
  const openedConnection = await ensureConnection();

  try {
    const removedCategories = await dedupeCategories(logger);
    const normalizedProducts = await normalizeCuratedProducts(logger);
    const productSummary = await dedupeProducts(logger);
    const summary = {
      removedCategories,
      normalizedProducts,
      ...productSummary,
    };

    logger.log(`Cleanup summary: ${JSON.stringify(summary)}`);
    return summary;
  } finally {
    if (openedConnection) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  runCleanup().catch(async (error) => {
    console.error("Cleanup failed:", error.message);

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error(disconnectError.message);
    }

    process.exitCode = 1;
  });
}

module.exports = {
  runCleanup,
};
