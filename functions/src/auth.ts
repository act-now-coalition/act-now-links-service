import { NextFunction, Response, Request } from "express";
import {
  sendAndThrowShareLinkOrUnexpectedError,
  ShareLinkError,
  ShareLinkErrorCode,
} from "./error-handling";
import { firebaseApp } from "./init";
import { APIFields } from "./utils";

const API_KEY_COLLECTION = "apiKeys";
const firestoreDb = firebaseApp.firestore();

/**
 * Middleware to verify that the request is authorized with an API key.
 *
 * @param req Express request to check for authorization.
 * @param res Express response to interact with.
 * @param next Next function.
 */
export function isAPIKeyAuthorized(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = (req.query.apiKey as string) || (req.body.apiKey as string);
  return isValidKey(apiKey)
    .then((isValid) => {
      if (isValid) {
        next();
      } else {
        throw new ShareLinkError(ShareLinkErrorCode.INVALID_API_KEY);
      }
    })
    .catch((error) => {
      sendAndThrowShareLinkOrUnexpectedError(error, res);
    });
}

/**
 * Verify given API key exists and is enabled.
 *
 * @param apiKey The API key to verify.
 * @returns True if the API key exists and is enabled, false otherwise.
 */
async function isValidKey(apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) return false;
  const apiKeyDoc = await firestoreDb
    .collection(API_KEY_COLLECTION)
    .where(APIFields.API_KEY, "==", apiKey)
    .get();
  if (apiKeyDoc.empty || !apiKeyDoc.docs[0].data().enabled) {
    return false;
  } else {
    return true;
  }
}
