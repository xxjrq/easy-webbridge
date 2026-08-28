const state = { browserId: "", configured: false, connected: false };

const icons = {
  check: '<path d="m5 12 4 4L19 6"/>',
  warning: '<path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  offline: '<path d="M5.5 5.5A9.5 9.5 0 0 1 21 12m-3.5 6.5A9.5 9.5 0 0 1 3 12c0-1.2.2-2.3.6-3.3M3 3l18 18"/>',
  loading: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
};

function localizeError(error) {
  const value = String(error || "");
  if (value.includes("token is not configured")) return "请先保存本地访问令牌";
  if (value.includes("Unable to connect")) return "请先启动本地 Bridge 服务";
  if (value.includes("connection closed")) return "本地服务已断开，请重新连接";
  if (value.includes("401") || value.includes("Unauthorized")) return "访问令牌不正确，请重新填写";
  return value || "尚未连接本地服务";
}

function endpointLabel(endpoint) {
  try {
    const url = new URL(endpoint);
    return `${url.hostname}:${url.port || (url.protocol === "wss:" ? "443" : "80")}`;
  } catch {
    return "127.0.0.1:17777";
  }
}

function renderConnection(data) {
  const connection = document.querySelector("#connection");
  const icon = document.querySelector("#statusIcon svg");
  const title = document.querySelector("#statusTitle");
  const text = document.querySelector("#statusText");
  const pill = document.querySelector("#statusPill");
  const label = document.querySelector("#primaryLabel");

  state.connected = Boolean(data.connected);
  state.configured = Boolean(data.token);
  connection.className = "connection";

  if (state.connected) {
    icon.innerHTML = icons.check;
    title.textContent = "已连接，可以使用";
    text.textContent = "AI Agent 可通过此浏览器执行任务";
    pill.textContent = "在线";
    label.textContent = "重新连接";
    return;
  }

  if (!state.configured) {
    connection.classList.add("warning");
    icon.innerHTML = icons.warning;
    title.textContent = "还差一步即可使用";
    text.textContent = "需要填写本地 Bridge 访问令牌";
    pill.textContent = "未配置";
    label.textContent = "完成设置";
    return;
  }

  connection.classList.add("error");
  icon.innerHTML = icons.offline;
  title.textContent = "当前未连接";
  text.textContent = localizeError(data.connectionError);
  pill.textContent = "离线";
  label.textContent = "重新连接";
}

async function getStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "status" });
    if (response?.ok) return response;
  } catch {
    // The storage fallback keeps the popup useful while the worker wakes up.
  }
  return chrome.storage.local.get(["browserId", "displayName", "color", "endpoint", "token", "connected", "connectionError"]);
}

async function load() {
  const data = await getStatus();
  state.browserId = data.browserId || "";
  document.querySelector("#identityTitle").textContent = data.displayName || "未命名浏览器";
  document.querySelector("#shortId").textContent = state.browserId ? `${state.browserId.slice(0, 15)}…${state.browserId.slice(-6)}` : "正在生成 ID";
  document.querySelector("#shortId").title = state.browserId;
  document.querySelector("#colorMarker").style.background = data.color || "#2563eb";
  document.querySelector("#endpoint").textContent = endpointLabel(data.endpoint);
  document.querySelector("#version").textContent = `本地浏览器桥接 · v${chrome.runtime.getManifest().version}`;
  renderConnection(data);
}

document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());

document.querySelector("#copyId").addEventListener("click", async () => {
  if (!state.browserId) return;
  await navigator.clipboard.writeText(state.browserId);
  const feedback = document.querySelector("#feedback");
  feedback.textContent = "浏览器 ID 已复制";
  setTimeout(() => { feedback.textContent = ""; }, 1600);
});

document.querySelector("#primaryAction").addEventListener("click", async () => {
  if (!state.configured) {
    await chrome.runtime.openOptionsPage();
    return;
  }

  const button = document.querySelector("#primaryAction");
  const feedback = document.querySelector("#feedback");
  button.disabled = true;
  feedback.textContent = "正在重新连接…";
  try {
    await chrome.runtime.sendMessage({ type: "reconnect" });
    await new Promise((resolve) => setTimeout(resolve, 800));
    await load();
    feedback.textContent = state.connected ? "连接成功" : "正在等待本地服务响应";
  } catch {
    feedback.textContent = "连接失败，请检查本地服务";
  } finally {
    button.disabled = false;
    setTimeout(() => { feedback.textContent = ""; }, 2200);
  }
});

load();
