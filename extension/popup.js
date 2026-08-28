async function load() {
  const data = await chrome.storage.local.get(["browserId", "displayName", "color", "connected", "connectionError"]);
  document.querySelector("#name").textContent = data.displayName || "Unnamed browser";
  document.querySelector("#id").textContent = data.browserId || "";
  document.querySelector("#dot").style.background = data.connected ? "#22c55e" : "#ef4444";
  document.querySelector("#status").textContent = data.connected ? "Connected and ready" : (data.connectionError || "Not connected");
}
document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());
load();
