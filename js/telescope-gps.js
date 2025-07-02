AFRAME.registerComponent("telescope-gps", {
  schema: { type: "string", default: "fraunhofer" },

  init: function () {
    fetch("resources/telescopeCoords.json")
      .then((response) => response.json())
      .then((telescopeCoords) => {
        alt = telescopeCoords[this.data].altitude;
        lat = telescopeCoords[this.data].latitude;
        lon = telescopeCoords[this.data].longitude;

        this.el.setAttribute("position", { x: 0, y: alt, z: 0 });
        this.el.setAttribute("gps-projected-entity-place", {
          latitude: lat,
          longitude: lon,
        });
      });
  },
});
