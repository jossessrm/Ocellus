import * as readline from "readline";
import { routeCommand } from "./args.js";
import { clearCache } from "../utils/cache.js";

/**
 * Prints the help message for the Ocellus CLI.
 */
export function printHelp() {
  console.log(" Ocellus CLI — Natural Language Commodity Market Search");
  console.log("");
  console.log(' All searches must start with the "search" keyword:');
  console.log("");
  console.log(" ── Search Syntax ──");
  console.log("    Usage: search <natural language query>");
  console.log("");
  console.log("   Recognized patterns:");
  console.log("     mode:    where to buy, where to sell, w2buy, w2sell, buying, selling, buy, sell");
  console.log("     system:  near <name>, in system <name>, around <name>, at <name>");
  console.log("     pad:     small|medium|large pad,  pad s|m|l");
  console.log("     range:   within <N> ly,  max distance <N> ly");
  console.log("     sort:    sort by price|supply|demand|distance|update");
  console.log("     min:     min supply|demand <N>");
  console.log("     age:     max age <N>");
  console.log("     planets: include planets, surface stations, planetary");
  console.log("     carriers: fleet carriers, include carriers, use fc, allow fc, with fc");
  console.log("     price:   price above|below|better than <N>");
  console.log("     page size: pagesize <N>, page size <N>, <N> results per page, <N> per page");
  console.log("     page #:  page <N>, page number <N>, show page <N>, go to page <N>");
  console.log("");
  console.log(" ── Other Commands ──");
  console.log("   help                  Show this help");
  console.log("   clearcache            Clear cached market results");
  console.log("   next/prev/first/last  Navigate result pages");
  console.log("   page <N> / pagesize <N>   Jump to page or change page size");
  console.log("   quit / exit           Exit the REPL");
  console.log("");
  console.log(" ── Examples ──");
  console.log("   search where to buy tritium near manhari");
  console.log("   search buy tritium near manhari large pad within 50 ly");
  console.log("   search sell gold near sol price anarchy");
  console.log("   search w2buy tritium near manhari large pad");
  console.log("   search buy water near Cupisii use fc");
  console.log("   search w2b gold near Lhou Mans large pad within 50 ly");
  console.log("   search where to sell painite near sol fleet carriers sort by price");
}

/**
 * Runs the interactive CLI mode for Ocellus.
 * @param {Function} searchCommodity - The search function to use for commodity searches.
 * @returns {Promise<void>}
 */
export async function runCLIInteractive(searchCommodity) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ocellus> ",
  });

  console.log("Ocellus CLI — Natural Language Commodity Market Search");
  console.log("All searches start with 'search'. Type 'help' for usage. 'quit' to exit.\n");
  rl.prompt();

  let lastSearchArgs = null;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      continue;
    }

    if (trimmed === "quit" || trimmed === "exit") {
      console.log("Exiting Ocellus safely...");
      break; // Exit the for-await loop
    }

    if (trimmed === "help") {
      printHelp();
      rl.prompt();
      continue;
    }

    if (trimmed === "clearcache") {
      clearCache();
      console.log("Cache cleared.");
      rl.prompt();
      continue;
    }

    const routed = routeCommand(trimmed);
    if (routed.command === "paginate") {
      if (!lastSearchArgs) {
        console.log("No previous search to paginate. Run a search first.");
        rl.prompt();
        continue;
      }
      const args = { ...lastSearchArgs };
      if (routed.action === "next") args.pageNumber = (args.pageNumber || 1) + 1;
      else if (routed.action === "prev") args.pageNumber = Math.max(1, (args.pageNumber || 1) - 1);
      else if (routed.action === "first") args.pageNumber = 1;
      else if (routed.action === "last")
        args.pageNumber = 999; // placeholder; actual last computed by search
      else if (routed.action === "page") args.pageNumber = routed.value;
      else if (routed.action === "pagesize") {
        args.resultsPerPage = routed.value;
        args.pageNumber = 1;
      }
      const result = await searchCommodity(args);
      console.log("\n" + result.content[0].text + "\n");
      lastSearchArgs = args;
      rl.prompt();
      continue;
    }
    let args;
    if (routed.command !== "search") {
      console.log("Unknown command. Type 'help' for usage. All searches must start with 'search'.");
      rl.prompt();
      continue;
    } else {
      args = routed.args;
    }

    const required = ["commodity", "system"];
    const missing = required.filter((k) => !args[k]);
    if (missing.length > 0) {
      console.log(`Missing required args: ${missing.join(", ")}`);
      console.log("Usage: <where to buy|where to sell> <commodity> near <system> [filters...]");
      rl.prompt();
      continue;
    }

    if (args.padSize) {
      args.padSize = args.padSize.toUpperCase();
      if (!["S", "M", "L"].includes(args.padSize)) {
        console.log("padSize must be S, M, or L.");
        rl.prompt();
        continue;
      }
    }

    const result = await searchCommodity(args);
    console.log("\n" + result.content[0].text + "\n");
    lastSearchArgs = { ...args };
    rl.prompt();
  }

  // --- CLEAN EXIT OVERHAUL FOR TERMINAL STABILITY ---
  rl.close();
  process.stdin.pause();

  // Give the streams 50ms to flush buffers and release TTY control before exiting
  setTimeout(() => {
    process.exit(0);
  }, 50);
}
