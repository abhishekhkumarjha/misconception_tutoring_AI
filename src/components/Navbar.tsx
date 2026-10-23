import React from 'react';
import { Bot, Sparkles, BookOpen, Activity, RotateCcw, PlusCircle, Code, Calculator, Layers } from 'lucide-react';
import { MathProblem, SubjectType } from '../types';

interface NavbarProps {
  problems: MathProblem[];
  currentProblem: MathProblem;
  activeSubject: SubjectType;
  onSelectSubject: (subject: SubjectType) => void;
  onSelectProblem: (problem: MathProblem) => void;
  onOpenCustomProblem: () => void;
  onOpenOverview?: () => void;
  onToggleArchitecture: () => void;
  isArchitectureOpen: boolean;
  onResetSession: () => void;
  isSolved: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  problems,
  currentProblem,
  activeSubject,
  onSelectSubject,
  onSelectProblem,
  onOpenCustomProblem,
  onOpenOverview,
  onToggleArchitecture,
  isArchitectureOpen,
  onResetSession,
  isSolved,
}) => {
  return (
    <header id="main-header" className="sticky top-0 z-30 bg-[#03040a]/80 backdrop-blur-xl border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div
          className={`flex items-center gap-2.5 ${onOpenOverview ? 'cursor-pointer group' : ''}`}
          onClick={onOpenOverview}
          title={onOpenOverview ? 'Click to view UniTutor AI Architecture & Datasets' : undefined}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-white/15 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-sm sm:text-base bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent font-mono">
                UniTutor AI
              </span>
              <span className="text-[10px] text-slate-500 font-medium">by</span>
              <span className="text-[11px] font-bold text-cyan-400">AK</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/25">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                Dual-Engine AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Math &amp; Python Misconception-Aware Tutor
            </p>
          </div>
        </div>

        {/* Center: Subject Switcher Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/15 shadow-inner">
          <button
            onClick={() => onSelectSubject('math')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubject === 'math'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            <span>Math</span>
          </button>
          <button
            onClick={() => onSelectSubject('python')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubject === 'python'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>Python</span>
          </button>
          <button
            onClick={() => onSelectSubject('cross_domain')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubject === 'cross_domain'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Math + Python</span>
            <span className="xs:hidden">Cross</span>
          </button>
        </div>

        {/* Right Controls & Problem Selector */}
        <div className="flex items-center gap-2">
          {/* Problem Selector Dropdown */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 bg-slate-900/70 border border-white/15 backdrop-blur-md rounded-xl px-2 py-1 text-xs text-slate-200 shadow-inner">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400 hidden sm:block" />
              <select
                id="problem-selector"
                value={currentProblem.id}
                onChange={(e) => {
                  if (e.target.value === '__NEW_CUSTOM__') {
                    onOpenCustomProblem();
                    return;
                  }
                  const found = problems.find((p) => p.id === e.target.value);
                  if (found) onSelectProblem(found);
                }}
                className="bg-transparent font-medium text-slate-200 outline-none cursor-pointer max-w-[130px] sm:max-w-[200px] md:max-w-[260px] truncate [&>option]:bg-slate-900 [&>option]:text-slate-100 [&>optgroup]:bg-slate-950 [&>optgroup]:text-slate-400"
              >
                <option value="__NEW_CUSTOM__" className="font-bold text-cyan-400 bg-slate-950">
                  ✨ + Enter Custom Problem...
                </option>
                {problems.some((p) => p.id.startsWith('custom-')) && (
                  <optgroup label="Your Custom Problems">
                    {problems
                      .filter((p) => p.id.startsWith('custom-'))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          ✏️ {p.title} ({p.topic})
                        </option>
                      ))}
                  </optgroup>
                )}
                {problems.some((p) => p.source === 'eedi_dq') && (
                  <optgroup label="🎯 Diagnostic Questions (EEDI)">
                    {problems
                      .filter((p) => p.source === 'eedi_dq')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          🎯 {p.title} ({p.topic})
                        </option>
                      ))}
                  </optgroup>
                )}
                <optgroup label="🚀 Beginner — Foundational">
                  {problems
                    .filter((p) => p.source !== 'eedi_dq' && !p.id.startsWith('custom-') && (p.level === 'Beginner' || p.difficulty === 'Easy'))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🚀 {p.title}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🧠 Intermediate — Standard">
                  {problems
                    .filter((p) => p.source !== 'eedi_dq' && !p.id.startsWith('custom-') && (p.level === 'Intermediate' || (!p.level && p.difficulty === 'Medium')))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🧠 {p.title}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🔥 Advanced — Challenge">
                  {problems
                    .filter((p) => p.source !== 'eedi_dq' && !p.id.startsWith('custom-') && (p.level === 'Advanced' || (!p.level && p.difficulty === 'Hard')))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🔥 {p.title}
                      </option>
                    ))}
                </optgroup>
              </select>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ${
                  (currentProblem.level || currentProblem.difficulty) === 'Beginner' || currentProblem.difficulty === 'Easy'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : (currentProblem.level || currentProblem.difficulty) === 'Advanced' || currentProblem.difficulty === 'Hard'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
                title={`Level: ${currentProblem.level || currentProblem.difficulty}`}
              >
                {currentProblem.level || currentProblem.difficulty}
              </span>
            </div>
          </div>

          {/* New / Custom Problem */}
          <button
            id="custom-problem-btn"
            onClick={onOpenCustomProblem}
            title="Create a custom problem"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl border border-indigo-400/30 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/40 hover:to-purple-600/40 text-xs font-semibold text-indigo-200 hover:text-white transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Custom</span>
          </button>

          {/* Architecture & Evaluation Inspector Button */}
          <button
            id="architecture-toggle-btn"
            onClick={onToggleArchitecture}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isArchitectureOpen
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40'
                : 'bg-slate-900/60 border border-white/10 text-slate-300 hover:bg-slate-800/70 hover:text-white backdrop-blur-md'
            }`}
            title="Inspect Dual-Engine Architecture & Live Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Diagnostics</span>
          </button>

          {/* Reset Current Session Button */}
          <button
            id="reset-session-btn"
            onClick={onResetSession}
            title="Restart problem session"
            className="p-1 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
