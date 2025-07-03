const DEGREE2RAD = Math.PI / 180;
const CELESTIAL_SPHERE_RADIUS = 100;
var FRAUNHOFER;
fetch("./resources/geoCoords.json")
  .then((response) => response.json())
  .then((geoCoords) => {
    FRAUNHOFER = geoCoords.fraunhofer;
  });

function emitReadMoreSignal() {
  document.querySelector("a-camera").emit("readmore", {}, false);
}

function animate(element, property, val) {
  element.setAttribute(`animation__${property}`, {
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

    this.assets = document.querySelector("a-assets");
    this.fraunhoferBeam = document.querySelector("#fraunhoferBeam");

    this.overlay = document.querySelector("#overlay");
    this.readMoreContainer = this.overlay.querySelector("#readMoreContainer");

    this.langDictPromise = fetch(`lang/${lang}.json`)
      .then((response) => response.json())
      .then((langDict) => langDict);

    this.objectInfoPromise = this.langDictPromise.then(
      (langDict) => langDict.skyObjects
    );

    fetch("./resources/geoCoords.json")
      .then((response) => response.json())
      .then((geoCoords) => {
        this.el.setAttribute("position", {
          x: 0,
            y: geoCoords.fraunhofer.altitude + 3.209,
          z: 0,
        });
        this.el.setAttribute("gps-projected-entity-place", {
            latitude: geoCoords.fraunhofer.latitude,
            longitude: geoCoords.fraunhofer.longitude,
        });
      });

    // die Bilder laden; "Waypoints" in den Himmel hinzufügen
    fetch("./resources/skyCoords.json")
      .then((response) => response.json())
      .then((skyCoords) => {
        for (const [objectId, radecCoords] of Object.entries(skyCoords)) {
          this.loadImage(objectId);

          var observation = new Orb.Observation({
            observer: FRAUNHOFER,
            target: radecCoords,
          });

          var relCoords = observation.azel(new Date());

          alt = relCoords.elevation;
          az =
            relCoords.azimuth > 180
              ? relCoords.azimuth - 360
              : relCoords.azimuth;

          this.waypointCoords[objectId] = {
            alt: alt,
            az: az,
          };
          this.addWaypoint(objectId, this.waypointCoords[objectId]);
        }

        document
          .querySelector("a-camera")
          .emit("skyloaded", { waypointCoords: this.waypointCoords }, false);

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
    imgAssetEl.setAttribute("src", `./images/objects/${objectId}.jpg`);
    imgAssetEl.setAttribute("crossorigin", "anonymous");

    this.assets.append(imgAssetEl);
  },

  // Fügt ein "waypoint" an der Position im Himmel hinzu
  addWaypoint: function (objectId, altaz) {
    var waypointAzStick = document.createElement("a-entity");
    waypointAzStick.setAttribute("id", `${objectId}WaypointAzStick`);
    waypointAzStick.setAttribute("rotation", { x: 0, y: -altaz.az, z: 0 });

    var waypointAltStick = document.createElement("a-entity");
    waypointAltStick.setAttribute("id", `${objectId}WaypointAltStick`);
    waypointAltStick.setAttribute("rotation", { x: altaz.alt, y: 0, z: 0 });

    var waypointEl = document.createElement("a-entity");
    waypointEl.setAttribute("id", `${objectId}Waypoint`);
    waypointEl.setAttribute("mixin", "waypointFrame");
    waypointEl.setAttribute("class", "waypoint");
    waypointEl.setAttribute("position", {
      x: 0,
      y: 0,
      z: -CELESTIAL_SPHERE_RADIUS,
    });

    var waypointImageEl = document.createElement("a-entity");
    waypointImageEl.setAttribute("id", `${objectId}WaypointImage`);
    waypointImageEl.setAttribute("material", `src: #${objectId}Image`);
    waypointImageEl.setAttribute("mixin", "waypointImage");
    waypointEl.appendChild(waypointImageEl);

    var waypointRaycastableEl = document.createElement("a-entity");
    waypointRaycastableEl.setAttribute("id", objectId);
    waypointRaycastableEl.setAttribute("class", "raycastable");
    waypointRaycastableEl.setAttribute("mixin", "waypointRaycastable");
    waypointRaycastableEl.setAttribute("position", {
      x: 0,
      y: 0,
      z: -CELESTIAL_SPHERE_RADIUS,
    });

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
    this.waypointRaycastableEls.push(waypointRaycastableEl);

    waypointAltStick.append(waypointEl);
    waypointAltStick.append(waypointRaycastableEl);
    waypointAzStick.append(waypointAltStick);
    this.el.append(waypointAzStick);
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
      animate(otherWaypoint, "position", {
        x: 0,
        y: 0,
        z: -(CELESTIAL_SPHERE_RADIUS + 10),
      });
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
      animate(otherWaypoint, "position", {
        x: 0,
        y: 0,
        z: -CELESTIAL_SPHERE_RADIUS,
      });
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
