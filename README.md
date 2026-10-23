# Misconception Tutoring AI

An LLM-based pedagogical tutoring system with multi-stage solution analysis, adaptive Socratic dialogue, real-time misconception detection, and automated execution tracing across Mathematics and Python.

## Features

- **Multi-Stage Solution Analysis**: Dissects student attempts step-by-step rather than just providing final answers.
- **Misconception Detection & RAG Pipeline**: Leverages curated misconception taxonomies (EEDI, MathDial, GSM8K, and Python AST runtime tracing) to diagnose underlying reasoning gaps.
- **Adaptive Socratic Dialogue**: Pedagogical coaching and scaffolded hints tailored to student competency levels.
- **Python Execution & AST Analysis**: Safe execution environment with mental execution tracing for syntax and logic errors.
- **Rich Interactive UI**: Modern dark-mode interface with live chat, problem bank, custom problem editor, and architectural inspection panel.

## Architecture

![Architecture](initial_architecture.png)

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.10+ (for Python tutoring service)

### Installation

1. **Install Node dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your-api-key-here"
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons, Three.js
- **Backend**: Express, TSX, Node.js
- **AI / LLM**: Google GenAI SDK (`@google/genai`), RAG pipeline
- **Python Service**: AST parser, Python code runner, misconception classifier
