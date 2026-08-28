const IDENTITY_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#c2410c", "#be123c", "#334155"];

export function identityColor(value) {
  const hash = [...String(value)].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
  return IDENTITY_COLORS[hash % IDENTITY_COLORS.length];
}

export function easyBrProfileId(value) {
  try {
    const url = new URL(value || "");
    const profileId = url.searchParams.get("id")?.trim();
    if (!(["localhost", "127.0.0.1"].includes(url.hostname))
      || url.port !== "3001"
      || url.pathname !== "/help/eindex.html"
      || !profileId
      || !/^[a-zA-Z0-9_-]{6,128}$/.test(profileId)) return "";
    return profileId;
  } catch {
    return "";
  }
}
