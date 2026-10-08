export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function createEl(tagName, { className, attrs, text } = {}) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      el.setAttribute(key, String(value));
    }
  }
  if (text !== null && text !== undefined) el.textContent = String(text);
  return el;
}

