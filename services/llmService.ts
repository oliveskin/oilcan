import { GoogleGenAI } from "@google/genai";
import { LogEntry, TinmanEvent } from "../types";

export type LlmProvider = "none" | "gemini" | "openai-compatible";

export type LlmRuntimeConfig = {
  provider: LlmProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  systemInstruction?: string;
  temperature?: number;
};

export type BridgeRuntimeConfig = {
  host?: string;
  port?: number;
  token?: string;
};

export type LlmConnectionResult = {
  ok: boolean;
  message: string;
};

type OilcanRuntimeConfig = {
  llm?: Partial<LlmRuntimeConfig>;
  bridge?: Partial<BridgeRuntimeConfig>;
};

declare global {
  interface Window {
    __OILCAN_CONFIG__?: OilcanRuntimeConfig;
  }
}

const STORAGE_KEY = "oilcan.llm.config.v1";

const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_SYSTEM_INSTRUCTION =
  "You are an expert AI Engineer debugging an autonomous agent system.";
const DEFAULT_TEMPERATURE = 0.2;

const DEFAULT_CONFIG: LlmRuntimeConfig = {
  provider: "none",
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
  temperature: DEFAULT_TEMPERATURE,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeProvider(value: unknown): LlmProvider {
  if (value === "gemini" || value === "openai-compatible" || value === "none") return value;
  return "none";
}

function normalizeTemperature(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function normalizePort(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value < 1 || value > 65535) return undefined;
  return Math.floor(value);
}

function withProviderDefaults(config: LlmRuntimeConfig): LlmRuntimeConfig {
  const next = { ...config };
  if (next.provider === "gemini") {
    next.model = next.model || GEMINI_DEFAULT_MODEL;
  }
  if (next.provider === "openai-compatible") {
    next.baseUrl = next.baseUrl || OPENAI_DEFAULT_BASE_URL;
    next.model = next.model || OPENAI_DEFAULT_MODEL;
  }
  next.systemInstruction = next.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
  if (typeof next.temperature !== "number") next.temperature = DEFAULT_TEMPERATURE;
  return next;
}

function sanitizeConfig(input: Partial<LlmRuntimeConfig> | undefined): LlmRuntimeConfig {
  const provider = normalizeProvider(input?.provider);
  return withProviderDefaults({
    provider,
    apiKey: normalizeText(input?.apiKey),
    model: normalizeText(input?.model),
    baseUrl: normalizeText(input?.baseUrl),
    systemInstruction: normalizeText(input?.systemInstruction),
    temperature: normalizeTemperature(input?.temperature),
  });
}

function readBootstrapConfig(): OilcanRuntimeConfig | undefined {
  if (!isBrowser()) return undefined;
  return window.__OILCAN_CONFIG__;
}

function readStoredConfig(): Partial<LlmRuntimeConfig> | undefined {
  if (!isBrowser()) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<LlmRuntimeConfig>;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStoredConfig(config: LlmRuntimeConfig): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write failures (private mode/quota).
  }
}

export function getLlmConfig(): LlmRuntimeConfig {
  const bootstrap = readBootstrapConfig()?.llm;
  const stored = readStoredConfig();
  return sanitizeConfig({
    ...DEFAULT_CONFIG,
    ...bootstrap,
    ...stored,
  });
}

export function saveLlmConfig(partial: Partial<LlmRuntimeConfig>): LlmRuntimeConfig {
  const current = getLlmConfig();
  const next = sanitizeConfig({ ...current, ...partial });
  writeStoredConfig(next);
  return next;
}

export function resetLlmConfig(): LlmRuntimeConfig {
  const next = sanitizeConfig({
    ...DEFAULT_CONFIG,
    ...readBootstrapConfig()?.llm,
  });
  writeStoredConfig(next);
  return next;
}

export function getBridgeConfig(): BridgeRuntimeConfig {
  const bootstrap = readBootstrapConfig();
  const bridge = bootstrap?.bridge;
  return {
    host: normalizeText(bridge?.host),
    port: normalizePort(bridge?.port),
    token: normalizeText(bridge?.token),
  };
}

function toChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function buildPrompt(logs: LogEntry[], agentContext: string): string {
  const recentLogs = logs
    .slice(-50)
    .map((l) => `[${l.timestamp}] [${l.level}]: ${l.message}`)
    .join("\n");

  return `
You are "Doctor Tinman", an expert debugger for Autonomous AI Agents.

Here is the current context of the agent:
${agentContext}

Here are the recent execution logs:
${recentLogs}

Please provide a concise analysis:
1. What is the agent currently trying to do?
2. Are there any loops, hallucinations, or errors detected?
3. Suggest one concrete optimization or fix.

Keep the tone technical but helpful.
  `.trim();
}

function extractOpenAiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const choice = choices[0];
  if (!choice || typeof choice !== "object") return null;
  const message = (choice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") return content.trim() || null;
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => {
        if (typeof p === "string") return p;
        if (!p || typeof p !== "object") return "";
        const text = (p as Record<string, unknown>).text;
        return typeof text === "string" ? text : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    return parts || null;
  }
  return null;
}

