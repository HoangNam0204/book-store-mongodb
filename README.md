# Book Store MongoDB

Do an mon Lap trinh Web nang cao, xay dung mot website ban sach truc tuyen bang `Node.js + Express + MongoDB`.

## Tong quan

Project hien da hoan thien theo huong mot website thuc te:

- giao dien nguoi dung de xem sach, tim kiem, loc gia va loc danh muc
- dang ky, dang nhap, dang xuat bang session
- gio hang, thanh toan, lich su don hang
- trang lien he va luu thong tin lien he vao MongoDB
- trang quan tri de quan ly danh muc, san pham, tai khoan, don hang va lien he
- deploy online tren Render
- database online tren MongoDB Atlas
- co the theo doi du lieu truc tiep bang MongoDB Compass

## Cong nghe su dung

- HTML
- CSS
- JavaScript
- Node.js
- Express
- MongoDB
- MongoDB Atlas
- MongoDB Compass
- GitHub
- Render

## Tinh nang chinh

- Dang ky, dang nhap, dang xuat
- Xem danh sach san pham va chi tiet san pham
- Tim kiem san pham
- Loc theo gia va theo danh muc
- Them vao gio hang, cap nhat so luong, mua ngay
- Thanh toan va tao don hang
- Xem lich su don hang
- Gui form lien he
- CRUD danh muc trong trang admin
- CRUD san pham trong trang admin
- Cap nhat trang thai don hang
- Cap nhat vai tro nguoi dung
- Cap nhat trang thai lien he
- Dashboard thong ke tong quan

## Cac trang chinh

- `Bookstore/Trang_chu.html`
- `Bookstore/Danh_sach_san_pham.html`
- `Bookstore/Chi_tiet_san_pham.html?id=<productId>`
- `Bookstore/Gio_hang.html`
- `Bookstore/Thanh_toan.html`
- `Bookstore/Lich_su_don_hang.html`
- `Bookstore/Lien_he.html`
- `Bookstore/Dat_hang_thanh_cong.html`
- `Bookstore/Quan_tri.html`

## Tai khoan mau

- Admin
  - username: `admin`
  - password: `admin123`
- Customer
  - username: `customer`
  - password: `customer123`

## MongoDB collections

- `users`
- `categories`
- `products`
- `carts`
- `orders`
- `contactmessages`
- `sessions`

## Chay local

### 1. Tao file `.env`

Vi du dung local MongoDB:

```env
MONGO_URI=mongodb://127.0.0.1:27017/bookstore
SESSION_SECRET=bookstore_secret
PORT=3000
```

Vi du dung MongoDB Atlas:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/bookstore?retryWrites=true&w=majority&appName=Cluster0
SESSION_SECRET=bookstore_secret
PORT=3000
```

### 2. Cai package

```bash
npm install
```

### 3. Seed du lieu mau

```bash
npm run seed
```

### 4. Chay server

```bash
npm start
```

### 5. Mo website

```text
http://localhost:3000/Bookstore/Trang_chu.html
```

## Chay online

### GitHub repo

```text
https://github.com/HoangNam0204/book-store-mongodb
```

### Website online

```text
https://book-store-mongodb.onrender.com/Bookstore/Trang_chu.html
```

### API health check

```text
https://book-store-mongodb.onrender.com/api/health
```

Neu health check tra ve:

```json
{"status":"ok","database":"connected"}
```

thi server va database dang hoat dong binh thuong.

## MongoDB Atlas va MongoDB Compass

Website online dang dung MongoDB Atlas. MongoDB Compass duoc dung de:

- xem collection
- xem document
- kiem tra du lieu thay doi sau khi thao tac tren web

Khi demo online, nen mo dung connection Atlas trong Compass, khong dung connection `127.0.0.1` neu muon chung minh website online dang ghi du lieu that.

Connection Atlas se co cac collection:

- `users`
- `products`
- `categories`
- `carts`
- `orders`
- `contactmessages`
- `sessions`

## Deploy len Render

Project nay da duoc deploy thanh cong len Render dang `Web Service`.

Thong so chinh:

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Environment variables can co:

- `MONGO_URI`
- `SESSION_SECRET`

Khong can khai bao `PORT` tren Render vi Render se tu cap phat.

## Ghi chu ve session

Project dang dung `express-session` ket hop `connect-mongo`, vi vay session khong con luu bang MemoryStore. Cach nay phu hop hon cho moi truong production va giam nguy co mat session khi service restart.

## Luu y khi demo va thuyet trinh

- Render free co the sleep khi khong su dung, vi vay lan mo dau co the cham 20-50 giay
- Nen mo san 4 tab:
  - website online
  - trang admin online
  - MongoDB Compass o connection Atlas
  - GitHub repo
- Khong nen mo file `.env` trong luc thuyet trinh
- Neu da lam lo password Atlas trong qua trinh setup, nen doi password database user va cap nhat lai `MONGO_URI`

## Kich ban demo de xuat

1. Mo trang chu online
2. Dang nhap tai khoan customer
3. Them san pham vao gio hang
4. Thanh toan tao don hang
5. Mo MongoDB Compass va refresh collection `orders`
6. Dang nhap tai khoan admin
7. Them hoac xoa mot san pham
8. Refresh collection `products` trong Compass

## Tai lieu tham khao

- Node.js Docs: https://nodejs.org
- Express Docs: https://expressjs.com
- MongoDB Docs: https://www.mongodb.com/docs
- MongoDB Compass Docs: https://www.mongodb.com/docs/compass/connect/
- MongoDB Atlas Docs: https://www.mongodb.com/docs/atlas/
- Render Docs: https://render.com/docs
- GitHub Docs: https://docs.github.com
