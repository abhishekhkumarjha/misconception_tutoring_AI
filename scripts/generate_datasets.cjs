const fs = require('fs');

const d1 = { problem_id: 'ALG_LINEAR_0001', grade: 8, topic: 'Algebra', subtopic: 'Linear Equations', difficulty: 'easy', question: 'Solve 2x + 5 = 15', correct_answer: 'x = 5', solution: ['2x + 5 = 15', '2x = 10', 'x = 5'], prerequisites: ['integer_arithmetic', 'inverse_operations'] };
fs.writeFileSync('data/processed/problems.jsonl', JSON.stringify(d1) + '\n');

const d2 = { problem_id: 'ALG_LINEAR_0001', solution_steps: [{ step: 1, expression: '2x + 5 = 15', action: 'subtract_constant', explanation: 'Subtract 5 from both sides.' }, { step: 2, expression: '2x = 10', action: 'simplify' }, { step: 3, expression: 'x = 5', action: 'divide_coefficient', explanation: 'Divide both sides by 2.' }] };
fs.writeFileSync('data/processed/solutions.jsonl', JSON.stringify(d2) + '\n');

const d3 = { problem_id: 'ALG_LINEAR_0001', student_attempt: '2x = 10, so x = 10', final_answer: 'x = 10', correct_answer: 'x = 5', correctness: 'partial', error_location: 'step_3' };
fs.writeFileSync('data/processed/student_attempts.jsonl', JSON.stringify(d3) + '\n');

const d4 = { problem_id: 'ALG_LINEAR_0001', student_response: 'x = 10', correctness: 'incorrect', misconception: { primary: 'inverse_operation_error', confidence: 0.94 }, evidence: 'Student correctly subtracts 5 but does not divide 10 by coefficient 2.', recommended_intervention: 'socratic', hint: 'You have 2x = 10. What operation will remove the 2 from x?' };
fs.writeFileSync('data/processed/misconceptions.jsonl', JSON.stringify(d4) + '\n');

const d5 = { problem: 'Solve 2x + 5 = 15', student_state: 'confused', student_message: "I don't understand why we divide by 2.", teacher_strategy: 'explain_concept', teacher_response: 'Think of 2x as two groups of x. If two groups together make 10, how much is one group?', pedagogical_move: 'scaffolding' };
fs.writeFileSync('data/processed/tutoring_dialogues.jsonl', JSON.stringify(d5) + '\n');

const d6 = { student_state: 'almost_correct', misconception: 'sign_error', strategy: 'guided_reflection', response: "You're very close. Check what happens to the sign when you move that term to the other side.", next_action: 'ask_student_to_retry' };
fs.writeFileSync('data/processed/pedagogy.jsonl', JSON.stringify(d6) + '\n');

const d7 = { student_id: 'S001', knowledge_state: { linear_equations: 0.82, fractions: 0.45, geometry: 0.61 }, misconceptions: ['sign_error', 'fraction_denominator_confusion'], recent_errors: ['ALG_102', 'ALG_107'], preferred_style: 'step_by_step', current_difficulty: 'medium' };
fs.writeFileSync('data/processed/student_profiles.jsonl', JSON.stringify(d7) + '\n');

const d8 = { problem: 'Solve 2x + 5 = 15', student_attempt: '2x = 20', gold_correctness: 'incorrect', gold_misconception: 'sign_error', expected_tutor_strategy: 'socratic', expected_properties: ['mathematically_correct', 'does_not_reveal_answer', 'addresses_misconception', 'encourages_reattempt'] };
fs.writeFileSync('data/evaluation/test_problems.jsonl', JSON.stringify(d8) + '\n');

const synthetic = { problem: 'Solve 3x + 6 = 18', correct_solution: '3x = 12, x = 4', student_attempt: '3x = 24', misconception: 'Incorrect inverse operation', tutor_response: "Let's check that subtraction step. We want to remove the +6 from 3x + 6. What should we subtract from both sides?", next_student_attempt: '6?', tutor_verification: 'Exactly. Now try subtracting 6 from both sides.', student_retry: '3x = 12' };
fs.writeFileSync('data/processed/misconception_dialogues.jsonl', JSON.stringify(synthetic) + '\n');

console.log('Successfully created all JSONL placeholders.');
