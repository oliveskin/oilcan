import React from 'react';
import { TinmanEvent, FailureSeverity } from '../types';
import { AlertTriangle, ShieldCheck, Cpu, User } from 'lucide-react';

interface KillFeedProps {
  events: TinmanEvent[];
}

const KillFeed: React.FC<KillFeedProps> = ({ events }) => {
  const getIcon = (type: string, severity?: string) => {
    if (type === 'FAILURE') return <AlertTriangle size={14} className={severity === 'S4' ? 'text-red-500' : 'text-yellow-500'} />;
    if (type === 'INTERVENTION') return <ShieldCheck size={14} className="text-cyan-500" />;
    if (type === 'HUMAN') return <User size={14} className="text-purple-500" />;
    return <Cpu size={14} className="text-white/50" />;
  };

  const getBorderColor = (type: string, severity?: string) => {
    if (type === 'FAILURE') {
       if (severity === 'S4') return 'border-red-500 bg-red-500/10';
       if (severity === 'S3') return 'border-orange-500 bg-orange-500/5';
       return 'border-yellow-500/50 bg-yellow-500/5';
    }
    if (type === 'INTERVENTION') return 'border-cyan-500/50 bg-cyan-500/5';
    return 'border-white/10 bg-white/5';
  };

  return (
    <div className="fixed top-24 right-6 w-80 z-40 pointer-events-none flex flex-col gap-2 items-end">
      {events.slice(-8).map((event) => ( // Show last 8 events
        <div 
          key={event.id}
          className={`
            w-full p-2 border-l-2 rounded-r flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-right fade-in duration-300
            ${getBorderColor(event.type, event.severity)}
          `}
        >
          <div className="mt-0.5 shrink-0">{getIcon(event.type, event.severity)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
               <span className="text-[10px] font-bold tracking-wider text-white/70 uppercase">{event.type}</span>
               <span className="text-[9px] font-mono text-white/30">{event.timestamp}</span>
            </div>
            <div className="text-xs font-mono text-white leading-tight truncate">{event.message}</div>
            {event.sector && (
               <div className="text-[9px] text-white/40 mt-1 uppercase tracking-widest">{event.sector}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KillFeed;
