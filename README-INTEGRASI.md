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


## Opsi pengambilan barang dan biaya admin

- Saat checkout, pembeli memilih **Dikirim ke alamat** atau **Ambil sendiri**. Pilihan ambil sendiri tidak meminta alamat dan ongkirnya Rp0.
- Di Dasbor Admin → Pengaturan pembayaran, admin dapat mengatur **Biaya jasa per pesanan (Rp)** dan **Biaya kirim per pesanan (Rp)**. Nilai harus angka rupiah dan dapat diisi 0.
- Setiap dokumen pesanan menyimpan `productSubtotal`, `serviceFee`, `fulfillmentMethod`, `deliveryFee`, `shippingFee`, dan `total`. Total dihitung oleh integrasi berdasarkan harga produk serta pengaturan Firebase yang tersimpan; angka yang dikirim dari halaman checkout tidak dijadikan sumber biaya.
- Untuk checkout multi-produk, aplikasi membuat satu dokumen pesanan untuk setiap jenis produk. Karena itu biaya jasa dikenakan pada setiap dokumen pesanan; biaya kirim juga dihitung per dokumen pesanan jika memilih pengiriman. Atur biaya admin dengan mempertimbangkan perilaku ini.
- Pesanan yang sudah dibuat menyimpan nilai biaya pada saat checkout. Perubahan tarif oleh admin berlaku untuk pesanan baru, tidak mengubah pesanan lama.

## Pembaruan tampilan responsif dan modal

- Form tambah/edit produk, checkout, edit profil, pengajuan toko, pengaturan pembayaran, dan perubahan status pesanan ditampilkan dalam modal.
- Pada smartphone, modal berubah menjadi lembar dari bagian bawah layar, dengan tombol yang mudah disentuh dan area isi yang dapat digulir.
- Tabel riwayat, pesanan, produk, pengajuan penjual, dan verifikasi pembayaran berubah menjadi kartu pada layar kecil sehingga tidak perlu menggeser tabel lebar ke samping.
- Dasbor pelanggan, penjual, dan admin memakai jarak, panel, tombol, dan kartu statistik yang disesuaikan untuk layar kecil.
- Perubahan ini hanya menyentuh tampilan dan alur modal; integrasi Firebase, metode pembayaran, biaya jasa/ongkir, chat, dan checkout dipertahankan.
