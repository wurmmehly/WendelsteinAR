const DEGREE2RAD = Math.PI / 180;
const WENDELSTEIN = {
  latitude: 47.7038888889,
  longitude: 12.0124166667,
  altitude: 1838,
};

// az und alt sollen beide als dezimalle Grade sein
// r ist der Radius der himmlische Kugel
// TODO: some trouble here bc azimuth measures as east from north while A-Frame uses a right-handed coordinate system. must think on this
function azalt2xyz(az, alt, r) {
  azRad = az * DEGREE2RAD;
  altRad = alt * DEGREE2RAD;
  return {
    x: r * Math.sin(azRad),
    y: r * Math.sin(altRad),
    z: r * Math.cos(azRad),
  };
}

AFRAME.registerComponent("load-sky", {
  init: function () {
    let lang = localStorage.getItem("language");

    this.waypointEls = [];
    this.assetsEl = this.el.querySelector("a-assets");
    this.infoPanelEl = this.el.querySelector("#infoPanel");
    this.cancelBubbleEl = this.el.querySelector("#cancelBubble");
    this.fadeBackgroundEl = this.el.querySelector("#fadeBackground");

    this.objectTitleEl = this.infoPanelEl.querySelector("#objectTitle");
    this.objectDescriptionEl =
      this.infoPanelEl.querySelector("#objectDescription");

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

        this.addInfoPanelImage(objectId);

        var observation = new Orb.Observation({
          observer: WENDELSTEIN,
          target: radecCoords,
        });

        var relCoords = observation.azel(new Date());
        var xyzCoords = azalt2xyz(relCoords.azimuth, relCoords.elevation, 100);

        this.addWaypoint(objectId, xyzCoords);
      }

      // hört zu, wenn Waypoints geklickt werden
      this.onWaypointClick = this.onWaypointClick.bind(this);
      for (var i = 0; i < this.waypointEls.length; ++i) {
        this.waypointEls[i].addEventListener("click", this.onWaypointClick);
        console.log("listener added to waypoint");
      }
    });

    this.onCancelBubbleClick = this.onCancelBubbleClick.bind(this);
    this.cancelBubbleEl.addEventListener("click", this.onCancelBubbleClick);

    this.infoPanelEl.object3D.renderOrder = 2;
    this.infoPanelEl.object3D.depthTest = false;

    this.fadeBackgroundEl.object3D.renderOrder = 1;
    this.fadeBackgroundEl.getObject3D("mesh").material.depthTest = false;
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
    waypointEl.setAttribute("position", position);
    waypointEl.setAttribute("mixin", "frame");
    waypointEl.setAttribute("class", "raycastable waypoint");
    waypointEl.setAttribute("look-at", "#camera");

    var waypointChildEl = document.createElement("a-entity");
    waypointChildEl.setAttribute("material", `src: #${objectId}Image`);
    waypointChildEl.setAttribute("mixin", "poster");

    waypointEl.appendChild(waypointChildEl);

    this.waypointEls.push(waypointEl);
    this.el.append(waypointEl);
  },

  addInfoPanelImage: function (objectId) {
    var infoPanelImageEl = document.createElement("a-entity");

    infoPanelImageEl.setAttribute("id", `${objectId}InfoPanelImage`);
    infoPanelImageEl.setAttribute("mixin", "infoPanelImage");
    infoPanelImageEl.setAttribute("material", `src: #${objectId}Image`);
    infoPanelImageEl.setAttribute("visible", "false");

    this.infoPanelEl.append(infoPanelImageEl);
  },

  onWaypointClick: function (evt) {
    var objectId = evt.currentTarget.id;

    console.log(`${objectId} was just clicked!`);

    this.objectInfoPromise.then((skyObjects) => {
      var objectInfo = skyObjects[objectId];

      this.cancelBubbleEl.object3D.scale.set(1, 1, 1);

      this.infoPanelEl.object3D.scale.set(3e-3, 3e-3, 3e-3);
      if (AFRAME.utils.device.isMobile()) {
        this.infoPanelEl.object3D.scale.set(7e-3, 7e-3, 7e-3);
      }
      this.infoPanelEl.object3D.visible = true;
      this.fadeBackgroundEl.object3D.visible = true;

      if (this.objectInfoPanelImageEl) {
        this.objectInfoPanelImageEl.object3D.visible = false;
      }
      this.objectInfoPanelImageEl = document.querySelector(
        `#${objectId}InfoPanelImage`
      );
      this.objectInfoPanelImageEl.object3D.visible = true;

      this.objectTitleEl.setAttribute("text", "value", objectInfo.name);
      this.objectDescriptionEl.setAttribute("text", "value", objectInfo.desc);
    });
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
