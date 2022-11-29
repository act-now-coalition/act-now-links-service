import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import {
  getDocs,
  setDoc,
  getDoc,
  getFirestore,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";
import uuid from "uuidv4";

const productionConfig = {
  apiKey: "AIzaSyBbve3kWHp3b8izyph0puHaPdCLOfkJNww",
  authDomain: "act-now-links-prod.firebaseapp.com",
  projectId: "act-now-links-prod",
  storageBucket: "act-now-links-prod.appspot.com",
  messagingSenderId: "607614502886",
  appId: "1:607614502886:web:92942b611ed1474de7b827",
  measurementId: "G-FN0P80X049",
};

const developConfig = {
  apiKey: "AIzaSyDRW6y_kxN51ZUNJr43y2Mgd6v8BLu-ih4",
  authDomain: "act-now-links-dev.firebaseapp.com",
  projectId: "act-now-links-dev",
  storageBucket: "act-now-links-dev.appspot.com",
  messagingSenderId: "788050488438",
  appId: "1:788050488438:web:bf6c2652f43cf774b90357",
  measurementId: "G-TGZKGK2HJV",
};

export const isProductionEnv = window.location.href.includes(
  "share.actnowcoalition.org"
);

export const API_KEY_COLLECTION = "apiKeys";
const firebaseApp = initializeApp(
  isProductionEnv ? productionConfig : developConfig
);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export function handleLogin() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const userEmail = result.user.email;
      if (userEmail && /\@actnowcoalition.org/.test(userEmail)) {
        window.location.href = "panel.html";
      } else {
        throw new Error("Please use an actnowcoalition.org address");
      }
    })
    .catch((error) => {
      const mainCard = document.getElementById("message");
      const message = document.createElement("div");
      message.id = "login-error";
      if (error.message === "Please use an actnowcoalition.org address") {
        message.innerText = error.message;
      } else {
        message.innerText = "Unexpected error, try again later.";
      }
      mainCard?.prepend(message);
    });
}

export function checkLogin() {
  onAuthStateChanged(auth, (user) => {
    const userEmail = user?.email;
    if (userEmail && /\@actnowcoalition.org/.test(userEmail)) {
      console.log("CORRECT EMAIL");
    } else {
      // Redirect back to login page if not logged in.
      // Sign out in case user is using non-actnowcoalition.org email.
      auth.signOut();
      window.location.href = "index.html";
    }
  });
}

export async function fetchAPIKeys() {
  const keyCollection = collection(firestore, API_KEY_COLLECTION);
  const apiKeyDocs = await getDocs(keyCollection);
  return apiKeyDocs.docs;
}

export async function updateEnabledStatus(email: string, enabled: string) {
  if (enabled !== "true" && enabled !== "false") {
    throw new Error("Invalid enabled status");
  }
  const keyCollection = collection(firestore, API_KEY_COLLECTION);
  const apiKeyDoc = doc(keyCollection, email);
  await updateDoc(apiKeyDoc, { enabled: enabled === "true" });
  return enabled;
}

export async function createAPIKey(email: string) {
  if (!email || !/\@/.test(email)) {
    throw new Error("Invalid email address");
  }
  const apiKey = uuid();
  const keyCollection = collection(firestore, API_KEY_COLLECTION);
  const apiKeyDoc = doc(keyCollection, email);
  const apiKeyDocData = await getDoc(apiKeyDoc);
  if (apiKeyDocData.exists()) {
    return apiKeyDocData.data().apiKey as string;
  } else {
    await setDoc(apiKeyDoc, {
      apiKey,
      created: new Date(),
      enabled: true,
    });
    return apiKey;
  }
}
