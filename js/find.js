// ---------- Helpers ----------
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Erro ao carregar ${path}: ${res.status}`);
  return res.json();
}

async function loadConfig() { return loadJson("./data/config.json"); }
async function loadGallery() { return loadJson("./data/gallery.json"); }

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

function setStatus(msg) {
  const el = document.getElementById("statusBox");
  if (el) el.textContent = msg;
}

// ---------- Access gate ----------
function ensureAccessOrLock() {
  const access = localStorage.getItem("wedding_access");
  const lockedBox = document.getElementById("lockedBox");
  const content = document.getElementById("content");

  if (access !== "ok") {
    if (lockedBox) lockedBox.style.display = "block";
    if (content) content.style.display = "none";
    return false;
  }
  return true;
}

// ---------- Build searchable list from gallery ----------
let allPhotos = [];
let resultPhotos = [];
let currentIndex = 0;

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
function openModal(index) {
  const modal = document.getElementById("photoModal");
  const img = document.getElementById("modalImage");
  const counter = document.getElementById("modalCounter");
  const downloadBtn = document.getElementById("downloadBtn");
  const loader = document.getElementById("imgLoader");

  if (!modal || !img || !counter || !downloadBtn) return;
  if (!resultPhotos.length) return;

  currentIndex = ((index % resultPhotos.length) + resultPhotos.length) % resultPhotos.length;
  const item = resultPhotos[currentIndex];

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

  counter.textContent = `${currentIndex + 1} / ${resultPhotos.length}`;
  downloadBtn.href = item.download || item.full || item.thumb;
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

  if (img) img.src = "";
  if (loader) loader.style.display = "none";
}

function prevPhoto() { openModal(currentIndex - 1); }
function nextPhoto() { openModal(currentIndex + 1); }

function bindModalControls() {
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modalBackdrop")?.addEventListener("click", closeModal);
  document.getElementById("navLeft")?.addEventListener("click", prevPhoto);
  document.getElementById("navRight")?.addEventListener("click", nextPhoto);

  window.addEventListener("keydown", (e) => {
    const modal = document.getElementById("photoModal");
    const isOpen = modal && !modal.classList.contains("hidden");
    if (!isOpen) return;

    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") prevPhoto();
    if (e.key === "ArrowRight") nextPhoto();
  });

  document.getElementById("copyBtn")?.addEventListener("click", async () => {
    const item = resultPhotos[currentIndex];
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

// ---------- Render results grid ----------
function renderResults(photos) {
  const container = document.getElementById("results");
  if (!container) return;

  container.innerHTML = "";

  if (!photos.length) {
    container.innerHTML = `<div class="empty">Nenhuma foto encontrada acima do limite. Tente outra selfie.</div>`;
    return;
  }

  // grid simples reutilizando .thumb
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
  wrap.style.gap = "12px";
  wrap.style.marginTop = "10px";

  photos.forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = "thumb";
    el.style.width = "100%";
    el.style.height = "160px";
    el.innerHTML = `<img loading="lazy" src="${item.thumb}" alt="Resultado">`;
    el.addEventListener("click", () => openModal(idx));
    wrap.appendChild(el);
  });

  container.appendChild(wrap);
}

// ---------- MOCK SEARCH (por enquanto) ----------
function mockFaceSearch() {
  // simula: "limite" => retorna algumas fotos
  // depois trocamos isso por chamada real na API
  const sample = allPhotos.slice(0, Math.min(12, allPhotos.length));
  return sample;
}

// ---------- Camera / Upload ----------
let stream = null;

async function openCamera() {
  const video = document.getElementById("video");
  const takeBtn = document.getElementById("takePhotoBtn");
  const cancelBtn = document.getElementById("cancelCameraBtn");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    if (video) {
      video.srcObject = stream;
      video.style.display = "block";
    }
    if (takeBtn) takeBtn.style.display = "inline-flex";
    if (cancelBtn) cancelBtn.style.display = "inline-flex";

    setStatus("Câmera aberta. Centralize o rosto e tire a selfie.");
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível abrir a câmera. Use a opção 'Enviar foto'.");
    alert("Câmera indisponível. Use 'Enviar foto' como alternativa.");
  }
}

function stopCamera() {
  const video = document.getElementById("video");
  const takeBtn = document.getElementById("takePhotoBtn");
  const cancelBtn = document.getElementById("cancelCameraBtn");

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  if (video) {
    video.style.display = "none";
    video.srcObject = null;
  }
  if (takeBtn) takeBtn.style.display = "none";
  if (cancelBtn) cancelBtn.style.display = "none";
}

function takeSelfieFromVideo() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  if (!video || !canvas) return null;

  const w = video.videoWidth || 720;
  const h = video.videoHeight || 720;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, w, h);

  // reduz um pouco para upload/processamento (MVP)
  return canvas.toDataURL("image/jpeg", 0.85);
}

// ---------- Init ----------
(async function init() {
  if (!ensureAccessOrLock()) return;

  bindModalControls();

  try {
    const config = await loadConfig();
    setTheme(config);
    setHeader(config);

    const galleryData = await loadGallery();
    const sections = galleryData?.sections || [];
    allPhotos = buildFlatList(sections);

    setStatus("Pronto para iniciar a busca.");

    document.getElementById("openCameraBtn")?.addEventListener("click", openCamera);
    document.getElementById("cancelCameraBtn")?.addEventListener("click", () => {
      stopCamera();
      setStatus("Câmera fechada. Você pode tentar novamente ou enviar uma foto.");
    });

    document.getElementById("takePhotoBtn")?.addEventListener("click", async () => {
      setStatus("Processando selfie…");
      const dataUrl = takeSelfieFromVideo();
      stopCamera();

      // MOCK: troca por chamada real depois
      resultPhotos = mockFaceSearch();
      setStatus(`Busca concluída. Encontramos ${resultPhotos.length} fotos (modo mock).`);
      renderResults(resultPhotos);
    });

    document.getElementById("fileInput")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setStatus("Processando foto enviada…");

      // No mock não precisamos ler o arquivo; depois enviaremos para a API
      resultPhotos = mockFaceSearch();
      setStatus(`Busca concluída. Encontramos ${resultPhotos.length} fotos (modo mock).`);
      renderResults(resultPhotos);
    });

  } catch (err) {
    console.error(err);
    setStatus("Erro ao carregar dados. Veja o console.");
  }
})();
