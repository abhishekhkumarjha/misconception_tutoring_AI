import { MathProblem, SubjectType, ProblemLevel } from '../types';
import { MATH_PROBLEMS } from './mathProblems';
import { PYTHON_PROBLEMS } from './pythonProblems';

// Ensure math problems are tagged with subjectType: 'math'
const taggedMathProblems: MathProblem[] = MATH_PROBLEMS.map((p) => ({
  ...p,
  subjectType: p.subjectType || 'math',
}));

export const ALL_PROBLEMS: MathProblem[] = [
  ...taggedMathProblems,
  ...PYTHON_PROBLEMS,
];

export function getProblemsBySubject(subject: SubjectType): MathProblem[] {
  if (subject === 'cross_domain') {
    return ALL_PROBLEMS.filter((p) => p.subjectType === 'cross_domain');
  }
  if (subject === 'python') {
    return ALL_PROBLEMS.filter((p) => p.subjectType === 'python');
  }
  return ALL_PROBLEMS.filter((p) => !p.subjectType || p.subjectType === 'math');
}

export function getProblemsBySubjectAndLevel(
  subject: SubjectType,
  level: ProblemLevel
): MathProblem[] {
  return getProblemsBySubject(subject).filter((p) => p.level === level);
}

export { MATH_PROBLEMS, PYTHON_PROBLEMS };
