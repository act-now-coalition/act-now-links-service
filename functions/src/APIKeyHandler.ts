import { randomUUID } from "crypto";
import { ShareLinkError, ShareLinkErrorCode } from "./error-handling";
import { APIFields } from "./utils";

const EMAIL_REGEX = /@/; // Very permissive, allow any string with an @ symbol.
export const API_KEY_COLLECTION = "apiKeys";

/** Class for creating and handling API keys.*/
export class APIKeyHandler {
  /**
   * Construct a new APIKeyHandler.
   *
   * @param firestoreInstance Firestore instance to interact with.
   */
  constructor(readonly firestoreInstance: FirebaseFirestore.Firestore) {}

  /**
   * Create and store a new API key, or return the existing one.
   *
   * @param email The email address to associate with the key.
   * @returns The API key.
   */
  async createKey(email: string): Promise<string> {
    if (!EMAIL_REGEX.test(email)) {
      throw new ShareLinkError(ShareLinkErrorCode.INVALID_EMAIL);
    }
    const apiKey = randomUUID();
    const apiKeyDoc = this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .doc(email);
    const apiKeyDocData = await apiKeyDoc.get();
    if (apiKeyDocData.exists) {
      return apiKeyDocData.data()?.apiKey as string;
    } else {
      await apiKeyDoc.set({
        apiKey,
        created: new Date(),
        enabled: true,
      });
      return apiKey;
    }
  }

  /**
   * Verify given API key exists and is enabled.
   *
   * @param apiKey The API key to verify.
   * @returns True if the API key exists and is enabled, false otherwise.
   */
  async isValidKey(apiKey: string | undefined): Promise<boolean> {
    if (!apiKey) return false;
    const apiKeyDoc = await this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .where(APIFields.API_KEY, "==", apiKey)
      .get();
    if (apiKeyDoc.empty || !apiKeyDoc.docs[0].data().enabled) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Disable or enable API key for given email.
   *
   * @param email The email of the API key to enable or disable.
   * @param enabled True to enable, false to disable.
   * @returns True if key is enabled, false if disabled.
   */
  async modifyKey(email: string, enabled: boolean): Promise<boolean> {
    const apiKeyDoc = this.firestoreInstance
      .collection(API_KEY_COLLECTION)
      .doc(email);
    const apiKeyDocData = await apiKeyDoc.get();
    if (apiKeyDocData.exists) {
      await apiKeyDoc.update({ enabled: enabled });
      return enabled;
    } else {
      throw new ShareLinkError(ShareLinkErrorCode.EMAIL_NOT_FOUND);
    }
  }
}
