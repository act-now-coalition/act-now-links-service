import {
  body,
  query,
  ValidationError,
  validationResult,
} from "express-validator";
import { NextFunction, Request, Response } from "express";
import { APIFields, isValidUrl, ShareLinksCollection } from "./utils";
import {
  getShareLinkErrorByCode,
  sendAndThrowShareLinkErrorCode,
  ShareLinkErrorCode,
} from "./error-handling";
import * as functions from "firebase-functions";

export function registerUrlValidationRules() {
  return [
    // Use a custom URL validator b/c we need to ensure an HTTP(S) protocol is
    // present for use in the /go/ endpoint.
    body(ShareLinksCollection.URL).custom(isValidUrl),
    body(ShareLinksCollection.IMAGE_URL).optional().custom(isValidUrl),
    body(ShareLinksCollection.TITLE).optional().isString(),
    body(ShareLinksCollection.DESCRIPTION).optional().isString(),
    body(ShareLinksCollection.IMAGE_HEIGHT).optional().isInt(),
    body(ShareLinksCollection.IMAGE_WIDTH).optional().isInt(),
  ];
}

export function createApiKeyValidationRules() {
  return [body(APIFields.EMAIL).isEmail()];
}

export function modifyApiKeyValidationRules() {
  return [body(APIFields.EMAIL).isEmail(), body(APIFields.ENABLED).isBoolean()];
}

export function queryUrlValidationRule() {
  return [query(ShareLinksCollection.URL).custom(isValidUrl)];
}

export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const error = errors.array()[0]; // Just handle the first error if there are multiple.
  return validationToShareLinkError(res, error);
}

function validationToShareLinkError(
  res: functions.Response,
  error: ValidationError
) {
  switch (error.param) {
    case ShareLinksCollection.URL:
      return sendAndThrowShareLinkErrorCode(
        ShareLinkErrorCode.INVALID_URL,
        res
      );
    case ShareLinksCollection.IMAGE_URL:
      return sendAndThrowShareLinkErrorCode(
        ShareLinkErrorCode.INVALID_URL,
        res
      );
    case APIFields.EMAIL:
      return sendAndThrowShareLinkErrorCode(
        ShareLinkErrorCode.INVALID_EMAIL,
        res
      );
    default:
      const msg = `${error.msg}. ${error.param}: ${error.value}`;
      const validationError = getShareLinkErrorByCode(
        ShareLinkErrorCode.VALIDATION_ERROR
      );
      // override the default error message with the more specific one.
      return res.status(validationError.httpCode).send(msg);
  }
}
