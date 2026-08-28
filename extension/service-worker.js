import { easyBrProfileId, identityColor } from "./identity.js";

const DEFAULTS = {
  endpoint: "ws://127.0.0.1:17777/extension",
  token: "",
  displayName: "",
  color: "#2563eb",
};

let socket = null;
let reconnectTimer = null;
let connected = false;
const attachedTabs = new Set();
const networkByTab = new Map();
const commandQueues = new Map();
const SESSION_PREFIX = "agent-session:";
const TAB_GROUP_COLORS = new Set(["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"]);

async function settings() {
  return chrome.storage.local.get(DEFAULTS);
}

async function discoverEasyBrIdentity() {
  const tabs = await chrome.tabs.query({});
  const profileTab = tabs.find((tab) => easyBrProfileId(tab.url));
  if (!profileTab) return null;

  const profileId = easyBrProfileId(profileTab.url);

  try {
    const keyResponse = await fetch("http://localhost:3001/user/getkey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browerid: profileId }),
    });
    const keyPayload = await keyResponse.json();
    if (!keyResponse.ok || !keyPayload?.LoginKey) throw new Error("EasyBR profile key is unavailable");

    const configResponse = await fetch("http://localhost:3001/user/getconfig", {
      method: "POST",
      headers: { "Authorization": keyPayload.LoginKey, "Content-Type": "application/json" },
      body: JSON.stringify({ browerid: profileId }),
    });
    const configPayload = await configResponse.json();
    const profile = configPayload?.configData;
    if (!configResponse.ok || !profile) throw new Error("EasyBR profile information is unavailable");
    return {
      profileId,
      browserId: `easybr-${profileId}`,
      displayName: String(profile.browername || `EasyBR ${profile.rownum || profileId.slice(-4)}`).trim(),
      groupName: String(profile.groupname || "").trim(),
      rowNumber: profile.rownum ?? null,
      kernel: String(profile.kernel || "").trim(),
    };
  } catch {
    return {
      profileId,
      browserId: `easybr-${profileId}`,
      displayName: `EasyBR ${profileId.slice(-4).toUpperCase()}`,
      groupName: "",
      rowNumber: null,
      kernel: "",
    };
  }
}

async function ensureIdentity() {
  const stored = await chrome.storage.local.get(["browserId", "displayName", "color", "identitySource", "profileId", "groupName", "rowNumber", "kernel"]);
  if (stored.identitySource === "easybr" && stored.profileId) {
    await applyVisualIdentity(stored.displayName, stored.color);
    return stored;
  }

  if (stored.identitySource !== "manual") {
    const discovered = await discoverEasyBrIdentity();
    if (discovered) {
      const identity = {
        ...discovered,
        color: identityColor(discovered.profileId),
        identitySource: "easybr",
      };
      await chrome.storage.local.set(identity);
      await applyVisualIdentity(identity.displayName, identity.color);
      return identity;
    }
  }

  const browserId = stored.browserId || `browser-${crypto.randomUUID()}`;
  const displayName = stored.displayName || `Browser ${browserId.slice(-4).toUpperCase()}`;
  const color = stored.color || DEFAULTS.color;
  const identitySource = stored.identitySource || "generated";
  await chrome.storage.local.set({ browserId, displayName, color, identitySource });
  await applyVisualIdentity(displayName, color);
  return { browserId, displayName, color, identitySource };
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

async function applyVisualIdentity(displayName, color) {
  const imageData = {};
  for (const size of [16, 32, 48, 128]) {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d");
    context.fillStyle = color;
    roundRect(context, 0, 0, size, size, Math.max(3, size * 0.22));
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(1.3, size * 0.07);
    context.strokeRect(size * 0.2, size * 0.25, size * 0.6, size * 0.5);
    context.beginPath();
    context.arc(size * 0.5, size * 0.56, size * 0.15, Math.PI, 0);
    context.stroke();
    imageData[size] = context.getImageData(0, 0, size, size);
  }
  await chrome.action.setIcon({ imageData });
  await chrome.action.setBadgeText({ text: displayName.slice(0, 2).toUpperCase() });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setTitle({ title: `Easy WebBridge · ${displayName}` });
}

function browserName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("OPR/")) return "Opera";
  if (userAgent.includes("Chrome/")) return "Chrome/Chromium";
  return "Chromium";
}

