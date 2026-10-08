import { createEl } from "../lib/dom.js";

export function renderImageGrid({
  container,
  images,
  onOpen,
  aspectClass = "aspect-[4/3]",
  gridClassName = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
  eagerCount = 0,
} = {}) {
  if (!container) throw new Error("renderImageGrid: container is required");
  container.innerHTML = "";

  const grid = createEl("div", {
    className: gridClassName,
  });

  const frag = document.createDocumentFragment();

  images.forEach((image, index) => {
    const btn = createEl("button", {
      className:
        `group relative block w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm transition hover:shadow-lg ${aspectClass}`,
      attrs: { type: "button", "data-index": String(index) },
    });

    const img = createEl("img", {
      className:
        "absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
      attrs: {
        src: image.src,
        alt: image.alt ?? "",
        loading: index < eagerCount ? "eager" : "lazy",
        decoding: "async",
      },
    });

    const overlay = createEl("span", {
      className:
        "pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/15",
    });

    btn.appendChild(img);
    btn.appendChild(overlay);
    frag.appendChild(btn);
  });

  grid.appendChild(frag);
  container.appendChild(grid);

  grid.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-index]");
    if (!btn) return;
    const index = Number(btn.getAttribute("data-index"));
    if (Number.isNaN(index)) return;
    onOpen?.(index);
  });
}
