require("dotenv").config();
const express = require("express");
const path = require("path");
const { fetchLaunches } = require("./services/launches");
const { fetchSpaceWeather } = require("./services/spaceweather");
const scheduler = require("./services/scheduler");
const store = require("./core/store");
const logger = require("./core/logger");

const app = express();
const PORT = process.env.PORT || 3000;

const { connect: connectOBS } = require("./services/obsws");

// Clients SSE connectés
const clients = new Set();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ─── AUTH ADMIN ───────────────────────────────────────────────
function adminAuth(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aether Relay Admin"');
    return res.status(401).send("Unauthorized");
  }
  const decoded = Buffer.from(auth.slice(6), "base64").toString();
  const [, password] = decoded.split(":");
  if (password !== (process.env.ADMIN_PASSWORD || "admin")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aether Relay Admin"');
    return res.status(401).send("Unauthorized");
  }
  next();
}

// ─── PAGES ───────────────────────────────────────────────────
app.get("/admin", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

// ─── API LAUNCHES ─────────────────────────────────────────────
app.get("/api/launches", async (req, res) => {
  const launches = await fetchLaunches();
  const custom = store.getCustomLaunches();
  const all = [...launches, ...custom].sort((a, b) => {
    if (!a.net) return 1;
    if (!b.net) return -1;
    return new Date(a.net) - new Date(b.net);
  });
  res.json(all);
});

// ─── API SPACE WEATHER ────────────────────────────────────────
app.get("/api/spaceweather", async (req, res) => {
  const data = await fetchSpaceWeather();
  res.json(data);
});

// ─── SSE ──────────────────────────────────────────────────────
app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  logger.info(`Client SSE connecté — total : ${clients.size + 1}`);
  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
    logger.info(`Client SSE déconnecté — total : ${clients.size}`);
  });
});

// ─── ADMIN — SCHEDULER ────────────────────────────────────────
app.get("/api/admin/launches", adminAuth, async (req, res) => {
  const launches = await fetchLaunches();
  const urls = store.getAllStreamUrls();
  const state = scheduler.getState();
  res.json({ launches, urls, state });
});

app.post("/api/admin/stream-url", adminAuth, (req, res) => {
  const { launchId, url } = req.body;
  if (!launchId || !url) {
    return res.status(400).json({ error: "launchId et url requis" });
  }
  store.setStreamUrl(launchId, url);
  res.json({ ok: true, launchId, url });
});

app.post("/api/admin/force-launch", adminAuth, async (req, res) => {
  const launches = await fetchLaunches();
  if (launches.length === 0)
    return res.status(404).json({ error: "Aucun lancement" });
  await scheduler.activateLaunchMode(launches[0]);
  res.json({ ok: true });
});

app.post("/api/admin/force-return", adminAuth, async (req, res) => {
  await scheduler.deactivateLaunchMode();
  res.json({ ok: true });
});

// ─── ADMIN — CUSTOM LAUNCHES ──────────────────────────────────
app.get("/api/admin/custom-launches", adminAuth, (req, res) => {
  res.json(store.getCustomLaunches());
});

app.post("/api/admin/custom-launches", adminAuth, (req, res) => {
  const { name, agency, rocket, pad, net, status, missionOrbit } = req.body;
  if (!name || !agency) {
    return res.status(400).json({ error: "name et agency requis" });
  }
  const id = `custom-${Date.now()}`;
  const launch = {
    id,
    name,
    agency,
    rocket: rocket || "Unknown",
    pad: pad || "Unknown",
    location: "",
    net: net || null,
    status: status || "TBD",
    statusName: status || "To Be Determined",
    missionName: name,
    missionDescription: null,
    missionOrbit: missionOrbit || null,
    imageUrl: null,
    source: "custom",
  };
  store.addCustomLaunch(launch);
  logger.info(`Custom launch ajouté : ${name}`);
  res.json({ ok: true, launch });
});

app.delete("/api/admin/custom-launches/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const launches = store.getCustomLaunches();
  if (!launches.find((l) => l.id === id)) {
    return res.status(404).json({ error: "Launch introuvable" });
  }
  store.deleteCustomLaunch(id);
  res.json({ ok: true });
});

// ─── BROADCAST SSE ────────────────────────────────────────────
function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

// ─── POLL ─────────────────────────────────────────────────────
async function poll() {
  logger.info("Poll launches...");
  const launches = await fetchLaunches();
  const custom = store.getCustomLaunches();
  const all = [...launches, ...custom].sort((a, b) => {
    if (!a.net) return 1;
    if (!b.net) return -1;
    return new Date(a.net) - new Date(b.net);
  });
  if (all.length > 0) {
    broadcast({ type: "launches", payload: all });
  }
  const weather = await fetchSpaceWeather();
  if (weather) {
    broadcast({ type: "spaceweather", payload: weather });
  }
}

// ─── DÉMARRAGE ────────────────────────────────────────────────
app.listen(PORT, async () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
  await connectOBS();
  await poll();
  setInterval(poll, 30 * 60 * 1000);
  scheduler.start();
});
