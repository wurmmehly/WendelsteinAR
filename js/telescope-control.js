const RAD2DEG = 180 / Math.PI;

const MIN_ALT = 20;
const MAX_ALT = 90;

// wenn delta weniger als diesen Nummer ist, wird die Bewegung verworfen
const TINY_DELTA = 1e-6;

// wie schnell das Teleskop dreht, wenn es selbst bewegt
const TELESCOPE_NATURAL_SPEED = 1;

// wie schnell das Teleskop dreht, wenn man es bewegt
const EASING = 1;

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

function signOf(num) {
  return num < 0 ? -1 : 1;
}

function capSpeed(delta, max = null) {
  if (max !== null && Math.abs(delta) > max) delta = signOf(delta) * max;
  return delta;
}

AFRAME.registerComponent("telescope-control", {
  init: function () {
    this.raycaster = this.el.components["raycaster"];
    this.fraunhoferTopPart = document.querySelector("#fraunhoferTopPart");
    this.fraunhoferTelescopeRig = this.fraunhoferTopPart.querySelector(
      "#fraunhoferTelescopeRig"
    );

    this.currentRay = { alt: 0, az: 0 };
    this.previousRay = { alt: 0, az: 0 };

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
      this.waypointCoords = evt.detail.waypointCoords;
      this.closestWaypoint = this.getClosestWaypoint();
    });

    this.el.addEventListener("readmore", (evt) => {
      window.open(
        `images/objects/original/${this.closestWaypoint.objectId}.jpg`
      );
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
      alt:
        Math.asin(
          dirVec.y / (dirVec.x ** 2 + dirVec.y ** 2 + dirVec.z ** 2) ** 0.5
        ) * RAD2DEG,
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
      this.updateTelescopeAltitude(
        (this.currentRay.alt - this.previousRay.alt) * EASING
      );
      this.updateTelescopeAzimuth(
        (this.currentRay.az - this.previousRay.az) * EASING
      );
    }

    this.previousRay = this.currentRay;
    this.wasActive = true;
  },

  moveTelescopeToClosestWaypoint: function () {
    deltaAlt = modulateRotation(
      this.closestWaypoint.alt - this.currentTelescope.alt
    );
    deltaAz = modulateRotation(
      this.closestWaypoint.az - this.currentTelescope.az
    );

    if (Math.abs(deltaAlt) < TINY_DELTA && Math.abs(deltaAz) < TINY_DELTA) {
      this.lockedOnWaypoint = true;
      this.closestWaypoint.el.emit("locked-on-waypoint", {}, false);
    } else {
      this.updateTelescopeAltitude(deltaAlt, TELESCOPE_NATURAL_SPEED);
      this.updateTelescopeAzimuth(deltaAz, TELESCOPE_NATURAL_SPEED);
    }
  },

  getClosestWaypoint: function () {
    closestWaypoint = null;
    closestDistance = 1000;

    for (const [objectId, coords] of Object.entries(this.waypointCoords)) {
      if (coords.alt < MIN_ALT) continue;

      deltaAlt = modulateRotation(coords.alt - this.currentTelescope.alt);
      deltaAz = modulateRotation(coords.az - this.currentTelescope.az);

      distance = (deltaAlt ** 2 + deltaAz ** 2) ** 0.5;

      if (distance < closestDistance) {
        closestWaypoint = {
          objectId: objectId,
          alt: coords.alt,
          az: coords.az,
        };
        closestDistance = distance;
      }
    }

    closestWaypoint["el"] = document.querySelector(
      `#${closestWaypoint.objectId}`
    );

    return closestWaypoint;
  },
});
