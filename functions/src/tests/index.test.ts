import fetch from "node-fetch";
import { API_BASE_URL, createUniqueId } from "../utils";
import {
  TEST_PAYLOAD,
  TEST_SHARE_LINK_URL,
  registerUrl,
  INVALID_URL_ERROR,
  URL_NOT_FOUND_ERROR,
} from "./utils";

describe("POST /registerUrl/", () => {
  test("it returns a 200 and creates a new share link from valid params.", async () => {
    // the TEST_PAYLOAD params are already registered in setup.ts, so use a different url.
    const newPayload = { ...TEST_PAYLOAD, url: "https://cdc.gov" };
    const expectedId = createUniqueId(JSON.stringify(newPayload));
    const response = await registerUrl(newPayload);
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({ url: `${API_BASE_URL}/go/${expectedId}` });
  });

  test("it returns the existing share link if one already exists the given params.", async () => {
    const response = await registerUrl(TEST_PAYLOAD); // Re-register the TEST_PAYLOAD share link.
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({ url: TEST_SHARE_LINK_URL });
  });

  test("it returns a 400 error for a missing url.", async () => {
    const response = await registerUrl({ ...TEST_PAYLOAD, url: undefined });
    expect(response.status).toBe(INVALID_URL_ERROR.httpCode);
  });

  test("it returns a 400 error for an invalid url.", async () => {
    const response = await registerUrl({ ...TEST_PAYLOAD, url: "ftp://bad" });
    expect(response.status).toBe(INVALID_URL_ERROR.httpCode);
  });
});

describe("GET /go/:id", () => {
  test("it returns a 404 for a non-existing share link.", async () => {
    const url = `${API_BASE_URL}/go/nonexistent-id`;
    const response = await fetch(url);
    expect(response.status).toBe(URL_NOT_FOUND_ERROR.httpCode);
  });

  test("it returns a 200 for a valid share link.", async () => {
    const response = await fetch(TEST_SHARE_LINK_URL);
    expect(response.ok).toBe(true);
  });
});

describe("GET /shareLinksByUrl", () => {
  test("it returns expected data for a url with a share link.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=${TEST_PAYLOAD.url}`;
    const response = await fetch(url);
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({
      urls: { [TEST_SHARE_LINK_URL]: TEST_PAYLOAD },
    });
  });

  test("it returns an empty object for a url with no share links.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=https://wwww.no-link.com`;
    const response = await fetch(url);
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({ urls: {} });
  });

  test("it returns a 400 error for a missing url.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl`;
    const response = await fetch(url);
    expect(response.status).toBe(INVALID_URL_ERROR.httpCode);
  });

  test("it returns a 400 error for an invalid url.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=ftp://bad`;
    const response = await fetch(url);
    expect(response.status).toBe(INVALID_URL_ERROR.httpCode);
  });
});

describe("GET /screenshot", () => {
  jest.setTimeout(10000); // Bump timeout up to 10 seconds. Screenshots can take a while.
  test("it returns a 200 for a valid share-image page.", async () => {
    const imagePage = "https://covidactnow.org/internal/share-image/states/ma";
    const response = await fetch(`${API_BASE_URL}/screenshot?url=${imagePage}`);
    expect(response.ok).toBe(true);
  });
});
