import Fuse from "fuse.js";
import { COMMODITY_IDS } from "./url-builder.js";

const COMMODITY_NAMES = Object.keys(COMMODITY_IDS);

const fuse = new Fuse(COMMODITY_NAMES, {
  threshold: 0.45,
  includeScore: true,
  distance: 100,
});

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function normalizeAndTokenize(str) {
  return normalize(str).split(/\s+/).filter(Boolean);
}

function getCommodityByTokens(queryTokens) {
  if (queryTokens.length === 0) return null;
  let best = null;
  let bestScore = Infinity;
  for (const name of COMMODITY_NAMES) {
    const nameTokens = normalizeAndTokenize(name);
    if (nameTokens.length === 0) continue;
    const qSet = new Set(queryTokens);
    const nSet = new Set(nameTokens);
    let intersection = 0;
    for (const t of qSet) {
      if (nSet.has(t)) intersection++;
      else if ([...nSet].some((nt) => nt.includes(t) || t.includes(nt))) intersection += 0.5;
    }
    const union = new Set([...qSet, ...nSet]);
    const jaccard = intersection / union.size;
    if (jaccard > 0) {
      const score = 1 - jaccard;
      if (score < bestScore) {
        bestScore = score;
        best = name;
      }
    }
  }
  return best ? { match: best, score: bestScore } : null;
}

export function matchCommodity(query) {
  if (!query || typeof query !== "string") return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  const results = fuse.search(trimmed, { limit: 1 });
  if (results.length > 0) return { match: results[0].item, score: results[0].score };

  const queryTokens = normalizeAndTokenize(trimmed);
  return getCommodityByTokens(queryTokens);
}

export function getCommoditySuggestions(query, limit = 5) {
  if (!query || typeof query !== "string") return [];
  return fuse.search(query.trim(), { limit }).map((r) => r.item);
}
