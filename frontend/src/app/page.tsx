"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  Clock,
  FileText,
  LoaderCircle,
  Paperclip,
  X,
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { SERVER_URL, userId } from "@/lib/utils";
import { useCaseStore } from "@/stores/useCaseStore";

interface CaseSummary {
  caseId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  noticeDetails?: {
    noticeType?: string;
    demandAmount?: number;
    arnNumber?: string;
  };
  messages?: Array<{ content: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-zinc-700/60 text-zinc-300",
  ANALYZING: "bg-blue-900/50 text-blue-300",
  DOCS_NEEDED: "bg-yellow-900/50 text-yellow-300",
  DRAFTING: "bg-purple-900/50 text-purple-300",
  SUBMITTED: "bg-emerald-900/50 text-emerald-300",
  CLOSED: "bg-zinc-800 text-zinc-500",
};

function CaseHistorySection() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${SERVER_URL}/api/user/${userId}/cases`)
      .then((r) => r.json())
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
        <LoaderCircle className="w-4 h-4 animate-spin" />
        Loading history...
      </div>
    );
  }

  if (cases.length === 0) return null;

  return (
    <section className="w-full max-w-3xl mx-auto mt-16 px-4 pb-16">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Previous Cases
      </h2>
      <div className="grid gap-3">
        {cases.map((c) => {
          const preview = c.messages?.[0]?.content ?? "No description";
          const date = new Date(c.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const statusLabel = c.status.replace("_", " ");
          const statusCls = STATUS_STYLES[c.status] ?? STATUS_STYLES.OPEN;

          return (
            <button
              key={c.caseId}
              onClick={() => router.push(`/case/${c.caseId}`)}
              className="w-full text-left bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-sm rounded-2xl px-5 py-4 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mt-0.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    {c.noticeDetails?.noticeType && (
                      <p className="text-xs font-semibold text-emerald-700 mb-0.5">
                        {c.noticeDetails.noticeType}
                        {c.noticeDetails.arnNumber && (
                          <span className="text-gray-400 font-normal ml-1">
                            · {c.noticeDetails.arnNumber}
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 truncate leading-snug">
                      {preview}
                    </p>
                    {c.noticeDetails?.demandAmount !== undefined && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Demand: ₹
                        {c.noticeDetails.demandAmount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCls}`}
                  >
                    {statusLabel}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {date}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const QUICK_PROMPTS = [
  "I got an ASMT-10 notice, what should I do?",
  "My GSTR-2A and GSTR-3B don't match",
  "How do I respond to a DRC-01 demand?",
  "Can I reduce my GST demand amount?",
];

export default function App() {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const setPending = useCaseStore((s) => s.setPending);
  const router = useRouter();
  const handleSend = async () => {
    try {
      setLoading(true);
      if (!input.trim() && !file) return;

      setPending({ prompt: input.trim(), file });
      const response = await axios.post(`${SERVER_URL}/api/case/start`, {
        prompt: input.trim(),
        userId,
      });

      if (response.status === 201) {
        router.push(`/case/${response.data.caseId}`);
      }
    } catch (error) {
      console.log(`error creating new case ${error}`);
      alert(`something wents wrong`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#1a1a18] font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              N<span className="text-emerald-500">ō</span>tis
            </span>
          </div>
          <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
            AI Compliance Agent
          </span>
        </nav>

        <section className="flex flex-col items-center justify-center flex-1 text-center px-4 pt-16">
          <div className="mb-6 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Powered by CGST Act 2017 — Elastic + Gemini
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
            Got a GST notice?{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              We fight it for you.
            </span>
          </h1>

          <p className="text-gray-500 text-lg mb-4 max-w-xl">
            Describe your notice or upload it — Notis finds the exact law,
            calculates what you actually owe, and drafts your response.
          </p>

          {/* Social proof */}
          <p className="text-gray-400 text-sm mb-10">
            Most businesses pay{" "}
            <span className="text-emerald-600 font-semibold">2-3x more</span>{" "}
            than they owe. Notis fixes that.
          </p>

          <Card className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#111] p-0 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col gap-3 p-4">
              {/* File chip */}
              {file && (
                <div className="flex items-center gap-2 px-1">
                  <span className="flex items-center gap-1.5 bg-emerald-900/40 text-emerald-400 text-xs font-medium px-3 py-1 rounded-full border border-emerald-700/40">
                    <Paperclip className="h-3 w-3" />
                    {file.name}
                    <button
                      onClick={() => setFile(null)}
                      className="ml-1 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              )}

              <Textarea
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your notice — e.g. 'I received ASMT-10 for ITC mismatch of ₹45,000 for Q3 FY2024, ARN AR2402150001234'"
                className="min-h-24 resize-none md:text-base border-none bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full text-gray-400 hover:text-white cursor-pointer hover:bg-white/10 px-3"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Upload notice
                  </Button>
                  <span className="text-xs text-gray-600">PDF, JPG, PNG</span>
                </div>

                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={(!input.trim() && !file) || loading}
                  className="rounded-full text-gray-400 bg-gray-100/20 hover:bg-gray-100/10 cursor-pointer px-3 hover:text-white disabled:opacity-30"
                >
                  {loading ? (
                    <LoaderCircle className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick prompts */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs cursor-pointer text-gray-500 bg-white/60 hover:bg-white border border-gray-200 px-3 py-1.5 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* <CaseHistorySection /> */}
      </div>
    </main>
  );
}
