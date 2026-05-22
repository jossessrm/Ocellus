/**
 * Session management for Inara.cz Cloudflare bypass and HTTP client setup.
 * Handles Playwright browser automation for cookie acquisition and Axios instance configuration.
 */

import { CookieJar } from "tough-cookie";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(projectRoot, ".browsers");

const jar = new CookieJar();
const axiosInstance = axiosCookieJarSupport(axios.create({ jar }));

/**
 * Acquires Cloudflare session cookies by launching a headless Playwright browser
 * and visiting the Inara commodities page. Cookies are stored in the shared CookieJar
 * for subsequent Axios requests.
 * @returns {Promise<void>}
 * @throws {Error} If the browser fails to launch or navigate to the target URL.
 */
async function ensureSessionCookies() {
  const cookies = await jar.getCookies("https://inara.cz");
  if (cookies.length > 0) return;

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto("https://inara.cz/elite/commodities/", { waitUntil: "networkidle" });
    const browserCookies = await context.cookies();

    for (const cookie of browserCookies) {
      if (cookie.domain.includes("inara.cz")) {
        await jar.setCookie(`${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`, "https://inara.cz");
      }
    }
  } catch (e) {
    console.error("Failed to bypass Cloudflare via Playwright:", e.message);
  } finally {
    await browser.close();
  }
}

/**
 * Gets the configured Axios instance with cookie jar support.
 * @returns {import("axios").AxiosInstance} Configured Axios instance
 */
function getAxiosInstance() {
  return axiosInstance;
}

export { ensureSessionCookies, getAxiosInstance };
