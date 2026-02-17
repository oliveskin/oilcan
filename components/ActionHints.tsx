import React from "react";

export default function ActionHints(): React.ReactElement {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none hidden sm:block">
      <div className="bg-black/35 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 flex items-center gap-5 text-[12px] text-white/80">
        <div className="flex items-center gap-2">
          <span className="font-bold">Scroll</span>
          <span className="text-white/60">Zoom</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">Click</span>
          <span className="text-white/60">Select / Place</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">Esc</span>
          <span className="text-white/60">Clear</span>
        </div>
      </div>
    </div>
  );
}
