import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDz1tWSaytYMmHExiytp0UqqB_O6UJ02Vo",
  authDomain: "kiyota-proto-dx.firebaseapp.com",
  projectId: "kiyota-proto-dx",
  storageBucket: "kiyota-proto-dx.firebasestorage.app",
  messagingSenderId: "715897583126",
  appId: "1:715897583126:web:353c71b24f42fedd7f6737",
  measurementId: "G-SRS8VZ328E",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
