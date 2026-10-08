import { qsa } from "../lib/dom.js";

function initMobileMenu(button) {
  const menuId = button.getAttribute("aria-controls");
  if (!menuId) return;

  const menu = document.getElementById(menuId);
  if (!menu) return;

  let open = false;
  button.setAttribute("aria-expanded", "false");
  const icon = button.querySelector("i");

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    menu.classList.toggle("hidden", !open);
    button.setAttribute("aria-expanded", String(open));
    if (icon) {
      icon.classList.toggle("fa-bars", !open);
      icon.classList.toggle("fa-times", open);
    }
  }

  function onDocClick(event) {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target) || button.contains(target)) return;
    setOpen(false);
  }

  function onKeydown(event) {
    if (!open) return;
    if (event.key === "Escape") setOpen(false);
  }

  button.addEventListener("click", () => {
    setOpen(!open);
  });

  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);

  qsa("a", menu).forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  qsa("[data-mobile-menu-button]").forEach(initMobileMenu);
});
