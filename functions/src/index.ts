import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import {
  getUrlDocumentDataById,
  createUniqueId,
  UrlData,
  SHARE_LINK_FIRESTORE_COLLECTION,
  API_BASE_URL
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
 * Register a new shortened url.
 *
 * Requires a `content-type: application/json` header and a JSON body with the following arguments:
 *  - url: string
 *  - imageUrl?: string
 *  - title?: string
 *  - description?: string
 */
app.post("/registerUrl", async (req, res) => {
  const imageUrl = req.body.imageUrl as string;

  const urlCollection = firestoreDb.collection(SHARE_LINK_FIRESTORE_COLLECTION);
  const documentId = await createUniqueId(urlCollection);
  if (!req.body.url) {
    res.status(400).send("Missing url argument.");
    return;
  }

  // TODO: Better way to handle missing data than coercing to empty strings?
  const data: UrlData = {
    imageUrl: imageUrl ?? "",
    url: req.body.url,
    title: req.body.title ?? "",
    description: req.body.description ?? "",
  };

  urlCollection
    .where("url", "==", data.url)
    .get()
    .then((querySnapshot) => {
      // Create a new document if the URL doesn't already have an entry.
      if (querySnapshot.size === 0) {
        urlCollection
          .doc(documentId)
          .set(data)
          .then(() => {
            res.status(200).send(`${API_BASE_URL}/${documentId}`);
          })
          .catch((err) => {
            res.status(500).send(`error ${JSON.stringify(err)}`);
          });
      }
      // Update the existing document if the URL already has an entry.
      else if (querySnapshot.size >= 1) {
        const doc = querySnapshot.docs[0];
        if (!doc.exists) {
          res
            .status(500)
            .send(
              `error: Document with id ${doc.id} is expected but doesn't exist.`
            );
        }
        doc.ref.update(data).then(() => {
          res.status(200).send(`${API_BASE_URL}/${doc.id}`);
        });
      } else {
        res
          .status(500)
          .send(
            `error: Unexpected number or documents for URL. Expected 0 or 1, got ${querySnapshot.size}`
          );
      }
    });
});

/**
 * Redirects share link url to original url.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/SHORT_URL_HERE
 */
app.get("/:url", (req, res) => {
  const shortUrl = req.params.url;
  if (!shortUrl || shortUrl.length === 0) {
    const errorMsg =
      "Missing URL parameter. " +
      "Expected structure: https://<...>.net/api/SHORT_URL_HERE";
    res.status(400).send(errorMsg);
    return;
  }

  getUrlDocumentDataById(shortUrl)
    .then((data) => {
      const fullUrl = data.url;
      const image = data.imageUrl ?? "";
      const title = data.title ?? "";
      const description = data.description ?? "";
      // TODO need to make sure that http-equiv="Refresh" actually allows us to track clicks/get
      // analytics. See discussion on redirect methods here: https://stackoverflow.com/a/1562539/14034347
      // TODO: Twitter doesn't like meta/og tags? Add twitter card metadata...
      res.status(200).send(
        `<!doctype html>
          <head>
            <meta http-equiv="Refresh" content="0; url='${fullUrl}'" />
            <meta property="og:image" content="${image}" />
            <meta property="og:url" content url='${fullUrl}'/>
            <meta property="og:title" content='${title}'/>
            <meta property="og:description" content='${description}'/>
          </head>
        </html>`
      );
    })
    .catch((err) => {
      res.status(500).send(`Internal Error: ${JSON.stringify(err)}`);
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
app.get("/screenshot/*", async (req, res) => {
  // TODO: This is hacky. The request/function had issues accepting a url as a query param
  // due to some (I think) encoding/parsing issues. So instead, we just grab everything after 
  // `screenshot/` and use that as the url to avoid the request itself having to parse the url.
  // This means if the url itself includes `screenshot/` then this could break.
  const urlSplit = req.url.split("screenshot/");
  const screenshotUrl = urlSplit[urlSplit.length - 1];
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
 * Retrieves the share link for a given url, if it exists.
 *
 * Expected url structure:
 * https://us-central1-act-now-links-dev.cloudfunctions.net/api/getShareLinkUrl/URL_HERE
 *
 * Returns the share link url if it exists, otherwise returns a 404.
 */
app.get("/getShareLinkUrl/*", (req, res) => {
  // TODO: see above TODO about URL param parsing issue.
  const urlSplit = req.url.split("getShareLinkUrl/");
  // Extra slashes automatically get stripped out, but we need to keep these slashes
  // in order to correctly match the url in firestore. This is another with passing URLs as params.
  const screenshotUrl = urlSplit[urlSplit.length - 1]
    .replace("https:/w", "https://w")
    .replace("http:/w", "http://w");

  console.log("screenshotUrl: ", screenshotUrl, "url: ", req.url);
  firestoreDb.collection(SHARE_LINK_FIRESTORE_COLLECTION)
    .where("url", "==", screenshotUrl)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.size === 0) {
        res.status(404).send("No share link exists for this URL.");
      } else {
        const doc = querySnapshot.docs[0];
        res.status(200).send(`${API_BASE_URL}/${doc.id}`);
      }
    })
    .catch((err) => {
      res.status(500).send(`Internal Error: ${JSON.stringify(err)}`);
    });
});
