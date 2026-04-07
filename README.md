<div align="center">

# 🤖 GenAI-TaskMaster

### AI-Powered Multi-Agent Smart Daily Assistant

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Click_Here-brightgreen?style=for-the-badge)](https://storage.googleapis.com/genai-task-manager-frontend-2025/index.html)
[![Backend API](https://img.shields.io/badge/🔗_Backend_API-Cloud_Run-blue?style=for-the-badge)](https://genai-task-manager-backend-232002352100.us-central1.run.app)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

<p align="center">
  <strong>A sophisticated AI-powered task management system that coordinates multiple intelligent agents to manage tasks, schedules, notes, and workflows using Google Gemini AI.</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-live-demo">Demo</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Setup</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-deployment">Deploy</a>
</p>

---

![Stars](https://img.shields.io/github/stars/rahul78451/GenAI-TaskMaster?style=social)
![Forks](https://img.shields.io/github/forks/rahul78451/GenAI-TaskMaster?style=social)
![Issues](https://img.shields.io/github/issues/rahul78451/GenAI-TaskMaster)
![License](https://img.shields.io/github/license/rahul78451/GenAI-TaskMaster)

</div>

---

## 📸 Screenshots

<div align="center">
<table>
<tr>
<td><img width="600" alt="Dashboard" src="https://github.com/user-attachments/assets/ffbec646-f811-4101-a26c-941b6691ff6b" /></td>
<td><img width="600" alt="Tasks" src="https://github.com/user-attachments/assets/09f9bbb2-b42b-4731-9090-ebcd36b41cd5" /></td>
</tr>
<tr>
<td><img width="600" alt="AI Assistant" src="https://github.com/user-attachments/assets/89547617-48f4-446e-be59-557c00a85f1a" /></td>
<td><img width="600" alt="Schedule" src="https://github.com/user-attachments/assets/f5b1505c-1e6c-47e9-8746-4c782e2bf304" /></td>
</tr>
</table>
</div>

| Feature | Preview |
|---------|---------|
| 📊 **Dashboard** | Real-time productivity overview with task statistics |
| 📋 **Task Management** | Create, edit, prioritize, and track tasks |
| 📅 **Smart Scheduling** | AI-powered calendar and event management |
| 📝 **Notes System** | Rich note-taking with search functionality |
| 🤖 **AI Assistant** | Conversational AI powered by Google Gemini |
| ⚙️ **Workflow Engine** | Natural language workflow automation |

---

## ✨ Features

### 🚀 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| 📋 **Task Management** | Full CRUD with priority levels (high/medium/low) and status tracking | ✅ Live |
| 📅 **Schedule Management** | Calendar events with time, location, and AI integration | ✅ Live |
| 📝 **Notes System** | Create, edit, search, and organize notes | ✅ Live |
| 🤖 **AI Chat Assistant** | Conversational AI powered by Google Gemini | ✅ Live |
| ⚙️ **Workflow Automation** | Natural language to multi-step task execution | ✅ Live |
| 🔍 **Universal Search** | Search across tasks, events, and notes simultaneously | ✅ Live |
| 💡 **AI Suggestions** | Smart productivity recommendations and fixes | ✅ Live |
| 📊 **Dashboard Analytics** | Real-time productivity overview and statistics | ✅ Live |
| 🎤 **Voice Input** | Voice-to-text for hands-free task creation | ✅ Live |
| 🔊 **Text-to-Speech** | AI responses read aloud | ✅ Live |
| 💬 **Floating Chat** | Quick access AI assistant on any page | ✅ Live |
| 🌐 **MCP Integration** | Model Context Protocol for tool coordination | ✅ Live |

### 🎯 AI Capabilities

- **Natural Language Processing** — Understand complex task descriptions
- **Smart Task Prioritization** — AI-powered priority recommendations
- **Conflict Detection** — Identify scheduling conflicts automatically
- **Daily Plan Generation** — Create optimized daily plans
- **Productivity Analysis** — Analyze work patterns and suggest improvements
- **Multi-step Workflows** — Execute complex operations from simple commands

---

## 🌐 Live Demo

| Component | URL | Status |
|-----------|-----|--------|
| 🖥️ **Frontend** | [Live App](https://storage.googleapis.com/genai-task-manager-frontend-2025/index.html) | ✅ Online |
| ⚙️ **Backend API** | [API Docs](https://genai-task-manager-backend-232002352100.us-central1.run.app/docs) | ✅ Online |
| 📡 **Health Check** | [Status](https://genai-task-manager-backend-232002352100.us-central1.run.app/health) | ✅ Healthy |

### Try It Now!
```bash
# Test the AI Chat
curl -X POST "https://genai-task-manager-backend-232002352100.us-central1.run.app/api/ai-chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you do?"}'

### 🧠 Multi-Agent AI Architecture

┌────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React 18 + Tailwind CSS                     │  │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ ┌─────┐ ┌──────────────┐ │  │
│  │  │Dashbd│ │Tasks │ │Schedule│ │Notes│ │  AI Assistant │ │  │
│  │  └──────┘ └──────┘ └────────┘ └─────┘ └──────────────┘ │  │
│  │              ↕ API Client (fetch)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕ HTTPS                             │
├────────────────────────────────────────────────────────────────┤
│                        API LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              FastAPI + Uvicorn                            │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │/api/tasks│ │/api/sched │ │/api/notes│ │/api/ai-chat│  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └───────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕                                   │
├────────────────────────────────────────────────────────────────┤
│                    INTELLIGENCE LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Multi-Agent Coordinator                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │Task Agent│ │Sched Agnt│ │Note Agent│ │Tool Agent  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │
│  │                     ↕                                    │  │
│  │            Google Gemini AI API                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕                                   │
├────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         SQLite + SQLAlchemy ORM                          │  │
│  │  ┌──────┐ ┌────────┐ ┌─────┐ ┌──────────┐              │  │
│  │  │Tasks │ │Schedule│ │Notes│ │Workflows │              │  │
│  │  └──────┘ └────────┘ └─────┘ └──────────┘              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                   DEPLOYMENT LAYER                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  Google Cloud    │  │ Google Cloud    │  │   Docker     │  │
│  │  Run (Backend)   │  │ Storage (FE)   │  │  Container   │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────────────┘

User Request: "Create a high priority task for tomorrow's meeting and add it to my schedule"
                                    │
                                    ▼
                          ┌─────────────────┐
                          │   Coordinator    │
                          │     Agent        │
                          └─────────────────┘
                           │              │
                    ┌──────┘              └──────┐
                    ▼                            ▼
            ┌──────────────┐            ┌──────────────┐
            │  Task Agent  │            │Schedule Agent│
            │              │            │              │
            │ Creates task │            │Creates event │
            │ priority:high│            │ tomorrow     │
            └──────────────┘            └──────────────┘
                    │                            │
                    └──────────┬─────────────────┘
                               ▼
                    ┌─────────────────┐
                    │  Unified Result  │
                    │  Task + Event    │
                    │  Created ✅      │
                    └─────────────────┘
###📁 Project Structure

GenAI-TaskMaster/
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 agents/              # AI Agent System
│   │   │   ├── coordinator.py      # Main coordinator agent
│   │   │   ├── task_agent.py       # Task management agent
│   │   │   ├── schedule_agent.py   # Schedule management agent
│   │   │   ├── note_agent.py       # Notes management agent
│   │   │   └── tool_agent.py       # MCP tool agent
│   │   ├── 📂 tools/               # MCP Tool Integration
│   │   │   ├── mcp_tools.py        # Model Context Protocol tools
│   │   │   ├── task_tools.py       # Task-specific tools
│   │   │   ├── schedule_tools.py   # Schedule-specific tools
│   │   │   └── note_tools.py       # Note-specific tools
│   │   ├── 📂 models/              # Data Models
│   │   │   ├── schemas.py          # Pydantic schemas
│   │   │   └── database.py         # SQLAlchemy models
│   │   └── __init__.py
│   ├── main.py                     # FastAPI application entry point
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Docker container config
│   ├── Dockerfile.prod             # Production Docker config
│   ├── .env.example                # Environment template
│   └── test_*.py                   # Test files
├── 📂 frontend/
│   ├── index.html                  # Main HTML entry point
│   ├── app.js                      # React application (190KB)
│   ├── api.js                      # API client class
│   └── package.json                # Frontend config
├── docker-compose.yml              # Docker Compose config
├── cloudbuild.yaml                 # Cloud Build config
├── deploy-gcp.sh                   # GCP deployment script
├── app.yaml                        # App Engine config
├── .gitignore                      # Git ignore rules
├── LICENSE                         # MIT License
└── README.md                       # This file
