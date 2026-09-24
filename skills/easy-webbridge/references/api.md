# Easy WebBridge API

## Runtime startup

The extension connects to the local Bridge; it does not start Node.js by itself. Start the Bridge on demand with `node cli/easy-webbridge.mjs start`, or configure an optional OS login item that runs `node src/server.mjs`. Keep the service bound to `127.0.0.1` and verify it with `node cli/easy-webbridge.mjs status`.

## Authentication

Send the token as:

```text
Authorization: Bearer <token>
```

Default endpoint: `http://127.0.0.1:17777`.

## Session policy

Page-opening workflows must default to one task-scoped session. On the first navigation, set `newTab: true`, `session`, and `groupTitle` to create one task group. On later sequential navigations, keep the same `session` and omit `newTab` so Easy WebBridge reuses the group's current tab. Set `newTab: true` again only when simultaneous pages are necessary, and keep those tabs under the same `groupTitle`. Call `close_session` in `finally`. Independent business Skills must namespace sessions by Skill and run so concurrent jobs cannot close each other's tabs.

## Browser discovery

```http
GET /v1/browsers
```

Returns browser identity, display name, color, platform, extension version, online status and timestamps.

## Commands

```http
POST /v1/browsers/{browserId}/commands
Content-Type: application/json

{
  "action": "snapshot",
  "args": { "tabId": 123 },
  "timeoutMs": 15000
}
```

`tabId` is optional for tab-scoped actions; the active tab in the last-focused window is used by default.

## Actions

### Tabs and navigation

