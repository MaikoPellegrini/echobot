// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCyAqCa9JBq6leKC4jSHph_WuUeJE_kuoE",
  authDomain: "echobot-2254b.firebaseapp.com",
  projectId: "echobot-2254b",
  storageBucket: "echobot-2254b.firebasestorage.app",
  messagingSenderId: "465033963533",
  appId: "1:465033963533:web:f88003126296e7f9690d44",
  measurementId: "G-8P31YQ5WM4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

// Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    // Analytics may fail in some environments - safe to ignore
  }
}
export { analytics };

export default app;
