import { NextFunction, Response, Request } from "express";
import { APIKeyHandler } from "./APIKeyHandler";
import {
  sendAndThrowShareLinkOrUnexpectedError,
  ShareLinkError,
  ShareLinkErrorCode,
} from "./error-handling";
import { firebaseApp } from "./init";
import { verifyIdToken } from "./utils";

const firestoreDb = firebaseApp.firestore();
const apiKeyHandler = new APIKeyHandler(firestoreDb);

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
  return apiKeyHandler
    .isValidKey(apiKey)
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
 * Middleware to verify that the request is authorized with a valid Firebase ID token.
 *
 * @param req Express request to check for authorization.
 * @param res Express response to interact with.
 * @param next Next function.
 */
export function isFirebaseAuthorized(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const idToken = req.get("Authorization")?.split("Bearer ")[1];
  verifyIdToken(idToken)
    .then(() => next())
    .catch((error) => {
      sendAndThrowShareLinkOrUnexpectedError(error, res);
    });
}
