/**
 * חיבור ל-Firebase (התחברות עם Google + Firestore לתגובות ולייקים).
 *
 * מופעל רק כשמשתני הסביבה קיימים. בלעדיהם האתר ממשיך לעבוד במצב מקומי
 * (localStorage), כך שהפריסה לא נשברת לפני שההגדרה הושלמה.
 * ראה docs/SETUP-GOOGLE-LOGIN.md להוראות.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** true כשכל ארבעת המשתנים מוגדרים */
export const firebaseEnabled = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let cached = null;

/** מאתחל פעם אחת ומחזיר { app, auth, db }. מחזיר null כשלא מוגדר. */
export function getFirebase() {
  if (!firebaseEnabled || typeof window === 'undefined') return null;
  if (cached) return cached;
  const app = getApps()[0] ?? initializeApp(config);
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}

export async function signInWithGoogle() {
  const fb = getFirebase();
  if (!fb) return null;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(fb.auth, provider);
  return result.user;
}

export function signOutUser() {
  const fb = getFirebase();
  return fb ? signOut(fb.auth) : Promise.resolve();
}

/** מאזין לשינויי התחברות; מחזיר פונקציית ניתוק */
export function watchUser(callback) {
  const fb = getFirebase();
  if (!fb) return () => {};
  return onAuthStateChanged(fb.auth, (u) =>
    callback(u ? { uid: u.uid, name: u.displayName || 'משתמש', photo: u.photoURL || null } : null),
  );
}