async function callGemini(config: LlmRuntimeConfig, prompt: string): Promise<string> {
  if (!config.apiKey) {
    return "Doctor Tinman is offline: Gemini provider selected but no API key is set.";
  }
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const response = await ai.models.generateContent({
    model: config.model || GEMINI_DEFAULT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: config.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    },
  });
  return response.text || "No analysis generated.";
}

async function callOpenAiCompatible(config: LlmRuntimeConfig, prompt: string): Promise<string> {
  const baseUrl = config.baseUrl || OPENAI_DEFAULT_BASE_URL;
  const url = toChatCompletionsUrl(baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || OPENAI_DEFAULT_MODEL,
      messages: [
        { role: "system", content: config.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 240);
    return `Doctor Tinman request failed (${response.status}): ${body || response.statusText}`;
  }

  const payload = (await response.json()) as unknown;
  const text = extractOpenAiText(payload);
  return text || "No analysis generated.";
}

async function runPrompt(config: LlmRuntimeConfig, prompt: string): Promise<string> {
  if (config.provider === "gemini") {
    return callGemini(config, prompt);
  }
  return callOpenAiCompatible(config, prompt);
}

export function describeLlmConfig(config: LlmRuntimeConfig): string {
  if (config.provider === "none") return "Disabled";
  if (config.provider === "gemini") return `Gemini (${config.model || GEMINI_DEFAULT_MODEL})`;
  return `OpenAI-compatible (${config.model || OPENAI_DEFAULT_MODEL})`;
}

export async function analyzeLogs(
  logs: LogEntry[],
  agentContext: string,
  config: LlmRuntimeConfig
): Promise<string> {
  if (config.provider === "none") {
    return "Doctor Tinman is offline. Configure an LLM provider in Diagnose -> LLM Settings.";
  }

  const prompt = buildPrompt(logs, agentContext);

  try {
    return await runPrompt(config, prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Doctor Tinman analysis failed:", error);
    return `Failed to contact configured LLM provider: ${message}`;
  }
}

function formatEventForPrompt(event: TinmanEvent): string {
  const detailsJson = JSON.stringify(event.details ?? {}, null, 2);
  const trimmedDetails = detailsJson.length > 5000 ? `${detailsJson.slice(0, 5000)}\n...` : detailsJson;

  return [
    `type: ${event.type}`,
    `severity: ${event.severity ?? "S0"}`,
    `sector: ${event.sector ?? "SYSTEM"}`,
    `timestamp: ${event.timestamp}`,
    `message: ${event.message}`,
    `details:`,
    trimmedDetails,
  ].join("\n");
}

export async function explainEventWithLlm(
  event: TinmanEvent,
  config: LlmRuntimeConfig
): Promise<LlmConnectionResult> {
  if (config.provider === "none") {
    return {
      ok: false,
      message: "LLM is disabled. Enable a provider in LLM Settings to use AI explanations.",
    };
  }

  const prompt = `
Explain the security event below for a non-technical product user.

Requirements:
- Use plain English.
- Keep it concise (4-8 short bullet points).
- Include:
  1) What happened
  2) Why it matters
  3) What the user should do next
- Avoid jargon and internal code words when possible.

Event:
${formatEventForPrompt(event)}
`.trim();

  try {
    const text = await runPrompt(config, prompt);
    if (text.startsWith("Doctor Tinman request failed (")) {
      return { ok: false, message: text };
    }
    return { ok: true, message: text || "No explanation generated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `AI explanation failed: ${message}` };
  }
}

export async function testLlmConnection(config: LlmRuntimeConfig): Promise<LlmConnectionResult> {
  if (config.provider === "none") {
    return {
      ok: false,
      message: "LLM is disabled. Select Gemini or OpenAI-compatible to test a connection.",
    };
  }

  if (config.provider === "gemini") {
    if (!config.apiKey) {
      return {
        ok: false,
        message: "Gemini API key is missing.",
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model || GEMINI_DEFAULT_MODEL,
        contents: "Reply with exactly: OK",
        config: {
          temperature: 0,
          systemInstruction: config.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        },
      });
      const text = (response.text || "").trim();
      return {
        ok: true,
        message: text ? `Connected (Gemini): ${text.slice(0, 120)}` : "Connected (Gemini).",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        message: `Gemini connection failed: ${message}`,
      };
    }
  }

  try {
    const baseUrl = config.baseUrl || OPENAI_DEFAULT_BASE_URL;
    const url = toChatCompletionsUrl(baseUrl);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model || OPENAI_DEFAULT_MODEL,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        temperature: 0,
        max_tokens: 8,
      }),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 240);
      return {
        ok: false,
        message: `OpenAI-compatible connection failed (${response.status}): ${
          body || response.statusText
        }`,
      };
    }

    const payload = (await response.json()) as unknown;
    const text = extractOpenAiText(payload);
    return {
      ok: true,
      message: text
        ? `Connected (OpenAI-compatible): ${text.slice(0, 120)}`
        : "Connected (OpenAI-compatible).",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `OpenAI-compatible connection failed: ${message}`,
    };
  }
}
