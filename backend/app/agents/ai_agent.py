import os
import random
import json
from datetime import datetime
from sqlalchemy.orm import Session

# ============================================
# CONFIGURE GEMINI AI
# ============================================
try:
    import google.generativeai as genai
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
        GEMINI_AVAILABLE = True
    else:
        GEMINI_AVAILABLE = False
except ImportError:
    GEMINI_AVAILABLE = False

from app.models.database import Task, ScheduleEvent, Note


# ============================================
# CONVERSATION MEMORY (prevents repetition)
# ============================================
_conversation_memory = {}
_previous_responses = []
_MAX_HISTORY = 20
_MAX_PREVIOUS = 50


# ============================================
# HELPER: Get Database Context
# ============================================
def get_db_context(db: Session):
    """Get real user data from database for AI context"""
    try:
        tasks = db.query(Task).all()
        events = db.query(ScheduleEvent).all()
        notes = db.query(Note).all()
    except Exception:
        tasks, events, notes = [], [], []

    pending = [t for t in tasks if t.status in ("pending", "in_progress")]
    completed = [t for t in tasks if t.status in ("completed", "done")]
    high = [t for t in tasks if t.priority == "high"]
    medium = [t for t in tasks if t.priority == "medium"]
    low = [t for t in tasks if t.priority == "low"]
    completion_rate = round(len(completed) / max(len(tasks), 1) * 100)

    task_details = ""
    for t in tasks[:15]:
        task_details += f"  - [{t.status}] {t.title} (priority: {t.priority})"
        if hasattr(t, 'description') and t.description:
            task_details += f" | {t.description[:60]}"
        task_details += "\n"

    event_details = ""
    for e in events[:10]:
        event_details += f"  - {e.title}"
        if hasattr(e, 'event_time') and e.event_time:
            event_details += f" | {e.event_time}"
        if hasattr(e, 'description') and e.description:
            event_details += f" | {e.description[:40]}"
        event_details += "\n"

    note_details = ""
    for n in notes[:10]:
        note_details += f"  - {n.title}"
        if hasattr(n, 'content') and n.content:
            note_details += f" | {n.content[:50]}..."
        note_details += "\n"

    context = f"""
📋 TASKS ({len(tasks)} total | {len(pending)} pending | {len(completed)} completed):
  High: {len(high)} | Medium: {len(medium)} | Low: {len(low)}
  Completion Rate: {completion_rate}%
{task_details}
📅 EVENTS ({len(events)} total):
{event_details}
📝 NOTES ({len(notes)} total):
{note_details}
⏰ Current Time: {datetime.now().strftime('%Y-%m-%d %I:%M %p')}
"""
    return context, tasks, events, notes


