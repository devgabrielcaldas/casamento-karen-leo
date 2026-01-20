// ---------- Helpers ----------
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Erro ao carregar ${path}: ${res.status}`);
  return res.json();
}

async function loadConfig() { return loadJson("./data/config.json"); }
async function loadStories() { return loadJson("./data/stories.json"); }
async function loadGallery() { return loadJson("./data/gallery.json"); }

// ---------- Theme/Header ----------
function setTheme(config) {
  const t = config.theme;
  document.documentElement.style.setProperty("--primary", t.primary);
  document.documentElement.style.setProperty("--secondary", t.secondary);
  document.documentElement.style.setProperty("--bg", t.background);
  document.documentElement.style.setProperty("--surface", t.surface);
  document.documentElement.style.setProperty("--text", t.text);
  document.documentElement.style.setProperty("--muted", t.muted);
  document.body.style.fontFamily = `${t.fontBody}, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

function setHeader(config) {
  const names = document.getElementById("coupleNames");
  const dateText = document.getElementById("dateText");
  if (names) names.textContent = config.couple.names;
  if (dateText) dateText.textContent = config.couple.dateText;
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
let flatPhotos = [];
let currentIndex = 0;

// swipe
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function buildFlatList(sections) {
  const list = [];
  sections.forEach((sec) => {
    (sec.items || []).forEach((item) => {
      list.push({ ...item, sectionTitle: sec.title });
    });
  });
  return list;
}

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

  if (!flatPhotos.length) return;
  currentIndex = ((index % flatPhotos.length) + flatPhotos.length) % flatPhotos.length;

  const item = flatPhotos[currentIndex];

  // prepara loader + handlers ANTES de setar src
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

  // texto/links
  title.textContent = item.sectionTitle || "";
  counter.textContent = `${currentIndex + 1} / ${flatPhotos.length}`;
  downloadBtn.href = item.download || item.full || item.thumb;

  // imagem
  img.src = item.full || item.thumb;

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
  if (!flatPhotos.length) return;
  openModal(currentIndex - 1);
}

function nextPhoto() {
  if (!flatPhotos.length) return;
  openModal(currentIndex + 1);
}

// ---------- Render Sections ----------
function renderSections(sections) {
  const wrapper = document.getElementById("sections");
  if (!wrapper) return;

  wrapper.innerHTML = "";

  sections.forEach((section) => {
    const rowId = `row-${section.id}`;

    const block = document.createElement("div");
    block.className = "section-row";
    block.innerHTML = `
      <h3>${section.title}</h3>
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

    (section.items || []).forEach((item) => {
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      thumb.innerHTML = `<img loading="lazy" src="${item.thumb}" alt="Foto">`;

      thumb.addEventListener("click", () => {
        const idx = flatPhotos.findIndex((p) => p.id === item.id);
        if (idx >= 0) openModal(idx);
      });

      row.appendChild(thumb);
    });

    const scrollBy = () => Math.floor((row.clientWidth || 600) * 0.85);

    leftBtn?.addEventListener("click", () => {
      row.scrollBy({ left: -scrollBy(), behavior: "smooth" });
    });

    rightBtn?.addEventListener("click", () => {
      row.scrollBy({ left: scrollBy(), behavior: "smooth" });
    });
  });
}

// ---------- Bindings ----------
function bindModalControls() {
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modalBackdrop")?.addEventListener("click", closeModal);
  document.getElementById("navLeft")?.addEventListener("click", prevPhoto);
  document.getElementById("navRight")?.addEventListener("click", nextPhoto);

  // Teclado (← → Esc)
  window.addEventListener("keydown", (e) => {
    if (!isModalOpen()) return;

    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") prevPhoto();
    if (e.key === "ArrowRight") nextPhoto();
  });

  // Swipe (mobile)
  const modalBody = document.querySelector(".modal-body");
  modalBody?.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchEndX = t.clientX;
    touchEndY = t.clientY;
  }, { passive: true });

  modalBody?.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    touchEndX = t.clientX;
    touchEndY = t.clientY;
  }, { passive: true });

  modalBody?.addEventListener("touchend", () => {
    if (!isModalOpen()) return;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // evita conflito com scroll vertical
    if (Math.abs(dx) < 40) return;
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx > 0) prevPhoto();
    else nextPhoto();

    touchStartX = touchStartY = touchEndX = touchEndY = 0;
  });

  // Copiar link
  document.getElementById("copyBtn")?.addEventListener("click", async () => {
    const item = flatPhotos[currentIndex];
    const url = item?.download || item?.full || item?.thumb;
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

    const zipBtn = document.getElementById("zipBtn");
    if (config.download?.zipUrl && zipBtn) {
      zipBtn.href = config.download.zipUrl;
      zipBtn.style.display = "inline-block";
    }

    const storiesData = await loadStories();
    renderStories(storiesData?.stories);

    const galleryData = await loadGallery();
    const sections = galleryData?.sections || [];

    flatPhotos = buildFlatList(sections);
    renderSections(sections);

    bindModalControls();
  } catch (err) {
    console.error(err);
  }

  document.getElementById("faceFindBtn")?.addEventListener("click", () => {
  window.location.href = "./find.html";
});
})();
