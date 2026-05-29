import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBg-tQovIZv_4fZ6u8g5MNIOxJeeCpGrYw",
  authDomain: "vinzshop-2b961.firebaseapp.com",
  projectId: "vinzshop-2b961",
  storageBucket: "vinzshop-2b961.firebasestorage.app",
  messagingSenderId: "682223030487",
  appId: "1:682223030487:web:c946984a4e6f0fdeff2092",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db, collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc };
