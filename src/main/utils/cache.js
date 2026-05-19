import fs from 'fs';
import path from 'path';
import os from 'os';

let cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'ocellus-cache.json');

function getCacheFilePath() {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    return CACHE_FILE;
  } catch {
    return path.join(os.tmpdir(), 'ocellus-cache.json');
  }
}

function loadPersistentCache() {
  const filePath = getCacheFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      cache = new Map(data);
    }
  } catch {}
}

function savePersistentCache() {
  const filePath = getCacheFilePath();
  try {
    const data = JSON.stringify(Array.from(cache.entries()));
    fs.writeFileSync(filePath, data);
  } catch {}
}

function debouncedSave() {
  savePersistentCache();
}

loadPersistentCache();

export function generateCacheKey(params) {
  const { resultsPerPage, pageNumber, _timestamp, ...searchParams } = params;
  return JSON.stringify(searchParams);
}

/**
 * Retrieves cached results for a given key if they exist and are still fresh.
 * Stale entries are automatically deleted.
 *
 * @param {string} cacheKey - The cache key to retrieve.
 * @returns {{ results: object[], timestamp: number } | null} The cached results if they exist and are fresh, otherwise null.
 */
export function getCachedResults(cacheKey) {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }
  return { results: entry.results, timestamp: entry.timestamp };
}

/**
 * Stores results in the cache under the given key.
 *
 * @param {string} cacheKey - The cache key to store under.
 * @param {object[]} results - The results to cache.
 * @param {number} timestamp - The epoch timestamp in milliseconds.
 */
export function setCachedResults(cacheKey, results, timestamp) {
  cache.set(cacheKey, { results, timestamp });
  debouncedSave();
}

/**
 * Prunes all expired entries from the cache.
 * Called at the start of each searchCommodity invocation.
 */
export function invalidateOldEntries() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

/**
 * Clears the entire cache (for testing or manual reset).
 */
export function clearCache() {
  cache.clear();
  try { fs.unlinkSync(getCacheFilePath()); } catch {}
}