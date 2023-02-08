import * as path from "path";
import * as os from "os";
import * as puppeteer from "puppeteer";

const BROWSER_WIDTH = 2800;
const BROWSER_HEIGHT = 1575;
const TIMEOUT = 15 * 1000;

/**
 * We cache the browser instance to ensure "warm" function runs are as fast as
 * possible.
 */
let browserPromise: Promise<puppeteer.Browser> | null = null;
async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browserPromise) {
    console.log("Launching browser...");
    browserPromise = puppeteer
      .launch({
        defaultViewport: {
          width: BROWSER_WIDTH,
          height: BROWSER_HEIGHT,
        },
        headless: true,
      })
      .then((browser) => {
        console.log("Browser started.");
        return browser;
      });
  }
  return browserPromise;
}

export async function takeScreenshot(
  url: string,
  filename: string
): Promise<string> {
  const browser = await getBrowser();

  console.log("Opening tab.");
  const tab = await browser.newPage();

  console.log(`Going to URL, ${url}`);
  await tab.goto(url);

  console.log('Waiting for "screenshot" div.');
  const element = await tab.waitForSelector(".screenshot", {
    timeout: TIMEOUT,
  });

  // Wait for a Metric-aware data loading component to be loaded.
  console.log('Waiting for "act-now-component-loaded" div.');
  await tab.waitForSelector(".act-now-component-loaded", {
    timeout: TIMEOUT,
  });

  // Ensure no Metric-aware data loading components are still loading.
  // waitForSelector() with `hidden: true` does not work for this because the sentinel
  // divs are set to `display: none` by default, which satisfies the "hidden" condition,
  // triggering the screenshot even if the divs are still on the DOM.
  console.log('Waiting for all "act-now-component-loading" divs to disappear.');
  await tab.waitForFunction(
    () => !document.querySelector(".act-now-component-loading")
  );

  console.log("Capturing screenshot.");
  const file = path.join(os.tmpdir(), `${filename}.png`);
  await element?.screenshot({
    path: file,
  });
  console.log("Screenshot done.");

  await tab.close();
  return file;
}
