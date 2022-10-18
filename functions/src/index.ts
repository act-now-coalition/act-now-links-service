import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import {
  getUrlDocumentDataById,
  createUniqueId,
  ShareLinkRegisterParams,
  SHARE_LINK_FIRESTORE_COLLECTION,
  API_BASE_URL,
  ShareLinksCollection,
  decodeBase64String,
} from "./utils";
import { takeScreenshot } from "./screenshot";

admin.initializeApp();
const firestoreDb = admin.firestore();
const app = express();
app.use(cors({ origin: "*" }));
const runtimeOpts = {
  timeoutSeconds: 90,
  memory: "1GB" as "1GB", // idk why this casting is necessary?
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
app.post("/registerUrl", async (req, res) => {
  if (!req.body.url) {
    res.status(400).send("Missing url argument.");
    return;
  }
  // TODO: Better way to handle missing data than coercing to empty strings?
  const data: ShareLinkRegisterParams = {
    url: req.body.url,
    imageUrl: req.body.imageUrl ?? "",
    title: req.body.title ?? "",
    description: req.body.description ?? "",
  };
  // Using `JSON.stringify(data)` should be deterministic in this case. 
  // See https://stackoverflow.com/a/43049877
  const documentId = createUniqueId(JSON.stringify(data));

  const urlCollection = firestoreDb.collection(SHARE_LINK_FIRESTORE_COLLECTION);
  urlCollection
    .doc(documentId)
    .get()
    .then((existingDocument) => {
      // Return existing document if one already exists for the specified params.
      if (existingDocument.exists) {
        res.status(200).send({ url: `${API_BASE_URL}/${existingDocument.id}` });
      } else {
        urlCollection
          .doc(documentId)
          .set(data)
          .then(() => {
            res.status(200).send({ url: `${API_BASE_URL}/${documentId}` });
          })
          .catch((err) => {
            res.status(500).send(`error ${JSON.stringify(err)}`);
          });
      }
    });
});

/**
 * Redirects share link url to original url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/SHORT_URL_HERE
 */
app.get("/:id", (req, res) => {
  const shortUrl = req.params.id;
  if (!shortUrl || shortUrl.length === 0) {
    const errorMsg =
      "Missing URL parameter. " +
      "Expected structure: https://<...>.net/api/SHORT_URL_HERE";
    res.status(400).send(errorMsg);
    return;
  }

  getUrlDocumentDataById(shortUrl)
    .then((response) => {
      if (response.data) {
        const data = response.data;
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
      } else {
        res.status(404).send(response.error);
      }
    })
    .catch(() => {
      res.status(500).send(`Internal Error`);
    });
});

/**
 * Takes a screenshot of the given url and returns the file.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/screenshot/URL_HERE
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
app.get("/screenshot/:url", async (req, res) => {
  const screenshotUrl = decodeBase64String(req.params.url);
  if (!screenshotUrl || screenshotUrl.length === 0) {
    const errorMsg =
      `Missing url query parameter.` +
      `Expected structure: https://<...>.net/api/screenshot/URL_HERE`;
    res.status(400).send(errorMsg);
    return;
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
    .catch((error) => {
      console.error("Error", error);
      res
        .status(500)
        .send(
          `<html>Image temporarily not available. Try again later.<br/>Error<br />${error}</html>`
        );
    });
});

/**
 * Retrieves all the share links that exist for a given url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/getShareLinkUrl/URL_HERE
 *
 */
app.get("/shareLinksByUrl/:url", (req, res) => {
  const url = decodeBase64String(req.params.url);
  firestoreDb
    .collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .where(ShareLinksCollection.URL, "==", url)
    .get()
    .then((querySnapshot) => {
      const docUrls = querySnapshot.docs.map(
        (doc) => `${API_BASE_URL}/${doc.id}`
      );
      res.status(200).send({ urls: docUrls });
    })
    .catch((err) => {
      res.status(500).send(`Internal Error: ${JSON.stringify(err)}`);
    });
});
