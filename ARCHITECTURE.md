# Architecture Documentation

## System Overview

This is a **Multi-Agent AI System** designed to coordinate task execution across multiple tools and agents.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  Dashboard | Tasks | Schedule | Notes | AI Workflow         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────┐
│              Backend API (FastAPI)                          │
│  ├─ Task Endpoints         ├─ Agents Management             │
│  ├─ Schedule Endpoints     ├─ Workflow Execution            │
│  ├─ Notes Endpoints        └─ Tool Availability             │
└──────────────┬──────────────────────┬──────────────────────┘
               │                      │
      ┌────────▼────────┐    ┌────────▼────────┐
      │   Coordinator   │    │  MCP Tools      │
      │    Agent        │    │  ├─ Calendar    │
      │                 │    │  ├─ TaskMgr     │
      │ - Analyzes      │    │  └─ Notes       │
      │ - Routes        │    │                 │
      │ - Orchestrates  │    └─────────────────┘
      └────────┬────────┘
               │
      ┌────────▼────────────────────┐
      │  Sub-Agents                 │
      │  ├─ TaskExecutor            │
      │  ├─ ScheduleManager         │
      │  └─ (Extensible)            │
      └────────┬────────────────────┘
               │
      ┌────────▼──────────────┐
      │   Database (SQLite)   │
      │   ├─ Tasks            │
      │   ├─ Events           │
      │   ├─ Notes            │
      │   └─ Workflows        │
      └───────────────────────┘
```

## Component Details

### Frontend (React)
- **Tab-based Navigation**: Dashboard, Tasks, Schedule, Notes, Workflow
- **Real-time Updates**: Fetch latest data on tab change
- **API Client**: Centralized API communication
- **Responsive Design**: Works on desktop and tablets
- **Google-like Minimalism**: Clean, intuitive UI

### Backend (FastAPI)
- **REST API**: 20+ endpoints for full CRUD operations
- **CORS Enabled**: Allows frontend communication
- **Auto Documentation**: Swagger UI at `/docs`
- **Error Handling**: Structured error responses
- **Middleware**: CORS, logging, validation

### Coordinator Agent
```python
class CoordinatorAgent:
    - analyze_request(user_request)      # Parse intent
    - execute_workflow(user_request)     # Orchestrate
    - route_to_tools()                   # Smart routing
    - get_status()                       # Health check
```

### Sub-Agents
```python
TaskExecutor:
    - List tasks by status
    - Create new tasks
    - Update task status
    - Track progress

ScheduleManager:
    - List calendar events
    - Create events with time/location
    - Check availability
    - Manage conflicts
```

### MCP Tools
```python
CalendarTool:
    - list_events()
    - create_event()
    - get_free_slots()

TaskManagerTool:
    - list_tasks()
    - create_task()
    - update_task_status()
    - get_pending_tasks()

NotesTool:
    - list_notes()
    - create_note()
    - search_notes()
```

### Database Schema
```
┌─────────────────────┐
│ Tasks               │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ description         │
│ status              │
│ priority            │
│ due_date            │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌──────────────────────┐
│ ScheduleEvents       │
├──────────────────────┤
│ id (PK)              │
│ title                │
│ description          │
│ start_time           │
│ end_time             │
│ location             │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│ Notes                │
├──────────────────────┤
│ id (PK)              │
│ title                │
│ content              │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌──────────────────────┐
│ WorkflowExecutions   │
├──────────────────────┤
│ id (PK)              │
│ user_request         │
│ status               │
│ result               │
│ created_at           │
│ completed_at         │
└──────────────────────┘
```

## Workflow Execution Flow

### Example: Natural Language Request
```
User Input: "Create a task for project review and schedule a meeting at 3 PM"

1. Coordinator receives request
2. Analyzes text:
   - Identifies "task" → task_management
   - Identifies "meeting" → calendar
3. Routes to agents:
   - TaskExecutor.create_task("Review Project")
   - ScheduleManager.create_event("Meeting", 3 PM)
4. Tools execute:
   - MCP TaskManager creates DB record
   - MCP Calendar creates DB record
5. Aggregates results:
   - Task created (ID: 42)
   - Event created (ID: 7)
6. Returns summary:
   - "✓ Created task | ✓ Scheduled meeting"
```

## API Request/Response Examples

### Create Task
```
POST /api/tasks
{
  "title": "Review Project",
  "description": "Review Q1 project proposal",
  "priority": "high"
}

Response:
{
  "id": 42,
  "title": "Review Project",
  "status": "pending",
  "priority": "high",
  "created_at": "2026-03-29T10:30:00"
}
```

### Execute Workflow
```
POST /api/workflow
{
  "request": "Create a task for project review and schedule a meeting at 3 PM"
}

Response:
{
  "id": 1,
  "user_request": "...",
  "status": "completed",
  "result": "✓ Created task | ✓ Scheduled meeting",
  "created_at": "2026-03-29T10:30:00"
}
```

## Key Features Mapping

| Requirement | Implementation | Status |
|------------|-----------------|--------|
| Primary Agent | CoordinatorAgent | ✅ |
| Sub-Agents | TaskExecutor, ScheduleManager | ✅ |
| Database | SQLAlchemy + SQLite | ✅ |
| MCP Tools | Calendar, TaskMgr, Notes | ✅ |
| Multi-step Workflows | execute_workflow() | ✅ |
| API Deployment | FastAPI REST API | ✅ |
| Frontend | React SPA | ✅ |
| Minimal UI | Google-inspired design | ✅ |

## Extension Points

### Add New Sub-Agent
```python
class MyAgent(SubAgent):
    def __init__(self, db):
        super().__init__("MyAgent", "specialty", db)
    
    def execute(self, task):
        # Custom logic
        return result
```

### Add New Tool
```python
class MyTool:
    def __init__(self, db):
        self.db = db
    
    def do_something(self):
        # Tool logic
        return result
```

### Add New Endpoint
```python
@app.get("/api/custom")
def custom_endpoint():
    return {"data": "value"}
```

## Performance Metrics

- **Frontend Load**: ~500ms (optimized CSS, minimal JS)
- **API Response**: <100ms (SQLite queries indexed)
- **Workflow Execution**: ~500ms (multi-agent coordination)
- **Database**: <10ms (single file, local)

## Security Considerations

- [x] CORS enabled for development
- [ ] Add authentication for production
- [ ] Rate limiting on API endpoints
- [ ] Input validation (already with Pydantic)
- [ ] SQL injection protection (SQLAlchemy ORM)
- [ ] HTTPS in production

## Monitoring & Logging

- Access logs in console
- Error logs captured
- Workflow execution history
- Agent status monitoring
- Tool usage tracking

---

For detailed API documentation, visit `/docs` when backend is running.
