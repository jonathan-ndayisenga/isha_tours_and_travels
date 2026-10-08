import { qs } from "../lib/dom.js";
import { loadActivitiesManifest } from "../gallery/manifest.js";

const SLIDE_INTERVAL_MS = 3000;
const IMAGES_PER_ACTIVITY = 3;
const MAX_SLIDES = 30;
const HERO_CONFIG_URL = "assets/images/activities-gallery.json";

function getShouldReduceMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function getShouldSaveData() {
  return navigator.connection?.saveData === true;
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toSafeUrl(relativePath) {
  const raw = String(relativePath ?? "").trim();
  if (!raw) return "";
  if (/^(?:[a-z]+:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }
  return raw
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function loadHeroConfig({ url = HERO_CONFIG_URL } = {}) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data || !Array.isArray(data.activities)) return null;
    return data;
  } catch {
    return null;
  }
}

function rotateToFront(list, predicate) {
  const index = list.findIndex(predicate);
  if (index <= 0) return list;
  return [...list.slice(index), ...list.slice(0, index)];
}

function pickImages(images, maxCount) {
  const list = Array.isArray(images) ? images.filter((img) => img?.src) : [];
  const count = Math.max(1, Number(maxCount) || 1);

  if (list.length <= count) return list;
  if (count === 1) return [list[0]];

  const picked = [list[0]];
  const remaining = list.slice(1);
  if (remaining.length === 0) return picked;

  if (count === 2) {
    picked.push(remaining[0]);
    return picked;
  }

  const slots = count - 1;
  for (let i = 0; i < slots; i++) {
    const idx = Math.round((i * (remaining.length - 1)) / Math.max(1, slots - 1));
    picked.push(remaining[idx]);
  }

  const seen = new Set();
  const unique = [];
  for (const image of picked) {
    const src = String(image?.src ?? "").trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    unique.push(image);
  }

  return unique;
}

function buildSlides({
  manifest,
  config,
  perActivity = IMAGES_PER_ACTIVITY,
  maxSlides = MAX_SLIDES,
} = {}) {
  const categories = Array.isArray(manifest?.categories) ? manifest.categories : [];
  if (categories.length === 0) return [];

  const configActivities = Array.isArray(config?.activities) ? config.activities : [];

  const configByFolder = new Map();
  for (const activity of configActivities) {
    const key = normalizeKey(activity?.folder);
    if (!key) continue;
    configByFolder.set(key, activity);
  }

  const categoriesByFolder = new Map();
  for (const category of categories) {
    const key = normalizeKey(category?.folderName);
    if (!key) continue;
    categoriesByFolder.set(key, category);
  }

  const orderedCategories = [];
  const usedIds = new Set();

  for (const activity of configActivities) {
    const key = normalizeKey(activity?.folder);
    const category = categoriesByFolder.get(key);
    if (!category) continue;
    const id = String(category?.id ?? key);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    orderedCategories.push(category);
  }

  for (const category of categories) {
    const id = String(category?.id ?? normalizeKey(category?.folderName));
    if (!id || usedIds.has(id)) continue;
    usedIds.add(id);
    orderedCategories.push(category);
  }

  const finalCategories = rotateToFront(orderedCategories, (category) =>
    /gorilla/i.test(String(category?.title ?? ""))
  );

  const buckets = finalCategories
    .map((category) => {
      const folderKey = normalizeKey(category?.folderName);
      const cfg = configByFolder.get(folderKey);
      const caption = String(cfg?.name ?? category?.title ?? "").trim() || "Featured Activity";
      const fallbackAltBase = String(category?.caption ?? caption).trim() || caption;
      const picked = pickImages(category?.images, perActivity);

      return picked
        .map((image) => {
          const src = String(image?.src ?? "").trim();
          if (!src) return null;
          const alt = String(image?.alt ?? fallbackAltBase).trim() || fallbackAltBase;
          return { caption, src, alt };
        })
        .filter(Boolean);
    })
    .filter((bucket) => bucket.length > 0);

  const slides = [];
  for (let round = 0; round < perActivity; round++) {
    for (const bucket of buckets) {
      const slide = bucket[round];
      if (slide) slides.push(slide);
    }
  }

  const seen = new Set();
  const unique = [];
  for (const slide of slides) {
    if (seen.has(slide.src)) continue;
    seen.add(slide.src);
    unique.push(slide);
  }

  return Number(maxSlides) > 0 ? unique.slice(0, maxSlides) : unique;
}

