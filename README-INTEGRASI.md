# Pasar Purwakarta — pembayaran manual dan verifikasi admin

Paket ini mempertahankan katalog, akun/role, toko penjual, keranjang multi-produk, riwayat pesanan, dan chat dari versi sebelumnya, serta menambahkan pembayaran manual.

## Metode pembayaran
- Transfer bank
- QRIS
- E-wallet
- Tunai saat barang diterima (COD)

Untuk Transfer, QRIS, dan E-wallet, pembeli mengirim bukti pembayaran berupa gambar. Bukti diunggah ke Cloudinary dan URL-nya disimpan pada dokumen `orders`. Admin memeriksa bukti melalui tabel **Verifikasi pembayaran** lalu memilih **Setujui** atau **Tolak**. COD berstatus `Bayar saat diterima` dan tidak meminta bukti transfer.

## Sebelum menerbitkan
1. Pertahankan `config.js` milik proyek Anda yang berisi konfigurasi Firebase dan Cloudinary yang benar. Jangan mengganti dengan konfigurasi contoh dari ZIP jika konfigurasi Anda sudah benar.
2. Pastikan Cloudinary `cloudName` dan `uploadPreset` sudah terisi dan upload preset mengizinkan unsigned image upload. Bukti pembayaran akan disimpan di folder `pasar-purwakarta/payment-proofs`.
3. Ganti file website lama dengan file dari folder `PasarPurwakarta-Toko-Nyata`, lalu commit/push ke GitHub Pages.
4. Salin isi `firestore.rules` ke Firebase Console → Firestore Database → Rules, lalu klik **Publish**.
5. Login sebagai admin dan buka **Dasbor admin → Pengaturan pembayaran**. Isi nama bank, nama pemilik, nomor rekening, URL gambar QRIS, nama/nomor e-wallet, dan instruksi. Klik **Simpan pengaturan pembayaran**.
6. URL QRIS harus merupakan URL HTTPS yang dapat dibuka publik untuk menampilkan gambar QRIS. Jangan menggunakan URL sementara yang kedaluwarsa.
7. Uji menggunakan akun pembeli: buat pesanan, pilih metode non-tunai, lakukan pembayaran di luar website, lalu buka **Pesanan Saya** dan unggah gambar bukti. Login admin, buka **Verifikasi pembayaran**, periksa bukti, lalu setujui/tolak.
8. Uji COD: pilih tunai saat barang diterima. Status pembayaran akan menunjukkan `Bayar saat diterima`.

## Struktur data baru
Dokumen `paymentSettings/main` menyimpan pengaturan tujuan pembayaran. Setiap dokumen `orders` memiliki `paymentMethod`, `paymentStatus`, `paymentProofUrl`, serta timestamp pengiriman/verifikasi bukti jika tersedia.

## Catatan penting
- Ini adalah **konfirmasi manual**, bukan verifikasi otomatis dari bank/e-wallet. Admin harus memeriksa transaksi pada rekening atau aplikasi pembayaran sebelum menyetujui.
- Jangan menyimpan API secret Cloudinary atau kredensial rahasia di JavaScript frontend. Upload preset harus dikonfigurasi untuk upload tanpa secret.
- Pembayaran ditujukan ke rekening pengelola, sesuai pilihan pengelola marketplace. Pengelola perlu mengatur proses pencatatan dan penyelesaian dana ke masing-masing penjual.
- Saya telah memeriksa sintaks JavaScript dan struktur ZIP, tetapi belum menguji transaksi pada proyek Firebase/Cloudinary aktif Anda.