function updateConnectionState(isConnected, error = "") {
  connected = isConnected;
  chrome.storage.local.set({ connected: isConnected, connectionError: error, lastConnectionAt: Date.now() });
  chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
}

function pairingUrl(endpoint) {
  const url = new URL(endpoint);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("Bridge token is not configured");
  }
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/pair";
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function pairWithLocalBridge(endpoint) {
  const response = await fetch(pairingUrl(endpoint), { method: "POST", cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload?.token) throw new Error(payload?.error || "Automatic pairing failed");
  await chrome.storage.local.set({ token: payload.token });
  return payload.token;
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, 3_000);
}

async function connect() {
  clearTimeout(reconnectTimer);
  let config = await settings();
  const identity = await ensureIdentity();
  if (!config.token) {
    updateConnectionState(false, "正在自动配对本地服务");
    try {
      const token = await pairWithLocalBridge(config.endpoint);
      config = { ...config, token };
    } catch (error) {
      const message = error instanceof TypeError ? "Local bridge is not running" : error.message;
      updateConnectionState(false, message);
      scheduleReconnect();
      return;
    }
  }
  if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return;

  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    endpoint.searchParams.set("token", config.token);
    socket = new WebSocket(endpoint.toString());
  } catch (error) {
    updateConnectionState(false, error.message);
    return;
  }

  const currentSocket = socket;
  let acknowledged = false;
  socket.addEventListener("open", async () => {
    if (socket !== currentSocket) return;
    updateConnectionState(false, "正在验证本地连接");
    const platform = await chrome.runtime.getPlatformInfo();
    currentSocket.send(JSON.stringify({
      type: "hello",
      ...identity,
      browser: browserName(),
      platform: `${platform.os}/${platform.arch}`,
      extensionVersion: chrome.runtime.getManifest().version,
    }));
  });

  socket.addEventListener("message", async (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "hello_ack") {
        acknowledged = true;
        if (socket === currentSocket) updateConnectionState(true);
        return;
      }
      if (message.type !== "command") return;
      const result = await executeQueuedCommand(message.action, message.args || {});
      currentSocket.send(JSON.stringify({ type: "result", commandId: message.commandId, ok: true, result }));
    } catch (error) {
      const commandId = (() => {
        try { return JSON.parse(event.data).commandId; } catch { return null; }
      })();
      currentSocket.send(JSON.stringify({ type: "result", commandId, ok: false, error: error.message }));
    }
  });

  socket.addEventListener("close", () => {
    if (socket !== currentSocket) return;
    socket = null;
    updateConnectionState(false, "Bridge connection closed");
    if (!acknowledged && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)) {
      chrome.storage.local.remove("token");
    }
    scheduleReconnect();
  });
  socket.addEventListener("error", () => {
    if (socket === currentSocket) updateConnectionState(false, "Unable to connect to local bridge");
  });
}

async function reconnect() {
  clearTimeout(reconnectTimer);
  const previousSocket = socket;
  socket = null;
  previousSocket?.close();
  await connect();
}

async function activeTab(args = {}) {
  if (args.tabId != null) {
    return chrome.tabs.get(Number(args.tabId));
  }
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tabs[0]) throw new Error("No active tab found");
  return tabs[0];
}

function sessionName(args = {}) {
  const name = String(args.session || "").trim();
  if (name.length > 120) throw new Error("session must be 120 characters or fewer");
  return name;
}

function sessionStorageKey(name) {
  return `${SESSION_PREFIX}${name}`;
}

