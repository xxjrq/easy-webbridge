# Security

Easy WebBridge intentionally provides broad browser control. Treat the bridge token like a local administrator credential.

- Do not expose port `17777` to a LAN or the public internet.
- Do not commit `~/.easy-webbridge/bridge-token`.
- Install the extension only in browser profiles intended for agent control.
- Network inspection can expose authorization headers, request bodies and private response data. Do not print or persist those values unless the user explicitly needs them.
- Easy WebBridge uses an existing browser profile and therefore inherits that profile's logged-in access. Prefer a dedicated EasyBR environment for sensitive automation.
- Rotate the token after accidental disclosure by stopping the bridge, deleting only the token file, and starting the bridge again.
- Review commands before using the bridge for purchases, publishing, account changes or other consequential actions.

Report security issues privately to the repository maintainer rather than opening a public issue with exploit details.
