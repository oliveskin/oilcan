import React from "react";
import { FailureSeverity, TinmanEvent, VisualizerDataset } from "../types";

function SevPill(props: { sev: FailureSeverity; count: number }): React.ReactElement {
  const { sev, count } = props;
  const cls =
    sev === FailureSeverity.S4
      ? "bg-red-500/15 border-red-500/40 text-red-200"
      : sev === FailureSeverity.S3
        ? "bg-orange-500/15 border-orange-500/40 text-orange-200"
        : sev === FailureSeverity.S2
          ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-100"
          : sev === FailureSeverity.S1
            ? "bg-sky-500/10 border-sky-500/30 text-sky-100"
            : "bg-white/5 border-white/10 text-white/70";

  return (
    <div className={`rounded-sm border px-3 py-2 flex items-center justify-between gap-3 ${cls}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold">{sev}</div>
      <div className="text-lg font-mono font-bold">{count}</div>
    </div>
  );
}

export default function StandardDashboard(props: {
  dataset: VisualizerDataset;
  onSelectEvent?: (event: TinmanEvent) => void;
}): React.ReactElement {
  const { dataset, onSelectEvent } = props;
  const counts = dataset.severityCounts;

  const rows = dataset.events
    .slice()
    .reverse()
    .slice(0, 40);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <SevPill sev={FailureSeverity.S4} count={counts.S4} />
        <SevPill sev={FailureSeverity.S3} count={counts.S3} />
        <SevPill sev={FailureSeverity.S2} count={counts.S2} />
        <SevPill sev={FailureSeverity.S1} count={counts.S1} />
        <SevPill sev={FailureSeverity.S0} count={counts.S0} />
      </div>

      <div className="glass-panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
              Experience Space
            </div>
            <div className="text-sm text-white/90">
              What happened, what was blocked, what needs your attention.
            </div>
          </div>
          <div className="text-[11px] font-mono text-white/60">
            Active failures: <span className="text-white">{dataset.stats.activeFailures}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-sm border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
              Shield
            </div>
            <div className="text-lg font-bold text-emerald-300">Monitor</div>
            <div className="text-[11px] text-white/60">
              Free mode shows findings; Pro enforces before/after.
            </div>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
              Next action
            </div>
            <div className="text-sm font-bold text-white">Review S3/S4 events</div>
            <div className="text-[11px] text-white/60">
              Import recent eval JSON to see latest sweep results.
            </div>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
              Export
            </div>
            <div className="text-sm font-bold text-white">Share a report</div>
            <div className="text-[11px] text-white/60">
              In Pro/Enterprise: receipts, retention, webhooks.
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 mb-3">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
            Activity
          </div>
          <div className="text-[11px] font-mono text-white/60">
            Showing last {rows.length} events
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {rows.map((e) => (
            <button
              key={e.id}
              type="button"
              className="w-full text-left py-2 flex items-start justify-between gap-4 hover:bg-white/5 rounded-sm transition-colors"
              onClick={() => onSelectEvent?.(e)}
            >
              <div className="min-w-0">
                <div className="text-xs font-mono text-white truncate">{e.message}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
                  {e.sector ?? "SYSTEM"}
                </div>
              </div>
              <div className="shrink-0 text-[11px] font-mono text-white/40">{e.timestamp}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
