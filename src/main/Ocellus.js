/**
 * Ocellus — MCP server for scraping Elite Dangerous commodity market data from Inara.cz.
 *
 * Provides the `search_commodity` tool for AI agents to find stations buying or selling
 * commodities near a star system. Supports extensive filtering: pad size, distance,
 * price conditions, PowerPlay states, BGS states, fleet carriers, and more.
 *
 * Author: jossessrm
 * License: GPL-3.0-only
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { buildUrl, findCommodity } from "./utils/url-builder.js";
import { matchCommodity } from "./utils/commodity-matcher.js";
import { generateCacheKey, getCachedResults, setCachedResults, invalidateOldEntries, clearCache } from "./utils/cache.js";
import { CookieJar } from "tough-cookie";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import path from "path";
import { fileURLToPath } from "url";
import { isCLI, runCLIOnce } from "./cli/runner.js";
import { printHelp, runCLIInteractive } from "./cli/repl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(projectRoot, ".browsers");

// Dynamically import playwright so it respects the path above
const { chromium } = await import("playwright");

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

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto("https://inara.cz/elite/commodities/", { waitUntil: "networkidle" });
    const browserCookies = await context.cookies();

    for (const cookie of browserCookies) {
      if (cookie.domain.includes("inara.cz")) {
        await jar.setCookie(
          `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`,
          "https://inara.cz",
        );
      }
    }
  } catch (e) {
    console.error("Failed to bypass Cloudflare via Playwright:", e.message);
  } finally {
    await browser.close();
  }
}

/**
 * Core search function. Resolves the commodity, builds the Inara URL, fetches
 * (or retrieves from cache) the HTML table, parses it into structured results,
 * and returns an MCP content response with a formatted table.
 *
 * @param {object}   params - The search parameters.
 * @param {string}   params.commodity - The name of the commodity to search for.
 * @param {string}   params.system - The reference star system to center the search around.
 * @param {string}   params.padSize - The landing pad size required for the user's ship ('S', 'M', or 'L').
 * @param {string}   [params.mode="where to buy"] - The market mode ('where to buy' or 'where to sell').
 * @param {string}   [params.surfaceStations="no"] - Include planetary surface ports.
 * @param {string}   [params.fleetCarriers="no"] - Include player-owned Fleet Carriers in results.
 * @param {string}   [params.strongholdCarriers="no"] - Include stronghold carriers in results.
 * @param {number}   [params.maxSystemDistance=0] - Maximum jump distance in Light Years (Ly) from the reference system.
 * @param {number}   [params.maxStationDistance=0] - Maximum distance from the arrival star in Light Seconds (Ls).
 * @param {string}   [params.orderBy] - The sorting metric for the results.
 * @param {number}   [params.maxPriceAge] - Maximum age of the market data in hours.
 * @param {number|string} [params.priceCondition] - Market price filter.
 * @param {number}   [params.minSupplyOrDemand] - The minimum quantity required.
 * @param {string}   [params.power] - Filter by Powerplay power name.
 * @param {string[]} [params.powerplayState] - Filter by Powerplay states.
 * @param {string}   [params.minorFaction] - Filter by a specific local minor faction name.
 * @param {number}   [params.resultsPerPage=20] - Number of results to display per page.
 * @param {number}   [params.pageNumber=1] - Page number for paginated results.
 * @returns {Promise<{ content: { type: string, text: string }[] }>} The standard MCP text content response object containing search results.
 * @throws {Error} If the network request fails or the target scraper times out.
 */
