import csv
import json
import os
import re
from collections import defaultdict

train_csv = r"C:\Users\Abhishekh Kumar Jha\Downloads\train.csv"
test_csv = r"C:\Users\Abhishekh Kumar Jha\Downloads\test.csv"
metadata_csv = r"C:\Users\Abhishekh Kumar Jha\Downloads\dq-question-metadata.csv"
subjects_csv = r"C:\Users\Abhishekh Kumar Jha\Downloads\dialogue-subjects.csv"

out_dir = os.path.join(os.getcwd(), 'data', 'processed')
os.makedirs(out_dir, exist_ok=True)
dialogues_out = os.path.join(out_dir, 'dialogues.jsonl')
bank_out = os.path.join(out_dir, 'conversation_bank.json')

print("1. Loading Question Metadata...")
questions = {}
if os.path.exists(metadata_csv):
    with open(metadata_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            qid = r.get('QuestionId_DQ')
            txt = r.get('Text', '')
            if qid and txt and qid not in questions:
                questions[qid] = txt.strip()
print(f"Loaded {len(questions)} question texts.")

print("2. Loading Dialogue Subjects...")
subjects_map = defaultdict(list)
if os.path.exists(subjects_csv):
    with open(subjects_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            iid = r.get('InterventionId')
            sname = r.get('SubjectName')
            if iid and sname and sname not in subjects_map[iid]:
                subjects_map[iid].append(sname)
print(f"Loaded subjects for {len(subjects_map)} interventions.")

def classify_student_turn(msg: str):
    m = msg.lower().strip()
    if any(k in m for k in ['hint', 'clue', 'help me', 'can you help', 'give me a hint', 'subtle hint']):
        return 'hint_request'
    if any(k in m for k in ['where do i start', 'start', 'begin', 'what to do first', 'how do i start', 'how to start']):
        return 'starter_request'
    if any(k in m for k in ['stuck', 'confused', "don't know", "dont know", "don't understand", "dont understand", 'no idea', 'lost']):
        return 'stuck'
    if any(k in m for k in ['is this right', 'is that right', 'correct?', 'am i right', 'is it right', 'did i do it right']):
        return 'confirmation'
    if any(k in m for k in ['why', 'what do you mean', 'explain', 'how come', 'what does that mean']):
        return 'clarification'
    if any(k in m for k in ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'ok', 'okay', 'yes', 'no', 'yeah', 'yep', 'nope']):
        return 'conversational'
    return 'step_attempt'

print("3. Processing Dialogue Turns from train.csv and test.csv...")
conversation_pairs = []
bank = {
    'hint_moves': [],
    'starter_moves': [],
    'reasoning_moves': [],
    'accuracy_moves': [],
    'revoicing_moves': [],
    'keeping_together_moves': [],
    'general_tutor_moves': []
}

files_to_process = [train_csv, test_csv]
total_turns = 0

for file_path in files_to_process:
    if not os.path.exists(file_path):
        continue
    
    current_iid = None
    messages_in_session = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_turns += 1
            iid = row.get('InterventionId')
            qid = row.get('QuestionId_DQ')
            is_tutor = row.get('IsTutor') == '1'
            msg = row.get('MessageString', '').strip()
            talk_move = row.get('TalkMovePrediction', '').strip()
            if talk_move == '<NA>':
                talk_move = '<None>'

            # Clean talk move label: e.g. "<Press for Accuracy>" -> "Press for Accuracy"
            cleaned_talk_move = re.sub(r'[<>]', '', talk_move).strip()

            messages_in_session.append({
                'intervention_id': iid,
                'question_id': qid,
                'is_tutor': is_tutor,
                'message': msg,
                'talk_move': cleaned_talk_move,
            })

    # Group into student-tutor response pairs
    for i in range(len(messages_in_session) - 1):
        curr = messages_in_session[i]
        nxt = messages_in_session[i + 1]
        if not curr['is_tutor'] and nxt['is_tutor']:
            s_msg = curr['message']
            t_msg = nxt['message']
            tm = nxt['talk_move']
            iid = curr['intervention_id']
            qid = curr['question_id']
            q_text = questions.get(qid, '')
            subj = subjects_map.get(iid, [])
            turn_type = classify_student_turn(s_msg)

            pair = {
                'intervention_id': iid,
                'question_id': qid,
                'question': q_text,
                'subjects': subj,
                'student_message': s_msg,
                'tutor_response': t_msg,
                'talk_move': tm,
                'intent': turn_type
            }
            conversation_pairs.append(pair)

            # Categorize into conversation bank
            if len(t_msg) > 10 and not any(skip in t_msg.lower() for skip in ['bye', 'take care', 'leave the room']):
                item = {
                    'student_said': s_msg,
                    'tutor_said': t_msg,
                    'talk_move': tm,
                    'subject': subj[0] if subj else 'General Math',
                    'question_sample': q_text[:120] if q_text else ''
                }
                if turn_type == 'hint_request' or 'clue' in t_msg.lower() or 'hint' in t_msg.lower():
                    if len(bank['hint_moves']) < 500:
                        bank['hint_moves'].append(item)
                elif turn_type == 'starter_request':
                    if len(bank['starter_moves']) < 300:
                        bank['starter_moves'].append(item)
                
                if tm == 'Press for Accuracy' and len(bank['accuracy_moves']) < 500:
                    bank['accuracy_moves'].append(item)
                elif tm == 'Press for Reasoning' and len(bank['reasoning_moves']) < 300:
                    bank['reasoning_moves'].append(item)
                elif tm == 'Revoicing' and len(bank['revoicing_moves']) < 400:
                    bank['revoicing_moves'].append(item)
                elif tm == 'Keep Together' and len(bank['keeping_together_moves']) < 400:
                    bank['keeping_together_moves'].append(item)
                elif len(bank['general_tutor_moves']) < 300:
                    bank['general_tutor_moves'].append(item)

print(f"Total rows scanned: {total_turns}")
print(f"Total Student-Tutor dialogue pairs formed: {len(conversation_pairs)}")
print(f"Bank counts: Hints={len(bank['hint_moves'])}, Starters={len(bank['starter_moves'])}, Accuracy={len(bank['accuracy_moves'])}, Reasoning={len(bank['reasoning_moves'])}, Revoicing={len(bank['revoicing_moves'])}, KeepTogether={len(bank['keeping_together_moves'])}")

# Write dialogues.jsonl
with open(dialogues_out, 'w', encoding='utf-8') as f:
    for p in conversation_pairs:
        f.write(json.dumps(p) + '\n')
print(f"Written {len(conversation_pairs)} dialogue pairs to {dialogues_out}")

# Write conversation_bank.json
with open(bank_out, 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2)
print(f"Written conversation bank to {bank_out}")
