# 🚀 CodePilot — AI-Powered Interactive Programming Tutor & Collaborative Studio

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node Express" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Monaco_Editor-VS_Code_Power-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Monaco" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>Understand your code. Ask anything. Learn together. Master algorithms your way.</strong>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture--how-it-works">Architecture</a> •
  <a href="#-learning-modes">Learning Modes</a> •
  <a href="#-realtime-collaborative-rooms">Collaborative Rooms</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-security--safety">Security</a> •
  <a href="#-api-reference">API Reference</a>
</p>

---

## 🌟 Overview

**CodePilot** is a next-generation AI-powered programming companion and live collaborative coding workspace. Rather than simply regurgitating code snippets, CodePilot dissects your code using **AST-level static analysis**, **algorithmic execution tracing**, and **grounded Google Gemini AI reasoning** to explain how and why code works.

Whether you are a beginner demystifying recursion, an engineer preparing for FAANG technical interviews, or a team pair-programming across time zones, CodePilot provides an immersive, interactive environment designed for deep comprehension.

---

## ✨ Key Features

### 1. 🧠 Dual-Layer Intelligence Engine
- **Deterministic AST Static Analyzer:** Parses code syntax (functions, loops, recursion, data structures) with zero latency and zero LLM cost using Babel and regex pattern extractors.
- **Context-Grounded Google Gemini AI:** The server feeds AST structural metadata directly into Gemini prompts, eliminating hallucinations and delivering spot-on code reviews.
- **SmartRouter (Token Optimization):** Resolves common structural inquiries (e.g., *"What is the time complexity?"*, *"Which functions exist?"*) deterministically at $0 token cost.

### 2. ⚡ Real-Time Collaborative Coding Rooms
- **Instant WebSockets Sync:** Multi-user live coding powered by Socket.IO.
- **Monotonic Concurrency Control:** Version-tagged code changes prevent stale overwrites and gracefully reconcile race conditions.
- **Live Peer Cursors & Selection:** Colored cursor badges and selection flags show exactly where teammates are navigating inside Monaco Editor.
- **Granular Roles & Permissions:** Host controls participant privileges (`Host`, `Editor`, `Viewer`).
- **Public & Passcode-Protected Rooms:** Easily share room codes or direct join links (`?room=ROOM-XXXX`).

### 3. 🧑‍🏫 Shared AI Tutoring (`@pilot`)
- **Synchronized Analysis:** When one collaborator clicks "Analyze Code", the entire room receives the comprehensive breakdown and diagrams simultaneously.
- **Collaborative Live Chat:** Built-in team messaging drawer with direct `@pilot` AI mentions so everyone learns from answers together.

### 4. 📊 Visual Learning Studio
- **🔀 Interactive Flowcharts:** Auto-generates clear logical execution flows from code branches.
- **⏱️ Step-by-Step Execution Tracer:** Inspect loop iterations, branch conditions, and variable states frame-by-frame.
- **📦 Data Structure Visualizer:** Graphical rendering of Arrays, Hash Maps, Linked Lists, Trees, and Graphs.

### 5. 🎯 Adaptive Practice & Technical Interviews
- **Auto-Generated Practice Quizzes:** Dynamic multiple-choice questions grounded specifically in the code you pasted.
- **FAANG-Style Interview Simulations:** Generates follow-up constraints, optimization challenges, and edge-case drills.

### 6. 📈 Learner Profile & Mastery Tracking
- Automatically categorizes concepts into *Encountered*, *Mastered*, and *Needs Review*.
- Tracks confusion points and keeps a running quiz mastery score.

### 7. 💾 Session Archival & Export
- Download complete session summaries with final code, chat transcripts, and full AI analyses in Markdown or JSON format.

---

## 🏗️ Architecture & How It Works

```
CodePilot/
├── backend/                       # Express API Server & Socket.IO Engine
│   ├── data/                      # Local SQLite database (WAL mode)
│   ├── src/
│   │   ├── server.js              # Server entry point & CORS configuration
│   │   ├── routes/                # REST endpoints (/analyze, /chat, /rooms)
│   │   ├── services/
│   │   │   ├── aiService.js       # Google Gemini API client
│   │   │   ├── smartRouter.js     # 0-token deterministic query router
│   │   │   ├── roomService.js     # Room lifecycle, roles & versioning
│   │   │   ├── practiceService.js # Quiz & interview question generator
│   │   │   ├── analyzer/          # AST static code analyzer & normalizer
│   │   │   ├── execution/         # Step-by-step code execution tracer
│   │   │   ├── realtime/          # Socket.IO room synchronization server
│   │   │   └── storage/db.js      # Resilient SQLite DatabaseSync persistence
│   │   └── prompts/               # Structured modular AI system prompts
│   └── .env.example
│
└── frontend/                      # React 19 + Vite + TypeScript Client
    ├── src/
    │   ├── App.tsx                # Central studio state & real-time orchestrator
    │   ├── components/
    │   │   ├── CodeEditor.tsx     # Monaco Editor with remote peer cursors
    │   │   ├── AnalysisPanel.tsx  # Multi-tab analysis studio
    │   │   ├── CollaboratorsDrawer.tsx # Live chat, members roster & @pilot
    │   │   ├── RoomModal.tsx      # Create / Join room dialog
    │   │   ├── FlowchartViewer.tsx# Dynamic logic flow diagram
    │   │   ├── ExecutionTracerView.tsx # Step-by-step code execution stepper
    │   │   ├── DataStructureViewer.tsx # Visual memory representations
    │   │   ├── PracticeView.tsx   # Interactive quiz engine
    │   │   ├── InterviewView.tsx  # Technical interview challenges
    │   │   ├── LearnerProfileView.tsx # Knowledge mastery radar
    │   │   └── MarkdownRenderer.tsx # Syntax-highlighted AI markdown
    │   ├── services/
    │   │   ├── api.ts             # REST client for backend endpoints
    │   │   └── socket.ts          # Socket.IO real-time client singleton
    │   └── types/                 # Shared TypeScript interfaces
    └── vite.config.ts
```

