import fetch from "node-fetch";
import { API_BASE_URL } from "../utils";
import {
  TEST_PAYLOAD,
  TEST_SHARE_LINK_URL,
  registerUrl,
  INVALID_URL_ERROR,
  URL_NOT_FOUND_ERROR,
} from "./utils";

beforeAll(async () => {
  if (!process.env.FUNCTIONS_EMULATOR) {
    throw new Error("Test suite must be run with the Firebase emulator.");
  }
  console.log("Registering test url.");
  return registerUrl(TEST_PAYLOAD); // Register a share link to test against.
});

describe("POST /registerUrl/", () => {
  test("returns the existing share link if one already exists with the given params.", async () => {
    const response = await registerUrl(TEST_PAYLOAD); // Re-register the TEST_PAYLOAD share link.
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({ url: TEST_SHARE_LINK_URL });
  });

  test.each([undefined, "ftp://not-a-valid-url"])(
    "returns a 400 error for a missing or invalid url.",
    async (url) => {
      const response = await registerUrl({ ...TEST_PAYLOAD, url: url });
      expect(response.status).toBe(INVALID_URL_ERROR.httpCode);
    }
  );
});

describe("GET /go/:id", () => {
  test("returns a 404 for a non-existing share link.", async () => {
    const url = `${API_BASE_URL}/go/nonexistent-id`;
    const response = await fetch(url);
    expect(response.status).toBe(URL_NOT_FOUND_ERROR.httpCode);
  });

  test("returns a 200 for a valid share link.", async () => {
    const response = await fetch(TEST_SHARE_LINK_URL);
    expect(response.ok).toBe(true);
  });
});

describe("GET /shareLinksByUrl", () => {
  test("returns expected data for a url with a share link.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=${TEST_PAYLOAD.url}`;
    const response = await fetch(url);
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({
      urls: { [TEST_SHARE_LINK_URL]: TEST_PAYLOAD },
    });
  });

  test("returns an empty object for a url with no share links.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=https://wwww.no-link.com`;
    const response = await fetch(url);
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({ urls: {} });
  });

  test.each(["", "?url=ftp://not-a-valid-url"])(
    "returns a 400 error for a missing or invalid url.",
    async (urlParam) => {
      const url = `${API_BASE_URL}/shareLinksByUrl${urlParam}`;
      const response = await fetch(url);
      expect(response.status).toBe(INVALID_URL_ERROR.httpCode);
    }
  );
});

describe("GET /screenshot", () => {
  jest.setTimeout(15000); // Bump timeout up to 15 seconds. Screenshots can take a while.
  test("returns a 200 for a valid share-image page.", async () => {
    const imagePage = "https://covidactnow.org/internal/share-image/states/ma";
    const response = await fetch(`${API_BASE_URL}/screenshot?url=${imagePage}`);
    expect(response.ok).toBe(true);
  });
});
