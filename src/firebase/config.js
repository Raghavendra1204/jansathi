import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
// Determine if we should run in mock mode (if keys are blank or placeholders)
const isMockFirebase = !apiKey || apiKey.includes('YOUR_FIREBASE_API_KEY') || apiKey.trim() === '';

let app = null;
let auth = null;
let db = null;

if (!isMockFirebase) {
  try {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully in production mode.");
  } catch (error) {
    console.error("Failed to initialize production Firebase. Falling back to Mock Mode:", error);
    auth = null;
    db = null;
  }
} else {
  console.warn("Jaan Sathi is running in local MOCK FIREBASE mode. Configure real credentials in the .env file to enable live Firestore syncing.");
}

export { app, auth, db, isMockFirebase };
