import { createEl } from "../lib/dom.js";

export class Lightbox {
  constructor() {
    this._isMounted = false;
    this._isOpen = false;
    this._images = [];
    this._index = 0;

    this._onKeyDown = this._onKeyDown.bind(this);

    this._overlay = createEl("div", {
      className: "fixed inset-0 z-[1000] hidden",
      attrs: { role: "dialog", "aria-modal": "true", "aria-hidden": "true" },
    });

    const backdrop = createEl("button", {
      className: "absolute inset-0 bg-black/90",
      attrs: { type: "button", "aria-label": "Close preview" },
    });
    backdrop.addEventListener("click", () => this.close());

    const panel = createEl("div", {
      className: "absolute inset-0 flex items-center justify-center p-4",
    });

    const content = createEl("div", {
      className: "relative w-full max-w-6xl",
    });

    this._img = createEl("img", {
      className:
        "mx-auto block max-h-[80vh] w-auto max-w-full rounded-xl shadow-2xl bg-black/20",
      attrs: { alt: "", decoding: "async" },
    });

    this._caption = createEl("div", {
      className: "mt-3 text-center text-sm text-gray-200",
    });

    this._closeBtn = createEl("button", {
      className:
        "absolute -top-2 -right-2 md:top-2 md:right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60",
      attrs: { type: "button", "aria-label": "Close" },
      text: "×",
    });
    this._closeBtn.addEventListener("click", () => this.close());

    this._prevBtn = createEl("button", {
      className:
        "absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60",
      attrs: { type: "button", "aria-label": "Previous image" },
      text: "<",
    });
    this._prevBtn.addEventListener("click", () => this.prev());

    this._nextBtn = createEl("button", {
      className:
        "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60",
      attrs: { type: "button", "aria-label": "Next image" },
      text: ">",
    });
    this._nextBtn.addEventListener("click", () => this.next());

    content.appendChild(this._closeBtn);
    content.appendChild(this._prevBtn);
    content.appendChild(this._nextBtn);
    content.appendChild(this._img);
    content.appendChild(this._caption);
    panel.appendChild(content);

    this._overlay.appendChild(backdrop);
    this._overlay.appendChild(panel);
  }

  mount() {
    if (this._isMounted) return;
    document.body.appendChild(this._overlay);
    this._isMounted = true;
  }

  open({ images, index = 0 } = {}) {
    if (!images || images.length === 0) return;
    this.mount();

    this._images = images;
    this._index = Math.min(Math.max(index, 0), images.length - 1);

    this._overlay.classList.remove("hidden");
    this._overlay.setAttribute("aria-hidden", "false");
    this._isOpen = true;

    document.addEventListener("keydown", this._onKeyDown);
    this._render();
    this._closeBtn.focus();
  }

  close() {
    if (!this._isOpen) return;
    this._overlay.classList.add("hidden");
    this._overlay.setAttribute("aria-hidden", "true");
    this._isOpen = false;
    document.removeEventListener("keydown", this._onKeyDown);
  }

  next() {
    if (!this._isOpen) return;
    this._index = (this._index + 1) % this._images.length;
    this._render();
  }

  prev() {
    if (!this._isOpen) return;
    this._index = (this._index - 1 + this._images.length) % this._images.length;
    this._render();
  }

  _render() {
    const current = this._images[this._index];
    this._img.src = current.src;
    this._img.alt = current.alt ?? "";
    this._caption.textContent = current.alt ?? "";

    const showNav = this._images.length > 1;
    this._prevBtn.classList.toggle("hidden", !showNav);
    this._nextBtn.classList.toggle("hidden", !showNav);
  }

  _onKeyDown(event) {
    if (!this._isOpen) return;
    if (event.key === "Escape") this.close();
    if (event.key === "ArrowLeft") this.prev();
    if (event.key === "ArrowRight") this.next();
  }
}
