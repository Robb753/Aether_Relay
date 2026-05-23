const { fetchRLLLaunches } = require("./rll");
const cache = require("../core/cache");
const logger = require("../core/logger");

const API_URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/";
const CACHE_KEY = "launches";
const CACHE_TTL = 30 * 60 * 1000;

async function fetchFromTSD() {
  try {
    const response = await fetch(
      `${API_URL}?limit=25&ordering=net&mode=detailed`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.results.map((launch) => ({
      id: launch.id,
      name: launch.name,
      status: launch.status?.abbrev || "TBD",
      statusName: launch.status?.name || "To Be Determined",
      net: launch.net,
      agency: launch.launch_service_provider?.name || "Unknown",
      rocket: launch.rocket?.configuration?.name || "Unknown",
      pad: launch.pad?.name || "Unknown",
      location: launch.pad?.location?.name || "Unknown",
      missionName: launch.mission?.name || null,
      missionDescription: launch.mission?.description || null,
      missionOrbit: launch.mission?.orbit?.name || null,
      imageUrl: launch.image || null,
      source: "tsd",
    }));
  } catch (err) {
    logger.error(`Fetch TSD échoué : ${err.message}`);
    return [];
  }
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

async function fetchLaunches() {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    logger.info("Launches servies depuis le cache");
    return cached;
  }

  const [tsdData, rllData] = await Promise.allSettled([
    fetchFromTSD(),
    fetchRLLLaunches(),
  ]);

  const tsd = tsdData.status === "fulfilled" ? tsdData.value : [];
  const rll = rllData.status === "fulfilled" ? rllData.value : [];

  const tsdNames = new Set(tsd.map((l) => normalizeName(l.name)));
  const rllUnique = rll.filter((l) => !tsdNames.has(normalizeName(l.name)));

  const merged = [...tsd, ...rllUnique].filter((l) => {
    if (!l.net) return true;
    return new Date(l.net) > new Date();
  });

  cache.set(CACHE_KEY, merged, CACHE_TTL);
  logger.info(
    `Merged — TSD: ${tsd.length}, RLL new: ${rllUnique.length}, total: ${merged.length}`,
  );
  return merged;
}

module.exports = { fetchLaunches };
