/**
 * Search controller. Adapts the internal market service + output formatter
 * into the standard MCP text content response envelope ({ content: [{ type: "text", text }] }).
 */

import { searchCommodityMarket } from "../services/market.js";
import { formatMarketResults } from "../services/output.js";

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
 * @param {number|string} [params.priceCondition] - Market price condition/quality filter (% to galactic average price).
 * @param {number}   [params.minSupplyOrDemand] - The minimum quantity required.
 * @param {string}   [params.power] - Filter by Powerplay power name.
 * @param {string[]} [params.powerplayState] - Filter by Powerplay states.
 * @param {string}   [params.minorFaction] - Filter by a specific local minor faction name.
 * @param {number}   [params.resultsPerPage=20] - Number of results to display per page.
 * @param {number}   [params.pageNumber=1] - Page number for paginated results.
 * @returns {Promise<{ content: { type: string, text: string }[] }>} The standard MCP text content response object containing search results.
 * @throws {Error} If the network request fails or the target scraper times out.
 */
export async function searchCommodity(params) {
  try {
    // Call the refactored market service to get structured results
    const marketResult = await searchCommodityMarket(params);

    if (marketResult.error) {
      return { content: [{ type: "text", text: marketResult.error }] };
    }

    // Format the results for CLI/MCP output
    const formattedText = formatMarketResults(marketResult.results, marketResult.metadata);

    return { content: [{ type: "text", text: formattedText }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `searchCommodity: Error: ${e.message}` }],
    };
  }
}
