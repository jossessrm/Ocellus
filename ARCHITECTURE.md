# Ocellus Architecture

This document defines the intended structure, naming conventions, and future expansion paths for the Ocellus project. It serves as a reference for agents and contributors to understand how the system is organized and how new search types should be added.

## Guiding Principles

- **CLI**: Natural language input. `search <query>` is the only lookup verb. The `search` keyword is mandatory.
- **MCP**: One tool per search category. Pattern: `search_<category>`.
- **Controllers**: One controller file per search type, exporting a single async function.
- **Services**: One service module per search type (or shared infrastructure where appropriate).
- **Simplicity over cleverness**: Commodity searches are common and get fast-path NL syntax. Module and ship searches are rarer and may require more explicit input.
- **Journal integration**: Where available, player data (location, ship, cargo, fleet carrier) is auto-filled from Elite Dangerous Journal files.
- **Profit/time calculation**: A separate concern from search. The `profit` command computes trip time and earnings using known constants; it is not a search.

---

## CLI Commands

| User input                                    | Action                                                       | Category    | Status  |
| --------------------------------------------- | ------------------------------------------------------------ | ----------- | ------- |
| `search <nl>`                                 | NL parser detects intent -> dispatches to correct controller | Information | Current |
| `next` / `prev` / `page <N>` / `pagesize <N>` | Paginate through last search results                         | Navigation  | Current |
| `clearcache`                                  | Clear in-memory cache                                        | System      | Current |
| `profit <commodity> buy at <N> sell at <N>`   | Estimate trip time and profit for a commodity trade loop     | Calculation | Future  |
| `help`                                        | Show help                                                    | Meta        | Current |
| `quit` / `exit`                               | Exit REPL                                                    | Meta        | Current |

The NL parser in `parseNaturalLanguage()` detects the search type from the input. Currently only `commodity` is implemented; the rest are planned:

| Input pattern                                             | Detected type | Status  |
| --------------------------------------------------------- | ------------- | ------- |
| `buy/sell/w2b/w2s/w2buy/w2sell <commodity> near <system>` | `commodity`   | Current |
| `service <name> near <system>`                            | `service`     | Future  |
| `module <name> class <N> near <system>`                   | `module`      | Future  |
| `ship <name> near <system>`                               | `shipyard`    | Future  |

Once implemented, `routeCommand()` will use the detected type to dispatch to the correct controller. Currently only `commodity` type detection is wired.

---

## MCP Tools (AI Agent API)

| Tool name               | What it finds                                                                                                                                                    | Status      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `search_commodity`      | Stations buying or selling a commodity                                                                                                                           | **Current** |
| `search_service`        | Stations offering a service (Refuel, Repair, Rearm, Outfitting, Shipyard, Universal Cartographics, Interstellar Factors, Pioneer Supplies, Vista Genomics, etc.) | Future      |
| `search_module`         | Stations selling a specific module (with class and rating)                                                                                                       | Future      |
| `search_shipyard`       | Stations selling a specific ship                                                                                                                                 | Future      |
| `estimate_trade_profit` | Calculate trip time and profit for a trade loop given prices, ship specs, and station types                                                                      | Future      |
| `clearcache`            | Clear in-memory cache                                                                                                                                            | **Current** |

Consistent naming pattern: `search_<category>` for all lookup tools. `clearcache` and `estimate_trade_profit` are system/calculation actions, not searches.

---

## Current Project Structure

```
src/main/
  Ocellus.js                         # Entry point
  controllers/
    commodity-search.js              # searchCommodity(params)
  cli/
    args.js                          # tokenize, parseNaturalLanguage, routeCommand
    repl.js                          # runCLIInteractive, printHelp
    runner.js                        # runCLIOnce, runCLI
  mcp/
    commodity-market.js              # search_commodity + clearcache tool registration
    mcp-manager.js                   # Server lifecycle, SSE transport
  services/
    market.js                        # Commodity search orchestration
    output.js                        # Result formatting
    scraper.js                       # HTML parsing
    session.js                       # Playwright + Axios session
  utils/
    cache.js                         # In-memory + disk cache
    commodity-matcher.js             # Fuzzy commodity matching
    url-builder.js                   # URL construction
```

## Planned Additions

```
controllers/
  service-search.js                  # searchService(params)
  module-search.js                   # searchModule(params)
  shipyard-search.js                 # searchShipyard(params)
cli/
  profit.js                          # profit command parsing + calculation
mcp/
  tools.js                           # Centralized MCP tool registration
services/
  service-locator.js                 # Service search orchestration
  module-search.js                   # Module search orchestration
  shipyard-search.js                 # Shipyard search orchestration
  profit-calculator.js               # Trip time + profit calculation
  journal-parser.js                  # Elite Dangerous Journal file reader
```

