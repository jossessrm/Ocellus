/**
 * Market search service. Orchestrates commodity resolution, URL building,
 * caching, and result fetching from Inara.cz.
 */

import { buildUrl, findCommodity } from "../utils/url-builder.js";
import { matchCommodity } from "../utils/commodity-matcher.js";
import { generateCacheKey, getCachedResults, setCachedResults, invalidateOldEntries } from "../utils/cache.js";
import { ensureSessionCookies } from "./session.js";
import { scrapeCommodityPage } from "./scraper.js";

// HTTP headers to mimic a Chrome browser request
const HEADERS = {
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
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
};

/**
 * Core search function. Resolves the commodity, builds the Inara URL,
 * fetches (or retrieves from cache) the HTML table, parses it into structured results.
 *
 * @param {object} params - The search parameters
 * @returns {Promise<{results: Array<Object>, metadata: Object, error?: string}>} Structured search results and metadata
 */
export async function searchCommodityMarket(params) {
  const {
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
  } = params;

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
      results: [],
      metadata: {},
      error: `Error: Unknown commodity '${originalCommodity}'. Could not find a matching item in the database.`,
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
    items: [resolved.name],
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

  // Check cache for previously fetched results
  const cacheKey = generateCacheKey(searchParams);
  let cached = paginationEnabled ? getCachedResults(cacheKey) : null;
  let results = cached ? cached.results : null;
  let fetchTime = cached ? cached.timestamp : null;

  // Cache miss: fetch from Inara
  if (!results) {
    // Ensure Cloudflare session cookies are present
    await ensureSessionCookies();

    // Scrape the commodity page
    const scrapeResult = await scrapeCommodityPage(url, HEADERS);

    if (scrapeResult.error) {
      return {
        results: [],
        metadata: { url, warnings, filters: searchParams },
        error: scrapeResult.error,
      };
    }

    results = scrapeResult.results || [];
    fetchTime = Date.now();

    // Persist results to cache (only when pagination is enabled)
    if (paginationEnabled && !cached) {
      setCachedResults(cacheKey, results, fetchTime);
    }
  }

  // Build filter summary for metadata
  const filters = {
    padSize: minLandingPad,
    surfaceStations,
    fleetCarriers,
    strongholdCarriers,
    maxSystemDistance,
    orderBy: resolvedOrderBy,
    maxPriceAge,
    priceCondition,
    minSupplyOrDemand,
    power,
    powerplayState,
    minorFaction,
  };

  return {
    results,
    metadata: {
      fetchTime,
      url,
      warnings,
      filters,
      mode: marketOperationMode,
      pagination: {
        enabled: paginationEnabled,
        resultsPerPage,
        pageNumber,
        totalResults: results.length,
      },
    },
  };
}
