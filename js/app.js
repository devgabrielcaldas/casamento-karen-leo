// app.js

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erro ao carregar ${path}: ${res.status}`);
  return res.json();
}

async function loadConfig() {
  return loadJson("./data/config.json");
}

/**
 * Resolve fontes do config para alternativas grátis (Google Fonts).
 * - "The Seasons" -> Playfair Display (similar e grátis)
 * - "Eyesome Script" -> Great Vibes (similar e grátis)
 *
 * Observação: no config você pode usar:
 * - fontTitle
 * - fontBody
 * - fontDate (preferencial) ou fontScript (compatibilidade)
 */
function normalizeFonts(t) {
  const titleRaw = String(t.fontTitle || "");
  const bodyRaw = String(t.fontBody || "");
  const dateRaw = String(t.fontDate || t.fontScript || "");

  const title = titleRaw.toLowerCase();
  const date = dateRaw.toLowerCase();

  const resolved = {
    fontTitle: titleRaw || "Playfair Display",
    fontBody: bodyRaw || "Inter",
    fontDate: dateRaw || "Great Vibes",
  };

  if (title.includes("the seasons")) resolved.fontTitle = "Playfair Display";
  if (date.includes("eyesome")) resolved.fontDate = "Great Vibes";

  return resolved;
}

function toGoogleFamily(family) {
  return String(family).trim().replace(/\s+/g, "+");
}

/**
 * Para fontes comuns com pesos (Inter, Playfair etc.)
 */
function googleFontsHrefWeights(family, weights = "300;400;600;700") {
  const name = toGoogleFamily(family);
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${weights}&display=swap`;
}

/**
 * Para fontes script (geralmente sem wght)
 */
function googleFontsHref(family) {
  const name = toGoogleFamily(family);
  return `https://fonts.googleapis.com/css2?family=${name}&display=swap`;
}

function ensureFontLink(id, href) {
  const el = document.getElementById(id);
  if (el && el.tagName === "LINK") el.setAttribute("href", href);
}

function setTheme(config) {
  const t = config.theme || {};
  const fonts = normalizeFonts(t);

  // cores base
  document.documentElement.style.setProperty("--primary", t.primary || "#E89AA4");
  document.documentElement.style.setProperty("--secondary", t.secondary || "#1F2A44");
  document.documentElement.style.setProperty("--bg", t.background || "#0B0F1A");
  document.documentElement.style.setProperty("--surface", t.surface || "#111827");
  document.documentElement.style.setProperty("--text", t.text || "#F8FAFC");
  document.documentElement.style.setProperty("--muted", t.muted || "#94A3B8");

  // cores específicas do topo
  document.documentElement.style.setProperty("--title-color", t.titleColor || t.secondary || "#1F2A44");
  document.documentElement.style.setProperty("--date-color", t.dateColor || t.primary || "#E89AA4");

  // tipografia via CSS vars (o CSS usa var(--font-title) etc.)
  document.documentElement.style.setProperty("--font-title", `"${fonts.fontTitle}"`);
  document.documentElement.style.setProperty("--font-body", `"${fonts.fontBody}"`);
  document.documentElement.style.setProperty("--font-date", `"${fonts.fontDate}"`);

  // carrega fontes (Google Fonts) via <link id="...">
  // title/body com pesos
  ensureFontLink("fontTitle", googleFontsHrefWeights(fonts.fontTitle, "400;600;700"));
  ensureFontLink("fontBody", googleFontsHrefWeights(fonts.fontBody, "300;400;600;700"));

  // date/script sem wght (pra não quebrar)
  // suporte: id="fontDate" (recomendado) ou id="fontScript" (compat)
  ensureFontLink("fontDate", googleFontsHref(fonts.fontDate));
  ensureFontLink("fontScript", googleFontsHref(fonts.fontDate));

  // garante body font geral
  document.body.style.fontFamily = `var(--font-body), system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

function setHeader(config) {
  const names = document.getElementById("coupleNames");
  const dateText = document.getElementById("dateText");

  if (names) names.textContent = config.couple?.names || "";
  if (dateText) dateText.textContent = config.couple?.dateText || "";

  // garante aplicação mesmo se algum CSS estiver hardcoded
  if (names) {
    names.style.fontFamily = `var(--font-title), serif`;
    names.style.color = `var(--title-color)`;
  }
  if (dateText) {
    dateText.style.fontFamily = `var(--font-date), cursive`;
    dateText.style.color = `var(--date-color)`;
  }
}

function bindPin(config) {
  const pinInput = document.getElementById("pinInput");
  const enterBtn = document.getElementById("enterBtn");
  const pinError = document.getElementById("pinError");

  function tryEnter() {
    const pin = (pinInput?.value || "").trim();
    if (pin === String(config.couple?.pin || "")) {
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
}

(async function init() {
  try {
    const config = await loadConfig();
    setTheme(config);
    setHeader(config);
    bindPin(config);
  } catch (err) {
    console.error(err);
  }
})();
