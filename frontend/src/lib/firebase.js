import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const cfg = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Object.values(cfg).every(Boolean);

const appInstance = getApps().length ? getApps()[0] : initializeApp(cfg);
export const app = appInstance;
export const auth = getAuth(appInstance);
export { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };