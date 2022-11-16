import * as crypto from "crypto";
import * as firebaseSettings from "../../firebase.json";
import { firebaseApp } from "./init";
import { ShareLinkError, ShareLinkErrorCode } from "./error-handling";

const localFunctionsPort = firebaseSettings.emulators.functions.port;
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
const firebaseConfig = process.env.FIREBASE_CONFIG
  ? JSON.parse(process.env.FIREBASE_CONFIG)
  : undefined;
// When using `firebase emulators:exec` for testing, firebaseConfig
// is undefined, so use the dev project as a fallback.
const firebaseProjectId = firebaseConfig?.projectId ?? "act-now-links-dev";
// Subdomains of actnowcoalition.org are configured in the Firebase console for each project.
const subDomain =
  firebaseProjectId === "act-now-links-prod" ? "share" : "share-dev";
export const API_BASE_URL = isEmulator
  ? `http://localhost:${localFunctionsPort}/${firebaseProjectId}/us-central1/api`
  : `${subDomain}.actnowcoalition.org`;

export const SHARE_LINK_FIRESTORE_COLLECTION = "share-links";

/** Request body parameters for /registerUrl API calls. */
export type ShareLinkFields = {
  url: string;
  imageUrl?: string;
  title?: string;
  description?: string;
};

/** Fields found in the firestore share-links collection.  */
export enum ShareLinksCollection {
  URL = "url",
  IMAGE_URL = "imageUrl",
  TITLE = "title",
  DESCRIPTION = "description",
}

/**
 * Fetch corresponding data for a given shortened url from Firestore.
 *
 * Returns undefined if no document exists for the given id.
 * Firestore urls collection is structured as records indexed by share link ID.
 *
 * @param documentId Share link ID for which to fetch data.
 * @returns Promise containing the data for the given share link ID.
 */
export async function getUrlDocumentDataById(
  documentId: string
): Promise<ShareLinkFields | undefined> {
  const db = firebaseApp.firestore();
  const querySnapshot = await db
    .collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .doc(documentId)
    .get();
  if (!querySnapshot.exists) {
    return undefined;
  } else {
    return querySnapshot.data() as ShareLinkFields;
  }
}

/**
 * Fetch corresponding data for a given shortened url from Firestore.
 *
 * Throws an error if no document exists for the given id.
 * Firestore urls collection is structured as records indexed by share link ID.
 *
 * @param documentId Share link ID for which to fetch data.
 * @returns Promise containing the data for the given share link ID.
 */
export async function getUrlDocumentDataByIdStrict(
  documentId: string
): Promise<ShareLinkFields> {
  const data = await getUrlDocumentDataById(documentId);
  if (!data) {
    throw new ShareLinkError(ShareLinkErrorCode.URL_NOT_FOUND);
  } else {
    return data;
  }
}

/**
 * Creates a unique id for a document in a given collection.
 *
 * @param seed String to use as the seed for the unique id.
 * @returns Eight digit unique id.
 */
export function createUniqueId(seed?: string): string {
  const urlHash = seed
    ? crypto
        .createHash("sha256")
        .update(seed, "utf8")
        .digest("base64url")
        .slice(0, 8)
    : crypto.randomBytes(6).toString("base64url");
  return urlHash;
}

/**
 * Determines whether a string is a valid URL.
 *
 * @param urlString String to validate.
 * @returns True if the string is a valid URL, false otherwise.
 */
export function isValidUrl(urlString: string | undefined): boolean {
  if (!urlString) {
    return false;
  }
  let url;
  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Verify a Firebase ID token is valid.
 *
 * @param token Firebase ID token to verify.
 * @returns True if the token is valid, throws an error otherwise.
 */
export async function verifyIdToken(token: string | undefined) {
  if (!token) {
    throw new ShareLinkError(ShareLinkErrorCode.INVALID_TOKEN);
  }
  return firebaseApp
    .auth()
    .verifyIdToken(token)
    .then(() => true)
    .catch((error) => {
      console.error(error);
      throw new ShareLinkError(ShareLinkErrorCode.INVALID_TOKEN);
    });
}
