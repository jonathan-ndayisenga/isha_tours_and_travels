import { qs } from "../lib/dom.js";
import { loadActivitiesManifest } from "../gallery/manifest.js";
import { Lightbox } from "../gallery/lightbox.js";
import { renderActivityCards } from "../gallery/activity-cards.js";

function showEmpty(container, message) {
  container.textContent = message;
  container.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = qs("#activities-root");
  const empty = qs("#activities-empty");
  if (!root || !empty) return;

  try {
    const manifest = await loadActivitiesManifest();
    const categories = Array.isArray(manifest.categories) ? manifest.categories : [];

    if (categories.length === 0) {
      showEmpty(
        empty,
        "No gallery images found yet. Add images under assets/images/Activities/<Activity Name>/ and run `npm run build:gallery`. Example: assets/images/Activities/Gorilla tracking/ (and the same for Virunga Peaks Challenge, Cycling, Lake mutanda, Coffee experience, Batwa trails, Bird watching, zip lining on lake mutanda, Lake Mburo National Park)."
      );
      return;
    }

    const lightbox = new Lightbox();
    renderActivityCards({ container: root, categories, lightbox, previewMax: 6 });
  } catch (error) {
    showEmpty(empty, "Activities failed to load. Please refresh, or rebuild the image manifest.");
    console.error(error);
  }
});
