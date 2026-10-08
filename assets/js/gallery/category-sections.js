import { createEl } from "../lib/dom.js";
import { renderImageGrid } from "./grid.js";

export function renderGalleryCategories({
  container,
  categories,
  lightbox,
  thumbLimit = 12,
} = {}) {
  if (!container) throw new Error("renderGalleryCategories: container is required");
  container.innerHTML = "";

  const frag = document.createDocumentFragment();

  categories.forEach((category) => {
    const section = createEl("section", { className: "space-y-4" });

    const header = createEl("div", {
      className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
    });

    const titleWrap = createEl("div");
    const title = createEl("h3", {
      className: "text-2xl font-bold text-gray-900",
      text: category.title,
    });

    const captionText = (category.caption ?? "").trim();
    const caption = createEl("p", {
      className: "mt-1 text-sm text-gray-700",
      text: captionText,
    });

    const meta = createEl("p", {
      className: captionText ? "mt-1 text-xs text-gray-600" : "mt-1 text-sm text-gray-600",
      text: `${category.images.length} photo${category.images.length === 1 ? "" : "s"}`,
    });
    titleWrap.appendChild(title);
    if (captionText) titleWrap.appendChild(caption);
    titleWrap.appendChild(meta);

    header.appendChild(titleWrap);

    if (category.images.length > thumbLimit) {
      const viewAll = createEl("button", {
        className:
          "inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500",
        attrs: { type: "button" },
        text: `View all ${category.images.length}`,
      });
      viewAll.addEventListener("click", () => {
        lightbox.open({ images: category.images, index: 0 });
      });
      header.appendChild(viewAll);
    }

    section.appendChild(header);

    const gridHost = createEl("div");
    const imagesToShow = category.images.slice(0, thumbLimit);
    renderImageGrid({
      container: gridHost,
      images: imagesToShow,
      eagerCount: 2,
      onOpen: (index) => lightbox.open({ images: category.images, index }),
    });

    section.appendChild(gridHost);
    frag.appendChild(section);
  });

  container.appendChild(frag);
}
