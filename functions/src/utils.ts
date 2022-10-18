import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as firebaseSettings from "../../firebase.json";

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
export const API_BASE_URL = isEmulator
  ? `localhost:${firebaseSettings.emulators.functions.port}/act-now-links-dev/us-central1/api`
  : "https://us-central1-act-now-links-dev.cloudfunctions.net/api";
export const SHARE_LINK_FIRESTORE_COLLECTION = "share-links";

/** Request body parameters for /registerUrl API calls. */
export type ShareLinkRegisterParams = {
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
 * Used as the result of a function call in order to help propagate errors:
 *
 * Data and error are mutually exclusive, data should be set with
 * the expected data if the function succeeded, error should be set if the function failed.
 */
interface DataOrError<T> {
  data?: T | undefined;
  error?: string | undefined;
}

/**
 * Fetch corresponding data for a given shortened url from Firestore.
 *
 * Firestore urls collection is structured as records indexed by the shortened url.
 *
 * @param documentId Shortened url for which to fetch data.
 * @returns Promise containing the data for the given short url.
 */
export async function getUrlDocumentDataById(
  documentId: string
): Promise<DataOrError<ShareLinkRegisterParams>> {
  const db = admin.firestore();
  const querySnapshot = await db
    .collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .doc(documentId)
    .get();
  if (!querySnapshot.exists) {
    return {
      data: undefined,
      error: `Share link with id ${documentId} does not exist`,
    };
  }
  const data = querySnapshot.data() as ShareLinkRegisterParams;
  return { data: data, error: undefined };
}

/**
 * Creates a unique id for a document in a given collection.
 *
 * @param seed String to use as the seed for the unique id.
 * @returns Eight digit unique id.
 */
export function createUniqueId(
  seed?: string
): string {
  const urlHash = seed
    ? crypto.createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 8)
    : crypto.randomBytes(4).toString("hex");
  console.log(`Hash generated: ${urlHash}`);
  return urlHash;
}

/** Decode a base64-encoded string.
 * 
 * Helper function to replace the deprecated atob() function.
 * 
 * @param encodedStr Base64-encoded string to decode.
*/
export function decodeBase64String(encodedStr: string): string {
  return Buffer.from(encodedStr, "base64").toString("ascii");
}