import { TEST_PAYLOAD } from "./utils";
import * as admin from "firebase-admin";
import { createUniqueId, SHARE_LINK_FIRESTORE_COLLECTION } from "../utils";

// Test setup run before all tests.
module.exports = async () => {
  console.log("Setting up tests...");
  if (!process.env.FUNCTIONS_EMULATOR) {
    throw new Error("Test suite must be run with the Firebase emulator.");
  }
  // Manually "register" one share link to test against.
  admin.initializeApp();
  const documentId = createUniqueId(JSON.stringify(TEST_PAYLOAD));
  const db = admin.firestore();
  await db
    .collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .doc(documentId)
    .set(TEST_PAYLOAD);
  console.log("Test setup complete!");
};
