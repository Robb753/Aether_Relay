const cache = require("../core/cache");
const logger = require("../core/logger");

const ISS_URL = "https://api.open-notify.org/iss-now.json";
const TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

const CACHE_KEY_ISS = "iss_position";
const CACHE_KEY_TLE = "iss_tle";
const CACHE_TTL_ISS = 5000; // 5 secondes
const CACHE_TTL_TLE = 3600000; // 1 heure

async function fetchISSPosition() {
  const cached = cache.get(CACHE_KEY_ISS);
  if (cached) return cached;

  try {
    const res = await fetch(ISS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const position = {
      latitude: parseFloat(data.iss_position.latitude),
      longitude: parseFloat(data.iss_position.longitude),
      altitude: 408,
      timestamp: data.timestamp,
    };

    cache.set(CACHE_KEY_ISS, position, CACHE_TTL_ISS);
    return position;
  } catch (err) {
    logger.error(`Fetch ISS position échoué : ${err.message}`);
    return null;
  }
}

async function fetchTLE() {
  const cached = cache.get(CACHE_KEY_TLE);
  if (cached) return cached;

  logger.info("Fetch TLE ISS depuis CelesTrak...");

  try {
    const res = await fetch(TLE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text
      .trim()
      .split("\n")
      .map((l) => l.trim());

    if (lines.length < 3) throw new Error("TLE invalide");

    const tle = {
      name: lines[0],
      line1: lines[1],
      line2: lines[2],
    };

    cache.set(CACHE_KEY_TLE, tle, CACHE_TTL_TLE);
    logger.info("TLE ISS fetché avec succès");
    return tle;
  } catch (err) {
    logger.error(`Fetch TLE échoué : ${err.message}`);
    return null;
  }
}

module.exports = { fetchISSPosition, fetchTLE };
