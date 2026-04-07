"""
MCP (Model Context Protocol) Tools for the AI agents
Simulates calendar, task manager, and notes tools
"""
from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.models.database import Task, ScheduleEvent, Note
from app.models.schemas import TaskCreate, ScheduleEventCreate, NoteCreate


class CalendarTool:
    """Calendar management tool"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_events(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """List upcoming events"""
        events = self.db.query(ScheduleEvent).all()
        return [
            {
                "id": e.id,
                "title": e.title,
                "start": e.start_time.isoformat(),
                "end": e.end_time.isoformat(),
                "location": e.location,
            }
            for e in events
        ]
    
    def create_event(self, title: str, start_time: datetime, end_time: datetime, location: str = None) -> Dict:
        """Create a calendar event"""
        event = ScheduleEvent(
            title=title,
            description=f"Event: {title}",
            start_time=start_time,
            end_time=end_time,
            location=location,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return {"success": True, "event_id": event.id, "title": title}
    
    def get_free_slots(self) -> List[str]:
        """Get available time slots"""
        return ["09:00-10:00", "14:00-15:00", "16:00-17:00"]


class TaskManagerTool:
    """Task management tool"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_tasks(self, status: str = None) -> List[Dict[str, Any]]:
        """List tasks, optionally filtered by status"""
        query = self.db.query(Task)
        if status:
            query = query.filter(Task.status == status)
        tasks = query.all()
        return [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
            }
            for t in tasks
        ]
    
    def create_task(self, title: str, description: str = "", priority: str = "medium") -> Dict:
        """Create a new task"""
        task = Task(
            title=title,
            description=description,
            priority=priority,
            status="pending",
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return {"success": True, "task_id": task.id, "title": title}
    
    def update_task_status(self, task_id: int, status: str) -> Dict:
        """Update task status"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = status
            self.db.commit()
            return {"success": True, "task_id": task_id, "new_status": status}
        return {"success": False, "error": "Task not found"}
    
    def get_pending_tasks(self) -> List[Dict[str, Any]]:
        """Get all pending tasks"""
        return self.list_tasks(status="pending")


class NotesTool:
    """Notes management tool"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_notes(self) -> List[Dict[str, Any]]:
        """List all notes"""
        notes = self.db.query(Note).all()
        return [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content[:100] + "..." if len(n.content) > 100 else n.content,
                "created_at": n.created_at.isoformat(),
            }
            for n in notes
        ]
    
    def create_note(self, title: str, content: str) -> Dict:
        """Create a new note"""
        note = Note(title=title, content=content)
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return {"success": True, "note_id": note.id, "title": title}
    
    def search_notes(self, query: str) -> List[Dict[str, Any]]:
        """Search notes by title or content"""
        notes = self.db.query(Note).filter(
            (Note.title.contains(query)) | (Note.content.contains(query))
        ).all()
        return [
            {"id": n.id, "title": n.title, "content": n.content[:100]}
            for n in notes
        ]


class ToolManager:
    """Manages all available MCP tools"""
    
    def __init__(self, db: Session):
        self.calendar = CalendarTool(db)
        self.tasks = TaskManagerTool(db)
        self.notes = NotesTool(db)
        self.db = db
    
    def get_available_tools(self) -> List[Dict]:
        """Return list of available tools and their descriptions"""
        return [
            {
                "name": "list_tasks",
                "description": "List all tasks, optionally filtered by status",
                "tool": "tasks",
                "method": "list_tasks",
            },
            {
                "name": "create_task",
                "description": "Create a new task with title, description, and priority",
                "tool": "tasks",
                "method": "create_task",
            },
            {
                "name": "update_task_status",
                "description": "Update the status of a task",
                "tool": "tasks",
                "method": "update_task_status",
            },
            {
                "name": "list_calendar_events",
                "description": "List upcoming calendar events",
                "tool": "calendar",
                "method": "list_events",
            },
            {
                "name": "create_calendar_event",
                "description": "Create a new calendar event",
                "tool": "calendar",
                "method": "create_event",
            },
            {
                "name": "list_notes",
                "description": "List all notes",
                "tool": "notes",
                "method": "list_notes",
            },
            {
                "name": "create_note",
                "description": "Create a new note",
                "tool": "notes",
                "method": "create_note",
            },
            {
                "name": "search_notes",
                "description": "Search notes by content",
                "tool": "notes",
                "method": "search_notes",
            },
        ]
