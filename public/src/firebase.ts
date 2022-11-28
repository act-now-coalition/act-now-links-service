import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import {
  getDocs,
  getFirestore,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";

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

const firebaseApp = initializeApp(productionConfig);
const auth = getAuth(firebaseApp);

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
      const body = document.querySelector("body");
      const message = document.createElement("div");
      message.innerHTML = `
            <div id="error">
              <h2>Error</h2>
              <h1>${error.message}</h1>
            </div>
          `;
      body?.prepend(message);
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
  const db = getFirestore();
  const querySnapshot = await getDocs(collection(db, "apiKeys"));
  return querySnapshot.docs
}

export async function updateEnabledStatus(email: string, enabled: string) {
  const token = await auth.currentUser.getIdToken();
  return fetch("https://share.actnowcoalition.org/auth/modifyApiKey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, enabled: enabled === "true" }),
  });
}

export async function createAPIKey(email: string) {
  const token = auth.currentUser.getIdToken();
  return fetch("https://share.actnowcoalition.org/auth/createApiKey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });
}
