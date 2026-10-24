# Pusat notifikasi Pasar Purwakarta

## Yang sudah disiapkan
- Tombol masuk/keluar di header dihilangkan. Pengunjung melihat Masuk/Daftar pada halaman Akun; pengguna login melihat tombol Keluar di bagian bawah menu Akun.
- Ikon lonceng dan badge jumlah notifikasi belum dibaca.
- Halaman Pusat Notifikasi dalam aplikasi; klik notifikasi membuka halaman tujuan. Link push bisa membuka `?page=notifications`.
- Listener notifikasi realtime Firestore pada koleksi `notifications`.
- Kerangka OneSignal Web SDK dan Cloudflare Worker.

## Format dokumen Firestore `notifications`
Dokumen dibuat backend/admin tepercaya, dengan field misalnya:
```json
{
  "recipientId": "UID_FIREBASE_PENERIMA",
  "title": "Pesanan diperbarui",
  "body": "Pesanan PP-12345 sedang diproses.",
  "icon": "📦",
  "targetPage": "orders",
  "createdAt": "Firestore serverTimestamp",
  "readAt": null
}
```
`recipientId` harus UID Firebase penerima. `targetPage` dapat berupa `orders`, `chat`, `account`, atau `notifications`. Query memakai `recipientId` + `createdAt`, jadi Firebase mungkin meminta indeks komposit; ikuti tautan pembuatan indeks yang muncul di Console.

## OneSignal
1. Buat aplikasi OneSignal dan pilih platform sesuai penggunaan. Untuk Web Push, setel site URL/domain yang benar (GitHub Pages harus memakai domain deploy yang sebenarnya).
2. Salin **OneSignal App ID** ke `oneSignalConfig.appId` pada `config.js`. Jangan pernah memasukkan REST API Key ke file frontend.
3. Pastikan file `OneSignalSDKWorker.js` berada di root domain yang di-host. Beberapa pembungkus WebView memakai SDK native OneSignal sendiri; jika aplikasi Uzan Web Viewer mengelola push native, ikuti pengaturan OneSignal dari aplikasi wrapper dan gunakan URL tujuan `https://DOMAIN-ANDA/?page=notifications`. Jangan menginisialisasi Web Push sekaligus native SDK kecuali petunjuk wrapper memang meminta itu.
4. Di pengaturan klik/notifikasi OneSignal, gunakan URL tujuan `https://DOMAIN-ANDA/?page=notifications` atau URL yang menyertakan `?page=orders`. Aplikasi membaca parameter itu dan membuka bagian terkait.

## Cloudflare Worker
1. Deploy `cloudflare-worker.js` sebagai Worker di Cloudflare.
2. Tambahkan Worker secrets: `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `INTERNAL_TOKEN`. Gunakan token acak panjang. REST API Key dan INTERNAL_TOKEN adalah rahasia dan hanya boleh berada di backend.
3. Endpoint ini sengaja menolak request tanpa `Authorization: Bearer ...`. Jangan menaruh token tersebut di JavaScript/browser. Worker ini merupakan endpoint pengiriman push, bukan otomatis pemantau Firestore. Untuk otomatis mengirim saat pesanan/chat berubah, panggil dari backend tepercaya (misalnya Cloud Functions) setelah perubahan tervalidasi, atau buat integrasi server-to-server yang aman. Jangan membuka endpoint dengan token rahasia di frontend.
4. Untuk push berdasarkan pengguna, OneSignal harus punya External ID yang sama dengan UID Firebase. Integrasi identitas OneSignal perlu diselesaikan sesuai mode SDK yang dipakai wrapper/Web Push.

## Aturan Firestore
Aturan `firestore.rules` memberi pengguna akses baca ke notifikasi miliknya dan hanya mengizinkan perubahan `readAt`; pembuatan/penghapusan hanya admin. Publikasikan aturan ini setelah meninjau seluruh aturan proyek yang sedang berjalan. Jangan menimpa aturan produksi secara membabi buta.

## Catatan penting
Push Android dari aplikasi Web Viewer bergantung pada dukungan wrapper dan konfigurasi OneSignal di aplikasi Android tersebut. Kode situs ini menangani pusat notifikasi dan deep-link, tetapi tidak dapat mengaktifkan izin/notifikasi native wrapper dari situs saja. Uji di APK yang dibangun oleh wrapper.