- `list_tabs`: `{ "session": "research" }` (`session` is optional)
- `find_tab`: `{ "url": "https://example.com", "session": "research" }`
- `find_tab`: `{ "url": "https://example.com", "active": true, "session": "research" }` (borrow the user's active tab)
- `activate_tab`: `{ "tabId": 123 }`
- `close_tab`: `{ "tabId": 123 }`
- `close_session`: `{ "session": "research" }`
- `navigate`: `{ "url": "https://example.com", "newTab": true, "active": true, "session": "research", "groupTitle": "Research" }`
- `navigate`: `{ "url": "https://example.com/next", "session": "research" }` (reuse the session's current tab)

The bundled CLI automatically assigns a site-based group when `navigate --new-tab` omits `--session`. Business Skills should pass an explicit namespaced session instead of relying on that generic fallback.

### DOM

- `list_frames`: `{ "tabId": 123 }` (returns `frameId`, `parentFrameId`, and an HTTP(S) origin when identifiable; never returns frame URLs)
- `snapshot`: `{ "tabId": 123, "frameId": 7, "compact": true, "visibility": "visible", "scopeSelector": "[role=dialog]", "region": "viewport", "maxElements": 200, "offset": 0, "text": ["保存"], "roles": ["button"], "textMode": "none", "maxTextLength": 20000, "maxBytes": 500000 }` (`frameId` optional; response carries the selected frame ID, default `0`; `maxBytes` is a hard response budget)
- `click`: `{ "tabId": 123, "frameId": 7, "selector": "@e2", "mode": "dom" }` (`mode: "native"` uses paired CDP mouse events and is restricted to a hit-tested top-frame target)
- `fill`: `{ "tabId": 123, "frameId": 7, "selector": "@e3", "value": "text" }`
- `scroll`: `{ "tabId": 123, "frameId": 7, "x": 0, "y": 800 }`
- `wait_for`: `{ "tabId": 123, "frameId": 7, "selector": "[role=dialog]", "state": "visible", "timeoutMs": 10000 }` (exactly one of `selector`, `text`, or `url`; state is `attached`, `detached`, `visible`, or `hidden`; for `url`, attached/visible mean contains and detached/hidden mean not contains; bounded to 100-30000 ms)
- `capabilities`: `{}` (reports declared and browser-granted permissions plus implementation boundaries; never requests permissions)
- `evaluate`: `{ "tabId": 123, "world": "MAIN", "frameId": 7, "code": "document.title" }` (`frameId` is optional; omitted evaluates in the top frame)
- `batch`: `{ "tabId": 123, "actions": [{ "action": "click", "args": { "selector": "@e1" }, "assert": { "selector": "[role=dialog]", "state": "visible", "timeoutMs": 5000 } }] }` (1-20 deterministic `click`/`fill`/`scroll`/`wait_for` steps; failures identify the zero-based step; assertions are optional and bounded)
- `press_key`: `{ "tabId": 123, "key": "Enter" }`; `key_combo`: `{ "tabId": 123, "keys": ["CTRL", "A"] }` (common normal key events only; also allowed inside `batch`; this is not fingerprint masking or CAPTCHA bypass)
- `environment_info` (alias `browser_profile`): `{ "tabId": 123 }` returns read-only top-frame runtime fields (`userAgent`, `platform`, languages, timezone, hardwareConcurrency, optional deviceMemory, screen/dpr, webdriver) plus `mutated: false` and `source: "browser-runtime"`. It never returns page text, cookies, tokens, or accepts overrides.

`capabilities.features.browserProfile` reports the safe profile boundary: Easy WebBridge uses the explicitly selected browser/EasyBR profile and does not expose a profile-mutation API. Stable privacy or locale settings must be configured and audited in the browser/EasyBR profile itself. The Bridge never modifies `navigator.webdriver`, Canvas/WebGL/Audio, user agent, timezone, proxy/IP, or adds randomized human-like movement.

Frame IDs come from `list_frames` and are temporary browser identifiers for the current navigation state. Pair a snapshot's returned `frameId` with all later `click`/`fill` actions using its `@e` refs. Do not persist or reuse IDs after navigation; refresh the frame list. `chrome.scripting` can reject inaccessible cross-origin out-of-process frames; this is not universal OOPIF support.

Snapshot defaults to elements that are actually visible in the current viewport (rendered, on-screen and not fully covered) and returns at most 200 interactive elements. It traverses open Shadow DOM; closed roots remain inaccessible. `compact: true` retains page title and URL for redirect/login detection, omits query metadata and bounds, and defaults page text to `none`, reducing repeated output while leaving default responses unchanged. `textMode` can be set explicitly. Selector-based click/fill rejects ambiguous matches. These actions dispatch DOM events and are not trusted native input; CAPTCHA, security challenges and site restrictions are not bypassed. CDP file upload remains top-frame-only pending a robust frame-aware implementation.

### Browser and CDP

- `reload_extension`: `{}` (reloads this profile's extension and reconnects automatically)
- `extension_identity`: `{}` (returns the Easy WebBridge extension ID for trusted extension pairing)
- `extension_message`: `{ "extensionId": "<32-char-id>", "message": { ... } }` (sends JSON to an extension that explicitly allows Easy WebBridge)
- `screenshot`: `{ "tabId": 123, "format": "png", "selector": "@e2", "fullPage": false, "path": "/absolute/output.png" }`
- `save_as_pdf`: `{ "tabId": 123, "paper_format": "a4", "landscape": false, "scale": 1, "print_background": true, "path": "/absolute/output.pdf" }`
- `network`: `{ "tabId": 123, "cmd": "start" }`
- `network`: `{ "tabId": 123, "cmd": "list", "filter": "api", "limit": 200 }`
- `network`: `{ "tabId": 123, "cmd": "detail", "requestId": "123.45", "includeBody": true }`
- `network`: `{ "tabId": 123, "cmd": "stop" }`
- `cdp`: `{ "tabId": 123, "method": "Page.reload", "params": {} }`
- `upload`: `{ "tabId": 123, "selector": "input[type=file]", "files": ["/absolute/path/file.png"] }`

For any command, `args.resultBudget` can request `{ "maxBytes": 200000, "mode": "summary" }`. Over-budget object/array results become a metadata-only summary; no raw cookies, tokens, form values or response bodies are echoed by the budget fallback.
- `get_cookies`: `{ "filter": { "domain": "example.com" } }`
- `set_cookie`: `{ "cookie": { "url": "https://example.com", "name": "name", "value": "value" } }`
- `remove_cookie`: `{ "url": "https://example.com", "name": "name" }`
- `download`: `{ "url": "https://example.com/file.zip", "saveAs": false }`

Raw CDP enables network inspection, trusted input dispatch, DOM inspection, emulation and other Chrome DevTools Protocol domains supported by the browser version.

Current gaps are semantic locator/stale-ref detection, action diffs, structured traces, keyboard/select/form primitives, and per-domain permission policy. Cross-origin OOPIF discovery may succeed while script injection and iframe file upload remain unsupported; `capabilities` reports this boundary. The extension still declares broad `<all_urls>` and debugger access; `capabilities` only reports that current state. Easy WebBridge is not a complete Playwright or Browser Use replacement.
