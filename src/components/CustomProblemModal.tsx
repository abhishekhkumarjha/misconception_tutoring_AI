import React, { useState, useEffect } from 'react';
import { X, Sparkles, BookOpen, Calculator, HelpCircle, Code, Layers, Terminal } from 'lucide-react';
import { MathProblem, MathTopic, DifficultyLevel, SubjectType } from '../types';

interface CustomProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (problem: MathProblem) => void;
  defaultSubject?: SubjectType;
}

export const CustomProblemModal: React.FC<CustomProblemModalProps> = ({
  isOpen,
  onClose,
  onAddProblem,
  defaultSubject = 'math',
}) => {
  const [subject, setSubject] = useState<SubjectType>(defaultSubject);
  const [problemText, setProblemText] = useState('');
  const [targetSolution, setTargetSolution] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [topic, setTopic] = useState<MathTopic>('Algebra');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [hintsText, setHintsText] = useState('');

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
  }, [defaultSubject, isOpen]);

  if (!isOpen) return null;

  const mathTemplates = [
    {
      label: '🔢 Linear Equation',
      problem: 'Solve for x: 7x - 15 = 48',
      topic: 'Linear Equations' as MathTopic,
      difficulty: 'Easy' as DifficultyLevel,
    },
    {
      label: '🍰 Word Problem',
      problem: 'A train travels 180 km in 3 hours. At the same speed, how long will it take to travel 300 km?',
      topic: 'Word Problems' as MathTopic,
      difficulty: 'Medium' as DifficultyLevel,
    },
    {
      label: '🍕 Fractions',
      problem: 'Solve for y: (3/5)y + 7 = 22',
      topic: 'Fractions & Decimals' as MathTopic,
      difficulty: 'Medium' as DifficultyLevel,
    },
    {
      label: '⚡ Quadratic',
      problem: 'Solve for x: x² - 7x + 12 = 0',
      topic: 'Quadratic Equations' as MathTopic,
      difficulty: 'Hard' as DifficultyLevel,
    },
  ];

  const pythonTemplates = [
    {
      label: '🔁 range() Boundaries',
      problem: 'Write a loop that prints integers 1 through 5 inclusive, each on a new line.',
      starter: 'for i in range(1, 6):\n    print(i)',
      expected: '1\n2\n3\n4\n5',
      topic: 'Loops & Iteration' as MathTopic,
      difficulty: 'Easy' as DifficultyLevel,
    },
    {
      label: '🔤 List Reversal & Slicing',
      problem: 'Write a function reverse_list(items) that returns the list in reverse order without modifying the original.',
      starter: 'def reverse_list(items):\n    return items[::-1]',
      expected: 'reverse_list([1, 2, 3]) -> [3, 2, 1]',
      topic: 'Data Structures' as MathTopic,
      difficulty: 'Easy' as DifficultyLevel,
    },
    {
      label: '⚡ Factorial Accumulator',
      problem: 'Write a function factorial(n) that computes n! using a loop. Initialize your accumulator correctly.',
      starter: 'def factorial(n):\n    result = 1\n    for i in range(1, n + 1):\n        result *= i\n    return result',
      expected: 'factorial(5) -> 120',
      topic: 'Functions & Scope' as MathTopic,
      difficulty: 'Medium' as DifficultyLevel,
    },
    {
      label: '🎯 Target Sum (Two Pointers)',
      problem: 'Write a function has_pair_with_sum(nums, target) that returns True if any two distinct elements add up to target.',
      starter: 'def has_pair_with_sum(nums, target):\n    seen = set()\n    for n in nums:\n        if target - n in seen:\n            return True\n        seen.add(n)\n    return False',
      expected: 'has_pair_with_sum([1, 4, 7], 11) -> True',
      topic: 'Data Structures' as MathTopic,
      difficulty: 'Hard' as DifficultyLevel,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim()) return;

    const trimmedProblem = problemText.trim();
    const finalSolution = targetSolution.trim() || (subject === 'python' ? 'Correct Python Implementation' : 'Auto-derived by AI Tutor');

    const newProblem: MathProblem = {
      id: `custom-${Date.now()}`,
      title: trimmedProblem.length > 32 ? trimmedProblem.slice(0, 32) + '...' : trimmedProblem,
      topic,
      difficulty,
      level: difficulty === 'Easy' ? 'Beginner' : difficulty === 'Hard' ? 'Advanced' : 'Intermediate',
      subjectType: subject,
      problem: trimmedProblem,
      targetSolution: finalSolution,
      starterCode: starterCode.trim() || undefined,
      expectedOutput: expectedOutput.trim() || undefined,
      source: 'custom',
      stepByStepSolution: [
        'Analyze the problem specification and constraints',
        subject === 'python'
          ? 'Structure the program logic and handle boundary conditions'
          : 'Apply mathematical operations and inverse rules step-by-step',
        'Verify against test cases and execution output',
      ],
      hints: hintsText.trim()
        ? hintsText.split('\n').map((h) => h.trim()).filter(Boolean)
        : [
            'Break down the problem into smaller, individual operations.',
            subject === 'python'
              ? 'Think about edge cases, variable state, and loop termination.'
              : 'What is the very first quantity or variable you can isolate?',
            'Test your reasoning against a concrete input value.',
          ],
    };

    onAddProblem(newProblem);
    onClose();
  };

  const isPy = subject === 'python' || subject === 'cross_domain';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#070914]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(100,200,255,0.15)] w-full max-w-lg overflow-hidden animate-fadeIn my-6 text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-purple-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 border border-white/15">
              {subject === 'python' ? <Code className="w-5 h-5 text-emerald-400" /> : subject === 'cross_domain' ? <Layers className="w-5 h-5 text-amber-400" /> : <Calculator className="w-5 h-5 text-cyan-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Custom Problem</h2>
              <p className="text-xs text-slate-400">
                Add any math equation, word problem, or Python coding challenge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-300">
          {/* Subject Switcher */}
          <div>
            <label className="block font-bold text-slate-200 mb-1.5 text-xs">Choose Subject Pipeline</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSubject('math')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  subject === 'math'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span>Math</span>
              </button>
              <button
                type="button"
                onClick={() => setSubject('python')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  subject === 'python'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Python</span>
              </button>
              <button
                type="button"
                onClick={() => setSubject('cross_domain')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  subject === 'cross_domain'
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-md shadow-amber-600/20'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Math + Py</span>
              </button>
            </div>
          </div>

          {/* Quick Starter Templates */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Or pick a template to tweak:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(isPy ? pythonTemplates : mathTemplates).map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setProblemText(t.problem);
                    setTopic(t.topic);
                    setDifficulty(t.difficulty);
                    if ('starter' in t) setStarterCode(t.starter as string);
                    if ('expected' in t) setExpectedOutput(t.expected as string);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-indigo-950/70 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium transition-all shadow-xs cursor-pointer"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Problem Statement */}
          <div>
            <label className="block font-bold text-slate-200 mb-1 text-xs">
              Problem Statement <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder={
                isPy
                  ? "e.g. Write a function that counts how many even numbers are in a list."
                  : "e.g. Solve for x: 8x - 23 = 49"
              }
              required
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-white/15 rounded-xl outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500 font-mono text-sm leading-relaxed shadow-inner"
            />
          </div>

          {/* Python-specific starter code and expected output */}
          {isPy && (
            <div className="space-y-3 p-3 bg-emerald-950/20 border border-emerald-500/25 rounded-2xl">
              <div>
                <label className="font-semibold text-emerald-300 text-xs flex items-center gap-1.5 mb-1">
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  Starter Code (Optional)
                </label>
                <textarea
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  placeholder="def count_evens(nums):&#10;    # Write your logic here&#10;    pass"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/30 rounded-xl outline-none focus:border-emerald-400 font-mono text-xs text-emerald-200 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="font-semibold text-emerald-300 text-xs flex items-center gap-1.5 mb-1">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Expected Output / Example Test Case
                </label>
                <input
                  type="text"
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="count_evens([1, 2, 4, 7]) -> 2"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-emerald-500/30 rounded-xl outline-none focus:border-emerald-400 font-mono text-xs text-slate-200 placeholder-slate-600"
                />
              </div>
            </div>
          )}

          {/* Target Solution */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-200 text-xs">
                Target Solution <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[10px] text-emerald-300 font-medium bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                AI Tutor will verify automatically
              </span>
            </div>
            <input
              type="text"
              value={targetSolution}
              onChange={(e) => setTargetSolution(e.target.value)}
              placeholder={isPy ? "e.g. Return count of elements where n % 2 == 0" : "Leave blank or enter: x = 9"}
              className="w-full px-3.5 py-2 bg-slate-950/70 border border-white/15 rounded-xl outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-xs font-mono text-slate-100 placeholder-slate-500 shadow-inner"
            />
          </div>

          {/* Topic & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1 text-xs">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as MathTopic)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl outline-none focus:border-cyan-400 text-xs font-medium text-slate-100 cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-100"
              >
                {isPy ? (
                  <>
                    <option value="Loops & Iteration">Loops & Iteration</option>
                    <option value="Functions & Scope">Functions & Scope</option>
                    <option value="Data Structures">Data Structures</option>
                    <option value="Conditionals">Conditionals</option>
                    <option value="Algorithms">Algorithms & Recursion</option>
                  </>
                ) : (
                  <>
                    <option value="Algebra">Algebra</option>
                    <option value="Linear Equations">Linear Equations</option>
                    <option value="Quadratic Equations">Quadratic Equations</option>
                    <option value="Fractions & Decimals">Fractions & Decimals</option>
                    <option value="Word Problems">Word Problems</option>
                    <option value="Geometry">Geometry</option>
                    <option value="Number">Number & Arithmetic</option>
                    <option value="Order of Operations">Order of Operations</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1 text-xs">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl outline-none focus:border-cyan-400 text-xs font-medium text-slate-100 cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-100"
              >
                <option value="Easy">🚀 Beginner (Easy)</option>
                <option value="Medium">🧠 Intermediate (Medium)</option>
                <option value="Hard">🔥 Advanced (Hard)</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Socratic tutoring: hints without answer leaks</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!problemText.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 border border-cyan-400/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Learning →</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
