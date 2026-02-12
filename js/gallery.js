// ---------- Helpers ----------
async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erro ao carregar ${path}: ${res.status}`);
  return res.json();
}

async function loadConfig() {
  return loadJson("./data/config.json");
}
async function loadStories() {
  return loadJson("./data/stories.json");
}
async function loadGalleryIndex() {
  return loadJson("./data/gallery.json");
}

// ---------- Theme/Header ----------
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

function googleFontsHrefWeights(family, weights = "300;400;600;700") {
  const name = toGoogleFamily(family);
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${weights}&display=swap`;
}

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

  document.documentElement.style.setProperty("--primary", t.primary || "#E89AA4");
  document.documentElement.style.setProperty("--secondary", t.secondary || "#1F2A44");
  document.documentElement.style.setProperty("--bg", t.background || "#0B0F1A");
  document.documentElement.style.setProperty("--surface", t.surface || "#111827");
  document.documentElement.style.setProperty("--text", t.text || "#F8FAFC");
  document.documentElement.style.setProperty("--muted", t.muted || "#94A3B8");

  document.documentElement.style.setProperty("--title-color", t.titleColor || t.secondary || "#1F2A44");
  document.documentElement.style.setProperty("--date-color", t.dateColor || t.primary || "#E89AA4");

  // vars de fontes (usadas no CSS)
  document.documentElement.style.setProperty("--font-title", `"${fonts.fontTitle}"`);
  document.documentElement.style.setProperty("--font-body", `"${fonts.fontBody}"`);
  document.documentElement.style.setProperty("--font-date", `"${fonts.fontDate}"`);

  // links das fontes
  ensureFontLink("fontTitle", googleFontsHrefWeights(fonts.fontTitle, "400;600;700"));
  ensureFontLink("fontBody", googleFontsHrefWeights(fonts.fontBody, "300;400;600;700"));

  // fonte de data/script sem wght
  ensureFontLink("fontDate", googleFontsHref(fonts.fontDate));

  // body font fallback
  document.body.style.fontFamily = `var(--font-body), system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

function setHeader(config) {
  const names = document.getElementById("coupleNames");
  const dateText = document.getElementById("dateText");

  if (names) names.textContent = config.couple?.names || "";
  if (dateText) dateText.textContent = config.couple?.dateText || "";

  if (names) {
    names.style.fontFamily = `var(--font-title), serif`;
    names.style.color = `var(--title-color)`;
  }
  if (dateText) {
    dateText.style.fontFamily = `var(--font-date), cursive`;
    dateText.style.color = `var(--date-color)`;
  }
}

// ---------- Stories ----------
function renderStories(stories) {
  const container = document.getElementById("stories");
  if (!container) return;

  container.innerHTML = "";
  if (!Array.isArray(stories) || stories.length === 0) return;

  stories.forEach((story) => {
    const el = document.createElement("div");
    el.className = "story";
    el.innerHTML = `
      <img src="${story.thumbnail}" alt="${story.title}">
      <span>${story.title}</span>
    `;
    el.addEventListener("click", () => {
      alert("Em breve: modal de story (imagem/vídeo) fullscreen");
    });
    container.appendChild(el);
  });
}

// ---------- Gallery + Modal State ----------
const THUMBS_PER_SECTION = 24;

// A modal navega SOMENTE dentro da seção clicada
let modalList = [];
let currentIndex = 0;

// Cache para não refazer fetch da mesma seção
const sectionCache = new Map(); // src -> items[]

// swipe
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// ---------- Modal ----------
function isModalOpen() {
  const modal = document.getElementById("photoModal");
  return !!(modal && !modal.classList.contains("hidden"));
}

function openModal(index) {
  const modal = document.getElementById("photoModal");
  const img = document.getElementById("modalImage");
  const title = document.getElementById("modalTitle");
  const counter = document.getElementById("modalCounter");
  const downloadBtn = document.getElementById("downloadBtn");
  const loader = document.getElementById("imgLoader");

  if (!modal || !img || !title || !counter || !downloadBtn) return;
  if (!modalList.length) return;

  currentIndex = ((index % modalList.length) + modalList.length) % modalList.length;
  const item = modalList[currentIndex];

  img.onload = null;
  img.onerror = null;

  if (loader) {
    loader.textContent = "Carregando…";
    loader.style.display = "flex";
  }

  img.onload = () => {
    if (loader) loader.style.display = "none";
  };

  img.onerror = () => {
    if (loader) loader.textContent = "Falha ao carregar";
  };

  title.textContent = item.sectionTitle || "";
  counter.textContent = `${currentIndex + 1} / ${modalList.length}`;
  downloadBtn.href = item.download || item.full || item.thumb || item.src || "#";

  img.src = item.full || item.src || item.thumb;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("photoModal");
  const img = document.getElementById("modalImage");
  const loader = document.getElementById("imgLoader");

  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");

  if (img) {
    img.onload = null;
    img.onerror = null;
    img.src = "";
  }

  if (loader) loader.style.display = "none";
}

function prevPhoto() {
  if (!modalList.length) return;
  openModal(currentIndex - 1);
}

function nextPhoto() {
  if (!modalList.length) return;
  openModal(currentIndex + 1);
}

// ---------- Sections (Lazy Load) ----------
async function loadSectionItems(src) {
  if (!src) return [];
  if (sectionCache.has(src)) return sectionCache.get(src);

  const data = await loadJson(src);

  // aceita formatos: { items: [...] } ou { photos: [...] }
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.photos)
      ? data.photos
      : [];

  sectionCache.set(src, items);
  return items;
}

function renderThumbs(row, items, sectionTitle) {
  if (!row) return;

  row.innerHTML = "";

  const slice = items.slice(0, THUMBS_PER_SECTION);

  slice.forEach((item, idx) => {
    const thumbUrl = item.thumb || item.src || item.full;
    if (!thumbUrl) return;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.innerHTML = `<img loading="lazy" src="${thumbUrl}" alt="Foto">`;

    thumb.addEventListener("click", () => {
      // quando clica, a modal usa a lista completa da seção
      modalList = items.map((x) => ({ ...x, sectionTitle }));
      openModal(idx);
    });

    row.appendChild(thumb);
  });

  // se não tiver nada, mostra aviso
  if (!slice.length) {
    row.innerHTML = `<div class="empty">Sem fotos nesta seção.</div>`;
  }
}

function renderSections(sectionsIndex) {
  const wrapper = document.getElementById("sections");
  if (!wrapper) return;

  wrapper.innerHTML = "";

  sectionsIndex.forEach((section) => {
    const rowId = `row-${section.id}`;

    const block = document.createElement("div");
    block.className = "section-row";
    block.dataset.src = section.src || "";
    block.dataset.title = section.title || "";

    block.innerHTML = `
      <h3>${section.title || ""}</h3>
      <div class="row-wrap">
        <button class="row-arrow left" aria-label="Voltar">‹</button>
        <div class="carousel-row" id="${rowId}"></div>
        <button class="row-arrow right" aria-label="Avançar">›</button>
      </div>
    `;

    wrapper.appendChild(block);

    const row = block.querySelector(`#${rowId}`);
    const leftBtn = block.querySelector(".row-arrow.left");
    const rightBtn = block.querySelector(".row-arrow.right");

    const scrollBy = () => Math.floor((row.clientWidth || 600) * 0.85);

    leftBtn?.addEventListener("click", () => {
      row.scrollBy({ left: -scrollBy(), behavior: "smooth" });
    });

    rightBtn?.addEventListener("click", () => {
      row.scrollBy({ left: scrollBy(), behavior: "smooth" });
    });

    // placeholder enquanto carrega
    if (row) row.innerHTML = `<div class="empty">Carregando…</div>`;
  });
}

