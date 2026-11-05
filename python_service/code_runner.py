import ast
import json
import os
import subprocess
import sys
import tempfile
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
    def check_policy(tree: ast.AST) -> Optional[str]:
        """Reject code outside what a beginner exercise needs, before it is ever run.

        Dunder attribute access is the standard way out of a restricted exec()
        (e.g. ().__class__.__base__.__subclasses__()), so it is refused outright.
        """
        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
                return f"Accessing '{node.attr}' is not permitted in the learning sandbox."
            if isinstance(node, ast.Name) and node.id.startswith("__") and node.id != "__name__":
                return f"Using '{node.id}' is not permitted in the learning sandbox."
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split(".")[0] not in ALLOWED_IMPORTS:
                        return f"Importing '{alias.name}' is not permitted in the learning sandbox."
            if isinstance(node, ast.ImportFrom):
                if (node.module or "").split(".")[0] not in ALLOWED_IMPORTS or node.level:
                    return f"Importing from '{node.module}' is not permitted in the learning sandbox."
        return None

    @staticmethod
    def execute_code(code: str, test_inputs: Optional[List[str]] = None, timeout_sec: float = 3.0) -> Dict[str, Any]:
        """Run student code in a separate, time-limited Python process with restricted builtins.

        This is a guard against accidents and casual misuse in a local learning tool,
        not a security boundary for hostile code: serve it on localhost only.
        """
        syntax = PythonCodeRunner.check_syntax(code)
        if not syntax["valid"]:
            return {
                "success": False,
                "error_type": "SyntaxError",
                "error": syntax["error"],
                "output": "",
            }

        violation = PythonCodeRunner.check_policy(syntax["tree"])
        if violation:
            return {"success": False, "error_type": "SecurityRestriction", "error": violation, "output": ""}

        request = json.dumps({"code": code, "inputs": list(test_inputs or []), "allowed": sorted(ALLOWED_IMPORTS)})
        env = {"PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
        if os.name == "nt" and os.environ.get("SYSTEMROOT"):
            env["SYSTEMROOT"] = os.environ["SYSTEMROOT"]  # needed by Python startup on Windows

        with tempfile.TemporaryDirectory() as workdir:
            try:
                proc = subprocess.run(
                    [sys.executable, "-I", "-S", "-c", _CHILD_RUNNER],
                    input=request,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    timeout=timeout_sec,
                    cwd=workdir,
                    env=env,
                    preexec_fn=_limit_resources if os.name == "posix" else None,
                )
            except subprocess.TimeoutExpired:
                return {
                    "success": False,
                    "error_type": "TimeoutError",
                    "error": f"TimeoutError: the code ran for more than {timeout_sec:g} seconds (is there an infinite loop?)",
                    "output": "",
                }

        try:
            return json.loads(proc.stdout.strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError):
            reason = "the code used too much memory" if proc.returncode and not proc.stdout else (proc.stderr.strip()[-300:] or "no result")
            return {"success": False, "error_type": "RuntimeError", "error": f"RuntimeError: {reason}", "output": ""}


# Standard-library modules a beginner exercise may import; none give file, process or network access.
ALLOWED_IMPORTS = {
    "math", "cmath", "random", "statistics", "itertools", "functools", "collections", "string",
    "fractions", "decimal", "operator", "re", "datetime", "heapq", "bisect", "copy", "typing", "dataclasses",
}

MAX_OUTPUT_CHARS = 20000


def _limit_resources() -> None:
    import resource
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))


# Runs inside the child process: executes the student code with restricted builtins and prints one JSON line.
_CHILD_RUNNER = r"""
import builtins, io, json, sys, traceback
req = json.loads(sys.stdin.read())
allowed = set(req["allowed"])
real_import = builtins.__import__
def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level or name.split(".")[0] not in allowed:
        raise ImportError(f"Importing '{name}' is not permitted in the learning sandbox.")
    return real_import(name, globals, locals, fromlist, level)
inputs = iter(req["inputs"])
safe_builtins = {k: v for k, v in vars(builtins).items()
                 if k not in ("open", "compile", "exec", "eval", "input", "breakpoint", "help", "exit", "quit", "globals", "vars", "memoryview")}
safe_builtins["__import__"] = safe_import
# getattr(obj, "__class__") passes the dunder as a string, which the AST check cannot see.
def _guard(fn):
    def guarded(obj, name, *args):
        if isinstance(name, str) and name.startswith("_"):
            raise AttributeError(f"Accessing '{name}' is not permitted in the learning sandbox.")
        return fn(obj, name, *args)
    return guarded
for _name in ("getattr", "setattr", "delattr", "hasattr"):
    safe_builtins[_name] = _guard(getattr(builtins, _name))
safe_builtins["input"] = lambda *args: next(inputs, "")
out = io.StringIO()
real_stdout = sys.stdout
sys.stdout = out
result = {"success": True, "error": None, "error_type": None}
try:
    exec(compile(req["code"], "<student code>", "exec"), {"__builtins__": safe_builtins, "__name__": "__main__"})
except BaseException as e:
    tb = traceback.format_exc().splitlines()
    result = {"success": False, "error_type": type(e).__name__, "error": f"{type(e).__name__}: {e}",
              "traceback": "\n".join(tb[-6:])}
sys.stdout = real_stdout
result["output"] = out.getvalue()[:%d]
print(json.dumps(result))
""" % MAX_OUTPUT_CHARS
