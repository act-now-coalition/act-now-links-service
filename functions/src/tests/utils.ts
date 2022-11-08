import fetch, { Response } from "node-fetch";
import { API_BASE_URL, createUniqueId, ShareLinkFields } from "../utils";
import { getShareLinkErrorByCode, ShareLinkErrorCode } from "../error-handling";

export const TEST_PAYLOAD: ShareLinkFields = {
  url: "https://www.covidactnow.org",
  imageUrl: "https://covidactnow-prod.web.app/share/4047-2795/home.png",
  title: "Covid Act Now - America's Covid Tracking Dashboard.",
  description: "See how Covid is spreading in your community.",
};

export const TEST_SHARE_LINK_URL = `${API_BASE_URL}/go/${createUniqueId(
  JSON.stringify(TEST_PAYLOAD)
)}`;

export const TEST_EMAIL = "email@test.com";

export async function registerUrl(
  payload: Record<string, string | undefined>,
  apiKey: string
): Promise<Response> {
  return await fetch(`${API_BASE_URL}/registerUrl?apiKey=${apiKey}`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

export const URL_NOT_FOUND_ERROR = getShareLinkErrorByCode(
  ShareLinkErrorCode.URL_NOT_FOUND
);

export const INVALID_URL_ERROR = getShareLinkErrorByCode(
  ShareLinkErrorCode.INVALID_URL
);

export async function getOrRegisterMockUser(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(
    `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=any_key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );
  const json = await res.json();
  if (!json.error) {
    return json.idToken;
  } else {
    const res = await fetch(
      `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=abc`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true,
        }),
      }
    );
    const json = await res.json();
    return json.idToken;
  }
}

export async function createOrGetApiKey(
  email: string,
  idToken: string
): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}/auth/createApiKey`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ email }),
  });
  return res;
}
