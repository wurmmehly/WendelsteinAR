AFRAME.registerComponent("telescope-gps", {
  schema: { type: "string", default: "fraunhofer" },

  init: function () {
    fetch("resources/geoCoords.json")
      .then((response) => response.json())
      .then((geoCoords) => {
        alt = geoCoords[this.data].altitude;
        lat = geoCoords[this.data].latitude;
        lon = geoCoords[this.data].longitude;

        this.el.setAttribute("position", { x: 0, y: alt, z: 0 });
        this.el.setAttribute("gps-projected-entity-place", {
          latitude: lat,
          longitude: lon,
        });
      });
  },
});