# ============================================
# HELPER: Smart Fallback Responses
# ============================================
def generate_smart_fallback(message, tasks, events, notes):
    """Generate intelligent fallback when Gemini fails"""
    msg = message.lower().strip()
    tc = len(tasks) if tasks else 0
    ec = len(events) if events else 0
    nc = len(notes) if notes else 0
    pending = [t for t in tasks if t.status in ("pending", "in_progress")] if tasks else []
    high = [t for t in tasks if t.priority == "high"] if tasks else []
    completed = [t for t in tasks if t.status in ("completed", "done")] if tasks else []
    rate = round(len(completed) / max(tc, 1) * 100)

    if any(w in msg for w in ["hi", "hello", "hey", "hii", "sup", "hola"]):
        options = [
            f"👋 Welcome back! You have {tc} tasks ({len(pending)} pending), {ec} events, and {nc} notes. What shall we tackle?",
            f"Hey! 🚀 Quick update: {tc} tasks, {len(high)} are high priority. {ec} events on your calendar. How can I help?",
            f"Hello! 😊 Dashboard: {tc} tasks ({rate}% complete), {ec} events, {nc} notes. What's on your mind?",
            f"Hi there! 📊 You've got {len(pending)} pending tasks and {ec} upcoming events. Ready to be productive? 🎯",
            f"Hey! 🌟 Status check: {len(completed)} tasks done, {len(pending)} to go. {ec} events scheduled. What's next?",
        ]
        return random.choice(options)

    if any(w in msg for w in ["task", "todo", "pending", "work"]):
        if tasks:
            options = [
                f"📋 You have {len(pending)} pending tasks. " + (f"Top priority: {', '.join([t.title for t in high[:2]])}." if high else "All at manageable priority!"),
                f"Task overview: {tc} total, {len(pending)} pending, {len(completed)} done. " + (f"⚡ Focus on: {high[0].title}" if high else "Great job keeping up!"),
                f"Here's your task status: {len(pending)} waiting, {len(completed)} completed ({rate}% done). " + (f"🔴 {len(high)} high-priority items need attention!" if high else "Everything's under control! 💪"),
            ]
            return random.choice(options)
        return "📋 No tasks yet! Want to create one? Just tell me what you need to do."

    if any(w in msg for w in ["schedule", "event", "calendar", "meeting", "appointment"]):
        if events:
            options = [
                f"📅 {ec} events on your calendar: {', '.join([e.title for e in events[:3]])}. Need to add or change anything?",
                f"Calendar check: You have {ec} events scheduled. Next up: {events[0].title}. Want to manage your schedule?",
                f"📅 Your schedule has {ec} events. Including: {', '.join([e.title for e in events[:2]])}. Need to add something?",
            ]
            return random.choice(options)
        return "📅 Your calendar is empty! Want to schedule something?"

    if any(w in msg for w in ["note", "notes", "write", "remember"]):
        if notes:
            options = [
                f"📝 You have {nc} notes: {', '.join([n.title for n in notes[:3]])}. Want to create or edit one?",
                f"Notes overview: {nc} saved. Recent: {notes[0].title}. Need to add a new note?",
            ]
            return random.choice(options)
        return "📝 No notes yet. Want to create one? Just tell me the title and content!"

    if any(w in msg for w in ["suggest", "help", "tip", "advice", "improve", "optimize", "productivity"]):
        options = [
            f"💡 With {tc} tasks ({len(high)} high priority), try the Eisenhower Matrix: Do urgent+important first, schedule important ones, delegate urgent ones, eliminate the rest!",
            f"💡 Your completion rate is {rate}%. Try the 2-minute rule: if a task takes less than 2 min, do it immediately!",
            f"💡 You have {len(pending)} pending tasks. Try time-blocking: assign 90-minute deep work sessions for each high-priority task.",
            f"💡 Suggestion: Start each day with your {len(high)} high-priority tasks before checking messages. Your focus is sharpest in the morning!",
            f"💡 Pro tip: Break your {len(pending)} pending tasks into smaller steps. A task like '{pending[0].title if pending else 'example'}' might have 3-4 subtasks." if pending else "💡 Create some tasks first, then I can give you personalized productivity advice!",
        ]
        return random.choice(options)

    if any(w in msg for w in ["status", "summary", "overview", "dashboard", "how am i"]):
        return f"📊 Your productivity summary:\n• Tasks: {tc} total ({len(pending)} pending, {len(completed)} done)\n• Completion rate: {rate}%\n• Events: {ec} scheduled\n• Notes: {nc} saved\n\n{'🌟 Great progress!' if rate > 50 else '💪 Keep going, you got this!'}"

    if any(w in msg for w in ["create", "add", "new", "make"]):
        return f"I can help you create things! Try saying:\n• 'Create a task called [name]'\n• 'Add an event for [date]'\n• 'Make a note about [topic]'\nWhat would you like to create?"

    if any(w in msg for w in ["delete", "remove", "clear"]):
        return f"To manage your items, use the Tasks, Schedule, or Notes pages. I can help you decide what to prioritize or remove. What are you looking to clean up?"

    if any(w in msg for w in ["thank", "thanks", "awesome", "great", "cool"]):
        options = [
            "You're welcome! 😊 Let me know if you need anything else!",
            "Happy to help! 🎉 Anything else on your mind?",
            "Glad I could help! 🚀 Keep up the great work!",
        ]
        return random.choice(options)

    # Default
    defaults = [
        f"I can help with your {tc} tasks, {ec} events, and {nc} notes. Try asking about your tasks, schedule, or say 'suggest' for tips! 🎯",
        f"Need help? Ask me about: tasks, schedule, notes, productivity tips, or just chat! You have {tc} tasks and {ec} events to manage. 😊",
        f"I'm your AI productivity assistant! I can see you have {tc} tasks and {ec} events. What would you like to work on? 🚀",
    ]
    return random.choice(defaults)


