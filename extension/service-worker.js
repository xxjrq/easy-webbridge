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

async function settings() {
  return chrome.storage.local.get(DEFAULTS);
}

async function ensureIdentity() {
  const stored = await chrome.storage.local.get(["browserId", "displayName", "color"]);
  const browserId = stored.browserId || `browser-${crypto.randomUUID()}`;
  const displayName = stored.displayName || `Browser ${browserId.slice(-4).toUpperCase()}`;
  const color = stored.color || DEFAULTS.color;
  await chrome.storage.local.set({ browserId, displayName, color });
  await applyVisualIdentity(displayName, color);
  return { browserId, displayName, color };
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
  await chrome.action.setTitle({ title: `Agent Browser Bridge · ${displayName}` });
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

async function connect() {
  clearTimeout(reconnectTimer);
  const config = await settings();
  const identity = await ensureIdentity();
  if (!config.token) {
    updateConnectionState(false, "Bridge token is not configured");
    return;
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

  socket.addEventListener("open", async () => {
    updateConnectionState(true);
    const platform = await chrome.runtime.getPlatformInfo();
    socket.send(JSON.stringify({
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
      if (message.type !== "command") return;
      const result = await executeCommand(message.action, message.args || {});
      socket?.send(JSON.stringify({ type: "result", commandId: message.commandId, ok: true, result }));
    } catch (error) {
      const commandId = (() => {
        try { return JSON.parse(event.data).commandId; } catch { return null; }
      })();
      socket?.send(JSON.stringify({ type: "result", commandId, ok: false, error: error.message }));
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    updateConnectionState(false, "Bridge connection closed");
    reconnectTimer = setTimeout(connect, 3_000);
  });
  socket.addEventListener("error", () => updateConnectionState(false, "Unable to connect to local bridge"));
}

async function activeTab(args = {}) {
  if (args.tabId != null) {
    return chrome.tabs.get(Number(args.tabId));
  }
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tabs[0]) throw new Error("No active tab found");
  return tabs[0];
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

function evaluateCode(code) {
  return (0, eval)(code);
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

async function executeCommand(action, args) {
  if (action === "list_tabs") {
    const tabs = await chrome.tabs.query({});
    return tabs.map(({ id, windowId, active, pinned, title, url, status }) => ({ id, windowId, active, pinned, title, url, status }));
  }
  if (action === "navigate") {
    if (!args.url) throw new Error("url is required");
    const tab = args.newTab
      ? await chrome.tabs.create({ url: args.url, active: args.active !== false })
      : await chrome.tabs.update((await activeTab(args)).id, { url: args.url, active: args.active !== false });
    return { tabId: tab.id, windowId: tab.windowId, url: tab.url || args.url };
  }
  if (action === "activate_tab") {
    const tab = await activeTab(args);
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    return { tabId: tab.id, windowId: tab.windowId };
  }
  if (action === "close_tab") {
    const tab = await activeTab(args);
    await chrome.tabs.remove(tab.id);
    return { tabId: tab.id, closed: true };
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
  if (action === "screenshot") {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: args.format === "jpeg" ? "jpeg" : "png", quality: args.quality });
    return { dataUrl, tabId: tab.id, url: tab.url };
  }
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
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "reconnect") {
    socket?.close();
    socket = null;
    connect().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "status") {
    settings().then((config) => sendResponse({ ok: true, connected, ...config, token: config.token ? "configured" : "" }));
    return true;
  }
  return false;
});
chrome.debugger.onDetach.addListener(({ tabId }) => attachedTabs.delete(tabId));

ensureIdentity().then(connect);
