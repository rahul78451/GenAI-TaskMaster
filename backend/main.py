import re
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from dotenv import load_dotenv
import os
import json
import sys
import traceback

# Load environment variables
load_dotenv()

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def clean_response(text: str) -> str:
    """Remove all markdown formatting from AI response"""
    if not text:
        return text
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# Import database and models
try:
    from app.models.database import get_db, Task, ScheduleEvent, Note, WorkflowExecution, Automation
except Exception as e:
    print(f"ERROR: Could not import database models: {e}")
    traceback.print_exc()
    raise

# Import schemas
try:
    from app.models.schemas import (
        TaskCreate, TaskUpdate, TaskResponse,
        ScheduleEventCreate, ScheduleEventUpdate, ScheduleEventResponse,
        NoteCreate, NoteUpdate, NoteResponse,
        WorkflowRequest, WorkflowResponse,
        AutomationCreate, AutomationUpdate, AutomationResponse,
    )
except Exception as e:
    print(f"ERROR: Could not import schemas: {e}")
    traceback.print_exc()
    raise

# Import agents
try:
    from app.agents.coordinator import CoordinatorAgent, TaskExecutionAgent, ScheduleAgent
    from app.agents.ai_agent import ClaudeAIAgent, ConversationalAIAgent
except Exception as e:
    print(f"WARNING: Could not import agents: {e}")
    CoordinatorAgent = None
    TaskExecutionAgent = None
    ScheduleAgent = None
    ClaudeAIAgent = None
    ConversationalAIAgent = None

# Import tools
try:
    from app.tools.mcp_tools import ToolManager
except Exception as e:
    print(f"WARNING: Could not import tools: {e}")
    ToolManager = None

# Try to import Google Gemini AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("google-generativeai package not installed. Run: pip install google-generativeai")

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if GEMINI_API_KEY and GEMINI_AVAILABLE:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("✓ Gemini AI configured successfully")
    except Exception as e:
        print(f"WARNING: Could not configure Gemini: {e}")
else:
    print(f"INFO: Gemini AI not configured. GEMINI_AVAILABLE={GEMINI_AVAILABLE}, API_KEY={'SET' if GEMINI_API_KEY else 'MISSING'}")

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


# ==================== Startup Event ====================

@app.on_event("startup")
async def startup_event():
    """Initialize database and log startup info"""
    try:
        print("=" * 50)
        print("Starting GenAI Task Manager Backend")
        print("=" * 50)
        print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'sqlite:///./app.db')[:50]}...")
        print(f"GEMINI_AVAILABLE: {GEMINI_AVAILABLE}")
        print(f"GEMINI_API_KEY: {'SET' if GEMINI_API_KEY else 'MISSING'}")
        print("=" * 50)
        
        # Ensure database is initialized safely with retries for multi-worker setup
        from app.models.database import engine, Base
        import time
        from sqlalchemy.exc import OperationalError
        import random
        
        print("Initializing database tables...")
        # Add slight random delay to stagger workers
        time.sleep(random.uniform(0.1, 1.0))
        
        max_retries = 3
        for i in range(max_retries):
            try:
                Base.metadata.create_all(bind=engine)
                print("✓ Database tables initialized")
                break
            except OperationalError as e:
                if "already exists" in str(e).lower():
                    print("✓ Database tables already exist")
                    break
                if i == max_retries - 1:
                    raise
                print(f"Database lock, retrying {i+1}/{max_retries}...")
                time.sleep(1)
        
    except Exception as e:
        print(f"ERROR during startup: {e}")
        traceback.print_exc()


# ==================== Gemini AI Helper Functions ====================

def get_all_task_data(db: Session):
    """Fetch and format all task data from database"""
    tasks = db.query(Task).all()
    task_data = []
    for t in tasks:
        task_data.append({
            "id": t.id,
            "title": t.title,
            "description": t.description or "",
            "status": t.status,
            "priority": t.priority,
            "due_date": str(t.due_date) if t.due_date else "No due date"
        })
    return tasks, task_data


def get_all_event_data(db: Session):
    """Fetch and format all event data from database"""
    events = db.query(ScheduleEvent).all()
    event_data = []
    for e in events:
        event_data.append({
            "id": e.id,
            "title": e.title,
            "event_time": str(e.event_time) if e.event_time else "",
            "status": e.status,
            "priority": e.priority
        })
    return events, event_data


def get_all_note_data(db: Session):
    """Fetch and format all note data from database"""
    notes = db.query(Note).all()
    note_data = []
    for n in notes:
        note_data.append({
            "id": n.id,
            "title": n.title,
            "content": n.content or ""
        })
    return notes, note_data


