# Pasar Purwakarta — Integrasi Firebase + Cloudinary

## 1. Isi konfigurasi
1. Buka `config.js`.
2. Ganti semua nilai `GANTI_DENGAN_...` dengan Firebase Web config dari Firebase Console → Project settings → Your apps.
3. Isi `cloudName` dan `uploadPreset` dari Cloudinary. Jangan pernah menaruh API Secret Cloudinary di frontend.
4. Commit dan push seluruh file ke repository GitHub Pages.

## 2. Firebase Authentication
- Firebase Console → Authentication → Get started → Sign-in method.
- Aktifkan Email/Password.
- Authentication → Settings → Authorized domains: pastikan domain GitHub Pages Anda terdaftar.

## 3. Firestore
- Buat database Firestore.
- Buka Rules dan salin isi `firestore.rules`, lalu Publish. Uji dahulu pada proyek pengembangan.
- Jangan mengaktifkan aturan terbuka seperti `allow read, write: if true`.
- Buat admin pertama: daftarkan akun normal melalui aplikasi, lalu di Firestore ubah `users/{UID}` field `role` menjadi `admin`. Karena rules mencegah pengguna mengubah role sendiri, hanya lakukan dari Firebase Console oleh pemilik proyek.
- Untuk menyetujui penjual, ubah `users/{UID}.sellerStatus` dari `pending` menjadi `approved`.

## 4. Cloudinary
- Buat Upload Preset unsigned khusus untuk aplikasi. Batasi format yang diperbolehkan ke jpg/png/webp dan batasi ukuran gambar.
- Unggah foto memakai preset tersebut. Unsigned preset bukan rahasia; atur batasan upload di Cloudinary. Jangan masukkan API Secret di file frontend.

## 5. GitHub Pages
- Commit `index.html`, `config.js`, `firebase-integrations.js`, dan file lain ke branch/folder sumber GitHub Pages.
- Karena Firebase SDK dimuat sebagai ES modules, buka melalui HTTPS GitHub Pages, bukan `file://` dari folder lokal.

## Status fungsional
- Integrasi: daftar/login Firebase Email/Password; pembuatan profil pelanggan/penjual; pembacaan produk approved dari Firestore; upload foto ke Cloudinary; tambah produk untuk penjual yang disetujui.
- Produk contoh lama adalah demo lokal dan akan diganti daftar Firestore saat konfigurasi aktif.
- Checkout/pesanan online dan alat persetujuan admin visual belum dibangun pada tahap ini. Pengelolaan role/status admin sementara melalui Firebase Console. Jangan anggap marketplace siap transaksi sampai checkout, pengiriman, pembayaran, dan aturan order diuji.
