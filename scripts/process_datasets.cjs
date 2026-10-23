#!/usr/bin/env node
/**
 * Dataset ETL Pipeline
 * Processes MathDial, GSM8K, Hendrycks MATH, and EEDI Diagnostic Questions & TalkMoves
 * datasets into structured JSONL files for the chatbot's RAG knowledge base.
 *
 * Output:
 *   data/processed/misconceptions.jsonl  - Real student mistakes + teacher analysis
 *   data/processed/pedagogy.jsonl        - Tutoring strategies from real dialogues (including TalkMoves)
 *   data/processed/problems.jsonl        - Math problems with step-by-step solutions & Diagnostic Questions
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const RAW_DIR = path.join(ROOT, 'data', 'raw');

// Ensure output directory exists
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function readJSONL(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  [SKIP] File not found: ${filePath}`);
    return [];
  }
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
  const records = [];
  for (const line of lines) {
    try { records.push(JSON.parse(line)); } catch (e) { /* skip malformed */ }
  }
  return records;
}

function writeJSONL(filePath, records) {
  const lines = records.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(filePath, lines + '\n', 'utf-8');
  console.log(`  Written ${records.length} records -> ${path.relative(ROOT, filePath)}`);
}

function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      currentVal = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += c;
    }
  }
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }
  return rows;
}

/**
 * Parse MathDial conversation string into turns.
 * Format: "Teacher: (strategy)text|EOM|Student: text|EOM|..."
 */
