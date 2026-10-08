export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "up",
  "via",
  "with",
]);

export function toTitleCase(value) {
  const cleaned = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!cleaned) return "";

  const words = cleaned.split(" ");
  return words
    .map((word, index) => {
      const isFirst = index === 0;
      const isLast = index === words.length - 1;
      if (!isFirst && !isLast && MINOR_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

