export function waitForDocument(condition) {
  const { selector, text, url, state } = condition;
  if (url) {
    const present = location.href.includes(url);
    return state === "detached" || state === "hidden" ? !present : present;
  }
  const collect = (root, query, found = []) => {
    found.push(...root.querySelectorAll(query));
    for (const host of root.querySelectorAll("*")) if (host.shadowRoot) collect(host.shadowRoot, query, found);
    return found;
  };
  const nodes = selector
    ? collect(document, selector)
    : text ? collect(document, "body *").filter((node) => String(node.innerText || "").includes(text)) : [];
  const present = nodes.length > 0;
  const visible = nodes.some((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
  });
  if (state === "attached") return present;
  if (state === "detached") return !present;
  if (state === "visible") return visible;
  return !visible;
}
