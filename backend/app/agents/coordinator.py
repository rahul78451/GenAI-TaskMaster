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
        Analyze user request using Gemini AI to determine which tools/actions are needed
        """
        import os
        import json
        import google.generativeai as genai

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                prompt = f"""
                You are an AI Workflow Coordinator. The user has requested: "{user_request}"
                Analyze the request and output a JSON list of actions to take.
                Valid action types are: 'create_task', 'list_events', 'create_note'.
                For 'create_task', provide 'title', 'description', and 'priority' (low, medium, high).
                For 'create_note', provide 'title' and 'content'.
                For 'list_events', no parameters are needed.
                
                Respond ONLY with valid JSON in this exact format, with no markdown formatting or backticks:
                [
                    {{"type": "create_task", "title": "Example", "description": "...", "priority": "high"}}
                ]
                """
                response = model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:-3]
                elif text.startswith("```"):
                    text = text[3:-3]
                
                actions = json.loads(text.strip())
                return {"request": user_request, "actions": actions, "timestamp": datetime.utcnow().isoformat()}
            except Exception as e:
                print(f"Workflow AI Error: {e}")
        
        # Fallback to naive keyword matching if AI fails or no key
        request_lower = user_request.lower()
        actions = []
        if any(w in request_lower for w in ["task", "todo", "create", "add", "assign"]):
            actions.append({"type": "create_task", "title": user_request[:50], "description": user_request, "priority": "medium"})
        if any(w in request_lower for w in ["schedule", "calendar", "meeting", "event", "time"]):
            actions.append({"type": "list_events"})
        if any(w in request_lower for w in ["note", "remember", "save", "document"]):
            actions.append({"type": "create_note", "title": "Auto Note", "content": user_request})
        
        if not actions:
            actions.append({"type": "create_task", "title": "Automated Task", "description": user_request, "priority": "medium"})

        return {
            "request": user_request,
            "actions": actions,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    def execute_workflow(self, user_request: str) -> Dict[str, Any]:
        """
        Execute a complete workflow based on AI analysis
        """
        # Step 1: Analyze request
        analysis = self.analyze_request(user_request)
        planned_actions = analysis.get("actions", [])
        
        results = {
            "analysis": analysis,
            "actions": [],
            "summary": "",
        }
        
        # Step 2: Route to appropriate tools
        for planned_action in planned_actions:
            action_type = planned_action.get("type")
            try:
                if action_type == "create_task":
                    result = self.tool_manager.tasks.create_task(
                        title=planned_action.get("title", "New Task"),
                        description=planned_action.get("description", ""),
                        priority=planned_action.get("priority", "medium")
                    )
                    results["actions"].append({"type": action_type, "description": f"Created task: {result.get('title')}", "result": result})
                
                elif action_type == "list_events":
                    result = self.tool_manager.calendar.list_events()
                    results["actions"].append({"type": action_type, "description": "Retrieved calendar events", "result": result})
                
                elif action_type == "create_note":
                    result = self.tool_manager.notes.create_note(
                        title=planned_action.get("title", "New Note"),
                        content=planned_action.get("content", "")
                    )
                    results["actions"].append({"type": action_type, "description": f"Created note: {result.get('title')}", "result": result})
            except Exception as e:
                results["actions"].append({"type": action_type, "description": f"Failed: {str(e)}", "result": None})
        
        # Step 3: Generate summary
        summary_parts = []
        for action in results["actions"]:
            if action["result"]:
                summary_parts.append(f"✓ {action['description']}")
            else:
                summary_parts.append(f"❌ {action['description']}")
        
        results["summary"] = " | ".join(summary_parts) if summary_parts else "Workflow executed successfully, but no actions were taken."
        
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
