const RAD2DEG = 180 / Math.PI;
const MIN_ALT = 20;
const MAX_ALT = 90;
const TELESCOPE_NATURAL_SPEED = 1;

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

AFRAME.registerComponent("telescope-control", {
  init: function () {
    this.raycaster = this.el.components["raycaster"];
    this.fraunhoferTopPart = document.querySelector("#fraunhoferTopPart");
    this.fraunhoferTelescopeRig = document.querySelector(
      "#fraunhoferTelescopeRig"
    );

    this.currentRay = { alt: 0, az: 0 };
    this.previousRay = { alt: 0, az: 0 };

    this.wasActive = false;
    this.active = false;

    this.el.addEventListener("mousedown", (evt) => {
      this.active = true;
    });
    this.el.addEventListener("mouseup", (evt) => {
      this.active = this.wasActive = false;
    });

    this.waypointsLoaded = false;
    this.el.addEventListener("skyloaded", (evt) => {
      this.waypointCoords = evt.detail.waypointCoords;
    });
  },

  tick: function () {
    this.currentTelescope = this.getCurrentTelescopeDirection();
    this.currentRay = this.getCurrentRayDirection();

    if (isNaN(this.currentTelescope.alt) || isNaN(this.currentRay.alt)) return;

    if (this.active) {
      if (this.wasActive) {
        this.updateTelescopeAltitude(
          this.currentRay.alt - this.previousRay.alt
        );
        this.updateTelescopeAzimuth(this.currentRay.az - this.previousRay.az);
      }

      this.previousRay = this.currentRay;
      this.wasActive = true;
    } else if (this.waypointCoords) {
      const closestWaypoint = this.getClosestWaypoint();

      var deltaAlt = closestWaypoint.coords.alt - this.currentTelescope.alt;
      const altSign = deltaAlt > 1 ? 1 : -1;
      if (Math.abs(deltaAlt) > TELESCOPE_NATURAL_SPEED) {
        deltaAlt = altSign * TELESCOPE_NATURAL_SPEED;
      }

      var deltaAz = closestWaypoint.coords.az - this.currentTelescope.az;
      const azSign = deltaAz > 1 ? 1 : -1;
      if (Math.abs(deltaAz) > TELESCOPE_NATURAL_SPEED) {
        deltaAz = azSign * TELESCOPE_NATURAL_SPEED;
      }

      this.updateTelescopeAltitude(deltaAlt);
      this.updateTelescopeAzimuth(deltaAz);
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

  getClosestWaypoint: function () {
    closestWaypoint = { name: "placeholder", coords: { alt: 1000, az: 1000 } };
    closestDistance = 1000;

    console.log(this.waypointCoords);

    for (const [objectId, coords] of Object.entries(this.waypointCoords)) {
      if (coords.alt < MIN_ALT) continue;

      deltaAz = this.currentTelescope.az - coords.az;
      if (deltaAz > 180) deltaAz -= 180;

      distance =
        ((this.currentTelescope.alt - coords.alt) ** 2 + deltaAz ** 2) ** 0.5;

      console.log(`${objectId}: ${distance}`);

      if (distance < closestDistance) {
        closestWaypoint = { objectId: objectId, coords: coords };
        closestDistance = distance;
      }
    }

    console.log(closestWaypoint);
    return closestWaypoint;
  },
});
