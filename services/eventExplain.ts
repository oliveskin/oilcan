import { FailureSeverity, TinmanEvent } from "../types";

export type EventExplanation = {
  headline: string;
  meaning: string;
  impact: string;
  nextSteps: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function normalizeSeverity(value: unknown, fallback?: FailureSeverity): FailureSeverity | undefined {
  const sev = asString(value);
  if (sev === FailureSeverity.S4) return FailureSeverity.S4;
  if (sev === FailureSeverity.S3) return FailureSeverity.S3;
  if (sev === FailureSeverity.S2) return FailureSeverity.S2;
  if (sev === FailureSeverity.S1) return FailureSeverity.S1;
  if (sev === FailureSeverity.S0) return FailureSeverity.S0;
  return fallback;
}

function severityMeaning(sev?: FailureSeverity): string {
  if (sev === "S4") return "Critical risk. Immediate action is recommended.";
  if (sev === "S3") return "High risk. Review and mitigate soon.";
  if (sev === "S2") return "Moderate risk. Investigate before shipping changes.";
  if (sev === "S1") return "Low risk. Keep an eye on this behavior.";
  return "Informational signal for visibility.";
}

function normalizeCategory(value?: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

const CATEGORY_MEANING: Record<string, string> = {
  prompt_injection: "The model was pushed to ignore safety rules.",
  tool_exfil: "A tool was used (or requested) in a way that could leak data.",
  tool_use: "A tool call looked risky or out of policy.",
  context_bleed: "Data may be leaking across sessions or from stale context.",
  long_context: "Long-context handling may be exposing unrelated data.",
  privilege_escalation: "The model attempted actions beyond intended permissions.",
  supply_chain: "A dependency or skill source may be untrusted or manipulated.",
  channel_confusion: "The model may be mixing trust between channels/users.",
  rate_abuse: "The model may be making excessive or abusive calls.",
  financial_transaction: "A payment, transfer, or wallet action was requested unsafely.",
  financial: "A payment, transfer, or wallet action was requested unsafely.",
  unauthorized_action: "The model tried to act without clear user approval.",
  mcp_attack: "An MCP server/tool interaction looked unsafe.",
  mcp_attacks: "An MCP server/tool interaction looked unsafe.",
  indirect_injection: "Unsafe instructions may have come from files, pages, or external content.",
  evasion_bypass: "An attempt was made to hide risky intent using obfuscation.",
  memory_poisoning: "The model may have been manipulated to store unsafe long-term instructions.",
  platform_specific: "The behavior targets OS/cloud-specific attack paths.",
  reasoning: "The model's decision logic showed a risky pattern.",
  feedback_loop: "The model may be looping or amplifying harmful behavior.",
  deployment: "The issue may be tied to deployment/runtime configuration.",
  gateway: "Gateway connectivity or event-stream behavior needs attention.",
  clean: "No immediate risky behavior was detected in this check.",
  allowlisted: "Behavior matched an allowlist rule and was treated as trusted.",
  unknown: "A security-relevant behavior was detected.",
};

const CATEGORY_ACTIONS: Record<string, string[]> = {
  prompt_injection: [
    "Treat all user/content instructions as untrusted unless explicitly approved.",
    "Add a rule to never override system/safety instructions.",
  ],
  tool_exfil: [
    "Block access to secret paths, tokens, and credential files in tool policy.",
    "Require user approval for file read/export/network-send operations.",
  ],
  tool_use: [
    "Tighten tool allow/deny policy for sensitive commands and paths.",
    "Require user confirmation before high-impact tool calls.",
  ],
  context_bleed: [
    "Increase session isolation and reduce cross-session context reuse.",
    "Audit memory/context retrieval rules for tenant/user boundaries.",
  ],
  long_context: [
    "Trim older context more aggressively for sensitive workflows.",
    "Separate trusted instructions from user-provided content.",
  ],
  privilege_escalation: [
    "Enforce least privilege for tools and filesystem/network access.",
    "Block privilege-changing patterns and require explicit approvals.",
  ],
  supply_chain: [
    "Pin trusted dependencies/skills and verify signatures or checksums.",
    "Review recent updates before enabling in production flows.",
  ],
  channel_confusion: [
    "Bind permissions to channel/user identity and re-check on each action.",
    "Prevent cross-channel memory/action carryover without approval.",
  ],
  rate_abuse: [
    "Add tighter rate limits and backoff for repeated requests.",
    "Alert on spikes and temporarily throttle risky workflows.",
  ],
  financial_transaction: [
    "Require explicit confirmation for all transfers/approvals/purchases.",
    "Use recipient/contract allowlists and block everything else.",
  ],
  financial: [
    "Require explicit confirmation for all transfers/approvals/purchases.",
    "Use recipient/contract allowlists and block everything else.",
  ],
  unauthorized_action: [
    "Require clear user consent before irreversible or external actions.",
    "Add policy checks that block silent execution paths.",
  ],
  mcp_attack: [
    "Allow only trusted MCP servers and disable dynamic server registration.",
    "Limit sensitive MCP tools to explicit, user-approved calls.",
  ],
  mcp_attacks: [
    "Allow only trusted MCP servers and disable dynamic server registration.",
    "Limit sensitive MCP tools to explicit, user-approved calls.",
  ],
  indirect_injection: [
    "Treat file/web/document content as untrusted instructions.",
    "Strip or sandbox external content before execution decisions.",
  ],
  evasion_bypass: [
    "Normalize/decode inputs before policy checks.",
    "Block known obfuscation patterns and encoded payload tricks.",
  ],
  memory_poisoning: [
    "Do not persist untrusted instructions without review.",
    "Clear or quarantine suspicious memory entries.",
  ],
  platform_specific: [
    "Apply OS/cloud-specific deny rules for sensitive primitives.",
    "Review platform hardening controls before rollout.",
  ],
  reasoning: [
    "Review prompt and policy guidance for decision boundaries.",
    "Add guardrails around ambiguous high-risk requests.",
  ],
  feedback_loop: [
    "Add loop detection/circuit breakers for repetitive agent behavior.",
    "Require user confirmation before repeated high-impact attempts.",
  ],
  deployment: [
    "Review runtime config, model routing, and environment safeguards.",
    "Verify production policy files match expected baseline.",
  ],
  gateway: [
    "Check Gateway URL/connectivity and event subscription health.",
    "Fallback to polling mode if realtime stream is unstable.",
  ],
  clean: [
    "No action needed right now; continue monitoring.",
    "Keep periodic scans/sweeps enabled.",
  ],
  allowlisted: [
    "Confirm this allowlist rule is still justified and scoped.",
    "Review allowlist entries regularly to avoid over-permissive trust.",
  ],
};

const KIND_MEANING: Record<string, string> = {
  scan_start: "A security scan has started.",
  scan_sessions: "Sessions were discovered and queued for analysis.",
  scan_empty: "No sessions were found for the scan window.",
  scan_end: "A scan completed and produced findings summary.",
  finding: "A scan finding was emitted from session analysis.",
  sweep_start: "A synthetic attack sweep has started.",
  sweep_end: "A synthetic attack sweep has completed.",
  sweep_result: "A sweep attack result indicates a blocked or vulnerable behavior.",
  watch_start: "Continuous monitoring started.",
  watch_stop_request: "A request was sent to stop monitoring.",
  watch_stop: "Continuous monitoring stopped.",
  watch_finding: "Realtime monitoring detected a new finding.",
  watch_stats: "Monitoring session metrics were reported.",
  hello: "Live stream connected and replay state initialized.",
  event: "A generic event update was received.",
};

const KIND_ACTIONS: Record<string, string[]> = {
  scan_empty: [
    "Verify session export path and time window settings.",
    "Run another scan after generating recent activity.",
  ],
  scan_end: [
    "Review S3/S4 findings first.",
    "Apply mitigations and run a follow-up scan.",
  ],
  finding: [
    "Open this finding and review evidence/context.",
    "Apply policy/tool changes, then re-test.",
  ],
  sweep_end: [
    "Prioritize vulnerabilities and not-blocked cases.",
    "Re-run sweep after mitigation changes.",
  ],
  sweep_result: [
    "Inspect expected vs actual behavior for this attack.",
    "Harden controls and verify with another sweep run.",
  ],
  watch_start: [
    "Keep the monitor running for continuous visibility.",
    "Confirm Gateway connection is healthy.",
  ],
  watch_stop: [
    "Restart watch mode when continuous monitoring is needed.",
    "Review any gaps in monitoring coverage.",
  ],
  watch_finding: [
    "Review the finding details and severity immediately.",
    "Escalate or mitigate based on risk level.",
  ],
  watch_stats: [
    "Use these stats to validate monitor health and coverage.",
    "Investigate low event volume or reconnect churn.",
  ],
};

function kindKey(value?: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function categoryMeaning(category?: string): string {
  const c = normalizeCategory(category);
  return CATEGORY_MEANING[c] || CATEGORY_MEANING.unknown;
}

function kindMeaning(kind?: string): string | undefined {
  const k = kindKey(kind);
  return KIND_MEANING[k];
}

function categoryActions(category?: string): string[] {
  const c = normalizeCategory(category);
  return (
    CATEGORY_ACTIONS[c] || [
      "Review the triggering conversation/tool call and confirm expected behavior.",
      "Re-run scan/sweep after policy updates to verify the issue is mitigated.",
    ]
  );
}

function kindActions(kind?: string): string[] | undefined {
  const k = kindKey(kind);
  return KIND_ACTIONS[k];
}

export function explainEvent(event: TinmanEvent): EventExplanation {
  const details = asRecord(event.details);
  const category = asString(details?.category);
  const kind = asString(details?.kind);
  const title = asString(details?.attack_name) || asString(details?.title);
  const isVulnerability = asBool(details?.is_vulnerability) === true;
  const passed = asBool(details?.passed);
  const severity = normalizeSeverity(details?.severity, event.severity);

  const statusText = isVulnerability
    ? "This test found a real vulnerability."
    : passed === false
      ? "This behavior was not blocked during evaluation."
      : event.type === "FAILURE"
        ? "A failure signal was detected."
        : "A system signal was recorded.";

  const subject = title || event.sector || "this event";
  const headline = `${subject}: ${statusText}`;

  const meaningParts = [categoryMeaning(category)];
  const kMeaning = kindMeaning(kind);
  if (kMeaning) meaningParts.push(kMeaning);
  meaningParts.push(severityMeaning(severity));
  if (kind) meaningParts.push(`Signal type: ${kind.replace(/_/g, " ")}.`);

  const impact = isVulnerability
    ? "Unsafe behavior may succeed in real user sessions if not mitigated."
    : passed === false
      ? "The current defenses may be incomplete for this scenario."
      : "This is a warning signal that helps prevent future incidents.";

  const nextSteps = categoryActions(category);
  const kindStepList = kindActions(kind);
  const mergedSteps = kindStepList ? [...kindStepList, ...nextSteps] : nextSteps;
  const dedupedSteps = Array.from(new Set(mergedSteps));

  return {
    headline,
    meaning: meaningParts.join(" "),
    impact,
    nextSteps: dedupedSteps,
  };
}
