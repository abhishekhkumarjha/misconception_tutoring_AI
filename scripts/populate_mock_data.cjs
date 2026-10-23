const fs = require('fs');
const path = require('path');

const misconceptions = [
  { problem_id: 'ALG_01', misconception: { primary: 'inverse_operation_error' }, evidence: 'Student added when they should have subtracted to isolate the variable.', recommended_intervention: 'socratic', hint: 'If we want to undo addition, what operation should we use?' },
  { problem_id: 'ALG_02', misconception: { primary: 'distributive_property_error' }, evidence: 'Student did not multiply the term outside the parenthesis with all terms inside.', recommended_intervention: 'worked_example', hint: 'Remember to distribute the outside number to EVERY term inside the parentheses.' },
  { problem_id: 'FRAC_01', misconception: { primary: 'common_denominator_error' }, evidence: 'Student added fractions by adding numerators and denominators straight across.', recommended_intervention: 'concept_explanation', hint: 'Before adding fractions, the pieces must be the same size. How do we find a common denominator?' },
  { problem_id: 'GEOM_01', misconception: { primary: 'area_perimeter_confusion' }, evidence: 'Student multiplied lengths to find perimeter instead of adding them.', recommended_intervention: 'socratic', hint: 'Are we trying to find the space inside the shape, or the distance around the outside?' },
  { problem_id: 'ARITH_01', misconception: { primary: 'order_of_operations' }, evidence: 'Student added before multiplying.', recommended_intervention: 'hint', hint: 'Think about PEMDAS. Which operation comes first, multiplication or addition?' },
  { problem_id: 'ALG_03', misconception: { primary: 'sign_error' }, evidence: 'Student dropped the negative sign when moving a term across the equals sign.', recommended_intervention: 'socratic', hint: 'Look closely at the sign of the number you just moved. Does it stay the same?' },
  { problem_id: 'FRAC_02', misconception: { primary: 'cross_multiplication_error' }, evidence: 'Student cross-multiplied when adding fractions.', recommended_intervention: 'concept_explanation', hint: 'Cross-multiplication is for solving proportions. For adding, we need common denominators.' },
  { problem_id: 'GEOM_02', misconception: { primary: 'pythagorean_theorem_misapplication' }, evidence: 'Student added the legs instead of squaring them.', recommended_intervention: 'socratic', hint: 'What does the Pythagorean theorem say we must do to the legs before adding them?' }
];

const pedagogy = [
  { student_state: 'confused', misconception: 'inverse_operation_error', strategy: 'socratic', response: 'What operation undoes addition?' },
  { student_state: 'partial', misconception: 'distributive_property_error', strategy: 'guided_reflection', response: 'You multiplied the first term correctly. What about the second term inside the parentheses?' },
  { student_state: 'incorrect', misconception: 'common_denominator_error', strategy: 'concept_explanation', response: 'When adding fractions, think of them like slices of pizza. We can only add them if the slices are the same size.' },
  { student_state: 'incorrect', misconception: 'area_perimeter_confusion', strategy: 'analogy', response: 'Think of perimeter as building a fence around a yard, and area as planting grass inside it. Which one are we doing here?' },
  { student_state: 'almost_correct', misconception: 'order_of_operations', strategy: 'hint', response: 'Check your order of operations on the last step.' },
  { student_state: 'incorrect', misconception: 'sign_error', strategy: 'error_reflection', response: 'Trace what happened to the negative sign in your second step.' },
  { student_state: 'confused', misconception: 'cross_multiplication_error', strategy: 'direct_explanation', response: 'We only cross-multiply when two fractions are equal to each other. Here, we are adding them.' },
  { student_state: 'partial', misconception: 'pythagorean_theorem_misapplication', strategy: 'socratic', response: 'The formula is a^2 + b^2 = c^2. Did you remember to square the numbers?' }
];

const processedDir = path.join(process.cwd(), 'data', 'processed');

function writeJSONL(filename, dataArray) {
  const filepath = path.join(processedDir, filename);
  const content = dataArray.map(obj => JSON.stringify(obj)).join('\n');
  fs.writeFileSync(filepath, content + '\n', 'utf-8');
}

writeJSONL('misconceptions.jsonl', misconceptions);
writeJSONL('pedagogy.jsonl', pedagogy);

console.log('Successfully populated mock datasets with diverse RAG examples.');
