import { matchCommodity } from "../utils/commodity-matcher.js";

/**
 * Maps CLI flag names to their possible command-line argument variants.
 * @type {Object.<string, string[]>}
 */

/**
 * Casts a string value to its appropriate JavaScript type.
 * @param {string} val - The value to cast.
 * @returns {boolean|number|string} The casted value.
 */
export function normalizeOrderBy(input) {
  const v = String(input).toLowerCase().trim();
  if (v === "price" || v === "best price") return "price";
  if (v === "supply" || v === "best supply") return "supply";
  if (v === "demand" || v === "best demand") return "demand";
  if (v === "distance") return "distance";
  if (v === "update" || v === "last update") return "update";
  return input;
}

/**
 * Parses command-line arguments from process.argv into a structured object.
 * @returns {Object} The parsed arguments.
 */

/**
 * Parses an array of tokens into a structured arguments object.
 * @param {string[]} tokens - The tokens to parse.
 * @returns {Object} The parsed arguments.
 */

/**
 * Tokenizes a command-line string into an array of tokens, handling quoted strings.
 * @param {string} line - The command-line string to tokenize.
 * @returns {string[]} The array of tokens.
 */
export function tokenize(line) {
  const tokens = [];
  let current = "";
  let inQuote = false;
  let quoteChar = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && !inQuote) {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = null;
    } else if (ch === " " && !inQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Determines whether a token array looks like strict flag syntax.
 * Returns true if any token starts with '-' or '=', or if the first
 * non-mode token is a bare flag word. Single bare commodity names are
 * treated as natural language.
 * @param {string[]} tokens
 * @returns {boolean}
 */

/**
 * Attempts to parse natural-language tokens into structured search args.
 *
 * Supported patterns (applied case-insensitively):
 *   Mode:   where to (buy|sell), w2(buy|sell), buying, selling, buy, sell
 *   System: near|in|around|at <system name>
 *   Pad:    small pad, medium pad, large pad, pad [s|m|l]
 *   Range:  within|max distance <N> ly
 *   Sort:   sort by (price|supply|demand|distance|update)
 *   Min:    min (supply|demand) <N>
 *   Age:    max age <N>
 *   Planets: include planets, surface stations, planetary
 *   Carriers: fleet carriers, include carriers
 *   Price:  price (above|below|better than)? <N>
 *
 * @param {string[]} tokens
 * @returns {Object} args object matching searchCommodity param shape
 */
export function parseNaturalLanguage(tokens) {
  const sentence = tokens.join(" ").trim();
  const args = { mode: "where to buy", padSize: "L" };

  // Shared stop pattern for multi-word value capture regexes.
  // Any NL keyword that could follow a captured value.
  const NL_KEYWORDS =
    "max|sort|min|include|fleet|price|within|pad|with|where|w2|w2b|w2s|buying|selling|buy|sell|surface|large|medium|small|planets|planetary|stations|carriers|age|hours|ly|ls|use|allow|fc|pagesize|page|results|per|show|go";
  const NL_STOP = `(?:\\s+(?:${NL_KEYWORDS})\\b|$)`;

  // Mode
  const modeRe = /\b(where to (buy|sell)|w2(buy|sell|b|s)|buying|selling|buy|sell)\b/i;
  const modeMatch = sentence.match(modeRe);
  if (modeMatch) {
    const matched = modeMatch[1].toLowerCase();
    if (matched === "where to sell" || matched === "w2sell" || matched === "w2s" || matched === "selling" || matched === "sell") {
      args.mode = "where to sell";
    }
  }

  // Pad size
  const padRe = /\b(small|medium|large)\s+pad\b|\bpad\s+([sml])\b/i;
  const padMatch = sentence.match(padRe);
  if (padMatch) {
    const size = (padMatch[1] || padMatch[2]).toLowerCase();
    if (size === "small" || size === "s") args.padSize = "S";
    else if (size === "medium" || size === "m") args.padSize = "M";
    else if (size === "large" || size === "l") args.padSize = "L";
  }

  // System — "near X", "in system X", "around X", "at X"
  const systemRe = new RegExp(`\\b(?:near|in\\s+system|around|at)\\s+(.+?)${NL_STOP}`, "i");
  const systemMatch = sentence.match(systemRe);
  if (systemMatch) {
    args.system = systemMatch[1].trim();
  }

  // Max system distance
  const distRe = /\b(?:within|max\s+distance|max)\s+(\d+)\s*ly\b/i;
  const distMatch = sentence.match(distRe);
  if (distMatch) {
    args.maxSystemDistance = parseInt(distMatch[1], 10);
  }

  // Max station distance
  const stDistRe = /\bmax\s+station\s+distance\s+(\d+)\s*ls\b/i;
  const stDistMatch = sentence.match(stDistRe);
  if (stDistMatch) {
    args.maxStationDistance = parseInt(stDistMatch[1], 10);
  }

  // Order by
  const orderRe = /\bsort\s+by\s+(price|supply|demand|distance|update)\b/i;
  const orderMatch = sentence.match(orderRe);
  if (orderMatch) {
    args.orderBy = normalizeOrderBy(orderMatch[1]);
  }

  // Min supply/demand
  const minRe = /\bmin\s+(supply|demand)\s+(\d+)\b/i;
  const minMatch = sentence.match(minRe);
  if (minMatch) {
    args.minSupplyOrDemand = parseInt(minMatch[2], 10);
  }

  // Max price age
  const ageRe = /\bmax\s+age\s+(\d+)\s*(days?|hours?|h|d)?\b/i;
  const ageMatch = sentence.match(ageRe);
  if (ageMatch) {
    let val = parseInt(ageMatch[1], 10);
    const unit = (ageMatch[2] || "").toLowerCase();
    if (unit.startsWith("d")) val *= 24;
    args.maxPriceAge = val;
  }

  // Surface stations
  const surfRe = /\b(?:include\s+planets|surface\s+stations|planetary)\b/i;
  if (surfRe.test(sentence)) {
    args.surfaceStations = "yes";
  }

  // Fleet carriers
  const fcRe = /\b(?:fleet\s+carriers?|include\s+carriers|(?:use|allow|with)\s+fc)\b/i;
  if (fcRe.test(sentence)) {
    args.fleetCarriers = "yes";
  }

  // Stronghold carriers
  const strongholdRe = /\b(?:stronghold\s+carriers?|only\s+pledged)\b/i;
  if (strongholdRe.test(sentence)) {
    args.strongholdCarriers = "yes";
  }

  // Power filter
  const powerRe = new RegExp(`\\bpower\\s+(.+?)${NL_STOP}`, "i");
  const powerMatch = sentence.match(powerRe);
  if (powerMatch) {
    args.power = powerMatch[1].trim();
  }

  // Powerplay state filter
  const stateRe = new RegExp(`\\bpowerplay\\s+state\\s+(.+?)${NL_STOP}`, "i");
  const stateMatch = sentence.match(stateRe);
  if (stateMatch) {
    // Split by comma or "and" but only if followed by a known powerplay state
    const stateText = stateMatch[1];
    const rawStates = stateText
      .split(/,|\s+and\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    args.powerplayState = rawStates;
  }

  // Minor faction filter
  const factionRe = new RegExp(`\\bfaction\\s+(.+?)${NL_STOP}`, "i");
  const factionMatch = sentence.match(factionRe);
  if (factionMatch) {
    args.minorFaction = factionMatch[1].trim();
  }

  // Price condition
  const priceRe = /\bprice\s+(?:above|below|better\s+than)?\s*(\d+)\b/i;
  const priceMatch = sentence.match(priceRe);
  if (priceMatch) {
    args.priceCondition = priceMatch[1] === "anarchy" ? "anarchy" : parseInt(priceMatch[1], 10);
  }

  // Page size (resultsPerPage)
  const pageSizeRe =
    /\b(?:page\s*size|pagesize|per\s*page|\d+\s*results?\s*per\s*page|show\s+(\d+)\s*results?)\s*(\d+)?\b|\b(\d+)\s*(?:results?\s*per\s*page|per\s*page)\b/i;
  const psMatch = sentence.match(pageSizeRe);
  if (psMatch) {
    const n = parseInt(psMatch[1] || psMatch[2] || psMatch[3], 10);
    if (n > 0) args.resultsPerPage = n;
  }

  // Page number
  const pageRe = /\b(?:page(?:\s*number)?|show\s+page|go\s+to\s+page|display\s+page)\s*(\d+)\b/i;
  const pMatch = sentence.match(pageRe);
  if (pMatch) {
    const n = parseInt(pMatch[1], 10);
    if (n > 0) args.pageNumber = n;
  }

  // Commodity extraction: remove known phrases and fuzzy-match remainder
  let remainder = sentence
    .replace(modeRe, "")
    .replace(/\bnear\s+\S+/gi, "")
    .replace(/\bin\s+system\s+\S+/gi, "")
    .replace(/\baround\s+\S+/gi, "")
    .replace(/\bat\s+\S+/gi, "")
    .replace(padRe, "")
    .replace(distRe, "")
    .replace(stDistRe, "")
    .replace(orderRe, "")
    .replace(minRe, "")
    .replace(ageRe, "")
    .replace(surfRe, "")
    .replace(fcRe, "")
    .replace(strongholdRe, "")
    .replace(powerRe, "")
    .replace(stateRe, "")
    .replace(factionRe, "")
    .replace(priceRe, "")
    .replace(pageSizeRe, "")
    .replace(pageRe, "")
    .replace(new RegExp(`\\b(${NL_KEYWORDS})\\b`, "gi"), "")
    .trim();

  if (remainder) {
    const fuzzy = matchCommodity(remainder);
    if (fuzzy) {
      console.log("Unrecognized commodity. Did you mean " + fuzzy.match + "?\n");
      args.commodity = fuzzy.match;
    } else {
      args.commodity = remainder;
    }
  }

  return args;
}

/**
 * Routes an incoming command line or argv slice to the appropriate handler.
 *
 * @param {string|string[]} lineOrTokens - A raw string (REPL input) or an array of argv tokens.
 * @returns {{ command: string, args?: Object, tokens?: string[] }}
 *   - { command: "search", args }   when the first keyword is "search"
 *   - { command: "other", tokens }  for any other command (help, quit, clearcache, etc.)
 */
export function routeCommand(lineOrTokens) {
  let tokens;
  if (typeof lineOrTokens === "string") {
    tokens = tokenize(lineOrTokens);
  } else {
    tokens = lineOrTokens.filter((t) => t !== "--cli");
  }
  if (tokens.length === 0) {
    return { command: "other", tokens };
  }
  const first = tokens[0].toLowerCase();

  // Standalone pagination commands
  if (["next", "nextpage", "prev", "previous", "back", "first", "last"].includes(first)) {
    const action = first === "nextpage" ? "next" : first === "previous" || first === "back" ? "prev" : first;
    return { command: "paginate", action };
  }
  if ((first === "page" || first === "pagesize" || first === "results") && tokens.length > 1) {
    const val = parseInt(tokens[1], 10);
    if (!isNaN(val) && val > 0) return { command: "paginate", action: first === "results" ? "pagesize" : first, value: val };
  }

  // The only lookup verb is "search". Strip it and parse the rest as natural language.
  if (first === "search") {
    const remaining = tokens.slice(1);
    return { command: "search", args: parseNaturalLanguage(remaining) };
  }

  // Unknown command
  return { command: "other", tokens };
}
