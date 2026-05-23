// ─── INIT ─────────────────────────────────────────────────────
async function load() {
  const res = await fetch("/api/admin/launches");
  const { launches, urls, state } = await res.json();
  renderState(state);
  renderLaunches(launches, urls);
  loadCustomLaunches();
}

// ─── SCHEDULER STATE ──────────────────────────────────────────
function renderState(state) {
  const lm = document.getElementById("stateLaunchMode");
  const li = document.getElementById("statelaunchId");
  lm.textContent = state.launchModeActive ? "ACTIVE" : "INACTIVE";
  lm.className =
    "state-value " + (state.launchModeActive ? "active" : "inactive");
  li.textContent = state.scheduledLaunchId || "—";
}

// ─── STREAM URLs ──────────────────────────────────────────────
function renderLaunches(launches, urls) {
  const list = document.getElementById("launchAdminList");
  list.innerHTML = "";

  if (launches.length === 0) {
    list.innerHTML = '<div class="loading">Aucun lancement trouvé</div>';
    return;
  }

  launches.forEach((launch) => {
    const existingUrl = urls[launch.id] || "";
    const hasUrl = !!existingUrl;
    const net = launch.net
      ? new Date(launch.net).toUTCString().slice(0, 25) + " UTC"
      : "Date TBD";

    const card = document.createElement("div");
    card.className = `launch-admin-card ${hasUrl ? "has-url" : ""}`;
    card.id = `card-${launch.id}`;

    card.innerHTML = `
      <div class="launch-admin-name">${launch.name}</div>
      <div class="launch-admin-meta">${launch.agency} — ${net}</div>
      <div class="url-row">
        <input
          class="url-input"
          id="url-${launch.id}"
          type="text"
          placeholder="https://youtube.com/watch?v=..."
          value="${existingUrl}"
        />
        <button class="btn btn-save" onclick="saveUrl('${launch.id}')">SAVE</button>
      </div>
      <div class="url-saved" id="saved-${launch.id}">✓ URL ENREGISTRÉE</div>
    `;

    list.appendChild(card);
  });
}

function normalizeYouTubeUrl(input) {
  try {
    const url = new URL(input.trim());
    let videoId = null;

    // youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      videoId = url.pathname.slice(1);
    }
    // youtube.com/watch?v=VIDEO_ID
    else if (url.searchParams.get("v")) {
      videoId = url.searchParams.get("v");
    }
    // youtube.com/live/VIDEO_ID
    else if (url.pathname.startsWith("/live/")) {
      videoId = url.pathname.split("/live/")[1].split("?")[0];
    }
    // youtube.com/embed/VIDEO_ID
    else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/embed/")[1].split("?")[0];
    }

    if (videoId) {
      return `https://www.youtube.com/live/${videoId}`;
    }
  } catch (e) {}

  // Retourne l'URL originale si non reconnue
  return input.trim();
}

async function saveUrl(launchId) {
  const input = document.getElementById(`url-${launchId}`);
  const url = input.value.trim();
  if (!url) return;

  

  const res = await fetch("/api/admin/stream-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ launchId, url }),
  });

  if (res.ok) {
    const card = document.getElementById(`card-${launchId}`);
    const saved = document.getElementById(`saved-${launchId}`);
    card.classList.add("has-url");
    saved.classList.add("visible");
    setTimeout(() => saved.classList.remove("visible"), 3000);
  }
}

// ─── FORCE ACTIONS ────────────────────────────────────────────
document
  .getElementById("btnForceLaunch")
  .addEventListener("click", async () => {
    await fetch("/api/admin/force-launch", { method: "POST" });
    setTimeout(load, 500);
  });

document
  .getElementById("btnForceReturn")
  .addEventListener("click", async () => {
    await fetch("/api/admin/force-return", { method: "POST" });
    setTimeout(load, 500);
  });

// ─── CUSTOM LAUNCHES ──────────────────────────────────────────
async function loadCustomLaunches() {
  const res = await fetch("/api/admin/custom-launches");
  const data = await res.json();
  renderCustomList(data);
}

function renderCustomList(launches) {
  const list = document.getElementById("customList");
  list.innerHTML = "";

  if (launches.length === 0) {
    list.innerHTML = '<div class="loading">Aucune mission custom</div>';
    return;
  }

  launches.forEach((launch) => {
    const net = launch.net
      ? new Date(launch.net).toUTCString().slice(0, 25) + " UTC"
      : "Date TBD";

    const card = document.createElement("div");
    card.className = "custom-card";
    card.innerHTML = `
      <div class="custom-card-info">
        <div class="custom-card-name">${launch.name}</div>
        <div class="custom-card-meta">${launch.agency} — ${net} — ${launch.status}</div>
      </div>
      <button class="btn btn-delete" onclick="deleteCustomLaunch('${launch.id}')">✕ SUPPRIMER</button>
    `;
    list.appendChild(card);
  });
}

async function addCustomLaunch() {
  const name = document.getElementById("cf-name").value.trim();
  const agency = document.getElementById("cf-agency").value.trim();
  const rocket = document.getElementById("cf-rocket").value.trim();
  const pad = document.getElementById("cf-pad").value.trim();
  const netRaw = document.getElementById("cf-net").value;
  const status = document.getElementById("cf-status").value;
  const orbit = document.getElementById("cf-orbit").value.trim();

  if (!name || !agency) {
    alert("Nom et agence requis");
    return;
  }

  const net = netRaw ? new Date(netRaw).toISOString() : null;

  const res = await fetch("/api/admin/custom-launches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      agency,
      rocket,
      pad,
      net,
      status,
      missionOrbit: orbit,
    }),
  });

  if (res.ok) {
    [
      "cf-name",
      "cf-agency",
      "cf-rocket",
      "cf-pad",
      "cf-net",
      "cf-orbit",
    ].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("cf-status").value = "TBD";
    loadCustomLaunches();
  }
}

async function deleteCustomLaunch(id) {
  await fetch(`/api/admin/custom-launches/${id}`, { method: "DELETE" });
  loadCustomLaunches();
}

// ─── AUTO-REFRESH ─────────────────────────────────────────────
load();
setInterval(load, 30000);
