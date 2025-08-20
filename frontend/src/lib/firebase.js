import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const cfg = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || import.meta?.env?.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || import.meta?.env?.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || import.meta?.env?.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || import.meta?.env?.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || import.meta?.env?.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID || import.meta?.env?.REACT_APP_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Object.values(cfg).every(Boolean);

export const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);
export { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };