# Ocellus-MCP

Model-Context-Protocol server for scraping Elite Dangerous data from [Inara.cz](https://inara.cz).

## Status

**Early Development** — Only commodity market search is implemented.

## Features

- **Commodity Market Search** — Search for stations selling specific commodities near a system
- Session cookie management for Inara requests
- Fuzzy commodity name matching (handles typos and partial names)
- Comprehensive filtering: pad size, surface stations, fleet carriers, stronghold carriers, system/station distance, price age/condition, supply/demand, power, powerplay state, minor faction
- **Result caching** — In-memory cache with 5-minute TTL; cache keys include the market operation (`mode`) as the primary discriminator so buy vs sell results are never mixed up
- **Sub-Command Router** — After the `search` keyword, the parser intelligently routes to either strict flag parsing or natural language parsing, all contained within `args.js`
- **NL "fc" shorthand** — `use fc`, `allow fc`, `with fc` all recognized as fleet carrier requests in natural language mode
- **NL pagination** — `pagesize <N>`, `<N> results per page`, `page size <N>`, `page <N>`, `show page <N>`, and more in natural language mode
- **REPL page navigation** — `next`, `prev`, `first`, `last`, `page <N>`, `pagesize <N>` as standalone commands in the interactive REPL

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

Call cli task to run in command-line mode. The CLI uses a **Sub-Command Router** that automatically detects whether you're using strict flags or natural language after the `search` keyword.

**Single command (strict flags):**

```bash
npm run cli -- search buy -c Tritium -s Manhari -pad L -d 50
```

**Single command (natural language):**

```bash
npm run cli -- search where to buy tritium near manhari
npm run cli -- search w2b gold near sol large pad within 50 ly
npm run cli -- search where to sell painite near sol fleet carriers sort by price
npm run cli -- search buy tritium near shinrarta use fc
npm run cli -- "search where to sell painite near sol pagesize 50"
npm run cli -- "search w2b tritium near manhari page 2"
```

**Interactive REPL:**

```bash
npm run cli
```

In the REPL, type `help` for usage, then enter searches in either flag or natural language form:

```
ocellus> search buy -c Tritium -s Manhari -pad L -d 50
ocellus> search where to buy tritium near manhari
ocellus> search w2b gold near sol large pad within 50 ly
ocellus> search where to sell painite near sol fleet carriers sort by price
ocellus> search buy tritium near shinrarta use fc
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

```bash
npm run cli -- clearcache
```

In the REPL, type `clearcache` to clear the in-memory cache — useful when market data may have updated and you want fresh results on the next search.

## Available Tool

### `search_commodity`

Search Inara for commodity prices near a system.

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
| `resultsPerPage`     | number                | no       | `20`         | Results per page (`0` disables pagination and returns all results). Flag aliases: `-pagesize`, `-perpage`. NL: `pagesize <N>`, `<N> results per page`, `page size <N>` |
| `pageNumber`         | number                | no       | `1`          | Which page of results to display (only used when `resultsPerPage > 0`). NL: `page <N>`, `page number <N>`, `show page <N>`, `go to page <N>`                           |

### PowerPlay

Elite Dangerous has 12 Powers, each aligned to one of the three superpowers or independent, with a home system (headquarters) and a leader.

| Power                | Superpower  | Headquarters / Capital | Leader                             |
| -------------------- | ----------- | ---------------------- | ---------------------------------- |
| Aisling Duval        | Empire      | Cubeo                  | Princess Aisling Duval             |
| Arissa Lavigny-Duval | Empire      | Kamadhenu              | Emperor Arissa Lavigny-Duval       |
| Denton Patreus       | Empire      | Eotienses              | Senator Denton Patreus             |
| Yuri Grom            | Independent | LHS 215                | Yuri Grom                          |
| Zemina Torval        | Empire      | Synteini               | Senator Zemina Torval              |
| Archon Delaine       | Independent | Harma                  | Pirate King Archon Delaine         |
| Edmund Mahon         | Alliance    | Gateway                | Prime Minister Edmund Mahon        |
| Felicia Winters      | Federation  | Rhea                   | President Felicia Winters          |
| Jerome Archer        | Federation  | Nanomam                | Shadow President Jerome Archer     |
| Li Yong-Rui          | Independent | Lembava                | CEO Li Yong-Rui                    |
| Nakato Kaine         | Alliance    | Tionisla               | Shadow Prime Minister Nakato Kaine |
| Pranav Antal         | Independent | Midgard                | Guru Pranav Antal                  |

### PowerPlay states

Systems under a Power's influence can be in one of the following states. Inara's advanced search allows filtering by these states.

| State         | Description                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `None`        | System is not under any Power influence.                                              |
| `Fortified`   | Power's presence is strongly reinforced; harder for rivals to flip.                   |
| `Stronghold`  | Maximum reinforcement; acts as a permanent stronghold for the Power.                  |
| `Acquired`    | Recently taken over by a Power; in the process of being consolidated.                 |
| `Contested`   | Actively fought over between two or more Powers.                                      |
| `Expansion`   | Power is expanding into this system from an adjacent controlled system.               |
| `Exploited`   | Within the exploitation range of a controlled system but not directly controlled.     |
| `Control`     | Directly controlled by the Power (Powerplay 2.0 replaces old "Controlled" with this). |
| `Preparation` | Being prepared for expansion (legacy state, less common in Powerplay 2.0).            |
| `Undermined`  | Rival Power has successfully undermined influence here.                               |
| `Unoccupied`  | Not claimed or influenced by any Power.                                               |

### BGS states

As a result of the background simulation, any populated system can have any of these states. The "Incompatible with" column lists states that cannot coexist with the given state for the same faction in the same system.

| State                            | Description                                                                                          | Incompatible with       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| `None`                           | Default state; no active effects.                                                                    | —                       |
| `Boom`                           | Increased trade profits, more passenger missions, higher ship/module availability.                   | `Bust`                  |
| `Bust`                           | Reduced trade profits, fewer missions available.                                                     | `Boom`                  |
| `Civil Liberty`                  | Increased security, fewer illegal missions and black market opportunities.                           | `Lockdown`              |
| `Civil Unrest`                   | Reduced security, increased illegal mission availability.                                            | —                       |
| `Lockdown`                       | Security increased, black market disabled, fines/bounties increase.                                  | `Civil Liberty`         |
| `Outbreak`                       | Increased demand for medicines, reduced supply of certain goods, fewer combat missions.              | —                       |
| `Famine`                         | Increased demand for food, lower influence gains from trade.                                         | —                       |
| `Drought`                        | Increased demand for water and food resources.                                                       | —                       |
| `Infrastructure Failure`         | Reduced station services, increased demand for repair commodities (Polymers, CMM Composite, etc).    | —                       |
| `Natural Disaster`               | Increased demand for rescue commodities (Basic Medicines, Evacuation Shelters, etc).                 | —                       |
| `Terrorist Attack` / `Terrorism` | Station services disrupted, increased demand for combat stabilisers and rescue items.                | —                       |
| `Blight`                         | Reduced crop yields, increased demand for agrichemicals and pest-control goods.                      | —                       |
| `War`                            | Conflict between two factions in the same system; combat missions available; station repairs halted. | `Civil War`, `Election` |
| `Civil War`                      | Conflict between two factions for system control; combat missions available.                         | `War`, `Election`       |
| `Election`                       | Non-violent conflict between two factions for influence control.                                     | `War`, `Civil War`      |
| `Expansion`                      | Faction preparing to expand into a neighbouring system; increases influence.                         | `Retreat`               |
| `Retreat`                        | Faction losing influence and at risk of leaving the system; reduces influence further.               | `Expansion`             |
| `Investment`                     | Increased system development; higher ship/module variety and availability.                           | —                       |
| `Pirate Attack`                  | Increased pirate activity; trade routes disrupted; demand for security and weapons.                  | —                       |
| `Under Repairs` / `Repair`       | Station undergoing repairs after a conflict; limited services.                                       | —                       |
