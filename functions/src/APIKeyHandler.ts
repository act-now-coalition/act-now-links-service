import { randomUUID } from "crypto";
import { ShareLinkError, ShareLinkErrorCode } from "./error-handling";

const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const API_KEY_COLLECTION = "apiKeys";

/** Class for creating and handling API keys.*/
export class APIKeyHandler {
  /** Construct a new APIKeyHandler.
   *
   * @param firestoreInstance Firestore instance to interact with.
   */
  constructor(readonly firestoreInstance: FirebaseFirestore.Firestore) {}

  /** Create and store a new API key, or return the existing one.
   *
   * @param email The email address to associate with the key.
   * @returns The API key.
   */
  async createKey(email: string) {
    if (!EMAIL_REGEX.test(email)) {
      throw new ShareLinkError(ShareLinkErrorCode.INVALID_EMAIL);
    }
    const apiKey = randomUUID();
    const apiKeyDoc = this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .doc(email);
    const apiKeyDocData = await apiKeyDoc.get();
    if (apiKeyDocData.exists) {
      return apiKey;
    } else {
      await apiKeyDoc.set({
        apiKey,
        created: new Date(),
        enabled: true,
      });
      return apiKey;
    }
  }

  /** Verify given API key exists
   *
   * @param apiKey The API key to verify.
   * @returns True if the API key exists, false otherwise.
   */
  async isValidKey(apiKey: string | undefined) {
    if (!apiKey) return false;
    const apiKeyDoc = await this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .where("apiKey", "==", apiKey)
      .get();
    if (apiKeyDoc.empty || !apiKeyDoc.docs[0].data().enabled) {
      return false;
    } else {
      return true;
    }
  }

  /** Fetch the API key for given email.
   *
   * @param email The email address to fetch the key for.
   * @returns The API key.
   */
  async getKey(email: string) {
    if (!EMAIL_REGEX.test(email)) {
      throw new ShareLinkError(ShareLinkErrorCode.INVALID_EMAIL);
    }
    const emailDoc = await this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .doc(email)
      .get();
    if (!emailDoc.exists) {
      throw new ShareLinkError(ShareLinkErrorCode.EMAIL_NOT_FOUND);
    } else {
      return emailDoc.data()?.apiKey as string;
    }
  }

  /** Disable or enable API key for given email.
   *
   * @param apiKey The API key to enable or disable.
   * @param enabled True to enable, false to disable.
   */
  async toggleKey(email: string, enabled: boolean) {
    if (!EMAIL_REGEX.test(email)) {
      throw new ShareLinkError(ShareLinkErrorCode.INVALID_EMAIL);
    }
    const apiKeyDoc = this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .doc(email);
    const apiKeyDocData = await apiKeyDoc.get();
    if (apiKeyDocData.exists) {
      await apiKeyDoc.update({ enabled: enabled });
      return true;
    } else {
      throw new Error(`No API key found for ${email}`);
    }
  }
}
