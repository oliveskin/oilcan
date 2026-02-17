import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { URL } from "node:url";

const DEFAULT_WORKSPACE = path.join(os.homedir(), ".openclaw", "workspace");
const DEFAULT_EVENTS_PATH = path.join(DEFAULT_WORKSPACE, "tinman-events.jsonl");

const ALLOW_LAN = process.env.OILCAN_ALLOW_LAN === "1";
const HOST = process.env.OILCAN_BRIDGE_HOST || (ALLOW_LAN ? "0.0.0.0" : "127.0.0.1");
const PREFERRED_PORT = Number(process.env.OILCAN_BRIDGE_PORT || 8123);
const AUTO_PORT = process.env.OILCAN_BRIDGE_AUTOPORT !== "0";
const PORT_SCAN_LIMIT = Math.max(0, Number(process.env.OILCAN_BRIDGE_PORT_SCAN_LIMIT || 20));
const EVENTS_PATH =
  process.env.OILCAN_EVENTS_PATH ||
  (process.env.OPENCLAW_WORKSPACE
    ? path.join(process.env.OPENCLAW_WORKSPACE, "tinman-events.jsonl")
    : DEFAULT_EVENTS_PATH);

const SNAPSHOT_LINES = Number(process.env.OILCAN_SNAPSHOT_LINES || 200);
const POLL_MS = Number(process.env.OILCAN_POLL_MS || 500);
const KEEPALIVE_MS = Number(process.env.OILCAN_KEEPALIVE_MS || 15000);

