/**
 * Ocellus: MCP server and standalone client for scraping Elite Dangerous data from Inara.
 *
 * Provides the `search_commodity` tool for AI agents to find stations buying or selling
 * commodities near a star system. Supports extensive filtering: pad size, distance,
 * price conditions, PowerPlay states, BGS states, fleet carriers, and more.
 *
 * Offers a complete cli interface with natural language query parsing and customizable
 * output formatting.
 *
 * Author: jossessrm
 * License: GPL-3.0-only
 */
import { searchCommodity } from "./controllers/commodity-search.js";
import { runCLI } from "./cli/runner.js";
import { startMCPServer } from "./mcp/mcp-manager.js";

/**
 * Module entry point. Executes at import time / `node Ocellus.js`.
 * - If --cli is present: runs CLI mode (single-command or interactive REPL).
 * - Otherwise: starts the MCP server over SSE transport.
 */
if (process.argv.includes("--cli")) {
  // CLI mode
  await runCLI(searchCommodity);
} else {
  // MCP server mode
  await startMCPServer();
}
