import { createEl } from "../lib/dom.js";
import { renderImageGrid } from "./grid.js";

function createCoverButton({ image, onOpen, eager = false } = {}) {
  const btn = createEl("button", {
    className:
      "group relative block w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition hover:shadow-lg aspect-[16/9]",
    attrs: { type: "button" },
  });

  const img = createEl("img", {
    className:
      "absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
    attrs: {
      src: image.src,
      alt: image.alt ?? "",
      loading: eager ? "eager" : "lazy",
      decoding: "async",
    },
  });

  const overlay = createEl("span", {
    className:
      "pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/15",
  });

  btn.appendChild(img);
  btn.appendChild(overlay);
  btn.addEventListener("click", () => onOpen?.());

  return btn;
}

export function renderActivityCards({
  container,
  categories,
  lightbox,
  previewMax = 6,
} = {}) {
  if (!container) throw new Error("renderActivityCards: container is required");
  container.innerHTML = "";

  const grid = createEl("div", {
    className: "grid grid-cols-1 gap-10 lg:grid-cols-2",
  });

  const frag = document.createDocumentFragment();

  categories.forEach((category, categoryIndex) => {
    const images = category.images ?? [];
    if (images.length === 0) return;

    const cover = images[0];
    const previews = images.slice(1, 1 + previewMax);

    const card = createEl("article", {
      className:
        "overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg",
    });

    const coverBtn = createCoverButton({
      image: cover,
      eager: categoryIndex < 2,
      onOpen: () => lightbox.open({ images, index: 0 }),
    });
    card.appendChild(coverBtn);

    const body = createEl("div", { className: "p-6" });

    const header = createEl("div", {
      className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
    });

    const title = createEl("h3", {
      className: "text-xl font-bold text-gray-900",
      text: category.title,
    });

    header.appendChild(title);

    const actions = createEl("div", { className: "flex items-center gap-2" });
    const viewAll = createEl("button", {
      className:
        "inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500",
      attrs: { type: "button" },
      text: images.length > 1 ? `View all ${images.length}` : "View photo",
    });
    viewAll.addEventListener("click", () => lightbox.open({ images, index: 0 }));
    actions.appendChild(viewAll);
    header.appendChild(actions);

    body.appendChild(header);

    const captionText = (category.caption ?? "").trim();
    if (captionText) {
      const caption = createEl("p", {
        className: "mt-2 text-sm text-gray-600",
        text: captionText,
      });
      body.appendChild(caption);
    }

    if (previews.length > 0) {
      const previewHost = createEl("div", { className: "mt-5" });
      renderImageGrid({
        container: previewHost,
        images: previews,
        gridClassName: "grid grid-cols-3 gap-3 sm:grid-cols-4",
        aspectClass: "aspect-square",
        onOpen: (index) => lightbox.open({ images, index: index + 1 }),
      });
      body.appendChild(previewHost);

      if (images.length > 1 + previews.length) {
        const hint = createEl("p", {
          className: "mt-3 text-sm text-gray-600",
          text: `${images.length - 1 - previews.length} more photo${
            images.length - 1 - previews.length === 1 ? "" : "s"
          } in this gallery`,
        });
        body.appendChild(hint);
      }
    }

    card.appendChild(body);
    frag.appendChild(card);
  });

  grid.appendChild(frag);
  container.appendChild(grid);
}
