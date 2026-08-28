const defaults = {
  endpoint: "ws://127.0.0.1:17777/extension",
  token: "",
  displayName: "",
  color: "#2563eb",
  browserId: "",
  connected: false,
  connectionError: "",
};

const elements = {
  form: document.querySelector("#form"),
  endpoint: document.querySelector("#endpoint"),
  token: document.querySelector("#token"),
  displayName: document.querySelector("#displayName"),
  color: document.querySelector("#color"),
  browserId: document.querySelector("#browserId"),
  message: document.querySelector("#message"),
  saveButton: document.querySelector("#saveButton"),
  testService: document.querySelector("#testService"),
  headerStatus: document.querySelector("#headerStatus"),
  headerStatusText: document.querySelector("#headerStatusText"),
};

function healthUrl(endpoint) {
  const url = new URL(endpoint);
  if (!(["ws:", "wss:"].includes(url.protocol))) throw new Error("地址必须以 ws:// 或 wss:// 开头");
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/health";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function showMessage(text, tone = "") {
  elements.message.textContent = text;
  elements.message.className = `form-message ${tone}`.trim();
}

function setHeaderStatus(connected, configured) {
  elements.headerStatus.className = "header-status";
  if (connected) {
    elements.headerStatus.classList.add("online");
    elements.headerStatusText.textContent = "已连接";
  } else if (configured) {
    elements.headerStatus.classList.add("offline");
    elements.headerStatusText.textContent = "未连接";
  } else {
    elements.headerStatusText.textContent = "等待设置";
  }
}

function setSelectedColor(color) {
  elements.color.value = color;
  for (const swatch of document.querySelectorAll(".swatch")) {
    const selected = swatch.dataset.color.toLowerCase() === color.toLowerCase();
    swatch.setAttribute("aria-checked", String(selected));
    swatch.tabIndex = selected ? 0 : -1;
  }
}

function clearFieldError(input, errorElement) {
  input.removeAttribute("aria-invalid");
  errorElement.textContent = "";
  errorElement.classList.remove("visible");
}

function showFieldError(input, errorElement, text) {
  input.setAttribute("aria-invalid", "true");
  errorElement.textContent = text;
  errorElement.classList.add("visible");
}

function validate() {
  const endpointError = document.querySelector("#endpointError");
  const nameError = document.querySelector("#nameError");
  clearFieldError(elements.endpoint, endpointError);
  clearFieldError(elements.displayName, nameError);

  let firstInvalid = null;
  try {
    healthUrl(elements.endpoint.value.trim());
  } catch (error) {
    showFieldError(elements.endpoint, endpointError, error.message || "请输入有效的 Bridge 地址");
    firstInvalid ||= elements.endpoint;
  }
  if (!elements.displayName.value.trim()) {
    showFieldError(elements.displayName, nameError, "请为当前浏览器填写一个易识别的名称");
    firstInvalid ||= elements.displayName;
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

async function copyText(text, successText = "已复制") {
  await navigator.clipboard.writeText(text);
  showMessage(successText, "success");
  setTimeout(() => {
    if (elements.message.textContent === successText) showMessage("");
  }, 1800);
}

async function load() {
  const data = await chrome.storage.local.get(defaults);
  elements.endpoint.value = data.endpoint || defaults.endpoint;
  elements.token.value = data.token || "";
  elements.displayName.value = data.displayName || "";
  elements.browserId.value = data.browserId || "正在生成…";
  setSelectedColor(data.color || defaults.color);
  setHeaderStatus(Boolean(data.connected), Boolean(data.token));
}

async function checkService({ announce = true } = {}) {
  const original = elements.testService.innerHTML;
  elements.testService.disabled = true;
  elements.testService.querySelector("span").textContent = "检测中…";
  try {
    const response = await fetch(healthUrl(elements.endpoint.value.trim()), { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error("服务响应异常");
    if (announce) showMessage(`本地服务运行正常，当前连接 ${payload.browsers ?? 0} 个浏览器`, "success");
    return true;
  } catch (error) {
    if (announce) showMessage(`未检测到本地服务：${error.message || "请先运行 npm start"}`, "error");
    return false;
  } finally {
    elements.testService.innerHTML = original;
    elements.testService.disabled = false;
  }
}

async function waitForConnection(timeoutMs = 6000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const data = await chrome.storage.local.get(["connected", "connectionError"]);
    if (data.connected) return { connected: true };
  }
  return chrome.storage.local.get(["connected", "connectionError"]);
}

document.querySelector("#toggleToken").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const visible = elements.token.type === "text";
  elements.token.type = visible ? "password" : "text";
  button.setAttribute("aria-pressed", String(!visible));
  button.setAttribute("aria-label", visible ? "显示访问令牌" : "隐藏访问令牌");
  button.title = visible ? "显示令牌" : "隐藏令牌";
});

document.querySelector("#swatches").addEventListener("click", (event) => {
  const swatch = event.target.closest(".swatch");
  if (swatch) setSelectedColor(swatch.dataset.color);
});

document.querySelector("#swatches").addEventListener("keydown", (event) => {
  if (!(["ArrowLeft", "ArrowRight"].includes(event.key))) return;
  event.preventDefault();
  const swatches = [...document.querySelectorAll(".swatch")];
  const current = swatches.findIndex((item) => item.getAttribute("aria-checked") === "true");
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const next = swatches[(current + direction + swatches.length) % swatches.length];
  setSelectedColor(next.dataset.color);
  next.focus();
});

elements.testService.addEventListener("click", () => checkService());
document.querySelector("#copyBrowserId").addEventListener("click", () => copyText(elements.browserId.value, "浏览器 ID 已复制"));
for (const button of document.querySelectorAll(".copy-command")) {
  button.addEventListener("click", () => copyText(button.dataset.copy, "命令已复制"));
}

for (const input of [elements.endpoint, elements.token, elements.displayName]) {
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    const error = document.querySelector(`#${input.id === "displayName" ? "name" : input.id}Error`);
    error?.classList.remove("visible");
  });
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;

  const next = {
    endpoint: elements.endpoint.value.trim(),
    token: elements.token.value.trim(),
    displayName: elements.displayName.value.trim(),
    color: elements.color.value,
    identitySource: "manual",
  };
  elements.saveButton.disabled = true;
  elements.saveButton.querySelector("span").textContent = "正在连接…";
  showMessage("正在保存配置并连接本地 Bridge…");

  try {
    await chrome.storage.local.set(next);
    const serviceAvailable = await checkService({ announce: false });
    await chrome.runtime.sendMessage({ type: "reconnect" });
    const result = await waitForConnection();
    if (result.connected) {
      setHeaderStatus(true, true);
      showMessage("设置已保存，当前浏览器已连接，可以开始使用。", "success");
    } else {
      setHeaderStatus(false, true);
      const hint = serviceAvailable ? "请检查访问令牌是否正确" : "请先在项目目录运行 npm start";
      showMessage(`设置已保存，但尚未连接。${hint}。`, "error");
    }
  } catch (error) {
    setHeaderStatus(false, true);
    showMessage(`保存失败：${error.message}`, "error");
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.querySelector("span").textContent = "保存并连接";
  }
});

load();
