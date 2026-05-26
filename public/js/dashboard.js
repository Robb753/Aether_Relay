// ─── ÉTAT ────────────────────────────────────────────────────
let launches = [];
let countdownInterval = null;
let globeReady = false;

// ─── ÉLÉMENTS DOM ────────────────────────────────────────────
const launchList = document.getElementById("launchList");
const launchCount = document.getElementById("launchCount");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const clock = document.getElementById("clock");
const dateEl = document.getElementById("date");
const nextName = document.getElementById("nextName");
const nextAgency = document.getElementById("nextAgency");
const nextRocket = document.getElementById("nextRocket");
const nextPad = document.getElementById("nextPad");
const nextStatus = document.getElementById("nextStatus");
const countdown = document.getElementById("countdown");
const lastUpdate = document.getElementById("lastUpdate");
const kpValue = document.getElementById("kpValue");
const kpBar = document.getElementById("kpBar");
const kpLevel = document.getElementById("kpLevel");
const xrayClass = document.getElementById("xrayClass");
const windSpeed = document.getElementById("windSpeed");
const windDensity = document.getElementById("windDensity");
const issLat = document.getElementById("issLat");
const issLon = document.getElementById("issLon");
const issAlt = document.getElementById("issAlt");
const viewA = document.getElementById("viewA");
const viewB = document.getElementById("viewB");

// ─── HORLOGE UTC ─────────────────────────────────────────────
function tickClock() {
  const now = new Date();
  clock.textContent = now.toUTCString().slice(17, 25);
  dateEl.textContent = now.toISOString().slice(0, 10);
}
setInterval(tickClock, 1000);
tickClock();

// ─── STATUT SSE ───────────────────────────────────────────────
function setStatus(state) {
  statusDot.className = "status-dot " + state;
  if (state === "connected") statusText.textContent = "LIVE";
  if (state === "error") statusText.textContent = "DISCONNECTED";
  if (state === "") statusText.textContent = "CONNECTING...";
}

// ─── FORMAT DATE ─────────────────────────────────────────────
function formatNET(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toUTCString().slice(0, 25) + " UTC";
}

