import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { clearCache } from "../utils/cache.js";
import { searchCommodity } from "../controllers/commodity-search.js";

/**
 * Creates and configures an MCP server with the search_commodity tool.
 * @returns {Promise<McpServer>} Configured MCP server instance.
 */
export async function launchCommodityMarketMCP() {
  const server = new McpServer({ name: "commodity-market", version: "1.0.0" });

  server.tool("clearcache", "Clear the in-memory search results cache.", {}, async () => {
    clearCache();
    return { content: [{ type: "text", text: "Cache cleared." }] };
  });

  server.tool(
    "search_commodity",
    "Search Inara for markets that either purchase or sell a commodity near a specific star system. Outputs price, market supply/demand, station relative data and more.",
    {
      mode: z
        .enum(["where to buy", "where to sell"])
        .default("where to buy")
        .describe(
          "Use 'where to buy' if the user wants to purchase the commodity from a station. " +
            "Use 'where to sell' if the user already has the cargo and wants to find a station to sell it to.",
        ),
      commodity: z.string().describe("The name of the commodity to search for (e.g., 'Tritium', 'Gold')."),
      system: z.string().describe("The reference star system to center the search around (e.g., 'Sol')."),
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
        .describe("Include planetary surface ports. 'yes_no_odyssey' includes surface ports but filters out Odyssey-only settlements."),
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
      resultsPerPage: z.number().int().min(0).max(100).default(20).describe("Number of results to display per page (1-100). Default 20."),
      pageNumber: z.number().int().min(1).default(1).describe("Page number for paginated results. Default 1."),
    },
    async (params) => {
      return searchCommodity(params);
    },
  );

  return server;
}
