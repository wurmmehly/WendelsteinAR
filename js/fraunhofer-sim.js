const RAD2DEG = 180 / Math.PI;
const LANG = localStorage.getItem("language");
const urlParams = new URLSearchParams(window.location.search);
const locationName = urlParams.get("loc");

var location;
var FRAUNHOFER;

// wie weit vom Teleskop Objekte im Himmel stehen sollen
const CELESTIAL_SPHERE_RADIUS = 100;

// wie weit das Teleskop hoch und runter drehen kann
const MIN_ALT = 20;
const MAX_ALT = 90;

// wenn delta weniger als diesen Nummer ist, wird die Bewegung ignoriert
const TINY_DELTA = 1e-6;

// wie schnell das Teleskop dreht, wenn es sich selbst bewegt
const TELESCOPE_NATURAL_SPEED = 1;

// wie schnell das Teleskop dreht, wenn man es bewegt
const EASING = 1;

const langPromise = fetch(`lang/${LANG}.json`).then((response) => response.json());
const geoCoordsPromise = fetch("./resources/geoCoords.json").then((response) => response.json());
const skyCoordsPromise = fetch("./resources/skyCoords.json").then((response) => response.json());

// Globales Objekt für die Waypoints und deren Koordinaten
var waypoints = {};
var waypointAzAlt = {};

function radec2azalt(radec, observer, time = null) {
  observation = new Orb.Observation({
    observer: observer,
    target: radec,
  });

  if (!time) time = new Date();
  var azalt = observation.azel(time);

  return {
    alt: azalt.elevation,
    az: azalt.azimuth > 180 ? azalt.azimuth - 360 : azalt.azimuth,
  };
}

function signOf(num) {
  return num < 0 ? -1 : 1;
}

function capSpeed(delta, max = null) {
  if (max !== null && Math.abs(delta) > max) delta = signOf(delta) * max;
  return delta;
}

function modulateRotation(degrees) {
  const initiallyNeg = degrees < 0;

  if (initiallyNeg) {
    degrees = 180 - degrees;
  }

  degrees = degrees % 360;

  if (initiallyNeg) {
    degrees = 180 - degrees;
  }

  return degrees;
}

function setAttributes(element, attributes) {
  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, value);
  }
  return element;
}

function createElement(tagName, attributes) {
  return setAttributes(document.createElement(tagName), attributes);
}

function animate(element, property, val, animationOverrides = {}) {
  var animationProps = {
    property: property,
    to: val,
    dur: 200,
    easing: "easeInOutQuad",
  };

  for (const [override, value] of Object.entries(animationOverrides)) {
    animationProps[override] = value;
  }

  element.setAttribute(`animation__${property}`, animationProps);
}

