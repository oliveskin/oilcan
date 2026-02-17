# Tinman Visualizer (Free)

Local-first visualizer for Tinman/OpenClaw security activity.

Maintained by [@cantshutup_](https://x.com/cantshutup_).

Includes two views over the same dataset:

- **Standard**: calm "experience space" summary (what happened, what needs attention)
- **Game**: a map-style situational awareness view (Fortnite-like layout, original art)

## Run Locally

Prerequisites: Node.js

1. Install:
   - `npm install`
2. Run:
   - `npm run dev`
3. Import data:
   - Click `Import JSON` and select a `tinman-openclaw-eval` JSON report (from `tinman-eval run -f json -o report.json`).

## Live Mode (Always-On “Watch”)

Oilcan can stream live events from a tiny local SSE bridge (`oilcan-bridge`) that tails:

- `~/.openclaw/workspace/tinman-events.jsonl`

Steps (3 terminals):

1. Start Tinman watch (OpenClaw skill):
   - `/tinman watch --mode realtime` (or `--mode polling` as fallback)
2. Start the bridge:
   - `npm run bridge`
3. Start Oilcan:
   - `npm run dev`

Oilcan will attempt LIVE mode on startup and will keep retrying if the bridge isn’t up yet.

### Bridge Security Defaults

`oilcan-bridge` is now secure-by-default:

- Binds to loopback only (`127.0.0.1`) unless LAN is explicitly enabled.
- If preferred port is busy, it auto-selects the next free port (by default up to `+20`).
- Requires a token when LAN mode is enabled.
- Uses restrictive CORS in LAN mode unless allowed origins are configured.

Environment options:

- `OILCAN_ALLOW_LAN=1` to allow LAN binding (`0.0.0.0`)
- `OILCAN_BRIDGE_HOST` override host (non-loopback requires `OILCAN_ALLOW_LAN=1`)
- `OILCAN_BRIDGE_PORT` override port (default `8123`)
- `OILCAN_BRIDGE_AUTOPORT=0` disable automatic fallback to next free port
- `OILCAN_BRIDGE_PORT_SCAN_LIMIT` max fallback range above preferred port (default `20`)
- `OILCAN_BRIDGE_TOKEN` set a fixed token (otherwise generated when auth is required)
- `OILCAN_ALLOWED_ORIGIN` comma-separated browser origins for CORS in LAN mode
- `OILCAN_REQUIRE_TOKEN=1` force token auth even on loopback

When token auth is required, bridge prints `bridge_token=...` on startup.
Bridge startup also prints a copy/paste `window.__OILCAN_CONFIG__` block with resolved host/port/token.
Configure Oilcan UI runtime token in `public/oilcan.config.js`:

```js
window.__OILCAN_CONFIG__ = {
  bridge: {
    host: "127.0.0.1",
    port: 8123,
    token: "paste-token-here",
  },
};
```

## View On Your Phone (Same Wi-Fi)

This repo binds the dev server to `0.0.0.0:3000` (LAN UI).
Bridge LAN access is separate and opt-in via `OILCAN_ALLOW_LAN=1`.

Open on your phone:

- `http://<your-computer-ip>:3000`

Security note: only use LAN mode on a trusted network.

## Optional: Doctor Tinman (Any LLM API, Including Local)

Diagnose supports:

- `Gemini` (`@google/genai`)
- `OpenAI-compatible` chat APIs (OpenAI, local proxies, Ollama/OpenAI shim, LM Studio, vLLM, etc.)
- `Disabled` (no LLM calls)

How to configure:

1. Open `Diagnose` in Oilcan.
2. Click `LLM Settings`.
3. Choose provider and set model/base URL/API key.
4. Save (settings persist in browser localStorage).

Optional bootstrap config (no rebuild required):

- Edit `public/oilcan.config.js`
- Set `window.__OILCAN_CONFIG__.llm` defaults

Local endpoint example:

- Provider: `openai-compatible`
- Base URL: `http://127.0.0.1:11434/v1`
- Model: your local model id
- API key: optional (depends on your local server)

Event details use built-in plain-language explanations by default.
If an LLM provider is configured, users can also click `AI Explain This Event` in the event modal for a richer natural-language explanation.
