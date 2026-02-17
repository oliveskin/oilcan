export type SectorId = 'REASONING' | 'TOOLS' | 'CONTEXT' | 'FEEDBACK' | 'DEPLOYMENT';

export type ViewMode = 'STANDARD' | 'GAME';

export enum FailureSeverity {
  S0 = 'S0', // Benign
  S1 = 'S1', // UX Degradation
  S2 = 'S2', // Business Risk
  S3 = 'S3', // Serious Risk
  S4 = 'S4', // Critical
}

export interface ThreatMarker {
  id: string;
  sector: SectorId;
  severity: FailureSeverity;
  x: number; // Percentage 0-100 relative to map container
  y: number; // Percentage 0-100 relative to map container
  label: string;
  timestamp: number;
  active: boolean;
}

export interface Intervention {
  id: string;
  sector: SectorId;
  type: 'SHIELD' | 'DAMPENER' | 'BARRIER';
  active: boolean;
  progress: number; // 0-100 for deployment
}

export interface TinmanEvent {
  id: string;
  timestamp: string;
  type: 'FAILURE' | 'INTERVENTION' | 'SYSTEM' | 'HUMAN';
  message: string;
  sector?: SectorId;
  severity?: FailureSeverity;
  markerId?: string;
  details?: Record<string, unknown>;
}

export interface SystemStats {
  monitoredSystems: number;
  activeFailures: number;
  runningExperiments: number;
  activeInterventions: number;
  fps: number;
  latency: number;
}

export interface SeverityCounts {
  S0: number;
  S1: number;
  S2: number;
  S3: number;
  S4: number;
}

export interface VisualizerDataset {
  markers: ThreatMarker[];
  events: TinmanEvent[];
  stats: SystemStats;
  severityCounts: SeverityCounts;
  sourceLabel: string;
}

export enum LogLevel {
  THOUGHT = 'THOUGHT',
  TOOL = 'TOOL',
  ERROR = 'ERROR',
  INFO = 'INFO',
  WARN = 'WARN',
  DEBUG = 'DEBUG',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
}

export enum AgentStatus {
  EXECUTING = 'EXECUTING',
  THINKING = 'THINKING',
  ERROR = 'ERROR',
}

export interface AgentState {
  status: AgentStatus;
  memoryUsage: string;
  model: string;
  contextWindow: number;
  uptime: string;
}
