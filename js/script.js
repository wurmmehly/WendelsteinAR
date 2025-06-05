// Setzt die gewählte Sprache, speichert sie im Browser und aktualisiert die Inhalte
function setLanguage(lang) {
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
  updateContent(lang);
  const modal = document.getElementById("language-modal");
  if (modal) modal.classList.add("hidden");
}

// Zeigt das Sprachwahl-Modal an
function showLanguageModal() {
  const modal = document.getElementById("language-modal");
  if (modal) modal.classList.remove("hidden");
}

// Wird beim Laden der Seite ausgeführt
window.onload = function () {
  let lang = localStorage.getItem("language");
  const modal = document.getElementById("language-modal");
  if (!lang) {
    lang = "de";
    if (modal) modal.classList.remove("hidden");
  } else {
    if (modal) modal.classList.add("hidden");
  }
  document.documentElement.lang = lang;
  updateContent(lang);
};

// Lädt die Seitentexte dynamisch aus einer JSON-Datei entsprechend der Sprache
function updateContent(lang) {
  const cacheBuster = Date.now();
  fetch(`lang/${lang}.json?cb=${cacheBuster}`)
    .then((response) => {
      return response.json();
    })
    .then((t) => {
      // Texte
      [
        ["title", t?.title ?? ""],
        ["description", t?.description ?? ""],
        ["artutorial", t?.artutorial ?? ""],
        ["artitle", t?.artitle ?? ""],
        ["ardescription", t?.ardescription ?? ""],
      ].forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      });

      // Buttons
      [
        ["map", t?.map?.text ?? "map", t?.map?.class ?? "default-btn"],
        [
          "tutorial",
          t?.tutorial?.text ?? "Tutorial",
          t?.tutorial?.class ?? "default-btn",
        ],
      ].forEach(([id, text, cls]) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = text;
          el.className = cls;
        }
      });
    });
}