const USER_ALLOWED_ORIGINS = String(process.env.OILCAN_ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REQUIRE_TOKEN = process.env.OILCAN_REQUIRE_TOKEN === "1" || ALLOW_LAN;
const ENV_TOKEN = String(process.env.OILCAN_BRIDGE_TOKEN || "").trim();
const ACCESS_TOKEN = REQUIRE_TOKEN ? ENV_TOKEN || crypto.randomBytes(18).toString("hex") : ENV_TOKEN;
let ACTIVE_PORT = Number.isFinite(PREFERRED_PORT) ? PREFERRED_PORT : 8123;

function isLoopbackHost(host) {
  const h = String(host || "").trim().toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}

if (!ALLOW_LAN && !isLoopbackHost(HOST)) {
  // eslint-disable-next-line no-console
  console.error(
    "Refusing non-loopback host without OILCAN_ALLOW_LAN=1. Set OILCAN_ALLOW_LAN=1 to expose bridge on LAN."
  );
  process.exit(1);
}

function parseOriginHostname(origin) {
  try {
    const u = new URL(origin);
    return String(u.hostname || "").toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackOrigin(origin) {
  const host = parseOriginHostname(origin);
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (USER_ALLOWED_ORIGINS.length > 0) return USER_ALLOWED_ORIGINS.includes(origin);
  if (ALLOW_LAN) return false;
  return isLoopbackOrigin(origin);
}

function setCors(req, res) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  if (origin && !isOriginAllowed(origin)) return false;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Oilcan-Token");
  return true;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sseHeaders(res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Disable proxy buffering if present.
  res.setHeader("X-Accel-Buffering", "no");
}

function sseData(res, data, eventName) {
  if (eventName) res.write(`event: ${eventName}\n`);
  res.write(`data: ${data}\n\n`);
}

function readSnapshotLines(filePath, maxLines) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return [];

    // Fast path: small file.
    const MAX_READ = 5 * 1024 * 1024;
    if (stat.size <= MAX_READ) {
      const text = fs.readFileSync(filePath, "utf8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      return lines.slice(-maxLines);
    }

    // Large file: read last 1MB.
    const tailBytes = 1024 * 1024;
    const start = Math.max(0, stat.size - tailBytes);
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(stat.size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const text = buf.toString("utf8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      return lines.slice(-maxLines);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

function getRequestToken(req, u) {
  const queryToken = String(u.searchParams.get("token") || "").trim();
  if (queryToken) return queryToken;

  const headerToken =
    typeof req.headers["x-oilcan-token"] === "string" ? req.headers["x-oilcan-token"].trim() : "";
  if (headerToken) return headerToken;

  const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

function isAuthorized(req, u) {
  if (!REQUIRE_TOKEN) return true;
  const token = getRequestToken(req, u);
  return token.length > 0 && token === ACCESS_TOKEN;
}

function startEventStream(res, filePath) {
  sseHeaders(res);

  const snapshot = readSnapshotLines(filePath, SNAPSHOT_LINES);
  sseData(
    res,
    JSON.stringify({
      v: 1,
      kind: "hello",
      ts: new Date().toISOString(),
      meta: {
        events_path: filePath,
        snapshot_lines: snapshot.length,
      },
    }),
    "hello"
  );
  for (const line of snapshot) sseData(res, line);

  let offset = 0;
  let carry = "";

  const stat0 = (() => {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  })();
  if (stat0?.isFile()) offset = stat0.size;

  const poll = setInterval(() => {
    fs.stat(filePath, (err, st) => {
      if (err || !st?.isFile()) return;
      if (st.size < offset) {
        // Rotated/truncated.
        offset = 0;
        carry = "";
      }
      if (st.size === offset) return;

      const stream = fs.createReadStream(filePath, {
        start: offset,
        end: st.size - 1,
        encoding: "utf8",
      });
      let chunk = "";
      stream.on("data", (d) => {
        chunk += d;
      });
      stream.on("end", () => {
        offset = st.size;
        const text = carry + chunk;
        const lines = text.split(/\r?\n/);
        carry = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          sseData(res, trimmed);
        }
      });
    });
  }, POLL_MS);

  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, KEEPALIVE_MS);

  res.on("close", () => {
    clearInterval(poll);
    clearInterval(keepalive);
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) return sendJson(res, 400, { error: "missing url" });
  const u = new URL(req.url, "http://127.0.0.1");

  if (!setCors(req, res)) {
    return sendJson(res, 403, { error: "origin not allowed" });
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (u.pathname === "/health") {
    const canSeeDetails = isAuthorized(req, u);
    return sendJson(res, 200, {
      ok: true,
      now: new Date().toISOString(),
      auth_required: REQUIRE_TOKEN,
      lan_mode: ALLOW_LAN,
      host: HOST,
      port: ACTIVE_PORT,
      events_path: canSeeDetails ? EVENTS_PATH : undefined,
    });
  }

  if (!isAuthorized(req, u)) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="oilcan-bridge"');
    return sendJson(res, 401, { error: "unauthorized" });
  }

  if (u.pathname === "/snapshot") {
    const n = Math.max(1, Math.min(2000, Number(u.searchParams.get("n") || SNAPSHOT_LINES)));
    return sendJson(res, 200, { lines: readSnapshotLines(EVENTS_PATH, n) });
  }

  if (u.pathname === "/events") {
    return startEventStream(res, EVENTS_PATH);
  }

  return sendJson(res, 404, { error: "not found" });
});

function printStartupBanner() {
  const displayHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  // eslint-disable-next-line no-console
  console.log(`oilcan-bridge listening on http://${HOST}:${ACTIVE_PORT}`);
  // eslint-disable-next-line no-console
  console.log(`streaming: ${EVENTS_PATH}`);
  // eslint-disable-next-line no-console
  console.log(`lan_mode=${ALLOW_LAN ? "on" : "off"} auth_required=${REQUIRE_TOKEN ? "yes" : "no"}`);
  if (REQUIRE_TOKEN) {
    // eslint-disable-next-line no-console
    console.log(`bridge_token=${ACCESS_TOKEN}`);
  }
  if (ALLOW_LAN && USER_ALLOWED_ORIGINS.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      "warning: OILCAN_ALLOW_LAN=1 with no OILCAN_ALLOWED_ORIGIN set. Browser clients may be blocked by CORS."
    );
  }

  // eslint-disable-next-line no-console
  console.log("oilcan UI runtime config:");
  // eslint-disable-next-line no-console
  console.log("window.__OILCAN_CONFIG__ = {");
  // eslint-disable-next-line no-console
  console.log("  bridge: {");
  // eslint-disable-next-line no-console
  console.log(`    host: "${displayHost}",`);
  // eslint-disable-next-line no-console
  console.log(`    port: ${ACTIVE_PORT},`);
  // eslint-disable-next-line no-console
  console.log(`    token: "${ACCESS_TOKEN || ""}",`);
  // eslint-disable-next-line no-console
  console.log("  },");
  // eslint-disable-next-line no-console
  console.log("};");
}

server.on("listening", () => {
  const addr = server.address();
  if (addr && typeof addr === "object" && typeof addr.port === "number") {
    ACTIVE_PORT = addr.port;
  }
  printStartupBanner();
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE" && AUTO_PORT) {
    const maxPort = PREFERRED_PORT + PORT_SCAN_LIMIT;
    if (ACTIVE_PORT < maxPort) {
      const nextPort = ACTIVE_PORT + 1;
      // eslint-disable-next-line no-console
      console.log(`port ${ACTIVE_PORT} is busy, retrying on ${nextPort}...`);
      ACTIVE_PORT = nextPort;
      setTimeout(() => {
        server.listen(ACTIVE_PORT, HOST);
      }, 25);
      return;
    }
  }
  // eslint-disable-next-line no-console
  console.error(
    `Failed to start oilcan-bridge on ${HOST}:${ACTIVE_PORT} (${err?.code || "unknown error"}).`
  );
  process.exit(1);
});

server.listen(ACTIVE_PORT, HOST);
