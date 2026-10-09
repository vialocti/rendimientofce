import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Mismo proyecto de Firebase que fcemuidash-vite (variables VITE_FIREBASE_* del .env).
// El login solo controla el acceso a la interfaz: el backend no valida este usuario.
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