def build_gemini_prompt(task_data: list, event_data: list, note_data: list, tasks: list, user_message: str):
    """Build a comprehensive prompt for Gemini AI covering all modules"""
    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    high_priority = [t for t in pending_tasks if t.priority == "high"]
    total = len(tasks)
    completion_rate = round((len(completed_tasks) / total) * 100) if total > 0 else 0

    prompt = f"""You are TaskMaster AI - an intelligent productivity assistant for a full-featured task management platform with Dashboard, Tasks, Schedule, Notes, Workflow Automation, Data Analytics, and Project Planner.

FORMATTING RULES:
- Plain text ONLY. No markdown (no **, ##, ```, etc.)
- Use dashes (-) for bullet points
- Max 2 emojis per response, keep under 250 words
- Reference actual task names and data, never generic advice

USER DATA:
Tasks: {total} total | {len(pending_tasks)} pending | {len(completed_tasks)} completed | Rate: {completion_rate}%
High Priority: {len(high_priority)} | Events: {len(event_data)} | Notes: {len(note_data)}

Tasks: {json.dumps(task_data[:15], indent=2)}
Events: {json.dumps(event_data[:10], indent=2)}
Notes: {json.dumps(note_data[:10], indent=2)}

RESPOND INTELLIGENTLY ABOUT:
- TASKS: Create, prioritize, analyze. Reference specific names.
- AUTOMATION: Design workflows (Trigger > Condition > Action > Schedule).
- ANALYTICS: Completion rates, trends, productivity patterns with numbers.
- PROJECT PLANNING: Break goals into phases with timelines.
- SCHEDULING: Time blocks, conflict detection, calendar optimization.
- PRODUCTIVITY: Actionable tips from actual data.

USER QUESTION: {user_message}
"""
    return prompt


def call_gemini_ai(prompt: str):
    """Call Google Gemini AI API and return response"""
    if not GEMINI_API_KEY:
        print("No GEMINI_API_KEY or GOOGLE_API_KEY found in .env")
        return None, False

    if not GEMINI_AVAILABLE:
        print("google-generativeai package not installed")
        return None, False

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=1024,
                temperature=0.7,
            ),
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        )

        if response and response.text:
            print("Gemini AI response generated successfully")
            return response.text, True
        else:
            print("Gemini returned empty response")
            return None, False

    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return None, False


def call_gemini_ai_for_suggestions(task_data: list, tasks: list):
    """Call Gemini AI specifically for generating suggestions"""
    if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
        return None, False

    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    high_priority = [t for t in pending_tasks if t.priority == "high"]
    total = len(tasks)
    completion_rate = round((len(completed_tasks) / total) * 100) if total > 0 else 0

    prompt = f"""You are an AI productivity assistant. Based on the user's task data below, generate exactly 4 personalized suggestions.

USER'S TASKS:
Total: {total} | Pending: {len(pending_tasks)} | Completed: {len(completed_tasks)} | High Priority: {len(high_priority)}
Completion Rate: {completion_rate}%

Task Details:
{json.dumps(task_data, indent=2)}

OUTPUT FORMAT:
Return ONLY a valid JSON array with exactly 4 suggestions. Each suggestion must have:
- "id": number (1-4)
- "type": string (e.g., "Urgent", "Productivity", "Quick Win", "Motivation")
- "title": string with one emoji (max 50 chars, no asterisks or markdown)
- "description": string with specific task names (max 150 chars, no asterisks or markdown)
- "icon": single emoji
- "priority": "high", "medium", or "low"

IMPORTANT: Reference ACTUAL task names from the data above. Do NOT give generic advice.
Do NOT use any markdown formatting like ** in titles or descriptions.
Return ONLY the JSON array, no other text.
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=1024,
                temperature=0.5,
            ),
        )

        if response and response.text:
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            suggestions = json.loads(text)
            if isinstance(suggestions, list) and len(suggestions) > 0:
                # Clean any markdown from suggestion titles and descriptions
                for s in suggestions:
                    if "title" in s:
                        s["title"] = clean_response(s["title"])
                    if "description" in s:
                        s["description"] = clean_response(s["description"])
                print(f"Gemini AI suggestions generated: {len(suggestions)} items")
                return suggestions, True

        return None, False

    except Exception as e:
        print(f"Gemini Suggestions Error: {str(e)}")
        return None, False


def call_gemini_ai_for_analysis(task_data: list, event_data: list, tasks: list):
    """Call Gemini AI specifically for productivity analysis"""
    if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
        return None, False

    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    high_priority = [t for t in pending_tasks if t.priority == "high"]
    total = len(tasks)
    completion_rate = round((len(completed_tasks) / total) * 100) if total > 0 else 0

    prompt = f"""You are a productivity analyst. Analyze the user's task data and provide a detailed analysis.

USER'S DATA:
Tasks: {total} total | {len(pending_tasks)} pending | {len(completed_tasks)} completed
High Priority Pending: {len(high_priority)}
Completion Rate: {completion_rate}%
Events: {len(event_data)}

Task Details:
{json.dumps(task_data, indent=2)}

