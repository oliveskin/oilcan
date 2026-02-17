import React, { useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../types';
import { Terminal, Activity, AlertCircle, Cpu, Wrench } from 'lucide-react';

interface LogStreamProps {
  logs: LogEntry[];
  autoScroll: boolean;
}

const LogStream: React.FC<LogStreamProps> = ({ logs, autoScroll }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.THOUGHT: return <Cpu className="w-4 h-4 text-purple-400" />;
      case LogLevel.TOOL: return <Wrench className="w-4 h-4 text-orange-400" />;
      case LogLevel.ERROR: return <AlertCircle className="w-4 h-4 text-red-500" />;
      case LogLevel.INFO: return <Terminal className="w-4 h-4 text-blue-400" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.THOUGHT: return 'text-purple-300';
      case LogLevel.TOOL: return 'text-orange-300';
      case LogLevel.ERROR: return 'text-red-400 bg-red-900/10 border-l-2 border-red-500';
      case LogLevel.WARN: return 'text-yellow-300';
      case LogLevel.DEBUG: return 'text-slate-500';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-terminal-bg rounded-lg border border-tin-800 overflow-hidden shadow-2xl font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-tin-900 border-b border-tin-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-tin-400" />
          <span className="text-tin-300 font-medium">Neural Stream</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {logs.length === 0 && (
          <div className="text-tin-600 text-center mt-10 italic">Waiting for agent connection...</div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className={`flex gap-3 p-1.5 rounded hover:bg-white/5 transition-colors ${log.level === LogLevel.ERROR ? 'bg-red-950/20' : ''}`}>
            <span className="text-tin-600 shrink-0 w-24 text-xs pt-0.5">{log.timestamp.split('T')[1].slice(0, 12)}</span>
            <span className="pt-0.5 shrink-0">{getIcon(log.level)}</span>
            <div className={`break-all whitespace-pre-wrap ${getColor(log.level)}`}>
              {log.level === LogLevel.THOUGHT && <span className="text-purple-500 font-bold mr-2">LOGIC &gt;</span>}
              {log.level === LogLevel.TOOL && <span className="text-orange-500 font-bold mr-2">EXEC &gt;</span>}
              {log.message}
              {log.metadata && (
                <div className="mt-1 text-xs text-tin-500 bg-black/30 p-2 rounded border border-tin-800">
                  {JSON.stringify(log.metadata, null, 2)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogStream;
