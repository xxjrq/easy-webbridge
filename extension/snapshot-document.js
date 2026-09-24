export function snapshotDocument(options) {
  const interactiveSelector = "a,button,input,textarea,select,[contenteditable='true'],[role],[tabindex]";
  const walkOpenRoots = (root, selector) => {
    const found = [...root.querySelectorAll(selector)];
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) found.push(...walkOpenRoots(element.shadowRoot, selector));
    }
    return found;
  };
  const scopes = options.scopeSelector
    ? walkOpenRoots(document, options.scopeSelector)
    : [document.body || document.documentElement];
  if (!scopes.length) throw new Error(`Scope not found: ${options.scopeSelector}`);

  const elements = [];
  const seen = new Set();
  for (const scope of scopes) {
    const candidates = [];
    if (scope.matches?.(interactiveSelector)) candidates.push(scope);
    candidates.push(...walkOpenRoots(scope, interactiveSelector));
    for (const element of candidates) {
      if (seen.has(element)) continue;
      seen.add(element);
      elements.push(element);
    }
  }

  const effectiveRole = (element) => {
    const explicit = (element.getAttribute("role") || "").trim().toLowerCase();
    if (explicit) return explicit;
    const tag = element.tagName.toLowerCase();
    if (tag === "a" && element.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "textarea") return "textbox";
    if (tag === "select") return element.multiple ? "listbox" : "combobox";
    if (tag === "input") {
      const type = (element.type || "text").toLowerCase();
      if (["button", "submit", "reset", "image"].includes(type)) return "button";
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "range") return "slider";
      if (type !== "hidden") return "textbox";
    }
    return "";
  };
  const elementText = (element) => (
    element.innerText
    || element.getAttribute("aria-label")
    || element.getAttribute("placeholder")
    || ("value" in element ? String(element.value || "") : "")
    || element.getAttribute("title")
    || ""
  ).trim();
  const rendered = (element, rect) => {
    const style = getComputedStyle(element);
    return rect.width > 0
      && rect.height > 0
      && style.display !== "none"
      && style.visibility !== "hidden"
      && style.visibility !== "collapse"
      && Number(style.opacity || 1) > 0;
  };
  const visibleInViewport = (element, rect) => {
    if (!rendered(element, rect)) return false;
    const viewportWidth = document.documentElement.clientWidth || innerWidth;
    const viewportHeight = document.documentElement.clientHeight || innerHeight;
    if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight) return false;
    const x = Math.min(Math.max(rect.left + Math.min(rect.width / 2, viewportWidth / 2), 0), viewportWidth - 1);
    const y = Math.min(Math.max(rect.top + Math.min(rect.height / 2, viewportHeight / 2), 0), viewportHeight - 1);
    const top = document.elementFromPoint(x, y);
    const composedContains = (ancestor, descendant) => {
      let current = descendant;
      while (current) {
        if (current === ancestor || ancestor.contains?.(current)) return true;
        current = current.getRootNode?.().host || current.parentElement;
      }
      return false;
    };
    return Boolean(top && (top === element || composedContains(element, top) || composedContains(top, element)));
  };
  const targetRegion = options.region === "viewport"
    ? { x: 0, y: 0, width: innerWidth, height: innerHeight, mode: "intersect" }
    : options.region;
  const inRegion = (rect) => {
    if (!targetRegion) return true;
    const right = targetRegion.x + targetRegion.width;
    const bottom = targetRegion.y + targetRegion.height;
    if (targetRegion.mode === "contain") {
      return rect.left >= targetRegion.x && rect.top >= targetRegion.y && rect.right <= right && rect.bottom <= bottom;
    }
    return rect.right > targetRegion.x && rect.bottom > targetRegion.y && rect.left < right && rect.top < bottom;
  };

  const textQueries = options.text.map((value) => value.toLocaleLowerCase());
  const matched = elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const isVisible = visibleInViewport(element, rect);
    if (options.visibility === "visible" && !isVisible) return false;
    if (options.visibility === "hidden" && isVisible) return false;
    if (!inRegion(rect)) return false;
    const role = effectiveRole(element);
    if (options.roles.length && !options.roles.includes(role)) return false;
    if (textQueries.length) {
      const searchable = `${elementText(element)} ${element.textContent || ""}`.toLocaleLowerCase();
      if (!textQueries.some((query) => searchable.includes(query))) return false;
    }
    return true;
  });

  for (const element of walkOpenRoots(document, "[data-agent-bridge-ref]")) element.removeAttribute("data-agent-bridge-ref");
  const selected = matched.slice(options.offset, options.offset + options.maxElements);
  const interactive = selected.map((element, index) => {
    const ref = `e${index + 1}`;
    element.setAttribute("data-agent-bridge-ref", ref);
    const rect = element.getBoundingClientRect();
    const isVisible = visibleInViewport(element, rect);
    return {
      ref: `@${ref}`,
      tag: element.tagName.toLowerCase(),
      role: effectiveRole(element),
      ...(!options.compact ? { type: element.getAttribute("type") || "" } : {}),
      text: elementText(element).slice(0, options.compact ? 120 : 500),
      ...(!options.compact ? { value: "value" in element ? String(element.value || "").slice(0, 500) : "", href: element.href || "" } : {}),
      visible: isVisible,
      disabled: Boolean(element.disabled),
      ...(options.compact ? {} : { bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }),
    };
  });

  let pageText = "";
  if (options.textMode === "matched") {
    pageText = selected.map(elementText).filter(Boolean).join("\n");
  } else if (options.textMode === "page") {
    pageText = scopes.map((scope) => scope.innerText || "").filter(Boolean).join("\n");
  }
  const textTruncated = pageText.length > options.maxTextLength;
  const response = {
    title: document.title,
    url: location.href,
    text: pageText.slice(0, options.maxTextLength),
    interactive,
    query: options,
    counts: {
      candidates: elements.length,
      matched: matched.length,
      returned: interactive.length,
      offset: options.offset,
    },
    truncated: options.offset + interactive.length < matched.length,
    textTruncated,
  };
  if (options.compact) {
    delete response.query;
    delete response.counts.candidates;
    delete response.counts.offset;
  }
  let budgetTruncated = false;
  while (JSON.stringify(response).length > options.maxBytes && response.interactive.length > 0) {
    response.interactive.pop();
    budgetTruncated = true;
  }
  while (JSON.stringify(response).length > options.maxBytes && response.text.length > 0) {
    response.text = response.text.slice(0, Math.max(0, Math.floor(response.text.length * 0.8)));
    budgetTruncated = true;
  }
  response.budgetTruncated = budgetTruncated;
  return response;
}
