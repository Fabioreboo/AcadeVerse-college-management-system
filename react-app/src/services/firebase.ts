import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpPe_yBvHWx9Dx3XNP4QeaqpnGUkyoTcQ",
  authDomain: "student-hub-4c936.firebaseapp.com",
  projectId: "student-hub-4c936",
  storageBucket: "student-hub-4c936.appspot.com",
  messagingSenderId: "138164720264",
  appId: "1:138164720264:web:e26167a340dcaaa658c53d",
  measurementId: "G-28C9SNVDLT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { 
  auth, 
  db, 
  storage,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  ref,
  uploadBytes,
  getDownloadURL
};