
import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB10u72cOS9UgQFSXKx509PuCCl8kFbFZo",
  authDomain: "emart-ecommerce.firebaseapp.com",
  projectId: "emart-ecommerce",
  storageBucket: "emart-ecommerce.firebasestorage.app", // ✅ DO NOT CHANGE
  messagingSenderId: "730402982718",
  appId: "1:730402982718:web:0258d0fb6e4c092554fa6f",
  measurementId: "G-SFHKTQVX9B"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export { serverTimestamp };
export { Timestamp };