// ─── COUNTDOWN T− ────────────────────────────────────────────
function startCountdown(netIso) {
  if (countdownInterval) clearInterval(countdownInterval);

  function update() {
    const diff = new Date(netIso) - new Date();
    if (diff <= 0) {
      countdown.textContent = "T− 00:00:00";
      clearInterval(countdownInterval);
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    countdown.textContent =
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0");
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

// ─── MÉTÉO SPATIALE ───────────────────────────────────────────
function renderWeather(data) {
  if (!data) return;

  kpValue.textContent = data.kp;
  kpLevel.textContent = data.kpLevel.label;

  const pct = Math.min((parseFloat(data.kp) / 9) * 100, 100);
  kpBar.style.width = pct + "%";

  const colorMap = {
    green: "var(--green)",
    yellow: "var(--yellow)",
    red: "var(--red)",
    accent: "var(--accent)",
  };
  kpBar.style.background = colorMap[data.kpLevel.color] || "var(--accent)";
  kpValue.className = "weather-value " + data.kpLevel.color;

  xrayClass.textContent = `CLASS ${data.xray}`;
  windSpeed.textContent = `${data.windSpeed} km/s`;
  windDensity.textContent = `${data.windDensity} p/cm³`;
}

// ─── ISS ─────────────────────────────────────────────────────
function renderISS(data) {
  if (!data || data.latitude == null) return;

  const lat = parseFloat(data.latitude).toFixed(2);
  const lon = parseFloat(data.longitude).toFixed(2);

  if (issLat) issLat.textContent = `${lat}° ${lat >= 0 ? "N" : "S"}`;
  if (issLon) issLon.textContent = `${Math.abs(lon)}° ${lon >= 0 ? "E" : "W"}`;
  if (issAlt) issAlt.textContent = `${data.altitude || 408} km`;

  if (globeReady && window.issGlobe) {
    window.issGlobe.updateISS(data);
  }
}

// ─── ROTATION SIDEBAR ────────────────────────────────────────
let currentView = "A";
const VIEW_DURATION = 12000; // 12 secondes par vue

function switchView() {
  const from = currentView === "A" ? viewA : viewB;
  const to = currentView === "A" ? viewB : viewA;

  from.classList.add("fade-out");

  setTimeout(() => {
    from.classList.add("hidden");
    from.classList.remove("fade-out");
    to.classList.remove("hidden");
    setTimeout(() => to.classList.add("fade-in"), 20);
    setTimeout(() => to.classList.remove("fade-in"), 620);
    currentView = currentView === "A" ? "B" : "A";

    // Init globe au premier passage sur la vue B
    if (currentView === "B" && !globeReady && window.issGlobe) {
      window.issGlobe.init().then((v) => {
        if (v) {
          globeReady = true;
          // Fetch TLE pour l'orbite
          fetch("/api/iss/tle")
            .then((r) => r.json())
            .then((tle) => {
              if (tle.line1) window.issGlobe.updateOrbit(tle);
            });
        }
      });
    }
  }, 600);
}

setInterval(switchView, VIEW_DURATION);

// ─── STATUT → CLASSE CSS ──────────────────────────────────────
function statusClass(abbrev) {
  if (!abbrev) return "tbd";
  const a = abbrev.toLowerCase();
  if (a === "go") return "go";
  if (a === "tbd" || a === "tbc") return "tbd";
  return "hold";
}

// ─── RENDU CARTE LANCEMENT ────────────────────────────────────
function renderCard(launch, index) {
  const sc = statusClass(launch.status);
  const card = document.createElement("div");
  card.className = `launch-card status-${sc}`;
  card.style.animationDelay = `${index * 40}ms`;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-name">${launch.name}</div>
      <div class="card-status ${sc}">${launch.status || "TBD"}</div>
    </div>
    <div class="card-meta">
      <div class="card-meta-item">
        <span class="meta-label">AGENCY</span>
        <span class="meta-value">${launch.agency}</span>
      </div>
      <div class="card-meta-item">
        <span class="meta-label">ROCKET</span>
        <span class="meta-value">${launch.rocket}</span>
      </div>
      <div class="card-meta-item">
        <span class="meta-label">PAD</span>
        <span class="meta-value">${launch.pad}</span>
      </div>
      <div class="card-meta-item">
        <span class="meta-label">ORBIT</span>
        <span class="meta-value">${launch.missionOrbit || "—"}</span>
      </div>
    </div>
    <div class="card-net">${formatNET(launch.net)}</div>
  `;

  return card;
}

// ─── RENDU LISTE COMPLÈTE ─────────────────────────────────────
function renderLaunches(data) {
  launches = data;
  launchList.innerHTML = "";
  launchCount.textContent = `${data.length} MISSIONS`;

  if (data.length === 0) {
    launchList.innerHTML = `
      <div class="no-launches">
        <span>NO UPCOMING LAUNCHES</span>
        <span class="no-launches-sub">Next update in 30 min</span>
      </div>
    `;
  } else {
    data.forEach((launch, i) => {
      launchList.appendChild(renderCard(launch, i));
    });
  }

  if (data.length > 0) {
    const next = data[0];
    nextName.textContent = next.name;
    nextAgency.textContent = next.agency;
    nextRocket.textContent = next.rocket;
    nextPad.textContent = next.pad;
    nextStatus.textContent = next.statusName || next.status || "—";
    startCountdown(next.net);
  }

  lastUpdate.textContent = new Date().toUTCString().slice(17, 25) + " UTC";
}

// ─── CONNEXION SSE ────────────────────────────────────────────
function connectSSE() {
  setStatus("");
  const sse = new EventSource("/sse");

  sse.onopen = () => setStatus("connected");

  sse.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "launches") renderLaunches(msg.payload);
      if (msg.type === "spaceweather") renderWeather(msg.payload);
      if (msg.type === "iss") renderISS(msg.payload);
      if (msg.type === "tle" && window.issGlobe && globeReady) {
        window.issGlobe.updateOrbit(msg.payload);
      }
    } catch (e) {
      console.error("SSE parse error:", e);
    }
  };

  sse.onerror = () => {
    setStatus("error");
    sse.close();
    setTimeout(connectSSE, 10000);
  };
}

// ─── FETCH INITIAL REST ───────────────────────────────────────
async function initialFetch() {
  try {
    const res = await fetch("/api/launches");
    const data = await res.json();
    if (data.length > 0) renderLaunches(data);

    const wRes = await fetch("/api/spaceweather");
    const wData = await wRes.json();
    renderWeather(wData);

    const iRes = await fetch("/api/iss");
    const iData = await iRes.json();
    renderISS(iData);
  } catch (e) {
    console.error("Initial fetch failed:", e);
  }
}

// ─── INIT ─────────────────────────────────────────────────────
initialFetch();
connectSSE();
