// Fetch a temporary ID Token for an authenticated user.
import fetch from "node-fetch";

// TODO: Would prefer to use google login auth to avoid having to enter passwords in the console.
const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.log("Usage: yarn generate-id-token.ts <email> <password>");
  process.exit(1);
}

// Firebase Web API key is public/non-confidential.
// TODO: Hardcoding to act-now-links-dev for now, but this should be configurable in the future.
const firebaseWebApiKey = "AIzaSyDRW6y_kxN51ZUNJr43y2Mgd6v8BLu-ih4";
fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  }
)
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    if (data.error) {
      throw new Error(data.error.message);
    }
    const token = data.idToken;
    const expiresIn = data.expiresIn / 3600;
    console.log(`ID token: ${token}`);
    console.log(`Expires in: ${expiresIn} hours`);
  })
  .catch((error) => {
    console.log(
      "Error while generating ID token. " +
        "Please check that email and password are correct and exist " +
        "in the act-now-links-dev project auth. \n"
    );
    console.log(error);
  });