OUTPUT FORMAT:
Return ONLY a valid JSON object with this structure:
{{
    "overview": {{
        "total_tasks": {total},
        "completed": {len(completed_tasks)},
        "pending": {len(pending_tasks)},
        "completion_rate": "{completion_rate}%",
        "total_events": {len(event_data)}
    }},
    "priority_breakdown": {{
        "high": number,
        "medium": number,
        "low": number
    }},
    "bottlenecks": ["specific bottleneck 1 with task names", "bottleneck 2"],
    "recommendations": ["specific recommendation 1 with task names", "recommendation 2", "recommendation 3"],
    "productivity_score": number (1-100),
    "daily_focus": "specific task name to focus on today"
}}

IMPORTANT: Reference ACTUAL task names. Be specific. No markdown formatting.
Return ONLY the JSON object, no other text.
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=1024,
                temperature=0.3,
            ),
        )

        if response and response.text:
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            analysis = json.loads(text)
            if isinstance(analysis, dict):
                print("Gemini AI analysis generated")
                return analysis, True

        return None, False

    except Exception as e:
        print(f"Gemini Analysis Error: {str(e)}")
        return None, False


def generate_smart_fallback(user_message: str, task_data: list, event_data: list, note_data: list):
    """Smart fallback - simple, professional, no markdown formatting"""
    msg = user_message.lower().strip()

    pending_tasks = [t for t in task_data if t["status"] == "pending"]
    completed_tasks = [t for t in task_data if t["status"] == "completed"]
    high_priority = [t for t in task_data if t["status"] == "pending" and t["priority"] == "high"]
    medium_priority = [t for t in task_data if t["status"] == "pending" and t["priority"] == "medium"]
    low_priority = [t for t in task_data if t["status"] == "pending" and t["priority"] == "low"]

    total = len(task_data)
    completion_rate = round((len(completed_tasks) / total) * 100) if total > 0 else 0

    # ---- Workflow related questions ----
    if any(word in msg for word in ["workflow", "how to use", "how does", "how do i", "guide", "tutorial", "explain"]):
        high_names = [t["title"] for t in high_priority[:5]]
        pending_names = [t["title"] for t in pending_tasks if t["title"] not in high_names][:5]

        lines = ["Here is how to use the workflow with your tasks:", ""]
        lines.append("Step 1 - Focus on High Priority First:")
        if high_names:
            for name in high_names:
                lines.append(f"  - {name}")
        else:
            lines.append("  No high priority tasks right now.")

        lines.append("")
        lines.append("Step 2 - Then tackle remaining pending tasks:")
        if pending_names:
            for name in pending_names:
                lines.append(f"  - {name}")
        else:
            lines.append("  All caught up!")

        lines.append("")
        lines.append("Step 3 - Use the app features:")
        lines.append("  - Create Daily Plan: Auto-generates a schedule based on your tasks")
        lines.append("  - Get Suggestions: AI analyzes your tasks and finds bottlenecks")
        lines.append("  - Interactive Chat: Ask specific questions about your tasks")
        lines.append("  - Voice Input: Speak your questions or commands")

        lines.append("")
        lines.append("Step 4 - Track Progress:")
        lines.append("  - Mark tasks as completed when done")
        lines.append(f"  - Review your completion rate (currently {completion_rate}%)")
        lines.append("  - Check high-priority items daily")

        lines.append("")
        lines.append(f"You have {len(pending_tasks)} pending tasks total. Start with the high-priority ones above!")

        return "\n".join(lines)

    # ---- Task status questions ----
    elif any(word in msg for word in ["task", "pending", "status", "progress", "how many", "list", "show", "all"]):
        pending_names = [t["title"] for t in pending_tasks]
        completed_names = [t["title"] for t in completed_tasks]
        high_names = [t["title"] for t in high_priority]

        lines = ["Your Task Status:", ""]

        lines.append(f"Completed ({len(completed_names)}):")
        for name in completed_names[:8]:
            lines.append(f"  - {name}")
        if len(completed_names) > 8:
            lines.append(f"  ... and {len(completed_names) - 8} more")

        lines.append("")
        lines.append(f"Pending ({len(pending_names)}):")
        for name in pending_names[:8]:
            lines.append(f"  - {name}")
        if len(pending_names) > 8:
            lines.append(f"  ... and {len(pending_names) - 8} more")

        lines.append("")
        lines.append(f"High Priority ({len(high_names)}):")
        if high_names:
            for name in high_names[:5]:
                lines.append(f"  - {name}")
        else:
            lines.append("  None")

        lines.append("")
        lines.append(f"Completion Rate: {completion_rate}%")
        lines.append("")
        if high_names:
            lines.append(f"Recommendation: Focus on \"{high_names[0]}\" first.")
        else:
            lines.append("Great job! No urgent tasks remaining.")

        return "\n".join(lines)

    # ---- Schedule questions ----
    elif any(word in msg for word in ["schedule", "event", "calendar", "meeting", "plan", "today", "tomorrow"]):
        lines = []
        if event_data:
            lines.append(f"Your Schedule ({len(event_data)} events):")
            lines.append("")
            for e in event_data[:8]:
                lines.append(f"  - {e['title']} | {e['event_time']} | {e['status']}")
            lines.append("")
            lines.append("Tips:")
            lines.append("  - Use Create Daily Plan button to auto-organize your day")
            lines.append("  - Schedule high-priority tasks in the morning")
            lines.append("  - Leave buffer time between events")
        else:
            lines.append("No events scheduled yet.")
            lines.append("")
            if pending_tasks:
                lines.append("You have pending tasks that could be scheduled:")
                for t in pending_tasks[:5]:
                    lines.append(f"  - {t['title']} ({t['priority']} priority)")
            lines.append("")
            lines.append("Use the Create Daily Plan button to create a schedule from your tasks.")

        return "\n".join(lines)

    # ---- Priority / what to do next ----
    elif any(word in msg for word in ["priority", "important", "urgent", "next", "focus", "start", "first", "what should"]):
        lines = ["What to focus on next:", ""]

        lines.append(f"High Priority ({len(high_priority)}):")
        if high_priority:
            for t in high_priority[:4]:
                desc = t["description"][:100] if t["description"] else "No description"
                lines.append(f"  - {t['title']}: {desc}")
        else:
            lines.append("  No high priority tasks.")

        lines.append("")
        lines.append(f"Medium Priority ({len(medium_priority)}):")
        if medium_priority:
            for t in medium_priority[:4]:
                lines.append(f"  - {t['title']}")
        else:
            lines.append("  No medium priority tasks.")

        lines.append("")
        lines.append(f"Low Priority ({len(low_priority)}):")
        if low_priority:
            for t in low_priority[:3]:
                lines.append(f"  - {t['title']}")
        else:
            lines.append("  No low priority tasks.")

        lines.append("")
        lines.append("Action Plan:")
        if high_priority:
            lines.append(f"  1. Start with \"{high_priority[0]['title']}\" (high priority)")
        else:
            lines.append("  1. Pick any pending task to get started")
        lines.append("  2. Use 25-minute focused work sessions")
        lines.append("  3. Mark tasks complete as you finish them")

        return "\n".join(lines)

    # ---- Suggestions / help / tips ----
    elif any(word in msg for word in ["suggest", "help", "tip", "advice", "recommend", "productivity", "improve"]):
        lines = ["Personalized Suggestions:", ""]
        lines.append(f"Your Stats: {completion_rate}% completion rate ({len(completed_tasks)}/{total} tasks)")
        lines.append(f"Pending: {len(pending_tasks)} | High Priority: {len(high_priority)}")
        lines.append("")
        lines.append("Actionable Tips:")
        if high_priority:
            lines.append(f"  1. Complete \"{high_priority[0]['title']}\" first - it is high priority")
        else:
            lines.append("  1. No urgent tasks right now")
        lines.append("  2. Break large tasks into 25-minute chunks (Pomodoro Technique)")
        lines.append("  3. Schedule high-priority tasks before noon when energy is highest")
        no_deadline_tasks = [t for t in pending_tasks if t["due_date"] == "No due date"]
        if no_deadline_tasks:
            lines.append(f"  4. Add due dates to {len(no_deadline_tasks)} tasks without deadlines")
        else:
            lines.append("  4. All tasks have due dates - good job!")
        lines.append("  5. Review and reprioritize tasks every morning")

        lines.append("")
        if len(pending_tasks) > 5:
            lines.append(f"You have {len(pending_tasks)} pending tasks. Try completing 2-3 today!")
        else:
            lines.append("Good task management! Keep it up!")

        return "\n".join(lines)

    # ---- Notes related ----
    elif any(word in msg for word in ["note", "notes", "write", "remember"]):
        lines = []
        if note_data:
            lines.append(f"Your Notes ({len(note_data)} total):")
            lines.append("")
            for n in note_data[:5]:
                content_preview = n['content'][:80] if n['content'] else "Empty"
                lines.append(f"  - {n['title']}: {content_preview}")
            lines.append("")
            lines.append("You can create new notes from the dashboard.")
        else:
            lines.append("No notes yet.")
            lines.append("")
            lines.append("You can create notes to save important information, ideas, and meeting notes.")
            lines.append("Use the Notes section on your dashboard to get started.")

        return "\n".join(lines)

    # ---- Greeting ----
    elif any(word in msg for word in ["hello", "hi", "hey", "hii", "hiii", "good morning", "good evening", "good afternoon"]):
        lines = ["Hello! I am your AI Life Assistant.", ""]
        lines.append("Quick Overview:")
        lines.append(f"  - {total} total tasks, {len(pending_tasks)} pending, {len(completed_tasks)} completed")
        lines.append(f"  - {len(event_data)} scheduled events, {len(note_data)} notes")
        lines.append(f"  - Completion rate: {completion_rate}%")

        if high_priority:
            lines.append("")
            lines.append("Top Priority Tasks:")
            for t in high_priority[:3]:
                lines.append(f"  - {t['title']}")

        lines.append("")
        lines.append("How can I help you today? Try asking:")
        lines.append("  - What should I focus on next?")
        lines.append("  - How to use workflow?")
        lines.append("  - Show my schedule")
        lines.append("  - Give me productivity tips")

        return "\n".join(lines)

    # ---- Analysis / report ----
    elif any(word in msg for word in ["analyze", "analysis", "report", "insight", "overview", "summary", "dashboard"]):
        no_deadline = [t for t in pending_tasks if t["due_date"] == "No due date"]

        lines = ["Task Analysis Report:", ""]
        lines.append("Overview:")
        lines.append(f"  - Total Tasks: {total}")
        lines.append(f"  - Completed: {len(completed_tasks)} ({completion_rate}%)")
        lines.append(f"  - Pending: {len(pending_tasks)}")
        lines.append(f"  - Events: {len(event_data)} | Notes: {len(note_data)}")

        lines.append("")
        lines.append("Priority Breakdown (Pending):")
        lines.append(f"  - High: {len(high_priority)}")
        lines.append(f"  - Medium: {len(medium_priority)}")
        lines.append(f"  - Low: {len(low_priority)}")

        lines.append("")
        lines.append("Bottlenecks:")
        if high_priority:
            lines.append(f"  - {len(high_priority)} high-priority tasks pending: {', '.join([t['title'] for t in high_priority[:3]])}")
        if no_deadline:
            lines.append(f"  - {len(no_deadline)} tasks without deadlines")
        if completion_rate < 50:
            lines.append("  - Completion rate below 50%")
        if not high_priority and not no_deadline and completion_rate >= 50:
            lines.append("  - No major bottlenecks detected")

        lines.append("")
        lines.append("Recommendations:")
        if high_priority:
            lines.append(f"  1. Prioritize \"{high_priority[0]['title']}\"")
        else:
            lines.append("  1. Keep up the great work!")
        if no_deadline:
            lines.append(f"  2. Add deadlines to: {', '.join([t['title'] for t in no_deadline[:3]])}")
        else:
            lines.append("  2. All tasks are well-organized")
        if completion_rate < 70:
            lines.append("  3. Try to complete 3 more tasks today to boost your rate")
        else:
            lines.append("  3. Maintain your momentum!")

        return "\n".join(lines)

    # ---- Default ----
    else:
        lines = [f"I am your AI Life Assistant. You said: \"{user_message}\"", ""]
        lines.append("Quick Overview:")
        lines.append(f"  - {total} tasks | {len(pending_tasks)} pending | {len(completed_tasks)} done")
        lines.append(f"  - {len(event_data)} events | {len(note_data)} notes")
        lines.append(f"  - Completion rate: {completion_rate}%")

        if high_priority:
            lines.append("")
            lines.append(f"Top Priority: {', '.join([t['title'] for t in high_priority[:3]])}")

        lines.append("")
        lines.append("I can help you with:")
        lines.append("  - Show my tasks")
        lines.append("  - What should I focus on?")
        lines.append("  - Show my schedule")
        lines.append("  - Give me tips")
        lines.append("  - Analyze my progress")
        lines.append("  - How to use workflow?")

        return "\n".join(lines)