AFRAME.registerComponent("load-sky", {
  init: function () {
    this.primaryMirror = document.querySelector("#primaryMirror");

    this.overlay = document.querySelector("#overlay");
    this.readMoreContainer = this.overlay.querySelector("#readMoreContainer");

    this.openHologramPanel = this.openHologramPanel.bind(this);
    this.highlightWaypoint = this.highlightWaypoint.bind(this);
    this.closeHologramPanel = this.closeHologramPanel.bind(this);

    this.tickCount = 0;

    geoCoordsPromise.then((geoCoords) => {
      setAttributes(this.el, {
        position: {
          x: 0,
          y: geoCoords.fraunhofer.altitude + 3.209,
          z: 0,
        },
        "gps-projected-entity-place": {
          latitude: geoCoords.fraunhofer.latitude,
          longitude: geoCoords.fraunhofer.longitude,
        },
      });
    });

    skyCoordsPromise.then((skyCoords) => {
      const assets = document.querySelector("a-assets");
      for (const objectId of Object.keys(skyCoords)) {
        this.addWaypoint(objectId, assets);
      }
      this.updateWaypointsPos();
    });

    document.querySelector("a-camera").emit("skyloaded", {}, false);
  },

  tick: function () {
    if (this.tickCount < 100) {
      this.tickCount++;
    } else {
      this.updateWaypointsPos();
      this.tickCount = 0;
    }
  },

  // Erstellt einen Waypoint und fügt ihn zum Himmel hinzu
  addWaypoint: function (objectId, assets) {
    assets.append(
      createElement("img", {
        id: objectId + "Image",
        src: `./images/objects/${objectId}.webp`,
        crossorigin: "anonymous",
      })
    );

    var waypointAzStick = createElement("a-entity", {
      id: `${objectId}WaypointAzStick`,
    });

    var waypointAltStick = createElement("a-entity", {
      id: `${objectId}WaypointAltStick`,
    });

    var waypointFrameEl = createElement("a-entity", {
      id: objectId + "WaypointFrame",
      mixin: "waypointFrame",
      class: "waypoint",
      position: { x: 0, y: 0, z: -CELESTIAL_SPHERE_RADIUS },
    });

    var waypointImageEl = createElement("a-entity", {
      id: `${objectId}WaypointImage`,
      material: { src: `#${objectId}Image` },
      mixin: "waypointImage",
    });
    waypointFrameEl.appendChild(waypointImageEl);

    var waypointRaycastableEl = createElement("a-entity", {
      id: objectId,
      class: "raycastable",
      mixin: "waypointRaycastable",
      position: { x: 0, y: 0, z: -CELESTIAL_SPHERE_RADIUS },
    });

    waypointRaycastableEl.addEventListener("locked-on-waypoint", this.openHologramPanel);
    waypointRaycastableEl.addEventListener("raycaster-intersected", this.highlightWaypoint);
    waypointRaycastableEl.addEventListener(
      "raycaster-intersected-cleared",
      this.closeHologramPanel
    );

    langPromise.then((langDict) => {
      waypointFrameEl.appendChild(
        this.createInfoHologram(objectId, langDict.skyObjects[objectId].name)
      );
    });

    waypoints[objectId] = {
      frame: waypointFrameEl,
      image: waypointImageEl,
      raycastable: waypointRaycastableEl,
      azStick: waypointAzStick,
      altStick: waypointAltStick,
    };

    waypointAltStick.append(waypointFrameEl);
    waypointAltStick.append(waypointRaycastableEl);
    waypointAzStick.append(waypointAltStick);
    this.el.append(waypointAzStick);
  },

  updateWaypointsPos: function () {
    geoCoordsPromise.then((geoCoords) => {
      skyCoordsPromise.then((skyCoords) => {
        for (const [objectId, els] of Object.entries(waypoints)) {
          coords = radec2azalt(skyCoords[objectId], geoCoords.fraunhofer);
          waypointAzAlt[objectId] = coords;
          els.azStick.setAttribute("rotation", { x: 0, y: -coords.az, z: 0 });
          els.altStick.setAttribute("rotation", { x: coords.alt, y: 0, z: 0 });
        }
      });
    });
  },

  createInfoHologram: function (objectId, title) {
    infoHologramEl = createElement("a-entity", {
      id: `${objectId}HologramPanel`,
      mixin: "hologramPanel",
    });

    infoHologramEl.appendChild(
      createElement("a-entity", {
        id: `${objectId}Title`,
        mixin: "hologramTitle",
        text: { value: title },
      })
    );

    return infoHologramEl;
  },

  createReadMoreButton: function (objectId) {
    var readMoreEl = createElement("a", {
      id: "readMore",
      class: "button",
      href: "./object.html?id=" + objectId,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    langPromise.then((langDict) => {
      readMoreEl.textContent = langDict.readmore;
    });

    return readMoreEl;
  },

  highlightWaypoint: function (evt) {
    animate(waypoints[evt.target.id].frame, "scale", {
      x: 1.2,
      y: 1.2,
      z: 1.2,
    });
  },

  openHologramPanel: function (evt) {
    for (const objectId of Object.keys(waypoints)) {
      if (objectId === evt.target.id) continue;

      var otherWaypointFrame = waypoints[objectId].frame;
      animate(otherWaypointFrame, "position", {
        x: 0,
        y: 0,
        z: -(CELESTIAL_SPHERE_RADIUS + 10),
      });
    }

    this.primaryMirror.setAttribute("mirror-rays", { number: 4 });

    var waypointFrame = waypoints[evt.target.id].frame;
    animate(waypointFrame, "scale", { x: 1.5, y: 1.5, z: 1.5 });
    waypointFrame.querySelector(`#${evt.target.id}HologramPanel`).setAttribute("visible", "true");

    var readMoreEl = this.overlay.querySelector("#readMore");
    if (readMoreEl) readMoreEl.remove();
    this.readMoreContainer.appendChild(this.createReadMoreButton(evt.target.id));
  },

  closeHologramPanel: function (evt) {
    for (const objectId of Object.keys(waypoints)) {
      if (objectId === evt.target.id) continue;

      var otherWaypointFrame = waypoints[objectId].frame;
      animate(otherWaypointFrame, "position", {
        x: 0,
        y: 0,
        z: -CELESTIAL_SPHERE_RADIUS,
      });
    }

    this.primaryMirror.setAttribute("mirror-rays", { number: 60 });

    var waypointFrame = waypoints[evt.target.id].frame;
    waypointFrame.querySelector(`#${evt.target.id}HologramPanel`).setAttribute("visible", "false");

    animate(waypointFrame, "scale", { x: 1, y: 1, z: 1 });

    readMoreEl = this.readMoreContainer.querySelector("#readMore");
    if (readMoreEl) readMoreEl.remove();
  },
});

AFRAME.registerComponent("telescope-control", {
  init: function () {
    this.raycaster = this.el.components["raycaster"];
    this.fraunhoferRig = document.querySelector("#fraunhoferRig");
    this.fraunhoferTopPart = document.querySelector("#fraunhoferTopPart");
    this.fraunhoferTelescopeRig = this.fraunhoferTopPart.querySelector("#fraunhoferTelescopeRig");

    this.currentRay = { alt: 0, az: 0 };
    this.previousRay = { alt: 0, az: 0 };
    this.currentTelescope = this.getCurrentTelescopeDirection();

    this.active = this.wasActive = false;
    this.lockedOnWaypoint = false;

    // activate
    this.el.addEventListener("mousedown", (evt) => {
      this.active = true;
      this.lockedOnWaypoint = false;
    });
    // deactivate
    this.el.addEventListener("mouseup", (evt) => {
      this.active = this.wasActive = false;
      this.closestWaypoint = this.getClosestWaypoint();
    });

    this.el.addEventListener("skyloaded", (evt) => {
      this.closestWaypoint = this.getClosestWaypoint();
    });
  },

  tick: function () {
    this.currentTelescope = this.getCurrentTelescopeDirection();
    this.currentRay = this.getCurrentRayDirection();

    if (isNaN(this.currentTelescope.alt) || isNaN(this.currentRay.alt)) return;

    if (this.active) {
      this.controlTelescope();
    } else if (this.closestWaypoint && !this.lockedOnWaypoint) {
      this.moveTelescopeToClosestWaypoint();
    }
  },

  getCurrentRayDirection: function () {
    const dirVec = this.raycaster.data.direction;

    return {
      alt: Math.asin(dirVec.y / (dirVec.x ** 2 + dirVec.y ** 2 + dirVec.z ** 2) ** 0.5) * RAD2DEG,
      az: Math.atan2(dirVec.x, -dirVec.z) * RAD2DEG,
    };
  },

  getCurrentTelescopeDirection: function () {
    return {
      alt: this.fraunhoferTelescopeRig.getAttribute("rotation").x,
      az: -this.fraunhoferTopPart.getAttribute("rotation").y,
    };
  },

  updateTelescopeAltitude: function (delta, max = null) {
    delta = capSpeed(delta, max);

    var newTelescopeAlt = this.currentTelescope.alt + delta;

    if (newTelescopeAlt < MIN_ALT) {
      newTelescopeAlt = MIN_ALT;
    } else if (newTelescopeAlt > MAX_ALT) {
      newTelescopeAlt = MAX_ALT;
    }

    this.fraunhoferTelescopeRig.setAttribute("rotation", {
      x: newTelescopeAlt,
      y: 0,
      z: 0,
    });
  },

  updateTelescopeAzimuth: function (delta, max = null) {
    delta = capSpeed(delta, max);

    var newTelescopeAz = modulateRotation(-(this.currentTelescope.az + delta));

    this.fraunhoferTopPart.setAttribute("rotation", {
      x: 0,
      y: newTelescopeAz,
      z: 0,
    });
  },

  controlTelescope: function () {
    if (this.wasActive) {
      this.updateTelescopeAltitude((this.currentRay.alt - this.previousRay.alt) * EASING);
      this.updateTelescopeAzimuth((this.currentRay.az - this.previousRay.az) * EASING);
    }

    this.previousRay = this.currentRay;
    this.wasActive = true;
  },

  moveTelescopeToClosestWaypoint: function () {
    deltaAlt = modulateRotation(
      waypointAzAlt[this.closestWaypoint].alt - this.currentTelescope.alt
    );
    deltaAz = modulateRotation(waypointAzAlt[this.closestWaypoint].az - this.currentTelescope.az);

    if (Math.abs(deltaAlt) < TINY_DELTA && Math.abs(deltaAz) < TINY_DELTA) {
      this.lockedOnWaypoint = true;
      waypoints[this.closestWaypoint].raycastable.emit("locked-on-waypoint", {}, false);
    } else {
      this.updateTelescopeAltitude(deltaAlt, TELESCOPE_NATURAL_SPEED);
      this.updateTelescopeAzimuth(deltaAz, TELESCOPE_NATURAL_SPEED);
    }
  },

  getClosestWaypoint: function () {
    closestWaypoint = null;
    closestDistance = 1000;

    for (const [objectId, coords] of Object.entries(waypointAzAlt)) {
      if (coords.alt < MIN_ALT) continue;

      deltaAlt = modulateRotation(coords.alt - this.currentTelescope.alt);
      deltaAz = modulateRotation(coords.az - this.currentTelescope.az);

      distance = (deltaAlt ** 2 + deltaAz ** 2) ** 0.5;

      if (distance < closestDistance) {
        closestWaypoint = objectId;
        closestDistance = distance;
      }
    }

    return closestWaypoint;
  },
});

AFRAME.registerComponent("telescope-gps", {
  schema: { type: "string", default: "fraunhofer" },

  init: function () {
    fetch("resources/geoCoords.json")
      .then((response) => response.json())
      .then((geoCoords) => {
        alt = geoCoords[this.data].altitude;
        lat = geoCoords[this.data].latitude;
        lon = geoCoords[this.data].longitude;

        setAttributes(this.el, {
          position: { x: 0, y: alt, z: 0 },
          "gps-projected-entity-place": { latitude: lat, longitude: lon },
        });
      });
  },
});

AFRAME.registerComponent("mirror-rays", {
  schema: {
    number: { type: "number", default: 60 },
    start: { type: "vec3" },
    length: { type: "number" },
    tilt: { type: "number" },
  },

  init: function () {
    this.rays = [];
    this.rayContainers = [];

    this.addRays(this.data.number);
  },

  update: function () {
    this.removeAllRays();
    this.addRays(this.data.number);
    this.animate();
  },

  remove: function () {
    this.removeAllRays();
  },

  addRays: function (num) {
    const interval = 360 / num;
    var i = 0;
    while (i < num) {
      const rayContainer = createElement("a-entity", {
        rotation: { x: 0, y: i * interval, z: 0 },
      });
      const rayTiltContainer = createElement("a-entity", {
        position: this.data.start,
        rotation: { x: this.data.tilt, y: 0, z: 0 },
      });
      const ray = createElement("a-entity", {
        mixin: "mirrorRay",
        line: {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: this.data.length, z: 0 },
        },
      });
      this.rays.push(ray);
      this.rayContainers.push(rayContainer);

      rayTiltContainer.append(ray);
      rayContainer.append(rayTiltContainer);
      this.el.append(rayContainer);
      i++;
    }
  },

  removeAllRays: function () {
    for (const rayContainer of this.rayContainers) {
      rayContainer.remove();
    }
    this.rays = [];
    this.rayContainers = [];
  },

  animate: function () {
    const segmentLength = 5;
    for (const ray of this.rays) {
      var rayHighlight = createElement("a-entity", {
        mixin: "mirrorRay",
        line: {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: segmentLength, z: 0 },
          opacity: 1,
        },
        position: { x: 0, y: 0, z: 0 },
        animation: {
          property: "position",
          to: {
            x: 0,
            y: this.data.length - segmentLength,
            z: 0,
          },
          dur: 2000,
          easing: "linear",
          loop: true,
        },
      });
      ray.after(rayHighlight);
    }
  },
});

AFRAME.registerComponent("camera-gps", {
  init: function () {
    if (locationName) {
      setAttributes(this.el, {
        simulateLatitude: location.latitude,
        simulateLongitude: location.longitude,
        simulateAltitude: location.altitude,
      });
    } else {
      this.el.setAttribute("gps-projected-camera", {
        gpsMinDistance: 15,
        gpsTimeInterval: 5,
      });
    }
  },
});