# ============================================
# CONVERSATIONAL AI AGENT (Main Chat)
# ============================================
class ConversationalAIAgent:
    def __init__(self, db: Session):
        self.db = db
        self.enabled = GEMINI_AVAILABLE
        self.name = "GenAI TaskMaster Assistant"

    def chat(self, user_message: str, session_id: str = "default") -> str:
        """Generate a unique, contextual AI response"""
        global _previous_responses

        # Get real data
        context, tasks, events, notes = get_db_context(self.db)

        # If Gemini not available, use smart fallback
        if not self.enabled:
            return generate_smart_fallback(user_message, tasks, events, notes)

        try:
            # Get/create conversation history
            if session_id not in _conversation_memory:
                _conversation_memory[session_id] = []

            history = _conversation_memory[session_id]

            # Build history text
            history_text = ""
            for msg in history[-6:]:
                history_text += f"User: {msg['user']}\nAssistant: {msg['ai']}\n\n"

            # Random style picker (makes responses feel different each time)
            styles = [
                "Use bullet points and emojis. Be energetic and motivating.",
                "Be conversational and warm. Use short paragraphs. Add personal touch.",
                "Use numbered steps. Be precise and actionable. Include specific data.",
                "Be friendly and casual. Use analogies to explain things clearly.",
                "Be direct and efficient. Focus on key actions. No fluff.",
                "Use a storytelling approach. Make it engaging and relatable.",
                "Be enthusiastic and encouraging. Celebrate their progress.",
                "Use a coaching tone. Ask follow-up questions. Be supportive.",
            ]
            chosen_style = random.choice(styles)

            # Build anti-repetition context
            anti_repeat = ""
            if _previous_responses:
                last_3 = _previous_responses[-3:]
                anti_repeat = f"""
AVOID repeating these recent responses (use completely different wording):
{chr(10).join([f'- "{r[:100]}..."' for r in last_3])}
"""

            # Dynamic system prompt
            system_prompt = f"""You are TaskMaster AI - an intelligent productivity assistant powering a full platform with Dashboard, Tasks, Schedule, Notes, Workflow Automation, Data Analytics, and Project Planner.

RESPONSE STYLE: {chosen_style}

USER'S LIVE DATA:
{context}

RECENT CONVERSATION:
{history_text}

{anti_repeat}

RULES:
1. Reference ACTUAL task names, event titles, note titles from data above
2. NEVER give generic advice - be SPECIFIC to their data
3. NEVER repeat previous responses - always say something NEW
4. Keep responses 2-5 sentences unless they ask for detail
5. Vary greetings every time
6. When asked about AUTOMATION: explain triggers, conditions, actions, scheduling
7. When asked about ANALYTICS: cite completion rates, category breakdowns, trends
8. When asked about PROJECT PLANNING: break goals into phases with timelines
9. Use the style instruction above to vary format
10. Include 2-3 relevant emojis max
11. Give actionable advice they can do RIGHT NOW
12. Plain text only - no markdown formatting
"""

            # Create Gemini model with HIGH creativity
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config=genai.GenerationConfig(
                    temperature=0.95,
                    top_p=0.95,
                    top_k=50,
                    max_output_tokens=1024,
                )
            )

            prompt = f"{system_prompt}\n\nUser: {user_message}\n\nAssistant (give a unique, personalized, non-repetitive response):"

            response = model.generate_content(prompt)
            ai_response = response.text.strip() if response.text else ""

            if not ai_response:
                ai_response = generate_smart_fallback(user_message, tasks, events, notes)

            # Save to conversation history
            _conversation_memory[session_id].append({
                "user": user_message,
                "ai": ai_response
            })

            # Save to previous responses (for anti-repetition)
            _previous_responses.append(ai_response)

            # Trim memory
            if len(_conversation_memory[session_id]) > _MAX_HISTORY:
                _conversation_memory[session_id] = _conversation_memory[session_id][-_MAX_HISTORY:]
            if len(_previous_responses) > _MAX_PREVIOUS:
                _previous_responses = _previous_responses[-_MAX_PREVIOUS:]

            return ai_response

        except Exception as e:
            print(f"[ConversationalAIAgent] Gemini Error: {e}")
            return generate_smart_fallback(user_message, tasks, events, notes)


