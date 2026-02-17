import React from "react";
import { ViewMode } from "../types";

export default function ModeToggle(props: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}): React.ReactElement {
  const { mode, onChange } = props;
  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/5 border border-white/10 p-1">
      <button
        className={[
          "px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] font-bold transition-all whitespace-nowrap",
          mode === "STANDARD"
            ? "bg-fps-gold text-black"
            : "text-white/70 hover:text-white hover:bg-white/5",
        ].join(" ")}
        onClick={() => onChange("STANDARD")}
      >
        Standard
      </button>
      <button
        className={[
          "px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] font-bold transition-all whitespace-nowrap",
          mode === "GAME"
            ? "bg-fps-accent text-black"
            : "text-white/70 hover:text-white hover:bg-white/5",
        ].join(" ")}
        onClick={() => onChange("GAME")}
      >
        Game
      </button>
    </div>
  );
}