function observeSections() {
  const blocks = document.querySelectorAll(".section-row[data-src]");

  const io = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const block = entry.target;
        const src = block.dataset.src;
        const title = block.dataset.title || block.querySelector("h3")?.textContent || "";
        const row = block.querySelector(".carousel-row");

        try {
          const items = await loadSectionItems(src);
          renderThumbs(row, items, title);
        } catch (e) {
          console.error(e);
          if (row) row.innerHTML = `<div class="empty">Erro ao carregar.</div>`;
        }

        io.unobserve(block);
      }
    },
    { rootMargin: "250px" } // pré-carrega antes de aparecer
  );

  blocks.forEach((b) => io.observe(b));
}

// ---------- Bindings ----------
function bindModalControls() {
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modalBackdrop")?.addEventListener("click", closeModal);
  document.getElementById("navLeft")?.addEventListener("click", prevPhoto);
  document.getElementById("navRight")?.addEventListener("click", nextPhoto);

  window.addEventListener("keydown", (e) => {
    if (!isModalOpen()) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") prevPhoto();
    if (e.key === "ArrowRight") nextPhoto();
  });

  const modalBody = document.querySelector(".modal-body");
  modalBody?.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchEndX = t.clientX;
      touchEndY = t.clientY;
    },
    { passive: true }
  );

  modalBody?.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      touchEndX = t.clientX;
      touchEndY = t.clientY;
    },
    { passive: true }
  );

  modalBody?.addEventListener("touchend", () => {
    if (!isModalOpen()) return;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) < 40) return;
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx > 0) prevPhoto();
    else nextPhoto();

    touchStartX = touchStartY = touchEndX = touchEndY = 0;
  });

  document.getElementById("copyBtn")?.addEventListener("click", async () => {
    const item = modalList[currentIndex];
    const url = item?.download || item?.full || item?.thumb || item?.src;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      alert("Link copiado!");
    } catch {
      const temp = document.createElement("input");
      temp.value = url;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      alert("Link copiado!");
    }
  });
}

// ---------- Init ----------
(async function init() {
  const access = localStorage.getItem("wedding_access");
  const lockedBox = document.getElementById("lockedBox");
  const content = document.getElementById("content");

  if (access !== "ok") {
    if (lockedBox) lockedBox.style.display = "block";
    if (content) content.style.display = "none";
    return;
  }

  try {
    const config = await loadConfig();
    setTheme(config);
    setHeader(config);

    // stories
    const storiesData = await loadStories();
    renderStories(storiesData?.stories);

    // index de seções (leve)
    const galleryIndex = await loadGalleryIndex();
    const sectionsIndex = galleryIndex?.sections || [];

    renderSections(sectionsIndex);
    observeSections();

    bindModalControls();
  } catch (err) {
    console.error(err);
  }

  document.getElementById("faceFindBtn")?.addEventListener("click", () => {
    window.location.href = "./find.html";
  });
})();
