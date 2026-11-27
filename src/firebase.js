import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web config is public by design (not a service-account key).
const firebaseConfig = {
  apiKey: "AIzaSyAXqUuuUzKjS0QUhYS4cBn2a28tNQRioKk",
  authDomain: "student-task-system-lab.firebaseapp.com",
  projectId: "student-task-system-lab",
  storageBucket: "student-task-system-lab.firebasestorage.app",
  messagingSenderId: "275522164340",
  appId: "1:275522164340:web:b693dc8d7070da884ae321"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// Task writes go through Supabase Edge Functions (see src/api.js).
