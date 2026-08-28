# Easy WebBridge API

## Authentication

Send the token as:

```text
Authorization: Bearer <token>
```

Default endpoint: `http://127.0.0.1:17777`.

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

- `list_tabs`: `{}`
- `activate_tab`: `{ "tabId": 123 }`
- `close_tab`: `{ "tabId": 123 }`
- `navigate`: `{ "url": "https://example.com", "newTab": true, "active": true }`

### DOM

- `snapshot`: `{ "tabId": 123, "maxTextLength": 100000 }`
- `click`: `{ "tabId": 123, "selector": "@e2" }`
- `fill`: `{ "tabId": 123, "selector": "@e3", "value": "text" }`
- `scroll`: `{ "tabId": 123, "x": 0, "y": 800 }`
- `evaluate`: `{ "tabId": 123, "world": "MAIN", "code": "document.title" }`

### Browser and CDP

- `reload_extension`: `{}` (reloads this profile's extension and reconnects automatically)
- `screenshot`: `{ "tabId": 123, "format": "png" }`
- `cdp`: `{ "tabId": 123, "method": "Page.reload", "params": {} }`
- `upload`: `{ "tabId": 123, "selector": "input[type=file]", "files": ["/absolute/path/file.png"] }`
- `get_cookies`: `{ "filter": { "domain": "example.com" } }`
- `set_cookie`: `{ "cookie": { "url": "https://example.com", "name": "name", "value": "value" } }`
- `remove_cookie`: `{ "url": "https://example.com", "name": "name" }`
- `download`: `{ "url": "https://example.com/file.zip", "saveAs": false }`

Raw CDP enables network inspection, trusted input dispatch, DOM inspection, emulation and other Chrome DevTools Protocol domains supported by the browser version.
