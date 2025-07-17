document.addEventListener("DOMContentLoaded", async () => {
  const mv = document.getElementById("model-viewer");
  if (!mv) return;

  // Sprache wie von deiner Website
  let lang = localStorage.getItem("language") || "de";

  // Hotspot-Konfiguration: falls du hier (z.B. für andere Modelle) was änderst
  const hotspotConfig = [
    { slot: "hotspot-1", pos: "0 5 0", normal: "0 1 0", textKey: "hotspot1" },
    { slot: "hotspot-2", pos: "2 3 1", normal: "0 1 0", textKey: "hotspot2" },
    { slot: "hotspot-3", pos: "-2 3 2", normal: "0 1 0", textKey: "hotspot3" },
    { slot: "hotspot-4", pos: "1 2 -2", normal: "0 1 0", textKey: "hotspot4" },
  ];

  // Sprachdatei holen (wird ggf. auch in script.js geholt – kann man mehrfach machen!)
  let t = {};
  try {
    const resp = await fetch(`lang/${lang}.json?cb=${Date.now()}`);
    t = await resp.json();
  } catch (e) {
    console.warn("Sprachdatei konnte nicht geladen werden:", e);
  }

  // Hotspot-Texte rausziehen
  const hotspotTexts = t.hotspots || {};
  const closeText = t.close || "Schließen";

  // Hotspot-Buttons entfernen (falls reload etc.)
  Array.from(mv.querySelectorAll('button[slot^="hotspot-"]')).forEach((btn) =>
    btn.remove()
  );

  // Hotspot-Buttons einfügen
  hotspotConfig.forEach(({ slot, pos, normal, textKey }) => {
    const btn = document.createElement("button");
    btn.setAttribute("slot", slot);
    btn.setAttribute("data-position", pos);
    btn.setAttribute("data-normal", normal);
    btn.style =
      "background: #00883A; border-radius: 50%; width: 32px; height: 32px; border: none; cursor: pointer;";
    btn.onclick = function () {
      document.getElementById("hotspot-text").textContent =
        hotspotTexts[textKey] || "";
      document.getElementById("hotspot-close").textContent = closeText;
      document.getElementById("hotspot-popup").style.display = "block";
    };
    mv.appendChild(btn);
  });
});
