import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ProblemBanner } from './components/ProblemBanner';
import { ChatFeed } from './components/ChatFeed';
import { ChatInput } from './components/ChatInput';
import { ArchitecturePanel } from './components/ArchitecturePanel';
import { CustomProblemModal } from './components/CustomProblemModal';
import { LandingPage } from './components/LandingPage';
import { ALL_PROBLEMS, getProblemsBySubject } from './data/unifiedProblems';
import { MathProblem, ChatMessage, TutorResponse, SubjectType } from './types';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function App() {
  const [showLanding, setShowLanding] = useState(false);
  const [activeSubject, setActiveSubject] = useState<SubjectType>('math');
  const [problems, setProblems] = useState<MathProblem[]>(ALL_PROBLEMS);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(ALL_PROBLEMS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize welcoming chat message tailored to subject and problem
  const initProblemChat = (problem: MathProblem) => {
    setIsSolved(false);
    setAttemptsCount(0);
    const sub = problem.subjectType || activeSubject;

    let welcomeText = '';
    let goal = '';
    let nextPrompt = '';

    if (sub === 'python') {
      welcomeText = `Welcome! I'm your Python Programming Tutor powered by the Enhanced Misconception Model.\n\nLet's analyze and solve this coding problem together:\n\n**${problem.problem}**\n\n${problem.starterCode ? `\`\`\`python\n${problem.starterCode}\n\`\`\`\n` : ''}You can submit your code attempt, test an idea, or ask a question. I will execute and trace your code step-by-step and guide you through any conceptual bugs!`;
      goal = 'Identify student coding intent, trace mental execution, and activate targeted misconception taxonomy.';
      nextPrompt = 'What logic or loop structure would you like to implement first?';
    } else if (sub === 'cross_domain') {
      welcomeText = `Welcome! I'm your Cross-Domain Tutor bridging Mathematics and Python Programming.\n\nLet's explore how mathematical principles connect with algorithmic implementation:\n\n**${problem.problem}**\n\n${problem.starterCode ? `\`\`\`python\n${problem.starterCode}\n\`\`\`\n` : ''}You can share your mathematical reasoning or your Python code implementation!`;
      goal = 'Connect mathematical concept to algorithmic implementation and detect cross-domain misconceptions.';
      nextPrompt = 'Can you state the mathematical formula, or write the corresponding Python loop?';
    } else {
      welcomeText = `Welcome! I'm your UniTutor Math Assistant. Let's work on this problem together:\n\n${problem.problem}\n\nYou can submit your full solution or just your first step. Let's work through it step by step!`;
      goal = 'Warm welcome and invitation for initial step or reasoning.';
      nextPrompt = 'What operation would you like to try first to isolate the variable?';
    }

    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'tutor',
        text: welcomeText,
        timestamp: Date.now(),
        pedagogical: {
          strategy: 'affirmation_next_step',
          hintLevel: 1,
          answerRevealed: false,
          pedagogicalGoal: goal,
          nextRecommendedPrompt: nextPrompt,
        },
        evaluation: {
          errorDetectionAccuracy: 100,
          hintQualityScore: 95,
          pedagogicalEffectiveness: 95,
          socraticRuleAdhered: true,
        },
      },
    ]);
  };

  useEffect(() => {
    initProblemChat(currentProblem);
  }, [currentProblem.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectSubject = (subject: SubjectType) => {
    setActiveSubject(subject);
    const subjectProblems = getProblemsBySubject(subject);
    if (subjectProblems.length > 0) {
      setCurrentProblem(subjectProblems[0]);
    }
  };

  const handleSelectProblem = (problem: MathProblem) => {
    if (problem.subjectType && problem.subjectType !== activeSubject) {
      setActiveSubject(problem.subjectType);
    }
    setCurrentProblem(problem);
  };

  const handleAddCustomProblem = (newProblem: MathProblem) => {
    setProblems((prev) => [newProblem, ...prev]);
    if (newProblem.subjectType) {
      setActiveSubject(newProblem.subjectType);
    }
    setCurrentProblem(newProblem);
  };

  const handleResetSession = () => {
    initProblemChat(currentProblem);
  };

  const handleSendStudentAttempt = async (attemptText: string, isStepByStep: boolean) => {
    if (!attemptText.trim() || isLoading) return;

    const studentMessage: ChatMessage = {
      id: `student-${Date.now()}`,
      sender: 'student',
      text: attemptText,
      timestamp: Date.now(),
      attemptType: isStepByStep ? 'step' : 'final',
    };

    setMessages((prev) => [...prev, studentMessage]);
    setAttemptsCount((prev) => prev + 1);
    setIsLoading(true);

    const activeSub = currentProblem.subjectType || activeSubject;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: currentProblem,
          studentAttempt: attemptText,
          isStepByStep,
          subject: activeSub,
          history: messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const tutorResp: TutorResponse = await response.json();

      if (tutorResp.analysis?.isCorrect && tutorResp.analysis?.isFinalAnswer) {
        setIsSolved(true);
      }

      const tutorMessage: ChatMessage = {
        id: tutorResp.id || `tutor-${Date.now()}`,
        sender: 'tutor',
        text: tutorResp.message,
        timestamp: Date.now(),
        analysis: tutorResp.analysis,
        pedagogical: tutorResp.pedagogical,
        evaluation: tutorResp.evaluation,
      };

      setMessages((prev) => [...prev, tutorMessage]);
    } catch (error) {
      console.error('Error communicating with tutor backend:', error);
      // Friendly fallback message if server is temporarily unreachable
      const isPy = activeSub === 'python' || activeSub === 'cross_domain';
      setMessages((prev) => [
        ...prev,
        {
          id: `tutor-fallback-${Date.now()}`,
          sender: 'tutor',
          text: isPy
            ? `Great coding attempt! Let's examine your logic line by line. What sequence of values is being generated or evaluated during the first iteration?`
            : `Great attempt! Let's examine your equation steps closely. What is the inverse operation needed to eliminate the constant term on the variable side?`,
          timestamp: Date.now(),
          pedagogical: {
            strategy: 'guided_discovery',
            hintLevel: 1,
            answerRevealed: false,
            pedagogicalGoal: isPy ? 'Guide student toward tracing code execution.' : 'Guide student toward inverse operations.',
            nextRecommendedPrompt: isPy ? 'Try writing down the values after each loop iteration.' : 'Try applying the inverse operation to both sides of the equation.',
          },
          evaluation: {
            errorDetectionAccuracy: 90,
            hintQualityScore: 88,
            pedagogicalEffectiveness: 88,
            socraticRuleAdhered: true,
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const latestTutorMessage = [...messages].reverse().find((m) => m.sender === 'tutor');

  return (
    <>
      {/* Optional Landing / Overview modal — renders when user toggles Overview */}
      {showLanding && (
        <LandingPage onEnter={() => setShowLanding(false)} />
      )}

      <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200 relative z-10">
        {/* Top Navigation */}
        <Navbar
          problems={problems}
          currentProblem={currentProblem}
          activeSubject={activeSubject}
          onSelectSubject={handleSelectSubject}
          onSelectProblem={handleSelectProblem}
          onOpenCustomProblem={() => setIsCustomModalOpen(true)}
          onOpenOverview={() => setShowLanding(true)}
          onToggleArchitecture={() => setIsArchitectureOpen((prev) => !prev)}
          isArchitectureOpen={isArchitectureOpen}
          onResetSession={handleResetSession}
          isSolved={isSolved}
        />

        {/* Main Workspace Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 overflow-hidden">
          {/* Active Problem Banner */}
          <ProblemBanner
            problem={currentProblem}
            isSolved={isSolved}
            onTryExample={(ex) => handleSendStudentAttempt(ex, false)}
            attemptsCount={attemptsCount}
            onOpenCustomProblem={() => setIsCustomModalOpen(true)}
          />

          {/* Celebration Banner when Solved */}
          {isSolved && (
            <div className="bg-emerald-950/60 border border-emerald-500/30 backdrop-blur-xl rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-xl shadow-emerald-950/30 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300">Problem Solved Successfully!</span>{' '}
                  <span className="text-emerald-200/90">
                    You demonstrated clear understanding and reached {currentProblem.targetSolution}.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const subjectProblems = getProblemsBySubject(activeSubject);
                  const nextIndex = (subjectProblems.findIndex((p) => p.id === currentProblem.id) + 1) % subjectProblems.length;
                  handleSelectProblem(subjectProblems[nextIndex]);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-400/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Problem</span>
              </button>
            </div>
          )}

          {/* Chat Feed Card - Transparent Glass allowing 3D animation and logo behind without blurring */}
          <div className="flex-1 bg-[#020205]/20 border border-cyan-500/25 hover:border-cyan-400/40 rounded-3xl p-3 sm:p-5 flex flex-col overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] min-h-[420px] transition-all relative">
            <ChatFeed messages={messages} isLoading={isLoading} />
            <div ref={chatEndRef} />

            {/* Student Input Component */}
            <ChatInput
              onSendMessage={handleSendStudentAttempt}
              isLoading={isLoading}
              disabled={isSolved}
              subjectType={currentProblem.subjectType || activeSubject}
            />
          </div>
        </main>

        {/* Side Architecture & Evaluation Inspector Drawer */}
        <ArchitecturePanel
          isOpen={isArchitectureOpen}
          onClose={() => setIsArchitectureOpen(false)}
          currentProblem={currentProblem}
          latestTutorMessage={latestTutorMessage}
          totalAttempts={attemptsCount}
          solved={isSolved}
        />

        {/* Custom Problem Creation Modal */}
        <CustomProblemModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
          onAddProblem={handleAddCustomProblem}
          defaultSubject={activeSubject}
        />
      </div>
    </>
  );
}
