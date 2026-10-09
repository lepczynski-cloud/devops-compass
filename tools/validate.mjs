import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "public/index.html",
  "public/assets/styles.css",
  "public/assets/data.js",
  "public/assets/app.js",
  "public/assets/favicon.svg",
  "public/assets/icon-192.png",
  "public/assets/icon-512.png",
  "public/assets/og-image.png",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/_headers",
  "wrangler.jsonc"
];

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

for (const relative of requiredFiles) {
  assert(fs.existsSync(path.join(root, relative)), `Missing required file: ${relative}`);
}

const context = { window: {} };
const dataCode = fs.readFileSync(path.join(root, "public/assets/data.js"), "utf8");
vm.runInNewContext(dataCode, context, { filename: "data.js" });
const data = context.window.COMPASS_DATA;
assert(data && typeof data === "object", "COMPASS_DATA was not loaded.");

const uniqueIds = (items, label) => {
  const seen = new Set();
  for (const item of items || []) {
    assert(item.id && typeof item.id === "string", `${label} contains an item without an id.`);
    assert(!seen.has(item.id), `Duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
  return seen;
};

const checkTranslation = (value, label) => {
  const valid = (entry) =>
    (typeof entry === "string" && entry.trim().length > 0) ||
    (Array.isArray(entry) && entry.length > 0 && entry.every((item) => typeof item === "string" && item.trim().length > 0));
  assert(value && valid(value.en), `${label} is missing English content.`);
  assert(value && valid(value.pl), `${label} is missing Polish content.`);
};

const profileIds = uniqueIds(data.profiles, "profile");
const directionIds = uniqueIds(data.directions, "direction");
const areaIds = uniqueIds(data.areas, "area");
const capabilityIds = uniqueIds(data.capabilities, "capability");
const skillIds = uniqueIds(data.skills, "skill");
const resourceIds = uniqueIds(data.resourceLibrary, "resource");


for (const resource of data.resourceLibrary || []) {
  checkTranslation(resource.title, `${resource.id}.title`);
  checkTranslation(resource.type, `${resource.id}.type`);
  checkTranslation(resource.note, `${resource.id}.note`);
  assert(typeof resource.provider === "string" && resource.provider.trim(), `Resource ${resource.id} is missing a provider.`);
  assert(typeof resource.url === "string" && /^https:\/\//.test(resource.url), `Resource ${resource.id} must use an HTTPS URL.`);
  assert(resource.free === true, `Resource ${resource.id} must be marked as free.`);
}

for (const [key, value] of Object.entries(data.i18n || {})) checkTranslation(value, `i18n.${key}`);

for (const item of [...data.profiles, ...data.directions, ...data.areas]) {
  checkTranslation(item.name, `${item.id}.name`);
  if (item.description) checkTranslation(item.description, `${item.id}.description`);
}

for (const capability of data.capabilities) {
  checkTranslation(capability.name, `${capability.id}.name`);
  checkTranslation(capability.hint, `${capability.id}.hint`);
  assert(areaIds.has(capability.area), `Capability ${capability.id} references unknown area ${capability.area}.`);
}

for (const area of data.areas) {
  for (const id of area.capabilities || []) {
    assert(capabilityIds.has(id), `Area ${area.id} references unknown capability ${id}.`);
  }
}

for (const skill of data.skills) {
  checkTranslation(skill.name, `${skill.id}.name`);
  checkTranslation(skill.summary, `${skill.id}.summary`);
  checkTranslation(skill.topics, `${skill.id}.topics`);
  checkTranslation(skill.ready, `${skill.id}.ready`);
  checkTranslation(skill.note, `${skill.id}.note`);
  checkTranslation(skill.quickWin, `${skill.id}.quickWin`);
  assert(typeof skill.effort === "string" && skill.effort.trim(), `Skill ${skill.id} is missing effort guidance.`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(skill.reviewedAt || ""), `Skill ${skill.id} has an invalid reviewedAt date.`);
  assert(Array.isArray(skill.resourceIds) && skill.resourceIds.length >= 2, `Skill ${skill.id} needs at least two resources.`);
  for (const id of skill.resourceIds || []) assert(resourceIds.has(id), `Skill ${skill.id} references unknown resource ${id}.`);
  assert(data.categoryLabels[skill.category], `Skill ${skill.id} uses unknown category ${skill.category}.`);
  for (const id of skill.prerequisites || []) assert(skillIds.has(id), `Skill ${skill.id} has unknown prerequisite ${id}.`);
  for (const id of skill.evidence || []) assert(capabilityIds.has(id), `Skill ${skill.id} has unknown evidence capability ${id}.`);
  assert(Number.isInteger(skill.required) && skill.required >= 0 && skill.required <= 3, `Skill ${skill.id} has an invalid required level.`);
}

const pathSkillIds = new Set();
for (const [direction, ids] of Object.entries(data.paths || {})) {
  assert(directionIds.has(direction), `Path references unknown direction ${direction}.`);
  const pathSeen = new Set();
  for (const id of ids) {
    assert(skillIds.has(id), `Path ${direction} references unknown skill ${id}.`);
    assert(!pathSeen.has(id), `Path ${direction} contains duplicate skill ${id}.`);
    pathSeen.add(id);
    pathSkillIds.add(id);
  }
}
for (const id of skillIds) assert(pathSkillIds.has(id), `Skill ${id} is not used by any path.`);

const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const serviceWorker = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
assert(packageJson.version === data.version, `package.json version ${packageJson.version} does not match data version ${data.version}.`);
assert(serviceWorker.includes(`devops-compass-v${data.version}`), "Service worker cache version does not match application version.");
assert(manifest.name === "DevOps Compass", "Manifest name must be DevOps Compass.");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Manifest needs application icons.");

const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
for (const reference of ["/assets/styles.css", "/assets/data.js", "/assets/app.js", "/manifest.webmanifest"]) {
  assert(index.includes(reference), `index.html does not reference ${reference}.`);
}
assert(index.includes('data-i18n="betaShort"'), "index.html should expose the beta status in the header.");
assert(data.i18n.betaBannerLabel?.en === "Public beta", "English public beta label is missing.");
assert(data.i18n.betaBannerLabel?.pl === "Publiczna beta", "Polish public beta label is missing.");

const appCode = fs.readFileSync(path.join(root, "public/assets/app.js"), "utf8");
try {
  new Function(appCode);
} catch (error) {
  errors.push(`app.js syntax error: ${error.message}`);
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated DevOps Compass ${data.version}`);
console.log(`${data.skills.length} learning units, ${data.capabilities.length} capabilities, ${data.resourceLibrary.length} curated resources, ${Object.keys(data.paths).length} directions.`);
