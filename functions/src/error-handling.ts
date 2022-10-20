import { randomUUID } from "crypto";
import { Response } from "firebase-functions";
import { ResponseType } from "./utils";

const SHARE_LINK_ERRORS = {
  400: "Invalid Request.",
  404: "Not Found.",
  500: "Internal API Failure.",
};
type ShareLinkErrorCode = keyof typeof SHARE_LINK_ERRORS;

/**
 * Custom error handling class for share link API errors to log errors internally
 * and send a user-friendly error message to the client.
 *
 * @param code HTTP status code for the error.
 * @param response Firebase functions response to send external error to.
 * @param external Error message to send to the client. Message should not include error code.
 * @param internal Error or error message to log to the console. If not provided, externalMessage is used.
 * @param responseType Response type to send to the client. Defaults to text/html.
 */
export class ShareLinkError extends Error {
  constructor(
    errorCode: ShareLinkErrorCode,
    response: Response<unknown>,
    external: string,
    internal?: string | Error,
    responseType: ResponseType = ResponseType.TEXT
  ) {
    const errorId = randomUUID();
    const errorIdText = `If this continues, please reach out to us and reference error ID ${errorId}.`;

    // Only send the errorId to the client if it's an internal server error.
    const isServerError = Math.floor(errorCode / 100) * 100 === 500;
    const externalMessage =
      `Error ${errorCode}: ${SHARE_LINK_ERRORS[errorCode]} ` +
      `${external} ${isServerError ? errorIdText : ""}`;

    response
      .status(errorCode)
      .send(formatMessage(externalMessage, responseType));
    super(`Error ID: ${errorId}. ${internal ?? external}`);
  }
}

function formatMessage(message: string, responseType: ResponseType) {
  switch (responseType) {
    case ResponseType.JSON:
      return { error: message };
    case ResponseType.TEXT:
      return message;
    default:
      throw new Error(`Invalid response type: ${responseType}`);
  }
}
