import urllib.request
import json

payload = {
    "problem": "Solve for x: 2x + 5 = 15",
    "studentAttempt": "Can you give me a subtle hint for this step?",
    "history": []
}

req = urllib.request.Request(
    "http://localhost:3000/api/chat",
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode('utf-8'))
        print("STATUS: SUCCESS")
        print("Tutor Message:", data.get('message'))
        print("Guiding Question:", data.get('guidingQuestion'))
        print("Analysis:", data.get('analysis'))
        print("Pedagogy:", data.get('pedagogical'))
        print("Evaluation:", data.get('evaluation'))
except Exception as e:
    print("ERROR:", e)
