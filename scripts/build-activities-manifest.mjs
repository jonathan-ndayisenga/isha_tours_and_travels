import fs from "node:fs/promises";
import path from "node:path";

import { slugify, toTitleCase } from "./lib/text.mjs";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function getArgValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function buildAltBase(activityTitle) {
  const lower = activityTitle.toLowerCase();

  if (lower.includes("gorilla")) return "Gorilla tracking experience in Bwindi, Uganda";
  if (lower.includes("golden monkey")) return "Golden monkey tracking experience in Mgahinga, Uganda";
  if (lower.includes("batwa")) return "Batwa cultural trail experience in Uganda";
  if (lower.includes("bird")) return "Bird watching tour in Uganda";
  if (lower.includes("coffee")) return "Coffee experience tour in Uganda";
  if (lower.includes("cycling")) return "Cycling adventure experience in Uganda";
  if (lower.includes("virunga")) return "Virunga Peaks hiking challenge in Uganda";
  if (lower.includes("mburo")) return "Lake Mburo National Park safari experience in Uganda";
  if (lower.includes("zip") && lower.includes("mutanda")) return "Zip lining experience on Lake Mutanda, Uganda";
  if (lower.includes("mutanda")) return "Lake Mutanda canoeing and nature experience in Uganda";
  if (lower.includes("challenge") || lower.includes("peaks")) return `${activityTitle} hiking adventure in Uganda`;
  if (lower.includes("national park")) return `${activityTitle} safari experience in Uganda`;
  if (lower.includes("lake")) return `${activityTitle} nature experience in Uganda`;

  return `${activityTitle} experience in Uganda`;
}

function findCoverIndex(sortedFiles) {
  const coverIndex = sortedFiles.findIndex((fileName) => {
    const base = path.basename(fileName, path.extname(fileName)).toLowerCase();
    return base.includes("cover") || base.includes("hero");
  });
  if (coverIndex !== -1) return coverIndex;

  const firstWebpIndex = sortedFiles.findIndex((fileName) => path.extname(fileName).toLowerCase() === ".webp");
  if (firstWebpIndex !== -1) return firstWebpIndex;

  return 0;
}

async function buildManifest({ rootRelative, outRelative }) {
  const projectRoot = process.cwd();
  const rootAbsolute = path.resolve(projectRoot, rootRelative);
  const outAbsolute = path.resolve(projectRoot, outRelative);

  await fs.mkdir(rootAbsolute, { recursive: true });
  await fs.mkdir(path.dirname(outAbsolute), { recursive: true });

  const rootDirEntries = await fs.readdir(rootAbsolute, { withFileTypes: true });
  const activityFolders = rootDirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare);

  const categories = [];

  for (const folderName of activityFolders) {
    const folderAbsolute = path.join(rootAbsolute, folderName);
    const entryList = await fs.readdir(folderAbsolute, { withFileTypes: true });
    const imageFiles = entryList
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(isImageFile)
      .sort(new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare);

    if (imageFiles.length === 0) continue;

    const coverIndex = findCoverIndex(imageFiles);
    const coverFile = imageFiles[coverIndex];
    const orderedFiles = [coverFile, ...imageFiles.filter((fileName) => fileName !== coverFile)];

    const title = toTitleCase(folderName);
    const id = slugify(folderName);
    const altBase = buildAltBase(title);
    const caption = altBase;

    const images = orderedFiles.map((fileName, index) => {
      const relativeSrc = toPosixPath(path.join(rootRelative, folderName, fileName));
      const alt = orderedFiles.length > 1 ? `${altBase} - photo ${index + 1}` : altBase;
      return {
        src: relativeSrc,
        alt,
        fileName,
        ext: path.extname(fileName).toLowerCase().slice(1),
      };
    });

    categories.push({
      id,
      title,
      caption,
      folderName,
      images,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    root: toPosixPath(rootRelative),
    categories,
  };

  await fs.writeFile(outAbsolute, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return { categories: categories.length, outRelative };
}

const args = process.argv.slice(2);
const rootRelative = getArgValue(args, "--root") ?? "assets/images/Activities";
const outRelative = getArgValue(args, "--out") ?? "assets/data/activities-gallery.json";

try {
  const result = await buildManifest({ rootRelative, outRelative });
  console.log(`Gallery manifest written: ${result.outRelative} (categories: ${result.categories})`);
} catch (error) {
  console.error("Failed to build gallery manifest:", error);
  process.exitCode = 1;
}
