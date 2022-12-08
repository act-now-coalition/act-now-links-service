import { handleLogin } from "./firebase";

window.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("login-button");
  loginButton?.addEventListener("click", () => handleLogin());
});