function parseConversation(convStr) {
  if (!convStr) return [];
  return convStr.split('|EOM|').map(turn => {
    const teacherMatch = turn.match(/^Teacher:\s*\(([^)]+)\)(.+)$/s);
    if (teacherMatch) {
      return { role: 'teacher', strategy: teacherMatch[1].trim(), text: teacherMatch[2].trim() };
    }
    const studentMatch = turn.match(/^Student:\s*(.+)$/s);
    if (studentMatch) {
      return { role: 'student', text: studentMatch[1].trim() };
    }
    const namedMatch = turn.match(/^(\w+):\s*(.+)$/s);
    if (namedMatch) {
      const name = namedMatch[1];
      if (name === 'Teacher') {
        return { role: 'teacher', strategy: 'generic', text: namedMatch[2].trim() };
      }
      return { role: 'student', text: namedMatch[2].trim() };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Map teacher strategy tag to a normalized strategy name.
 */
function normalizeStrategy(tag) {
  const map = {
    'probing': 'SOCRATIC',
    'focus': 'SOCRATIC',
    'generic': 'SOCRATIC',
    'telling': 'DIRECT_EXPLANATION',
    'hint': 'HINT',
    'worked_example': 'WORKED_EXAMPLE',
    'counterexample': 'COUNTEREXAMPLE',
    'encouragement': 'ENCOURAGEMENT',
    'reattempt': 'REATTEMPT',
    'summary': 'SUMMARY',
  };
  return map[tag ? tag.toLowerCase() : ''] || 'SOCRATIC';
}

function normalizeTalkMove(tm) {
  if (!tm) return null;
  const clean = tm.replace(/[<>]/g, '').trim().toLowerCase();
  if (clean.includes('press for accuracy')) return 'PRESS_FOR_ACCURACY';
  if (clean.includes('press for reasoning')) return 'PRESS_FOR_REASONING';
  if (clean.includes('revoicing')) return 'REVOICING';
  if (clean.includes('keep together')) return 'KEEP_TOGETHER';
  if (clean.includes('getting student to relate')) return 'GETTING_STUDENT_TO_RELATE';
  if (clean.includes('restating')) return 'RESTATING';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Process MathDial
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n==============================================');
console.log(' STEP 1: Processing MathDial Dataset');
console.log('==============================================');

const MATHDIAL_TRAIN = path.join(RAW_DIR, 'mathdial', 'mathdial-main', 'data', 'train.jsonl');
const MATHDIAL_TEST  = path.join(RAW_DIR, 'mathdial', 'mathdial-main', 'data', 'test.jsonl');

const mathdialRecords = [
  ...readJSONL(MATHDIAL_TRAIN),
  ...readJSONL(MATHDIAL_TEST),
];

console.log(`  Loaded ${mathdialRecords.length} MathDial dialogues`);

const misconceptions = [];
const pedagogy = [];

for (const record of mathdialRecords) {
  const turns = parseConversation(record.conversation);
  
  // Each MathDial record is a real student mistake with teacher-annotated confusion
  misconceptions.push({
    source: 'mathdial',
    problem_id: String(record.qid || ''),
    problem: record.question || '',
    correct_solution: record.ground_truth || '',
    student_attempt: record.student_incorrect_solution || '',
    misconception: {
      primary: record.teacher_described_confusion || '',
      student_profile: record.student_profile || '',
    },
    evidence: (record.student_incorrect_solution || '').slice(0, 300),
    hint: turns.filter(t => t.role === 'teacher').map(t => t.text).join(' | ').slice(0, 500),
    self_corrected: record['self-correctness'] === 'Yes',
    difficulty: parseFloat(record['self-typical-confusion']) || 3,
  });

  // Extract each teacher turn as a strategy example
  for (let i = 0; i < turns.length - 1; i++) {
    const turn = turns[i];
    if (turn.role !== 'teacher') continue;
    
    const prevStudentTurn = turns.slice(0, i).filter(t => t.role === 'student').pop();
    const nextStudentTurn = turns.slice(i + 1).find(t => t.role === 'student');

    pedagogy.push({
      source: 'mathdial',
      problem: (record.question || '').slice(0, 300),
      misconception: record.teacher_described_confusion || '',
      student_profile: record.student_profile || '',
      student_state: prevStudentTurn ? prevStudentTurn.text.slice(0, 300) : 'initial attempt',
      strategy: normalizeStrategy(turn.strategy),
      original_strategy_tag: turn.strategy,
      response: turn.text.slice(0, 500),
      outcome: nextStudentTurn ? nextStudentTurn.text.slice(0, 300) : 'end of dialogue',
      self_corrected: record['self-correctness'] === 'Yes',
    });
  }
}

console.log(`  Extracted ${misconceptions.length} MathDial misconception records`);
console.log(`  Extracted ${pedagogy.length} MathDial pedagogy strategy records`);


// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Process GSM8K
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n==============================================');
console.log(' STEP 2: Processing GSM8K Dataset');
console.log('==============================================');

const GSM8K_TRAIN = path.join(RAW_DIR, 'gsm8k', 'grade-school-math-master', 'grade_school_math', 'data', 'train.jsonl');
const GSM8K_TEST  = path.join(RAW_DIR, 'gsm8k', 'grade-school-math-master', 'grade_school_math', 'data', 'test.jsonl');

const gsm8kRecords = [
  ...readJSONL(GSM8K_TRAIN),
  ...readJSONL(GSM8K_TEST),
];

console.log(`  Loaded ${gsm8kRecords.length} GSM8K problems`);

const problems = [];

for (const record of gsm8kRecords) {
  if (!record.question || !record.answer) continue;

  const answerParts = record.answer.split('####');
  const steps = answerParts[0].trim();
  const finalAnswer = answerParts[1] ? answerParts[1].trim() : '';

  const q = record.question.toLowerCase();
  let topic = 'general';
  if (q.includes('fraction') || q.includes('percent') || q.includes('%')) topic = 'fractions';
  else if (q.includes('speed') || q.includes('distance') || q.includes('rate')) topic = 'rates';
  else if (q.includes('area') || q.includes('perimeter') || q.includes('volume')) topic = 'geometry';
  else if (q.includes('multiply') || q.includes('divide') || q.includes('product')) topic = 'multiplication';
  else if (q.includes('add') || q.includes('sum') || q.includes('total')) topic = 'addition';
  else if (q.includes('subtract') || q.includes('difference') || q.includes('less')) topic = 'subtraction';
  else if (q.includes('profit') || q.includes('cost') || q.includes('price') || q.includes('$')) topic = 'money_word_problems';
  else if (q.includes('age') || q.includes('older') || q.includes('younger')) topic = 'age_problems';
  else if (q.includes('time') || q.includes('hour') || q.includes('minute')) topic = 'time';

  const stepCount = (steps.match(/\n/g) || []).length;
  const difficulty = stepCount <= 2 ? 'easy' : stepCount <= 5 ? 'medium' : 'hard';

  problems.push({
    source: 'gsm8k',
    problem: record.question,
    solution_steps: steps,
    final_answer: finalAnswer,
    topic,
    difficulty,
    step_count: stepCount,
  });
}

console.log(`  Extracted ${problems.length} GSM8K problems`);


// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Hendrycks MATH (math-main)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n==============================================');
console.log(' STEP 3: Processing Hendrycks MATH Dataset');
console.log('==============================================');

const HENDRYCKS_BASE = path.join(RAW_DIR, 'hendrycks_math', 'math-main');

const findJsonFiles = (dir, results) => {
  results = results || [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsonFiles(fullPath, results);
    } else if (entry.name.endsWith('.json') && !entry.name.includes('__pycache__')) {
      results.push(fullPath);
    }
  }
  return results;
};

const jsonFiles = findJsonFiles(HENDRYCKS_BASE);
console.log(`  Found ${jsonFiles.length} JSON files in Hendrycks MATH`);

let hendrycksCount = 0;
for (const filePath of jsonFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (data.problem && data.solution) {
      const pathParts = filePath.split(path.sep);
      const topicDir = pathParts[pathParts.length - 2] || 'algebra';
      
      problems.push({
        source: 'hendrycks_math',
        problem: data.problem,
        solution_steps: data.solution,
        final_answer: data.answer || '',
        topic: topicDir,
        difficulty: data.level || 'medium',
        step_count: (data.solution.match(/\n/g) || []).length,
      });
      hendrycksCount++;
    }
  } catch (e) { /* skip malformed */ }
}

console.log(`  Extracted ${hendrycksCount} Hendrycks MATH problems`);


// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Process EEDI Diagnostic Questions & TalkMoves Datasets
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n==============================================');
console.log(' STEP 4: Processing EEDI & TalkMoves Datasets');
console.log('==============================================');

// Find EEDI datasets either in data/raw/eedi or in Downloads
const EEDI_DIR = fs.existsSync(path.join(RAW_DIR, 'eedi', 'dq-question-metadata.csv'))
  ? path.join(RAW_DIR, 'eedi')
  : 'C:\\Users\\Abhishekh Kumar Jha\\Downloads';

const subjectsPath = path.join(EEDI_DIR, 'dialogue-subjects.csv');
const questionsPath = path.join(EEDI_DIR, 'dq-question-metadata.csv');
const trainPath = path.join(EEDI_DIR, 'train.csv');
const testPath = path.join(EEDI_DIR, 'test.csv');

if (fs.existsSync(subjectsPath) && fs.existsSync(questionsPath)) {
  console.log(`  Reading EEDI files from: ${EEDI_DIR}`);
  
  // 1. Parse Subjects
  const subjContent = fs.readFileSync(subjectsPath, 'utf-8');
  const subjRows = parseCSV(subjContent);
  const subjMap = new Map();
  for (let i = 1; i < subjRows.length; i++) {
    const [intId, subjId, parentId, name, level, type] = subjRows[i];
    if (!subjMap.has(intId)) subjMap.set(intId, {});
    const entry = subjMap.get(intId);
    if (level === '1') entry.subject = name;
    else if (level === '2') entry.topic = name;
    else if (level === '3') entry.subtopic = name;
  }
  console.log(`  Mapped subject metadata for ${subjMap.size} interventions`);

  // 2. Parse Diagnostic Questions
  const qMetaContent = fs.readFileSync(questionsPath, 'utf-8');
  const qMetaRows = parseCSV(qMetaContent);
  const qMetaHeader = qMetaRows[0];
  const qidIdx = qMetaHeader.indexOf('QuestionId_DQ');
  const intIdIdx = qMetaHeader.indexOf('InterventionId');
  const textIdx = qMetaHeader.indexOf('Text');
  const labelIdx = qMetaHeader.indexOf('Label');

  const questionsMap = new Map();
  for (let i = 1; i < qMetaRows.length; i++) {
    const row = qMetaRows[i];
    const qid = row[qidIdx];
    const intId = row[intIdIdx];
    const text = row[textIdx];
    const label = row[labelIdx];
    
    if (!questionsMap.has(qid)) {
      questionsMap.set(qid, {
        qid,
        interventionId: intId,
        text: '',
        choices: {},
        hasImage: false
      });
    }
    const q = questionsMap.get(qid);
    if (label === 'Question Text' && (!q.text || text.length > q.text.length)) {
      q.text = text;
    } else if (label.startsWith('Answer ') && label.endsWith(' Text')) {
      const choiceKey = label.replace('Answer ', '').replace(' Text', '').trim();
      q.choices[choiceKey] = text;
    } else if (label.includes('Image')) {
      q.hasImage = true;
    }
  }
  console.log(`  Parsed ${questionsMap.size} structured diagnostic questions`);

  // Add Diagnostic Questions to problems collection
  let dqProblemsAdded = 0;
  for (const [qid, q] of questionsMap.entries()) {
    if (!q.text) continue;
    const sObj = subjMap.get(q.interventionId) || {};
    const formattedChoices = Object.entries(q.choices)
      .map(([k, v]) => `(${k}) ${v.trim().replace(/\n/g, ' ')}`)
      .join('  ');

    problems.push({
      source: 'eedi_dq',
      problem_id: qid,
      problem: q.text.trim(),
      solution_steps: `Diagnostic Question Options:\n${formattedChoices}`,
      final_answer: 'Multiple Choice Diagnostic Question',
      topic: sObj.topic || sObj.subject || 'General Math',
      subject: sObj.subject || 'Mathematics',
      subtopic: sObj.subtopic || '',
      options: q.choices,
      difficulty: 'medium',
      step_count: 2,
    });
    dqProblemsAdded++;
  }
  console.log(`  Added ${dqProblemsAdded} Diagnostic Questions to problems collection`);

  // 3. Process Dialogues from train.csv and test.csv
  function processDialogueCSV(filePath) {
    if (!fs.existsSync(filePath)) return new Map();
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    const header = rows[0];
    const cIntId = header.indexOf('InterventionId');
    const cTutorId = header.indexOf('TutorId');
    const cQid = header.indexOf('QuestionId_DQ');
    const cSeq = header.indexOf('MessageSequence');
    const cIsTutor = header.indexOf('IsTutor');
    const cMsg = header.indexOf('MessageString');
    const cTalkMove = header.indexOf('TalkMovePrediction');

    const dialogues = new Map();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const intId = row[cIntId];
      if (!dialogues.has(intId)) dialogues.set(intId, []);
      dialogues.get(intId).push({
        intId,
        tutorId: row[cTutorId],
        qid: row[cQid],
        seq: parseInt(row[cSeq], 10) || 0,
        isTutor: row[cIsTutor] === '1',
        text: row[cMsg] || '',
        talkMove: row[cTalkMove] || '<None>'
      });
    }
    return dialogues;
  }

  const trainDialogues = processDialogueCSV(trainPath);
  const testDialogues = processDialogueCSV(testPath);
  console.log(`  Loaded ${trainDialogues.size} train dialogues & ${testDialogues.size} test dialogues`);

  let eediPedagogyCount = 0;
  let eediMisconceptionCount = 0;

  const allDialogues = [...trainDialogues.values(), ...testDialogues.values()];
  for (const turns of allDialogues) {
    turns.sort((a, b) => a.seq - b.seq);
    const qid = turns[0]?.qid;
    const intId = turns[0]?.intId;
    const qObj = questionsMap.get(qid) || {};
    const sObj = subjMap.get(intId) || {};

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      if (!turn.isTutor) continue;

      const normalizedStrategy = normalizeTalkMove(turn.talkMove);
      if (!normalizedStrategy) continue; // focus on instructional moves

      const prevStudentTurns = turns.slice(0, i).filter(t => !t.isTutor);
      const lastStudent = prevStudentTurns[prevStudentTurns.length - 1];
      const nextStudent = turns.slice(i + 1).find(t => !t.isTutor);

      pedagogy.push({
        source: 'eedi_talkmoves',
        problem_id: qid,
        problem: (qObj.text || '').slice(0, 300),
        subject: sObj.subject || 'Mathematics',
        topic: sObj.topic || 'General',
        subtopic: sObj.subtopic || '',
        student_state: lastStudent ? lastStudent.text.slice(0, 300) : 'initial problem state',
        strategy: normalizedStrategy,
        original_talk_move: turn.talkMove,
        response: turn.text.slice(0, 500),
        outcome: nextStudent ? nextStudent.text.slice(0, 300) : 'dialogue continuation',
      });
      eediPedagogyCount++;

      // When teacher presses for accuracy or reasoning, capture the misconception attempt
      if (lastStudent && (normalizedStrategy === 'PRESS_FOR_ACCURACY' || normalizedStrategy === 'PRESS_FOR_REASONING')) {
        misconceptions.push({
          source: 'eedi_dialogue',
          problem_id: qid,
          problem: (qObj.text || '').slice(0, 300),
          subject: sObj.subject || 'Mathematics',
          topic: sObj.topic || 'General',
          student_attempt: lastStudent.text.slice(0, 300),
          misconception: {
            primary: `Student misconception / error in ${sObj.topic || 'math problem'}: triggered ${normalizedStrategy}`,
            student_profile: `Student attempting ${sObj.topic || 'math problem'}`
          },
          evidence: lastStudent.text.slice(0, 300),
          hint: turn.text.slice(0, 500),
          self_corrected: false
        });
        eediMisconceptionCount++;
      }
    }
  }

  console.log(`  Extracted ${eediPedagogyCount} EEDI TalkMoves pedagogy records`);
  console.log(`  Extracted ${eediMisconceptionCount} EEDI misconception records`);
} else {
  console.warn(`  [SKIP] EEDI files not found in ${EEDI_DIR}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Write Final Output
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n==============================================');
console.log(' STEP 5: Writing Processed Datasets');
console.log('==============================================');

// Deduplicate problems by first 100 chars of question text
const seenProblems = new Set();
const dedupedProblems = problems.filter(p => {
  const key = (p.problem || '').slice(0, 100);
  if (seenProblems.has(key)) return false;
  seenProblems.add(key);
  return true;
});

writeJSONL(path.join(PROCESSED_DIR, 'misconceptions.jsonl'), misconceptions);
writeJSONL(path.join(PROCESSED_DIR, 'pedagogy.jsonl'), pedagogy);
writeJSONL(path.join(PROCESSED_DIR, 'problems.jsonl'), dedupedProblems);

console.log('\n==============================================');
console.log(' ETL COMPLETE - Summary');
console.log('==============================================');
console.log(`  misconceptions.jsonl : ${misconceptions.length} records`);
console.log(`  pedagogy.jsonl       : ${pedagogy.length} records`);
console.log(`  problems.jsonl       : ${dedupedProblems.length} records`);
console.log(`  Total RAG records    : ${misconceptions.length + pedagogy.length + dedupedProblems.length}`);
console.log('\n  All datasets (MathDial, GSM8K, Hendrycks MATH, EEDI & TalkMoves) processed successfully!');
console.log('  Restart the server to reload RAG with the new data.\n');
