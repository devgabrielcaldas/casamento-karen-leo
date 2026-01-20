async function loadConfig() {
  const res = await fetch("./data/config.json");
  return res.json();
}

function setTheme(config) {
  const t = config.theme;

  document.documentElement.style.setProperty("--primary", t.primary);
  document.documentElement.style.setProperty("--secondary", t.secondary);
  document.documentElement.style.setProperty("--bg", t.background);
  document.documentElement.style.setProperty("--surface", t.surface);
  document.documentElement.style.setProperty("--text", t.text);
  document.documentElement.style.setProperty("--muted", t.muted);

  // Fontes (opcional: depois a gente automatiza isso melhor)
  document.body.style.fontFamily = `${t.fontBody}, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

function setHeader(config) {
  const names = document.getElementById("coupleNames");
  const dateText = document.getElementById("dateText");

  if (names) names.textContent = config.couple.names;
  if (dateText) dateText.textContent = config.couple.dateText;
}

(async function init() {
  const config = await loadConfig();
  setTheme(config);
  setHeader(config);

  const pinInput = document.getElementById("pinInput");
  const enterBtn = document.getElementById("enterBtn");
  const pinError = document.getElementById("pinError");

  function tryEnter() {
    const pin = (pinInput?.value || "").trim();
    if (pin === config.couple.pin) {
      localStorage.setItem("wedding_access", "ok");
      window.location.href = "./gallery.html";
      return;
    }
    if (pinError) pinError.style.display = "block";
  }

  enterBtn?.addEventListener("click", tryEnter);
  pinInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryEnter();
  });
})();
