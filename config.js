// Isi dengan konfigurasi Firebase Web dari Firebase Console > Project settings > Your apps.
// Konfigurasi web Firebase boleh berada di frontend; lindungi data dengan Security Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyDGH69VqYmJB2nhKtG_wO0J2oAnuCfKUoY",
  authDomain: "pasar-bendev.firebaseapp.com",
  databaseURL: "https://pasar-bendev-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pasar-bendev",
  storageBucket: "pasar-bendev.firebasestorage.app",
  messagingSenderId: "600424847380",
  appId: "1:600424847380:web:b37a363ab02aee3b7eef01"
};

// Cloudinary > Settings > Upload > Upload presets. Gunakan unsigned preset khusus produk,
// batasi format gambar dan ukuran file di preset. Jangan masukkan API Secret di browser.
export const cloudinaryConfig = {
  cloudName: "de9cjc54n",
  uploadPreset: "bedvep_preser"
};
