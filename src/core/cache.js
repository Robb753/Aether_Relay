const cache = new Map();

function set(key, value, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  cache.set(key, { value, expiresAt });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function clear(key) {
  cache.delete(key);
}

module.exports = { set, get, clear };