async function readSession(name) {
  if (!name) return null;
  const key = sessionStorageKey(name);
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

async function writeSession(name, value) {
  await chrome.storage.local.set({ [sessionStorageKey(name)]: value });
}

async function liveTabs(tabIds = []) {
  const tabs = await Promise.all(tabIds.map(async (tabId) => {
    try { return await chrome.tabs.get(Number(tabId)); } catch { return null; }
  }));
  return tabs.filter(Boolean);
}

async function rememberSessionTab(name, tab, args = {}) {
  if (!name) return { session: "", groupId: tab.groupId ?? -1 };
  const previous = await readSession(name) || { tabIds: [], currentTabId: null, groupId: null, groupTitle: name };
  const tabs = await liveTabs(previous.tabIds);
  const tabIds = [...new Set([...tabs.map(({ id }) => id), tab.id])];
  const groupTitle = String(args.groupTitle || args.group_title || previous.groupTitle || name).trim().slice(0, 80);
  let groupId = Number.isInteger(previous.groupId) ? previous.groupId : null;

  try {
    groupId = groupId == null
      ? await chrome.tabs.group({ tabIds: [tab.id] })
      : await chrome.tabs.group({ groupId, tabIds: [tab.id] });
  } catch {
    groupId = await chrome.tabs.group({ tabIds: [tab.id] });
  }

  const color = TAB_GROUP_COLORS.has(args.groupColor) ? args.groupColor : "blue";
  await chrome.tabGroups.update(groupId, { title: groupTitle, color, collapsed: false });
  await writeSession(name, { tabIds, currentTabId: tab.id, groupId, groupTitle });
  return { session: name, groupId, groupTitle };
}

async function updateSessionCurrent(name, tabId) {
  if (!name) return;
  const state = await readSession(name);
  if (!state) return;
  await writeSession(name, { ...state, currentTabId: tabId });
}

async function sessionTabs(name) {
  const state = await readSession(name);
  if (!state) return { state: null, tabs: [] };
  const tabs = await liveTabs(state.tabIds);
  if (tabs.length !== state.tabIds.length) {
    await writeSession(name, {
      ...state,
      tabIds: tabs.map(({ id }) => id),
      currentTabId: tabs.some(({ id }) => id === state.currentTabId) ? state.currentTabId : tabs.at(-1)?.id ?? null,
    });
  }
  return { state, tabs };
}

async function removeTabFromSessions(tabId) {
  const stored = await chrome.storage.local.get(null);
  const updates = {};
  const removals = [];
  for (const [key, state] of Object.entries(stored)) {
    if (!key.startsWith(SESSION_PREFIX) || !state?.tabIds?.includes(tabId)) continue;
    const tabIds = state.tabIds.filter((id) => id !== tabId);
    if (!tabIds.length) {
      removals.push(key);
    } else {
      updates[key] = {
        ...state,
        tabIds,
        currentTabId: state.currentTabId === tabId ? tabIds.at(-1) : state.currentTabId,
      };
    }
  }
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
  if (removals.length) await chrome.storage.local.remove(removals);
}

function selectorFromRef(selector) {
  const value = String(selector || "");
  if (!value.startsWith("@")) return value;
  const ref = value.slice(1);
  if (!/^e\d+$/.test(ref)) throw new Error(`Invalid element reference: ${value}`);
  return `[data-agent-bridge-ref="${ref}"]`;
}

function snapshotDocument(options) {
  const maxTextLength = Number(options.maxTextLength || 100_000);
  const elements = [...document.querySelectorAll("a,button,input,textarea,select,[contenteditable='true'],[role='button'],[role='link'],[tabindex]")];
  const interactive = elements.map((element, index) => {
    const ref = `e${index + 1}`;
    element.setAttribute("data-agent-bridge-ref", ref);
    const rect = element.getBoundingClientRect();
    return {
      ref: `@${ref}`,
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      type: element.getAttribute("type") || "",
      text: (element.innerText || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").trim().slice(0, 500),
      value: "value" in element ? String(element.value || "").slice(0, 500) : "",
      href: element.href || "",
      visible: rect.width > 0 && rect.height > 0,
      disabled: Boolean(element.disabled),
    };
  });
  return {
    title: document.title,
    url: location.href,
    text: (document.body?.innerText || "").slice(0, maxTextLength),
    interactive,
  };
}

function clickElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  element.scrollIntoView({ block: "center", inline: "center" });
  element.click();
  return { tag: element.tagName.toLowerCase(), text: (element.innerText || element.getAttribute("aria-label") || "").trim().slice(0, 500) };
}

function fillElement(selector, value) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  element.focus();
  if (element.isContentEditable) {
    element.textContent = value;
  } else if ("value" in element) {
    const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter ? setter.call(element, value) : (element.value = value);
  } else {
    throw new Error("Element is not editable");
  }
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return { tag: element.tagName.toLowerCase(), value: element.isContentEditable ? element.textContent : element.value };
}

