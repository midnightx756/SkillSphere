// src/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// !! IMPORTANT: Replace with your actual project's config !!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "skillsphere-1e92a.firebaseapp.com",
    projectId: "skillsphere-1e92a",
    storageBucket: "skillsphere-1e92a.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Export the auth and db instances for use in your React components
export { auth, db };
