const cache = require("../core/cache");
const logger = require("../core/logger");

const BASE_URL = "https://fdo.rocketlaunch.live/json/launches";
const CACHE_KEY = "rll_launches";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchRLLLaunches() {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    logger.info("RLL launches servies depuis le cache");
    return cached;
  }

  logger.info("Fetch launches depuis RocketLaunch.Live...");

  try {
    const apiKey = process.env.RLL_API_KEY;
    const url = apiKey ? `${BASE_URL}/next/25` : `${BASE_URL}/next/5`;

    const headers = apiKey
      ? { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
      : { Accept: "application/json" };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} — ${response.statusText}`);
    }

    const data = await response.json();

    const launches = (data.result || []).map((launch) => {
      // Reconstruit une date NET depuis les champs t0 ou win_open
      const netRaw = launch.t0 || launch.win_open || null;
      const net = netRaw ? new Date(netRaw).toISOString() : null;

      return {
        id: `rll-${launch.id}`,
        name: `${launch.vehicle?.name || "Unknown"} | ${launch.missions?.[0]?.name || "Unknown Payload"}`,
        status: mapStatus(launch.launch_status?.abbrev),
        statusName: launch.launch_status?.description || "TBD",
        net,
        agency: launch.provider?.name || "Unknown",
        rocket: launch.vehicle?.name || "Unknown",
        pad: launch.pad?.name || "Unknown",
        location: launch.pad?.location?.name || "Unknown",
        missionName: launch.missions?.[0]?.name || null,
        missionDescription: launch.missions?.[0]?.description || null,
        missionOrbit: launch.missions?.[0]?.orbit || null,
        imageUrl: null,
        source: "rll",
      };
    });

    cache.set(CACHE_KEY, launches, CACHE_TTL);
    logger.info(`RLL launches fetchées : ${launches.length} résultats`);
    return launches;
  } catch (err) {
    logger.error(`Fetch RLL échoué : ${err.message}`);
    return [];
  }
}

function mapStatus(abbrev) {
  if (!abbrev) return "TBD";
  const a = abbrev.toUpperCase();
  if (a === "GO") return "Go";
  if (a === "TBD") return "TBD";
  if (a === "TBC") return "TBD";
  if (a === "HOLD") return "Hold";
  if (a === "SCRUB") return "Hold";
  return "TBD";
}

module.exports = { fetchRLLLaunches };
