import React, { useState } from "react";
import { VisualizerDataset, FailureSeverity, TinmanEvent } from "../types";

function rowTone(sev?: FailureSeverity): string {
  if (sev === FailureSeverity.S4) return "bg-red-500/10 border-red-500/40";
  if (sev === FailureSeverity.S3) return "bg-orange-500/10 border-orange-500/40";
  if (sev === FailureSeverity.S2) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-white/5 border-white/10";
}

export default function ChallengesPanel(props: {
  dataset: VisualizerDataset;
  onSelectEvent?: (event: TinmanEvent) => void;
}): React.ReactElement {
  const { dataset, onSelectEvent } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const failures = dataset.events.filter((e) => e.type === "FAILURE").slice(-10).reverse();

  return (
    <>
      {/* Desktop panel */}
      <div className="hidden md:block h-full w-[340px] shrink-0">
        <div className="h-full bg-black/35 backdrop-blur-xl border-r border-white/10 flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-white/10">
            <div className="text-[10px] uppercase tracking-[0.28em] text-sky-200/80 font-bold">
              Challenges
            </div>
            <div className="text-[11px] text-white/60 mt-1">
              Threat objectives and active anomalies.
            </div>
          </div>

          <div className="px-5 py-4 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-bold mb-2">
              Daily
            </div>
            <div className="rounded-sm border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between">
              <div className="text-xs text-white/80">Run a sweep</div>
              <div className="text-[11px] font-mono text-white/60">0 / 1</div>
            </div>

            <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-bold mt-5 mb-2">
              Suggested
            </div>

            <div className="space-y-2">
              {failures.length === 0 && (
                <div className="text-xs text-white/40 italic">No anomalies imported yet.</div>
              )}

              {failures.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`w-full text-left rounded-sm border px-3 py-2 hover:bg-white/5 transition-colors ${rowTone(f.severity)}`}
                  onClick={() => onSelectEvent?.(f)}
                >
                  <div className="text-[11px] text-white/80 font-bold truncate">
                    {f.sector ?? "SYSTEM"}: {f.message}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest text-white/40">
                      Stage 1 of 5
                    </div>
                    <div className="text-[11px] font-mono text-white/60">0 / 1</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="h-12" />
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <button
        className="fixed left-4 bottom-6 z-50 md:hidden px-3 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur text-xs font-bold tracking-widest uppercase text-white/80"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? "Close" : "Challenges"}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[86vw] max-w-[360px] bg-black/55 backdrop-blur-xl border-r border-white/10">
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-[0.28em] text-sky-200/80 font-bold">
                Challenges
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                Threat objectives and active anomalies.
              </div>
            </div>
            <div className="px-5 py-4 overflow-y-auto h-full">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-bold mb-2">
                Suggested
              </div>
              <div className="space-y-2">
                {failures.length === 0 && (
                  <div className="text-xs text-white/40 italic">No anomalies imported yet.</div>
                )}
                {failures.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`w-full text-left rounded-sm border px-3 py-2 hover:bg-white/5 transition-colors ${rowTone(f.severity)}`}
                    onClick={() => onSelectEvent?.(f)}
                  >
                    <div className="text-[11px] text-white/80 font-bold truncate">
                      {f.sector ?? "SYSTEM"}: {f.message}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        Stage 1 of 5
                      </div>
                      <div className="text-[11px] font-mono text-white/60">0 / 1</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="h-24" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
