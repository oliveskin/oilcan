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

type OpenClawEvalResult = {
  run_id?: string;
  started_at?: string;
  completed_at?: string | null;
  summary?: {
    total_attacks?: number;
    passed?: number;
    failed?: number;
    vulnerabilities?: number;
    errors?: number;
  };
  results?: Array<{
    attack_id: string;
    attack_name: string;
    category: string;
    severity: string;
    expected?: string;
    actual?: string;
    passed: boolean;
    is_vulnerability?: boolean;
    error?: string | null;
    latency_ms?: number;
  }>;
};

const CATEGORY_TO_SECTOR: Record<string, SectorId> = {
  prompt_injection: "REASONING",
  evasion_bypass: "REASONING",

  tool_exfil: "TOOLS",
  mcp_attack: "TOOLS",
  financial_transaction: "TOOLS",
  privilege_escalation: "TOOLS",

  context_bleed: "CONTEXT",
  indirect_injection: "CONTEXT",
  memory_poisoning: "CONTEXT",

  unauthorized_action: "FEEDBACK",

  supply_chain: "DEPLOYMENT",
  platform_specific: "DEPLOYMENT",
};

function coerceSeverity(s: string): FailureSeverity {
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

export function importOpenclawEvalJson(payload: unknown): VisualizerDataset {
  const data = payload as OpenClawEvalResult;
  const now = Date.now();

  const results = Array.isArray(data.results) ? data.results : [];
  const events: TinmanEvent[] = [];
  const markers: ThreatMarker[] = [];

  const severityCounts = { S0: 0, S1: 0, S2: 0, S3: 0, S4: 0 };

  const total = results.length || data.summary?.total_attacks || 0;
  const vulns = data.summary?.vulnerabilities ?? results.filter((r) => r.is_vulnerability).length;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const sev = coerceSeverity(String(r.severity || "S0"));
    severityCounts[sev] += 1;

    const sector = CATEGORY_TO_SECTOR[String(r.category)] ?? "REASONING";
    const id = r.attack_id || `attack-${i}`;

    const isVuln = Boolean(r.is_vulnerability);
    const type: TinmanEvent["type"] = isVuln ? "FAILURE" : r.passed ? "SYSTEM" : "FAILURE";

    events.push({
      id: `evt-${id}`,
      timestamp: new Date().toISOString().split("T")[1].slice(0, 8),
      type,
      message: `${sev} ${isVuln ? "VULN" : "FAIL"}: ${r.attack_name}`,
      sector,
      severity: sev,
      markerId: id,
      details: {
        attack_id: r.attack_id,
        attack_name: r.attack_name,
        category: r.category,
        severity: r.severity,
        expected: r.expected,
        actual: r.actual,
        passed: r.passed,
        is_vulnerability: Boolean(r.is_vulnerability),
        error: r.error ?? null,
        latency_ms: r.latency_ms ?? null,
      },
    });

    if (!r.passed || isVuln) {
      const { x, y } = hashToSectorXY(id, sector);

      markers.push({
        id,
        sector,
        severity: sev,
        x,
        y,
        label: id,
        timestamp: now - i * 250,
        active: severityRank(sev) >= 2,
      });
    }
  }

  return {
    markers,
    events: events.slice(-200),
    stats: {
      monitoredSystems: 1,
      activeFailures: vulns,
      runningExperiments: 0,
      activeInterventions: 0,
      fps: 60,
      latency: 0,
    },
    severityCounts,
    sourceLabel: data.run_id ? `openclaw-eval:${data.run_id}` : "openclaw-eval:import",
  };
}
