import { initializeApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import {
  getDatabase,
  ref,
  set,
  get,
} from "firebase/database"

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

const app         = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getDatabase(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: "select_account" })

async function saveUserToDB(user) {
  const userRef  = ref(db, `users/${user.uid}`)
  const snapshot = await get(userRef)
  if (!snapshot.exists()) {
    await set(userRef, {
      uid:         user.uid,
      name:        user.displayName || "",
      email:       user.email,
      photoURL:    user.photoURL || "",
      provider:    user.providerData[0]?.providerId || "unknown",
      createdAt:   Date.now(),
      lastLoginAt: Date.now(),
    })
  } else {
    await set(ref(db, `users/${user.uid}/lastLoginAt`), Date.now())
  }
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  await saveUserToDB(result.user)
  return result.user
}

export async function signUpWithEmail(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(result.user, { displayName: name })
  await saveUserToDB(result.user)
  return result.user
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  await saveUserToDB(result.user)
  return result.user
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function logout() {
  await signOut(auth)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

const FLASK_BASE_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://glotclass-backend.onrender.com"

export async function callAPI(endpoint, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error("Not logged in. Please sign in first.")

  const token = await user.getIdToken()
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${FLASK_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  if (response.status === 401) {
    await logout()
    window.location.href = "/login"
    throw new Error("Session expired. Redirecting to login...")
  }

  return response
}