// Bild -> Hotspots
const scenes = {
  "images/test1.jpg": [
    {
      position: "0 0 -5",
      nextImage: "images/test2.jpg",
    },
  ],
  "images/test2.jpg": [
    {
      position: "2 1 -5",
      nextImage: "images/test3.jpg",
    },
    {
      position: "-2 0 -4",
      nextImage: "images/test1.jpg",
    },
  ],
  "images/test3.jpg": [
    {
      position: "0 1 -6",
      nextImage: "images/test1.jpg",
    },
  ],
};

// Hotspot-Komponente
AFRAME.registerComponent("hotspot", {
  schema: {
    type: "string",
  },
  init() {
    this.el.addEventListener("click", () => {
      document.querySelector("a-sky").setAttribute("src", this.data);
      this.el.remove();
      createHotspots(this.data);
    });
  },
});

// Hotspots erzeugen
const createHotspots = (img) => {
  document.querySelectorAll(".hotspot").forEach((e) => e.remove());
  (scenes[img] || []).forEach(({ position, nextImage }) => {
    const h = document.createElement("a-entity");
    h.setAttribute("geometry", "primitive: plane; height: 0.6; width: 0.6");
    h.setAttribute("material", "src: #stern; transparent: true");
    h.setAttribute("position", position);
    h.setAttribute("hotspot", nextImage);
    h.setAttribute("class", "hotspot");
    h.setAttribute("look-at", "[camera]");
    document.querySelector("a-scene").appendChild(h);
  });
};

document.addEventListener("DOMContentLoaded", () =>
  createHotspots("images/test1.jpg")
);
