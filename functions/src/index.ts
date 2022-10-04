import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { UrlData } from "./types";
import * as express from "express";
import * as cors from "cors";
import { getUrlDocumentDataById, createUniqueId } from "./utils";
import { takeScreenshot } from "./screenshot";
import { assert } from "@actnowcoalition/assert";

admin.initializeApp();
const app = express();
app.use(cors({ origin: true }));
const runtimeOpts = {
  timeoutSeconds: 90,
  memory: "1GB" as "1GB", // idk why this casting is necessary???
};
exports.api = functions.runWith(runtimeOpts).https.onRequest(app);

/**
 * Register a new shortened url.
 *
 * Requires `content-type: application/json` header and a JSON body (document the args here).
 */
app.post("/registerUrl", async (req, res) => {
  const imageUrl = req.body.imageUrl as string;

  const urlCollection = admin.firestore().collection("urls");
  const documentId = await createUniqueId(urlCollection);

  // TODO: Better way to handle missing data than coercing to empty strings?
  const data: UrlData = {
    imageUrl: imageUrl ?? "",
    url: req.body.url ?? "",
    title: req.body.title ?? "",
    description: req.body.description ?? "",
  };

  const baseUrl = "https://us-central1-test-url-api.cloudfunctions.net/api/";
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
            res.status(200).send(`${baseUrl}${documentId}`);
          })
          .catch((err) => {
            res.status(500).send(`error ${JSON.stringify(err)}`);
          });
      }
      // Update the existing document if the URL already has an entry.
      else if (querySnapshot.size === 1) {
        const doc = querySnapshot.docs[0];
        if (!doc.exists) {
          res
            .status(500)
            .send(
              `error: Document with id ${doc.id} is expected but doesn't exist.`
            );
        }
        doc.ref.update(data).then(() => {
          res.status(200).send(`${baseUrl}${doc.id}`);
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
 * https://us-central1-test-url-api.cloudfunctions.net/api/SHORT_URL_HERE
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
 * Takes a screenshot of the given url and returns the url of the screenshot.
 *
 * Expected url structure:
 * https://us-central1-test-url-api.cloudfunctions.net/api/dynamic-image/URL_HERE
 *
 */
app.get("/dynamic-image/*", async (req, res) => {
  const urlSplit = req.url.split("dynamic-image/");
  const screenshotUrl = urlSplit[urlSplit.length - 1];
  if (!screenshotUrl || screenshotUrl.length === 0) {
    const errorMsg =
      `Missing url query parameter.` +
      `Expected structure: https://<...>.net/api/screenshot?url=URL_HERE`;
    res.status(400).send(errorMsg);
    return;
  }
  // TODO: check if entry for photo already exists, and if so override the existing entry?
  takeScreenshot(screenshotUrl, "temp")
    .then((file: string) => {
      console.log("screenshot generated.");
      // Normally we let the CDN and the browser cache for 24hrs, but you can
      // override this with the ?no-cache query param (useful for testing or for
      // the scheduled ping that tries to keep functions warm).
      // TODO(michael): Consider moving this to middleware (but how do we avoid caching errors?)
      if (req.query["no-cache"] === undefined) {
        console.log("Setting cache-control header.");
        res.header("cache-control", "public, max-age=86400");
      }

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
 * https://us-central1-test-url-api.cloudfunctions.net/api/getShareLinkUrl/URL_HERE
 *
 * Returns the share link url if it exists, otherwise returns a 404.
 */
app.get("/getShareLinkUrl/:url", (req, res) => {
  const db = admin.firestore();
  db.collection("urls")
    .where("url", "==", req.params.url)
    .get()
    .then((querySnapshot) => {
      assert(
        querySnapshot.size <= 1,
        "Expected 0 or 1 documents for URL, got " + querySnapshot.size
      );
      if (querySnapshot.size === 0) {
        res.status(404).send("No share link exists for this URL.");
      } else {
        const doc = querySnapshot.docs[0];
        const baseUrl =
          "https://us-central1-test-url-api.cloudfunctions.net/api/";
        res.status(200).send(`${baseUrl}${doc.id}`);
      }
    })
    .catch((err) => {
      res.status(500).send(`Internal Error: ${JSON.stringify(err)}`);
    });
});

/**
 * Scheduled function that runs the dynamic-image endpoint every 4 minutes to keep it warm.
 */
exports.scheduledScreenshotRequest = functions.pubsub
  .schedule("every 4 minutes")
  .onRun((context) => {
    // Fetch an arbitrary share image (MA overview)
    const imageUrl = "https://covidactnow.org/internal/share-image/states/ma";
    const apiUrl =
      "https://us-central1-test-url-api.cloudfunctions.net/api/dynamic-image/";
    fetch(`${apiUrl}${imageUrl}`)
      .then((response) => {
        console.log("Scheduled screenshot request succeeded.");
      })
      .catch((error) => {
        console.error("Scheduled screenshot request failed.", error);
      });
  });
