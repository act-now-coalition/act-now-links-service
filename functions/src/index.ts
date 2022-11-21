import * as functions from "firebase-functions";
import { Request, Response } from "firebase-functions";
import * as compression from "compression";
import * as express from "express";
import * as cors from "cors";
import { APIKeyHandler } from "./APIKeyHandler";
import { takeScreenshot } from "./screenshot";
import { isAPIKeyAuthorized, isFirebaseAuthorized } from "./auth";
import { firebaseApp } from "./init";
import {
  sendAndThrowUnexpectedError,
  sendAndThrowShareLinkOrUnexpectedError,
} from "./error-handling";
import {
  getUrlDocumentDataById,
  getUrlDocumentDataByIdStrict,
  createUniqueId,
  ShareLinkFields,
  SHARE_LINK_FIRESTORE_COLLECTION,
  API_BASE_URL,
  ShareLinksCollection,
} from "./utils";
import {
  validate,
  registerUrlValidationRules,
  createApiKeyValidationRules,
  modifyApiKeyValidationRules,
  queryUrlValidationRule,
} from "./validation";

const firestoreDb = firebaseApp.firestore();
// We have a number of optional fields associated with share links.
// We want Firestore to omit them if they're not specified.
firestoreDb.settings({ ignoreUndefinedProperties: true });
const urlCollection = firestoreDb.collection(SHARE_LINK_FIRESTORE_COLLECTION);
const apiKeyHandler = new APIKeyHandler(firestoreDb);
const app = express();
app.use(cors({ origin: "*" }));
app.use(compression());
// TODO: Add minInstances: 1 to prevent/limit cold starts once this is used in production.
// See: https://firebase.google.com/docs/functions/manage-functions#min-max-instances
const runtimeOpts: functions.RuntimeOptions = {
  timeoutSeconds: 90,
  memory: "2GB", // Increasing this for CPU reasons (to increase screenshot speed) not memory reasons.
};
export const api = functions.runWith(runtimeOpts).https.onRequest(app);

/**
 * Register a new share link.
 *
 * If a URL is already registered for the given parameters, the existing
 * share link is returned.
 *
 * Requires a `content-type: application/json` header and a JSON body with the following parameters:
 *  - url: string
 *  - imageUrl?: string
 *  - title?: string
 *  - description?: string
 */
app.post(
  "/registerUrl",
  isAPIKeyAuthorized,
  registerUrlValidationRules(),
  validate,
  (req: Request, res: Response<any>) => {
    const data: ShareLinkFields = {
      url: req.body.url,
      imageUrl: req.body.imageUrl,
      title: req.body.title,
      description: req.body.description,
      imageHeight: req.body.imageHeight,
      imageWidth: req.body.imageWidth,
    };
    // `JSON.stringify(data)` should be deterministic in this case.
    // See https://stackoverflow.com/a/43049877
    const documentId = createUniqueId(JSON.stringify(data));
    getUrlDocumentDataById(documentId)
      .then((response) => {
        // If no share link is found for the given params create a new one.
        if (response === undefined) {
          return urlCollection.doc(documentId).set(data);
        }
        return;
      })
      .then(() => {
        res.status(200).send({ url: `${API_BASE_URL}/go/${documentId}` });
      })
      .catch((error: Error) => {
        sendAndThrowShareLinkOrUnexpectedError(error, res);
      });
  }
);

/**
 * Redirects share link url to original url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/SHORT_URL_HERE
 */
app.get("/go/:id", (req, res) => {
  const documentId = req.params.id;
  getUrlDocumentDataByIdStrict(documentId)
    .then((data) => {
      const fullUrl = data.url;
      const title = data.title ?? "";
      const description = data.description ?? "";
      const image = data.imageUrl;
      const imgHeight = data.imageHeight;
      const imageWidth = data.imageWidth;
      // TODO need to make sure that http-equiv="Refresh" actually allows us to track clicks/get
      // analytics. See discussion on redirect methods here: https://stackoverflow.com/a/1562539/14034347
      res.status(200).send(
        `<!doctype html>
          <head>
            <meta http-equiv="Refresh" content="0; url='${fullUrl}'" />
            <meta property="og:url" content url="${fullUrl}"/>
            <meta property="og:title" content="${title}"/>
            <meta property="og:description" content="${description}"/>
            <meta name="twitter:card" content="summary_large_image" />
            <meta property="twitter:title" content="${title}"/>
            <meta property="twitter:description" content="${description}"/>
            ${
              image
                ? `<meta property="og:image" content="${image}" />
              <meta property="twitter:image" content="${image}"/>`
                : ""
            }
            ${
              imgHeight
                ? `<meta property="og:image:height" content="${imgHeight}" />`
                : ""
            }
            ${
              imageWidth
                ? `<meta property="og:image:width" content="${imageWidth}" />`
                : ""
            }
          </head>
        </html>`
      );
    })
    .catch((error: Error) => {
      sendAndThrowShareLinkOrUnexpectedError(error, res);
    });
});

