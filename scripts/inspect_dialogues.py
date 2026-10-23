import csv
import json
from collections import defaultdict, Counter

train_path = r"C:\Users\Abhishekh Kumar Jha\Downloads\train.csv"
metadata_path = r"C:\Users\Abhishekh Kumar Jha\Downloads\dq-question-metadata.csv"
subjects_path = r"C:\Users\Abhishekh Kumar Jha\Downloads\dialogue-subjects.csv"

# Load questions metadata
questions = {}
try:
    with open(metadata_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            qid = r.get('QuestionId_DQ')
            if qid and qid not in questions:
                questions[qid] = r.get('Text', '')
    print(f"Loaded {len(questions)} questions from metadata.")
except Exception as e:
    print("Metadata error:", e)

# Load subjects
subjects = defaultdict(list)
try:
    with open(subjects_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            iid = r.get('InterventionId')
            sname = r.get('SubjectName')
            if iid and sname:
                subjects[iid].append(sname)
    print(f"Loaded subjects for {len(subjects)} interventions.")
except Exception as e:
    print("Subjects error:", e)

# Analyze dialogues in train.csv
interventions = defaultdict(list)
talk_moves = Counter()
student_messages = []
tutor_responses = []

with open(train_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    print("train.csv columns:", reader.fieldnames)
    count = 0
    for r in reader:
        count += 1
        iid = r.get('InterventionId')
        interventions[iid].append(r)
        tm = r.get('TalkMovePrediction', '').strip()
        if tm and tm != '<NA>' and tm != '<None>':
            talk_moves[tm] += 1

print(f"Total messages in train.csv: {count}")
print(f"Total conversations (Interventions): {len(interventions)}")
print("Talk moves distribution:")
for tm, c in talk_moves.most_common():
    print(f"  {tm}: {c}")

# Sample an intervention
sample_id = list(interventions.keys())[0]
print(f"\n--- Sample Intervention {sample_id} ---")
print(f"Subjects: {subjects.get(sample_id, [])}")
for m in interventions[sample_id][:12]:
    role = "TUTOR" if m.get('IsTutor') == '1' else "STUDENT"
    print(f"[{role} | {m.get('TalkMovePrediction')}]: {m.get('MessageString')}")
