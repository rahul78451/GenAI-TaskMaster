# 🤖 GenAI TaskMaster — AI-Powered Smart Daily Assistant

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-orange?logo=google)
![GCP](https://img.shields.io/badge/Google%20Cloud-Deployed-blue?logo=googlecloud)
![License](https://img.shields.io/badge/License-MIT-yellow)

> An intelligent, full-stack productivity platform powered by **Google Gemini AI** — featuring smart task management, AI-powered scheduling, interactive voice chat, project planning, and workflow automation.

---

## 🌟 Live Demo

🔗 **Frontend:** [TaskMaster AI Dashboard](https://storage.googleapis.com/thermal-rain-459618-t5-frontend/index.html)  
🔗 **Backend API:** [FastAPI Backend](https://genai-backend-1013063132017.us-central1.run.app/docs)

---

## ✨ Key Features

### 📊 Smart Dashboard
- Real-time productivity overview with stats, streaks, and completion tracking
- Focus Timer (Pomodoro) built into the dashboard
- Global search across tasks, schedule, notes, and workflows
- Responsive dark/light mode with glassmorphism design

### ✅ Task Management
- Create, edit, delete tasks with priority levels (High/Medium/Low)
- Filter by status (Pending/Completed/All)
- Quick task creation from the dashboard
- AI-generated task suggestions

### 📅 Intelligent Scheduling
- Calendar event management with date/time support
- Status tracking (Upcoming/Completed/Cancelled)
- AI-powered daily plan generation based on task priorities

### 🤖 AI Life Assistant (Gemini-Powered)
- **Interactive Chat** — Ask anything, get AI-powered responses
- **Voice Input** — Speak your questions using browser speech recognition
- **Text-to-Speech** — AI reads responses aloud
- **Smart Daily Planner** — Auto-generates optimized schedules by priority
- **AI Suggestions** — Personalized productivity tips & actionable fixes
- **"Got It!" to Task** — One-click to convert AI suggestions into tasks

### 📝 Notes
- Rich text notes with color coding
- Pin important notes to the top
- Search and filter notes

### 📋 Project Planner
- Goal-based project generation with AI
- Kanban board / Timeline / List views
- Task status management (To Do → In Progress → Done)
- AI suggestions per project

### ⚙️ Workflow Automation
- Multi-step workflow builder
- AI-powered workflow generation from natural language
- Visual pipeline with step tracking

### 📈 Data Analysis
- Task completion analytics
- Productivity trends and insights
- Visual charts powered by Chart.js

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 (CDN), Vanilla CSS, Chart.js |
| **Backend** | Python, FastAPI, SQLAlchemy, SQLite |
| **AI Engine** | Google Gemini API (gemini-2.0-flash) |
| **Hosting** | Google Cloud Run (Backend), Google Cloud Storage (Frontend) |
| **Design** | Glassmorphism, CSS Custom Properties, Dark/Light Theme |

---

## 📁 Project Structure

```
GenAIProject/
├── backend/
│   ├── main.py              # FastAPI app with all API routes
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Container config for Cloud Run
│   ├── Dockerfile.prod      # Production Docker config
│   ├── .env.example         # Environment variable template
│   └── reset_db.py          # Database reset utility
├── frontend/
│   ├── index.html           # Main HTML with CSS design system
│   ├── app.js               # Core React application (Dashboard, Tasks, Schedule, Notes, AI Assistant)
│   ├── api.js               # API client configuration
│   ├── project_planner.js   # Project Planner component
│   ├── workflow_new.js      # Workflow Automation component
│   ├── data_analysis.js     # Data Analysis component
│   └── package.json         # Frontend metadata
├── .gitignore               # Git ignore rules
├── .env.example             # Root environment template
├── deploy-gcp.ps1           # Windows GCP deployment script
├── deploy-gcp.sh            # Linux/Mac GCP deployment script
├── cloudbuild.yaml           # Google Cloud Build config
├── docker-compose.yml       # Local Docker setup
├── Procfile                 # Process configuration
└── README.md                # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### 1. Clone the Repository
```bash
git clone https://github.com/rahul78451/GenAI-TaskMaster.git
cd GenAI-TaskMaster
```

### 2. Set Up Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Copy the template
cp .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 5. Open the Frontend
Open `frontend/index.html` in your browser, or serve it:
```bash
cd frontend
python -m http.server 5500
```
Then visit: `http://localhost:5500`

> **Note:** For local development, update the API URL in `frontend/app.js` to point to `http://localhost:8000`.

---

## ☁️ Cloud Deployment (Google Cloud Platform)

### Backend → Cloud Run
```bash
cd backend
gcloud run deploy genai-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your_key"
```

### Frontend → Cloud Storage
```bash
# Create bucket
gcloud storage buckets create gs://YOUR_BUCKET_NAME --location=us-central1

# Upload frontend files
gcloud storage cp frontend/index.html gs://YOUR_BUCKET_NAME/
gcloud storage cp frontend/app.js gs://YOUR_BUCKET_NAME/
gcloud storage cp frontend/api.js gs://YOUR_BUCKET_NAME/
gcloud storage cp frontend/project_planner.js gs://YOUR_BUCKET_NAME/
gcloud storage cp frontend/workflow_new.js gs://YOUR_BUCKET_NAME/
gcloud storage cp frontend/data_analysis.js gs://YOUR_BUCKET_NAME/

# Make bucket public
gcloud storage buckets add-iam-policy-binding gs://YOUR_BUCKET_NAME \
  --member=allUsers --role=roles/storage.objectViewer
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/{id}` | Update a task |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `GET` | `/api/schedule` | List schedule events |
| `POST` | `/api/schedule` | Create a schedule event |
| `GET` | `/api/notes` | List all notes |
| `POST` | `/api/notes` | Create a note |
| `POST` | `/api/ai-chat` | Chat with AI assistant |
| `GET` | `/api/suggestions` | Get AI productivity suggestions |
| `GET` | `/api/stats` | Get dashboard statistics |
| `GET` | `/docs` | Swagger API documentation |

---

## 🎨 Screenshots

### Dashboard (Dark Mode)
The dashboard features a glassmorphism design with real-time stats, focus timer, and productivity tracking.

### AI Assistant
Interactive chat with voice input/output, daily plan generation, and smart suggestions that can be converted to tasks with one click.

### Project Planner
Kanban-style project management with AI-powered task generation and progress tracking.

---

## 🔒 Security

- All API keys are stored in `.env` files (excluded from Git)
- `.gitignore` blocks `.env`, `*.key`, `*.pem`, `*credentials*.json`, and database files
- CORS is configured for production domains
- No secrets are committed to the repository

---

## 🛣️ Roadmap

- [ ] Cloud SQL migration (replace SQLite with PostgreSQL)
- [ ] User authentication (Google OAuth)
- [ ] Mobile-responsive PWA
- [ ] Task collaboration & sharing
- [ ] Email/notification reminders
- [ ] Advanced AI analytics with historical trends

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Rahul** — [@rahul78451](https://github.com/rahul78451)

---

<p align="center">
  Built with ❤️ using Google Gemini AI, FastAPI & React
</p>
