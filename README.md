# Book Store MongoDB

Do an mon Lap trinh Web nang cao, xay dung bang `Node.js + Express + MongoDB`.

## Tinh nang chinh

- Dang ky, dang nhap, dang xuat bang session
- Xem danh sach san pham tu MongoDB
- Tim kiem, loc theo gia va theo the loai
- Xem chi tiet san pham dong
- Them vao gio hang, cap nhat so luong, checkout
- Luu don hang vao MongoDB
- Gui lien he khach hang va luu vao MongoDB
- Xem lich su don hang cua nguoi dung
- Trang quan tri cho admin:
  - Quan ly tai khoan va phan quyen admin/customer
  - CRUD danh muc
  - CRUD san pham
  - Quan ly trang thai don hang
  - Quan ly lien he khach hang
  - Xem thong ke tong quan

## Cong nghe su dung

- Node.js
- Express
- MongoDB
- MongoDB Compass
- GitHub
- Render

## Chay local

Tao file `.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/bookstore
SESSION_SECRET=bookstore_secret
PORT=3000
```

Chay project:

```bash
npm install
npm run seed
npm start
```

Mo website:

```text
http://localhost:3000/Bookstore/Trang_chu.html
```

Mo MongoDB Compass va connect:

```text
mongodb://127.0.0.1:27017/bookstore
```

## Tai khoan mau

- Admin
  - username: `admin`
  - password: `admin123`
- Customer
  - username: `customer`
  - password: `customer123`

## Cac trang chinh

- `Trang_chu.html`
- `Danh_sach_san_pham.html`
- `Chi_tiet_san_pham.html?id=<productId>`
- `Gio_hang.html`
- `Thanh_toan.html`
- `Lich_su_don_hang.html`
- `Lien_he.html`
- `Dat_hang_thanh_cong.html`
- `Quan_tri.html`

## MongoDB collections

- `users`
- `categories`
- `products`
- `carts`
- `orders`
- `contactmessages`

## Dua len GitHub

Project hien tai chua la git repository, nen lam theo thu tu:

```bash
git init -b main
git add .
git commit -m "Initial commit"
```

Sau do tao repo moi tren GitHub roi gan remote:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Hosting de demo

Khong nen dung GitHub Pages cho project nay, vi GitHub Pages chi phu hop cho website static. Project nay can server `Express` va database `MongoDB`.

De host dung cach:

1. Day code len GitHub
2. Tao MongoDB Atlas cluster
3. Dung MongoDB Compass ket noi vao Atlas
4. Deploy app len Render

## MongoDB Atlas + Compass

1. Tao cluster free tren MongoDB Atlas
2. Tao database user
3. Whitelist IP
4. Lay connection string
5. Dung string do trong:
   - Render env var `MONGO_URI`
   - MongoDB Compass de kiem tra du lieu

Vi vay, du host online, ban van co the dung MongoDB Compass de xem collections va documents.

## Deploy len Render

Project da co san file [render.yaml](./render.yaml).

Ban lam theo cac buoc:

1. Dang nhap Render
2. Chon `New +` -> `Blueprint`
3. Chon repo GitHub cua project
4. Dat env vars:
   - `MONGO_URI`
   - `SESSION_SECRET`
5. Deploy

Sau khi deploy xong, Render se cap URL online.

## Seed du lieu khi deploy

Ban co 2 cach:

- Chay local:

```bash
npm run seed
```

- Hoac mo Render Shell/console roi chay:

```bash
node seed.js
```

## Luu y khi demo

- Neu demo local: dung MongoDB local + Compass local
- Neu demo online: dung MongoDB Atlas + Compass ket noi Atlas
- Sau khi them san pham, tao don hang, gui lien he, co the refresh Compass de thay du lieu thay doi

## Nguon tham khao chinh

- GitHub Docs: https://docs.github.com/articles/adding-an-existing-project-to-github-using-the-command-line
- GitHub Pages Docs: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Render Docs: https://render.com/docs/deploy-node-express-app
- MongoDB Compass Docs: https://www.mongodb.com/docs/compass/connect/
- MongoDB Atlas + Compass Docs: https://www.mongodb.com/docs/atlas/compass-connection/