# ==================== Health & Status ====================

@app.get("/")
async def root():
    try:
        db = next(get_db())
        tasks_count = db.query(Task).count()
        db.close()
    except Exception as e:
        tasks_count = -1
        print(f"Error querying tasks: {e}")
    
    return {
        "name": "Multi-Agent AI System",
        "version": "1.0.0",
        "status": "running",
        "ai_provider": "Google Gemini",
        "ai_configured": bool(GEMINI_API_KEY and GEMINI_AVAILABLE),
        "gemini_available": GEMINI_AVAILABLE,
        "database_status": "connected" if tasks_count >= 0 else "error",
        "tasks_count": tasks_count,
        "description": "AI-powered task, schedule, and information management system",
    }


@app.get("/health")
async def health_check():
    try:
        db = next(get_db())
        db.query(Task).first()
        db.close()
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"
    
    return {
        "status": "healthy",
        "ai_provider": "Google Gemini",
        "ai_configured": bool(GEMINI_API_KEY and GEMINI_AVAILABLE),
        "database_status": db_status,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ==================== Task Endpoints ====================

@app.get("/api/tasks", response_model=List[TaskResponse])
async def list_tasks(status: str = None, db: Session = Depends(get_db)):
    """List all tasks, optionally filtered by status"""
    try:
        query = db.query(Task)
        if status:
            query = query.filter(Task.status == status)
        return query.all()
    except Exception as e:
        print(f"ERROR in list_tasks: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error listing tasks: {str(e)}")


@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    try:
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
    except Exception as e:
        print(f"ERROR in create_task: {e}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in get_task: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving task: {str(e)}")


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task"""
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in update_task: {e}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        db.delete(task)
        db.commit()
        return {"success": True, "message": "Task deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in delete_task: {e}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")


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

@app.get("/api/automations", response_model=List[AutomationResponse])
async def list_automations(db: Session = Depends(get_db)):
    """List all automations"""
    automations = db.query(Automation).all()
    for a in automations:
        a.trigger = json.loads(a.trigger) if a.trigger else {}
        a.condition = json.loads(a.condition) if a.condition else {}
        a.action = json.loads(a.action) if a.action else {}
        a.schedule = json.loads(a.schedule) if a.schedule else {}
    return automations


@app.post("/api/automations", response_model=AutomationResponse)
async def create_automation(auto: AutomationCreate, db: Session = Depends(get_db)):
    """Create a new automation"""
    db_auto = Automation(
        name=auto.name,
        enabled=auto.enabled,
        trigger=json.dumps(auto.trigger),
        condition=json.dumps(auto.condition),
        action=json.dumps(auto.action),
        schedule=json.dumps(auto.schedule),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_auto)
    db.commit()
    db.refresh(db_auto)
    
    db_auto.trigger = json.loads(db_auto.trigger)
    db_auto.condition = json.loads(db_auto.condition)
    db_auto.action = json.loads(db_auto.action)
    db_auto.schedule = json.loads(db_auto.schedule)
    return db_auto


@app.put("/api/automations/{auto_id}", response_model=AutomationResponse)
async def update_automation(auto_id: int, auto_update: AutomationUpdate, db: Session = Depends(get_db)):
    """Update an automation"""
    auto = db.query(Automation).filter(Automation.id == auto_id).first()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")

    update_data = auto_update.dict(exclude_unset=True)
    if "name" in update_data: auto.name = update_data["name"]
    if "enabled" in update_data: auto.enabled = update_data["enabled"]
    if "trigger" in update_data: auto.trigger = json.dumps(update_data["trigger"])
    if "condition" in update_data: auto.condition = json.dumps(update_data["condition"])
    if "action" in update_data: auto.action = json.dumps(update_data["action"])
    if "schedule" in update_data: auto.schedule = json.dumps(update_data["schedule"])

    auto.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(auto)
    
    auto.trigger = json.loads(auto.trigger)
    auto.condition = json.loads(auto.condition)
    auto.action = json.loads(auto.action)
    auto.schedule = json.loads(auto.schedule)
    return auto


@app.delete("/api/automations/{auto_id}")
async def delete_automation(auto_id: int, db: Session = Depends(get_db)):
    """Delete an automation"""
    auto = db.query(Automation).filter(Automation.id == auto_id).first()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")

    db.delete(auto)
    db.commit()
    return {"success": True, "message": "Automation deleted"}


# ==================== Workflow Endpoints ====================

@app.post("/api/workflow", response_model=WorkflowResponse)
async def execute_workflow(request: WorkflowRequest, db: Session = Depends(get_db)):
    """Execute a multi-step workflow using the coordinator agent"""
    workflow = WorkflowExecution(
        user_request=request.request,
        status="running",
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    try:
        coordinator = CoordinatorAgent(db)
        result = coordinator.execute_workflow(request.request)

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
        "ai_provider": "Google Gemini",
        "ai_configured": bool(GEMINI_API_KEY),
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


# ==================== AI Chat Endpoint (GEMINI POWERED) ====================

@app.post("/api/ai-chat")
async def ai_chat(message: dict, db: Session = Depends(get_db)):
    """
    Chat with the AI Assistant using Google Gemini AI
    Falls back to smart context-aware responses if Gemini is not configured
    """
    if "message" not in message:
        raise HTTPException(status_code=400, detail="Missing 'message' field")

    user_message = message["message"]

    # STEP 1: Fetch ALL data from database
    tasks, task_data = get_all_task_data(db)
    events, event_data = get_all_event_data(db)
    notes, note_data = get_all_note_data(db)

    # STEP 2: Try Gemini AI first
    ai_powered = False
    response_text = None

    prompt = build_gemini_prompt(task_data, event_data, note_data, tasks, user_message)
    response_text, ai_powered = call_gemini_ai(prompt)

    # STEP 3: Smart fallback if Gemini fails
    if not ai_powered or not response_text:
        response_text = generate_smart_fallback(user_message, task_data, event_data, note_data)
        ai_powered = False

    # STEP 4: Always clean markdown from response
    response_text = clean_response(response_text)

    return {
        "user_message": user_message,
        "assistant_response": response_text,
        "ai_powered": ai_powered,
        "ai_provider": "Google Gemini" if ai_powered else "Smart Fallback",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ==================== AI Suggestions Endpoint (GEMINI POWERED) ====================

@app.get("/api/suggestions")
async def get_suggestions(db: Session = Depends(get_db)):
    """
    Get AI-powered personalized suggestions using Google Gemini
    Falls back to smart rule-based suggestions if Gemini is not configured
    """
    tasks = db.query(Task).all()
    events = db.query(ScheduleEvent).all()

    total_tasks = len(tasks)
    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    high_priority_tasks = [t for t in pending_tasks if t.priority == "high"]
    medium_priority_tasks = [t for t in pending_tasks if t.priority == "medium"]
    low_priority_tasks = [t for t in pending_tasks if t.priority == "low"]

    pending_count = len(pending_tasks)
    completed_count = len(completed_tasks)
    high_priority_count = len(high_priority_tasks)
    completion_rate = round((completed_count / total_tasks) * 100) if total_tasks > 0 else 0

    # Try Gemini AI first
    task_data = []
    for t in tasks:
        task_data.append({
            "id": t.id,
            "title": t.title,
            "description": t.description or "",
            "status": t.status,
            "priority": t.priority,
            "due_date": str(t.due_date) if t.due_date else "No due date"
        })

    ai_suggestions, ai_powered = call_gemini_ai_for_suggestions(task_data, tasks)
    if ai_powered and ai_suggestions:
        return {
            "suggestions": ai_suggestions,
            "ai_powered": True,
            "ai_provider": "Google Gemini",
            "timestamp": datetime.utcnow().isoformat(),
        }

    # Try existing ClaudeAIAgent as secondary fallback
    try:
        ai_agent = ClaudeAIAgent(db)
        claude_suggestions = ai_agent.generate_ai_suggestions()
        if claude_suggestions and len(claude_suggestions) > 0:
            return {
                "suggestions": claude_suggestions,
                "ai_powered": True,
                "ai_provider": "Claude",
                "timestamp": datetime.utcnow().isoformat(),
            }
    except Exception as e:
        print(f"Claude fallback also failed: {e}")

    # Smart rule-based suggestions
    suggestions = []

    if high_priority_count > 0:
        top_task_names = ", ".join([t.title for t in high_priority_tasks[:3]])
        suggestions.append({
            "id": 1,
            "type": "Urgent",
            "title": f"{high_priority_count} High Priority Task{'s' if high_priority_count > 1 else ''}",
            "description": f"Focus on: {top_task_names}. Complete these first for maximum impact!",
            "icon": "!",
            "priority": "high"
        })

    if pending_count > 5:
        suggestions.append({
            "id": 2,
            "type": "Productivity",
            "title": f"{pending_count} Tasks in Backlog",
            "description": f"Try completing 3 tasks today! Start with: {pending_tasks[0].title if pending_tasks else 'any task'}",
            "icon": "list",
            "priority": "medium"
        })

    if completion_rate >= 50:
        suggestions.append({
            "id": 3,
            "type": "Motivation",
            "title": f"Great Progress! {completion_rate}% Complete",
            "description": f"You have completed {completed_count}/{total_tasks} tasks. Keep the momentum going!",
            "icon": "star",
            "priority": "low"
        })

    if completion_rate < 30 and total_tasks > 0:
        easy_tasks = [t.title for t in low_priority_tasks[:2]]
        suggestions.append({
            "id": 4,
            "type": "Quick Win",
            "title": "Start with Quick Wins",
            "description": f"Complete easy tasks first: {', '.join(easy_tasks) if easy_tasks else 'Pick your easiest pending task'}",
            "icon": "bolt",
            "priority": "medium"
        })

    no_deadline = [t for t in pending_tasks if not t.due_date]
    if len(no_deadline) > 2:
        no_deadline_names = ", ".join([t.title for t in no_deadline[:3]])
        suggestions.append({
            "id": 5,
            "type": "Organization",
            "title": f"{len(no_deadline)} Tasks Need Deadlines",
            "description": f"Add due dates to: {no_deadline_names}",
            "icon": "calendar",
            "priority": "medium"
        })

    if completed_count == 0 and pending_count > 0:
        first_task = pending_tasks[0].title if pending_tasks else "your first task"
        suggestions.append({
            "id": 6,
            "type": "Morning Motivation",
            "title": "Start Your Day Strong",
            "description": f"Begin with \"{first_task}\" - completing your first task creates momentum!",
            "icon": "sunrise",
            "priority": "high"
        })

    upcoming_events = [e for e in events if e.status == "upcoming"]
    if upcoming_events:
        suggestions.append({
            "id": 7,
            "type": "Schedule",
            "title": f"{len(upcoming_events)} Upcoming Events",
            "description": f"Next: {upcoming_events[0].title}. Plan your tasks around your schedule!",
            "icon": "calendar",
            "priority": "medium"
        })

    if pending_count == 0 and total_tasks > 0:
        suggestions.append({
            "id": 8,
            "type": "Achievement",
            "title": "All Tasks Complete!",
            "description": f"Amazing! You have completed all {total_tasks} tasks. Time to plan new goals!",
            "icon": "trophy",
            "priority": "low"
        })

    if not suggestions:
        suggestions = [{
            "id": 1,
            "type": "Getting Started",
            "title": "Welcome to AI Life Assistant!",
            "description": "Create your first task to get personalized AI suggestions!",
            "icon": "sparkle",
            "priority": "high"
        }]

    return {
        "suggestions": suggestions,
        "ai_powered": False,
        "ai_provider": "Smart Rules",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ==================== Productivity Analysis (GEMINI POWERED) ====================

@app.get("/api/productivity-analysis")
async def get_productivity_analysis(db: Session = Depends(get_db)):
    """Get AI-powered productivity analysis and insights using Gemini"""

    tasks, task_data = get_all_task_data(db)
    events, event_data = get_all_event_data(db)

    # Try Gemini AI first
    analysis, ai_powered = call_gemini_ai_for_analysis(task_data, event_data, tasks)

    if ai_powered and analysis:
        return {
            "analysis": analysis,
            "ai_powered": True,
            "ai_provider": "Google Gemini",
            "timestamp": datetime.utcnow().isoformat(),
        }

    # Try existing Claude agent as secondary
    try:
        ai_agent = ClaudeAIAgent(db)
        claude_analysis = ai_agent.analyze_productivity()
        if claude_analysis:
            return {
                "analysis": claude_analysis,
                "ai_powered": ai_agent.enabled,
                "ai_provider": "Claude",
                "timestamp": datetime.utcnow().isoformat(),
            }
    except Exception as e:
        print(f"Claude analysis fallback failed: {e}")

    # Smart fallback analysis
    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    high_priority = [t for t in pending_tasks if t.priority == "high"]
    no_deadline = [t for t in pending_tasks if not t.due_date]
    total = len(tasks)
    completion_rate = round((len(completed_tasks) / total) * 100) if total > 0 else 0

    analysis = {
        "overview": {
            "total_tasks": total,
            "completed": len(completed_tasks),
            "pending": len(pending_tasks),
            "completion_rate": f"{completion_rate}%",
            "total_events": len(events),
        },
        "priority_breakdown": {
            "high": len(high_priority),
            "medium": len([t for t in pending_tasks if t.priority == "medium"]),
            "low": len([t for t in pending_tasks if t.priority == "low"]),
        },
        "bottlenecks": [],
        "recommendations": [],
        "productivity_score": min(completion_rate + 10, 100),
        "daily_focus": high_priority[0].title if high_priority else (pending_tasks[0].title if pending_tasks else "No tasks"),
    }

    if high_priority:
        analysis["bottlenecks"].append(
            f"{len(high_priority)} high-priority tasks pending: {', '.join([t.title for t in high_priority[:3]])}"
        )
    if no_deadline:
        analysis["bottlenecks"].append(
            f"{len(no_deadline)} tasks without deadlines: {', '.join([t.title for t in no_deadline[:3]])}"
        )
    if completion_rate < 30:
        analysis["bottlenecks"].append(
            f"Low completion rate ({completion_rate}%) - consider breaking tasks into smaller pieces"
        )
    if not analysis["bottlenecks"]:
        analysis["bottlenecks"].append("No major bottlenecks detected!")

    if high_priority:
        analysis["recommendations"].append(f"Start with '{high_priority[0].title}' - highest priority pending task")
    if no_deadline:
        analysis["recommendations"].append(f"Add deadlines to {len(no_deadline)} tasks to improve focus")
    if completion_rate < 50:
        analysis["recommendations"].append("Break large tasks into smaller 25-minute subtasks")
    if len(pending_tasks) > 10:
        analysis["recommendations"].append("Consider delegating or postponing low-priority tasks")
    if not analysis["recommendations"]:
        analysis["recommendations"].append("Great job! Keep maintaining your productivity habits.")

    return {
        "analysis": analysis,
        "ai_powered": False,
        "ai_provider": "Smart Rules",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ==================== Voice Chat (GEMINI POWERED) ====================

@app.post("/api/chat/voice")
async def chat_with_voice(text: dict, db: Session = Depends(get_db)):
    """Chat with AI using voice input - uses same Gemini logic as ai-chat"""
    if "text" not in text:
        raise HTTPException(status_code=400, detail="Missing 'text' field")

    user_text = text["text"]

    # Use the same Gemini AI logic
    tasks, task_data = get_all_task_data(db)
    events, event_data = get_all_event_data(db)
    notes, note_data = get_all_note_data(db)

    prompt = build_gemini_prompt(task_data, event_data, note_data, tasks, user_text)
    response_text, ai_powered = call_gemini_ai(prompt)

    if not ai_powered or not response_text:
        response_text = generate_smart_fallback(user_text, task_data, event_data, note_data)

    # Always clean markdown from response
    response_text = clean_response(response_text)

    return {
        "user_input": user_text,
        "response": response_text,
        "ai_powered": ai_powered,
        "ai_provider": "Google Gemini" if ai_powered else "Smart Fallback",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/speak")
async def text_to_speech(text: dict):
    """Convert text to speech"""
    if "text" not in text:
        raise HTTPException(status_code=400, detail="Missing 'text' field")

    try:
        text_to_speak = text["text"]

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
    print(f"Starting AI Life Assistant Backend on port {port}")
    print(f"AI Provider: Google Gemini")
    print(f"Gemini API Key: {'Configured' if GEMINI_API_KEY else 'Missing - add GEMINI_API_KEY to .env'}")
    print(f"Gemini Package: {'Installed' if GEMINI_AVAILABLE else 'Missing - run: pip install google-generativeai'}")
    uvicorn.run(app, host="0.0.0.0", port=port, server_header=False)

