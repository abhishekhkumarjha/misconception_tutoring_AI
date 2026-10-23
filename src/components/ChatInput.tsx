import React, { useState, useRef } from 'react';
import { Send, CornerDownLeft, Sparkles, Lightbulb, Code, Calculator } from 'lucide-react';
import { SubjectType } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, isStepByStep: boolean) => void;
  isLoading: boolean;
  disabled?: boolean;
  subjectType?: SubjectType;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
  subjectType = 'math',
}) => {
  const [input, setInput] = useState('');
  const [isStepByStep, setIsStepByStep] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const isPython = subjectType === 'python' || subjectType === 'cross_domain';

  const mathSymbols = ['+', '-', '×', '÷', '=', 'x', 'x²', '( )', '√', '±', '<', '>', '≤', '≥'];
  const pythonTokens = ['def ', 'for ', 'in range(', 'if ', 'else:', 'return ', 'print(', '[]', '==', '!=', '//', '%'];

  const handleInsertToken = (token: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart || 0;
    const end = inputRef.current.selectionEnd || 0;

    let insertion = token;
    if (token === '( )') insertion = '()';

    const newValue = input.substring(0, start) + insertion + input.substring(end);
    setInput(newValue);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const cursor = token.includes('(') && token.endsWith(')') ? start + token.length - 1 : start + insertion.length;
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    }, 10);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim(), isStepByStep);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key inserts 4 spaces for Python code indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!inputRef.current) return;
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const newValue = input.substring(0, start) + '    ' + input.substring(end);
      setInput(newValue);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(start + 4, start + 4);
        }
      }, 0);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      // In Python multiline mode, Shift+Enter or Ctrl+Enter is typical, but allow Enter if not indented, or let Enter submit
      // If code has multiple lines and student hits enter, let Enter make a newline unless Ctrl/Cmd is pressed
      if (isPython && (input.includes('\n') || input.endsWith(':'))) {
        // Allow normal newline for multi-line Python code
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt, isStepByStep);
  };

  return (
    <div id="chat-input-wrapper" className="bg-[#03050e]/60 border-t border-white/10 pt-3 pb-1 px-1">
      {/* Quick Starter Prompts */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          Quick Ask:
        </span>
        {isPython ? (
          <>
            <button
              onClick={() => handleQuickPrompt("I'm not sure where to start. Can you guide me on the first step?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/60 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-200 border border-white/10 hover:border-emerald-400/40 transition-colors text-[11px] cursor-pointer"
            >
              Where to start?
            </button>
            <button
              onClick={() => handleQuickPrompt("Why does range() or my loop boundary produce unexpected output?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/60 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-200 border border-white/10 hover:border-emerald-400/40 transition-colors text-[11px] cursor-pointer"
            >
              Loop boundary hint
            </button>
            <button
              onClick={() => handleQuickPrompt("Can you trace this code step-by-step and show what is happening?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/60 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-200 border border-white/10 hover:border-emerald-400/40 transition-colors text-[11px] cursor-pointer"
            >
              Trace execution
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleQuickPrompt("I'm not sure where to start. Can you guide me on the first step?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/60 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 transition-colors text-[11px] cursor-pointer"
            >
              Where to start?
            </button>
            <button
              onClick={() => handleQuickPrompt("Can you give me a subtle hint for this step?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/60 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 transition-colors text-[11px] cursor-pointer"
            >
              Need a hint
            </button>
            <button
              onClick={() => handleQuickPrompt("Can you explain the mathematical rule being used here?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/60 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 transition-colors text-[11px] cursor-pointer"
            >
              Explain the rule
            </button>
          </>
        )}
      </div>

      {/* Helper Tokens Bar & Mode Switcher */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        {/* Token / Symbol Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          <span className="text-[10px] text-slate-500 font-mono pl-1">
            {isPython ? 'Python tokens:' : 'Math symbols:'}
          </span>
          {(isPython ? pythonTokens : mathSymbols).map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleInsertToken(sym)}
              className="px-2 py-0.5 rounded-lg bg-slate-900/60 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white text-xs font-mono font-medium transition-colors cursor-pointer shrink-0"
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 text-[11px] bg-slate-900/70 p-0.5 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setIsStepByStep(true)}
            className={`px-2.5 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
              isStepByStep ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isPython ? 'Code attempt' : 'Step attempt'}
          </button>
          <button
            type="button"
            onClick={() => setIsStepByStep(false)}
            className={`px-2.5 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
              !isStepByStep ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Final solution
          </button>
        </div>
      </div>

      {/* Main Input Textarea and Send Button */}
      <div className="flex items-end gap-2 bg-slate-950/70 border border-white/15 rounded-2xl p-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all shadow-inner">
        <textarea
          ref={inputRef}
          id="student-attempt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isPython
              ? "Type or paste your Python code here (Tab adds 4 spaces)...\ne.g. for i in range(1, 6): print(i)"
              : isStepByStep
              ? "Type your step or equation (e.g. '2x = 10', 'subtract 5 from both sides')..."
              : "Type your final answer (e.g. 'x = 5')..."
          }
          rows={isPython ? 3 : 2}
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-100 placeholder-slate-500 font-mono px-2 py-1 leading-relaxed"
        />

        <div className="flex flex-col items-center gap-1">
          <button
            id="send-attempt-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center transition-all shadow-md shadow-cyan-600/25 disabled:cursor-not-allowed cursor-pointer"
            title="Submit attempt (Enter / Click)"
          >
            {isLoading ? (
              <Sparkles className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
            <CornerDownLeft className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Send</span>
          </span>
        </div>
      </div>
    </div>
  );
};
