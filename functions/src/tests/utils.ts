import "jest";
import fetch from "node-fetch";
import { API_BASE_URL, createUniqueId } from "../utils";

export const TEST_PAYLOAD = {
  url: "https://www.covidactnow.org",
  imageUrl: "https://covidactnow-prod.web.app/share/4047-2795/home.png",
  title: "Covid Act Now - America's Covid Tracking Dashboard.",
  description: "See how Covid is spreading in your community.",
};

export const TEST_SHARE_LINK_URL = `${API_BASE_URL}/go/${createUniqueId(
  JSON.stringify(TEST_PAYLOAD)
)}`;

export async function registerUrl(payload: Record<string, string | undefined>) {
  return await fetch(`${API_BASE_URL}/registerUrl`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}
