const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const STORE_PATH = path.join(__dirname, "../../data/store.json");

const DEFAULT = {
  streamUrls: {},
  customLaunches: [],
};

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      writeStore(DEFAULT);
      return { ...DEFAULT };
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    logger.error(`Store read échoué : ${err.message}`);
    return { ...DEFAULT };
  }
}

function writeStore(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    logger.error(`Store write échoué : ${err.message}`);
  }
}

function getStreamUrls() {
  return readStore().streamUrls;
}

function setStreamUrl(launchId, url) {
  const store = readStore();
  store.streamUrls[launchId] = url;
  writeStore(store);
  logger.info(`Store — stream URL sauvegardée : ${launchId}`);
}

function getAllStreamUrls() {
  return readStore().streamUrls;
}

function getCustomLaunches() {
  return readStore().customLaunches;
}

function addCustomLaunch(launch) {
  const store = readStore();
  store.customLaunches.push(launch);
  writeStore(store);
  logger.info(`Store — custom launch sauvegardé : ${launch.name}`);
}

function deleteCustomLaunch(id) {
  const store = readStore();
  store.customLaunches = store.customLaunches.filter((l) => l.id !== id);
  writeStore(store);
  logger.info(`Store — custom launch supprimé : ${id}`);
}

module.exports = {
  readStore,
  writeStore,
  getStreamUrls,
  setStreamUrl,
  getAllStreamUrls,
  getCustomLaunches,
  addCustomLaunch,
  deleteCustomLaunch,
};
