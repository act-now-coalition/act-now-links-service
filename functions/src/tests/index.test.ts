import fetch from "node-fetch";
import { API_BASE_URL } from "../utils";
import {
  TEST_PAYLOAD,
  TEST_SHARE_LINK_URL,
  URL_NOT_FOUND_ERROR,
  INVALID_URL_ERROR,
  registerUrl,
  getOrRegisterMockUser,
  createOrGetApiKey,
  TEST_EMAIL,
} from "./utils";

let idToken: string;
let apiKey: string;
beforeAll(async () => {
  if (!process.env.FUNCTIONS_EMULATOR) {
    throw new Error("Test suite must be run with the Firebase emulator.");
  }
  idToken = await getOrRegisterMockUser(TEST_EMAIL, "password");
  const apiKeyRes = await createOrGetApiKey(TEST_EMAIL, idToken);
  const apiKeyJson = await apiKeyRes.json();
  apiKey = apiKeyJson.apiKey;
  await registerUrl(TEST_PAYLOAD, apiKey);
});

describe("POST /registerUrl", () => {
  test("returns the existing share link if one already exists with the given params.", async () => {
    const response = await registerUrl(TEST_PAYLOAD, apiKey); // Re-register the TEST_PAYLOAD share link.
    const json = await response.json();
    expect(response.ok).toBe(true);
    expect(json).toMatchObject({ url: TEST_SHARE_LINK_URL });
  });

  test.each([undefined, "ftp://not-a-valid-url"])(
    "returns a 400 error for a missing or invalid url.",
    async (url) => {
      const response = await registerUrl({ ...TEST_PAYLOAD, url: url }, apiKey);
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

describe("POST /auth/createApiKey", () => {
  test("returns a 200 and expected API key for email with existing key.", async () => {
    const apiKeyRes = await createOrGetApiKey(TEST_EMAIL, idToken);
    const apiKeyJson = await apiKeyRes.json();
    expect(apiKeyJson.apiKey).toBe(apiKey);
  });

  test("returns a 403 if ID token is invalid.", async () => {
    const res = await createOrGetApiKey(TEST_EMAIL, "not-a-valid-token");
    expect(res.status).toBe(403);
  });
});

describe("POST /auth/toggleApiKey", () => {
  const toggleApiKey = async (email: string, token: string) => {
    return await fetch(`${API_BASE_URL}/auth/toggleApiKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: TEST_EMAIL, enabled: false }),
    });
  };
  test("returns a 200 and toggles the API key.", async () => {
    await createOrGetApiKey("another@email.com", idToken); // create a second API key to toggle
    const res = await toggleApiKey("another@email.com", idToken);
    expect(res.ok).toBe(true);
    expect(await res.text()).toBe("Success. API key status set to false");
  });

  test("returns a 403 if ID token is invalid.", async () => {
    const res = await toggleApiKey(TEST_EMAIL, "not-a-valid-token");
    expect(res.status).toBe(403);
  });
});
