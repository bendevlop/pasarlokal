import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, serverTimestamp, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, cloudinaryConfig } from "./config.js";

const bad = v => !v || String(v).startsWith("GANTI_DENGAN_");
const firebaseReady = !Object.values(firebaseConfig).some(bad);
const cloudinaryReady = !bad(cloudinaryConfig.cloudName) && !bad(cloudinaryConfig.uploadPreset);
let app, auth, db;
let persistenceReady = Promise.resolve();
if (firebaseReady) {
  app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app);
  // Force Firebase Auth to retain the session across refreshes and browser restarts.
  persistenceReady = setPersistence(auth, browserLocalPersistence).catch(err => {
    console.error("Firebase local persistence could not be enabled:", err);
    throw new Error("Sesi login tidak dapat disimpan di browser. Periksa pengaturan browser dan coba kembali. " + (err.message || ""));
  });
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
  "auth/operation-not-allowed":"Metode masuk belum aktif. Silakan hubungi pengelola.",
  "auth/network-request-failed":"Koneksi internet bermasalah. Periksa koneksi lalu coba lagi.",
  "permission-denied":"Akses data ditolak. Silakan hubungi pengelola.",
  "failed-precondition":"Data belum dapat diproses. Silakan coba kembali."
}[e.code] || e.message || "Terjadi kesalahan.");
async function profileFor(user){
  const snap=await getDoc(doc(db,"users",user.uid));if(!snap.exists())return null;
  const profile=snap.data();
  try{const appSnap=await getDoc(doc(db,"sellerApplications",user.uid));if(appSnap.exists())profile.sellerApplication=appSnap.data();}catch(e){console.warn("Tidak dapat membaca pengajuan toko:",e);}
  return profile;
}
window.ppAuthErrorMessage = errorMessage;
window.ppAuth = async ({mode,email,password,role}) => {
  if(!firebaseReady) throw new Error("Layanan akun belum siap. Periksa koneksi internet atau coba kembali nanti.");
  await persistenceReady;
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
      throw new Error("Akun berhasil dibuat, tetapi profil belum tersimpan. Silakan coba kembali atau hubungi pengelola. Detail: " + (e.message || e));
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
    throw new Error("Login berhasil, tetapi profil akun belum ditemukan. Silakan hubungi pengelola.");
  }
  const accountRole=profile.role || "customer";
  return {ok:true,mode:"login",role:accountRole,message:`Berhasil masuk sebagai ${accountRole}.`,profile};
};
window.ppGetCurrentProfile = async () => {
  if(!auth?.currentUser)return null;
  return await profileFor(auth.currentUser);
};
window.ppSaveProfile = async data => {
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile)throw new Error("Profil akun tidak ditemukan di Firestore.");
  await updateDoc(doc(db,"users",user.uid),{displayName:String(data.displayName||"").trim(),phone:String(data.phone||"").trim(),address:String(data.address||"").trim(),updatedAt:serverTimestamp()});
  const updated=await profileFor(user);window.ppUpdateAccountState?.(user,updated);
  return {ok:true,message:"Profil pelanggan berhasil disimpan."};
};
window.ppApplySeller = async data => {
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile)throw new Error("Profil akun tidak ditemukan.");
  if(profile.role!=="customer")throw new Error("Formulir ini khusus akun pelanggan. Akun penjual/admin tidak perlu mengajukan lagi.");
  if(profile.sellerApplication?.status==="pending")throw new Error("Pengajuan Anda masih menunggu pemeriksaan admin.");
  if(!String(data.ownerName||"").trim()||!String(data.phone||"").trim()||!String(data.storeName||"").trim()||!String(data.category||"").trim()||!String(data.storeAddress||"").trim())throw new Error("Lengkapi nama pemilik, WhatsApp, nama toko, kategori, dan alamat toko.");
  const application={uid:user.uid,email:user.email||"",ownerName:String(data.ownerName).trim(),phone:String(data.phone).trim(),storeName:String(data.storeName).trim(),category:String(data.category).trim(),storeAddress:String(data.storeAddress).trim(),description:String(data.description||"").trim(),status:"pending",submittedAt:serverTimestamp()};
  await setDoc(doc(db,"sellerApplications",user.uid),application);
  const updated={...profile,sellerApplication:{...application,submittedAt:new Date()}};window.ppUpdateAccountState?.(user,updated);
  return {ok:true,message:"Pengajuan menjadi penjual berhasil dikirim. Anda tetap menggunakan akun yang sama; admin akan memeriksa pengajuan Anda.",profile:updated};
};
async function uploadImage(file, folder="products"){
  if(!file || !file.size) return "";
  if(!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if(file.size>8*1024*1024) throw new Error("Ukuran foto maksimal 8 MB.");
  if(!cloudinaryReady) throw new Error("Fitur unggah foto belum siap. Coba kembali nanti atau hubungi pengelola.");
  const data=new FormData();data.append("file",file);data.append("upload_preset",cloudinaryConfig.uploadPreset);data.append("folder",`pasar-purwakarta/${folder}`);
  const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`,{method:"POST",body:data});
  const result=await response.json();if(!response.ok) throw new Error(result.error?.message||"Upload foto ke Cloudinary gagal.");return result.secure_url;
}
window.ppSaveProduct = async data => {
  if(!firebaseReady) throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");
  const user=auth.currentUser;if(!user) throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile) throw new Error("Profil akun tidak ditemukan di Firestore.");
  const isAdmin=profile.role==="admin";
  const isSeller=profile.role==="seller";
  if(!isAdmin&&!isSeller) throw new Error("Fitur kelola produk hanya untuk penjual dan admin.");
  if(isSeller&&profile.sellerStatus!=="approved") throw new Error("Toko Anda masih menunggu persetujuan admin.");
  const realStoreName=isSeller?String(profile.storeName||"").trim():String(data.store||"").trim();
  if(!data.name?.trim()||!realStoreName||!Number.isFinite(data.price)||data.price<1) throw new Error("Lengkapi nama produk, nama toko, dan harga yang benar. Pastikan profil toko sudah lengkap.");
  let existing=null;
  if(data.id){
    const existingSnap=await getDoc(doc(db,"products",String(data.id)));
    if(!existingSnap.exists()) throw new Error("Produk yang akan diedit tidak ditemukan.");
    existing=existingSnap.data();
    if(!isAdmin&&existing.ownerId!==user.uid) throw new Error("Anda hanya dapat mengedit produk milik toko sendiri.");
  }
  const uploadedPhoto=await uploadImage(data.file);
  const productData={name:data.name.trim(),category:String(data.category||"Lainnya"),price:data.price,store:realStoreName,storeAddress:String(profile.storeAddress||"").trim(),ownerName:String(profile.displayName||profile.email||""),description:(data.description||"").trim(),photo:uploadedPhoto||(existing?.photo||""),place:existing?.place||"Purwakarta",ownerId:existing?.ownerId||user.uid,status:existing?.status||"approved",tag:existing?.tag||"Produk lokal",updatedAt:serverTimestamp()};
  if(existing){
    await updateDoc(doc(db,"products",String(data.id)),productData);
    return {ok:true,message:"Perubahan produk berhasil disimpan."};
  }
  await addDoc(collection(db,"products"),{...productData,createdAt:serverTimestamp()});
  return {ok:true,message:"Produk berhasil ditambahkan ke katalog."};
};
window.ppLoadProducts = async () => {
  if(!firebaseReady) return;
  try{
    const q=query(collection(db,"products"),where("status","==","approved"));
    const snap=await getDocs(q);
    const items=snap.docs.map(d=>{const x=d.data();return {...x,id:d.id,emoji:"🛍️",color:"#e4f2ea",custom:true,tag:x.tag||x.category||"Produk lokal",photo:x.photo||""}});
    window.ppSetProducts?.(items);
    const catalogError=$("catalogLoadStatus");if(catalogError)catalogError.textContent="";
  }catch(e){
    console.error("Gagal memuat katalog Firebase:",e);
    window.ppSetProducts?.([]);
    const catalogError=$("catalogLoadStatus");
    if(catalogError)catalogError.textContent="Produk belum dapat dimuat. Periksa koneksi internet lalu coba lagi.";
  }
};
window.ppCreateOrders = async data => {
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile)throw new Error("Profil pelanggan tidak ditemukan.");
  const inputItems=Array.isArray(data.items)&&data.items.length?data.items:[{productId:data.productId,quantity:data.quantity||1}];
  if(inputItems.length>30)throw new Error("Maksimal 30 jenis produk dalam satu checkout.");
  const normalized=[];
  for(const item of inputItems){
    const productId=String(item.productId||"");if(!productId)continue;
    const productSnap=await getDoc(doc(db,"products",productId));
    if(!productSnap.exists())throw new Error("Salah satu produk tidak ditemukan. Muat ulang katalog dan periksa keranjang.");
    const product=productSnap.data();if(product.status!=="approved")throw new Error(`Produk ${product.name||"pilihan Anda"} sudah tidak tersedia.`);
    if(product.ownerId===user.uid)throw new Error("Anda tidak dapat memesan produk dari toko sendiri.");
    const quantity=Math.max(1,Math.min(99,Math.floor(Number(item.quantity)||1)));
    normalized.push({productId,product,quantity});
  }
  if(!normalized.length)throw new Error("Keranjang kosong atau produk tidak tersedia.");
  const phone=String(data.phone||"").trim(),fulfillmentMethod=String(data.fulfillmentMethod||"Delivery")==="Pickup"?"Pickup":"Delivery",address=String(data.address||"").trim(),customerName=String(data.customerName||profile.displayName||"").trim();
  if(!customerName||!phone)throw new Error("Lengkapi nama penerima dan nomor WhatsApp.");
  if(fulfillmentMethod==="Delivery"&&!address)throw new Error("Masukkan alamat pengiriman atau pilih Ambil sendiri.");
  const settingsSnap=await getDoc(doc(db,"paymentSettings","main"));
  const feeSettings=settingsSnap.exists()?settingsSnap.data():{};
  const serviceFee=Math.max(0,Math.floor(Number(feeSettings.serviceFee)||0));
  const deliveryFee=fulfillmentMethod==="Pickup"?0:Math.max(0,Math.floor(Number(feeSettings.deliveryFee)||0));
  const orderNumber="PP-"+Date.now().toString().slice(-8)+"-"+Math.random().toString(36).slice(2,5).toUpperCase();
  const batch=writeBatch(db),ids=[];
  normalized.forEach(({productId,product,quantity},index)=>{
    const ref=doc(collection(db,"orders"));ids.push(ref.id);
    const productSubtotal=Number(product.price)*quantity,orderServiceFee=serviceFee,orderDeliveryFee=deliveryFee,total=productSubtotal+orderServiceFee+orderDeliveryFee;
    const order={orderNumber,checkoutGroup:orderNumber,itemIndex:index+1,itemCount:normalized.length,productId,productName:String(product.name||""),category:String(product.category||""),photo:String(product.photo||""),storeName:String(product.store||""),sellerId:String(product.ownerId||""),customerId:user.uid,customerEmail:user.email||"",customerName,phone,address:fulfillmentMethod==="Pickup"?"Ambil sendiri":address,note:String(data.note||"").trim(),quantity,unitPrice:Number(product.price),productSubtotal,serviceFee:orderServiceFee,fulfillmentMethod,deliveryFee:orderDeliveryFee,shippingFee:orderDeliveryFee,total,paymentMethod:String(data.paymentMethod||"COD"),paymentStatus:String(data.paymentMethod||"COD")==="COD"?"Bayar saat diterima":"Menunggu pembayaran",paymentProofUrl:"",status:"Menunggu konfirmasi",createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    batch.set(ref,order);
  });
  await batch.commit();
  return {ok:true,id:ids[0],ids,orderNumber,count:normalized.length};
};
window.ppCreateOrder = async data => window.ppCreateOrders({...data,items:[{productId:data.productId,quantity:data.quantity||1}]});

const defaultPaymentSettings={bankName:"",bankAccountName:"",bankAccountNumber:"",qrisImageUrl:"",ewalletName:"",ewalletNumber:"",serviceFee:0,deliveryFee:0,instructions:"Silakan bayar sesuai total pesanan. Unggah bukti pembayaran di halaman Pesanan Saya. Pesanan diproses setelah admin memverifikasi pembayaran."};
window.ppGetPaymentSettings=async()=>{
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");
  const snap=await getDoc(doc(db,"paymentSettings","main"));
  return {...defaultPaymentSettings,...(snap.exists()?snap.data():{})};
};
window.ppSavePaymentSettings=async data=>{
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk sebagai admin.");
  const profile=await profileFor(user);if(profile?.role!=="admin")throw new Error("Hanya admin yang dapat mengatur tujuan pembayaran.");
  const settings={bankName:String(data.bankName||"").trim(),bankAccountName:String(data.bankAccountName||"").trim(),bankAccountNumber:String(data.bankAccountNumber||"").trim(),qrisImageUrl:String(data.qrisImageUrl||"").trim(),ewalletName:String(data.ewalletName||"").trim(),ewalletNumber:String(data.ewalletNumber||"").trim(),serviceFee:Math.max(0,Math.floor(Number(data.serviceFee)||0)),deliveryFee:Math.max(0,Math.floor(Number(data.deliveryFee)||0)),instructions:String(data.instructions||defaultPaymentSettings.instructions).trim(),updatedAt:serverTimestamp(),updatedBy:user.uid};
  await setDoc(doc(db,"paymentSettings","main"),settings,{merge:true});
  return {ok:true,message:"Pengaturan pembayaran berhasil disimpan."};
};
window.ppSubmitPaymentProof=async(orderId,file)=>{
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  if(!file)throw new Error("Pilih gambar bukti pembayaran terlebih dahulu.");
  const ref=doc(db,"orders",String(orderId)),snap=await getDoc(ref);if(!snap.exists())throw new Error("Pesanan tidak ditemukan.");
  const order=snap.data();if(order.customerId!==user.uid)throw new Error("Anda hanya dapat mengirim bukti untuk pesanan sendiri.");
  if(order.paymentMethod==="COD")throw new Error("Pesanan tunai saat diterima tidak memerlukan bukti transfer.");
  if(order.paymentStatus==="Terverifikasi")throw new Error("Pembayaran pesanan ini sudah diverifikasi.");
  const url=await uploadImage(file,"payment-proofs");
  const group=String(order.checkoutGroup||"");
  const groupSnap=group?await getDocs(query(collection(db,"orders"),where("checkoutGroup","==",group))):null;
  const targets=groupSnap?.docs?.length?groupSnap.docs:[snap];
  const batch=writeBatch(db);
  targets.forEach(item=>{const data=item.data();if(data.customerId===user.uid&&data.paymentMethod!=="COD"&&data.paymentStatus!=="Terverifikasi")batch.update(item.ref,{paymentProofUrl:url,paymentStatus:"Menunggu verifikasi",paymentSubmittedAt:serverTimestamp(),updatedAt:serverTimestamp()});});
  await batch.commit();
  await window.ppLoadOrders();return {ok:true,message:"Bukti pembayaran terkirim untuk seluruh barang dalam checkout ini. Tunggu verifikasi admin."};
};
window.ppReviewPayment=async(orderId,decision)=>{
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk sebagai admin.");
  const profile=await profileFor(user);if(profile?.role!=="admin")throw new Error("Hanya admin yang dapat memverifikasi pembayaran.");
  if(!["Terverifikasi","Ditolak"].includes(decision))throw new Error("Keputusan pembayaran tidak valid.");
  const ref=doc(db,"orders",String(orderId)),snap=await getDoc(ref);if(!snap.exists())throw new Error("Pesanan tidak ditemukan.");
  const order=snap.data();if(!order.paymentProofUrl)throw new Error("Pembeli belum mengunggah bukti pembayaran.");
  const group=String(order.checkoutGroup||"");
  const groupSnap=group?await getDocs(query(collection(db,"orders"),where("checkoutGroup","==",group))):null;
  const targets=groupSnap?.docs?.length?groupSnap.docs:[snap];
  const batch=writeBatch(db);
  targets.forEach(item=>{const data=item.data();if(data.paymentProofUrl)batch.update(item.ref,{paymentStatus:decision,paymentVerifiedAt:serverTimestamp(),paymentVerifiedBy:user.uid,updatedAt:serverTimestamp()});});
  await batch.commit();
  await window.ppLoadOrders();return {ok:true,message:decision==="Terverifikasi"?"Pembayaran berhasil diverifikasi untuk seluruh barang dalam checkout ini.":"Bukti pembayaran ditolak untuk checkout ini. Pembeli dapat mengunggah ulang bukti."};
};

window.ppLoadOrders = async () => {
  if(!firebaseReady||!auth?.currentUser)return;
  const user=auth.currentUser;
  const refs=collection(db,"orders"), docs=[], seen=new Set(), queryErrors=[];
  const mergeSnap=snap=>{for(const d of snap.docs){if(!seen.has(d.id)){seen.add(d.id);docs.push(d);}}};
  const safeQuery=async(label,queryRef)=>{try{mergeSnap(await getDocs(queryRef));}catch(e){queryErrors.push(label+": "+errorMessage(e));console.warn("Gagal memuat "+label,e);}};
  try{
    const profile=await profileFor(user);if(!profile)return;
    if(profile.role==="admin"){
      mergeSnap(await getDocs(refs));
    } else {
      // Order documents created by different app versions may use different buyer field names.
      // Query each field separately because Firestore rules are not filters.
      await safeQuery("pesanan berdasarkan UID pembeli",query(refs,where("customerId","==",user.uid)));
      await safeQuery("pesanan berdasarkan customerUid",query(refs,where("customerUid","==",user.uid)));
      await safeQuery("pesanan berdasarkan buyerId",query(refs,where("buyerId","==",user.uid)));
      await safeQuery("pesanan berdasarkan userId",query(refs,where("userId","==",user.uid)));
      if(profile.role==="seller") await safeQuery("pesanan toko",query(refs,where("sellerId","==",user.uid)));
      if(user.email){
        await safeQuery("pesanan berdasarkan email pembeli",query(refs,where("customerEmail","==",user.email)));
        await safeQuery("pesanan lama berdasarkan email",query(refs,where("email","==",user.email)));
      }
    }
    const items=docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||b.createdAt?.seconds||0)-(a.createdAt?.toMillis?.()||a.createdAt?.seconds||0));
    window.ppSetOrders?.(items);
    const status=$("orderLoadStatus");if(status){status.textContent=queryErrors.length?"Sebagian pencarian riwayat tidak berhasil: "+queryErrors.join(" · "): (items.length?`Berhasil memuat ${items.length} pesanan.`:"Belum ada dokumen pesanan yang cocok dengan akun ini. Jika admin melihat pesanan, periksa field customerId/customerUid/buyerId/userId pada dokumen tersebut." );}
  }catch(e){
    console.error("Gagal memuat pesanan:",e);
    const msg="Riwayat pesanan gagal dimuat: "+errorMessage(e)+". Silakan coba lagi.";
    const status=$("orderLoadStatus");if(status)status.textContent=msg;
    const el=$("orderList");if(el)el.innerHTML=`<div class="empty">${msg}</div>`;
    for(const id of ["sellerOrderTable","adminOrderTable"]){const el=$(id);if(el&&el.tagName==="TBODY")el.innerHTML=`<tr><td colspan="8">${msg}</td></tr>`;}
  }
};
window.ppUpdateOrderStatus = async (orderId,status) => {
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");const allowed=["Menunggu konfirmasi","Diproses","Dikirim","Selesai","Dibatalkan"];if(!allowed.includes(status))throw new Error("Status pesanan tidak valid.");
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");const profile=await profileFor(user),ref=doc(db,"orders",String(orderId)),snap=await getDoc(ref);if(!snap.exists())throw new Error("Pesanan tidak ditemukan.");const order=snap.data();
  if(profile?.role!=="admin"&&order.sellerId!==user.uid)throw new Error("Hanya penjual pemilik pesanan atau admin yang dapat mengubah status.");await updateDoc(ref,{status,updatedAt:serverTimestamp()});await window.ppLoadOrders();return {ok:true};
};
window.ppLoadSellerApplications = async () => {
  if(!firebaseReady||!auth?.currentUser)return;
  const user=auth.currentUser,profile=await profileFor(user);
  if(profile?.role!=="admin")return;
  const tbody=$("adminSellerApplications");if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="6">Memuat pengajuan toko...</td></tr>';
  try{
    // Fetch the collection for admin, then filter client-side to include older records
    // where the status field may be missing or have a legacy value.
    const snap=await getDocs(collection(db,"sellerApplications"));
    const all=snap.docs.map(d=>({id:d.id,...d.data()}));
    const apps=all.filter(a=>String(a.status||"pending").toLowerCase()!=="approved");
    const safe=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    tbody.innerHTML=apps.length?apps.map(a=>{
      const status=a.status||"pending";
      const pending=["pending","menunggu","menunggu persetujuan","menunggu pemeriksaan"].includes(String(status).toLowerCase());
      const action=pending
        ? `<button type="button" onclick="window.reviewSeller?.('${safe(a.id)}','approved')">Setujui</button> <button type="button" onclick="window.reviewSeller?.('${safe(a.id)}','rejected')">Tolak</button>`
        : `<button type="button" onclick="window.reviewSeller?.('${safe(a.id)}','approved')">Setujui</button>`;
      return `<tr><td>${safe(a.ownerName||a.displayName||"—")}</td><td>${safe(a.storeName||"—")}</td><td>${safe(a.category||"—")}</td><td>${safe(a.phone)}<br>${safe(a.email)}</td><td>${safe(status)}</td><td>${action}</td></tr>`;
    }).join(""):'<tr><td colspan="6">Belum ada permohonan penjual yang menunggu. Jika dokumen terlihat di Firebase tetapi tidak tampil, periksa nama koleksi dan role admin.</td></tr>';
    const adminCount=$("adminSellers");
    if(adminCount){
      const usersSnap=await getDocs(collection(db,"users"));
      adminCount.textContent=usersSnap.docs.filter(d=>d.data().role==="seller"&&d.data().sellerStatus==="approved").length;
    }
  }catch(e){
    console.error("Gagal memuat pengajuan penjual:",e);
    tbody.innerHTML=`<tr><td colspan="6">Gagal memuat dari Firebase: ${errorMessage(e)}. Pastikan akun ini memiliki role admin dan Firestore Rules terbaru sudah dipublikasikan.</td></tr>`;
  }
};
window.ppReviewSeller = async (uid,decision) => {
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");if(!["approved","rejected"].includes(decision))throw new Error("Keputusan tidak valid.");const user=auth.currentUser,admin=await profileFor(user);if(!user||admin?.role!=="admin")throw new Error("Hanya admin yang dapat meninjau pengajuan.");
  const appRef=doc(db,"sellerApplications",String(uid)),appSnap=await getDoc(appRef);if(!appSnap.exists())throw new Error("Pengajuan tidak ditemukan.");const application=appSnap.data();
  if(decision==="approved"){await updateDoc(doc(db,"users",String(uid)),{role:"seller",sellerStatus:"approved",storeName:application.storeName,storeCategory:application.category,storeAddress:application.storeAddress,updatedAt:serverTimestamp()});await updateDoc(appRef,{status:"approved",reviewedAt:serverTimestamp(),reviewedBy:user.uid});}
  else await updateDoc(appRef,{status:"rejected",reviewedAt:serverTimestamp(),reviewedBy:user.uid});
  await window.ppLoadSellerApplications();return {ok:true,message:decision==="approved"?"Penjual disetujui. Akun tersebut kini menjadi akun penjual.":"Pengajuan penjual ditolak."};
};

// Chat privat: satu percakapan per pasangan pembeli-penjual, pesan tersimpan di Firestore.
function chatDocId(customerId,sellerId){return [String(customerId),String(sellerId)].sort().join("__");}
window.ppOpenChatForOrder = async order => {
  if(!firebaseReady)throw new Error("Layanan belum siap. Periksa koneksi internet atau coba kembali nanti.");
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile)throw new Error("Profil akun tidak ditemukan.");
  const customerId=String(order.customerId||""),sellerId=String(order.sellerId||"");
  if(user.uid!==customerId&&user.uid!==sellerId&&profile.role!=="admin")throw new Error("Anda bukan pihak dalam pesanan ini.");
  if(!customerId||!sellerId)throw new Error("Data pembeli atau penjual pada pesanan tidak lengkap.");
  const id=chatDocId(customerId,sellerId),ref=doc(db,"chats",id),snap=await getDoc(ref);
  const chatData={customerId,sellerId,customerName:String(order.customerName||"Pembeli"),storeName:String(order.storeName||"Toko"),orderNumber:String(order.orderNumber||order.id||""),participants:[customerId,sellerId],updatedAt:serverTimestamp()};
  if(!snap.exists())await setDoc(ref,{...chatData,lastMessage:"",createdAt:serverTimestamp()});else await setDoc(ref,chatData,{merge:true});
  const peerName=user.uid===sellerId?chatData.customerName:chatData.storeName;
  return {ok:true,id,customerId,sellerId,peerName,orderId:order.id||""};
};
window.ppLoadChats = async () => {
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const profile=await profileFor(user);if(!profile)throw new Error("Profil akun tidak ditemukan.");let snap;
  if(profile.role==="admin")snap=await getDocs(collection(db,"chats"));
  else if(profile.role==="seller")snap=await getDocs(query(collection(db,"chats"),where("sellerId","==",user.uid)));
  else snap=await getDocs(query(collection(db,"chats"),where("customerId","==",user.uid)));
  return snap.docs.map(d=>{const c=d.data();return {id:d.id,...c,peerName:user.uid===c.sellerId?c.customerName:(c.storeName||"Penjual")};}).sort((a,b)=>(b.updatedAt?.toMillis?.()||0)-(a.updatedAt?.toMillis?.()||0));
};
window.ppLoadChatMessages = async chatId => {
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const chatSnap=await getDoc(doc(db,"chats",String(chatId)));if(!chatSnap.exists())throw new Error("Percakapan tidak ditemukan.");
  const c=chatSnap.data();if(user.uid!==c.customerId&&user.uid!==c.sellerId)throw new Error("Anda tidak memiliki akses ke percakapan ini.");
  const snap=await getDocs(collection(db,"chats",String(chatId),"messages"));
  return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));
};
window.ppSendChatMessage = async ({chatId,message}) => {
  const user=auth.currentUser;if(!user)throw new Error("Silakan masuk terlebih dahulu.");
  const text=String(message||"").trim();if(!text)throw new Error("Tulis pesan terlebih dahulu.");if(text.length>2000)throw new Error("Pesan maksimal 2.000 karakter.");
  const ref=doc(db,"chats",String(chatId)),snap=await getDoc(ref);if(!snap.exists())throw new Error("Percakapan tidak ditemukan.");const c=snap.data();
  if(user.uid!==c.customerId&&user.uid!==c.sellerId)throw new Error("Anda tidak memiliki akses ke percakapan ini.");
  const profile=await profileFor(user);await addDoc(collection(db,"chats",String(chatId),"messages"),{senderId:user.uid,senderName:String(profile?.displayName||profile?.storeName||(profile?.role==="seller"?"Penjual":profile?.role==="admin"?"Admin":"Pembeli")),message:text,createdAt:serverTimestamp()});
  await updateDoc(ref,{lastMessage:text,updatedAt:serverTimestamp()});return {ok:true};
};

window.ppLogout = async () => {if(auth){await signOut(auth);window.ppUpdateAccountState?.(null,null);setStatus("Belum masuk.");const account=document.getElementById("accountPage");if(account?.classList.contains("active"))showPage("home");}};
if(firebaseReady){
  persistenceReady.then(()=>{
    onAuthStateChanged(auth,async user=>{
      if(!user){window.ppUpdateAccountState?.(null,null);setStatus("Belum masuk.");return;}
      try{
        const p=await profileFor(user);
        if(!p){
          console.warn("Authentication session exists but Firestore profile is missing for UID",user.uid);
          window.ppUpdateAccountState?.(user,null);
          setStatus(`${user.email||"Akun masuk"} · profil belum lengkap`);
          return;
        }
        window.ppUpdateAccountState?.(user,p);
        if(window.ppOnRoleChange)window.ppOnRoleChange(p.role||"");
        setStatus(`${p.displayName||user.email} · ${p.role||"pelanggan"}${p.role==="seller"?` · status toko: ${p.sellerStatus||"pending"}`:""}`);
      }catch(e){
        console.error("Gagal memuat profil setelah login:",e);
        window.ppUpdateAccountState?.(user,null);
        setStatus(`${user.email||"Akun masuk"} · gagal memuat profil`);
      }
    },error=>{
      console.error("Firebase auth state error:",error);
      setStatus("Sesi login tidak dapat diperiksa. Muat ulang halaman atau coba kembali.");
    });
  }).catch(e=>{console.error(e);setStatus(e.message||"Gagal menyiapkan sesi login.");});
  window.ppLoadProducts();
}
