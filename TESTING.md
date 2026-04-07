# Testing & Validation Guide

## ✅ Pre-flight Checklist

Before starting, ensure:
- [ ] Python 3.9+ is installed: `python --version`
- [ ] Node.js (optional, for alternative frontend server)
- [ ] Port 8000 (backend) is available
- [ ] Port 3000 (frontend) is available
- [ ] Internet connection (for CDN resources)

---

## 🚀 Quick Start Verification (3 minutes)

### Step 1: Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python main.py
```

**Expected Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

✅ **Backend running**: http://localhost:8000

### Step 2: Start Frontend
Open new terminal:
```bash
cd frontend
python -m http.server 3000
```

**Expected Output**:
```
Serving HTTP on 0.0.0.0 port 3000 (http://0.0.0.0:3000/) ...
```

✅ **Frontend running**: http://localhost:3000

### Step 3: Verify in Browser
Open: `http://localhost:3000`

**Expected UI**:
- Logo "AI Manager" with gradient
- Navigation tabs: Dashboard, Tasks, Schedule, Notes, Workflow
- Clean, Google-like interface
- No error messages in console

✅ **Frontend loaded successfully**

---

## 📊 Dashboard Tab Testing

### Test Case 1: View Statistics
1. Click "Dashboard" tab
2. **Expected**: 
   - 5 stat cards showing: Total Tasks, Pending, Completed, Events, Notes
   - Initial counts (all 0 for fresh database)
   - Agent status section below

**Validation**: 
- [ ] Stats cards visible
- [ ] Agent status shows 3 agents: Coordinator, TaskExecutor, ScheduleManager
- [ ] All agents marked as "active"

---

## 📋 Tasks Tab Testing

### Test Case 1: Create Task
1. Go to "Tasks" tab
2. Enter "Review Project Proposal" in title field
3. Select priority "High"
4. Click "Add Task"

**Expected**:
- Task appears in list below form
- Status shows "pending"
- Priority shows high flag icon

**Validation**:
- [ ] Task created successfully
- [ ] Task appears in list immediately
- [ ] Form clears after submission

### Test Case 2: Update Task Status
1. Find created task in list
2. Click status dropdown (showing "pending")
3. Select "in_progress"

**Expected**:
- Status badge changes from orange to blue
- Task updates immediately

**Validation**:
- [ ] Status updated in real-time
- [ ] Badge color changes
- [ ] No page reload needed

### Test Case 3: Delete Task
1. Click trash icon on any task
2. Confirm deletion in dialog

**Expected**:
- Task disappears from list
- Dashboard count updates

**Validation**:
- [ ] Task removed from list
- [ ] Deletion confirmed

---

## 📅 Schedule Tab Testing

### Test Case 1: Create Schedule Event
1. Go to "Schedule" tab
2. Enter "Project Review Meeting" in title
3. Enter location: "Conference Room B"
4. Set start time: Tomorrow 2:00 PM
5. Set end time: Tomorrow 3:00 PM
6. Click "Add Event"

**Expected**:
- Event appears in list with time and location
- Format: "today's time" to "end time"

**Validation**:
- [ ] Event created successfully
- [ ] Date/time displays correctly
- [ ] Location shows in event card

### Test Case 2: View Multiple Events
1. Create 2-3 more events with different times
2. All should appear in list

**Validation**:
- [ ] Multiple events display
- [ ] Events don't overlap visually
- [ ] All information visible

### Test Case 3: Delete Event
1. Click trash icon on event
2. Confirm deletion

**Validation**:
- [ ] Event removed from list
- [ ] Clean removal without residue

---

## 📝 Notes Tab Testing

### Test Case 1: Create Note
1. Go to "Notes" tab
2. Title: "Project Design Feedback"
3. Content: "Need to review color scheme, typography, and layout spacing"
4. Click "Save Note"

**Expected**:
- Note appears as card in grid
- Shows title, truncated content, and date

**Validation**:
- [ ] Note created and displayed as card
- [ ] Content truncated if too long
- [ ] Date shows correctly

### Test Case 2: Create Multiple Notes
1. Create 3-4 more notes with different topics
2. All should appear in grid layout

**Validation**:
- [ ] Grid layout (3 columns on desktop)
- [ ] All notes visible
- [ ] Responsive on smaller screens

### Test Case 3: Delete Note
1. Click trash icon on note
2. Confirm deletion

**Validation**:
- [ ] Note removed from grid
- [ ] Other notes unaffected

---

## 🤖 Workflow Tab Testing

### Test Case 1: Simple Workflow - Task Creation
1. Go to "Workflow" tab
2. Enter: "Create a task for client presentation preparation"
3. Click "Execute Workflow"

**Expected**:
- Loading animation appears
- Status shows "running"
- After ~2 seconds, result appears
- Shows: "✓ Created task: client presentation preparation"

**Validation**:
- [ ] Workflow executed
- [ ] Task appears in Tasks tab
- [ ] Execution logged in history

### Test Case 2: Complex Workflow - Task + Schedule
1. Enter: "Create a task for design review and schedule a meeting at 4 PM"
2. Click "Execute Workflow"

**Expected**:
- Both task and event created
- Result shows: "✓ Created task | ✓ Found X calendar events"

**Validation**:
- [ ] Multi-agent coordination works
- [ ] Both tasks executed
- [ ] Both appear in respective tabs

### Test Case 3: Workflow - Notes
1. Enter: "Save notes about the new feature requirements"
2. Click "Execute Workflow"

**Expected**:
- Note created
- Result shows: "✓ Created note"
- Note appears in Notes tab

**Validation**:
- [ ] Workflow creates note
- [ ] Note is searchable in Notes tab

### Test Case 4: Workflow History
1. Execute 3-4 workflows with different requests
2. Scroll through history section

**Expected**:
- Latest executions appear at top
- Each shows: request text, status, result, timestamp

**Validation**:
- [ ] History displays in order
- [ ] All executions logged
- [ ] Status badges correct

---

## 🔗 API Testing

### Test Case 1: Health Check
```bash
curl http://localhost:8000/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-29T10:30:00"
}
```

### Test Case 2: Get Dashboard Summary
```bash
curl http://localhost:8000/api/dashboard/summary
```

**Expected Response**:
```json
{
  "stats": {
    "total_tasks": 2,
    "pending_tasks": 1,
    "completed_tasks": 0,
    "total_events": 1,
    "total_notes": 2
  },
  "timestamp": "2026-03-29T10:30:00"
}
```

### Test Case 3: Create Task via API
```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Task",
    "description": "Testing via curl",
    "priority": "high"
  }'
```

**Expected Response**:
```json
{
  "id": 1,
  "title": "API Test Task",
  "description": "Testing via curl",
  "status": "pending",
  "priority": "high",
  "created_at": "2026-03-29T10:30:00",
  "updated_at": "2026-03-29T10:30:00"
}
```

### Test Case 4: List Tasks
```bash
curl http://localhost:8000/api/tasks
```

**Expected Response**: Array of task objects

### Test Case 5: Update Task Status
```bash
curl -X PUT http://localhost:8000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

**Expected**: Task updated with new status

### Test Case 6: Get Available Tools
```bash
curl http://localhost:8000/api/tools/available
```

**Expected Response**: List of 8 MCP tools

### Test Case 7: Get Agents Status
```bash
curl http://localhost:8000/api/agents/status
```

**Expected Response**: 3 active agents listed

### Test Case 8: Execute Workflow via API
```bash
curl -X POST http://localhost:8000/api/workflow \
  -H "Content-Type: application/json" \
  -d '{"request": "Create a task for testing and schedule a meeting"}'
```

**Expected Response**:
```json
{
  "id": 1,
  "user_request": "Create a task for testing and schedule a meeting",
  "status": "completed",
  "result": "✓ Created task | ✓ Found X calendar events",
  "created_at": "2026-03-29T10:30:00"
}
```

### Test Case 9: Interactive API Documentation
1. Open: http://localhost:8000/docs
2. **Expected**: Swagger UI with all endpoints listed
3. Try out some endpoints using the web interface

**Validation**:
- [ ] Swagger UI loads
- [ ] All endpoints documented
- [ ] Try buttons work
- [ ] Responses show correct format

---

## 🔄 Integration Testing

### Test Case 1: Cross-Tab Consistency
1. Create task in Tasks tab
2. Go to Workflow and create note with similar content
3. Go back to Tasks - original task still there

**Validation**:
- [ ] Data persists across tabs
- [ ] No data loss
- [ ] UI refreshes correctly

### Test Case 2: Dashboard Updates
1. Create 5 tasks
2. Go to Dashboard
3. Check "Total Tasks" stat

**Validation**:
- [ ] Dashboard shows correct count (5)
- [ ] Stats reflect current data

### Test Case 3: Database Persistence
1. Create task and note
2. Refresh browser (Ctrl+R)
3. All data still visible

**Validation**:
- [ ] Data saved to database
- [ ] Survives page refresh
- [ ] Database file: backend/app.db exists

---

## 🎯 Requirement Validation Checklist

### Requirements Met ✅

- [ ] **Primary Agent**
  - CoordinatorAgent exists in `app/agents/coordinator.py`
  - Analyzes requests and routes to sub-agents

- [ ] **Sub-Agents**
  - TaskExecutor implemented
  - ScheduleManager implemented
  - Both execute specialized tasks

- [ ] **Database**
  - SQLite database with 4 tables
  - Data persists across sessions
  - CRUD operations work

- [ ] **MCP Tools**
  - 8 tools available (see `/api/tools/available`)
  - Calendar, TaskManager, Notes tools
  - Tools integrate with agents

- [ ] **Multi-Step Workflows**
  - Workflow execution endpoint works
  - Handles multiple task types
  - Represents real-world scenarios

- [ ] **API Deployment**
  - FastAPI running on port 8000
  - 25+ endpoints functional
  - Documentation at `/docs`

- [ ] **Frontend UI**
  - React running on port 3000
  - Minimal Google-like design
  - All tabs functional
  - Responsive design

- [ ] **Documentation**
  - README.md complete
  - QUICKSTART.md with instructions
  - ARCHITECTURE.md with details
  - HACKATHON_SUBMISSION.md comprehensive

---

## 🐛 Troubleshooting

### Issue: "Connection refused" for backend
**Solution**: Ensure backend is running on port 8000
```bash
cd backend && python main.py
```

### Issue: Frontend shows "API Error"
**Solution**: Check API_CLIENT baseURL in `frontend/api.js`
Should be: `http://localhost:8000/api`

### Issue: Port 3000 or 8000 already in use
**Solution**: Kill process or change port
```bash
# Find and kill process (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or change port in main.py:
# uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Issue: Database locked
**Solution**: Delete `backend/app.db` to reset
```bash
rm backend/app.db  (or Delete via File Explorer)
```

### Issue: Venv not activating
**Solution**: Ensure you're in `backend` directory
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
```

---

## 📈 Performance Benchmarks

Expected performance:
- **Frontend Load**: < 1 second
- **API Response**: < 100ms
- **Database Query**: < 10ms
- **Workflow Execution**: < 1 second
- **Page Navigation**: Instant

---

## ✨ Feature Showcase

### Features to Highlight:

1. **Multi-Agent Coordination**
   - Try workflow: "Create task AND schedule meeting"
   - Shows parallel agent execution

2. **Intelligent Routing**
   - Different requests → Different tools
   - "Task" → TaskExecutor
   - "Meeting" → ScheduleManager

3. **Minimal Design**
   - Google-inspired interface
   - No clutter, all essential features
   - Smooth animations

4. **Extensible Architecture**
   - Code structure allows easy additions
   - New agents: just subclass SubAgent
   - New tools: extend ToolManager

5. **Production Ready**
   - Error handling implemented
   - Input validation (Pydantic)
   - CORS configured
   - Docker ready

---

## 🏆 Expected Results

When all tests pass:
- ✅ All 5 tabs working (Dashboard, Tasks, Schedule, Notes, Workflow)
- ✅ CRUD operations functional
- ✅ Multi-agent coordination demonstrated
- ✅ API fully documented and testable
- ✅ Database persistence working
- ✅ Minimal UI implemented

---

## 📸 Screenshots to Check

The unique Google-like design features:
1. **Clean header** with logo and navigation
2. **Minimal cards** with subtle shadows
3. **Status badges** with appropriate colors
4. **Responsive grid layouts**
5. **Smooth hover effects**
6. **Gradient buttons** (indigo/blue)
7. **Smart icons** for actions

---

## ✅ Sign-Off

When all tests pass and validation complete:

```
✅ Multi-Agent AI System - READY FOR PRODUCTION
✅ All Hackathon Requirements Met
✅ Code Quality: Professional
✅ Documentation: Comprehensive
✅ UI/UX: Minimal & Beautiful
✅ Architecture: Scalable & Extensible
```

---

**Testing Date**: ________________
**Tester**: ________________________
**Status**: 🟢 READY

---

For questions during testing, refer to:
1. QUICKSTART.md - Fast answers
2. ARCHITECTURE.md - System details
3. Code comments - Implementation details
4. This document - Test procedures
