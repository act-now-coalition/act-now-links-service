import "jest";
import fetch from "node-fetch";
import { API_BASE_URL, createUniqueId } from "./utils";
import { getShareLinkErrorByCode, ShareLinkErrorCode } from "./error-handling";

const TEST_PAYLOAD = {
  url: "https://www.covidactnow.org",
  imageUrl: "https://covidactnow-prod.web.app/share/4047-2795/home.png",
  title: "Covid Act Now - America's Covid Tracking Dashboard.",
  description: "See how Covid is spreading in your community.",
};

beforeAll(() => {
  if (!process.env.FUNCTIONS_EMULATOR) {
    throw new Error("Test suite must be run with the Firebase emulator.");
  }
});

describe("POST /registerUrl/", () => {
  test("it returns a 200 and creates a share link", async () => {
    const response = await fetch(`${API_BASE_URL}/registerUrl`, {
      method: "POST",
      body: JSON.stringify(TEST_PAYLOAD),
      headers: { "Content-Type": "application/json" },
    });
    const expectedId = createUniqueId(JSON.stringify(TEST_PAYLOAD));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      url: `${API_BASE_URL}/go/${expectedId}`,
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
