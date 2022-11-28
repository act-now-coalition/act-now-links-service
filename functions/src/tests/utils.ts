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

export const TEST_EMAIL = "email@actnowcoalition.org";

/**
 * Registers a new share link for the given arguments, or returns the existing one.
 *
 * @param payload Arguments to register share link with.
 * @param apiKey API key to use for request.
 * @returns Response from the registerUrl endpoint.
 */
export async function registerUrl(
  payload: Record<string, string | number | undefined>,
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

/**
 * Registers a Firebase Auth user with the given email and password, and returns
 * an ID token for the user. If the user already exists, returns an ID token.
 *
 * @param email Email to register mock user with.
 * @param password Password to register mock user with.
 * @returns Id token for the user.
 */
export async function getOrRegisterIdToken(
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

/**
 * Retrieves the existing or registers a new API key for the given email.
 * @param email Email to register API key for.
 * @param idToken ID token to use for authentication.
 * @returns The API key.
 */
export async function getOrRegisterApiKey(
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
