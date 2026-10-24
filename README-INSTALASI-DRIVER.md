# Pasar Purwakarta — Marketplace + Driver acak

Paket ini melanjutkan proyek Pasar Purwakarta yang sudah menggunakan Firebase, Cloudinary, OneSignal, dan GitHub Pages.

## Isi
- `index.html`: antarmuka responsif, navigasi bawah, modal yang sudah ada, halaman driver.
- `firebase-integrations.js`: login email/password, katalog/pesanan yang sudah ada, profil driver, status online, dan pemilihan driver online secara acak saat checkout.
- `config.js`: konfigurasi Firebase/Cloudinary/OneSignal proyek yang sudah digunakan.
- `firestore.rules`: aturan Firestore yang diperbarui untuk peran driver dan dokumen kehadiran driver.

## Cara memasang dengan aman
1. Jangan menimpa repositori utama sebelum uji coba. Buat branch atau folder uji baru di GitHub.
2. Salin empat file paket ini ke folder website yang sama; nama file harus persis `index.html`, `firebase-integrations.js`, `config.js`, dan `firestore.rules`.
3. Firebase Console → Authentication → Sign-in method: pastikan Email/Password aktif.
4. Firebase Console → Firestore Database → Rules: tinjau `firestore.rules`, lalu terbitkan. Jangan menimpa rules produksi sebelum membandingkan dengan aturan yang sedang aktif.
5. Deploy ke GitHub Pages staging/branch uji. Uji akun pembeli, penjual, dan driver sebelum memindahkan perubahan ke website utama.

## Cara kerja driver
1. Daftarkan akun baru sebagai `Driver pengiriman`. Akun lama tidak otomatis menjadi driver; akun driver harus dibuat melalui pendaftaran.
2. Login, buka menu `Driver`, lengkapi nama dan nomor WhatsApp, lalu simpan.
3. Tekan sakelar status online. Dokumen `driverPresence/{uid}` akan berisi status online.
4. Saat checkout dengan metode pengiriman, aplikasi memilih satu driver online secara acak dan menyimpan UID/nama/nomor driver pada setiap item pesanan di checkout yang sama.
5. Setelah order tersimpan, pembeli dapat menekan tombol WhatsApp pada modal sukses untuk membuka pesan yang telah disiapkan ke driver terpilih. Jika tidak ada driver online, order tetap disimpan dan riwayat tetap tersedia.

## Batasan penting
- Link `wa.me` membuka aplikasi/website WhatsApp dengan teks siap kirim; pesan tidak terkirim sampai pengguna menekan tombol Kirim. Pengiriman otomatis tanpa tindakan pengguna memerlukan WhatsApp Business Platform/API dan backend tepercaya.
- Pemilihan acak pada paket ini dilakukan oleh kode klien. Untuk produksi berskala besar, pindahkan penugasan ke Cloud Function/Cloudflare Worker tepercaya agar tidak dapat dimanipulasi klien dan dapat menerapkan penguncian/masa kedaluwarsa status online.
- `driverPresence` dapat dibaca oleh pengguna yang login agar checkout dapat melihat driver online. Batasi akses dan data yang dipublikasikan sesuai kebijakan privasi; hanya simpan nomor WhatsApp yang memang disetujui driver untuk keperluan order.
- Rules ini perlu ditinjau terhadap seluruh aturan proyek produksi yang aktif. Jangan mengganti rules aktif tanpa membandingkan dan menguji fitur lama (produk, chat, pembayaran, notifikasi, admin).
