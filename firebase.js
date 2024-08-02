// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore} from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCW8zUwW_ozP0fCOGz0TwTw2KdEMMbOS74",
  authDomain: "inventory-management-6b0ab.firebaseapp.com",
  projectId: "inventory-management-6b0ab",
  storageBucket: "inventory-management-6b0ab.appspot.com",
  messagingSenderId: "661079290033",
  appId: "1:661079290033:web:e536a2ffedab925e75b290",
  measurementId: "G-6V7ZB0HK29"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);
export {firestore};