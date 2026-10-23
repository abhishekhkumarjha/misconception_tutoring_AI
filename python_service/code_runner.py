import ast
import io
import sys
import contextlib
import traceback
from typing import Dict, Any, List, Optional

class PythonCodeRunner:
    """Safe AST analysis and restricted execution runner for student Python code."""

    @staticmethod
    def check_syntax(code: str) -> Dict[str, Any]:
        """Check if Python code has valid syntax using AST parsing."""
        try:
            tree = ast.parse(code)
            return {"valid": True, "error": None, "tree": tree}
        except SyntaxError as e:
            return {
                "valid": False,
                "error": f"SyntaxError at line {e.lineno}: {e.msg}",
                "lineno": e.lineno,
                "offset": e.offset,
                "text": e.text,
            }

    @staticmethod
    def analyze_ast_features(code: str) -> Dict[str, Any]:
        """Extract structural AST features for construct verification."""
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return {"syntax_error": True}

        features = {
            "has_loops": False,
            "loop_types": [],
            "range_calls": [],
            "functions_defined": [],
            "has_return": False,
            "has_print": False,
            "slice_operations": 0,
            "binary_ops": [],
            "compare_ops": [],
        }

        for node in ast.walk(tree):
            if isinstance(node, ast.For):
                features["has_loops"] = True
                features["loop_types"].append("for")
                if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
                    args = []
                    for a in node.iter.args:
                        if isinstance(a, ast.Constant):
                            args.append(a.value)
                        elif isinstance(a, ast.UnaryOp) and isinstance(a.op, ast.USub) and isinstance(a.operand, ast.Constant):
                            args.append(-a.operand.value)
                        else:
                            args.append("expr")
                    features["range_calls"].append(args)
            elif isinstance(node, ast.While):
                features["has_loops"] = True
                features["loop_types"].append("while")
            elif isinstance(node, ast.FunctionDef):
                features["functions_defined"].append(node.name)
            elif isinstance(node, ast.Return):
                features["has_return"] = True
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == "print":
                    features["has_print"] = True
            elif isinstance(node, ast.Subscript):
                if isinstance(node.slice, ast.Slice):
                    features["slice_operations"] += 1
            elif isinstance(node, ast.BinOp):
                features["binary_ops"].append(type(node.op).__name__)
            elif isinstance(node, ast.Compare):
                for op in node.ops:
                    features["compare_ops"].append(type(op).__name__)

        return features

    @staticmethod
    def execute_code(code: str, test_inputs: Optional[List[str]] = None, timeout_sec: float = 2.0) -> Dict[str, Any]:
        """Safely execute Python code with redirected stdout and restricted globals."""
        syntax = PythonCodeRunner.check_syntax(code)
        if not syntax["valid"]:
            return {
                "success": False,
                "error_type": "SyntaxError",
                "error": syntax["error"],
                "output": "",
            }

        # Disallow dangerous operations in student code
        forbidden_keywords = ["import os", "import sys", "import subprocess", "import shutil", "__import__", "eval(", "exec("]
        for kw in forbidden_keywords:
            if kw in code:
                return {
                    "success": False,
                    "error_type": "SecurityRestriction",
                    "error": f"Security restriction: '{kw}' is not permitted in the learning sandbox.",
                    "output": "",
                }

        stdout_buf = io.StringIO()
        builtins_dict = __builtins__ if isinstance(__builtins__, dict) else __builtins__.__dict__
        restricted_globals = {
            "__builtins__": {
                k: v for k, v in builtins_dict.items()
                if k not in ["open", "compile", "exec", "eval", "input", "__import__"]
            }
        }

        # If test inputs provided, mock input()
        if test_inputs:
            input_iter = iter(test_inputs)
            restricted_globals["__builtins__"]["input"] = lambda *args: next(input_iter, "")
        else:
            restricted_globals["__builtins__"]["input"] = lambda *args: ""

        try:
            with contextlib.redirect_stdout(stdout_buf):
                exec(code, restricted_globals)
            return {
                "success": True,
                "output": stdout_buf.getvalue(),
                "error": None,
                "error_type": None,
            }
        except Exception as e:
            tb = traceback.format_exc()
            clean_tb = "\n".join([line for line in tb.splitlines() if "code_runner.py" not in line])
            return {
                "success": False,
                "error_type": type(e).__name__,
                "error": f"{type(e).__name__}: {str(e)}",
                "traceback": clean_tb,
                "output": stdout_buf.getvalue(),
            }
