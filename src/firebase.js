// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore"

import {getAuth, GoogleAuthProvider} from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCCDABmnWyUg6N4YMqXBKzrl8cnEherPy0",
  authDomain: "autopost-ee6b5.firebaseapp.com",
  projectId: "autopost-ee6b5",
  storageBucket: "autopost-ee6b5.firebasestorage.app",
  messagingSenderId: "836971668147",
  appId: "1:836971668147:web:916c1a956e5b77195fc6c6",
  measurementId: "G-QFJCBCTB8M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();