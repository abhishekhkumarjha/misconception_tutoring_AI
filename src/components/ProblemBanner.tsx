import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Play, Sparkles, PlusCircle, Rocket, Brain, Flame, Code, Calculator, Layers, Terminal } from 'lucide-react';
import { MathProblem } from '../types';

interface ProblemBannerProps {
  problem: MathProblem;
  isSolved: boolean;
  onTryExample: (attemptText: string) => void;
  attemptsCount: number;
  onOpenCustomProblem?: () => void;
}

export const ProblemBanner: React.FC<ProblemBannerProps> = ({
  problem,
  isSolved,
  onTryExample,
  attemptsCount,
  onOpenCustomProblem,
}) => {
  const [showHints, setShowHints] = useState(false);

  const difficultyColors: Record<string, string> = {
    Easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Hard: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    Beginner: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Advanced: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };

  const levelConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    Beginner: {
      label: 'Beginner',
      icon: <Rocket className="w-3 h-3" />,
      cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40',
    },
    Intermediate: {
      label: 'Intermediate',
      icon: <Brain className="w-3 h-3" />,
      cls: 'bg-amber-900/40 text-amber-300 border-amber-500/40',
    },
    Advanced: {
      label: 'Advanced',
      icon: <Flame className="w-3 h-3" />,
      cls: 'bg-rose-900/40 text-rose-300 border-rose-500/40',
    },
  };

  const isPython = problem.subjectType === 'python' || Boolean(problem.starterCode);
  const isCrossDomain = problem.subjectType === 'cross_domain';

  return (
    <div
      id="problem-banner-card"
      className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Topic, Subject & Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Subject Badge */}
          {isCrossDomain ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-xs">
              <Layers className="w-3 h-3 text-amber-400" />
              Math + Python
            </span>
          ) : isPython ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1 shadow-xs">
              <Code className="w-3 h-3 text-emerald-400" />
              Python Programming
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 flex items-center gap-1 shadow-xs">
              <Calculator className="w-3 h-3 text-cyan-400" />
              Mathematics
            </span>
          )}

          {problem.source === 'eedi_dq' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-xs">
              🎯 Diagnostic Question
            </span>
          )}
          {problem.source === 'miscon_ai' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 shadow-xs">
              🐍 MisconAI Taxonomy
            </span>
          )}
          {problem.source === 'custom' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-xs">
              ✏️ Student Custom Problem
            </span>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-white/10">
            {problem.topic}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${difficultyColors[problem.difficulty] || difficultyColors.Medium}`}
          >
            {problem.difficulty}
          </span>
          {/* Three-level category badge */}
          {problem.level && levelConfig[problem.level] && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${levelConfig[problem.level].cls}`}
              title={`Problem Level: ${problem.level}`}
            >
              {levelConfig[problem.level].icon}
              {levelConfig[problem.level].label}
            </span>
          )}
          {isSolved ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Solved!
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {attemptsCount === 0 ? 'Ready for your attempt' : `${attemptsCount} attempt${attemptsCount > 1 ? 's' : ''}`}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenCustomProblem && (
            <button
              id="banner-enter-own-problem-btn"
              onClick={onOpenCustomProblem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-200 hover:text-white border border-indigo-400/40 shadow-sm transition-all cursor-pointer"
              title="Enter any homework problem with your own numbers or code"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enter Custom Problem</span>
            </button>
          )}

          {/* Quick Example Attempt Button for Math */}
          {problem.problem.includes('2x + 5 = 15') && (
            <button
              id="try-architecture-example-btn"
              onClick={() => onTryExample('2x = 20')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
              title="Test a student sign error (2x = 20)"
            >
              <Play className="w-3 h-3 fill-slate-300 text-slate-300" />
              <span>Test Error: &quot;2x = 20&quot;</span>
            </button>
          )}

          {/* Quick Example Attempt for Python range */}
          {problem.starterCode && problem.id === 'py-001' && (
            <button
              onClick={() => onTryExample('for i in range(5):\n    print(i)')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 transition-colors cursor-pointer"
              title="Test the range boundary misconception"
            >
              <Play className="w-3 h-3 fill-emerald-300 text-emerald-300" />
              <span>Test Range Misconception</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Problem Statement */}
      <div className="mt-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight bg-slate-950/70 px-4 py-3 rounded-xl border border-white/10 block whitespace-pre-wrap shadow-inner">
          {problem.problem}
        </h2>
      </div>

      {/* Python Starter Code Box if applicable */}
      {problem.starterCode && (
        <div className="mt-3 rounded-xl bg-slate-950/90 border border-emerald-500/25 p-3 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" /> Starter Python Code
            </span>
            <button
              onClick={() => onTryExample(problem.starterCode || '')}
              className="text-cyan-300 hover:text-cyan-200 underline cursor-pointer text-[11px]"
            >
              Load Code into Chat
            </button>
          </div>
          <pre className="text-emerald-300 leading-relaxed">{problem.starterCode}</pre>
          {problem.expectedOutput && (
            <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-slate-300">Expected Output:</span>
              <code className="text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-white/10 font-bold">
                {problem.expectedOutput.replace(/\n/g, ' ')}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Interactive Options if Multiple Choice / Diagnostic Question */}
      {problem.options && Object.keys(problem.options).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Select an option to test your understanding:
            </span>
            <span className="text-[11px] text-slate-400 font-normal">Click any choice to test tutor guidance</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(problem.options).map(([letter, text]) => (
              <button
                key={letter}
                onClick={() => onTryExample(`I choose (${letter}): ${text.replace(/\n/g, ' ')}`)}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-white/10 bg-slate-950/50 hover:bg-indigo-950/50 hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white font-bold text-xs shrink-0 transition-colors">
                  {letter}
                </span>
                <span className="text-xs text-slate-200 font-medium leading-relaxed pt-0.5">
                  {text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar / Toggle Hints */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <p className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            {isPython
              ? 'Submit your Python code or question. The tutor will trace your logic and guide you Socratic-style.'
              : 'Submit your step or final answer below. The tutor will guide you through any mistakes.'}
          </span>
        </p>

        <button
          id="toggle-hints-btn"
          onClick={() => setShowHints(!showHints)}
          className="flex items-center gap-1 font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showHints ? 'Hide Hints' : 'Problem Hints'}</span>
          {showHints ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Collapsible Hints & Solution Steps */}
      {showHints && (
        <div className="mt-3 p-3.5 bg-slate-950/70 rounded-xl border border-white/10 text-xs space-y-2 animate-fadeIn text-slate-300">
          <div className="font-semibold text-indigo-300 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Problem Hints &amp; Strategy:</span>
          </div>
          <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1">
            {problem.hints.map((hint, idx) => (
              <li key={idx}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
