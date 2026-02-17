import React, { useMemo, useState } from "react";
import { FailureSeverity, ThreatMarker, VisualizerDataset } from "../types";

const SEVERITY_COLOR: Record<FailureSeverity, string> = {
  [FailureSeverity.S0]: "rgba(255,255,255,0.45)",
  [FailureSeverity.S1]: "rgba(56,189,248,0.95)",
  [FailureSeverity.S2]: "rgba(234,179,8,0.98)",
  [FailureSeverity.S3]: "rgba(249,115,22,1)",
  [FailureSeverity.S4]: "rgba(239,68,68,1)",
};

const MAP_IMAGE_SRC = "/tinman-town-map.jpg";
const MAP_ASPECT_RATIO = 1056 / 768;
const MAP_ROTATION_DEG = 180;

type SectorOverlay = {
  id: string;
  label: string;
  detail: string;
  left: number;
  top: number;
  width: number;
  height: number;
  tone: string;
};

const SECTOR_OVERLAYS: SectorOverlay[] = [
  {
    id: "reasoning",
    label: "COGNITION / REASONING",
    detail: "Prompt logic + planning",
    left: 6,
    top: 8,
    width: 28,
    height: 22,
    tone: "from-sky-500/20 to-sky-900/10 border-sky-300/40",
  },
  {
    id: "tools",
    label: "TOOLS",
    detail: "Execution + exfil controls",
    left: 62,
    top: 8,
    width: 30,
    height: 24,
    tone: "from-amber-400/20 to-amber-900/10 border-amber-300/45",
  },
  {
    id: "context",
    label: "CONTEXT",
    detail: "Memory + session boundaries",
    left: 18,
    top: 43,
    width: 30,
    height: 22,
    tone: "from-violet-400/20 to-violet-900/10 border-violet-300/45",
  },
  {
    id: "feedback",
    label: "FEEDBACK",
    detail: "Coordination + human loop",
    left: 55,
    top: 43,
    width: 30,
    height: 22,
    tone: "from-emerald-400/20 to-emerald-900/10 border-emerald-300/45",
  },
  {
    id: "deployment",
    label: "DEPLOYMENT",
    detail: "Infra + supply chain",
    left: 33,
    top: 71,
    width: 34,
    height: 22,
    tone: "from-rose-400/20 to-rose-900/10 border-rose-300/45",
  },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function markerShape(sev: FailureSeverity): "diamond" | "pin" {
  return sev === FailureSeverity.S4 ? "pin" : "diamond";
}

function MarkerGlyph(props: { marker: ThreatMarker }): React.ReactElement {
  const { marker } = props;
  const color = SEVERITY_COLOR[marker.severity];
  const shape = markerShape(marker.severity);

  if (shape === "pin") {
    return (
      <g>
        <circle cx="0" cy="0" r="4.8" fill={color} opacity={0.95} />
        <circle cx="0" cy="0" r="10" fill={color} opacity={0.16} />
        <path d="M 0 5.6 L -3.8 16.8 L 0 13.4 L 3.8 16.8 Z" fill={color} opacity={0.9} />
      </g>
    );
  }

  return (
    <g>
      <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="rgba(0,0,0,0.4)" />
      <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill={color} opacity={0.95} />
    </g>
  );
}

export default function GameMap(props: {
  dataset: VisualizerDataset;
  onPlaceMarker?: (x: number, y: number) => void;
  onSelectMarker?: (markerId: string) => void;
  className?: string;
}): React.ReactElement {
  const { dataset, onPlaceMarker, onSelectMarker, className } = props;

  const [zoom, setZoom] = useState(1);
  const [imgError, setImgError] = useState(false);

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const next = clamp(zoom + (e.deltaY > 0 ? -0.08 : 0.08), 0.85, 1.65);
    setZoom(next);
  };

  const labels = useMemo(() => {
    const cols = "ABCDEFGHIJ".split("");
    const rows = Array.from({ length: 10 }, (_, i) => String(i + 1));
    return { cols, rows };
  }, []);

  const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!onPlaceMarker) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPlaceMarker(clamp(x, 0, 100), clamp(y, 0, 100));
  };

  return (
    <div
      className={["relative w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4", className]
        .filter(Boolean)
        .join(" ")}
      onWheel={onWheel}
    >
      <div
        className="w-full max-w-[1200px]"
        style={{
          maxHeight: "100%",
          transform: `scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        <div className="relative pl-7 pt-6">
          <div className="absolute left-7 right-0 top-0 flex justify-between pr-2 text-[10px] font-bold text-white/85 pointer-events-none">
            {labels.cols.map((c) => (
              <div key={c} className="w-[10%] text-center">
                {c}
              </div>
            ))}
          </div>
          <div className="absolute left-0 top-6 bottom-0 flex flex-col justify-between pb-2 text-[10px] font-bold text-white/85 pointer-events-none">
            {labels.rows.map((r) => (
              <div key={r} className="h-[10%] flex items-center">
                {r}
              </div>
            ))}
          </div>

          <div
            className="relative rounded-sm border border-white/20 bg-[#1d2534] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_70px_rgba(0,0,0,0.45)]"
            style={{ aspectRatio: String(MAP_ASPECT_RATIO) }}
            onClick={onClick}
          >
            {!imgError ? (
              <img
                src={MAP_IMAGE_SRC}
                alt="Tinman Town tactical map"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  imageRendering: "pixelated",
                  transform: `rotate(${MAP_ROTATION_DEG}deg)`,
                  transformOrigin: "center",
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1d2534] text-white/70 text-sm px-4 text-center">
                Map image missing. Add `tinman-town-map.jpg` to `oilcan/public/`.
              </div>
            )}

            <div className="absolute inset-0 bg-black/42 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/22 via-black/8 to-black/26 pointer-events-none" />

            <div className="absolute inset-0 map-grid map-grid-rect pointer-events-none" />

            <div className="absolute inset-0 pointer-events-none">
              {SECTOR_OVERLAYS.map((z) => (
                <div
                  key={z.id}
                  className={`absolute rounded-md border bg-gradient-to-br ${z.tone} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]`}
                  style={{
                    left: `${z.left}%`,
                    top: `${z.top}%`,
                    width: `${z.width}%`,
                    height: `${z.height}%`,
                  }}
                >
                  <div className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 leading-tight">
                    <div className="text-[10px] font-bold tracking-[0.14em] text-white/95">{z.label}</div>
                    <div className="text-[9px] text-white/75">{z.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-2 right-2 rounded border border-white/20 bg-black/65 px-2 py-1 pointer-events-none">
              <div className="text-[9px] uppercase tracking-[0.14em] text-white/70 mb-1">Tool Map</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="text-[9px] text-sky-200">Cognition/Reasoning</div>
                <div className="text-[9px] text-amber-200">Tools</div>
                <div className="text-[9px] text-violet-200">Context</div>
                <div className="text-[9px] text-emerald-200">Feedback</div>
                <div className="text-[9px] text-rose-200">Deployment</div>
              </div>
            </div>

            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              {dataset.markers.map((m) => (
                <g
                  key={m.id}
                  transform={`translate(${m.x} ${m.y})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMarker?.(m.id);
                  }}
                >
                  <MarkerGlyph marker={m} />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
