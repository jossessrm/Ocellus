/**
 * Output formatting service. Converts structured market results into formatted text tables
 * for CLI and MCP consumption.
 */

/**
 * Format market search results into a text table for CLI/MCP output.
 * @param {Array<Object>} results - Market results from Inara
 * @param {Object} metadata - Search metadata including filters, URL, timestamps
 * @returns {string} Formatted text output
 */
function formatMarketResults(results, metadata) {
  const { fetchTime, url, warnings = [], filters = {}, mode = "buy", pagination = {} } = metadata;

  // Define output table column layout (order, labels, alignment)
  const COLUMNS = [
    { key: "type", label: "TYPE", align: "left" },
    { key: "station", label: "STATION", align: "left" },
    { key: "system", label: "SYSTEM", align: "left" },
    { key: "pad", label: "PAD", align: "center" },
    { key: "stDist", label: "ST DIST", align: "right" },
    { key: "distance", label: "DISTANCE", align: "right" },
    { key: "supply", label: "SUPPLY", align: "right" },
    { key: "price", label: "PRICE", align: "right" },
    { key: "ppBonus", label: "PP+", align: "left" },
    { key: "blackMarket", label: "BM", align: "left" },
    { key: "updated", label: "UPDATED", align: "right" },
  ];

  // Returns the sort-direction triangle indicator based on the active order
  const sortIndicator = (order) => {
    if (order === "price" || order === "supply" || order === "demand") return "▼";
    return "▲";
  };

  const MIN_TOTAL_WIDTH = 150;
  const SEPARATOR = "   ";
  const SEPARATOR_WIDTH = SEPARATOR.length;

  // Compute optimal column widths: natural column width from data, then pad to minimum total width
  const computeColumnWidths = (headers, data) => {
    const numCols = headers.length;
    const widths = headers.map((h) => h.label.length);
    for (const row of data) {
      for (let i = 0; i < numCols; i++) {
        const val = row[headers[i].key];
        if (val && String(val).length > widths[i]) {
          widths[i] = String(val).length;
        }
      }
    }
    const stationIdx = headers.findIndex((h) => h.key === "station");
    if (stationIdx !== -1) widths[stationIdx] += 2;

    const naturalTotal = widths.reduce((s, w) => s + w, 0) + (numCols - 1) * SEPARATOR_WIDTH + 7;
    if (naturalTotal >= MIN_TOTAL_WIDTH) return widths;
    let deficit = MIN_TOTAL_WIDTH - naturalTotal;
    while (deficit > 0) {
      for (let i = 0; i < numCols && deficit > 0; i++) {
        widths[i]++;
        deficit--;
      }
    }
    return widths;
  };

  // Format a single data row into a string with column-aligned text
  const formatRow = (row, colDefs, widths) => {
    return colDefs
      .map((col, i) => {
        const val = String(row[col.key] || "");
        if (col.key === "station") return val.padStart(widths[i]);
        if (col.align === "right") return val.padStart(widths[i]);
        if (col.align === "center") {
          const left = Math.floor((widths[i] - val.length) / 2);
          const right = widths[i] - val.length - left;
          return " ".repeat(left) + val + " ".repeat(right);
        }
        return val.padEnd(widths[i]);
      })
      .join(SEPARATOR);
  };

  // Build column headers with sort indicators
  const sortCol = filters.orderBy || "distance";
  const triangle = sortIndicator(sortCol);
  const supplyLabel = mode === "buy" ? "SUPPLY" : "DEMAND";
  const headerCols = COLUMNS.map((col) => {
    let label = col.label;
    if (col.key === "distance" && sortCol === "distance") label = `${col.label} ${triangle}`;
    if (col.key === "supply") label = sortCol === "supply" || sortCol === "demand" ? `${supplyLabel} ${triangle}` : supplyLabel;
    if (col.key === "price" && sortCol === "price") label = `PRICE ${triangle}`;
    if (col.key === "updated" && sortCol === "update") label = `UPDATED ${triangle}`;
    return { key: col.key, label, align: col.align };
  });

  // Determine data freshness label and pagination slice
  const fetchDate = new Date(fetchTime);
  const ageMs = Date.now() - fetchTime;
  const isCached = ageMs > 10_000;
  const ageLabel = isCached ? ` (${Math.round(ageMs / 60_000)}m ago)` : "";
  const currentTime = `${fetchDate.toLocaleString()}${ageLabel} ${isCached ? "(cached)" : ""}`;

  let displayResults = results;
  let paginationInfo = "";
  if (pagination.enabled && results.length > 0) {
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / pagination.rFesultsPerPage);
    const safePage = Math.min(Math.max(1, pagination.pageNumber), totalPages);
    const start = (safePage - 1) * pagination.resultsPerPage;
    const end = start + pagination.resultsPerPage;
    displayResults = results.slice(start, end);
    paginationInfo = ` (${pagination.resultsPerPage} per page, page ${safePage} of ${totalPages})`;
  }

  // Compute column widths from displayed results and render the header row
  const widths = computeColumnWidths(headerCols, displayResults);
  const header = formatRow(Object.fromEntries(headerCols.map((h) => [h.key, h.label])), headerCols, widths);

  // Build human-readable filter summary string for output header
  const filterSummary = [
    `${filters.padSize || "large"} pad`,
    filters.surfaceStations !== "no" ? `surface: ${filters.surfaceStations || "no"}` : null,
    filters.fleetCarriers !== "no" ? `carriers: ${filters.fleetCarriers || "no"}` : null,
    filters.strongholdCarriers !== "no" ? `stronghold: ${filters.strongholdCarriers || "no"}` : null,
    filters.maxSystemDistance > 0 ? `max ${filters.maxSystemDistance} Ly` : null,
    filters.orderBy ? filters.orderBy : null,
    filters.maxPriceAge ? `max ${filters.maxPriceAge}h price age` : null,
    filters.priceCondition ? `+${filters.priceCondition}% price` : null,
    filters.minSupplyOrDemand ? `min ${filters.minSupplyOrDemand} supply/demand` : null,
    filters.power ? `power: ${filters.power}` : null,
    filters.powerplayState?.length ? `powerplay: ${filters.powerplayState.join(", ")}` : null,
    filters.minorFaction ? `faction: ${filters.minorFaction}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Assemble the final output string
  const summaryIndicator = mode === "buy" ? "Where to buy? " : "Where to sell? ";
  const innerText =
    displayResults.length > 0
      ? `[${currentTime}] ${summaryIndicator} Found ${results.length} stations ${mode === "buy" ? "selling" : "buying"} ${filters.commodity || "commodity"} near ${filters.system}${paginationInfo} (${filterSummary}):${warnings.length ? " ⚠️ " + warnings.join(", ") : ""}\n\n${header}\n` +
        displayResults.map((row) => formatRow(row, headerCols, widths)).join("\n")
      : `[${currentTime}] No results found for ${filters.commodity || "commodity"} near ${filters.system} with your criteria. Try expanding your search radius or checking a different system.${warnings.length ? " ⚠️ " + warnings.join(", ") : ""}`;

  return "Fetching market data from " + url + "\n\n" + innerText;
}

export { formatMarketResults };