/**
 * Takes a screenshot of the given url and returns the file.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/screenshot?url=URL_HERE
 *
 * The target URL must contain divs with 'screenshot' and 'screenshot-ready' classes
 * to indicate where and when the screenshot is ready to be taken.
 *
 * e.g.
 * ```html
 *  <div class="screenshot">
 *    <div class="screenshot-ready">
 *      {content to screenshot}
 *    </div>
 *  </div>
 * ```
 */
app.get(
  "/screenshot",
  queryUrlValidationRule(),
  validate,
  (req: Request, res: Response) => {
    const screenshotUrl = req.query.url as string;

    // We might have issues with collisions if multiple screenshots are taken at the same time.
    // TODO: Use a unique filename for each screenshot, then delete the file after it's sent?
    takeScreenshot(screenshotUrl, "temp")
      .then((file: string) => {
        // Let the CDN and the browser cache for 24hrs.
        // For testing you can specify ?no-cache to bypass caching.
        if (req.query["no-cache"] === undefined) {
          res.header("cache-control", "public, max-age=86400");
        }
        res.sendFile(file);
      })
      .catch((error: Error) => {
        sendAndThrowUnexpectedError(error, res);
      });
  }
);

/**
 * Retrieves all share links for the supplied url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/shareLinksByUrl?url=URL_HERE
 *
 */
app.get(
  "/shareLinksByUrl",
  queryUrlValidationRule(),
  validate,
  (req: Request, res: Response) => {
    const url = req.query.url as string;
    firestoreDb
      .collection(SHARE_LINK_FIRESTORE_COLLECTION)
      .where(ShareLinksCollection.URL, "==", url)
      .get()
      .then((querySnapshot) => {
        const shareLinks: { [shareLink: string]: ShareLinkFields } = {};
        querySnapshot.docs.forEach(
          (doc) =>
            (shareLinks[`${API_BASE_URL}/go/${doc.id}`] =
              doc.data() as ShareLinkFields)
        );
        res.status(200).send({ urls: shareLinks });
      })
      .catch((error: Error) => {
        sendAndThrowUnexpectedError(error, res);
      });
  }
);

/**
 * Create an API key for the given email.
 *
 * If an API key already exists for the given email it will be returned.
 *
 * Requires Bearer authorization token with a valid Firebase ID token.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/createApiKey?email=EMAIL_HERE
 */
app.post(
  "/auth/createApiKey",
  isFirebaseAuthorized,
  createApiKeyValidationRules(),
  validate,
  (req: Request, res: Response) => {
    return apiKeyHandler
      .createKey(req.body.email as string)
      .then((apiKey) => {
        res.status(200).send({ apiKey });
      })
      .catch((error: Error) => {
        sendAndThrowShareLinkOrUnexpectedError(error, res);
      });
  }
);

/**
 * Disable or enable API key for the given email.
 *
 * Requires Bearer authorization token with a valid Firebase ID token.
 *
 * Requires a `content-type: application/json` header and a JSON body with the following parameters:
 *  - email: string
 *  - enabled: string
 *
 * When enabled is set to "true" the API key will be enabled,
 * if set to "false" the API key will be disabled.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/modifyApiKey
 */
app.post(
  "/auth/modifyApiKey",
  isFirebaseAuthorized,
  modifyApiKeyValidationRules(),
  validate,
  (req: Request, res: Response) => {
    const enabled = req.body.enabled;
    apiKeyHandler
      .modifyKey(req.body.email as string, enabled)
      .then((enabled) => {
        res.status(200).send(`Success. API key status set to ${enabled}`);
      })
      .catch((error) => {
        sendAndThrowShareLinkOrUnexpectedError(error, res);
      });
  }
);
