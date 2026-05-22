import { routeCommand } from "./args.js";
import { printHelp } from "./repl.js";
import { clearCache } from "../utils/cache.js";

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

/**
 * Runs the full CLI entry path: help, clearcache, single-command, or interactive REPL.
 * @param {Function} searchCommodity - The search function to use for commodity searches.
 */
export async function runCLI(searchCommodity) {
  if (process.argv.includes("--help") || process.argv.includes("help")) {
    printHelp();
    process.exit(0);
  }
  if (process.argv.includes("clearcache")) {
    clearCache();
    console.log("Cache cleared.");
    process.exit(0);
  }

  const cliArgs = process.argv.slice(2).filter((a) => a !== "--cli");
  if (cliArgs.length === 0) {
    const { runCLIInteractive } = await import("./repl.js");
    await runCLIInteractive(searchCommodity);
    return;
  }

  const routed = routeCommand(cliArgs);
  if (routed.command === "search") {
    await runCLIOnce(routed.args, searchCommodity);
  } else if (routed.command === "paginate") {
    // standalone pagination doesn't make sense in single-exec; print help
    printHelp();
  } else {
    printHelp();
  }
}
