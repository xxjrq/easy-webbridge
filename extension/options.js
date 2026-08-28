const defaults = { endpoint: "ws://127.0.0.1:17777/extension", token: "", displayName: "", color: "#2563eb" };

async function load() {
  const data = await chrome.storage.local.get(defaults);
  for (const key of ["endpoint", "token", "displayName", "color", "browserId"]) {
    const input = document.querySelector(`#${key}`);
    if (input) input.value = data[key] || "";
  }
}

document.querySelector("#form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const next = {
    endpoint: document.querySelector("#endpoint").value.trim(),
    token: document.querySelector("#token").value.trim(),
    displayName: document.querySelector("#displayName").value.trim(),
    color: document.querySelector("#color").value,
  };
  await chrome.storage.local.set(next);
  await chrome.runtime.sendMessage({ type: "reconnect" });
  document.querySelector("#message").textContent = "Saved. Reconnecting...";
  setTimeout(() => document.querySelector("#message").textContent = "", 2500);
});

load();