async function searchCommodity({
  mode: marketMode = "where to buy",
  commodity,
  system,
  padSize = "L",
  surfaceStations = "no",
  fleetCarriers = "no",
  strongholdCarriers = "no",
  maxSystemDistance = 0,
  maxStationDistance = 0,
  orderBy,
  maxPriceAge,
  priceCondition,
  minSupplyOrDemand,
  power,
  powerplayState,
  minorFaction,
  resultsPerPage = 20,
  pageNumber = 1,
}) {
  // Normalise user-facing mode ("where to buy"/"where to sell") to internal API mode ("buy"/"sell")
  const marketOperationMode = marketMode === "where to sell" ? "sell" : "buy";
  const paginationEnabled = resultsPerPage > 0;

  // Resolve orderBy: if sorting by supply in sell mode or demand in buy mode,
  // automatically flip to the meaningful column for that operation
  let resolvedOrderBy = orderBy;
  if (marketOperationMode === "sell" && orderBy === "supply") {
    resolvedOrderBy = "demand";
  } else if (marketOperationMode === "buy" && orderBy === "demand") {
    resolvedOrderBy = "supply";
  }

  // Save original commodity name for error messages
  const originalCommodity = commodity;

  // Fuzzy-correct commodity name before resolution
  const fuzzy = matchCommodity(commodity);
  if (fuzzy && fuzzy.match !== commodity) {
    console.log(`[Fuzzy Match] Auto-correcting typo "${originalCommodity}" to "${fuzzy.match}"`);
    commodity = fuzzy.match;
  }

  // Resolve commodity name to Inara ID
  const resolved = findCommodity(commodity);
  if (!resolved) {
    return {
      content: [{ type: "text", text: `Error: Unknown commodity '${originalCommodity}'. Could not find a matching item in the database.` }],
    };
  }

  // Map pad size letter ("S"|"M"|"L") to Inara string ("small"|"medium"|"large")
  const minLandingPad = padSize === "S" ? "small" : padSize === "M" ? "medium" : "large";

  // Build search params object for cache key generation
  const searchParams = {
    marketMode: marketOperationMode,
    commodity,
    system,
    padSize,
    surfaceStations,
    fleetCarriers,
    maxSystemDistance,
    maxStationDistance,
    orderBy: resolvedOrderBy,
    maxPriceAge,
    priceCondition,
    minSupplyOrDemand,
    strongholdCarriers,
    power,
    powerplayState,
    minorFaction,
  };

  // Prune expired cache entries
  invalidateOldEntries();

  // Build the Inara.cz URL from user-friendly parameters
  const { url, warnings } = buildUrl({
    mode: marketOperationMode,
    items: [resolved.nameOriginal || resolved.name],
    system,
    minLandingPad,
    surfaceStations,
    fleetCarriers,
    maxSystemDistance,
    maxStationDistance,
orderBy: resolvedOrderBy,
    maxPriceAge,
    priceCondition,
    minSupply: minSupplyOrDemand,
    strongholdCarriers,
    resultsPerPage,
    power,
    powerplayState,
    minorFaction,
  });

  try {
    // Check cache for previously fetched results
    const cacheKey = generateCacheKey(searchParams);
    let cached = paginationEnabled ? getCachedResults(cacheKey) : null;
    let results = cached ? cached.results : null;
    let fetchTime = cached ? cached.timestamp : null;

    // Define output table column layout (order, labels, alignment)
    const COLUMNS = [
      { key: "type", label: "TYPE", align: "left" },
      { key: "station", label: "STATION", align: "left" },
      { key: "system", label: "SYSTEM", align: "left" },
      { key: "pad", label: "PAD", align: "center" },
      { key: "stDist", label: "ST DIST", align: "right" },
      { key: "distance", label: "DISTANCE", align: "right" },
      { key: "supply", label: "SUPPLY", align: "right" },
      { key: "price", label: "PRICE", align: "right" },
      { key: "ppBonus", label: "PP+", align: "left" },
      { key: "blackMarket", label: "BM", align: "left" },
      { key: "updated", label: "UPDATED", align: "right" },
    ];

    // Cache miss: fetch from Inara
    if (!results) {
      // Ensure Cloudflare session cookies are present
      await ensureSessionCookies();

      // HTTP headers to mimic a Chrome browser request
      const headers = {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "es-ES,es;q=0.9",
        "Cache-Control": "max-age=0",
        Connection: "keep-alive",
        Referer: "https://inara.cz/elite/commodities/",
        "Sec-Ch-Ua": '"Chromium";v="148", "Google Chrome";v="148", "Not(A)Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      };

      // Perform the HTTP GET and parse HTML with Cheerio
      const response = await axiosInstance.get(url, { headers });
      const $ = cheerio.load(response.data);

      // Check for Inara-side error indicators in the response HTML
      const errorMsg = $(".alert-danger, .error, .message-error, .alert").first().text().trim();
      if (errorMsg) {
        return { content: [{ type: "text", text: `Inara error: ${errorMsg}` }] };
      }

      fetchTime = Date.now();

      results = [];
      // Map CSS background-position X values to station type names (Inara sprite sheet)
      const STATION_TYPES_BY_SPRITE_POS = {
        "-13px": "Coriolis",
        "-26px": "Outpost",
        "-156px": "Orbis",
        "-169px": "Ocellus",
        "-182px": "Surface Port",
        "-247px": "Asteroid Base",
        "-260px": "Megaship",
        "-481px": "Stronghold carrier",
        "-507px": "Fleet Carrier",
        "-780px": "Surface Settlement (Odyssey)",
        "-871px": "Dodec",
      };
      // Helper: strip pictofont icons and private-use-area characters from a cell's text content
      const cleanCellText = ($el) =>
        $el
          .clone()
          .find("span.pictofont")
          .remove()
          .end()
          .text()
          .trim()
          .replace(/[\uE000-\uF8FF]/g, "");

      // Parse each table row into a structured result object
      $("table.data-table tbody tr, table tbody tr, .results tbody tr").each((i, row) => {
        const cells = $(row).find("td");

        // Only process rows with enough columns (header/footer rows are skipped)
        if (cells.length >= 5) {
          let hasBlackMarket = $(cells[0]).find(".blackmarketicon").length > 0;
          let hasPPBonus = $(cells[0]).find(".ppbonusicon").length > 0;

          // Determine station type from the CSS sprite position of .stationicon
          const stationIconDiv = $(cells[0]).find(".stationicon");
          let stationType = "Unknown";
          if (stationIconDiv.length > 0) {
            const bgPos = stationIconDiv.css("background-position") || "";
            const parts = bgPos.split(" ");
            const xPos = parts.length > 0 ? parts[0].trim() : "";
            stationType = STATION_TYPES_BY_SPRITE_POS[xPos] || "Unknown";
          }

          // Extract station name and system name from the first cell (format: "Station | SYSTEM")
          let station = $(cells[0])
            .clone()
            .find("span.pictofont")
            .remove()
            .end()
            .find(".stationicon")
            .remove()
            .end()
            .text()
            .trim();

          const parts = station.split(" | ");
          let systemName = parts.length > 1 ? parts[1].trim().replace(/\s*PP\+$/, "") : "";
          station = parts.length > 1 ? parts[0].trim() : station;

          if (parts.length > 1) {
            station = station.replace(" | " + parts[1], "").trim();
          }

          // Extract remaining columns: pad size, station distance, jump distance, supply/demand, price, update age
          const pad = cleanCellText($(cells[1]));
          const stDist = cleanCellText($(cells[2]));
          const distance = cleanCellText($(cells[3]));
          let supply = cleanCellText($(cells[4])).replace(/^\?0$/, "zero");
          const price = cleanCellText($(cells[5]));
          const updated = cells[6] ? cleanCellText($(cells[6])) : "";

          if (station && station !== "Station" && station !== "") {
            const formattedStation = station.charAt(0).toUpperCase() + station.slice(1).toLowerCase();
            const formattedSystem = systemName.toUpperCase();
            const blackMarketFlag = hasBlackMarket ? "YES" : "NO";
            const ppBonusFlag = hasPPBonus ? "YES" : "NO";
            results.push({
              type: stationType,
              station: formattedStation,
              system: formattedSystem,
              pad,
              stDist,
              distance,
              supply,
              price,
              ppBonus: ppBonusFlag,
              blackMarket: blackMarketFlag,
              updated,
            });
          }
        }
      });
    }

    // Persist results to cache (only when pagination is enabled)
    if (paginationEnabled && !cached) {
      setCachedResults(cacheKey, results, fetchTime);
    }

    // Build human-readable filter summary string for output header
    const filters = [
      `${minLandingPad} pad`,
      surfaceStations !== "yes_no_odyssey" ? `surface: ${surfaceStations}` : null,
      fleetCarriers !== "yes" ? `carriers: ${fleetCarriers}` : null,
      strongholdCarriers !== "yes" ? `stronghold: ${strongholdCarriers}` : null,
      maxSystemDistance > 0 ? `max ${maxSystemDistance} Ly` : null,
      resolvedOrderBy ? resolvedOrderBy : null,
      maxPriceAge ? `max ${maxPriceAge}h price age` : null,
      priceCondition ? `+${priceCondition}% price` : null,
      minSupplyOrDemand ? `min ${minSupplyOrDemand} supply/demand` : null,
      power ? `power: ${power}` : null,
      powerplayState?.length ? `powerplay: ${powerplayState.join(", ")}` : null,
      minorFaction ? `faction: ${minorFaction}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    // Returns the sort-direction triangle indicator based on the active order
    const sortIndicator = (order) => {
      if (order === "price" || order === "supply" || order === "demand") return "▼";
      return "▲";
    };

    const MIN_TOTAL_WIDTH = 150;
    const SEPARATOR = "   ";
    const SEPARATOR_WIDTH = SEPARATOR.length;

    // Compute optimal column widths: natural column width from data, then pad to minimum total width
    const computeColumnWidths = (headers, data) => {
      const numCols = headers.length;
      const widths = headers.map((h) => h.label.length);
      for (const row of data) {
        for (let i = 0; i < numCols; i++) {
          const val = row[headers[i].key];
          if (val && String(val).length > widths[i]) {
            widths[i] = String(val).length;
          }
        }
      }
      const stationIdx = headers.findIndex(h => h.key === "station");
      if (stationIdx !== -1) widths[stationIdx] += 2;

      const naturalTotal = widths.reduce((s, w) => s + w, 0) + (numCols - 1) * SEPARATOR_WIDTH + 7;
      if (naturalTotal >= MIN_TOTAL_WIDTH) return widths;
      let deficit = MIN_TOTAL_WIDTH - naturalTotal;
      while (deficit > 0) {
        for (let i = 0; i < numCols && deficit > 0; i++) {
          widths[i]++;
          deficit--;
        }
      }
      return widths;
    };

    // Format a single data row into a string with column-aligned text
    const formatRow = (row, colDefs, widths) => {
      return colDefs
        .map((col, i) => {
          const val = String(row[col.key] || "");
          if (col.key === "station") return val.padStart(widths[i]);
          if (col.align === "right") return val.padStart(widths[i]);
          if (col.align === "center") {
            const left = Math.floor((widths[i] - val.length) / 2);
            const right = widths[i] - val.length - left;
            return " ".repeat(left) + val + " ".repeat(right);
          }
          return val.padEnd(widths[i]);
        })
        .join(SEPARATOR);
    };

    // Build column headers with sort indicators
    const sortCol = resolvedOrderBy || "distance";
    const triangle = sortIndicator(sortCol);
    const supplyLabel = marketOperationMode === "buy" ? "SUPPLY" : "DEMAND";
    const headerCols = COLUMNS.map((col) => {
      let label = col.label;
      if (col.key === "distance" && sortCol === "distance") label = `${col.label} ${triangle}`;
      if (col.key === "supply") label = (sortCol === "supply" || sortCol === "demand") ? `${supplyLabel} ${triangle}` : supplyLabel;
      if (col.key === "price" && sortCol === "price") label = `PRICE ${triangle}`;
      if (col.key === "updated" && sortCol === "update") label = `UPDATED ${triangle}`;
      return { key: col.key, label, align: col.align };
    });

    // Determine data freshness label and pagination slice
    const fetchDate = new Date(fetchTime);
    const ageMs = Date.now() - fetchTime;
    const isCached = ageMs > 10_000;
    const ageLabel = isCached ? ` (${Math.round(ageMs / 60_000)}m ago)` : "";
    const currentTime = `${fetchDate.toLocaleString()}${ageLabel} ${isCached ? "(cached)" : ""}`;
    let displayResults = results;
    let paginationInfo = "";
    if (paginationEnabled && results.length > 0) {
      const totalResults = results.length;
      const totalPages = Math.ceil(totalResults / resultsPerPage);
      const safePage = Math.min(Math.max(1, pageNumber), totalPages);
      const start = (safePage - 1) * resultsPerPage;
      const end = start + resultsPerPage;
      displayResults = results.slice(start, end);
      paginationInfo = ` (${resultsPerPage} per page, page ${safePage} of ${totalPages})`;
    }

    // Compute column widths from displayed results and render the header row
    const widths = computeColumnWidths(headerCols, displayResults);
    const header = formatRow(Object.fromEntries(headerCols.map((h) => [h.key, h.label])), headerCols, widths);

    // Assemble the final output string
    const summaryIndicator = marketOperationMode === "buy" ? "Where to buy? " : "Where to sell? ";
    const innerText =
      displayResults.length > 0
        ? `[${currentTime}] ${summaryIndicator} Found ${results.length} stations ${marketOperationMode === "buy" ? "selling" : "buying"} ${resolved.name} near ${system}${paginationInfo} (${filters}):${warnings.length ? " ⚠️ " + warnings.join(", ") : ""}\n\n${header}\n` +
          displayResults.map((row) => formatRow(row, headerCols, widths)).join("\n")
        : `[${currentTime}] No results found for ${resolved.name} near ${system} with your criteria. Try expanding your search radius or checking a different system.${warnings.length ? " ⚠️ " + warnings.join(", ") : ""}`;
    const resultText = "Fetching market data from " + url + "\n\n" + innerText;

    return { content: [{ type: "text", text: resultText }] };
    // Error handling: return descriptive messages for HTTP errors and general exceptions
  } catch (e) {
    if (e.response) {
      let errorMsg = {
        content: [
          { type: "text", text: `c2: HTTP Error ${e.response.status}: ${e.response.statusText} after fetching ` + url },
        ],
      };
      return errorMsg;
    }
    return {
      content: [{ type: "text", text: `c2: Error: ${e.message}\nURL: ${url}` }],
    };
  }
}

// ─── MCP Server Factory ─────────────────────────────────────────────────────

/**
 * Creates and configures an MCP server with the search_commodity tool.
 * @returns {Promise<McpServer>} Configured MCP server instance.
 */
async function createMCPServer() {
  const server = new McpServer({ name: "inara-search", version: "1.0.0" });

  server.tool(
    "clearcache",
    "Clear the in-memory search results cache.",
    {},
    async () => {
      clearCache();
      return { content: [{ type: "text", text: "Cache cleared." }] };
    },
  );

  server.tool(
    "search_commodity",
    "Search Inara for commodity price, market supply, demand, and station data near a specific star system.",
    {
      commodity: z.string().describe("The name of the commodity to search for (e.g., 'Tritium', 'Gold')."),
      system: z.string().describe("The reference star system to center the search around (e.g., 'Sol')."),
      mode: z
        .enum(["where to buy", "where to sell"])
        .default("where to buy")
        .describe(
          "Use 'where to buy' if the user wants to purchase the commodity from a station. " +
            "Use 'where to sell' if the user already has the cargo and wants to find a station to sell it to.",
        ),
      padSize: z
        .enum(["S", "M", "L"])
        .default("L")
        .describe(
          "The landing pad size required for the user's ship. " +
            "L (Large) is the safest default, but change to M or S if the user specifies they are flying a smaller ship.",
        ),
      surfaceStations: z
        .enum(["yes", "yes_no_odyssey", "no"])
        .default("no")
        .describe(
          "Include planetary surface ports. 'yes_no_odyssey' includes surface ports but filters out Odyssey-only expansions.",
        ),
      fleetCarriers: z
        .enum(["yes", "yes_updated", "no"])
        .default("no")
        .describe(
          "Include player-owned Fleet Carriers in results. 'yes_updated' restricts to carriers with recently refreshed market data.",
        ),
      maxSystemDistance: z
        .number()
        .default(0)
        .describe("Maximum jump distance in Light Years (Ly) from the reference system. Use 0 for no limit."),
      maxStationDistance: z
        .number()
        .default(0)
        .describe("Maximum distance from the arrival star in Light Seconds (Ls). Use 0 for no limit."),
      orderBy: z
        .enum(["price", "supply", "demand", "distance", "update"])
        .default("distance")
        .describe("The sorting metric for the results."),
      maxPriceAge: z
        .number()
        .optional()
        .describe("Maximum age of the market data in hours (e.g., 24 for daily updates). Leave empty for any age."),
      priceCondition: z
        .union([
          z
            .number()
            .int()
            .min(0)
            .max(99)
            .describe("Percentage threshold (0-99) better than galactic average price. Use 0 for 'none' / no filter."),
          z.literal("anarchy").describe("Filters strictly for lawless black markets."),
        ])
        .default(0)
        .describe("Market price filter. Accepts an integer from 0 to 99, or the string 'anarchy'."),
      minSupplyOrDemand: z
        .number()
        .optional()
        .describe(
          "The minimum quantity required. This automatically filters for 'Supply' if mode is 'where to buy', " +
            "or 'Demand' if mode is 'where to sell'.",
        ),
      strongholdCarriers: z.enum(["yes", "only_pledged", "no"]).default("no"),
      power: z.string().optional().describe("Filter by Powerplay power name (e.g., 'Aisling Duval') or 'none'."),
      powerplayState: z.array(z.string()).optional().describe("Filter by states like 'fortified', 'expansion', etc."),
      minorFaction: z.string().optional().describe("Filter by a specific local minor faction name."),
      resultsPerPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of results to display per page (1-100). Default 20."),
      pageNumber: z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe("Page number for paginated results. Default 1."),
    },
    async (params) => {
      return searchCommodity(params);
    },
  );

  return server;
}

// ─── MCP Entry ─────────────────────────────────────────────────────────────

/**
 * Module entry point. Executes at import time / `node Ocellus.js`.
 * - If --cli is present: runs CLI mode (single-command or interactive REPL).
 * - Otherwise: starts the MCP server over SSE transport.
 */
if (isCLI()) {
  if (process.argv.includes("--help") || process.argv.includes("help")) {
    printHelp();
    process.exit(0);
  }
  if (process.argv.includes("clearcache")) {
    clearCache();
    console.log("Cache cleared.");
    process.exit(0);
  }
  const { routeCommand } = await import("./cli/args.js");
  const routed = routeCommand(process.argv.slice(2));
  if (routed.command === "search" && routed.args.commodity) {
    await runCLIOnce(routed.args, searchCommodity);
  } else {
    await runCLIInteractive(searchCommodity);
  }
} else {
  /**
   * HTTP/SSE Server Mode
   * Starts an Express server that serves SSE connections and handles MCP messages via HTTP POST.
   */
  const app = express();
  app.use(express.json());

  // Map to track active SSE sessions
  const transports = new Map(); // sessionId -> SSEServerTransport

  // SSE endpoint - establishes the SSE connection
  app.get("/sse", async (req, res) => {
    try {
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);
      
      // Clean up when connection closes
      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };

      const server = await createMCPServer();
      await server.connect(transport);
      
      // transport.start() is called automatically by server.connect()
    } catch (error) {
      console.error("SSE connection error:", error);
      res.status(500).end("Internal Server Error");
    }
  });

  // Message endpoint - handles MCP JSON-RPC messages
  app.post("/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        res.status(400).end("Missing sessionId query parameter");
        return;
      }

      const transport = transports.get(sessionId);
      if (!transport) {
        res.status(400).end("Unknown sessionId");
        return;
      }

      // Pass req.body directly since express.json() has already parsed it
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error("Message handling error:", error);
      res.status(500).end("Internal Server Error");
    }
  });

  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Ocellus SSE server listening on http://localhost:${PORT}`);
    console.log(`Connect to /sse to establish SSE stream, then POST messages to /messages?sessionId=<id>`);
  });
}
