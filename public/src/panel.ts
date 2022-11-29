import { QueryDocumentSnapshot } from "firebase/firestore";
import {
  checkLogin,
  createAPIKey,
  fetchAPIKeys,
  isProductionEnv,
  updateEnabledStatus,
} from "./firebase";

const failColor = "#f37e7c";
const successColor = "#7fc782";

window.addEventListener("DOMContentLoaded", async () => {
  // Check if user is logged in, redirect to login page if not.
  // All actual security is handled by Firestore rules.
  checkLogin();

  // Populate table with API keys and key info.
  const table = document.getElementById("api-key-table");
  const apiKeyDocs = await fetchAPIKeys();
  apiKeyDocs.forEach((doc) => {
    table.appendChild(createTableRow(doc));
  });

  // Handle API key creation form.
  const createAPIKeyButton = document.getElementById("register-key");
  createAPIKeyButton.addEventListener("submit", (e) => {
    submitApiKeyRegister(e);
  });

  // Add a label to display which project is in use.
  const projectLabel = document.getElementById("project-label");
  projectLabel.innerText = `act-now-links-${isProductionEnv ? "prod" : "dev"}`;
});

/** Create a table row for a given API key document*/
function createTableRow(apiDoc: QueryDocumentSnapshot) {
  // Create table cells
  const row = document.createElement("tr");
  const email = document.createElement("td");
  email.innerText = apiDoc.id;
  const apiKey = document.createElement("td");
  apiKey.innerText = apiDoc.get("apiKey");
  const creationDate = document.createElement("td");
  creationDate.innerText = getFormattedDate(apiDoc.get("created").toDate());
  const enabled = document.createElement("td");

  // Create dropdown for API key status
  const select = document.createElement("select");
  select.className = "form-select form-select-sm"; // Bootstrap styling
  select.onchange = () => {
    modifyApiKeyStatus(apiDoc, select);
  };
  const enabledOption = document.createElement("option");
  const disabledOption = document.createElement("option");
  enabledOption.innerText = "true";
  disabledOption.innerText = "false";
  select.appendChild(enabledOption);
  select.appendChild(disabledOption);
  enabled.appendChild(select);
  select.selectedIndex = apiDoc.get("enabled") ? 0 : 1;

  // Append cells to table row
  row.appendChild(email);
  row.appendChild(apiKey);
  row.appendChild(creationDate);
  row.appendChild(enabled);
  return row;
}

/** Submit email from form to API to create or fetch an API key. */
function submitApiKeyRegister(event: SubmitEvent) {
  event.preventDefault();
  const email = (document.getElementById("apiKeyName") as HTMLInputElement)
    .value;
  createAPIKey(email)
    .then((key) => {
      setApiResponseText(`Success! API key: ${key}`, successColor);
    })
    .catch(() => {
      setApiResponseText(
        "Internal Error, failed to create API key.",
        failColor
      );
    });
}

/** Update API key status and display results. */
function modifyApiKeyStatus(
  apiDoc: QueryDocumentSnapshot,
  select: HTMLSelectElement
) {
  updateEnabledStatus(apiDoc.id, select.value)
    .then((value) => {
      const msg = `Updated API key status for ${apiDoc.id} to ${value}`;
      setApiResponseText(msg, successColor);
    })
    .catch(() => {
      const msg = `Failed to update API key status for ${apiDoc.id}`;
      setApiResponseText(msg, failColor);
    });
}

/** Format JS date object to MM/DD/YYYY string */
function getFormattedDate(date: Date) {
  const year = date.getFullYear();
  const month = (1 + date.getMonth()).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return month + "/" + day + "/" + year;
}

/** Post outcome of Firebase interactions to the page. */
function setApiResponseText(text: string, color: string) {
  const apiResponseText = document.getElementById("api-response");
  apiResponseText.innerText = text;
  apiResponseText.style.backgroundColor = color;
}
