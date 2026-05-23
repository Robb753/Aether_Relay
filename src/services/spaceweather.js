const cache = require("../core/cache");
const logger = require("../core/logger");

const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const SOLAR_URL =
  "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
const WIND_URL =
  "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json";

const CACHE_KEY = "spaceweather";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchSpaceWeather() {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    logger.info("Space weather servie depuis le cache");
    return cached;
  }

  logger.info("Fetch space weather depuis NOAA...");

  try {
    const [kpRes, solarRes, windRes] = await Promise.all([
      fetch(KP_URL),
      fetch(SOLAR_URL),
      fetch(WIND_URL),
    ]);

    const kpData = await kpRes.json();
    const solarData = await solarRes.json();
    const windData = await windRes.json();

    // Kp index — dernière valeur
    const lastKp = kpData[kpData.length - 1];
    const kp = parseFloat(lastKp?.kp_index ?? 0).toFixed(1);

    // Flux X-ray — dernière valeur canal long (0.1–0.8 nm)
    const lastSolar = solarData[solarData.length - 1];
    const xray = parseFloat(lastSolar?.flux ?? 0);

    // Vent solaire — dernière ligne [time, density, speed, temperature]
    const lastWind = windData[windData.length - 1];
    const windSpeed = Math.round(parseFloat(lastWind?.[2] ?? 0));
    const windDensity = parseFloat(lastWind?.[1] ?? 0).toFixed(1);

    const result = {
      kp,
      kpLevel: kpLevel(parseFloat(kp)),
      xray: xrayClass(xray),
      windSpeed,
      windDensity,
      updatedAt: new Date().toISOString(),
    };

    cache.set(CACHE_KEY, result, CACHE_TTL);
    logger.info(`Space weather fetchée — Kp: ${kp}, Vent: ${windSpeed} km/s`);

    return result;
  } catch (err) {
    logger.error(`Fetch space weather échoué : ${err.message}`);
    return null;
  }
}

// Niveau d'activité géomagnétique
function kpLevel(kp) {
  if (kp >= 8) return { label: "EXTREME", color: "red" };
  if (kp >= 6) return { label: "SEVERE", color: "red" };
  if (kp >= 5) return { label: "STORM", color: "yellow" };
  if (kp >= 4) return { label: "ACTIVE", color: "yellow" };
  if (kp >= 2) return { label: "UNSETTLED", color: "accent" };
  return { label: "QUIET", color: "green" };
}

// Classe de l'éruption solaire X-ray
function xrayClass(flux) {
  if (flux >= 1e-3) return "X";
  if (flux >= 1e-4) return "M";
  if (flux >= 1e-5) return "C";
  if (flux >= 1e-6) return "B";
  return "A";
}

module.exports = { fetchSpaceWeather };
