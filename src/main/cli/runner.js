import { routeCommand } from "./args.js";
import { printHelp } from "./repl.js";
import { clearCache } from "../utils/cache.js";

/**
 * Checks if the application is running in CLI mode.
 * @returns {boolean} True if the application is running in CLI mode.
 */
export function isCLI() {
  return process.argv.includes("--cli");
}

/**
 * Runs a single CLI command and exits.
 * @param {Object} args - The parsed CLI arguments.
 * @param {Function} searchCommodity - The search function to use for commodity searches.
 * @returns {Promise<Object>} The result of the search.
 */
export async function runCLIOnce(args, searchCommodity) {
  const required = ["commodity", "system"];
  const missing = required.filter((k) => !args[k]);
  if (missing.length > 0) {
    console.log(`Missing required args: ${missing.join(", ")}`);
    printHelp();
    return;
  }

  const result = await searchCommodity(args);
  console.log(result.content[0].text);
  return result;
}