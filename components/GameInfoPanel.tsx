import React from "react";
import { VisualizerDataset } from "../types";
import { Shield, Timer, Users, Skull } from "lucide-react";

export default function GameInfoPanel(props: { dataset: VisualizerDataset }): React.ReactElement {
  const { dataset } = props;
  const s = dataset.severityCounts;
  const critical = s.S4;
  const high = s.S3;
  const totalBad = s.S4 + s.S3 + s.S2;

  return (
    <div className="bg-black/35 backdrop-blur-xl border border-white/10 rounded-sm px-4 py-3 w-full">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/60 font-bold">
            Game Info
          </div>
          <div className="text-[10px] font-mono text-white/40">TINMAN</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-white/70" />
            <div className="text-xs font-mono text-white/90">00:23</div>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-white/70" />
            <div className="text-xs font-mono text-white/90">96</div>
          </div>
          <div className="flex items-center gap-2">
            <Skull size={14} className="text-white/70" />
            <div className="text-xs font-mono text-white/90">{totalBad}</div>
          </div>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-fps-accent" />
            <div className="text-xs text-white/80">Shield</div>
          </div>
          <div className="text-[11px] font-mono">
            <span className={critical > 0 ? "text-red-300" : "text-emerald-300"}>
              {critical > 0 ? `S4:${critical}` : "CLEAR"}
            </span>
            <span className="text-white/40"> / </span>
            <span className={high > 0 ? "text-orange-200" : "text-white/50"}>{`S3:${high}`}</span>
          </div>
        </div>
      </div>
  );
}
