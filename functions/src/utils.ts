import * as crypto from "crypto";
import * as admin from "firebase-admin";

export const API_BASE_URL = "https://us-central1-act-now-links-dev.cloudfunctions.net/api";
export const SHARE_LINK_FIRESTORE_COLLECTION = "share-links";

export type UrlData = {
  url: string;
  imageUrl?: string;
  title?: string;
  description?: string;
};

/**
 * Fetch corresponding data for a given shortened url from Firestore.
 *
 * Firestore urls collection is structured as records indexed by the shortened url.
 *
 * @param documentId Shortened url for which to fetch data.
 * @returns Promise containing the data for the given short url.
 */
export async function getUrlDocumentDataById(documentId: string) {
  const db = admin.firestore();
  const querySnapshot = await db
    .collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .doc(documentId)
    .get();
  if (!querySnapshot.exists) {
    throw new Error(`Document with id ${documentId} doesn't exist`);
  }
  return querySnapshot.data() as UrlData;
}

/**
 * Creates a unique id for a document in a given collection.
 * 
 * @param collection Firestore collection to check for uniqueness
 * @returns 
 */
export async function createUniqueId(
  collection: admin.firestore.CollectionReference
): Promise<string> {
  const urlHash = crypto.randomBytes(5).toString("hex");
  const documentWithHash = await collection.doc(urlHash).get();
  if (documentWithHash.exists) {
    console.log("Hash collision. Generating new hash.");
    return createUniqueId(collection);
  } else {
    console.log(`Hash generated: ${urlHash}`);
    return urlHash;
  }
}

export function stripUrlProtocol(url: string): string {
  return url.replace(/^https?:\/\/?/, "").replace(/\//g, "");
}