import React, { useState } from 'react';
import { BarChart2, ChevronRight, ChevronLeft } from 'lucide-react';

const SidePanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-50 bg-fps-glass border-l border-t border-b border-white/20 p-2 text-white/50 hover:text-white transition-all ${isOpen ? 'mr-80' : 'mr-0'}`}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-fps-glass backdrop-blur-xl border-l border-white/10 z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-8 text-fps-gold border-b border-white/10 pb-4">
            <BarChart2 size={18} />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Mission Report</h2>
          </div>

          <div className="space-y-8 flex-1">
            {/* Scoreboard Style Stats */}
            <div>
               <h3 className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Threat Assessment</h3>
               <div className="space-y-1">
                  {[
                     { label: 'Critical', val: 3, color: 'bg-red-500' },
                     { label: 'High', val: 8, color: 'bg-orange-500' },
                     { label: 'Moderate', val: 15, color: 'bg-yellow-500' },
                  ].map(stat => (
                     <div key={stat.label} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                        <span className="text-xs font-bold text-white/70">{stat.label}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-mono">{stat.val}</span>
                           <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Team/Roster Style Info */}
            <div>
               <h3 className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Active Protocols</h3>
               <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white/5 border border-white/10 rounded flex flex-col items-center gap-1">
                     <span className="text-[10px] text-white/50">GUARDRAILS</span>
                     <span className="text-lg font-bold text-emerald-400">ON</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded flex flex-col items-center gap-1">
                     <span className="text-[10px] text-white/50">AUTO-HEAL</span>
                     <span className="text-lg font-bold text-emerald-400">ON</span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="text-[10px] text-center text-white/30 font-mono">
             TINMAN OS v1.0.4
          </div>
        </div>
      </div>
    </>
  );
};

export default SidePanel;
