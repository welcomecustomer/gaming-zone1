// ===============================
// Firebase.sync.js (Game-Zone Sync)
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
// FIREBASE CONFIGURATION
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyBxCzmQkxUtjWyJYgPWlnTLXQmqDJH97tQ",
  authDomain: "game-zone1-5a7a3.firebaseapp.com",
  databaseURL: "https://game-zone1-5a7a3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "game-zone1-5a7a3",
  storageBucket: "game-zone1-5a7a3.appspot.com",
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
// DATABASE PATH (المسار الجديد في Firebase)
// ===============================
const DATABASE_PATH = "gameZoneData";

// ===============================
// SAVE ALL DATA
// ===============================
async function saveGameZoneData(data) {
  try {
    await set(ref(db, DATABASE_PATH), data);
    console.log("✅ Données sauvegardées dans Firebase (Game-Zone)");
    return true;
  } catch (error) {
    console.error("❌ Erreur Firebase:", error);
    return false;
  }
}

// ===============================
// LOAD ALL DATA
// ===============================
async function loadGameZoneData() {
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
function listenGameZoneData(callback) {
  return onValue(ref(db, DATABASE_PATH), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
} 

// ===============================
// MAKE AVAILABLE TO THE APP
// ===============================
window.FirebaseGameZone = {
  saveGameZoneData,
  loadGameZoneData,
  listenGameZoneData
};

console.log("🔥 Firebase Game-Zone connecté !");

// ===============================
// BRIDGE localStorage <-> Firebase
// ===============================
const KEYS = [
  "et_games", "et_store_items_v3", "et_store_categories_v2",
  "et_store_orders", "et_customers", "et_reservations",
  "et_notifications", "et_maze_config", "et_maze_records", "et_rewards_v2"
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
  try {
    const cur = JSON.parse(localStorage.getItem("et_current_user") || "null");
    const list = JSON.parse(localStorage.getItem("et_customers") || "[]");
    const fresh = cur && list.find(c => (c.email||"").toLowerCase() === (cur.email||"").toLowerCase());
    if (fresh) localStorage.setItem("et_current_user", JSON.stringify(fresh));
  } catch (e) {}
}

export async function startSync() {
  const remote = await loadGameZoneData();
  if (remote && remote.json) {
    lastJson = remote.json;
    writeLocal(remote.json);
  } else {
    lastJson = readLocal();
    await saveGameZoneData({ json: lastJson, updatedAt: Date.now() });
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
      const ok = await saveGameZoneData({ json, updatedAt: Date.now() });
      console.log("sync upload:", ok ? "OK" : "ECHEC");
    }, 800);
  };

  listenGameZoneData(remote => {
    if (!remote || !remote.json || remote.json === lastJson) return;
    lastJson = remote.json;
    writeLocal(remote.json);
    location.reload();
  });
}