const VISIBILITY_VALUES = new Set(["visible", "hidden", "all"]);
const TEXT_MODE_VALUES = new Set(["page", "matched", "none"]);
const REGION_MODE_VALUES = new Set(["intersect", "contain"]);

function integerOption(value, fallback, name, minimum, maximum) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function stringList(value, name) {
  if (value === undefined || value === null || value === "") return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.length > 50) throw new Error(`${name} accepts at most 50 values`);
  return values.map((item) => {
    if (typeof item !== "string") throw new Error(`${name} values must be strings`);
    const normalized = item.trim();
    if (!normalized) throw new Error(`${name} values must not be empty`);
    if (normalized.length > 500) throw new Error(`${name} values must be at most 500 characters`);
    return normalized;
  });
}

function normalizeRegion(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value === "viewport") return "viewport";
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("region must be \"viewport\" or an object with x, y, width and height");
  }
  const region = {
    x: Number(value.x),
    y: Number(value.y),
    width: Number(value.width),
    height: Number(value.height),
    mode: value.mode || "intersect",
  };
  if (![region.x, region.y, region.width, region.height].every(Number.isFinite)) {
    throw new Error("region x, y, width and height must be finite numbers");
  }
  if (region.width <= 0 || region.height <= 0) {
    throw new Error("region width and height must be greater than zero");
  }
  if (!REGION_MODE_VALUES.has(region.mode)) {
    throw new Error("region.mode must be intersect or contain");
  }
  return region;
}

export function normalizeSnapshotOptions(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("snapshot args must be an object");
  }

  const visibility = raw.visibility || (raw.includeHidden ? "all" : "visible");
  if (!VISIBILITY_VALUES.has(visibility)) {
    throw new Error("visibility must be visible, hidden or all");
  }

  const textMode = raw.textMode || (raw.compact === true ? "none" : "page");
  if (!TEXT_MODE_VALUES.has(textMode)) {
    throw new Error("textMode must be page, matched or none");
  }

  const scopeSelector = raw.scopeSelector ?? raw.scope ?? null;
  if (scopeSelector !== null && (typeof scopeSelector !== "string" || !scopeSelector.trim())) {
    throw new Error("scopeSelector must be a non-empty CSS selector");
  }

  return {
    maxTextLength: integerOption(raw.maxTextLength, 20_000, "maxTextLength", 0, 500_000),
    maxBytes: integerOption(raw.maxBytes, 500_000, "maxBytes", 10_000, 2_000_000),
    maxElements: integerOption(raw.maxElements ?? raw.limit, 200, "maxElements", 1, 5_000),
    offset: integerOption(raw.offset, 0, "offset", 0, 1_000_000),
    visibility,
    scopeSelector: scopeSelector ? scopeSelector.trim() : null,
    region: normalizeRegion(raw.region),
    text: stringList(raw.text ?? raw.textQuery, "text"),
    roles: stringList(raw.roles ?? raw.role, "roles").map((role) => role.toLowerCase()),
    textMode,
    compact: raw.compact === true,
  };
}
