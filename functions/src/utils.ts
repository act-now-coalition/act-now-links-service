import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as firebaseSettings from "../../firebase.json";

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
export const API_BASE_URL = isEmulator
  ? `localhost:${firebaseSettings.emulators.functions.port}/act-now-links-dev/us-central1/api`
  : "https://us-central1-act-now-links-dev.cloudfunctions.net/api";
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

/** Possible API response formats */
export enum ResponseType {
  JSON = "application/json",
  TEXT = "text/html",
}

/**
 * Fetch corresponding data for a given shortened url from Firestore.
 * Returns undefined if no document exists for the given id.
 *
 * Firestore urls collection is structured as records indexed by share link ID.
 *
 * @param documentId Share link ID for which to fetch data.
 * @returns Promise containing the data for the given share link ID.
 */
export async function getUrlDocumentDataById(
  documentId: string
): Promise<ShareLinkFields | undefined> {
  const db = admin.firestore();
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
 * Throws an error if no document exists for the given id.
 *
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
    throw new Error("No share link found");
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
    : crypto.randomBytes(4).toString("hex");
  console.log(`Hash generated: ${urlHash}`);
  return urlHash;
}

/** Determines whether a string is a valid URL.
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
