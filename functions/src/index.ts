import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import {
  getUrlDocumentDataById,
  getUrlDocumentDataByIdStrict,
  createUniqueId,
  ShareLinkFields,
  SHARE_LINK_FIRESTORE_COLLECTION,
  API_BASE_URL,
  ShareLinksCollection,
  isValidUrl,
} from "./utils";
import { takeScreenshot } from "./screenshot";
import {
  ShareLinkError,
  sendAndThrowUnexpectedError,
  sendAndThrowInvalidUrlError,
} from "./error-handling";

admin.initializeApp();
const firestoreDb = admin.firestore();
const urlCollection = firestoreDb.collection(SHARE_LINK_FIRESTORE_COLLECTION);
const app = express();
app.use(cors({ origin: "*" }));
const runtimeOpts = {
  timeoutSeconds: 90,
  memory: "1GB" as "1GB",
};
exports.api = functions.runWith(runtimeOpts).https.onRequest(app);

/**
 * Register a new share link. If a URL is already registered for the given parameters, the existing
 * share link is returned.
 *
 * Requires a `content-type: application/json` header and a JSON body with the following parameters:
 *  - url: string
 *  - imageUrl?: string
 *  - title?: string
 *  - description?: string
 */
app.post("/registerUrl", (req, res) => {
  if (!isValidUrl(req.body.url)) {
    sendAndThrowInvalidUrlError(res, req.body.url);
  }

  // TODO: Better way to handle missing data than coercing to empty strings?
  const data: ShareLinkFields = {
    url: req.body.url,
    imageUrl: req.body.imageUrl ?? "",
    title: req.body.title ?? "",
    description: req.body.description ?? "",
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
      sendAndThrowUnexpectedError(error, res);
    });
});

/**
 * Redirects share link url to original url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/SHORT_URL_HERE
 */
app.get("/go/:id", (req, res) => {
  const documentId = req.params.id;
  if (!documentId || documentId.length === 0) {
    sendAndThrowInvalidUrlError(res);
  }

  getUrlDocumentDataByIdStrict(documentId)
    .then((data) => {
      const fullUrl = data.url;
      const image = data.imageUrl ?? "";
      const title = data.title ?? "";
      const description = data.description ?? "";
      // TODO need to make sure that http-equiv="Refresh" actually allows us to track clicks/get
      // analytics. See discussion on redirect methods here: https://stackoverflow.com/a/1562539/14034347
      res.status(200).send(
        `<!doctype html>
          <head>
            <meta http-equiv="Refresh" content="0; url='${fullUrl}'" />
            <meta property="og:url" content url="${fullUrl}"/>
            <meta property="og:title" content="${title}"/>
            <meta property="og:description" content="${description}"/>
            <meta property="og:image" content="${image}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta property="twitter:title" content="${title}"/>
            <meta property="twitter:description" content="${description}"/>
            <meta property="twitter:image" content="${image}"/>
          </head>
        </html>`
      );
    })
    .catch((error: Error) => {
      if (error instanceof ShareLinkError) {
        const url = `${API_BASE_URL}/go/${documentId}`;
        res.status(error.httpCode).send(`${error.message} URL: ${url}`);
        throw error;
      } else {
        sendAndThrowUnexpectedError(error, res);
      }
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
app.get("/screenshot", (req, res) => {
  const screenshotUrl = req.query.url as string;
  if (!isValidUrl(screenshotUrl)) {
    sendAndThrowInvalidUrlError(res, screenshotUrl);
  }
  // We might have issues with collisions if multiple screenshots are taken at the same time.
  // TODO: Use a unique filename for each screenshot, then delete the file after it's sent?
  takeScreenshot(screenshotUrl, "temp")
    .then((file: string) => {
      console.log("screenshot generated.");
      // Let the CDN and the browser cache for 24hrs.
      console.log("Setting cache-control header.");
      res.header("cache-control", "public, max-age=86400");

      res.sendFile(file);
    })
    .catch((error: Error) => {
      sendAndThrowUnexpectedError(error, res);
    });
});

/**
 * Retrieves all share links for the supplied url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/shareLinksByUrl?url=URL_HERE
 *
 */
app.get("/shareLinksByUrl", (req, res) => {
  const url = req.query.url as string;
  if (!isValidUrl(url)) {
    sendAndThrowInvalidUrlError(res, url);
  }
  firestoreDb
    .collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .where(ShareLinksCollection.URL, "==", url)
    .get()
    .then((querySnapshot) => {
      const shareLinks: { [shareLink: string]: ShareLinkFields } = {};
      querySnapshot.docs.forEach(
        (doc) =>
          (shareLinks[`${API_BASE_URL}/${doc.id}`] =
            doc.data() as ShareLinkFields)
      );
      res.status(200).send({ urls: shareLinks });
    })
    .catch((error: Error) => {
      sendAndThrowUnexpectedError(error, res);
    });
});
