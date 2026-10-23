import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, cloudinaryConfig } from "./config.js";

const bad = v => !v || String(v).startsWith("GANTI_DENGAN_");
const firebaseReady = !Object.values(firebaseConfig).some(bad);
const cloudinaryReady = !bad(cloudinaryConfig.cloudName) && !bad(cloudinaryConfig.uploadPreset);
let app, auth, db;
if (firebaseReady) {
  app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app);
} else {
  console.warn("Pasar Purwakarta: isi konfigurasi Firebase di config.js untuk mengaktifkan login dan database.");
}
const $ = id => document.getElementById(id);
const setStatus = msg => { const n=$("accountInfo"); if(n) n.textContent=msg; };
const errorMessage = e => ({
  "auth/email-already-in-use":"Email sudah terdaftar. Silakan masuk.",
  "auth/invalid-credential":"Email atau password salah.",
  "auth/user-not-found":"Akun tidak ditemukan. Silakan daftar terlebih dahulu.",
  "auth/wrong-password":"Password salah.",
  "auth/weak-password":"Password minimal 6 karakter.",
  "auth/invalid-email":"Format email tidak valid.",
  "auth/operation-not-allowed":"Aktifkan metode Email/Password di Firebase Authentication.",
  "auth/network-request-failed":"Koneksi internet bermasalah. Periksa koneksi lalu coba lagi.",
  "permission-denied":"Akses Firestore ditolak. Periksa Firestore Rules.",
  "failed-precondition":"Periksa konfigurasi Firestore atau indeks yang diminta Firebase."
}[e.code] || e.message || "Terjadi kesalahan.");
async function profileFor(user){const snap=await getDoc(doc(db,"users",user.uid));return snap.exists()?snap.data():null;}
window.ppAuthErrorMessage = errorMessage;
window.ppAuth = async ({mode,email,password,role}) => {
  if(!firebaseReady) throw new Error("Isi konfigurasi Firebase Web di config.js, lalu commit ulang ke GitHub.");
  let credential;
  if(mode==="register"){
    if(!["customer","seller"].includes(role)) role="customer";
    credential=await createUserWithEmailAndPassword(auth,email,password);
    try {
      await setDoc(doc(db,"users",credential.user.uid),{
        uid:credential.user.uid,email:credential.user.email,role,
        sellerStatus:role==="seller"?"pending":"not_applicable",
        storeName:role==="seller"?email.split("@")[0]:"",
        createdAt:serverTimestamp()
      });
    } catch (e) {
      throw new Error("Akun berhasil dibuat di Authentication, tetapi profil Firestore gagal disimpan. Periksa Firestore Rules. Detail: " + (e.message || e));
    }
    await signOut(auth);
    return {ok:true,mode:"register",role,message:role==="seller"
      ?"Pendaftaran penjual berhasil! Silakan lanjut login. Toko menunggu persetujuan admin sebelum dapat menerbitkan produk."
      :"Pendaftaran berhasil! Akun Anda sudah tersimpan. Silakan lanjut login."};
  }
  credential=await signInWithEmailAndPassword(auth,email,password);
  const profile=await profileFor(credential.user);
  if(!profile) {
    await signOut(auth);
    throw new Error("Login berhasil di Firebase Authentication, tetapi profil users/" + credential.user.uid + " belum tersedia. Pastikan dokumen Firestore users memakai UID yang sama.");
  }
  const accountRole=profile.role || "customer";
  return {ok:true,mode:"login",role:accountRole,message:`Berhasil masuk sebagai ${accountRole}.`,profile};
};
async function uploadImage(file){
  if(!file || !file.size) return "";
  if(!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if(file.size>8*1024*1024) throw new Error("Ukuran foto maksimal 8 MB.");
  if(!cloudinaryReady) throw new Error("Isi Cloud Name dan Upload Preset Cloudinary di config.js untuk mengunggah foto. Login Firebase tidak memerlukan Cloudinary.");
  const data=new FormData();data.append("file",file);data.append("upload_preset",cloudinaryConfig.uploadPreset);data.append("folder","pasar-purwakarta/products");
  const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`,{method:"POST",body:data});
  const result=await response.json();if(!response.ok) throw new Error(result.error?.message||"Upload foto ke Cloudinary gagal.");return result.secure_url;
}
window.ppSaveProduct = async data => {
  if(!firebaseReady) throw new Error("Isi konfigurasi Firebase di config.js terlebih dahulu.");
  const user=auth.currentUser;if(!user) throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile||profile.role!=="seller") throw new Error("Fitur tambah produk hanya untuk akun penjual. Daftar sebagai penjual lalu masuk kembali.");
  if(profile.sellerStatus!=="approved") throw new Error("Toko Anda masih menunggu persetujuan admin. Admin perlu mengubah sellerStatus menjadi approved di users/UID.");
  if(!data.name?.trim()||!data.store?.trim()||!Number.isFinite(data.price)||data.price<1) throw new Error("Lengkapi nama produk, nama toko, dan harga yang benar.");
  const photo=await uploadImage(data.file);
  await addDoc(collection(db,"products"),{name:data.name.trim(),category:data.category,price:data.price,store:data.store.trim(),description:(data.description||"").trim(),photo,place:"Purwakarta",ownerId:user.uid,status:"approved",tag:"Produk lokal",createdAt:serverTimestamp()});
  return {ok:true,message:"Produk berhasil disimpan dan tampil di katalog."};
};
window.ppLoadProducts = async () => {
  if(!firebaseReady) return;
  try{
    const q=query(collection(db,"products"),where("status","==","approved"));const snap=await getDocs(q);
    const items=snap.docs.map(d=>{const x=d.data();return {...x,id:d.id,emoji:"🛍️",color:"#e4f2ea",custom:true,tag:x.tag||x.category||"Produk lokal",photo:x.photo||""}});
    if(window.ppSetProducts) window.ppSetProducts(items.length?items:[]);
  }catch(e){console.error(e);}
};
window.ppLogout = async () => {if(auth){await signOut(auth);setStatus("Anda sudah keluar.");alert("Berhasil keluar.");}};
if(firebaseReady){
  onAuthStateChanged(auth,async user=>{
    if(!user){setStatus("Belum masuk.");return;}
    try{const p=await profileFor(user);if(window.ppOnRoleChange)window.ppOnRoleChange(p?.role||"");setStatus(`${user.email} · ${p?.role||"akun"}${p?.role==="seller"?` · status toko: ${p.sellerStatus||"pending"}`:""}`);}
    catch(e){setStatus(user.email||"Sudah masuk");}
  });
  window.ppLoadProducts();
}
