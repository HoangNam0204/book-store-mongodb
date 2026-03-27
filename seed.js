const { randomBytes, scryptSync } = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("./models/Category");
const Product = require("./models/Product");
const User = require("./models/User");
const ContactMessage = require("./models/ContactMessage");
const { runCleanup } = require("./cleanup");

const { MONGO_URI } = process.env;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function upsertUser({ username, email, password, role }) {
  const passwordHash = hashPassword(password);

  const user = await User.findOneAndUpdate(
    { username },
    {
      username,
      email,
      role,
      passwordHash,
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  return user;
}

async function runSeed() {
  if (!MONGO_URI) {
    throw new Error("Thiếu MONGO_URI trong file .env");
  }

  await mongoose.connect(MONGO_URI);

  const categoriesData = [
    {
      name: "Tiểu thuyết",
      description: "Các đầu sách tiểu thuyết và văn học đương đại",
    },
    {
      name: "Kỹ năng sống",
      description: "Sách phát triển bản thân, giao tiếp và tư duy",
    },
    {
      name: "Tâm lý học",
      description: "Sách về tâm lý học ứng dụng và hành vi",
    },
    {
      name: "Kinh doanh",
      description: "Sách kinh doanh, marketing và lãnh đạo",
    },
    {
      name: "Thiếu nhi",
      description: "Sách truyện và khám phá dành cho thiếu nhi",
    },
    {
      name: "Khoa học thường thức",
      description: "Sách khoa học, khám phá tự nhiên và công nghệ",
    },
    {
      name: "Dụng cụ học tập",
      description: "Bút, thước, tẩy, sổ tay và vật dụng học tập hằng ngày",
    },
  ];

  const categoryMap = new Map();

  for (const categoryData of categoriesData) {
    const category = await Category.findOneAndUpdate(
      { name: categoryData.name },
      categoryData,
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    categoryMap.set(category.name, category);
  }

  const productsData = [
    {
      title: "Nhà giả kim",
      author: "Paulo Coelho",
      price: 99000,
      image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935235216921.jpg",
      description: "Cuốn tiểu thuyết truyền cảm hứng nổi tiếng về hành trình theo đuổi ước mơ.",
      category: categoryMap.get("Tiểu thuyết")._id,
      featured: true,
    },
    {
      title: "Đắc nhân tâm",
      author: "Dale Carnegie",
      price: 88000,
      image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935086847398.jpg",
      description: "Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử.",
      category: categoryMap.get("Kỹ năng sống")._id,
      featured: true,
    },
    {
      title: "Tâm lý học tội phạm",
      author: "Steven G",
      price: 120000,
      image: "https://cdn0.fahasa.com/media/catalog/product/t/_/t_m-l_-h_c-t_i-ph_m-1---b_a-1.jpg",
      description: "Sách khám phá các góc nhìn tâm lý học phía sau hành vi phạm tội.",
      category: categoryMap.get("Tâm lý học")._id,
      featured: true,
    },
    {
      title: "Tư duy ngược",
      author: "Adam Grant",
      price: 145000,
      image: "https://cdn0.fahasa.com/media/catalog/product/9/7/9786043440287.jpg",
      description: "Góc nhìn khác biệt về cách suy nghĩ, phản biện và đổi mới.",
      category: categoryMap.get("Kỹ năng sống")._id,
      featured: false,
    },
    {
      title: "Dám bị ghét",
      author: "Koga Fumitake",
      price: 108000,
      image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935251415900.jpg",
      description: "Cuốn sách giúp thay đổi cách nhìn về hạnh phúc và sự tự do cá nhân.",
      category: categoryMap.get("Tâm lý học")._id,
      featured: false,
    },
    {
      title: "Quốc gia khởi nghiệp",
      author: "Dan Senor",
      price: 168000,
      image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935251411476.jpg",
      description: "Cuốn sách nổi tiếng về tư duy đổi mới và tinh thần khởi nghiệp.",
      category: categoryMap.get("Kinh doanh")._id,
      featured: true,
    },
    {
      title: "Muôn kiếp nhân sinh",
      author: "Nguyên Phong",
      price: 126000,
      image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935270703042.jpg",
      description: "Tác phẩm gây chú ý với những câu chuyện về nhân sinh và trải nghiệm tâm linh.",
      category: categoryMap.get("Tiểu thuyết")._id,
      featured: false,
    },
    {
      title: "Nghĩ giàu làm giàu",
      author: "Napoleon Hill",
      price: 135000,
      image: "https://cdn0.fahasa.com/media/catalog/product/8/9/8935086845967.jpg",
      description: "Cuốn sách kinh điển về thành công, mục tiêu và tư duy làm giàu.",
      category: categoryMap.get("Kinh doanh")._id,
      featured: false,
    },
    {
      title: "Dế Mèn phiêu lưu ký",
      author: "Tô Hoài",
      price: 79000,
      image: "/Bookstore/assets/books/de-men-phieu-luu-ky.jpg",
      description: "Tác phẩm thiếu nhi kinh điển về hành trình trưởng thành của chú Dế Mèn.",
      category: categoryMap.get("Thiếu nhi")._id,
      featured: true,
    },
    {
      title: "Vũ trụ trong vỏ hạt dẻ",
      author: "Stephen Hawking",
      price: 185000,
      image: "/Bookstore/assets/books/vu-tru-trong-vo-hat-de.jpg",
      description: "Cuốn sách khoa học thường thức nổi tiếng giúp người đọc tiếp cận các ý tưởng lớn về vũ trụ.",
      category: categoryMap.get("Khoa học thường thức")._id,
      featured: false,
    },
    {
      title: "Bút bi Thiên Long TL-027",
      author: "Thiên Long",
      price: 8000,
      image: "/Bookstore/assets/books/but-bi-thien-long-tl-027.jpg",
      description: "Bút bi mực xanh, viết êm và phù hợp cho học sinh, sinh viên.",
      category: categoryMap.get("Dụng cụ học tập")._id,
      featured: false,
    },
    {
      title: "Thước kẻ 20cm FlexOffice",
      author: "FlexOffice",
      price: 12000,
      image: "/Bookstore/assets/books/thuoc-ke-20cm-flexoffice-real.jpg",
      description: "Thước nhựa 20cm, vạch chia rõ ràng, phù hợp cho học tập hằng ngày.",
      category: categoryMap.get("Dụng cụ học tập")._id,
      featured: false,
    },
    {
      title: "Tẩy Pentel Hi-Polymer",
      author: "Pentel",
      price: 15000,
      image: "/Bookstore/assets/books/tay-pentel-hi-polymer-real.png",
      description: "Tẩy mềm, sạch và ít vụn, phù hợp cho bút chì và chì kim.",
      category: categoryMap.get("Dụng cụ học tập")._id,
      featured: false,
    },
    {
      title: "Sổ tay Campus B5",
      author: "Campus",
      price: 32000,
      image: "/Bookstore/assets/books/so-tay-campus-b5.jpg",
      description: "Sổ tay kẻ ngang, giấy mịn và phù hợp để ghi chép học tập.",
      category: categoryMap.get("Dụng cụ học tập")._id,
      featured: false,
    },
    {
      title: "Bút chì 2B Staedtler",
      author: "Staedtler",
      price: 18000,
      image: "/Bookstore/assets/books/but-chi-2b-staedtler.jpg",
      description: "Bút chì gỗ 2B nét đậm, phù hợp để viết, vẽ và làm bài thi trắc nghiệm.",
      category: categoryMap.get("Dụng cụ học tập")._id,
      featured: false,
    },
  ];

  for (const productData of productsData) {
    await Product.findOneAndUpdate(
      { title: productData.title, author: productData.author },
      productData,
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  const adminUser = await upsertUser({
    username: "admin",
    email: "admin@bookstore.local",
    password: "admin123",
    role: "admin",
  });

  const customerUser = await upsertUser({
    username: "customer",
    email: "customer@bookstore.local",
    password: "customer123",
    role: "customer",
  });

  await ContactMessage.findOneAndUpdate(
    { email: "customer@bookstore.local", subject: "Tư vấn chọn sách" },
    {
      name: "Customer Demo",
      email: "customer@bookstore.local",
      subject: "Tư vấn chọn sách",
      message:
        "Tôi muốn được tư vấn một số đầu sách kỹ năng sống phù hợp cho sinh viên năm nhất.",
      status: "new",
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  await runCleanup({ logger: console });
  await Category.syncIndexes();
  await Product.syncIndexes();
  await User.syncIndexes();

  console.log("Seed dữ liệu thành công.");
  console.log(`Admin: ${adminUser.username} / admin123`);
  console.log(`Customer: ${customerUser.username} / customer123`);

  await mongoose.disconnect();
}

runSeed().catch(async (error) => {
  console.error("Seed thất bại:", error.message);

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error(disconnectError.message);
  }

  process.exitCode = 1;
});
