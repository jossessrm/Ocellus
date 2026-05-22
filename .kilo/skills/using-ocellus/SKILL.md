---
name: using-ocellus
description: Provides guidance for using the Ocellus MCP server to search Elite Dangerous commodity markets via Inara.cz. Covers trade loop planning, fleet carrier usage, travel time estimation, and result interpretation for end-user display.
---

v1.0.0

# Elite Dangerous Market Search Agent

If user specifies it's a TEST, just perform the query and return the result without elaborating in further calculations nor searching trade routes

## User Inputs Required

Before searching, ask the user:

1. **Cargo capacity** (tons)
2. **Jump range laden** and **jump range empty** (Ly)
3. **Ship size**: Large pad required?
4. **Ship type**: Nimble (Krait Phantom, Mandalay, Type 8) or sluggish (Type 9, Panther Clipper, Imperial Cutter)
   NOTE: smaller ships can use M and L docking platforms. Thus, if a station has an L pad, every ship can land. Do not repeat query for smaller platforms than indicated by User
5. **Market operation**: We need to BUY or to SELL to a station?

---

## Tools

### Ocellus Trade Data (ocellus_search_commodity)

- By default Ocellus will display only 20 results per page, to a max of 100 results (Inara limitation)
- When researching best routes, it is best to show 100 results per page.
- After a search, use REPL pagination commands (`next`, `prev`, `pagesize <N>`, `page <N>`) to navigate results without re-querying Inara — the cache serves subsequent pages.
- Pay special attention to the command issued to Ocellus: BUY or SELL

### Playwright

- Do not take Screenshots, this Agent cant use them.
- **Station market (usually not needed):** `https://inara.cz/elite/station-market/ID/`
  NOTE: Inara swaps the SELL/BUY column. When a station is purchasing a commodity, it will show a DEMAND and the price will be in "SELL" column. The same is applied in reverse: if the station is selling a commodity, it will have SUPPLY and the price will be displayed on the "BUY" column.

---

## Ocellus CLI Query Syntax

The CLI uses a **Sub-Command Router** that automatically detects the input style after the `search` keyword. Both modes work in single-command (`npm run cli -- ...`) and REPL contexts.

### Natural Language Mode

The CLI uses natural language parsing for all queries:

```
search <natural language sentence>
```

Extractable fields and the patterns used:

| Field              | Trigger patterns                                                     |
|--------------------|----------------------------------------------------------------------|
| **mode**           | `where to buy`, `where to sell`, `w2buy`, `w2sell`, `buying`, `selling` |
| **system**         | `near <name>`, `in system <name>`, `around <name>`, `at <name>`     |
| **pad size**       | `small pad`, `medium pad`, `large pad`, `pad s`, `pad m`, `pad l`   |
| **maxSystemDistance** | `within <N> ly`, `max distance <N> ly`, `max <N> ly`            |
| **orderBy**        | `sort by price`, `sort by supply`, `sort by demand`, `sort by distance`, `sort by update` |
| **minSupplyOrDemand** | `min supply <N>`, `min demand <N>`                               |
| **maxPriceAge**    | `max age <N>`                                                        |
| **surfaceStations** | `include planets`, `surface stations`, `planetary`                  |
| **fleetCarriers**  | `fleet carriers`, `fleet carrier`, `include carriers`, `use fc`, `allow fc`, `with fc` |
| **resultsPerPage** | `pagesize <N>`, `page size <N>`, `<N> results per page`, `<N> per page`                       |
| **pageNumber**     | `page <N>`, `page number <N>`, `show page <N>`, `go to page <N>`, `display page <N>`         |
| **commodity**      | All known phrases are stripped; remainder is fuzzy-matched via `matchCommodity()` (Fuse.js) |

Examples:
```
search where to buy tritium near manhari
search w2b gold near sol large pad within 50 ly
search where to sell painite near sol fleet carriers sort by price
search buy tritium near shinrarta dezhra use fc
search where to buy tritium near manhari within 100 ly min supply 50000 sort by price
search where to sell painite near sol pagesize 50
search w2b tritium near manhari page 2
search buy gold near sol 10 per page
```

In the REPL, after running a search, navigate pages with standalone commands:
```
next         Next page
prev         Previous page
first        First page
last         Last page
page 5       Jump to page 5
pagesize 25  Change to 25 results per page (resets to page 1)
```

