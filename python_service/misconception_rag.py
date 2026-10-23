"""
Misconception Taxonomy and In-Context RAG Indexer
Provides construct-level mapping and candidate retrieval from the 67 Python misconception bank.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

class MisconceptionRAG:
    def __init__(self, bank_path: Optional[str] = None):
        if not bank_path:
            base_dir = Path(__file__).resolve().parent
            candidates = [
                base_dir / "data" / "misconception_bank.json",
                base_dir / "dataset" / "misconception_bank.json",
            ]
            bank_path = next((p for p in candidates if p.exists()), candidates[0])
        
        self.bank_path = Path(bank_path)
        self.misconceptions: List[Dict[str, Any]] = []
        self.construct_index: Dict[str, List[Dict[str, Any]]] = {}
        self.load_bank()

    def load_bank(self):
        """Load and index misconception bank entries."""
        if not self.bank_path.exists():
            print(f"Warning: Misconception bank not found at {self.bank_path}")
            return
            
        with open(self.bank_path, "r", encoding="utf-8") as f:
            self.misconceptions = json.load(f)
            
        # Index by constructs and keywords
        for m in self.misconceptions:
            meta = m.get("meta_data", {})
            constructs = meta.get("related_constructs", [])
            for c in constructs:
                norm_c = c.lower().replace("_", " ")
                if norm_c not in self.construct_index:
                    self.construct_index[norm_c] = []
                self.construct_index[norm_c].append(m)

    def extract_code_features(self, code: str) -> List[str]:
        """Extract Python programming constructs present in the code snippet."""
        features = set()
        code_lower = code.lower()
        
        # Iteration and ranges
        if "range(" in code_lower:
            features.add("range function")
            features.add("iteration")
        if "for " in code_lower:
            features.add("for loops")
            features.add("iteration")
        if "while " in code_lower:
            features.add("while loops")
            features.add("iteration")
            
        # Lists, sequences, indexing
        if "[" in code and "]" in code:
            features.add("zero based indexing")
            features.add("list operations")
            features.add("indexing")
        if "[-" in code:
            features.add("negative indexing")
        if ".append(" in code_lower or ".remove(" in code_lower or ".pop(" in code_lower or "del " in code_lower:
            features.add("list modification")
            features.add("mutability")
            
        # Boolean logic and conditionals
        if " or " in code_lower:
            features.add("boolean operators")
            features.add("or operator")
        if " and " in code_lower:
            features.add("boolean operators")
            features.add("and operator")
        if "==" in code:
            features.add("equality comparison")
        if "is " in code_lower:
            features.add("identity operator")
            
        # Functions and scope
        if "def " in code_lower:
            features.add("function definitions")
            features.add("variable scope")
        if "return" in code_lower:
            features.add("return values")
        if "print(" in code_lower:
            features.add("print vs return")
            
        # Types and casting
        if "/" in code and "//" not in code:
            features.add("division operator")
        if "del " in code_lower:
            features.add("memory management")
            features.add("variable deletion")
            
        return list(features)

    def retrieve_candidates(self, code: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """Retrieve the top-k most relevant candidate misconceptions for the given code."""
        features = self.extract_code_features(code)
        candidate_scores: Dict[int, int] = {}
        misc_map: Dict[int, Dict[str, Any]] = {}
        
        code_words = set(re.findall(r'\b[a-z_]{3,}\b', code.lower()))
        
        for m in self.misconceptions:
            m_id = m["id"]
            misc_map[m_id] = m
            score = 0
            
            # Construct matching
            meta_constructs = [c.lower().replace("_", " ") for c in m.get("meta_data", {}).get("related_constructs", [])]
            for feat in features:
                if any(feat in mc or mc in feat for mc in meta_constructs):
                    score += 3
            
            # Description keyword matching
            desc_words = set(re.findall(r'\b[a-z_]{3,}\b', m.get("description", "").lower()))
            overlap = len(code_words.intersection(desc_words))
            score += overlap
            
            candidate_scores[m_id] = score
            
        sorted_candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)
        top_candidates = [misc_map[m_id] for m_id, sc in sorted_candidates[:top_k] if sc > 0]
        
        # If no strong match, return top generic misconceptions
        if not top_candidates and self.misconceptions:
            top_candidates = self.misconceptions[:top_k]
            
        return top_candidates

    def format_candidates_prompt(self, candidates: List[Dict[str, Any]]) -> str:
        """Format candidate misconceptions for in-context injection into the LLM prompt."""
        if not candidates:
            return ""
            
        lines = ["### Known Misconception Reference Candidates:"]
        for c in candidates:
            lines.append(f"- [ID {c['id']}]: {c['description']}")
        lines.append("\nNote: Use the above reference descriptions as guidance if the student's error aligns with one of these documented patterns.")
        return "\n".join(lines)
