# AGENTS.md — Ocellus

**Ocellus**: MCP server for scraping Elite Dangerous commodity market data from Inara.cz.

**Run**: `npm run mcp`

> **Note**: The MCP server is launched via `nodemon`, which automatically restarts the process whenever source files change. There is no need to manually kill and relaunch the server between edits — just save your changes and the new code takes effect automatically.

**Tool**: `search_commodity`

**Params** (in order of importance):

1. `mode` — Market operation: `"where to buy"` (find stations selling the commodity) or `"where to sell"` (find stations buying it). This is the primary search discriminator and is always the first field in cache keys.
2. `commodity` — (required) Commodity name, e.g. `"Tritium"`, `"Gold"`. Fuzzy matching handles typos.
3. `system` — (required) Reference star system, e.g. `"Sol"`.
4. `padSize` — Minimum landing pad: `"S"`, `"M"`, or `"L"` (default: `"L"`, optional).
5. `surfaceStations`, `fleetCarriers`, `strongholdCarriers`, `maxSystemDistance`, `maxStationDistance`, `orderBy`, `maxPriceAge`, `priceCondition`, `minSupplyOrDemand`, `power`, `powerplayState`, `minorFaction`, `resultsPerPage`, `pageNumber` — all optional.

**CLI commands**:

- `npm run cli -- clearcache` — clears the in-memory cache (single-shot)
- REPL: `clearcache` — clears cache without exiting
- REPL: `next`, `prev`, `first`, `last` — paginate through search results
- REPL: `page <N>` — jump to a specific page
- REPL: `pagesize <N>` — change results per page (resets to page 1)

**CLI search syntax** (both single-command and REPL):

**Strict flag mode**: `search [BUY|SELL|w2buy|w2sell] -c <commodity> -s <system> [flags...] [key=value...]`
**Natural language mode**: `search <sentence>` where the parser extracts mode, commodity, system, and filters from free-form text:  
  `search where to buy tritium near manhari`  
  `search w2b gold near sol large pad within 50 ly`  
  `search where to sell painite near sol fleet carriers sort by price`  
  `search buy tritium near shinrarta use fc`

**NL pagination**: `pagesize <N>`, `page size <N>`, `<N> results per page`, `<N> per page`, `page <N>`, `page number <N>`, `show page <N>`, `go to page <N>` — all recognized as results per page or page number in natural language mode.

**NL "fc" shorthand**: `use fc`, `allow fc`, `with fc` are all recognized as fleet carrier requests.

**Files**:

- `src/main/Ocellus.js`: MCP server entry point
- `src/main/cli/args.js`: CLI argument parsing and sub-command routing (`CLI_FLAGS`, `parseArgvArgs`, `parseArgs`, `tokenize`, `castValue`, `routeCommand`, `parseNaturalLanguage`, `isStrictFlags`)
- `src/main/cli/repl.js`: Interactive REPL (`runCLIInteractive`, `printHelp`)
- `src/main/cli/runner.js`: CLI runner (`runCLIOnce`, `isCLI`)
- `src/main/utils/url-builder.js`: URL builder + commodity DB
- `src/main/utils/cache.js`: cache utilities (`clearCache`, etc.)

**Setup** (kilo.json):

```json
{ "command": "npm", "args": ["run", "mcp"] }
```

## Project Structure

```
Ocellus/
├── src/
│   ├── main/
│   │   ├── cli/
│   │   │   ├── args.js          # CLI_FLAGS, parseArgvArgs, parseArgs, tokenize,
│   │   │   │                   # castValue, routeCommand, parseNaturalLanguage, isStrictFlags
│   │   │   ├── repl.js          # runCLIInteractive, printHelp
│   │   │   └── runner.js        # runCLIOnce, isCLI
│   │   ├── utils/
│   │   │   ├── cache.js         # cache utilities
│   │   │   ├── commodity-matcher.js  # Fuse.js fuzzy commodity matching
│   │   │   └── url-builder.js   # URL builder + commodity database
│   │   └── Ocellus.js           # Core. CLI and MCP server entry point
│   ├── renderer/                #
│   └── preload/                 #
├── package.json
├── README.md
└── AGENTS.md