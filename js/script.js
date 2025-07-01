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
  let lang = localStorage.getItem("language");
  if (!lang) {
    document.getElementById("language-modal").classList.remove("hidden");
    document.getElementById("redirect-modal").classList.add("hidden");
  } else {
    document.documentElement.lang = lang;
    updateContent(lang);
    // Direkt das zweite Modal zeigen
    document.getElementById("redirect-modal").classList.remove("hidden");
    document.getElementById("language-modal").classList.add("hidden");
  }
};

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
