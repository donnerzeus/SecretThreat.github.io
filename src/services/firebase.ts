import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: "AIzaSyCs9HWpXysvc3haxcCGwYQeooJHa_6t1d4",
    authDomain: "secretthreat.firebaseapp.com",
    projectId: "secretthreat",
    storageBucket: "secretthreat.firebasestorage.app",
    messagingSenderId: "989882557734",
    appId: "1:989882557734:web:275de64f881b97292e0de7",
    measurementId: "G-36D4VJQPCY"
};

import { getAnalytics, isSupported } from "firebase/analytics";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export let analytics: any = null;
isSupported().then(yes => {
    if (yes) {
        analytics = getAnalytics(app);
    }
}).catch(err => {
    console.warn("Firebase Analytics not supported:", err);
});
