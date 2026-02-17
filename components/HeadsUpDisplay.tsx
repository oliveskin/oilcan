import React from 'react';
import { SystemStats } from '../types';
import { Shield, Activity, Zap, Crosshair, Brain } from 'lucide-react';

const HudWidget: React.FC<{ title: string, children: React.ReactNode, align?: 'left' | 'right' }> = ({ title, children, align = 'left' }) => (
  <div className={`glass-panel p-4 rounded-sm flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 border-b border-white/10 w-full pb-1 flex justify-between">
       {align === 'right' && <span>///</span>}
       {title}
       {align === 'left' && <span>///</span>}
    </h3>
    {children}
  </div>
);

const StatRow: React.FC<{ label: string, value: string | number, color?: string }> = ({ label, value, color = 'text-white' }) => (
  <div className="flex items-center gap-4 text-sm font-mono font-bold">
    <span className="text-white/40 text-[10px] uppercase w-12">{label}</span>
    <span className={color}>{value}</span>
  </div>
);

const HeadsUpDisplay: React.FC<{ stats: SystemStats }> = ({ stats }) => {
  return (
    <>
      {/* --- TOP CENTER: OBJECTIVE --- */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[600px] max-w-full z-40">
         <div className="objective-gradient px-8 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] text-fps-gold font-bold uppercase tracking-[0.3em] mb-0.5">Current Objective</div>
            <div className="text-sm font-medium tracking-wide text-white drop-shadow-lg">
               DEBUGGING: AUTHENTICATION MICROSERVICE FAILURE
            </div>
         </div>
      </div>

      {/* --- BOTTOM LEFT: AGENT VITALS (Health/Shields style) --- */}
      <div className="fixed bottom-8 left-8 z-40">
        <div className="flex items-end gap-2">
           <div className="text-6xl font-bold font-sans text-white leading-none tracking-tighter drop-shadow-xl">
              84<span className="text-2xl text-fps-accent">%</span>
           </div>
           <div className="pb-2">
              <div className="text-xs font-bold uppercase text-fps-accent tracking-widest">Integrity</div>
              <div className="flex gap-1 mt-1">
                 {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className={`w-3 h-1.5 skew-x-[-12deg] ${i > 6 ? 'bg-white/20' : 'bg-fps-accent'}`}></div>
                 ))}
              </div>
           </div>
        </div>
        
        <div className="mt-4 flex gap-4">
           <HudWidget title="Vitals">
              <StatRow label="CPU" value={`${stats.monitoredSystems}%`} color="text-emerald-400" />
              <StatRow label="MEM" value="12.4GB" />
              <StatRow label="UPTIME" value="42:15:00" />
           </HudWidget>
        </div>
      </div>

      {/* --- BOTTOM RIGHT: WEAPON INFO (Tool Context) --- */}
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end">
         <div className="flex items-center gap-4 mb-2">
            <div className="text-right">
               <div className="text-xs font-bold uppercase text-fps-gold tracking-widest">Gemini 1.5 Flash</div>
               <div className="text-[10px] text-white/50">ACTIVE MODEL</div>
            </div>
            <Brain size={32} className="text-fps-gold opacity-80" />
         </div>

         <HudWidget title="Equipped Tools" align="right">
            <div className="flex gap-2 mb-2">
               <div className="p-1.5 bg-white/10 rounded border border-white/20"><Crosshair size={14} /></div>
               <div className="p-1.5 bg-white/10 rounded border border-white/20"><Zap size={14} /></div>
               <div className="p-1.5 bg-white/5 rounded border border-white/5 opacity-50"><Shield size={14} /></div>
            </div>
            <StatRow label="TOKENS" value="128k" color="text-fps-gold" />
            <StatRow label="CTX" value="85%" />
         </HudWidget>
      </div>

      {/* --- TOP LEFT: MINI INFO --- */}
      <div className="fixed top-8 left-8 z-40">
         <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${stats.activeFailures > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-xs font-mono font-bold tracking-wider">LIVE</span>
            <span className="text-[10px] text-white/40">FPS: {stats.fps}</span>
         </div>
      </div>
    </>
  );
};

export default HeadsUpDisplay;