# ============================================
# CLAUDE AI AGENT (Suggestions & Analysis)
# ============================================
class ClaudeAIAgent:
    """AI Agent for suggestions and productivity analysis (uses Gemini)"""

    def __init__(self, db: Session):
        self.db = db
        self.enabled = GEMINI_AVAILABLE
        self.name = "AI Suggestions Agent"

    def generate_ai_suggestions(self):
        """Generate personalized AI suggestions based on user data"""
        context, tasks, events, notes = get_db_context(self.db)

        if not self.enabled:
            return self._fallback_suggestions(tasks, events, notes)

        try:
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config=genai.GenerationConfig(
                    temperature=0.95,
                    top_p=0.95,
                    max_output_tokens=2048,
                )
            )

            prompt = f"""Analyze this user's productivity data and generate exactly 3-5 UNIQUE, SPECIFIC suggestions.

{context}

Return ONLY a valid JSON array. Each object must have:
- "id": number (1, 2, 3, etc.)
- "type": category string (e.g., "Productivity", "Time Management", "Organization", "Wellness", "Focus")
- "title": catchy short title with emoji (max 6 words)
- "description": specific advice referencing their ACTUAL task/event names and numbers (2-3 sentences)
- "icon": relevant emoji
- "priority": "high", "medium", or "low"

IMPORTANT: 
- Reference ACTUAL task names from their data
- Include specific numbers and percentages
- Give actionable, not generic advice
- Each suggestion must be DIFFERENT from the others

Return ONLY the JSON array, no markdown, no explanation, no code blocks."""

            response = model.generate_content(prompt)

            try:
                text = response.text.strip()
                # Clean markdown if present
                if "```" in text:
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                    text = text.strip()
                suggestions = json.loads(text)
                if isinstance(suggestions, list) and len(suggestions) > 0:
                    return suggestions
            except (json.JSONDecodeError, IndexError):
                pass

            return self._fallback_suggestions(tasks, events, notes)

        except Exception as e:
            print(f"[ClaudeAIAgent] Suggestions Error: {e}")
            return self._fallback_suggestions(tasks, events, notes)

    def _fallback_suggestions(self, tasks, events, notes):
        """Generate rule-based suggestions when AI is unavailable"""
        pending = [t for t in tasks if t.status in ("pending", "in_progress")] if tasks else []
        completed = [t for t in tasks if t.status in ("completed", "done")] if tasks else []
        high = [t for t in tasks if t.priority == "high"] if tasks else []
        tc = len(tasks) if tasks else 0
        ec = len(events) if events else 0
        rate = round(len(completed) / max(tc, 1) * 100)

        suggestions = []

        if high:
            suggestions.append({
                "id": 1,
                "type": "Productivity",
                "title": f"⚡ Focus on {len(high)} High-Priority Tasks",
                "description": f"You have {len(high)} high-priority tasks including '{high[0].title}'. Tackle these first for maximum impact. Try dedicating 90-minute focus blocks to each.",
                "icon": "🎯",
                "priority": "high"
            })

        if rate < 50 and tc > 0:
            suggestions.append({
                "id": 2,
                "type": "Performance",
                "title": f"📈 Boost Your {rate}% Completion Rate",
                "description": f"You've completed {len(completed)} of {tc} tasks. Try the 2-minute rule: quickly finish small tasks first to build momentum.",
                "icon": "📊",
                "priority": "high"
            })
        elif tc > 0:
            suggestions.append({
                "id": 2,
                "type": "Performance",
                "title": f"🌟 Great Progress at {rate}%!",
                "description": f"You've completed {len(completed)} of {tc} tasks. Keep the momentum going! Focus on your remaining {len(pending)} pending items.",
                "icon": "🏆",
                "priority": "medium"
            })

        if ec > 0 and pending:
            suggestions.append({
                "id": 3,
                "type": "Organization",
                "title": "📅 Align Tasks with Schedule",
                "description": f"You have {len(pending)} pending tasks and {ec} events. Block focused work time between events to maximize productivity.",
                "icon": "📅",
                "priority": "medium"
            })

        if not suggestions:
            suggestions = [{
                "id": 1,
                "type": "Getting Started",
                "title": "🚀 Start Your Productivity Journey",
                "description": "Create your first tasks and schedule events to get personalized AI-powered suggestions!",
                "icon": "✨",
                "priority": "high"
            }]

        return suggestions

    def analyze_productivity(self):
        """Analyze user's productivity patterns"""
        context, tasks, events, notes = get_db_context(self.db)

        if not self.enabled:
            return self._fallback_analysis(tasks, events, notes)

        try:
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config=genai.GenerationConfig(
                    temperature=0.8,
                    max_output_tokens=1024,
                )
            )

            prompt = f"""Analyze this user's productivity data and provide a brief, personalized analysis.

{context}

Give a 3-4 sentence analysis covering:
1. Their current productivity status (reference specific numbers)
2. What they're doing well
3. One specific area for improvement
4. One actionable tip for today

Be encouraging but honest. Reference their actual task names and data."""

            response = model.generate_content(prompt)
            return response.text.strip() if response.text else self._fallback_analysis(tasks, events, notes)

        except Exception as e:
            print(f"[ClaudeAIAgent] Analysis Error: {e}")
            return self._fallback_analysis(tasks, events, notes)

    def _fallback_analysis(self, tasks, events, notes):
        """Fallback productivity analysis"""
        tc = len(tasks) if tasks else 0
        pending = [t for t in tasks if t.status in ("pending", "in_progress")] if tasks else []
        completed = [t for t in tasks if t.status in ("completed", "done")] if tasks else []
        rate = round(len(completed) / max(tc, 1) * 100)

        if tc == 0:
            return "You haven't created any tasks yet. Start by adding your to-do items to get personalized productivity insights!"

        analysis = f"📊 You have {tc} tasks with a {rate}% completion rate. "
        if rate > 70:
            analysis += f"Excellent progress! You've completed {len(completed)} tasks. "
        elif rate > 40:
            analysis += f"Good momentum with {len(completed)} tasks done. "
        else:
            analysis += f"There's room to improve - {len(pending)} tasks are waiting. "

        if pending:
            analysis += f"Focus on '{pending[0].title}' next to keep moving forward."

        return analysis

