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
  SHARE_LINK_KEY = "shareLinkKey",
}

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
 * @param collection Firestore collection to check for uniqueness
 * @returns
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
