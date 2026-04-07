# Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Windows
1. Open Command Prompt in project root
2. Run: `start-dev.bat`
3. Two windows will open
4. Open browser: `http://localhost:3000`

### Mac/Linux
1. Open Terminal in project root
2. Run: `chmod +x start-dev.sh && ./start-dev.sh`
3. Open browser: `http://localhost:3000`

## 📌 Manual Start

### Terminal 1 - Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

### Terminal 2 - Frontend
```bash
cd frontend
python -m http.server 3000
```

Then visit: `http://localhost:3000`

## 🎯 Quick Test

1. **Create a Task**: Go to Tasks tab, add "Review Project Proposal"
2. **Add to Calendar**: Schedule → Add event "Project Review Meeting"
3. **Take Notes**: Notes → "Project Details"
4. **AI Workflow**: Try "Schedule a planning meeting at 3 PM and create a task to review designs"

## 🔧 API Testing

Use Swagger UI: `http://localhost:8000/docs`

## 📊 Dashboard
View metrics: Tasks count, Events, Notes

## 🤖 AI Agents
- **Coordinator Agent**: Analyzes requests and routes to sub-agents
- **TaskExecutor**: Handles task operations
- **ScheduleManager**: Manages calendar events

## 💡 Tips
- Use natural language in Workflow tab
- Agents will intelligently route requests
- All data persists in local SQLite database
- Check API docs for more endpoints

## 🐛 Troubleshooting

**Port in use?**
- Backend: Change port in `main.py` (port 8000)
- Frontend: Change in start scripts (port 3000)

**Module not found?**
- Ensure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

**CORS errors?**
- Backend CORS is enabled for all origins
- Check frontend API_CLIENT URL in `api.js`

## 📝 Next Steps

1. Explore all features
2. Test various workflows
3. Check API documentation
4. Review code structure
5. Customize for your needs

Enjoy! 🎉
