const logger = require("../core/logger");
const { fetchLaunches } = require("./launches");
const { switchScene, updateBrowserSource } = require("./obsws");
const store = require("../core/store");

const ALERT_MINUTES = 15;
const RETURN_MINUTES = 45;
const CHECK_INTERVAL = 60000;

const state = {
  launchModeActive: false,
  scheduledLaunchId: null,
  returnTimeout: null,
};

function setStreamUrl(launchId, url) {
  store.setStreamUrl(launchId, url);
  logger.info(`Stream URL enregistrée pour launch ${launchId}`);
}

function getStreamUrl(launchId) {
  return store.getAllStreamUrls()[launchId] || null;
}

function getAllStreamUrls() {
  return store.getAllStreamUrls();
}

async function activateLaunchMode(launch) {
  if (state.launchModeActive) return;

  logger.info(`🚀 LAUNCH MODE — ${launch.name}`);
  state.launchModeActive = true;
  state.scheduledLaunchId = launch.id;

  const url = store.getAllStreamUrls()[launch.id] || null;

  if (url) {
    await updateBrowserSource("LaunchStream", url);
    logger.info(`Browser Source mis à jour : ${url}`);
  } else {
    logger.warn(
      `Aucune stream URL pour ${launch.name} — switch scène sans vidéo`,
    );
  }

  await switchScene("Launch Mode");

  const returnMs = (RETURN_MINUTES + ALERT_MINUTES) * 60 * 1000;
  if (state.returnTimeout) clearTimeout(state.returnTimeout);
  state.returnTimeout = setTimeout(async () => {
    await deactivateLaunchMode();
  }, returnMs);
}

async function deactivateLaunchMode() {
  if (!state.launchModeActive) return;

  logger.info("Retour scène Dashboard");
  state.launchModeActive = false;
  state.scheduledLaunchId = null;

  await switchScene("Dashboard");

  if (state.returnTimeout) {
    clearTimeout(state.returnTimeout);
    state.returnTimeout = null;
  }
}

async function tick() {
  // ← CORRECTION 1 : inclut les custom launches
  const launches = await fetchLaunches();
  const custom = store.getCustomLaunches();
  const all = [...launches, ...custom].filter((l) => l.net);

  if (!all || all.length === 0) return;

  const now = new Date();

  for (const launch of all) {
    const net = new Date(launch.net);
    const diffMs = net - now;
    const diffMin = diffMs / 60000;

    // ← CORRECTION 2 : fenêtre élargie à T+5 min
    if (diffMin <= ALERT_MINUTES && diffMin > -5) {
      if (!state.launchModeActive) {
        await activateLaunchMode(launch);
      }
      return;
    }
  }
}

function start() {
  logger.info(
    `Scheduler démarré — vérification toutes les ${CHECK_INTERVAL / 1000}s`,
  );
  tick();
  setInterval(tick, CHECK_INTERVAL);
}

function getState() {
  return {
    launchModeActive: state.launchModeActive,
    scheduledLaunchId: state.scheduledLaunchId,
  };
}

module.exports = {
  start,
  setStreamUrl,
  getStreamUrl,
  getAllStreamUrls,
  deactivateLaunchMode,
  activateLaunchMode,
  getState,
};
