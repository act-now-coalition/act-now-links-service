import "jest";
import fetch from "node-fetch";
import { API_BASE_URL } from "./utils";
import { getShareLinkErrorByCode, ShareLinkErrorCode } from "./error-handling";

const TEST_PAYLOAD = {
  url: "https://www.covidactnow.org",
  title: "Covid Act Now - America's Covid Tracking Dashboard.",
  description: "See how Covid is spreading in your community.",
  imageUrl:
    "https://us-central1-act-now-links-dev.cloudfunctions.net/api/screenshot?url=https://covidactnow.org/internal/share-image/map",
};

describe("POST /registerUrl/", () => {
  test("it returns a 200 and creates a share link", async () => {
    const response = await fetch(`${API_BASE_URL}/registerUrl`, {
      method: "POST",
      body: JSON.stringify(TEST_PAYLOAD),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      url: `${API_BASE_URL}/go/RQFPCERH`
    });
  });
});

describe("GET /go/:id", () => {
  test("it returns a 404 for an invalid share link ID", async () => {
    const url = `${API_BASE_URL}/go/nonexistent-id`;
    const response = await fetch(url);
    const notFoundError = getShareLinkErrorByCode(
      ShareLinkErrorCode.URL_NOT_FOUND
    );
    expect(response.status).toBe(notFoundError.httpCode);
  });
});

// Need an afterAll() to clear the firestore database.
