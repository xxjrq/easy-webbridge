# Easy WebBridge API

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

- `snapshot`: `{ "tabId": 123, "maxTextLength": 100000 }`
- `click`: `{ "tabId": 123, "selector": "@e2" }`
- `fill`: `{ "tabId": 123, "selector": "@e3", "value": "text" }`
- `scroll`: `{ "tabId": 123, "x": 0, "y": 800 }`
- `evaluate`: `{ "tabId": 123, "world": "MAIN", "code": "document.title" }`

### Browser and CDP

- `reload_extension`: `{}` (reloads this profile's extension and reconnects automatically)
- `screenshot`: `{ "tabId": 123, "format": "png", "selector": "@e2", "fullPage": false, "path": "/absolute/output.png" }`
- `save_as_pdf`: `{ "tabId": 123, "paper_format": "a4", "landscape": false, "scale": 1, "print_background": true, "path": "/absolute/output.pdf" }`
- `network`: `{ "tabId": 123, "cmd": "start" }`
- `network`: `{ "tabId": 123, "cmd": "list", "filter": "api", "limit": 200 }`
- `network`: `{ "tabId": 123, "cmd": "detail", "requestId": "123.45", "includeBody": true }`
- `network`: `{ "tabId": 123, "cmd": "stop" }`
- `cdp`: `{ "tabId": 123, "method": "Page.reload", "params": {} }`
- `upload`: `{ "tabId": 123, "selector": "input[type=file]", "files": ["/absolute/path/file.png"] }`
- `get_cookies`: `{ "filter": { "domain": "example.com" } }`
- `set_cookie`: `{ "cookie": { "url": "https://example.com", "name": "name", "value": "value" } }`
- `remove_cookie`: `{ "url": "https://example.com", "name": "name" }`
- `download`: `{ "url": "https://example.com/file.zip", "saveAs": false }`

Raw CDP enables network inspection, trusted input dispatch, DOM inspection, emulation and other Chrome DevTools Protocol domains supported by the browser version.
