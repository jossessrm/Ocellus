# Ocellus

Model-Context-Protocol server AND standalone cli tool used for searching Elite Dangerous commodity markets on [Inara.cz](https://inara.cz).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design document and future expansion plans.

## Status

**Early Development** — Only commodity market search is currently implemented.

## Features

- **Commodity Market Search** — Find stations selling or buying specific commodities near a system
- **Natural Language Parser** — Express searches in plain English: `search where to buy tritium near manhari`
- **Comprehensive Filtering** — Pad size, surface stations, fleet carriers, system/station distance, price age/condition, supply/demand, PowerPlay, minor faction
- **Fuzzy Name Matching** — Fuse.js (threshold 0.45) handles typos and partial commodity names across 340+ entries, with Jaccard token similarity fallback for multi-word names
- **Result Caching** — In-memory cache with 5-minute TTL, disk-persisted across sessions
- **Pagination** — Browse results with `next`, `prev`, `page <N>`, `pagesize <N>`

## Installation

```bash
npm install
```

## Usage

### MCP Server (default)

```bash
npm run mcp
```

The server communicates via STDIO, designed for use with MCP-compatible AI agents.

### CLI Mode

Call cli task to run in command-line mode. The CLI uses natural language parsing for all queries.

```bash
npm run cli -- search where to buy tritium near manhari
npm run cli -- search w2b gold near sol large pad within 50 ly
npm run cli -- search where to sell painite near sol sort by price
npm run cli -- search buy tritium near shinrarta dezhra use fc
```

**Interactive REPL:**

You can enter an interactive mode by running

```bash
npm run cli
```

In the REPL, type `help` for usage, then enter searches in natural language form:

```
ocellus> search where to buy tritium near manhari
ocellus> search w2b gold near sol large pad within 50 ly
ocellus> search where to sell painite near sol fleet carriers sort by price
ocellus> search buy tritium near shinrarta dezhra use fc
```

In the REPL, after a search, navigate results with:

```
ocellus> next              Next page
ocellus> prev              Previous page
ocellus> first             First page
ocellus> last              Last page
ocellus> page 5            Jump to page 5
ocellus> pagesize 25       Change to 25 results per page (resets to page 1)
```

**Clear cache:**

Invalidates the current search cache to force a live data refresh for the next queries.

- **CLI**: Run `npm run cli -- clearcache`
- **REPL**: Type `clearcache`

## Available Tools

- Search commodity markets
- Clear cache

### `search_commodity`

Search Inara for commodity market prices near a specified reference system.

| Parameter            | Type                  | Required | Default      | Description                                                                                                                                                            |
| -------------------- | --------------------- | -------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`               | enum                  | **yes**  | `"Buy"`      | Search direction: `"where to buy"` (find stations selling the commodity) or `"where to sell"` (find stations buying it)                                                |
| `commodity`          | string                | **yes**  | —            | Commodity name (e.g., `"Tritium"`, `"Gold"`). Fuzzy matching handles typos and partial names.                                                                          |
| `system`             | string                | **yes**  | —            | Reference star system (e.g., `"Sol"`)                                                                                                                                  |
| `padSize`            | enum                  | no       | `"L"`        | Minimum landing pad: `"S"`, `"M"`, or `"L"`                                                                                                                            |
| `surfaceStations`    | enum                  | no       | `"no"`       | Include surface ports: `"yes"`, `"yes_no_odyssey"` (filter out Odyssey-only settlements), `"no"`                                                                       |
| `fleetCarriers`      | enum                  | no       | `"no"`       | Include Fleet Carriers: `"yes"`, `"yes_updated"` (recently refreshed data only), `"no"`. NL: `use fc`, `allow fc`, `with fc`                                           |
| `strongholdCarriers` | enum                  | no       | `"no"`       | Include stronghold carriers: `"yes"`, `"only_pledged"`, `"no"`                                                                                                         |
| `maxSystemDistance`  | number                | no       | `0`          | Maximum jump distance in Ly from the reference system (`0` = no limit)                                                                                                 |
| `maxStationDistance` | number                | no       | `0`          | Maximum distance from arrival star in Ls (`0` = no limit)                                                                                                              |
| `orderBy`            | enum                  | no       | `"distance"` | Sort order: `"price"`, `"supply"`, `"demand"`, `"distance"`, `"update"`                                                                                                |
| `maxPriceAge`        | number                | no       | —            | Max age of market data in hours (e.g., `24`). Leave unset for any age.                                                                                                 |
| `priceCondition`     | number \| `"anarchy"` | no       | `0`          | Price quality: integer `0`–`99` (percentage better than galactic average), or `"anarchy"` for lawless black markets only.                                              |
| `minSupplyOrDemand`  | number                | no       | —            | Minimum supply (buy mode) or demand (sell mode) quantity. Leave unset for no minimum.                                                                                  |
| `power`              | string                | no       | —            | Filter by Powerplay power name (e.g., `"Aisling Duval"`) or `"none"`                                                                                                   |
| `powerplayState`     | string[]              | no       | —            | Filter by Powerplay states (e.g., `["fortified", "expansion"]`)                                                                                                        |
| `minorFaction`       | string                | no       | —            | Filter by local minor faction name                                                                                                                                     |
| `resultsPerPage`     | number                | no       | `20`         | Results per page (`0` disables pagination and returns all results). NL: `pagesize <N>`, `<N> results per page`, `page size <N>` |
| `pageNumber`         | number                | no       | `1`          | Which page of results to display (only used when `resultsPerPage > 0`). NL: `page <N>`, `page number <N>`, `show page <N>`, `go to page <N>`                           |