### Profit / Time Calculation

The `profit` command computes trade loop time and earnings using known in-game constants (jump timings, supercruise, docking/undocking, market activity). It has two overlapping calculations:

1. **Time estimation** — time per phase: jumps, supercruise, dock, market, undock. Accounts for ship type (nimble vs. sluggish), pad size, station type (orbital vs. planetary vs. fleet carrier), and distance from arrival star.
2. **Profit calculation** — revenue minus costs: buy price + sell price + repair + fuel. May optionally include fleet carrier loading/unloading.

CLI command: `profit <commodity> buy at <N> sell at <N> [options]`
MCP tool: `estimate_trade_profit`

#### Parameter sources

| Parameter            | Manual (CLI)             | Auto-filled (with Journal parser)                     |
| -------------------- | ------------------------ | ----------------------------------------------------- |
| Cargo capacity       | `cargo <N>`              | From current ship loadout                             |
| Laden jump range     | `jump-laden <N>`         | Computed from ship + cargo mass                       |
| Empty jump range     | `jump-empty <N>`         | From ship loadout                                     |
| Ship type / pad size | `ship <name>`            | From ship type (mapped to pad + agility)              |
| Current system       | `from <system>`          | From last NavBeacon or FSDJump event                  |
| Destination system   | `to <system>`            | Required (or inferred from last search)               |
| Fleet carrier        | `fc <yes/no>`            | Auto-detected if player owns one (CarrierStats event) |
| Buy/sell price       | `buy at <N> sell at <N>` | Required (from search results or user input)          |

#### MCP tool

`estimate_trade_profit` receives all parameters explicitly (agents handle the parameter plumbing). It returns a structured time breakdown and profit per hour.

### Journal Parser

`services/journal-parser.js` watches the Elite Dangerous Journal directory and reads relevant events:

- **Location tracking**: `FSDJump`, `Location`, `NavBeaconScan`, `Docked`, `CarrierJump`
- **Ship state**: `Loadout`, `Cargo`, `MarketSell`, `MarketBuy`
- **Fleet carrier**: `CarrierStats`, `CarrierJump`, `CarrierTradeOrder`, `CarrierLocation`

Provides a queryable state object to other services so they can auto-fill parameters (current system, ship, cargo, carrier position) without the user explicitly providing them.

---

## Pagination

Pagination (`next`, `prev`, `page`, `pagesize`) operates on the _last search result_ regardless of search type. The REPL stores the last search arguments and re-executes the search with modified page parameters.

## Cache

Cache is shared across all search types. Each search type generates its own cache key. The 5-minute TTL and disk persistence model remains unchanged. Results are persisted to disk at `node_modules/.cache/ocellus-cache.json`. Invalid entries are pruned before each search via `invalidateOldEntries()`.

---

## Planned Infrastructure Changes

### 1. Multilanguage Dictionaries for NL Parsing

The NL parser will incorporate per-language dictionaries for:

- Commands (`search`, `profit`, `clearcache`, `help`, `next`, `prev`, etc.) with typo autodetection and suggestions when an unknown command is entered
- Commodity names, ship names, module names, service names in the appropriate language with fuzzy matching
- Popular system names (these are language-agnostic but benefit from typo detection)

When a user types a misspelled command or entity name, Ocellus will suggest the closest match rather than failing silently.

### 2. EDDN API Integration (Replacing Inara Scraper)

The long-term goal is to source market data from **EDDN (Elite Dangerous Data Network)** instead of scraping Inara.cz. This means:

- Replacing `services/scraper.js` and `services/session.js` (Playwright + Axios) with an EDDN API client
- Data format will change from parsed HTML to structured JSON from EDDN's schema
- The service layer (`services/market.js`, etc.) will need to adapt to the new data source
- Inara.cz scraping may persist only for data not available through EDDN (certain metadata, historical trends, players data/ships, or other specifics)

This change primarily affects the **services/** layer. Controllers, CLI, and MCP interfaces remain unchanged.

---

## Adding a New Search Type

Each new search type needs:

- A controller file in `controllers/<category>-search.js`
- A service module in `services/<category>.js` (or extend an existing one)
- An MCP tool registration in `mcp/tools.js`
- NL parsing patterns in `cli/args.js` (`parseNaturalLanguage`)
- Data fetching logic (scraper or API client depending on data source)
- An output formatter

Shared infrastructure (session management, cache, pagination, dictionaries) is reused across all search types.
