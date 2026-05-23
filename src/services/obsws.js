const logger = require("../core/logger");

let obs = null;
let connected = false;

async function connect() {
  try {
    const { OBSWebSocket } = await import("obs-websocket-js");
    obs = new OBSWebSocket();

    obs.on("ConnectionClosed", () => {
      connected = false;
      logger.warn("OBS WebSocket déconnecté");
      setTimeout(connect, 15000);
    });

    await obs.connect(
      `ws://${process.env.OBS_HOST || "localhost"}:${process.env.OBS_PORT || 4455}`,
      process.env.OBS_PASSWORD || "",
    );
    connected = true;
    logger.info("OBS WebSocket connecté");
  } catch (err) {
    connected = false;
    logger.warn(`OBS WebSocket non disponible : ${err.message}`);
    console.error("OBS ERROR DETAILS:", err);
    setTimeout(connect, 15000);
  }
}

async function switchScene(sceneName) {
  if (!connected || !obs) {
    logger.warn("Switch scène ignoré — OBS non connecté");
    return false;
  }
  try {
    await obs.call("SetCurrentProgramScene", { sceneName });
    logger.info(`OBS → scène : ${sceneName}`);
    return true;
  } catch (err) {
    logger.error(`Switch scène échoué : ${err.message}`);
    return false;
  }
}

async function updateBrowserSource(sourceName, url) {
  if (!connected || !obs) {
    logger.warn("Update source ignoré — OBS non connecté");
    return false;
  }
  try {
    await obs.call("SetInputSettings", {
      inputName: sourceName,
      inputSettings: { url },
    });
    logger.info(`OBS Browser Source "${sourceName}" → ${url}`);
    return true;
  } catch (err) {
    logger.error(`Update browser source échoué : ${err.message}`);
    return false;
  }
}

function isConnected() {
  return connected;
}

module.exports = { connect, switchScene, updateBrowserSource, isConnected };
