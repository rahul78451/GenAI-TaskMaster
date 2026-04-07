from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.models.database import get_db, Task, ScheduleEvent, Note, WorkflowExecution
from app.models.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    ScheduleEventCreate, ScheduleEventUpdate, ScheduleEventResponse,
    NoteCreate, NoteUpdate, NoteResponse,
    WorkflowRequest, WorkflowResponse,
)
from app.agents.coordinator import CoordinatorAgent, TaskExecutionAgent, ScheduleAgent
from app.agents.ai_agent import ClaudeAIAgent, ConversationalAIAgent
from app.tools.mcp_tools import ToolManager

app = FastAPI(
    title="Multi-Agent AI System",
    description="AI-powered task, schedule, and information management system",
    version="1.0.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Health & Status ====================

@app.get("/")
async def root():
    return {
        "name": "Multi-Agent AI System",
        "version": "1.0.0",
        "status": "running",
        "description": "Manage tasks, schedules, and information with AI coordination",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ==================== Task Endpoints ====================

@app.get("/api/tasks", response_model=List[TaskResponse])
async def list_tasks(status: str = None, db: Session = Depends(get_db)):
    """List all tasks, optionally filtered by status"""
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    return query.all()


@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    db_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority or "medium",
        due_date=task.due_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return {"success": True, "message": "Task deleted"}


# ==================== Schedule Endpoints ====================

@app.get("/api/schedule", response_model=List[ScheduleEventResponse])
async def list_schedule(db: Session = Depends(get_db)):
    """List all schedule events"""
    return db.query(ScheduleEvent).all()


@app.post("/api/schedule", response_model=ScheduleEventResponse)
async def create_schedule(event: ScheduleEventCreate, db: Session = Depends(get_db)):
    """Create a new schedule event"""
    db_event = ScheduleEvent(
        title=event.title,
        event_time=event.event_time,
        status=event.status or "upcoming",
        description=event.description,
        priority=event.priority or "medium",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@app.get("/api/schedule/{event_id}", response_model=ScheduleEventResponse)
async def get_schedule(event_id: int, db: Session = Depends(get_db)):
    """Get a specific schedule event"""
    event = db.query(ScheduleEvent).filter(ScheduleEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.delete("/api/schedule/{event_id}")
async def delete_schedule(event_id: int, db: Session = Depends(get_db)):
    """Delete a schedule event"""
    event = db.query(ScheduleEvent).filter(ScheduleEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    return {"success": True, "message": "Event deleted"}


@app.put("/api/schedule/{event_id}", response_model=ScheduleEventResponse)
async def update_schedule(event_id: int, event_update: ScheduleEventUpdate, db: Session = Depends(get_db)):
    """Update a schedule event"""
    event = db.query(ScheduleEvent).filter(ScheduleEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    
    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event


# ==================== Notes Endpoints ====================

@app.get("/api/notes", response_model=List[NoteResponse])
async def list_notes(db: Session = Depends(get_db)):
    """List all notes"""
    return db.query(Note).all()


@app.post("/api/notes", response_model=NoteResponse)
async def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """Create a new note"""
    db_note = Note(
        title=note.title,
        content=note.content,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.get("/api/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a specific note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.put("/api/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: int, note_update: NoteUpdate, db: Session = Depends(get_db)):
    """Update a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)
    
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    """Delete a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"success": True, "message": "Note deleted"}


# ==================== Workflow Endpoints ====================

@app.post("/api/workflow", response_model=WorkflowResponse)
async def execute_workflow(request: WorkflowRequest, db: Session = Depends(get_db)):
    """
    Execute a multi-step workflow using the coordinator agent
    Takes a natural language request and orchestrates the necessary tools and sub-agents
    """
    # Create workflow execution record
    workflow = WorkflowExecution(
        user_request=request.request,
        status="running",
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    
    try:
        # Initialize coordinator agent
        coordinator = CoordinatorAgent(db)
        
        # Execute workflow
        result = coordinator.execute_workflow(request.request)
        
        # Update workflow record
        workflow.status = "completed"
        workflow.result = str(result["summary"])
        workflow.completed_at = datetime.utcnow()
        
    except Exception as e:
        workflow.status = "failed"
        workflow.result = str(e)
        workflow.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(workflow)
    
    return workflow


@app.get("/api/workflow/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Get workflow execution status and results"""
    workflow = db.query(WorkflowExecution).filter(WorkflowExecution.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@app.get("/api/workflow/history/all")
async def get_workflow_history(db: Session = Depends(get_db)):
    """Get all workflow execution history"""
    workflows = db.query(WorkflowExecution).order_by(WorkflowExecution.created_at.desc()).all()
    return [
        {
            "id": w.id,
            "request": w.user_request,
            "status": w.status,
            "result": w.result,
            "created_at": w.created_at.isoformat(),
            "completed_at": w.completed_at.isoformat() if w.completed_at else None,
        }
        for w in workflows
    ]


# ==================== Agent Status Endpoints ====================

@app.get("/api/agents/status")
async def get_agents_status(db: Session = Depends(get_db)):
    """Get status of all agents"""
    coordinator = CoordinatorAgent(db)
    task_agent = TaskExecutionAgent(db)
    schedule_agent = ScheduleAgent(db)
    
    return {
        "agents": [
            {"name": coordinator.name, "status": "active", "type": "coordinator"},
            {"name": task_agent.name, "status": "active", "type": "sub_agent", "specialty": task_agent.specialty},
            {"name": schedule_agent.name, "status": "active", "type": "sub_agent", "specialty": schedule_agent.specialty},
        ],
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/tools/available")
async def get_available_tools(db: Session = Depends(get_db)):
    """Get list of available MCP tools"""
    tool_manager = ToolManager(db)
    return {
        "tools": tool_manager.get_available_tools(),
        "count": len(tool_manager.get_available_tools()),
    }


# ==================== Dashboard Endpoints ====================

@app.get("/api/dashboard/summary")
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """Get dashboard summary with key metrics"""
    total_tasks = db.query(Task).count()
    pending_tasks = db.query(Task).filter(Task.status == "pending").count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    total_events = db.query(ScheduleEvent).count()
    total_notes = db.query(Note).count()
    
    return {
        "stats": {
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "total_events": total_events,
            "total_notes": total_notes,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# ==================== AI Suggestions Endpoints ====================

@app.get("/api/suggestions")
async def get_suggestions(db: Session = Depends(get_db)):
    """
    Get AI-powered personalized suggestions using Claude AI
    Falls back to rule-based suggestions if Claude API is not configured
    """
    ai_agent = ClaudeAIAgent(db)
    
    # Try to get AI-powered suggestions
    suggestions = ai_agent.generate_ai_suggestions()
    
    # If AI is enabled and returned suggestions, use them
    if suggestions and len(suggestions) > 0:
        return {
            "suggestions": suggestions,
            "ai_powered": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    # Fallback to basic suggestions if AI is not configured
    tasks = db.query(Task).all()
    suggestions = []
    
    total_tasks = len(tasks)
    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    high_priority_tasks = [t for t in pending_tasks if t.priority == "high"]
    
    pending_count = len(pending_tasks)
    completed_count = len(completed_tasks)
    high_priority_count = len(high_priority_tasks)
    completion_rate = round((completed_count / total_tasks) * 100) if total_tasks > 0 else 0
    
    if completed_count == 0 and pending_count > 0:
        suggestions.append({
            "id": 1,
            "type": "Morning Motivation",
            "title": "🌅 Start Your Day Strong",
            "description": f"You have {pending_count} tasks today.",
            "icon": "🎯",
            "priority": "high"
        })
    
    if high_priority_count > 5:
        suggestions.append({
            "id": 2,
            "type": "Urgent",
            "title": "⚠️ High Priority Tasks",
            "description": f"{high_priority_count} high-priority tasks need attention.",
            "icon": "🔴",
            "priority": "high"
        })
    
    if not suggestions:
        suggestions = [{
            "id": 1,
            "type": "Tip",
            "title": "📝 Create Your First Task",
            "description": "Start by adding tasks to get AI-powered suggestions!",
            "icon": "✨",
            "priority": "high"
        }]
    
    return {
        "suggestions": suggestions,
        "ai_powered": False,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/productivity-analysis")
async def get_productivity_analysis(db: Session = Depends(get_db)):
    """
    Get AI-powered productivity analysis and insights
    """
    ai_agent = ClaudeAIAgent(db)
    analysis = ai_agent.analyze_productivity()
    
    return {
        "analysis": analysis,
        "ai_powered": ai_agent.enabled,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/ai-chat")
async def ai_chat(message: dict, db: Session = Depends(get_db)):
    """
    Chat with the AI Assistant using Claude
    """
    if "message" not in message:
        raise HTTPException(status_code=400, detail="Missing 'message' field")
    
    user_message = message["message"]
    ai_agent = ConversationalAIAgent(db)
    response = ai_agent.chat(user_message)
    
    return {
        "user_message": user_message,
        "assistant_response": response,
        "ai_powered": ai_agent.enabled,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ==================== Voice & Audio Endpoints ====================

@app.post("/api/chat/voice")
async def chat_with_voice(text: dict, db: Session = Depends(get_db)):
    """
    Chat with AI using voice input (text-based conversion)
    """
    if "text" not in text:
        raise HTTPException(status_code=400, detail="Missing 'text' field")
    
    user_text = text["text"]
    ai_agent = ConversationalAIAgent(db)
    response = ai_agent.chat(user_text)
    
    return {
        "user_input": user_text,
        "response": response,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/speak")
async def text_to_speech(text: dict):
    """
    Convert text to speech (returns audio as base64)
    """
    if "text" not in text:
        raise HTTPException(status_code=400, detail="Missing 'text' field")
    
    try:
        import pyttsx3
        import base64
        from io import BytesIO
        
        text_to_speak = text["text"]
        
        # Use OS default TTS
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        
        # Save to BytesIO
        audio_buffer = BytesIO()
        
        # For demonstration, we'll return a message that the audio would be played client-side
        # In production, you'd use a more sophisticated TTS service
        return {
            "status": "success",
            "text": text_to_speak,
            "message": "Use browser's built-in speech synthesis",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, server_header=False)
