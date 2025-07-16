// Hamburger Menü Links
const pages = [
  { key: "tour", url: "360tour.html" },
  { key: "location", url: "location.html" },
  { key: "model", url: "model.html" },
  { key: "sky", url: "fraunhofer-sim.html" },
];

// Hotspot Config
const hotspotConfig = [
  { slot: "hotspot-1", pos: "0 5 0", normal: "0 1 0", textKey: "hotspot1" },
  { slot: "hotspot-2", pos: "2 3 1", normal: "0 1 0", textKey: "hotspot2" },
  { slot: "hotspot-3", pos: "-2 3 2", normal: "0 1 0", textKey: "hotspot3" },
  { slot: "hotspot-4", pos: "1 2 -2", normal: "0 1 0", textKey: "hotspot4" },
];

let hotspotTexts = {};
let closeText = "Schließen"; // Fallback

function setLanguage(lang) {
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
  updateContent(lang);

  document.getElementById("language-modal").classList.add("hidden");
  setTimeout(function () {
    document.getElementById("consent-modal").classList.remove("hidden");
  }, 250);
  renderHamburgerMenu(lang, getCurrentPageKey());
}

function showLanguageModal() {
  document.getElementById("language-modal").classList.remove("hidden");
}

function redirectToIndex() {
  document.getElementById("redirect-modal").classList.add("hidden");
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
    document.getElementById("consent-modal").classList.add("hidden");
  } else {
    document.documentElement.lang = lang;
    updateContent(lang);
    document.getElementById("redirect-modal").classList.add("hidden");
    document.getElementById("language-modal").classList.add("hidden");
    document.getElementById("consent-modal").classList.remove("hidden");
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

      if (t?.consent) {
        document.getElementById("consent-title").textContent =
          t.consent.title || "";
        document.getElementById("consent-text").innerHTML =
          t.consent.text || "";
        document.getElementById("consent-checkbox-label").innerHTML =
          t.consent.checkbox || "";
        document.getElementById("consent-btn").textContent =
          t.consent.button || "";
      }

      hotspotTexts = t?.hotspots || {};
      closeText = t?.close || "Schließen";
      updateHotspots();
    });
}

// Hotspots dynamisch erzeugen
function updateHotspots() {
  const modelViewer = document.getElementById("model-viewer");
  if (!modelViewer) return;

  //Hotspots entfernen
  Array.from(modelViewer.querySelectorAll('button[slot^="hotspot-"]')).forEach(
    (btn) => btn.remove()
  );

  //Hotspots erzeugen
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
    modelViewer.appendChild(btn);
  });
}

// Menu Funktionen
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

  // Quiz Banner einblenden
  const currentFile = window.location.pathname.split("/").pop();
  if (currentFile !== "quiz.html") {
    const banner = document.getElementById("quiz-banner");
    if (banner) {
      banner.classList.remove("hidden");

      const lang = localStorage.getItem("language") || "de";
      fetch(`lang/${lang}.json?cb=${Date.now()}`)
        .then((r) => r.json())
        .then((t) => {
          const bannerText = document.getElementById("quiz-banner-text");
          if (bannerText) {
            bannerText.innerHTML =
              t.quizBanner?.text ||
              `Teste dein Wissen im <a href="quiz.html">Quiz</a>!`;
          }
        });
    }
  }

  // Consent
  const consentCheckbox = document.getElementById("consent-checkbox");
  const consentBtn = document.getElementById("consent-btn");
  if (consentCheckbox && consentBtn) {
    consentCheckbox.addEventListener("change", function () {
      consentBtn.disabled = !this.checked;
    });
    consentBtn.addEventListener("click", function () {
      document.getElementById("consent-modal").classList.add("hidden");
      document.getElementById("redirect-modal").classList.remove("hidden");
    });
  }
});
