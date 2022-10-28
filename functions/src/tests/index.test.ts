import "jest";
import fetch from "node-fetch";
import { API_BASE_URL, createUniqueId } from "../utils";
import { getShareLinkErrorByCode, ShareLinkErrorCode } from "../error-handling";
import { TEST_PAYLOAD, TEST_SHARE_LINK_URL, registerUrl } from "./utils";

describe("POST /registerUrl/", () => {
  test("it returns a 200 and creates a new share link from valid params.", async () => {
    const newPayload = { ...TEST_PAYLOAD, url: "https://cdc.gov" };
    const expectedId = createUniqueId(JSON.stringify(newPayload));
    const response = await registerUrl(newPayload);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ url: `${API_BASE_URL}/go/${expectedId}` });
  });

  test("it returns the existing share link if one already exists the given params.", async () => {
    const response = await registerUrl(TEST_PAYLOAD); // Re-register the test share link.
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ url: TEST_SHARE_LINK_URL });
  });

  test("it returns a 400 error for a missing url.", async () => {
    const response = await registerUrl({ ...TEST_PAYLOAD, url: undefined });
    expect(response.status).toBe(400);
  });

  test("it returns a 400 error for an invalid url.", async () => {
    const response = await registerUrl({ ...TEST_PAYLOAD, url: "ftp://bad" });
    expect(response.status).toBe(400);
  });
});

describe("GET /go/:id", () => {
  test("it returns a 404 for a non-existing share link.", async () => {
    const url = `${API_BASE_URL}/go/nonexistent-id`;
    const response = await fetch(url);
    const notFoundError = getShareLinkErrorByCode(
      ShareLinkErrorCode.URL_NOT_FOUND
    );
    expect(response.ok).toBe(false);
    expect(response.status).toBe(notFoundError.httpCode);
  });

  test("it returns a 200 for a valid share link.", async () => {
    const response = await fetch(TEST_SHARE_LINK_URL);
    expect(response.status).toBe(200);
  });
});

describe("GET /shareLinksByUrl", () => {
  test("it returns expected data for a url with a share link.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=${TEST_PAYLOAD.url}`;
    const response = await fetch(url);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      urls: { [TEST_SHARE_LINK_URL]: TEST_PAYLOAD },
    });
  });

  test("it returns an empty object for a url with no share links.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl?url=https://wwww.non-existent-url.com`;
    const response = await fetch(url);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ urls: {} });
  });

  test("it returns a 400 error for a missing url.", async () => {
    const url = `${API_BASE_URL}/shareLinksByUrl`;
    const response = await fetch(url);
    expect(response.status).toBe(400);
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
