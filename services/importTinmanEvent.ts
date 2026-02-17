import {
  FailureSeverity,
  SectorId,
  ThreatMarker,
  TinmanEvent,
  VisualizerDataset,
} from "../types";

type SectorZone = { left: number; top: number; width: number; height: number };

const SECTOR_ZONES: Record<SectorId, SectorZone> = {
  REASONING: { left: 6, top: 8, width: 28, height: 22 },
  TOOLS: { left: 62, top: 8, width: 30, height: 24 },
  CONTEXT: { left: 18, top: 43, width: 30, height: 22 },
  FEEDBACK: { left: 55, top: 43, width: 30, height: 22 },
  DEPLOYMENT: { left: 33, top: 71, width: 34, height: 22 },
};

export type TinmanEventRecord = {
  v?: number;
  id?: string;
  ts?: string;
  kind?: string;
  severity?: string;
  category?: string;
  title?: string;
  message?: string;
  meta?: unknown;
};

function coerceSeverity(s?: string): FailureSeverity {
  switch (s) {
    case "S4":
      return FailureSeverity.S4;
    case "S3":
      return FailureSeverity.S3;
    case "S2":
      return FailureSeverity.S2;
    case "S1":
      return FailureSeverity.S1;
    default:
      return FailureSeverity.S0;
  }
}

function severityRank(sev: FailureSeverity): number {
  switch (sev) {
    case FailureSeverity.S4:
      return 4;
    case FailureSeverity.S3:
      return 3;
    case FailureSeverity.S2:
      return 2;
    case FailureSeverity.S1:
      return 1;
    default:
      return 0;
  }
}

function categoryToSector(cat?: string): SectorId {
  switch (String(cat || "").toLowerCase()) {
    case "tool_use":
    case "tool_exfil":
    case "privilege_escalation":
    case "financial_transaction":
    case "mcp_attack":
    case "mcp_attacks":
      return "TOOLS";
    case "long_context":
    case "context_bleed":
    case "indirect_injection":
    case "memory_poisoning":
      return "CONTEXT";
    case "feedback_loop":
    case "unauthorized_action":
      return "FEEDBACK";
    case "deployment":
    case "supply_chain":
    case "platform_specific":
      return "DEPLOYMENT";
    case "reasoning":
    case "prompt_injection":
    case "evasion_bypass":
    default:
      return "REASONING";
  }
}

function hashU32(key: string): number {
  let h = 2166136261 >>> 0;
  for (let j = 0; j < key.length; j++) {
    h ^= key.charCodeAt(j);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hashToSectorXY(key: string, sector: SectorId): { x: number; y: number } {
  const zone = SECTOR_ZONES[sector];
  const padX = Math.min(2.6, zone.width * 0.12);
  const padY = Math.min(2.0, zone.height * 0.12);
  const spanX = Math.max(1, zone.width - padX * 2);
  const spanY = Math.max(1, zone.height - padY * 2);

  const hx = hashU32(key) / 4294967295;
  const hy = hashU32(`${key}|y`) / 4294967295;

  return {
    x: Number((zone.left + padX + hx * spanX).toFixed(2)),
    y: Number((zone.top + padY + hy * spanY).toFixed(2)),
  };
}

function hhmmss(ts?: string): string {
  if (!ts) return new Date().toISOString().split("T")[1].slice(0, 8);
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[1].slice(0, 8);
  return d.toISOString().split("T")[1].slice(0, 8);
}

function isFailureKind(kind?: string): boolean {
  switch (String(kind || "").toLowerCase()) {
    case "finding":
    case "watch_finding":
    case "sweep_result":
      return true;
    default:
      return false;
  }
}

export function applyTinmanEventRecord(
  prev: VisualizerDataset,
  rec: TinmanEventRecord
): VisualizerDataset {
  const kind = String(rec.kind || "event");
  const id = String(rec.id || `${kind}:${Date.now()}:${Math.random().toString(16).slice(2)}`);
  const sector = categoryToSector(rec.category);
  const sev = coerceSeverity(rec.severity);

  const type: TinmanEvent["type"] = isFailureKind(kind) ? "FAILURE" : "SYSTEM";
  const msg =
    (rec.message && String(rec.message)) ||
    (rec.title ? `${kind}: ${rec.title}` : kind);

  const markerKey = String(
    // Prefer stable keys for deterministic placement.
    (rec.meta as any)?.attack_id ||
      (rec.meta as any)?.finding_id ||
      (rec.meta as any)?.session_id ||
      rec.title ||
      rec.category ||
      id
  );

  const event: TinmanEvent = {
    id,
    timestamp: hhmmss(rec.ts),
    type,
    message: `${rec.severity ? `${rec.severity} ` : ""}${msg}`,
    sector,
    severity: sev,
    markerId: isFailureKind(kind) ? markerKey : undefined,
    details: {
      kind,
      title: rec.title ?? null,
      category: rec.category ?? null,
      severity: rec.severity ?? null,
      message: rec.message ?? null,
      meta: (rec.meta as unknown) ?? null,
    },
  };

  // Avoid duplicates on reconnect/replay.
  if (prev.events.some((e) => e.id === event.id)) return prev;

  const nextEvents = [...prev.events, event].slice(-250);
  const nextSeverityCounts = { ...prev.severityCounts };
  if (isFailureKind(kind)) nextSeverityCounts[sev as keyof typeof nextSeverityCounts] += 1;

  let nextMarkers = prev.markers;
  if (isFailureKind(kind) && severityRank(sev) >= 1) {
    const { x, y } = hashToSectorXY(markerKey, sector);
    const marker: ThreatMarker = {
      id: markerKey,
      sector,
      severity: sev,
      x,
      y,
      label: markerKey.slice(0, 18),
      timestamp: Date.now(),
      active: severityRank(sev) >= 2,
    };

    // Replace existing marker with same id to "refresh" it.
    const idx = prev.markers.findIndex((m) => m.id === marker.id);
    if (idx >= 0) {
      nextMarkers = [...prev.markers];
      nextMarkers[idx] = marker;
    } else {
      nextMarkers = [...prev.markers, marker].slice(-300);
    }
  }

  const activeFailures = nextMarkers.filter((m) => m.active).length;

  return {
    ...prev,
    sourceLabel: prev.sourceLabel.startsWith("live:") ? prev.sourceLabel : "live:oilcan-bridge",
    markers: nextMarkers,
    events: nextEvents,
    severityCounts: nextSeverityCounts,
    stats: {
      ...prev.stats,
      activeFailures,
      latency: 0,
    },
  };
}
