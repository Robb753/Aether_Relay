window.issGlobe = (() => {
  let viewer = null;
  let issEntity = null;
  let orbitEntity = null;
  let pendingTle = null;

  let lastTrackAt = 0;
  let lastTrackedLat = null;
  let lastTrackedLon = null;
  let _listenersRegistered = false;

  const CAMERA_ALTITUDE = 22_000_000;
  const TRACK_MIN_INTERVAL_MS = 4500;
  const TRACK_MIN_DELTA_DEG = 0.5;

  async function init() {
    if (viewer) return viewer;

    let cfg;
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cfg = await res.json();
    } catch (err) {
      console.error("[issGlobe] /api/config inaccessible :", err.message);
      return null;
    }

    if (!cfg.cesiumToken) {
      console.error("[issGlobe] Token Cesium Ion manquant — globe désactivé");
      return null;
    }

    Cesium.Ion.defaultAccessToken = cfg.cesiumToken;

    viewer = new Cesium.Viewer("cesiumContainer", {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    });

    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#020408");
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#040d18");
    viewer.scene.globe.show = true;

    try {
      const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(3);
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(imageryProvider);
    } catch (err) {
      console.error("[issGlobe] Erreur imagerie Ion :", err);
    }

    viewer.scene.skyBox = new Cesium.SkyBox({
      sources: {
        positiveX: Cesium.buildModuleUrl(
          "Assets/Textures/SkyBox/tycho2t3_80_px.jpg",
        ),
        negativeX: Cesium.buildModuleUrl(
          "Assets/Textures/SkyBox/tycho2t3_80_mx.jpg",
        ),
        positiveY: Cesium.buildModuleUrl(
          "Assets/Textures/SkyBox/tycho2t3_80_py.jpg",
        ),
        negativeY: Cesium.buildModuleUrl(
          "Assets/Textures/SkyBox/tycho2t3_80_my.jpg",
        ),
        positiveZ: Cesium.buildModuleUrl(
          "Assets/Textures/SkyBox/tycho2t3_80_pz.jpg",
        ),
        negativeZ: Cesium.buildModuleUrl(
          "Assets/Textures/SkyBox/tycho2t3_80_mz.jpg",
        ),
      },
    });

    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.atmosphereLightIntensity = 10.0;
    viewer.scene.globe.atmosphereMieAnisotropy = 0.9;
    viewer.scene.sun.show = true;
    viewer.scene.moon.show = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.globe.enableLighting = true;

    viewer.clock.currentTime = Cesium.JulianDate.now();
    viewer.clock.shouldAnimate = true;
    viewer.clock.multiplier = 1;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 0, CAMERA_ALTITUDE),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
    });

    issEntity = viewer.entities.add({
      id: "iss-live-entity",
      name: "ISS",
      position: Cesium.Cartesian3.fromDegrees(0, 0, 408_000),
      point: {
        pixelSize: 18,
        color: Cesium.Color.fromCssColorString("#00d4ff"),
        outlineColor: Cesium.Color.fromCssColorString("#00ff9d").withAlpha(0.6),
        outlineWidth: 3,
        scaleByDistance: new Cesium.NearFarScalar(1e6, 2.5, 5e7, 0.9),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: "ISS",
        font: "11px Courier New, monospace",
        fillColor: Cesium.Color.fromCssColorString("#00d4ff"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        scaleByDistance: new Cesium.NearFarScalar(1e6, 1.0, 5e7, 0.4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    if (pendingTle) {
      updateOrbit(pendingTle);
    }

    viewer.useDefaultRenderLoop = true;
    viewer.scene.requestRenderMode = false;

    if (!_listenersRegistered) {
      _listenersRegistered = true;

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible" || !viewer) return;
        const gl = viewer.scene?.context?._gl;
        if (gl?.isContextLost?.()) {
          _reinitViewer();
          return;
        }
        viewer.resize();
        viewer.scene.requestRender();
        viewer.clock.currentTime = Cesium.JulianDate.now();
        viewer.clock.shouldAnimate = true;
      });

      window.addEventListener("focus", () => {
        if (!viewer || viewer.isDestroyed()) return;
        viewer.resize();
        viewer.scene.requestRender();
        viewer.clock.shouldAnimate = true;
      });
    }

    return viewer;
  }

  function updateISS(issData) {
    if (!viewer || !issEntity || !issData) return;
    const { latitude, longitude, altitude } = issData;
    if (latitude == null || longitude == null) return;

    issEntity.position = Cesium.Cartesian3.fromDegrees(
      longitude,
      latitude,
      (altitude || 408) * 1000,
    );

    trackISS(latitude, longitude);
  }

  function shouldTrack(latitude, longitude) {
    const now = Date.now();
    if (lastTrackedLat == null || lastTrackedLon == null) return true;
    if (now - lastTrackAt < TRACK_MIN_INTERVAL_MS) return false;
    const latDelta = Math.abs(latitude - lastTrackedLat);
    const lonDelta = Math.abs(longitude - lastTrackedLon);
    return latDelta >= TRACK_MIN_DELTA_DEG || lonDelta >= TRACK_MIN_DELTA_DEG;
  }

  function trackISS(latitude, longitude) {
    if (!viewer || !issEntity) return;
    if (latitude == null || longitude == null) return;
    if (!shouldTrack(latitude, longitude)) return;

    lastTrackAt = Date.now();
    lastTrackedLat = latitude;
    lastTrackedLon = longitude;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        longitude,
        latitude,
        CAMERA_ALTITUDE,
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 1.0,
      maximumHeight: CAMERA_ALTITUDE,
    });
  }

  function clearOrbitEntities() {
    if (!viewer || !orbitEntity) return;
    const list = Array.isArray(orbitEntity) ? orbitEntity : [orbitEntity];
    list.forEach((e) => viewer.entities.remove(e));
    orbitEntity = null;
  }

  function updateOrbit(tle) {
    pendingTle = tle;
    if (!viewer) return;
    if (!tle?.line1 || !tle?.line2) return;

    const sat = window.satellite;
    if (!sat) {
      console.warn("[orbit] satellite.js non disponible");
      return;
    }

    try {
      const satrec = sat.twoline2satrec(tle.line1.trim(), tle.line2.trim());
      const now = new Date();
      const STEP_S = 60;

      // Orbite future — 92 minutes
      const futureSegments = [[]];
      let prevLon = null;
      for (let s = 0; s <= 92 * 60; s += STEP_S) {
        const t = new Date(now.getTime() + s * 1000);
        const pv = sat.propagate(satrec, t);
        if (!pv?.position) continue;
        const gmst = sat.gstime(t);
        const geo = sat.eciToGeodetic(pv.position, gmst);
        const lat = sat.degreesLat(geo.latitude);
        const lon = sat.degreesLong(geo.longitude);
        const alt = geo.height * 1000 + 5000;
        if (prevLon !== null && Math.abs(lon - prevLon) > 180)
          futureSegments.push([]);
        prevLon = lon;
        futureSegments[futureSegments.length - 1].push(
          Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        );
      }

      // Orbite passée — 30 minutes
      const pastSegments = [[]];
      let pastPrevLon = null;
      for (let s = -30 * 60; s <= 0; s += STEP_S) {
        const t = new Date(now.getTime() + s * 1000);
        const pv = sat.propagate(satrec, t);
        if (!pv?.position) continue;
        const gmst = sat.gstime(t);
        const geo = sat.eciToGeodetic(pv.position, gmst);
        const lat = sat.degreesLat(geo.latitude);
        const lon = sat.degreesLong(geo.longitude);
        const alt = geo.height * 1000 + 5000;
        if (pastPrevLon !== null && Math.abs(lon - pastPrevLon) > 180)
          pastSegments.push([]);
        pastPrevLon = lon;
        pastSegments[pastSegments.length - 1].push(
          Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        );
      }

      clearOrbitEntities();
      const entities = [];

      futureSegments.forEach((segment, idx) => {
        if (segment.length < 2) return;
        const color = Cesium.Color.fromCssColorString("#00d4ff").withAlpha(
          idx === 0 ? 0.8 : 0.35,
        );
        entities.push(
          viewer.entities.add({
            name: `ISS_ORBIT_${idx}`,
            polyline: {
              positions: segment,
              width: idx === 0 ? 2.5 : 1.5,
              arcType: Cesium.ArcType.NONE,
              material: new Cesium.PolylineDashMaterialProperty({
                color,
                dashLength: 16,
                dashPattern: 0xff00,
              }),
              depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
                color: color.withAlpha(0.2),
                dashLength: 16,
                dashPattern: 0xff00,
              }),
            },
          }),
        );
      });

      pastSegments.forEach((segment, idx) => {
        if (segment.length < 2) return;
        const color =
          Cesium.Color.fromCssColorString("#00d4ff").withAlpha(0.55);
        entities.push(
          viewer.entities.add({
            name: `ISS_PAST_${idx}`,
            polyline: {
              positions: segment,
              width: 2.5,
              arcType: Cesium.ArcType.NONE,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.08,
                color,
              }),
              depthFailMaterial: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.04,
                color: color.withAlpha(0.2),
              }),
            },
          }),
        );
      });

      orbitEntity = entities.length === 1 ? entities[0] : entities;
      console.log("[orbit] ✓ dessiné —", entities.length, "segment(s)");
    } catch (err) {
      console.error("[orbit] Erreur SGP4 :", err);
    }
  }

  async function _reinitViewer() {
    try {
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewer = null;
      issEntity = null;
      orbitEntity = null;
      document.getElementById("cesiumContainer").innerHTML = "";
      await init();
      if (pendingTle) updateOrbit(pendingTle);
      console.log("[issGlobe] ✓ réinitialisé");
    } catch (err) {
      console.error("[issGlobe] échec réinitialisation:", err);
    }
  }

  function forceRender() {
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.requestRender();
  }

  return { init, updateISS, updateOrbit, trackISS, forceRender };
})();
