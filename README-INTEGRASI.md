# Pasar Purwakarta — Toko Nyata & Pengajuan Seller

## Yang diperbaiki dalam paket ini
- Pengajuan penjual ditampilkan dari koleksi Firestore `sellerApplications`, dibaca saat masuk ke Dasbor Admin dan setiap kali tombol **Muat ulang** ditekan.
- Daftar pengajuan tidak hanya bergantung pada filter `status == pending`; dokumen lama dengan status kosong atau format status lama juga dapat muncul. Dokumen `approved` tidak ditampilkan lagi sebagai permohonan menunggu.
- Jika pembacaan ditolak Firestore, tabel admin menampilkan pesan error yang menjelaskan bahwa role admin dan Rules perlu diperiksa.
- Produk contoh telah dihapus. Katalog publik hanya menampilkan produk nyata dari koleksi `products` dengan `status: approved`.
- Direktori toko dibentuk dari toko yang memiliki produk aktif di Firestore; toko fiktif tidak ditampilkan.
- Label status toko bukan lagi “Demo”. Status diambil dari profil akun Firebase.
- Penjual hanya dapat menyimpan produk memakai nama toko yang sudah disetujui admin di `users/{UID}.storeName`.
- Produk, pengajuan toko, dan pesanan menggunakan Firestore, bukan data demo lokal. Favorit masih disimpan lokal di browser perangkat.

## Langkah pemasangan
1. Unduh dan ekstrak ZIP.
2. Ganti file di repositori GitHub Pages dengan seluruh isi folder `PasarPurwakarta-Toko-Nyata`.
3. Pertahankan `config.js` yang berisi konfigurasi Firebase dan Cloudinary proyek Anda.
4. Buka Firebase Console → **Firestore Database → Rules**.
5. Salin seluruh isi `firestore.rules` dari paket ini ke tab Rules, lalu klik **Publish**.
6. Tunggu GitHub Pages selesai deploy, buka website, lalu tekan `Ctrl + Shift + R`.

## Pengaturan Firebase yang diperlukan
- Authentication → Sign-in method: aktifkan **Email/Password**.
- Authentication → Settings → Authorized domains: pastikan domain GitHub Pages terdaftar.
- Dokumen admin harus berada di `users/{UID}` dan field `role` bernilai `admin`.
- Pengajuan penjual harus berada di koleksi `sellerApplications`, dengan Document ID sama dengan UID pelanggan. Field umum: `uid`, `ownerName`, `storeName`, `category`, `phone`, `email`, `storeAddress`, `status: "pending"`, `submittedAt`.

## Jika pengajuan masih tidak terlihat
1. Pastikan Anda login dengan akun yang dokumen `users/{UID}`-nya memiliki `role: admin`.
2. Buka Dasbor Admin, tekan **Muat ulang** pada bagian Pengajuan Penjual.
3. Jika muncul pesan `Gagal memuat dari Firebase`, salin pesan tersebut. Periksa bahwa `firestore.rules` terbaru sudah dipublikasikan.
4. Periksa nama koleksi tepat `sellerApplications` (huruf besar-kecil berpengaruh).
5. Pastikan UID yang dipakai dokumen pengajuan sama dengan UID akun yang diajukan.

## Alur toko dan pesanan
- Pelanggan mengajukan toko dari halaman Akun tanpa membuat akun baru.
- Admin menyetujui pengajuan; profil pengguna diubah menjadi `role: seller`, `sellerStatus: approved`, dan data nama/alamat toko disimpan.
- Penjual menambahkan produk dari modal. Produk tersimpan ke `products` Firestore dan muncul di katalog.
- Pelanggan membuat pesanan dari produk aktif. Pesanan tersimpan di `orders` dan ditampilkan sesuai hak akses pelanggan, penjual pemilik produk, dan admin.
- Pembayaran COD/transfer/QRIS hanya dicatat sebagai pilihan; belum ada pemrosesan pembayaran otomatis. Ongkir dikonfirmasi penjual.

## Keamanan
- Jangan memakai aturan Firestore terbuka seperti `allow read, write: if true`.
- Firebase Web config memang dipakai di frontend; jangan menaruh API Secret Cloudinary di `config.js`.
- Batasi Cloudinary unsigned upload preset berdasarkan format dan ukuran file.


## Pembaruan marketplace (keranjang, pesanan, chat, tampilan HP)

1. Upload semua file paket ini ke repositori GitHub Pages dan timpa versi sebelumnya. Jangan mengganti `config.js` dengan konfigurasi contoh jika sudah berisi konfigurasi Firebase/Cloudinary Anda sendiri.
2. Di Firebase Console → Firestore Database → Rules, tempel isi `firestore.rules` yang ada di paket ini, lalu klik **Publish**. Aturan baru menambahkan akses chat hanya untuk pembeli dan penjual yang menjadi peserta percakapan.
3. Pastikan Firestore memakai koleksi `orders`, `products`, `users`, `sellerApplications`, `chats`; pesan chat tersimpan pada subkoleksi `chats/{chatId}/messages`.
4. Fitur keranjang menyimpan pilihan barang di browser perangkat. Checkout membuat satu baris pesanan per produk, dengan nomor checkout yang sama; tiap penjual hanya melihat pesanan untuk tokonya, sedangkan pembeli melihat semua barang yang dikirim dalam checkout itu.
5. Chat dapat dibuka dari tombol **Chat penjual** di halaman Pesanan saya atau **Chat pembeli** di tabel pesanan penjual. Chat baru dibuat saat salah satu pihak membuka chat dari pesanan.
6. Jika halaman Pesanan saya masih kosong, login dengan akun pembeli yang sama yang digunakan saat checkout. Jika ada pesan kesalahan Firebase, cek Rules dan koleksi `orders`; dokumen harus memiliki `customerId` sama dengan UID pembeli serta `sellerId` sama dengan UID pemilik produk.
7. Setelah commit GitHub, tunggu deployment selesai lalu muat ulang situs. Di smartphone, gunakan tombol **Segarkan dasbor** pada admin jika data baru belum muncul.

Catatan: perubahan kode telah diperiksa sintaksnya, tetapi alur transaksi/chat belum dapat diuji terhadap proyek Firebase aktif Anda dari sini.
