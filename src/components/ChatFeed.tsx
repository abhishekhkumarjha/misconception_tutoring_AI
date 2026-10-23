import React, { useState } from 'react';
import { Bot, User, HelpCircle, CheckCircle, ChevronDown, ChevronUp, Cpu, Sparkles, Terminal, ShieldCheck, Search } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatFeedProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, isLoading }) => {
  const [expandedPipelineIds, setExpandedPipelineIds] = useState<Record<string, boolean>>({});

  const togglePipeline = (id: string) => {
    setExpandedPipelineIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getErrorBadge = (errorType?: string, errorSummary?: string) => {
    const summaryLower = (errorSummary || '').toLowerCase();
    if (summaryLower.includes('inquiry') || summaryLower.includes('hint') || summaryLower.includes('starter')) {
      return <span className="bg-cyan-500/20 text-cyan-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30">Guided Inquiry</span>;
    }

    switch (errorType) {
      case 'none':
        return <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">Correct Approach</span>;
      case 'incomplete_step':
        return <span className="bg-amber-500/20 text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">Incomplete Step</span>;
      case 'sign_error':
        return <span className="bg-rose-500/20 text-rose-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">Sign / Inverse Operation Error</span>;
      case 'order_of_operations':
        return <span className="bg-purple-500/20 text-purple-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">Order of Operations</span>;
      case 'distributive_property':
        return <span className="bg-blue-500/20 text-blue-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">Distributive Property</span>;
      case 'combining_like_terms':
        return <span className="bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">Combining Like Terms</span>;
      case 'conceptual_misconception':
      case 'conceptual_error':
        return <span className="bg-orange-500/20 text-orange-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-orange-500/30">Documented Misconception</span>;
      case 'runtime_error':
        return <span className="bg-rose-500/20 text-rose-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">Runtime Exception</span>;
      case 'SyntaxError':
        return <span className="bg-yellow-500/20 text-yellow-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-yellow-500/30">Syntax Error</span>;
      default:
        return null;
    }
  };

  const isCodeLike = (text: string) => {
    return (
      text.includes('def ') ||
      text.includes('for ') ||
      text.includes('while ') ||
      text.includes('print(') ||
      text.includes('return ') ||
      text.includes('import ') ||
      text.includes('range(') ||
      (text.includes('=') && text.includes('\n'))
    );
  };

  return (
    <div id="chat-feed-container" className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2">
      {messages.map((message) => {
        const isStudent = message.sender === 'student';
        const isSystem = message.sender === 'system';
        const isPipelineOpen = Boolean(expandedPipelineIds[message.id]);

        if (isSystem) {
          return (
            <div key={message.id} className="text-center my-3">
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-slate-900/60 text-slate-300 border border-white/10">
                {message.text}
              </span>
            </div>
          );
        }

        if (isStudent) {
          const hasCode = isCodeLike(message.text);
          return (
            <div
              key={message.id}
              className="flex justify-end gap-2.5 items-start max-w-2xl ml-auto animate-fadeIn"
            >
              <div className="flex flex-col items-end space-y-1 w-full max-w-xl">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Student</span>
                  <span className="text-[10px] text-cyan-300 lowercase bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                    {hasCode ? 'code submission' : message.attemptType === 'step' ? 'step attempt' : 'final answer'}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg font-mono text-sm leading-relaxed max-w-full break-words border border-indigo-400/30 w-full">
                  {hasCode ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-indigo-100 bg-black/25 p-2 rounded-lg border border-white/10">
                      {message.text}
                    </pre>
                  ) : (
                    <span>{message.text}</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-white/10 shadow-xs mt-1">
                <User className="w-4 h-4" />
              </div>
            </div>
          );
        }

        // Tutor Message
        const isPythonTutor = message.analysis?.trace || message.text.includes('Python') || message.analysis?.candidatesConsidered;

        return (
          <div
            key={message.id}
            className="flex justify-start gap-2.5 items-start max-w-2xl mr-auto animate-fadeIn"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-600/30 border border-white/15 mt-1">
              <Bot className="w-4 h-4" />
            </div>

            <div className="flex flex-col space-y-2 flex-1 min-w-0">
              {/* Tutor Tag & Strategy */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  {isPythonTutor ? 'UniTutor Python Assistant' : 'UniTutor Math Assistant'}
                </span>
                {message.analysis && getErrorBadge(message.analysis.errorType, message.analysis.errorSummary)}
                {message.pedagogical && (
                  <span className="text-[10px] font-medium text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30 capitalize">
                    {message.pedagogical.talkMove ? `<${message.pedagogical.talkMove}>` : message.pedagogical.strategy.toLowerCase().replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Main Tutor Dialogue Bubble */}
              <div className="bg-[#060814]/70 backdrop-blur-[2px] border border-cyan-500/20 rounded-2xl rounded-tl-sm p-4 shadow-xl text-slate-100 text-sm leading-relaxed space-y-3">
                <p className="whitespace-pre-wrap">{message.text}</p>

                {/* Socratic Guiding Question Box */}
                {message.pedagogical?.nextRecommendedPrompt && (
                  <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-cyan-500/30 rounded-xl space-y-1 shadow-inner">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Socratic Guiding Question:</span>
                    </div>
                    <p className="text-xs font-medium text-cyan-100 italic">
                      &ldquo;{message.pedagogical.nextRecommendedPrompt}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Expandable Dual-Engine Pipeline Inspector */}
              {message.analysis && (
                <div className="border border-white/10 bg-slate-950/60 backdrop-blur-[2px] rounded-xl overflow-hidden transition-all text-xs">
                  <button
                    onClick={() => togglePipeline(message.id)}
                    className="w-full px-3 py-2 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {message.analysis.trace
                          ? 'Python Enhanced Model Diagnostics (Trace · Verification · RAG)'
                          : 'Tutoring Pipeline Diagnostics (RAG Grounding · TalkMoves)'}
                      </span>
                    </div>
                    {isPipelineOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isPipelineOpen && (
                    <div className="p-3 border-t border-white/10 space-y-2.5 bg-slate-900/80">
                      {/* Stage 1: Misconception Diagnosis */}
                      <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-300 text-[11px] flex items-center gap-1">
                            <Search className="w-3 h-3 text-purple-400" /> 1. Misconception Diagnosis
                          </span>
                          <span className="text-[10px] text-purple-400 font-semibold">
                            {message.analysis.isCorrect ? 'Logic Sound' : message.analysis.errorType}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          <strong>Diagnosis:</strong> {message.analysis.errorSummary || 'Attempt analyzed.'}
                        </p>
                        {message.analysis.studentRationale && (
                          <p className="text-slate-400 text-[11px]">
                            <strong>Student Rationale:</strong> {message.analysis.studentRationale}
                          </p>
                        )}

                        {/* Python Mental Execution Trace */}
                        {message.analysis.trace && (
                          <div className="mt-2 pt-2 border-t border-purple-500/20 space-y-1">
                            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                              <Terminal className="w-3 h-3" /> Mental Execution Trace (&lt;trace&gt;):
                            </span>
                            <pre className="text-[10px] font-mono text-emerald-300 bg-slate-950 p-2 rounded border border-emerald-500/20 whitespace-pre-wrap leading-relaxed">
                              {message.analysis.trace}
                            </pre>
                          </div>
                        )}

                        {/* Python Correctness Verification */}
                        {message.analysis.verification && (
                          <div className="mt-1 pt-1 border-t border-purple-500/20 space-y-0.5">
                            <span className="text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> False-Positive Verification (&lt;verification&gt;):
                            </span>
                            <p className="text-[10px] text-cyan-200/90 italic">
                              {message.analysis.verification}
                            </p>
                          </div>
                        )}

                        {/* RAG Reference Candidates Considered */}
                        {message.analysis.candidatesConsidered && message.analysis.candidatesConsidered.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-purple-500/20 space-y-0.5">
                            <span className="text-[10px] font-semibold text-amber-300">
                              MisconAI Candidates Injected:
                            </span>
                            <ul className="text-[10px] text-slate-300 list-disc list-inside">
                              {message.analysis.candidatesConsidered.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Stage 2: Socratic Pedagogical Strategy */}
                      {message.pedagogical && (
                        <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-300 text-[11px]">2. Socratic Pedagogical Strategy</span>
                            <span className="text-[10px] text-blue-400 font-semibold">
                              {message.pedagogical.talkMove ? `TalkMove: <${message.pedagogical.talkMove}>` : `Tier ${message.pedagogical.hintLevel} Hint`}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px]">
                            <strong>Educational Goal:</strong> {message.pedagogical.pedagogicalGoal}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Socratic Rule Adhered: Complete solution kept concealed to prompt self-discovery</span>
                          </div>
                        </div>
                      )}

                      {/* Stage 3: Response Formatter & Metrics */}
                      {message.evaluation && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-300 text-[11px]">3. Response Formatter &amp; Metrics</span>
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              Detection Accuracy: {message.evaluation.errorDetectionAccuracy}%
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                            <div>Hint Quality: <span className="font-semibold text-slate-200">{message.evaluation.hintQualityScore}%</span></div>
                            <div>Pedagogical Score: <span className="font-semibold text-slate-200">{message.evaluation.pedagogicalEffectiveness}%</span></div>
                          </div>
                          {message.evaluation.exemplarsUsed && message.evaluation.exemplarsUsed.length > 0 && (
                            <div className="pt-1 text-[10px] text-cyan-300/80 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>Grounding: {message.evaluation.exemplarsUsed.join(' · ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <span className="text-[10px] text-slate-500 pl-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex justify-start gap-2.5 items-start max-w-md mr-auto animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 animate-spin" />
          </div>
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl rounded-tl-sm p-4 shadow-xl space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-xs font-semibold text-cyan-300">
                UniTutor analyzing submission &amp; tracing mental execution...
              </span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded w-3/4"></div>
            <div className="h-2.5 bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );
};
