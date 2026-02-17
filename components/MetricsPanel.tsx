import React from 'react';
import { AgentState, AgentStatus } from '../types';
import { Activity, Zap, Database, Clock } from 'lucide-react';

interface MetricsPanelProps {
  agentState: AgentState;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ agentState }) => {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.EXECUTING: return 'text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]';
      case AgentStatus.THINKING: return 'text-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]';
      case AgentStatus.ERROR: return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Status Card */}
      <div className="bg-tin-800/50 backdrop-blur border border-tin-700 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex items-center gap-2 text-tin-400 mb-2">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
        </div>
        <div className={`text-xl font-bold font-mono uppercase flex items-center gap-2 ${getStatusColor(agentState.status)}`}>
          <div className={`w-3 h-3 rounded-full bg-current animate-pulse`} />
          {agentState.status}
        </div>
      </div>

      {/* Memory Card */}
      <div className="bg-tin-800/50 backdrop-blur border border-tin-700 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex items-center gap-2 text-tin-400 mb-2">
          <Database className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Memory</span>
        </div>
        <div className="text-xl font-bold text-tin-100 font-mono">
          {agentState.memoryUsage}
        </div>
      </div>

      {/* Model Card */}
      <div className="bg-tin-800/50 backdrop-blur border border-tin-700 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex items-center gap-2 text-tin-400 mb-2">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Model</span>
        </div>
        <div className="text-lg font-bold text-tin-100 truncate" title={agentState.model}>
          {agentState.model}
        </div>
        <div className="text-xs text-tin-500">Ctx: {agentState.contextWindow}k</div>
      </div>

      {/* Uptime Card */}
      <div className="bg-tin-800/50 backdrop-blur border border-tin-700 p-4 rounded-lg flex flex-col justify-between">
        <div className="flex items-center gap-2 text-tin-400 mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Uptime</span>
        </div>
        <div className="text-xl font-bold text-tin-100 font-mono">
          {agentState.uptime}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
