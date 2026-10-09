// ===============================
// IMPORT FIREBASE MODULES
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// ===============================
// FIREBASE CONFIGURATION (الصحيحة متاعك)
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyBxCzmQkxUtjWyJYgPWlnTLXQmqDJH97tQ",
  authDomain: "game-zone1-5a7a3.firebaseapp.com",
  databaseURL: "https://game-zone1-5a7a3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "game-zone1-5a7a3",
  storageBucket: "game-zone1-5a7a3.firebasestorage.app",
  messagingSenderId: "364408778800",
  appId: "1:364408778800:web:6878c12bed8b76c0213df5",
  measurementId: "G-WPWBLKEJD0"
};

// ===============================
// INITIALIZE FIREBASE
// ===============================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===============================
// DATABASE PATH
// ===============================
const DATABASE_PATH = "cabinetData";

// ===============================
// SAVE ALL DATA
// ===============================
async function saveCabinetData(data) {
  try {
    await set(ref(db, DATABASE_PATH), data);
    console.log("✅ Données sauvegardées dans Firebase");
    return true;
  } catch (error) {
    console.error("❌ Erreur Firebase:", error);
    return false;
  }
}

// ===============================
// LOAD ALL DATA
// ===============================
async function loadCabinetData() {
  try {
    const snapshot = await get(ref(db, DATABASE_PATH));
    if (snapshot.exists()) {
      console.log("✅ Données chargées depuis Firebase");
      return snapshot.val();
    }
    console.log("ℹ️ Aucune donnée Firebase pour le moment");
    return null;
  } catch (error) {
    console.error("❌ Erreur lecture Firebase:", error);
    return null;
  }
}

// ===============================
// LISTEN FOR CHANGES
// ===============================
function listenCabinetData(callback) {
  return onValue(ref(db, DATABASE_PATH), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
} 

// ===============================
// MAKE AVAILABLE TO THE APP
// ===============================
window.FirebaseCabinet = {
  saveCabinetData,
  loadCabinetData,
  listenCabinetData
};

console.log("🔥 Firebase Cabinet connecté !");

// ===============================
// BRIDGE localStorage <-> Firebase
// ===============================
const KEYS = [
  "doc_patients_v2", "doc_appointments_v2", "doc_consultations_v2",
  "doc_prescriptions_v2", "doc_documents_v2", "doc_clinical_notes_v2",
  "doc_invoices_v2", "doc_notifications_v2", "doc_audit_logs_v2",
  "doc_settings_v3"
];

let lastJson = "";

function readLocal() {
  const o = {};
  KEYS.forEach(k => (o[k] = localStorage.getItem(k)));
  return JSON.stringify(o);
}

function writeLocal(json) {
  const o = JSON.parse(json);
  KEYS.forEach(k => {
    if (o[k] !== null && o[k] !== undefined) localStorage.setItem(k, o[k]);
  });
}

export async function startSync() {
  const remote = await loadCabinetData();
  if (remote && remote.json) {
    lastJson = remote.json;
    writeLocal(remote.json);
  } else {
    lastJson = readLocal();
    await saveCabinetData({ json: lastJson, updatedAt: Date.now() });
  }

  const originalSetItem = Storage.prototype.setItem;
  let timer = null;
  Storage.prototype.setItem = function (k, v) {
    originalSetItem.call(this, k, v);
    if (this !== localStorage || !KEYS.includes(k)) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const json = readLocal();
      if (json === lastJson) return;
      lastJson = json;
      const ok = await saveCabinetData({ json, updatedAt: Date.now() });
      console.log("sync upload:", ok ? "OK" : "ECHEC");
    }, 800);
  };

  listenCabinetData(remote => {
    if (!remote || !remote.json || remote.json === lastJson) return;
    lastJson = remote.json;
    writeLocal(remote.json);
    location.reload();
  });
}