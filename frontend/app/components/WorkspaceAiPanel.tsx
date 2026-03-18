"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, apiJson } from "../lib/api";
import { AiMessage, AiQueryResponse, AiSession, AiSessionMessagesResponse, AiStatusResponse } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, Copy, Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What are my overdue high-priority tasks by project?",
  "Summarize what I should focus on today.",
  "Which projects have the most pending tasks?",
];

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Unknown server error.";
  }

  const maybeMessage = (payload as { message?: unknown }).message;
  if (typeof maybeMessage === "string") {
    return maybeMessage;
  }
  if (Array.isArray(maybeMessage)) {
    return maybeMessage.join(", ");
  }

  return "Request failed. Please try again.";
}

export default function WorkspaceAiPanel() {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusInfo, setStatusInfo] = useState<AiStatusResponse | null>(null);
  const [contextStats, setContextStats] = useState<AiQueryResponse["contextStats"] | null>(null);
  const [modelUsed, setModelUsed] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );

  const loadSessions = useCallback(async () => {
    const { response, payload } = await apiJson<AiSession[]>("/ai/sessions");
    if (!response.ok || !Array.isArray(payload)) {
      return;
    }

    setSessions(payload);
    if (!selectedSessionId && payload.length > 0) {
      setSelectedSessionId(payload[0].id);
    }
  }, [selectedSessionId]);

  const loadStatus = useCallback(async () => {
    const { response, payload } = await apiJson<AiStatusResponse>("/ai/status");
    if (!response.ok || !payload) {
      return;
    }
    setStatusInfo(payload);
  }, []);

  const loadMessages = useCallback(async (sessionId: number) => {
    setIsLoadingMessages(true);
    setErrorMessage("");

    const { response, payload } = await apiJson<AiSessionMessagesResponse>(`/ai/sessions/${sessionId}/messages`);
    if (!response.ok || !payload) {
      setErrorMessage(extractErrorMessage(payload));
      setIsLoadingMessages(false);
      return;
    }

    setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    setIsLoadingMessages(false);
  }, []);

  const createSession = useCallback(async () => {
    const { response, payload } = await apiJson<AiSession>("/ai/sessions", {
      method: "POST",
      body: JSON.stringify({ title: "New AI Session" }),
    });

    if (!response.ok || !payload) {
      setErrorMessage(extractErrorMessage(payload));
      return;
    }

    await loadSessions();
    setSelectedSessionId(payload.id);
    setMessages([]);
  }, [loadSessions]);

  const deleteCurrentSession = useCallback(async () => {
    if (!selectedSessionId) return;

    const { response, payload } = await apiJson<{ success: boolean }>(`/ai/sessions/${selectedSessionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setErrorMessage(extractErrorMessage(payload));
      return;
    }

    const remaining = sessions.filter((session) => session.id !== selectedSessionId);
    setSessions(remaining);
    setSelectedSessionId(remaining[0]?.id || null);
    setMessages([]);
    setContextStats(null);
    setModelUsed("");
  }, [selectedSessionId, sessions]);

  const submitQuestion = useCallback(async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    const optimisticUserMessage: AiMessage = {
      id: Date.now(),
      role: "user",
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);

    const { response, payload } = await apiJson<AiQueryResponse>("/ai/query", {
      method: "POST",
      body: JSON.stringify({
        question: trimmedQuestion,
        sessionId: selectedSessionId ?? undefined,
      }),
    });

    if (!response.ok || !payload) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticUserMessage.id));
      setErrorMessage(extractErrorMessage(payload));
      setIsSending(false);
      return;
    }

    setQuestion("");
    setSelectedSessionId(payload.sessionId);
    setContextStats(payload.contextStats);
    setModelUsed(payload.modelUsed);

    await loadSessions();
    await loadMessages(payload.sessionId);

    await apiFetch("/memory/contexts", {
      method: "POST",
      body: JSON.stringify({
        scope: "ai-panel",
        context: {
          selectedSessionId: payload.sessionId,
        },
      }),
    });

    setIsSending(false);
  }, [isSending, loadMessages, loadSessions, question, selectedSessionId]);

  function askQuestion(event: FormEvent) {
    event.preventDefault();
    void submitQuestion();
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submitQuestion();
    }
  }

  async function copyAssistantMessage(message: AiMessage) {
    if (message.role !== "assistant") {
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 1400);
    } catch {
      setErrorMessage("Unable to copy message.");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSessions();
      void loadStatus();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadSessions, loadStatus]);

  useEffect(() => {
    if (!selectedSessionId) return;

    const timer = setTimeout(() => {
      void loadMessages(selectedSessionId);
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedSessionId, loadMessages]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { response, payload } = await apiJson<Array<{ scope: string; context: { selectedSessionId?: number } }>>(
        "/memory/contexts",
      );

      if (!response.ok || !Array.isArray(payload)) {
        return;
      }

      const storedContext = payload.find((item) => item.scope === "ai-panel")?.context;
      if (storedContext?.selectedSessionId) {
        setSelectedSessionId(storedContext.selectedSessionId);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!messageContainerRef.current) {
      return;
    }

    messageContainerRef.current.scrollTo({
      top: messageContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <Card className="soft-enter overflow-hidden rounded-2xl border-stone-200 bg-white/95 p-0 shadow-sm shadow-stone-300/25">
      <div className="border-b border-stone-200 bg-stone-50/90 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-900">Workspace AI</h3>
              <span className={`inline-flex h-2 w-2 rounded-full ${statusInfo?.configured ? "bg-emerald-500" : "bg-amber-500"}`} />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500">
              <Sparkles className="h-3 w-3" />
              {statusInfo?.configured ? "Connected to Gemini" : "Running in local fallback mode"}
            </p>
          </div>

          <Button onClick={createSession} size="sm" variant="outline" className="h-7 border-stone-300 px-2 text-xs text-stone-700">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {sessions.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select
              value={selectedSessionId ? String(selectedSessionId) : undefined}
              onValueChange={(value) => setSelectedSessionId(Number(value))}
            >
              <SelectTrigger className="h-8 border-stone-200 bg-white text-xs">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.id)}>
                    {session.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={deleteCurrentSession}
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-red-700 hover:bg-red-50"
              disabled={!selectedSession}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuestion(prompt)}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left text-xs text-stone-600 hover:bg-stone-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <div ref={messageContainerRef} className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/70 p-2.5">
          {isLoadingMessages ? (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-stone-500">No conversation yet. Ask anything about your workspace data.</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`group rounded-lg border px-2.5 py-2 text-xs ${
                  message.role === "assistant"
                    ? "border-stone-200 bg-white text-stone-700"
                    : "border-stone-900/80 bg-stone-900 text-white"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="flex items-center gap-1 font-semibold uppercase tracking-wide opacity-70">
                    {message.role === "assistant" ? <Bot className="h-3 w-3" /> : null}
                    {message.role}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-60">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {message.role === "assistant" ? (
                      <button
                        type="button"
                        onClick={() => copyAssistantMessage(message)}
                        className="opacity-60 transition-opacity hover:opacity-100"
                        title="Copy"
                      >
                        {copiedMessageId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            ))
          )}
        </div>

        {contextStats ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="border-stone-300 text-[10px] text-stone-600">{contextStats.activeTaskCount} active</Badge>
            <Badge variant="outline" className="border-stone-300 text-[10px] text-stone-600">{contextStats.overdueTaskCount} overdue</Badge>
            <Badge variant="outline" className="border-stone-300 text-[10px] text-stone-600">{contextStats.projectCount} projects</Badge>
            {modelUsed ? (
              <Badge variant="outline" className="border-stone-300 text-[10px] text-stone-600">{modelUsed}</Badge>
            ) : null}
          </div>
        ) : null}

        <form className="space-y-2" onSubmit={askQuestion}>
          <div className="rounded-xl border border-stone-200 bg-white p-2">
            <textarea
              placeholder="Ask about all your workspace data"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={onComposerKeyDown}
              className="min-h-16 max-h-36 w-full resize-y rounded-md border-none bg-transparent text-sm outline-none"
              maxLength={2000}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-stone-500">Press Cmd/Ctrl + Enter to send</p>
            <Button
              type="submit"
              className="h-9 bg-stone-900 px-4 text-sm text-white hover:bg-stone-800"
              disabled={isSending || !question.trim()}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Thinking
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </form>

        {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
      </div>
    </Card>
  );
}