---

## 🎓 Learning Modes

Tailor the AI mentor's pedagogical approach with a single click:

| Mode | Target Audience | AI Behavior |
| :--- | :--- | :--- |
| 🌱 **Beginner** | New coders & students | Uses intuitive everyday analogies, eliminates jargon, explains syntax line-by-line. |
| 🧑‍🏫 **Mentor** *(Default)* | Self-learners & bootcamps | Socratic method; guides problem-solving, highlights trade-offs, asks leading questions. |
| 💼 **Professional** | Software engineers | Rigorous code review, Big-O complexity, architectural patterns, clean code & security. |
| 🎯 **Interview** | Job seekers & leetcoders | Technical interview prep, optimal vs brute-force comparisons, edge cases, follow-ups. |

---

## 🌐 Supported Programming Languages

- 💛 **JavaScript** (`.js`) — Full AST parsing & execution trace
- 💙 **TypeScript** (`.ts`) — Type-aware static structure analysis
- 🐍 **Python** (`.py`) — Indentation & algorithmic trace analysis
- ☕ **Java** (`.java`) — Class & method structure extraction
- ⚡ **C++** (`.cpp`) — Pointer & memory pattern analysis
- 🐹 **Go** (`.go`) — Concurrency & structural inspection
- 🦀 **Rust** (`.rs`) — Ownership & pattern diagnostics

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (`@monaco-editor/react`)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Real-Time Client:** [Socket.IO Client](https://socket.io/)
- **Syntax Highlighting:** [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) + [React Markdown](https://github.com/remarkjs/react-markdown)

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) (ES Modules)
- **Web Framework:** [Express](https://expressjs.com/)
- **Real-Time Engine:** [Socket.IO](https://socket.io/)
- **AI Model:** [Google Gemini 2.5 Flash](https://ai.google.dev/) via `@google/generative-ai`
- **AST Parsing:** `@babel/parser`
- **Database:** Node.js native `DatabaseSync` (`node:sqlite`) with Write-Ahead Logging (WAL)
- **Security:** `cors`, `express-rate-limit`, `dotenv`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v20.x or higher (recommended for built-in `node:sqlite` support)
- **npm:** v10.x or higher
- **Gemini API Key:** Free key available from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/anjali-codes2305/CodePilot.git
cd CodePilot
```

---

### Step 2: Configure Environment Variables

#### Backend Configuration
```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3001
NODE_ENV=development
```

#### Frontend Configuration (Optional)
```bash
cd ../frontend
cp .env.example .env
```
*(Defaults to `http://localhost:3001` if omitted).*

---

### Step 3: Install Dependencies

```bash
# In backend directory
cd ../backend
npm install

# In frontend directory
cd ../frontend
npm install
```

---

### Step 4: Run the Application

You can start both servers using separate terminals:

#### Terminal 1 — Backend API & Socket Server:
```bash
cd backend
npm run dev
```
*Backend runs on `http://localhost:3001`.*

#### Terminal 2 — Frontend Development Server:
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🔒 Security & Privacy

1. **Zero Client Secret Leakage:** The `GEMINI_API_KEY` is strictly confined to the backend server. The client communicates solely through vetted Express endpoints.
2. **Zero Remote Code Execution (RCE):** User code is **never executed on the server**. Code is parsed statically using AST analysis and evaluated via LLM reasoning.
3. **Built-in Rate Limiting:** All `/api/*` endpoints are protected by an IP-based rate limiter (60 requests/min).
4. **Resilient Local Persistence:** Collaborative rooms, members, and messages are stored locally in an embedded SQLite database (`backend/data/codepilot.db`) excluded from version control.

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & service readiness |
| `POST` | `/api/analyze` | Run AST parsing + Gemini analysis |
| `POST` | `/api/chat` | Contextual follow-up chat with AI |
| `GET` | `/api/rooms` | List active public collaborative rooms |
| `POST` | `/api/rooms` | Create a new collaborative room |
| `GET` | `/api/rooms/:id` | Fetch room state and member list |
| `POST` | `/api/rooms/:id/join` | Join a room with client verification |
| `GET` | `/api/rooms/:id/export` | Export room session (Markdown / JSON) |

### Real-Time WebSocket Events (Socket.IO)

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `room:join` | Client ➔ Server | Join room session (`roomId`, `userName`, `passcode`) |
| `member:joined` | Server ➔ Room | Broadcast newly joined collaborator |
| `code:change` | Client ➔ Server | Monotonic versioned code edit |
| `code:updated` | Server ➔ Room | Synchronize authoritative code change |
| `code:conflict` | Server ➔ Client | Stale edit rejected; sends authoritative server code |
| `cursor:move` | Client ➔ Server | Cursor position & selection update |
| `cursor:updated` | Server ➔ Room | Broadcast peer cursor position to collaborators |
| `analysis:trigger` | Client ➔ Server | Initiate room-wide shared AI analysis |
| `analysis:completed` | Server ➔ Room | Broadcast completed analysis to all members |
| `chat:send` | Client ➔ Server | Send room message or `@pilot` AI prompt |
| `chat:message` | Server ➔ Room | Broadcast chat or AI response |

---

## 🤝 Contributing

Contributions are warmly welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<p align="center">
  Made with ❤️ by <a href="https://github.com/anjali-codes2305">Anjali Agarwal</a>
</p>
