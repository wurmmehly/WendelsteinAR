// Hamburger MenÜ Links
const pages = [
  { key: "tour", url: "360tour.html" },
  { key: "location", url: "location.html" },
  { key: "model", url: "model.html" },
  { key: "sky", url: "fraunhofer-sim.html" },
];

// Sprachwahl & Content
function setLanguage(lang) {
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
  updateContent(lang);

  // Sprachmodal ausblenden
  document.getElementById("language-modal").classList.add("hidden");

  // Nach kurzer Verzögerung das zweite Modal anzeigen
  setTimeout(function () {
    document.getElementById("redirect-modal").classList.remove("hidden");
  }, 250);

  // Hamburger-Menü aktualisieren
  renderHamburgerMenu(lang, getCurrentPageKey());
}

function showLanguageModal() {
  document.getElementById("language-modal").classList.remove("hidden");
}

function redirectToIndex() {
  document.getElementById("redirect-modal").classList.add("hidden");
  /* Geolokalisierungs-Logik ggf. wieder aktivieren
  var deltaLon;
  var deltaLat;
  fetch("./resources/geoCoords.json")
    .then((response) => response.json())
    .then((geoCoords) => {
      navigator.geolocation.getCurrentPosition(
        (loc) => {
          deltaLat = Math.abs(
            loc.coords.latitude - geoCoords.fraunhofer.latitude
          );
          deltaLon = Math.abs(
            loc.coords.longitude - geoCoords.fraunhofer.longitude
          );
        },
        (err) => {
          deltaLat = deltaLon = 1000;
        }
      );
    });

  if (deltaLon ** 2 + deltaLat ** 2 < FAR ** 2) {
    document.getElementById("redirect-modal").classList.add("hidden");
  } else {
    redirectToOtherPage();
  }
  */
}

function redirectToOtherPage() {
  window.location.href = "index_anywhere.html";
}

window.onload = function () {
  let lang = localStorage.getItem("language") || "de";
  let currentPageKey = getCurrentPageKey();
  renderHamburgerMenu(lang, currentPageKey);

  if (!lang) {
    document.getElementById("language-modal").classList.remove("hidden");
    document.getElementById("redirect-modal").classList.add("hidden");
  } else {
    document.documentElement.lang = lang;
    updateContent(lang);
    document.getElementById("redirect-modal").classList.remove("hidden");
    document.getElementById("language-modal").classList.add("hidden");
  }
};

// Content aktualisieren mit Sprachdatei
function updateContent(lang) {
  const cacheBuster = Date.now();
  fetch(`lang/${lang}.json?cb=${cacheBuster}`)
    .then((response) => response.json())
    .then((t) => {
      [
        ["title", t?.title ?? ""],
        ["description", t?.description ?? ""],
        ["artutorial", t?.artutorial ?? ""],
        ["artitle", t?.artitle ?? ""],
        ["ardescription", t?.ardescription ?? ""],
        ["redirect", t?.redirect ?? ""],
      ].forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      });

      [
        [
          "marker",
          t?.marker?.text ?? "marker",
          t?.marker?.class ?? "default-btn",
        ],
        ["map", t?.map?.text ?? "map", t?.map?.class ?? "default-btn"],
        [
          "panorama",
          t?.panorama?.text ?? "panorama",
          t?.panorama?.class ?? "default-btn",
        ],
        [
          "tutorial",
          t?.tutorial?.text ?? "Tutorial",
          t?.tutorial?.class ?? "default-btn",
        ],
        ["redirectYesBtn", t?.redirectYes ?? "Ja", "btn redirect-btn-yes"],
        ["redirectNoBtn", t?.redirectNo ?? "Nein", "btn redirect-btn-no"],
      ].forEach(([id, text, cls]) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = text;
          el.className = cls;
        }
      });
    });
}

//Menu Funktionen
function getCurrentPageKey() {
  const file = window.location.pathname.split("/").pop();
  if (file === "360tour.html") return "tour";
  if (file === "location.html") return "location";
  if (file === "model.html") return "model";
  if (file === "fraunhofer-sim.html") return "sky";
  return null;
}

function renderHamburgerMenu(lang, currentPageKey) {
  fetch(`lang/${lang}.json?cb=${Date.now()}`)
    .then((response) => response.json())
    .then((t) => {
      const nav = document.getElementById("menu-nav");
      if (!nav) return;
      nav.innerHTML = "";
      pages.forEach((page) => {
        if (page.key === currentPageKey) {
          const span = document.createElement("span");
          span.textContent = t.menu?.[page.key] ?? page.key;
          span.className = "current-page";
          nav.appendChild(span);
        } else {
          const a = document.createElement("a");
          a.href = page.url;
          a.textContent = t.menu?.[page.key] ?? page.key;
          nav.appendChild(a);
        }
      });
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menu-toggle");
  const menuNav = document.getElementById("menu-nav");
  if (menuToggle && menuNav) {
    menuToggle.addEventListener("click", () => {
      menuNav.classList.toggle("hidden");
    });

    menuNav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        menuNav.classList.add("hidden");
      }
    });
  }
});
