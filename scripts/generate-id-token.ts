// Fetch a temporary ID Token for an authenticated user.
import fetch from "node-fetch";

// TODO: Would prefer to use google login auth to avoid having to enter passwords in the console.
const email = process.argv[2];
const password = process.argv[3];
const projectId = process.argv[4];
if (!email || !password) {
  console.error(
    "Usage: yarn generate-id-token.ts <email> <password> <projectId>"
  );
  process.exit(1);
}
if (!["develop", "production"].includes(projectId)) {
  console.error("projectId must be 'develop' or 'production'");
  process.exit(1);
}

// Firebase Web API key is public/non-confidential.
const firebaseWebApiKey =
  projectId === "develop"
    ? "AIzaSyDRW6y_kxN51ZUNJr43y2Mgd6v8BLu-ih4"
    : "AIzaSyBbve3kWHp3b8izyph0puHaPdCLOfkJNww";

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
    console.log(`Expires in: ${expiresIn} hour(s)`);
  })
  .catch((error) => {
    const aliasMap = {
      "develop": "act-now-links-dev",
      "production": "act-now-links-prod",
    }
    console.error(
      "Error while generating ID token. " +
        "Please check that email and password are correct and exist " +
        `in the ${aliasMap[projectId]} project authentication app. \n`
    );
    console.error(error);
  });