---

## Travel Time Definitions

### Jump Timing

- **First jump:** 34s (warmup + jump animation)
- **Subsequent jumps:** 44s (nimble) / 49s (sluggish) — includes 10s cooldown
  - Nimble ships fly around the star during cooldown, immediately jump when ready
  - Sluggish ships take 15s to navigate around star, wait 5s extra penalty

### Station Timing (per visit)

| Action          | Nimble Ships | Sluggish Ships |
| --------------- | ------------ | -------------- |
| Approach + dock | ~35-50s      | ~50-70s        |
| Market activity | ~25s         | ~25s           |
| Undock + depart | ~35-65s      | ~45-90s        |

### Planetary surface (per visit)

| Action              | Nimble Ships | Sluggish Ships |
| ------------------- | ------------ | -------------- |
| Orbital SuperCruise | ~60s         | ~60s           |
| Approach + dock     | ~25s         | ~40s           |
| Market activity     | ~25s         | ~25s           |
| Undock + depart     | ~25s         | ~40s           |

### Supercruise

- **Per arrival:** ~10-25s (straight line, no ship-size penalty)
- **If planet:** double time if close, triple if far away (requires slow approach)

### Fleet Carrier (per visit)

- **Approach + dock:** ~10-15s (small mass lock, near-instant takeoff)
- **Load/unload:** ~15s
- **Undock + depart:** ~5-10s

### Supercruise Travel Times (reference)

| Distance               | Nimble Ships | Sluggish Ships |
| ---------------------- | ------------ | -------------- |
| Short (<500 Ls)        | 15-30s       | 30-45s         |
| Medium (500-5,000 Ls)  | 30-45s       | 30-45s         |
| Long (5,000-30,000 Ls) | 45-90s       | 45-90s         |

**Nimble examples:** Krait Phantom, Mandalay, DBX, Phantom, Courier, Chieftain
**Sluggish examples:** Type 9, Panther Clipper, Type 10, Corvette, Cutter

---

## Route Calculation

### Step 1: Find Source Stations

Query Ocellus within `maxSystemDistance` = laden range. Filter by `minSupply: 50000` and pad size matching ship.

### Step 2: Identify Station Types

For top candidates, check Inara. Discard surface ports unless profit delta justifies the descent time.

### Step 3: Filter by Jump Constraints

- **Laden path:** Suggested distance: 2 jumps laden if the unladen return is within one jump. So pick the smallest: 2x laden vs 1x unladen
- Some routes require to travel longer distances. Do this if needed.
- For even longer routes, compare flight time with and without using a Fleet Carrier as a specialized heavy hauler.

### Step 4: Calculate Profit & Rate

**Direct route:**

```
station_time_per_visit = approach_dock + market_activity + undock_depart
total_direct = first_jump + ((jumps - 1) × subsequent_jumps) + (jumps × SC_travel) + (2 × station_time_per_visit)
```

**Carrier-assisted route (2 jumps for hauler, carrier does the long haul):**
NOTE: When using a Fleet Carrier, commanders usually fills them with at least 10.000 tons before jumping to the destination. It's a super-massive big ship that cannot interact with stations, forcing commanders to manually move in and out the commodities with regular ships.

```
carrier_station_time_per_visit = carrier_approach_dock + carrier_market_activity + carrier_undock_depart
total_carrier = first_jump + subsequent_jumps + (2 × SC_travel) + (2 × station_time_per_visit) + (2 × carrier_station_time_per_visit)
# Station time: 2 visits (supply + destination), Carrier time: 2 visits (load + unload)
```

**Trips per hour:**

```
trips_per_hour = 3600 / total_time
credits_per_hour = profit_per_trip × trips_per_hour
```

### Step 5: Output format:

- Rank by credits/hour
- Always show this columns: Station type, Station, System, commodity, distance(to station) in Ls, distance in Ly, profit per trip, profit per hour, jumps unladen, jumps laden, time estimated to complete one loop

### Community Goals:

Usually CG heavily affects the market of the source station. Always fetch market data directly from the CG main station to update the prices
To check which stations may be affected and what commodities are being requested, fetch https://inara.cz/elite/communitygoals/