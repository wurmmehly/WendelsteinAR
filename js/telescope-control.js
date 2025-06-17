const RAD2DEG = 180 / Math.PI;

const MIN_ALT = 20;
const MAX_ALT = 90;

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

AFRAME.registerComponent("telescope-control", {
  init: function () {
    this.raycaster = this.el.components["raycaster"];
    this.fraunhoferTopPart = document.querySelector("#fraunhoferTopPart");
    this.fraunhoferTelescopeRig = document.querySelector(
      "#fraunhoferTelescopeRig"
    );

    this.currentRay = { alt: 0, az: 0 };
    this.previousRay = { alt: 0, az: 0 };

    this.active = this.wasActive = false;

    this.el.addEventListener("mousedown", (evt) => {
      this.active = true;
    });
    this.el.addEventListener("mouseup", (evt) => {
      this.active = this.wasActive = false;
    });

    this.el.addEventListener("skyloaded", (evt) => {
      this.waypointCoords = evt.detail.waypointCoords;
    });
  },

  tick: function () {
    this.currentTelescope = this.getCurrentTelescopeDirection();
    this.currentRay = this.getCurrentRayDirection();

    if (isNaN(this.currentTelescope.alt) || isNaN(this.currentRay.alt)) return;

    if (this.active) {
      this.controlTelescope();
    } else if (this.waypointCoords) {
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

  updateTelescopeAltitude: function (delta) {
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

  updateTelescopeAzimuth: function (delta) {
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
    const closestWaypoint = this.getClosestWaypoint();
    if (closestWaypoint === null) return;

    deltaAlt =
      signOf(closestWaypoint.deltaAlt) *
      min(Math.abs(closestWaypoint.deltaAlt), TELESCOPE_NATURAL_SPEED);

    deltaAz =
      signOf(closestWaypoint.deltaAz) *
      min(Math.abs(closestWaypoint.deltaAz), TELESCOPE_NATURAL_SPEED);

    this.updateTelescopeAltitude(deltaAlt);
    this.updateTelescopeAzimuth(deltaAz);
  },

  getClosestWaypoint: function () {
    closestWaypoint = null;
    closestDistance = 1000;

    for (const [objectId, coords] of Object.entries(this.waypointCoords)) {
      if (coords.alt < MIN_ALT) continue;

      deltaAlt = this.currentTelescope.alt - coords.alt;
      deltaAz = this.currentTelescope.az - coords.az;
      if (deltaAz > 180) deltaAz = 180 - deltaAz;

      distance = (deltaAlt ** 2 + deltaAz ** 2) ** 0.5;

      if (distance < closestDistance) {
        closestWaypoint = {
          objectId: objectId,
          coords: coords,
          deltaAlt: deltaAlt,
          deltaAz: deltaAz,
        };
        closestDistance = distance;
      }
    }

    return closestWaypoint;
  },
});
