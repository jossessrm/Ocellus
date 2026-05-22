/**
 * HTML scraper for Inara.cz commodity market tables.
 * Parses station data from HTML responses into structured result objects.
 */

import * as cheerio from "cheerio";
import { getAxiosInstance } from "./session.js";

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

/**
 * Scrapes commodity market data from Inara.cz HTML response.
 * @param {string} url - The Inara.cz URL to scrape
 * @param {Object} headers - HTTP headers for the request
 * @returns {Promise<{results: Array<Object>|null, error: string|null}>} Scraped results or error
 */
async function scrapeCommodityPage(url, headers) {
  try {
    // Perform the HTTP GET and parse HTML with Cheerio
    const response = await getAxiosInstance().get(url, { headers });
    const $ = cheerio.load(response.data);

    // Check for Inara-side error indicators in the response HTML
    const errorMsg = $(".alert-danger, .error, .message-error, .alert").first().text().trim();
    if (errorMsg) {
      return { results: null, error: `Inara error: ${errorMsg}` };
    }

    const results = [];

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
        let station = $(cells[0]).clone().find("span.pictofont").remove().end().find(".stationicon").remove().end().text().trim();

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

    return { results, error: null };
  } catch (e) {
    if (e.response) {
      return { results: null, error: `HTTP Error ${e.response.status}: ${e.response.statusText}` };
    }
    return { results: null, error: `Error: ${e.message}` };
  }
}

export { scrapeCommodityPage };
