import React, { useEffect, useRef, useState } from "react";
import { LogEntry, LogLevel, TinmanEvent, ViewMode, VisualizerDataset } from "./types";
import {
  analyzeLogs,
  describeLlmConfig,
  explainEventWithLlm,
  getBridgeConfig,
  getLlmConfig,
  LlmConnectionResult,
  LlmRuntimeConfig,
  resetLlmConfig,
  saveLlmConfig,
  testLlmConnection,
} from "./services/llmService";
import ModeToggle from "./components/ModeToggle";
import DataSourceBar from "./components/DataSourceBar";
import StandardDashboard from "./components/StandardDashboard";
import GameMap from "./components/GameMap";
import ChallengesPanel from "./components/ChallengesPanel";
import GameInfoPanel from "./components/GameInfoPanel";
import ActionHints from "./components/ActionHints";
import { BrainCircuit, Loader2, X, Activity, SlidersHorizontal } from "lucide-react";
import { applyTinmanEventRecord, TinmanEventRecord } from "./services/importTinmanEvent";
import { explainEvent } from "./services/eventExplain";

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>("STANDARD");
  const [dataset, setDataset] = useState<VisualizerDataset>({
    markers: [],
    events: [],
    stats: {
      monitoredSystems: 1,
      activeFailures: 0,
      runningExperiments: 0,
      activeInterventions: 0,
      fps: 60,
      latency: 0,
    },
    severityCounts: { S0: 0, S1: 0, S2: 0, S3: 0, S4: 0 },
    sourceLabel: "sim:idle",
  });

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TinmanEvent | null>(null);
  const [llmConfig, setLlmConfig] = useState<LlmRuntimeConfig>(() => getLlmConfig());
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [llmDraft, setLlmDraft] = useState<LlmRuntimeConfig>(() => getLlmConfig());
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<LlmConnectionResult | null>(null);
  const [isExplainingEventWithLlm, setIsExplainingEventWithLlm] = useState(false);
  const [llmEventExplanation, setLlmEventExplanation] = useState<string | null>(null);
  const [llmEventError, setLlmEventError] = useState<string | null>(null);
  const simInterval = useRef<number | null>(null);
  const live = useRef<EventSource | null>(null);
  const [liveStatus, setLiveStatus] = useState<
    "DISCONNECTED" | "CONNECTING" | "LIVE" | "ERROR"
  >("DISCONNECTED");

  const bridgeConfig = getBridgeConfig();
  const bridgeHost = bridgeConfig.host || window.location.hostname;
  const bridgePort = bridgeConfig.port || 8123;
  const bridgeBase = `${window.location.protocol}//${bridgeHost}:${bridgePort}`;
  const bridgeTokenQuery = bridgeConfig.token
    ? `?token=${encodeURIComponent(bridgeConfig.token)}`
    : "";
  const bridgeEventsUrl = `${bridgeBase}/events${bridgeTokenQuery}`;

  useEffect(() => {
    // If no data imported, keep a subtle "idle" animation in Game mode only.
    simInterval.current = window.setInterval(() => {
      setDataset((prev) => {
        if (prev.sourceLabel !== "sim:idle") return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            fps: Math.floor(58 + Math.random() * 4),
            latency: Math.floor(10 + Math.random() * 5),
          },
        };
      });
    }, 800);

    return () => simInterval.current && clearInterval(simInterval.current);
  }, []);

  const connectLive = () => {
    if (live.current) live.current.close();
    setLiveStatus("CONNECTING");

    const es = new EventSource(bridgeEventsUrl);
    live.current = es;

    es.onopen = () => {
      setLiveStatus("LIVE");
      setDataset((prev) => ({
        ...prev,
        sourceLabel: `live:${window.location.hostname}`,
      }));
    };

    es.onmessage = (ev) => {
      try {
        const rec = JSON.parse(ev.data) as TinmanEventRecord;
        setDataset((prev) => applyTinmanEventRecord(prev, rec));
      } catch {
        // Ignore malformed events.
      }
    };

    es.onerror = () => {
      // EventSource will retry automatically; keep the stream open.
      setLiveStatus((s) => (s === "DISCONNECTED" ? "ERROR" : "ERROR"));
    };
  };

  const disconnectLive = () => {
    if (live.current) live.current.close();
    live.current = null;
    setLiveStatus("DISCONNECTED");
  };

  const toggleLive = () => {
    if (liveStatus === "LIVE" || liveStatus === "CONNECTING") disconnectLive();
    else connectLive();
  };

  const selectEventByMarker = (markerId: string) => {
    const match = dataset.events.slice().reverse().find((e) => e.markerId === markerId);
    if (match) setSelectedEvent(match);
  };

  useEffect(() => {
    // Default behavior: try LIVE mode on startup. If the bridge is not running,
    // status flips to ERROR, but EventSource will keep retrying.
    connectLive();
    return () => disconnectLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiagnosis = async () => {
    setIsDiagnosing(true);
    setDiagnosisResult(null);

    const syntheticLogs: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: `Starting quick triage...`,
      },
      {
        id: "2",
        timestamp: new Date().toISOString(),
        level: LogLevel.THOUGHT,
        message: `Analyzing ${dataset.markers.length} imported markers.`,
      },
    ];

    dataset.markers.slice(-8).forEach((threat, i) => {
      syntheticLogs.push({
        id: `err-${i}`,
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        message: `Detected ${threat.severity} pattern at ${threat.label}.`,
      });
    });

    try {
      const result = await analyzeLogs(syntheticLogs, `Source: ${dataset.sourceLabel}`, llmConfig);
      setDiagnosisResult(result);
    } catch (e) {
      setDiagnosisResult("CONNECTION FAILURE: Doctor Tinman is offline.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const toggleLlmSettings = () => {
    setLlmDraft(llmConfig);
    setLlmTestResult(null);
    setShowLlmSettings((prev) => !prev);
  };

  const saveLlmSettingsFromDraft = () => {
    const next = saveLlmConfig(llmDraft);
    setLlmConfig(next);
    setLlmDraft(next);
    setLlmTestResult(null);
    setShowLlmSettings(false);
  };

  const resetLlmSettingsToDefaults = () => {
    const next = resetLlmConfig();
    setLlmConfig(next);
    setLlmDraft(next);
    setLlmTestResult(null);
  };

  const runLlmConnectionTest = async () => {
    setIsTestingLlm(true);
    setLlmTestResult(null);
    try {
      const result = await testLlmConnection(llmDraft);
      setLlmTestResult(result);
    } finally {
      setIsTestingLlm(false);
    }
  };

  const runSelectedEventLlmExplanation = async () => {
    if (!selectedEvent) return;
    setIsExplainingEventWithLlm(true);
    setLlmEventError(null);
    setLlmEventExplanation(null);
    try {
      const result = await explainEventWithLlm(selectedEvent, llmConfig);
      if (result.ok) setLlmEventExplanation(result.message);
      else setLlmEventError(result.message);
    } finally {
      setIsExplainingEventWithLlm(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDiagnosisResult(null);
        setSelectedEvent(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    setLlmEventExplanation(null);
    setLlmEventError(null);
    setIsExplainingEventWithLlm(false);
  }, [selectedEvent?.id]);

  return (
    <div className="relative w-screen h-screen bg-fps-bg text-fps-text overflow-hidden font-sans selection:bg-sky-500/30">
      <div className="absolute inset-0 z-0 bg-tactical-grid bg-grid-pattern opacity-30" />

      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/60 font-bold">
              Tinman Visualizer
            </div>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <button
            className="w-full sm:w-auto px-3 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2"
            onClick={() => setDiagnosisResult((v) => (v ? null : "READY"))}
          >
            <BrainCircuit size={14} className="opacity-80" />
            Diagnose
          </button>
        </div>
        <DataSourceBar
          dataset={dataset}
          onDataset={setDataset}
          liveStatus={liveStatus}
          onToggleLive={toggleLive}
        />
      </div>

      {mode === "STANDARD" ? (
        <div className="absolute inset-x-0 bottom-0 top-44 sm:top-36 md:top-28 overflow-y-auto">
          <StandardDashboard dataset={dataset} onSelectEvent={setSelectedEvent} />
          <div className="h-10" />
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 top-44 sm:top-36 md:top-28 overflow-hidden">
          <div className="h-full flex">
            <ChallengesPanel dataset={dataset} onSelectEvent={setSelectedEvent} />

            <div className="flex-1 min-w-0 h-full p-4 md:p-6">
              <div className="h-full w-full rounded-sm border border-white/10 bg-black/10 overflow-hidden">
                <GameMap dataset={dataset} onSelectMarker={selectEventByMarker} />
              </div>
            </div>

            <div className="hidden lg:block w-[280px] shrink-0 h-full p-4 md:p-6 pl-0">
              <GameInfoPanel dataset={dataset} />
            </div>
          </div>

          <ActionHints />
        </div>
      )}

      {selectedEvent && (
        <div className="absolute inset-0 z-[58] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedEvent(null)} />
          <div className="relative glass-panel w-[620px] max-w-full rounded backdrop-blur-xl border border-fps-accent/30 shadow-[0_0_50px_rgba(56,189,248,0.14)]">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
              <div>
                <h3 className="text-fps-accent font-bold tracking-widest leading-none">
                  EVENT DETAILS
                </h3>
                <div className="text-[10px] text-white/50 uppercase">
                  {selectedEvent.sector ?? "SYSTEM"} • {selectedEvent.timestamp}
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-white/50 hover:text-white hover:bg-white/10 p-1 rounded transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[68vh] overflow-y-auto">
              {(() => {
                const explained = explainEvent(selectedEvent);
                return (
                  <div className="rounded border border-fps-accent/30 bg-sky-950/25 p-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-fps-accent">
                      What This Means
                    </div>
                    <div className="text-sm text-sky-100">{explained.headline}</div>
                    <div className="text-xs text-sky-50/90">{explained.meaning}</div>
                    <div className="text-xs text-white/85">
                      <span className="text-white/60">Potential impact:</span> {explained.impact}
                    </div>
                    <div className="text-xs text-white/60 uppercase tracking-widest pt-1">
                      Recommended next steps
                    </div>
                    <ul className="space-y-1">
                      {explained.nextSteps.map((step, index) => (
                        <li key={index} className="text-xs text-white/90 flex gap-2">
                          <span className="text-fps-accent">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    {llmConfig.provider !== "none" ? (
                      <div className="pt-2 border-t border-white/10">
                        <button
                          onClick={runSelectedEventLlmExplanation}
                          disabled={isExplainingEventWithLlm}
                          className={[
                            "px-3 py-2 rounded-sm border transition-all text-[10px] font-bold tracking-widest uppercase",
                            isExplainingEventWithLlm
                              ? "bg-white/5 border-white/10 text-white/50 cursor-wait"
                              : "bg-white/5 border-white/10 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {isExplainingEventWithLlm ? "Explaining..." : "AI Explain This Event"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-white/60 pt-2 border-t border-white/10">
                        Enable an LLM provider in Diagnose - LLM Settings to use AI explanations.
                      </div>
                    )}

                    {llmEventExplanation && (
                      <div className="rounded border border-indigo-400/35 bg-indigo-950/25 p-3">
                        <div className="text-[10px] uppercase tracking-widest text-indigo-200 mb-1">
                          AI Explanation
                        </div>
                        <div className="text-xs text-indigo-50 whitespace-pre-wrap">{llmEventExplanation}</div>
                      </div>
                    )}

                    {llmEventError && (
                      <div className="rounded border border-red-400/35 bg-red-950/30 p-3">
                        <div className="text-[10px] uppercase tracking-widest text-red-200 mb-1">
                          AI Explanation Error
                        </div>
                        <div className="text-xs text-red-100">{llmEventError}</div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="rounded border border-white/10 bg-black/25 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/50">Message</div>
                <div className="text-sm text-white mt-1 break-words">{selectedEvent.message}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-white/10 bg-black/25 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Type</div>
                  <div className="text-xs text-white mt-1">{selectedEvent.type}</div>
                </div>
                <div className="rounded border border-white/10 bg-black/25 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Severity</div>
                  <div className="text-xs text-white mt-1">{selectedEvent.severity ?? "S0"}</div>
                </div>
              </div>

              {selectedEvent.details && (
                <details className="rounded border border-white/10 bg-black/25 p-3">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-white/50">
                    Technical Details
                  </summary>
                  <div className="space-y-2 mt-3">
                    {Object.entries(selectedEvent.details).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[160px_1fr] gap-3">
                        <div className="text-[11px] text-white/50 font-mono">{k}</div>
                        <div className="text-[11px] text-white break-words font-mono">
                          {typeof v === "string"
                            ? v
                            : v === null || v === undefined
                              ? "null"
                              : JSON.stringify(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal (optional; Pro can wire real traces later) */}
      {diagnosisResult && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
          <div className="glass-panel w-[520px] max-w-full rounded backdrop-blur-xl border border-fps-accent/50 shadow-[0_0_70px_rgba(56,189,248,0.18)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <BrainCircuit size={20} className="text-fps-accent" />
                <div>
                  <h3 className="text-fps-accent font-bold tracking-widest leading-none">
                    DIAGNOSTIC TERMINAL
                  </h3>
                  <div className="text-[10px] text-white/50 uppercase">Doctor Tinman</div>
                </div>
              </div>
              <button
                onClick={() => setDiagnosisResult(null)}
                className="text-white/50 hover:text-white hover:bg-white/10 p-1 rounded transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="rounded border border-white/10 bg-black/25 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-white/50">LLM Backend</div>
                    <div className="text-[11px] font-mono text-white/80 truncate">
                      {describeLlmConfig(llmConfig)}
                    </div>
                  </div>
                  <button
                    onClick={toggleLlmSettings}
                    className="px-3 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"
                  >
                    <SlidersHorizontal size={12} />
                    {showLlmSettings ? "Hide" : "LLM Settings"}
                  </button>
                </div>

                {showLlmSettings && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="grid gap-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/50">Provider</label>
                      <select
                        value={llmDraft.provider}
                        onChange={(e) =>
                          setLlmDraft((prev) => ({
                            ...prev,
                            provider: e.target.value as LlmRuntimeConfig["provider"],
                          }))
                        }
                        className="bg-black/35 border border-white/15 rounded-sm px-2 py-2 text-xs text-white"
                      >
                        <option value="none">Disabled</option>
                        <option value="gemini">Gemini API</option>
                        <option value="openai-compatible">OpenAI-compatible / Local</option>
                      </select>
                      {llmDraft.provider !== "none" && (
                        <div className="text-[11px] text-amber-200/90 border border-amber-400/30 bg-amber-950/25 rounded-sm px-2 py-2">
                          Privacy note: event/log content may be sent to your configured LLM endpoint.
                        </div>
                      )}
                    </div>

                    {llmDraft.provider === "gemini" && (
                      <>
                        <div className="grid gap-2">
                          <label className="text-[10px] uppercase tracking-widest text-white/50">Gemini Model</label>
                          <input
                            value={llmDraft.model || ""}
                            onChange={(e) =>
                              setLlmDraft((prev) => ({ ...prev, model: e.target.value || undefined }))
                            }
                            placeholder="gemini-2.0-flash"
                            className="bg-black/35 border border-white/15 rounded-sm px-2 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-[10px] uppercase tracking-widest text-white/50">API Key</label>
                          <input
                            type="password"
                            value={llmDraft.apiKey || ""}
                            onChange={(e) =>
                              setLlmDraft((prev) => ({ ...prev, apiKey: e.target.value || undefined }))
                            }
                            placeholder="AIza..."
                            className="bg-black/35 border border-white/15 rounded-sm px-2 py-2 text-xs text-white"
                          />
                        </div>
                      </>
                    )}

                    {llmDraft.provider === "openai-compatible" && (
                      <>
                        <div className="grid gap-2">
                          <label className="text-[10px] uppercase tracking-widest text-white/50">
                            Base URL
                          </label>
                          <input
                            value={llmDraft.baseUrl || ""}
                            onChange={(e) =>
                              setLlmDraft((prev) => ({ ...prev, baseUrl: e.target.value || undefined }))
                            }
                            placeholder="http://127.0.0.1:11434/v1"
                            className="bg-black/35 border border-white/15 rounded-sm px-2 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-[10px] uppercase tracking-widest text-white/50">Model</label>
                          <input
                            value={llmDraft.model || ""}
                            onChange={(e) =>
                              setLlmDraft((prev) => ({ ...prev, model: e.target.value || undefined }))
                            }
                            placeholder="gpt-4o-mini (or local model id)"
                            className="bg-black/35 border border-white/15 rounded-sm px-2 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-[10px] uppercase tracking-widest text-white/50">
                            API Key (optional for local)
                          </label>
                          <input
                            type="password"
                            value={llmDraft.apiKey || ""}
                            onChange={(e) =>
                              setLlmDraft((prev) => ({ ...prev, apiKey: e.target.value || undefined }))
                            }
                            placeholder="sk-..."
                            className="bg-black/35 border border-white/15 rounded-sm px-2 py-2 text-xs text-white"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={runLlmConnectionTest}
                        disabled={isTestingLlm}
                        className={[
                          "px-3 py-2 rounded-sm border transition-all text-[10px] font-bold tracking-widest uppercase",
                          isTestingLlm
                            ? "bg-white/5 border-white/10 text-white/50 cursor-wait"
                            : "bg-white/5 border-white/10 hover:bg-white/10",
                        ].join(" ")}
                      >
                        {isTestingLlm ? "Testing..." : "Test Connection"}
                      </button>
                      <button
                        onClick={saveLlmSettingsFromDraft}
                        className="px-3 py-2 rounded-sm bg-fps-accent text-black hover:bg-sky-300 transition-all text-[10px] font-bold tracking-widest uppercase"
                      >
                        Save Settings
                      </button>
                      <button
                        onClick={resetLlmSettingsToDefaults}
                        className="px-3 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-bold tracking-widest uppercase"
                      >
                        Reset
                      </button>
                    </div>
                    {llmTestResult && (
                      <div
                        className={[
                          "text-[11px] px-2 py-2 rounded-sm border",
                          llmTestResult.ok
                            ? "text-emerald-200 border-emerald-400/35 bg-emerald-950/30"
                            : "text-red-200 border-red-400/35 bg-red-950/30",
                        ].join(" ")}
                      >
                        {llmTestResult.message}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {diagnosisResult && diagnosisResult !== "READY" ? (
                <div className="bg-black/40 border border-fps-accent/30 rounded p-4 font-mono text-xs leading-relaxed text-sky-100 max-h-60 overflow-y-auto">
                  <div className="text-[10px] font-bold text-fps-accent mb-2 uppercase">
                    /// Analysis Complete
                  </div>
                  {diagnosisResult}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-white/30 space-y-2">
                  <Activity size={32} className="opacity-20" />
                  <span className="text-xs uppercase tracking-widest">Ready for Analysis</span>
                </div>
              )}

              <button
                onClick={handleDiagnosis}
                disabled={isDiagnosing}
                className={[
                  "w-full py-4 rounded-sm font-bold tracking-[0.2em] text-xs uppercase transition-all flex items-center justify-center gap-3",
                  isDiagnosing
                    ? "bg-fps-accent/10 text-fps-accent cursor-wait"
                    : "bg-fps-accent text-black hover:bg-sky-300 shadow-lg shadow-sky-900/50",
                ].join(" ")}
              >
                {isDiagnosing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing Neural Stream...
                  </>
                ) : (
                  <>INITIATE DIAGNOSIS</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
