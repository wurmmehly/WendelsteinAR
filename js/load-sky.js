const DEGREE2RAD = Math.PI / 180;
const WENDELSTEIN = {
  latitude: 47.7038888889,
  longitude: 12.0124166667,
  altitude: 1838,
};

// az und alt sollen beide als dezimalle Grade sein
// r ist der Radius der himmlische Kugel
function azalt2xyz(az, alt, r) {
  azRad = az * DEGREE2RAD;
  altRad = alt * DEGREE2RAD;

  cosalt = Math.cos(altRad);
  return {
    x: r * Math.sin(azRad) * cosalt,
    y: r * Math.sin(altRad),
    z: -r * Math.cos(azRad) * cosalt,
  };
}

AFRAME.registerComponent("load-sky", {
  init: function () {
    let lang = localStorage.getItem("language");

    this.waypointEls = [];
    this.waypointCoords = {};
    this.camera = this.el.querySelector("a-camera");
    this.assetsEl = this.el.querySelector("a-assets");

    this.telescopePosition = this.el
      .querySelector("#fraunhoferRig")
      .getAttribute("position");

    this.fraunhoferBeam = this.el.querySelector("#fraunhoferBeam");

    this.objectCoordsPromise = fetch("resources/coordinates.json").then(
      (response) => response.json()
    );
    this.objectInfoPromise = fetch(`lang/${lang}.json`)
      .then((response) => response.json())
      .then((langDict) => langDict.skyObjects);

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

        var xyzCoords = azalt2xyz(az, alt, 100);

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
      for (var waypointEl of this.waypointEls) {
        waypointEl.addEventListener("click", this.openHologramPanel);
        waypointEl.addEventListener("raycaster-intersected", (evt) => {
          this.fraunhoferBeam.setAttribute("radius-top", 60);
        });
        waypointEl.addEventListener(
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

    waypointEl.setAttribute("id", objectId);
    waypointEl.setAttribute("position", {
      x: this.telescopePosition.x + position.x,
      y: 3.209 + position.y,
      z: this.telescopePosition.z + position.z,
    });
    waypointEl.setAttribute("mixin", "waypointFrame");
    waypointEl.setAttribute("class", "raycastable waypoint");
    waypointEl.setAttribute("look-at", "#camera");

    var waypointImageEl = document.createElement("a-entity");
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

  openHologramPanel: (evt) => {
    var waypoint = evt.target;
    var hologramPanel = waypoint.querySelector(`#${waypoint.id}HologramPanel`);

    waypoint.object3D.scale.set(2, 2, 2);
    hologramPanel.setAttribute("visible", "true");

    this.fraunhoferBeam.setAttribute("radius-top", 100);
  },

  closeHologramPanel: (evt) => {
    var waypoint = evt.target;
    var hologramPanel = waypoint.querySelector(`#${waypoint.id}HologramPanel`);

    hologramPanel.setAttribute("visible", "false");
    waypoint.object3D.scale.set(1, 1, 1);

    this.fraunhoferBeam.setAttribute("radius-top", 50);
  },

  onCancelBubbleClick: function (evt) {
    this.cancelBubbleEl.object3D.scale.set(0.001, 0.001, 0.001);
    this.infoPanelEl.object3D.scale.set(1e-5, 1e-5, 1e-5);
    this.infoPanelEl.object3D.visible = false;
    this.fadeBackgroundEl.object3D.visible = false;

    this.objectTitleEl.setAttribute("text", "value", "Unbekanntes Objekt");
    this.objectDescriptionEl.setAttribute(
      "text",
      "value",
      "Keine Beschreibung."
    );
  },
});