function preload(src) {
  const url = toSafeUrl(src);
  if (!url) return;
  const img = new Image();
  img.src = url;
}

function ensureOverlay(layer) {
  const existing = Array.from(layer.querySelectorAll("div")).find((div) =>
    div.classList?.contains("bg-black/55")
  );
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 bg-black/55";
  layer.appendChild(overlay);
  return overlay;
}

function getOrCreateLayer(slidesContainer, id, { visible = false } = {}) {
  let layer = qs(`#${id}`, slidesContainer);
  if (!layer) {
    layer = document.createElement("div");
    layer.id = id;
    slidesContainer.appendChild(layer);
  }

  layer.className = `hero-slide absolute inset-0 ${
    visible ? "opacity-100" : "opacity-0"
  } transition-opacity duration-1000 motion-reduce:transition-none`;
  ensureOverlay(layer);
  return layer;
}

function getOrCreateLayerImage(layer, { eager = false } = {}) {
  const picture = layer.querySelector("picture");
  if (picture) picture.querySelectorAll("source").forEach((source) => source.remove());

  let img = layer.querySelector("img");
  if (!img) {
    img = document.createElement("img");
    if (picture) picture.appendChild(img);
    else layer.insertBefore(img, layer.firstChild);
  }

  img.className = "absolute inset-0 h-full w-full object-cover";
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (eager) img.setAttribute("fetchpriority", "high");
  else img.removeAttribute("fetchpriority");

  return img;
}

function loadInto(imgEl, slide) {
  return new Promise((resolve) => {
    if (!imgEl || !slide?.src) {
      resolve(false);
      return;
    }

    const nextSrc = toSafeUrl(slide.src);
    const prevSrc = imgEl.getAttribute("src");

    if (prevSrc === nextSrc) {
      imgEl.alt = slide.alt ?? "";
      resolve(true);
      return;
    }

    const onLoad = () => resolve(true);
    const onError = () => {
      if (prevSrc) imgEl.setAttribute("src", prevSrc);
      resolve(false);
    };

    imgEl.addEventListener("load", onLoad, { once: true });
    imgEl.addEventListener("error", onError, { once: true });
    imgEl.alt = slide.alt ?? "";
    imgEl.setAttribute("src", nextSrc);
  });
}

function setIndicator(button, active) {
  if (!button) return;
  if (active) {
    button.className = "h-2 w-6 rounded-full bg-primary-400 transition-all duration-300";
    button.setAttribute("aria-current", "true");
  } else {
    button.className = "h-2 w-2 rounded-full bg-white/50 hover:bg-white/70 transition-all duration-300";
    button.removeAttribute("aria-current");
  }
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable === true;
}

