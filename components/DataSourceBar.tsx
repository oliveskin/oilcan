import React, { useRef, useState } from "react";
import { VisualizerDataset } from "../types";
import { importOpenclawEvalJson } from "../services/importOpenclawEval";
import { Upload, Wifi, Shield, WifiOff, AlertTriangle } from "lucide-react";

type LiveStatus = "DISCONNECTED" | "CONNECTING" | "LIVE" | "ERROR";

export default function DataSourceBar(props: {
  dataset: VisualizerDataset;
  onDataset: (d: VisualizerDataset) => void;
  liveStatus: LiveStatus;
  onToggleLive: () => void;
}): React.ReactElement {
  const { dataset, onDataset, liveStatus, onToggleLive } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const isLikelyEvalReport = (payload: unknown): boolean => {
    if (!payload || typeof payload !== "object") return false;
    const record = payload as Record<string, unknown>;
    const hasResults = Array.isArray(record.results);
    const summary = record.summary;
    const hasSummaryTotal =
      !!summary &&
      typeof summary === "object" &&
      typeof (summary as Record<string, unknown>).total_attacks === "number";
    return hasResults || hasSummaryTotal;
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      setImportError(null);
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!isLikelyEvalReport(parsed)) {
        throw new Error(
          "Unsupported JSON format. Expected a tinman-openclaw-eval report (results[] or summary.total_attacks)."
        );
      }

      const imported = importOpenclawEvalJson(parsed);
      onDataset({
        ...imported,
        sourceLabel: `${imported.sourceLabel} (${file.name})`,
      });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "Invalid JSON file. Please select a valid tinman-openclaw-eval report."
          : error instanceof Error
            ? error.message
            : "Import failed. Please verify the report format and try again.";
      setImportError(message);
    }
  };

  return (
    <div className="glass-panel rounded-sm px-3 sm:px-4 py-2 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
          <div className="p-1.5 rounded bg-white/5 border border-white/10">
            <Shield size={16} className="text-fps-accent" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-white/50 uppercase tracking-[0.22em]">
              Data Source
            </div>
            <div className="text-xs font-mono text-white truncate">
              {dataset.sourceLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
          <button
            className={[
              "px-3 py-2 rounded-sm border transition-all text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2",
              "flex-1 sm:flex-none min-w-[120px]",
              liveStatus === "LIVE"
                ? "bg-fps-accent text-black border-fps-accent hover:bg-sky-300"
                : "bg-white/5 border-white/10 hover:bg-white/10",
            ].join(" ")}
            onClick={onToggleLive}
            title="Connect to the local oilcan-bridge SSE stream"
          >
            {liveStatus === "LIVE" ? (
              <>
                <Wifi size={14} className="opacity-80" />
                Live
              </>
            ) : liveStatus === "CONNECTING" ? (
              <>
                <Wifi size={14} className="opacity-80" />
                Connecting
              </>
            ) : liveStatus === "ERROR" ? (
              <>
                <WifiOff size={14} className="opacity-80" />
                Retry Live
              </>
            ) : (
              <>
                <Wifi size={14} className="opacity-80" />
                Live
              </>
            )}
          </button>

          <button
            className="px-3 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 flex-1 sm:flex-none min-w-[120px]"
            onClick={onPick}
          >
            <Upload size={14} className="opacity-80" />
            Import JSON
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-sm bg-black/20 border border-white/10 text-[11px] text-white/70">
            <Wifi size={14} className="opacity-80" />
            <span className="font-mono">
              LAN mode (opt-in): <span className="text-white">OILCAN_ALLOW_LAN=1</span>
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              await onFile(e.target.files?.[0] ?? null);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {importError && (
        <div className="w-full rounded-sm border border-red-400/35 bg-red-950/35 text-red-200 text-[11px] px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{importError}</span>
        </div>
      )}
    </div>
  );
}
