const DEGREE2RAD = Math.PI / 180;
const WENDELSTEIN = {
  latitude: 48.1299327,
  longitude: 11.5647978,
  altitude: 1838,
};
const CELESTIAL_SPHERE_RADIUS = 100;

// az und alt sollen beide als dezimalle Grade sein
// r ist der Radius der himmlische Kugel
function azalt2xyz(az, alt, r, center) {
  azRad = az * DEGREE2RAD;
  altRad = alt * DEGREE2RAD;

  cosalt = Math.cos(altRad);
  return {
    x: r * Math.sin(azRad) * cosalt + center.x,
    y: r * Math.sin(altRad) + center.y,
    z: -r * Math.cos(azRad) * cosalt + center.z,
  };
}

function emitReadMoreSignal() {
  document.querySelector("a-camera").emit("readmore", {}, false);
}

function animate(element, property, val) {
  element.setAttribute("animation__scale", {
    property: property,
    to: val,
    dur: 200,
    easing: "easeInOutQuad",
  });
}

function setAttributes(element, attributes) {
  for (const [attribute, value] of attributes) {
    element.setAttribute(attribute, value);
  }
}

AFRAME.registerComponent("load-sky", {
  init: function () {
    let lang = localStorage.getItem("language");

    this.waypointEls = [];
    this.waypointRaycastableEls = [];
    this.waypointCoords = {};
    this.camera = this.el.querySelector("a-camera");
    this.assetsEl = this.el.querySelector("a-assets");
    this.fraunhoferBeam = this.el.querySelector("#fraunhoferBeam");

    this.telescopePosition = {
      ...this.el.querySelector("#fraunhoferRig").getAttribute("position"),
    };
    this.telescopePosition.y = 3.209;

    this.overlay = document.querySelector("#overlay");
    this.readMoreContainer = this.overlay.querySelector("#readMoreContainer");

    this.objectCoordsPromise = fetch("resources/coordinates.json").then(
      (response) => response.json()
    );
    this.langDictPromise = fetch(`lang/${lang}.json`)
      .then((response) => response.json())
      .then((langDict) => langDict);

    this.objectInfoPromise = this.langDictPromise.then(
      (langDict) => langDict.skyObjects
    );

    // die Bilder laden; "Waypoints" in den Himmel hinzufügen
    this.objectCoordsPromise.then((objectCoords) => {
      for (const [objectId, radecCoords] of Object.entries(objectCoords)) {
        this.loadImage(objectId);

        var observation = new Orb.Observation({
          observer: WENDELSTEIN,
          target: radecCoords,
        });

        var relCoords = observation.azel(new Date());

        alt = relCoords.elevation;
        az =
          relCoords.azimuth > 180 ? 180 - relCoords.azimuth : relCoords.azimuth;

        var xyzCoords = azalt2xyz(
          az,
          alt,
          CELESTIAL_SPHERE_RADIUS,
          this.telescopePosition
        );

        this.addWaypoint(objectId, xyzCoords);
        this.waypointCoords[objectId] = {
          alt: alt,
          az: az,
        };
      }

      this.camera.emit(
        "skyloaded",
        { waypointCoords: this.waypointCoords },
        false
      );

      // hört zu, wenn Waypoints geklickt werden
      this.openHologramPanel = this.openHologramPanel.bind(this);
      this.highlightWaypoint = this.highlightWaypoint.bind(this);
      this.closeHologramPanel = this.closeHologramPanel.bind(this);
      for (var waypointRaycastableEl of this.waypointRaycastableEls) {
        waypointRaycastableEl.addEventListener(
          "locked-on-waypoint",
          this.openHologramPanel
        );
        waypointRaycastableEl.addEventListener(
          "raycaster-intersected",
          this.highlightWaypoint
        );
        waypointRaycastableEl.addEventListener(
          "raycaster-intersected-cleared",
          this.closeHologramPanel
        );
      }
    });
  },

  loadImage: function (objectId) {
    var imgAssetEl = document.createElement("img");

    imgAssetEl.setAttribute("id", `${objectId}Image`);
    imgAssetEl.setAttribute("src", `../images/objects/${objectId}.jpg`);
    imgAssetEl.setAttribute("crossorigin", "anonymous");

    this.assetsEl.append(imgAssetEl);
  },

  // Fügt ein "waypoint" an der Position im Himmel hinzu
  addWaypoint: function (objectId, position) {
    var waypointEl = document.createElement("a-entity");
    waypointEl.setAttribute("id", `${objectId}Waypoint`);
    waypointEl.setAttribute("position", position);
    waypointEl.setAttribute("mixin", "waypointFrame");
    waypointEl.setAttribute("class", "waypoint");

    var waypointImageEl = document.createElement("a-entity");
    waypointImageEl.setAttribute("id", `${objectId}WaypointImage`);
    waypointImageEl.setAttribute("material", `src: #${objectId}Image`);
    waypointImageEl.setAttribute("mixin", "waypointImage");
    waypointEl.appendChild(waypointImageEl);

    this.objectInfoPromise.then((objectInfo) => {
      waypointEl.appendChild(
        this.createInfoHologram(
          objectId,
          objectInfo[objectId].name,
          objectInfo[objectId].desc
        )
      );
    });

    this.waypointEls.push(waypointEl);
    this.el.append(waypointEl);

    var waypointRaycastableEl = document.createElement("a-entity");
    waypointRaycastableEl.setAttribute("id", objectId);
    waypointRaycastableEl.setAttribute("class", "raycastable");
    waypointRaycastableEl.setAttribute("mixin", "waypointRaycastable");
    waypointRaycastableEl.setAttribute("position", position);
    this.waypointRaycastableEls.push(waypointRaycastableEl);
    this.el.append(waypointRaycastableEl);
  },

  createInfoHologram: function (objectId, title, desc) {
    infoHologramEl = document.createElement("a-entity");
    infoHologramEl.setAttribute("id", `${objectId}HologramPanel`);
    infoHologramEl.setAttribute("mixin", "hologramPanel");

    titleEl = document.createElement("a-entity");
    titleEl.setAttribute("id", `${objectId}Title`);
    titleEl.setAttribute("mixin", "hologramTitle");
    titleEl.setAttribute("text", "value", title);
    infoHologramEl.appendChild(titleEl);

    descEl = document.createElement("a-entity");
    descEl.setAttribute("id", `${objectId}Description`);
    descEl.setAttribute("mixin", "hologramDesc");
    descEl.setAttribute("text", "value", desc);
    infoHologramEl.appendChild(descEl);

    return infoHologramEl;
  },

  addInfoPanelImage: function (objectId) {
    var infoPanelImageEl = document.createElement("a-entity");

    infoPanelImageEl.setAttribute("id", `${objectId}InfoPanelImage`);
    infoPanelImageEl.setAttribute("mixin", "infoPanelImage");
    infoPanelImageEl.setAttribute("material", `src: #${objectId}Image`);
    infoPanelImageEl.setAttribute("visible", "false");

    this.infoPanelEl.append(infoPanelImageEl);
  },

  createReadMoreButton: function () {
    // <button id="read-more" onclick="emitReadMoreSignal()"></button>

    if (this.overlay.querySelector("#read-more")) return;

    var readMoreEl = document.createElement("button");

    readMoreEl.setAttribute("id", "readMore");
    readMoreEl.setAttribute("onclick", "emitReadMoreSignal()");
    this.langDictPromise.then(
      (langDict) => (readMoreEl.textContent = langDict.readmore)
    );

    return readMoreEl;
  },

  openHologramPanel: function (evt) {
    var waypoint = this.getWaypoint(evt.target.id);

    for (var [objectId, coords] of Object.entries(this.waypointCoords)) {
      if (objectId === evt.target.id) continue;

      var otherWaypoint = this.getWaypoint(objectId);
      const new_pos = azalt2xyz(
        coords.az,
        coords.alt,
        CELESTIAL_SPHERE_RADIUS + 10,
        this.telescopePosition
      );
      console.log(new_pos);
      animate(otherWaypoint, "position", new_pos);
    }

    animate(waypoint, "scale", { x: 1.5, y: 1.5, z: 1.5 });
    waypoint
      .querySelector(`#${evt.target.id}HologramPanel`)
      .setAttribute("visible", "true");

    // this.fraunhoferBeam.setAttribute("visible", "false");
    animate(this.fraunhoferBeam, "radius-top", 75);

    this.readMoreContainer.appendChild(this.createReadMoreButton());
  },

  highlightWaypoint: function (evt) {
    animate(this.getWaypoint(evt.target.id), "scale", {
      x: 1.2,
      y: 1.2,
      z: 1.2,
    });
    animate(this.fraunhoferBeam, "radius-top", 60);
  },

  closeHologramPanel: function (evt) {
    var waypoint = this.getWaypoint(evt.target.id);

    for (var [objectId, coords] of Object.entries(this.waypointCoords)) {
      if (objectId === evt.target.id) continue;

      var otherWaypoint = this.getWaypoint(objectId);
      const new_pos = azalt2xyz(
        coords.az,
        coords.alt,
        CELESTIAL_SPHERE_RADIUS,
        this.telescopePosition
      );
      animate(otherWaypoint, "position", new_pos);
    }

    waypoint
      .querySelector(`#${evt.target.id}HologramPanel`)
      .setAttribute("visible", "false");

    this.fraunhoferBeam.setAttribute("visible", "true");
    animate(this.fraunhoferBeam, "radius-top", 50);

    animate(waypoint, "scale", { x: 1, y: 1, z: 1 });

    readMoreEl = this.readMoreContainer.querySelector("#readMore");
    if (readMoreEl) readMoreEl.remove();
  },

  getWaypoint: function (objectId) {
    for (const waypoint of this.waypointEls) {
      if (waypoint.id == objectId + "Waypoint") return waypoint;
    }
    return null;
  },
});