function getFallbackSlides(slidesContainer) {
  const slides = Array.from(slidesContainer.querySelectorAll(".hero-slide"))
    .map((slideEl, index) => {
      const img = slideEl.querySelector("img");
      const src = img?.getAttribute("src") || img?.src || "";
      const alt = img?.getAttribute("alt") || "";
      const caption = alt ? alt.replace(/hero image/i, "").trim() : `Slide ${index + 1}`;
      return { caption: caption || `Slide ${index + 1}`, src, alt };
    })
    .filter((slide) => Boolean(slide.src));

  const seen = new Set();
  return slides.filter((slide) => {
    if (seen.has(slide.src)) return false;
    seen.add(slide.src);
    return true;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const heroEl = qs("#home-hero");
  const slidesContainer = qs("#hero-slides-container");
  const indicatorsEl = qs("#hero-slide-indicators");
  const captionEl = qs("#hero-slide-caption");
  const navEl = heroEl ? qs("#hero-slide-nav", heroEl) : null;
  const prevButton = heroEl ? qs("#hero-slide-prev", heroEl) : null;
  const nextButton = heroEl ? qs("#hero-slide-next", heroEl) : null;

  if (!heroEl || !slidesContainer || !indicatorsEl || !captionEl) return;

  const reduceMotion = getShouldReduceMotion();
  const saveData = getShouldSaveData();

  let slides = [];
  try {
    const [manifest, config] = await Promise.all([loadActivitiesManifest(), loadHeroConfig()]);
    slides = buildSlides({ manifest, config });
  } catch (error) {
    console.warn("Hero slideshow: failed to load activity images.", error);
  }

  if (slides.length === 0) {
    slides = getFallbackSlides(slidesContainer);
  }

  if (slides.length === 0) return;

  if (navEl && slides.length <= 1) navEl.classList.add("hidden");

  const layerA = getOrCreateLayer(slidesContainer, "hero-slide-0", { visible: true });
  const layerB = getOrCreateLayer(slidesContainer, "hero-slide-1", { visible: false });
  const imgA = getOrCreateLayerImage(layerA, { eager: true });
  const imgB = getOrCreateLayerImage(layerB, { eager: false });

  indicatorsEl.innerHTML = "";
  const indicatorButtons = slides.map((slide, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-slide-index", String(index));
    btn.setAttribute("aria-label", `Go to slide ${index + 1}: ${slide.caption}`);
    btn.addEventListener("click", () => void goTo(index, { resetTimer: true }));
    indicatorsEl.appendChild(btn);
    return btn;
  });

  let currentIndex = 0;
  let showingA = true;
  let intervalId = null;
  let transitioning = false;

  prevButton?.addEventListener("click", () => {
    void goTo((currentIndex - 1 + slides.length) % slides.length, { resetTimer: true });
  });

  nextButton?.addEventListener("click", () => {
    void goTo((currentIndex + 1) % slides.length, { resetTimer: true });
  });

  function updateUI() {
    captionEl.textContent = slides[currentIndex]?.caption ?? "Featured Activities";
    indicatorButtons.forEach((btn, index) => setIndicator(btn, index === currentIndex));
  }

  function stop() {
    if (intervalId === null) return;
    window.clearInterval(intervalId);
    intervalId = null;
  }

  function start() {
    if (reduceMotion || saveData || slides.length <= 1) return;
    if (intervalId !== null) return;

    intervalId = window.setInterval(() => {
      void goTo((currentIndex + 1) % slides.length, { resetTimer: false });
    }, SLIDE_INTERVAL_MS);
  }

  function reset() {
    stop();
    start();
  }

  async function goTo(nextIndex, { resetTimer = false } = {}) {
    if (nextIndex === currentIndex) return;
    if (transitioning) return;

    transitioning = true;
    try {
      const incomingLayer = showingA ? layerB : layerA;
      const outgoingLayer = showingA ? layerA : layerB;
      const incomingImg = showingA ? imgB : imgA;

      const nextSlide = slides[nextIndex];
      const loaded = await loadInto(incomingImg, nextSlide);
      if (!loaded) return;

      incomingLayer.classList.add("opacity-100");
      incomingLayer.classList.remove("opacity-0");
      outgoingLayer.classList.add("opacity-0");
      outgoingLayer.classList.remove("opacity-100");

      showingA = !showingA;
      currentIndex = nextIndex;

      updateUI();
      preload(slides[(currentIndex + 1) % slides.length]?.src);
      if (resetTimer) reset();
    } finally {
      transitioning = false;
    }
  }

  const firstLoaded = await loadInto(imgA, slides[0]);
  if (!firstLoaded) return;

  updateUI();
  preload(slides[1]?.src);

  document.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.key === "ArrowLeft") {
      void goTo((currentIndex - 1 + slides.length) % slides.length, { resetTimer: true });
    } else if (event.key === "ArrowRight") {
      void goTo((currentIndex + 1) % slides.length, { resetTimer: true });
    }
  });

  let touchStartX = 0;
  let touchEndX = 0;

  heroEl.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches?.[0]?.screenX ?? 0;
      stop();
    },
    { passive: true }
  );

  heroEl.addEventListener(
    "touchend",
    (event) => {
      touchEndX = event.changedTouches?.[0]?.screenX ?? 0;
      const diff = touchStartX - touchEndX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) void goTo((currentIndex + 1) % slides.length, { resetTimer: true });
        else void goTo((currentIndex - 1 + slides.length) % slides.length, { resetTimer: true });
      }

      start();
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  start();
});
