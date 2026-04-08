import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcfSOII5qyFTrThYUY-PzDwz5_K_Tc7Is",
  authDomain: "habit-app-71e4e.firebaseapp.com",
  projectId: "habit-app-71e4e",
  storageBucket: "habit-app-71e4e.firebasestorage.app",
  messagingSenderId: "900454444770",
  appId: "1:900454444770:web:bd67cdc50e3284e76878bb",
  measurementId: "G-R5E2MFZGSH"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);