"""
Primary Coordinator Agent
Orchestrates sub-agents and tool usage for multi-step workflows
"""
import json
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.tools.mcp_tools import ToolManager
from datetime import datetime


class CoordinatorAgent:
    """
    Main agent that coordinates task execution across multiple tools and sub-agents
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.tool_manager = ToolManager(db)
        self.name = "Coordinator"
    
    def analyze_request(self, user_request: str) -> Dict[str, Any]:
        """
        Analyze user request and determine which tools/sub-agents are needed
        """
        request_lower = user_request.lower()
        
        # Determine task type
        task_types = []
        if any(word in request_lower for word in ["task", "todo", "create", "add", "assign"]):
            task_types.append("task_management")
        if any(word in request_lower for word in ["schedule", "calendar", "meeting", "event", "time"]):
            task_types.append("calendar")
        if any(word in request_lower for word in ["note", "remember", "save", "document"]):
            task_types.append("notes")
        
        return {
            "request": user_request,
            "task_types": task_types,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    def execute_workflow(self, user_request: str) -> Dict[str, Any]:
        """
        Execute a complete workflow based on user request
        """
        # Step 1: Analyze request
        analysis = self.analyze_request(user_request)
        task_types = analysis["task_types"]
        
        results = {
            "analysis": analysis,
            "actions": [],
            "summary": "",
        }
        
        # Step 2: Route to appropriate tools
        if "task_management" in task_types:
            # Create a sample task from the request
            action = {
                "type": "create_task",
                "description": "Creating task from user request",
                "result": self.tool_manager.tasks.create_task(
                    title=user_request[:50],
                    description=user_request,
                    priority="medium"
                ),
            }
            results["actions"].append(action)
        
        if "calendar" in task_types:
            # List calendar events
            action = {
                "type": "list_events",
                "description": "Retrieving calendar events",
                "result": self.tool_manager.calendar.list_events(),
            }
            results["actions"].append(action)
        
        if "notes" in task_types:
            # Create a note
            action = {
                "type": "create_note",
                "description": "Creating note from user request",
                "result": self.tool_manager.notes.create_note(
                    title=user_request[:50],
                    content=user_request
                ),
            }
            results["actions"].append(action)
        
        # If no specific type detected, create a task and note
        if not task_types:
            action = {
                "type": "create_task",
                "description": "Creating task from user request",
                "result": self.tool_manager.tasks.create_task(
                    title=user_request[:50],
                    description=user_request,
                    priority="medium"
                ),
            }
            results["actions"].append(action)
        
        # Step 3: Generate summary
        summary_parts = []
        for action in results["actions"]:
            if action["type"] == "create_task":
                summary_parts.append(f"✓ Created task: {action['result'].get('title', 'Task')}")
            elif action["type"] == "create_note":
                summary_parts.append(f"✓ Created note: {action['result'].get('title', 'Note')}")
            elif action["type"] == "list_events":
                count = len(action["result"])
                summary_parts.append(f"✓ Found {count} calendar events")
        
        results["summary"] = " | ".join(summary_parts) if summary_parts else "Request processed"
        
        return results
    
    def get_status(self) -> Dict[str, str]:
        """Get agent status"""
        return {
            "agent": self.name,
            "status": "active",
            "timestamp": datetime.utcnow().isoformat(),
        }


class SubAgent:
    """
    Sub-agent for specialized task handling
    """
    
    def __init__(self, name: str, specialty: str, db: Session):
        self.name = name
        self.specialty = specialty
        self.db = db
        self.tool_manager = ToolManager(db)
    
    def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specialized task"""
        return {
            "sub_agent": self.name,
            "specialty": self.specialty,
            "task_id": task.get("id"),
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
        }


class TaskExecutionAgent(SubAgent):
    """Sub-agent specialized in task execution"""
    
    def __init__(self, db: Session):
        super().__init__("TaskExecutor", "task_management", db)
    
    def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task-related operations"""
        tasks = self.tool_manager.tasks.list_tasks()
        return {
            "sub_agent": self.name,
            "action": "list_pending_tasks",
            "task_count": len(tasks),
            "timestamp": datetime.utcnow().isoformat(),
        }


class ScheduleAgent(SubAgent):
    """Sub-agent specialized in schedule management"""
    
    def __init__(self, db: Session):
        super().__init__("ScheduleManager", "calendar", db)
    
    def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute schedule-related operations"""
        events = self.tool_manager.calendar.list_events()
        return {
            "sub_agent": self.name,
            "action": "list_calendar_events",
            "event_count": len(events),
            "timestamp": datetime.utcnow().isoformat(),
        }
