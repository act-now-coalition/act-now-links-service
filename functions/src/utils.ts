import { takeScreenshot } from "./screenshot";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { UrlData } from "./types";

const storageBucket = "test-url-api-images";

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
  const querySnapshot = await db.collection("urls").doc(documentId).get();
  if (!querySnapshot.exists) {
    throw new Error(`Document with id ${documentId} doesn't exist`);
  }
  return querySnapshot.data() as UrlData;
}

/**
 * Take screenshot of given url, upload screenshot to storage, and return the url.
 *
 * @param url url to screenshot
 * @param filename name of file to store in storage
 * @returns url of screenshot in storage
 */
export async function takeAndUploadScreenshot(url: string, filename: string) {
  const screenshot = await takeScreenshot(url, filename);
  const bucket = admin.storage().bucket(storageBucket);
  return bucket
    .upload(screenshot, { predefinedAcl: "publicRead" })
    .then(() => {
      return `https://storage.googleapis.com/test-url-api-images/${filename}.png`;
    })
    .catch(() => {
      console.log("Error uploading screenshot to storage.");
    });
}

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
