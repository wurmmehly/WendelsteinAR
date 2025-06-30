const scenes = {
  "images/test1.jpg": [
    {
      position: "0 0 -5",
      target: "images/test2.jpg",
      type: "image",
    },
    {
      position: "1 0 -5",
      target: "model.html",
      type: "page",
    },
  ],
  "images/test2.jpg": [
    {
      position: "2 1 -5",
      target: "images/test3.jpg",
      type: "image",
    },
    {
      position: "-2 0 -4",
      target: "images/test1.jpg",
      type: "image",
    },
  ],
  "images/test3.jpg": [
    {
      position: "0 1 -6",
      target: "images/test1.jpg",
      type: "image",
    },
  ],
};

// Hotspot-Komponente
AFRAME.registerComponent("hotspot", {
  schema: {
    target: { type: "string" },
    targetType: { type: "string" },
  },
  init() {
    this.el.addEventListener("click", () => {
      if (this.data.targetType === "image") {
        // Bildwechsel-Logik
        document.querySelector("a-sky").setAttribute("src", this.data.target);
        this.el.remove();
        createHotspots(this.data.target);
      } else if (this.data.targetType === "page") {
        // Seitenwechsel-Logik
        window.location.href = this.data.target;
      }
    });
  },
});

// Hotspots erzeugen
const createHotspots = (img) => {
  document.querySelectorAll(".hotspot").forEach((e) => e.remove());
  (scenes[img] || []).forEach(({ position, target, type }) => {
    const h = document.createElement("a-entity");
    h.setAttribute("geometry", "primitive: plane; height: 0.6; width: 0.6");
    h.setAttribute("material", "src: #stern; transparent: true");
    h.setAttribute("position", position);

    // Setze beide Parameter für die Komponente
    h.setAttribute("hotspot", {
      target: target,
      targetType: type,
    });

    h.setAttribute("class", "hotspot");
    h.setAttribute("look-at", "[camera]");
    document.querySelector("a-scene").appendChild(h);
  });
};

document.addEventListener("DOMContentLoaded", () =>
  createHotspots("images/test1.jpg")
);