function scrollPage(options) {
  window.scrollBy({ left: Number(options.x || 0), top: Number(options.y || 0), behavior: options.behavior || "instant" });
  return { x: window.scrollX, y: window.scrollY };
}

async function evaluateCode(code) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    return await new AsyncFunction(`return (${code});`)();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return new AsyncFunction(code)();
  }
}

async function executeScript(tabId, func, args = [], world = "ISOLATED") {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func, args, world });
  return result;
}

async function attachDebugger(tabId) {
  if (attachedTabs.has(tabId)) return;
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    attachedTabs.add(tabId);
  } catch (error) {
    if (!String(error.message).includes("already attached")) throw error;
    attachedTabs.add(tabId);
  }
}

async function cdp(tabId, method, params = {}) {
  await attachDebugger(tabId);
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

function networkSummary(entry) {
  return {
    requestId: entry.requestId,
    url: entry.url,
    method: entry.method,
    type: entry.type,
    status: entry.status ?? null,
    statusText: entry.statusText || "",
    mimeType: entry.mimeType || "",
    encodedDataLength: entry.encodedDataLength ?? null,
    failed: Boolean(entry.failed),
    errorText: entry.errorText || "",
    startedAt: entry.startedAt,
    finishedAt: entry.finishedAt || null,
  };
}

async function networkCommand(tab, args) {
  const cmd = String(args.cmd || "list").toLowerCase();
  let state = networkByTab.get(tab.id);

  if (cmd === "start") {
    await attachDebugger(tab.id);
    if (!state || args.clear !== false) state = { enabled: true, requests: new Map(), order: [] };
    state.enabled = true;
    networkByTab.set(tab.id, state);
    await cdp(tab.id, "Network.enable", {
      maxTotalBufferSize: 100_000_000,
      maxResourceBufferSize: 10_000_000,
      maxPostDataSize: 1_000_000,
    });
    return { tabId: tab.id, recording: true, captured: state.order.length };
  }

  if (!state) throw new Error("Network recording has not been started for this tab");

  if (cmd === "stop") {
    state.enabled = false;
    try { await cdp(tab.id, "Network.disable"); } catch { /* debugger may already be detached */ }
    return { tabId: tab.id, recording: false, captured: state.order.length };
  }

  if (cmd === "list") {
    const filter = String(args.filter || "").toLowerCase();
    const limit = Math.min(Math.max(Number(args.limit || 200), 1), 1_000);
    const requests = state.order
      .map((requestId) => state.requests.get(requestId))
      .filter(Boolean)
      .filter((entry) => !filter || `${entry.method} ${entry.status ?? ""} ${entry.type} ${entry.url}`.toLowerCase().includes(filter))
      .slice(-limit)
      .map(networkSummary);
    return { tabId: tab.id, recording: state.enabled, total: state.order.length, requests };
  }

  if (cmd === "detail") {
    const requestId = String(args.requestId || "");
    const entry = state.requests.get(requestId);
    if (!entry) throw new Error(`Unknown network request: ${requestId || "<empty>"}`);
    let responseBody = null;
    let base64Encoded = false;
    let bodyTruncated = false;
    if (args.includeBody !== false && entry.finishedAt && !entry.failed) {
      try {
        const bodyResult = await cdp(tab.id, "Network.getResponseBody", { requestId });
        const maxBodyLength = Math.min(Math.max(Number(args.maxBodyLength || 1_000_000), 1_000), 5_000_000);
        responseBody = String(bodyResult.body || "");
        base64Encoded = Boolean(bodyResult.base64Encoded);
        bodyTruncated = responseBody.length > maxBodyLength;
        if (bodyTruncated) responseBody = responseBody.slice(0, maxBodyLength);
      } catch {
        responseBody = null;
      }
    }
    return { ...entry, responseBody, base64Encoded, bodyTruncated };
  }

  throw new Error(`Unsupported network command: ${cmd}`);
}

async function captureScreenshot(tab, args) {
  const format = args.format === "jpeg" ? "jpeg" : "png";
  const params = {
    format,
    fromSurface: true,
    captureBeyondViewport: Boolean(args.fullPage || args.selector),
  };
  if (format === "jpeg" && args.quality != null) {
    params.quality = Math.min(Math.max(Number(args.quality), 0), 100);
  }

  if (args.selector) {
    const documentNode = await cdp(tab.id, "DOM.getDocument", { depth: 0, pierce: true });
    const node = await cdp(tab.id, "DOM.querySelector", {
      nodeId: documentNode.root.nodeId,
      selector: selectorFromRef(args.selector),
    });
    if (!node.nodeId) throw new Error(`Element not found: ${args.selector}`);
    const model = await cdp(tab.id, "DOM.getBoxModel", { nodeId: node.nodeId });
    const points = model.model.border;
    const xs = points.filter((_value, index) => index % 2 === 0);
    const ys = points.filter((_value, index) => index % 2 === 1);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    params.clip = {
      x,
      y,
      width: Math.max(...xs) - x,
      height: Math.max(...ys) - y,
      scale: 1,
    };
  } else if (args.fullPage) {
    const { contentSize } = await cdp(tab.id, "Page.getLayoutMetrics");
    params.clip = { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 };
  }

  const result = await cdp(tab.id, "Page.captureScreenshot", params);
  return {
    dataUrl: `data:image/${format};base64,${result.data}`,
    tabId: tab.id,
    url: tab.url,
    selector: args.selector || "",
    fullPage: Boolean(args.fullPage),
    requestedPath: String(args.path || ""),
  };
}

const PAPER_FORMATS = {
  letter: [8.5, 11],
  legal: [8.5, 14],
  tabloid: [11, 17],
  a3: [11.69, 16.54],
  a4: [8.27, 11.69],
};

async function saveAsPdf(tab, args) {
  const paper = PAPER_FORMATS[String(args.paper_format || "letter").toLowerCase()] || PAPER_FORMATS.letter;
  const result = await cdp(tab.id, "Page.printToPDF", {
    landscape: Boolean(args.landscape),
    displayHeaderFooter: false,
    printBackground: args.print_background !== false,
    scale: Math.min(Math.max(Number(args.scale || 1), 0.1), 2),
    paperWidth: paper[0],
    paperHeight: paper[1],
    marginTop: Number(args.margin_top ?? 0.4),
    marginBottom: Number(args.margin_bottom ?? 0.4),
    marginLeft: Number(args.margin_left ?? 0.4),
    marginRight: Number(args.margin_right ?? 0.4),
    preferCSSPageSize: Boolean(args.prefer_css_page_size),
    transferMode: "ReturnAsBase64",
  });
  return {
    dataUrl: `data:application/pdf;base64,${result.data}`,
    tabId: tab.id,
    url: tab.url,
    title: tab.title || "page",
    requestedPath: String(args.path || ""),
  };
}

async function executeCommand(action, args) {
  if (action === "reload_extension") {
    const extensionVersion = chrome.runtime.getManifest().version;
    setTimeout(() => chrome.runtime.reload(), 250);
    return { reloading: true, extensionVersion };
  }
  if (action === "list_tabs") {
    const name = sessionName(args);
    const tabs = name ? (await sessionTabs(name)).tabs : await chrome.tabs.query({});
    return tabs.map(({ id, windowId, groupId, active, pinned, title, url, status }) => ({ id, windowId, groupId, active, pinned, title, url, status }));
  }
  if (action === "find_tab") {
    if (!args.url) throw new Error("url is required");
    const name = sessionName(args);
    const tabs = args.active
      ? await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      : name ? (await sessionTabs(name)).tabs : await chrome.tabs.query({});
    const query = String(args.url);
    const tab = tabs.find(({ url = "" }) => url === query) || tabs.find(({ url = "" }) => url.includes(query));
    if (!tab) throw new Error(`No tab matching ${query}${name ? ` in session ${name}` : ""}`);
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    await updateSessionCurrent(name, tab.id);
    return { tabId: tab.id, windowId: tab.windowId, url: tab.url, session: name, borrowed: Boolean(args.active) };
  }
  if (action === "navigate") {
    if (!args.url) throw new Error("url is required");
    const name = sessionName(args);
    const state = name ? await readSession(name) : null;
    let target = null;
    if (!args.newTab && state?.currentTabId) {
      try { target = await chrome.tabs.get(state.currentTabId); } catch { target = null; }
    }
    const tab = args.newTab || (name && !target)
      ? await chrome.tabs.create({ url: args.url, active: args.active !== false })
      : await chrome.tabs.update((target || await activeTab(args)).id, { url: args.url, active: args.active !== false });
    const grouped = await rememberSessionTab(name, tab, args);
    return { tabId: tab.id, windowId: tab.windowId, url: tab.url || args.url, ...grouped };
  }
  if (action === "activate_tab") {
    const tab = await activeTab(args);
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    const name = sessionName(args);
    await updateSessionCurrent(name, tab.id);
    return { tabId: tab.id, windowId: tab.windowId, session: name };
  }
  if (action === "close_tab") {
    const tab = await activeTab(args);
    await chrome.tabs.remove(tab.id);
    return { tabId: tab.id, closed: true };
  }
  if (action === "close_session") {
    const name = sessionName(args);
    if (!name) throw new Error("session is required");
    const { tabs } = await sessionTabs(name);
    if (tabs.length) await chrome.tabs.remove(tabs.map(({ id }) => id));
    await chrome.storage.local.remove(sessionStorageKey(name));
    return { session: name, closed: tabs.length };
  }

  if (action === "get_cookies") return chrome.cookies.getAll(args.filter || {});
  if (action === "set_cookie") return chrome.cookies.set(args.cookie || args);
  if (action === "remove_cookie") return chrome.cookies.remove({ url: args.url, name: args.name, storeId: args.storeId });
  if (action === "download") return { downloadId: await chrome.downloads.download(args) };

  const tab = await activeTab(args);
  if (action === "snapshot") return executeScript(tab.id, snapshotDocument, [args]);
  if (action === "click") return executeScript(tab.id, clickElement, [selectorFromRef(args.selector)]);
  if (action === "fill") return executeScript(tab.id, fillElement, [selectorFromRef(args.selector), String(args.value ?? "")]);
  if (action === "scroll") return executeScript(tab.id, scrollPage, [args]);
  if (action === "evaluate") return executeScript(tab.id, evaluateCode, [String(args.code || "")], args.world === "ISOLATED" ? "ISOLATED" : "MAIN");
  if (action === "screenshot") return captureScreenshot(tab, args);
  if (action === "save_as_pdf") return saveAsPdf(tab, args);
  if (action === "network") return networkCommand(tab, args);
  if (action === "cdp") {
    if (!args.method) throw new Error("CDP method is required");
    return cdp(tab.id, args.method, args.params || {});
  }
  if (action === "upload") {
    if (!args.selector || !Array.isArray(args.files) || !args.files.length) throw new Error("selector and files are required");
    const documentNode = await cdp(tab.id, "DOM.getDocument", { depth: 0, pierce: true });
    const node = await cdp(tab.id, "DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: args.selector });
    if (!node.nodeId) throw new Error(`File input not found: ${args.selector}`);
    await cdp(tab.id, "DOM.setFileInputFiles", { nodeId: node.nodeId, files: args.files });
    return { fileCount: args.files.length, selector: args.selector };
  }
  throw new Error(`Unsupported action: ${action}`);
}

async function executeQueuedCommand(action, args) {
  const queueKey = args.tabId != null
    ? `tab:${Number(args.tabId)}`
    : args.session ? `session:${String(args.session)}` : "browser";
  const previous = commandQueues.get(queueKey) || Promise.resolve();
  const current = previous.catch(() => undefined).then(() => executeCommand(action, args));
  commandQueues.set(queueKey, current);
  try {
    return await current;
  } finally {
    if (commandQueues.get(queueKey) === current) commandQueues.delete(queueKey);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureIdentity();
  await chrome.alarms.create("bridge-heartbeat", { periodInMinutes: 0.4 });
  connect();
});
chrome.runtime.onStartup.addListener(connect);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "bridge-heartbeat") return;
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping", time: Date.now() }));
  else connect();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!easyBrProfileId(changeInfo.url || tab.url)) return;
  chrome.storage.local.get(["identitySource"]).then(({ identitySource }) => {
    if (!identitySource || identitySource === "generated") reconnect();
  });
});
chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId);
  networkByTab.delete(tabId);
  removeTabFromSessions(tabId);
});
chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  const state = networkByTab.get(tabId);
  if (!state?.enabled) return;

  if (method === "Network.requestWillBeSent") {
    const entry = {
      requestId: params.requestId,
      url: params.request.url,
      method: params.request.method,
      type: params.type || "Other",
      documentURL: params.documentURL || "",
      startedAt: new Date().toISOString(),
      timestamp: params.timestamp,
      requestHeaders: params.request.headers || {},
      postData: params.request.postData || null,
      initiator: params.initiator || null,
    };
    if (!state.requests.has(params.requestId)) state.order.push(params.requestId);
    state.requests.set(params.requestId, entry);
    while (state.order.length > 1_000) {
      state.requests.delete(state.order.shift());
    }
    return;
  }

  const entry = state.requests.get(params.requestId);
  if (!entry) return;
  if (method === "Network.responseReceived") {
    Object.assign(entry, {
      status: params.response.status,
      statusText: params.response.statusText,
      mimeType: params.response.mimeType,
      protocol: params.response.protocol,
      remoteIPAddress: params.response.remoteIPAddress,
      responseHeaders: params.response.headers || {},
    });
  } else if (method === "Network.loadingFinished") {
    Object.assign(entry, { finishedAt: new Date().toISOString(), encodedDataLength: params.encodedDataLength });
  } else if (method === "Network.loadingFailed") {
    Object.assign(entry, { finishedAt: new Date().toISOString(), failed: true, errorText: params.errorText, canceled: params.canceled });
  }
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "reconnect") {
    reconnect().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "status") {
    chrome.storage.local.get({ ...DEFAULTS, browserId: "", identitySource: "", profileId: "", groupName: "", rowNumber: null, kernel: "" }).then((config) => {
      sendResponse({ ok: true, connected, ...config, token: config.token ? "configured" : "" });
    });
    return true;
  }
  return false;
});
chrome.debugger.onDetach.addListener(({ tabId }) => {
  attachedTabs.delete(tabId);
  const state = networkByTab.get(tabId);
  if (state) state.enabled = false;
});

ensureIdentity().then(connect);
