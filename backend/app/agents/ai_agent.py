"""
Google Gemini AI Agent - REST API approach (no SDK compatibility issues)
"""
import os
import json
from typing import Any, Dict, List
import requests
import re
import time
from sqlalchemy.orm import Session
from app.models.database import Task, ScheduleEvent, Note

# Simple cache for context data (5 minute TTL)
_context_cache = {"data": None, "timestamp": 0}


class GoogleAIAgent:
    """
    Uses Google Gemini API via REST calls
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        self.api_url = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent"
        
        # Check if API key is configured
        if self.api_key and self.api_key != "your-google-api-key-here":
            self.enabled = True
        else:
            self.enabled = False
    
    def _get_context_data(self) -> Dict[str, Any]:
        """Gather current user data for AI context"""
        tasks = self.db.query(Task).all()
        events = self.db.query(ScheduleEvent).all()
        notes = self.db.query(Note).all()
        
        return {
            "tasks": {
                "total": len(tasks),
                "pending": len([t for t in tasks if t.status == "pending"]),
                "completed": len([t for t in tasks if t.status == "completed"]),
                "in_progress": len([t for t in tasks if t.status == "in-progress"]),
                "high_priority": len([t for t in tasks if t.priority == "high"]),
                "list": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "status": t.status,
                        "priority": t.priority,
                        "description": t.description[:100] if t.description else ""
                    }
                    for t in tasks[:10]
                ]
            },
            "schedule": {
                "events_count": len(events),
                "upcoming": [
                    {
                        "title": e.title,
                        "start": e.start_time.isoformat(),
                        "location": e.location
                    }
                    for e in events[:5]
                ]
            },
            "notes": {
                "total": len(notes),
                "recent": [
                    {
                        "title": n.title,
                        "preview": n.content[:100] if n.content else ""
                    }
                    for n in notes[:5]
                ]
            }
        }
    
    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API via REST"""
        if not self.enabled:
            return ""
        
        try:
            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt}]
                    }
                ]
            }
            
            headers = {"Content-Type": "application/json"}
            params = {"key": self.api_key}
            
            response = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            else:
                print(f"Gemini API Error: {response.status_code} - {response.text}")
                return ""
        
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            return ""
    
    def generate_ai_suggestions(self) -> List[Dict[str, Any]]:
        """Use Google Gemini to generate intelligent suggestions"""
        
        if not self.enabled:
            return []
        
        context = self._get_context_data()
        
        prompt = f"""Analyze this user's task and productivity data and generate 3-5 specific, actionable suggestions:

USER DATA:
{json.dumps(context, indent=2)}

Generate suggestions in JSON format with these fields for EACH suggestion:
- id (unique number)
- type (category like "Productivity", "Health", "Planning", etc.)
- title (emoji + short title, max 40 chars)
- description (specific, actionable advice)
- icon (relevant emoji)
- priority ("high", "medium", or "low")

IMPORTANT: 
- Make suggestions specific to their actual tasks and schedule
- Provide concrete, actionable advice
- Consider work-life balance
- If they have too many tasks, suggest prioritization
- If they have no tasks, suggest planning

Return ONLY a JSON array of suggestions, no other text or markdown."""

        try:
            response_text = self._call_gemini(prompt)
            
            if not response_text:
                return []
            
            # Clean up markdown if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            suggestions = json.loads(response_text.strip())
            return suggestions if isinstance(suggestions, list) else []
        
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            return []
        except Exception as e:
            print(f"AI Suggestion Error: {e}")
            return []
    
    def execute_ai_workflow(self, user_request: str) -> Dict[str, Any]:
        """Execute workflow based on user request"""
        
        if not self.enabled:
            return {
                "success": False,
                "message": "AI not configured. Set GOOGLE_API_KEY in .env"
            }
        
        context = self._get_context_data()
        
        prompt = f"""You are an AI assistant helping with task management.

Current user data:
{json.dumps(context, indent=2)}

User request: {user_request}

Respond with JSON containing:
- action_type: "create_task", "create_event", "create_note", or "analyze"
- details: specific information about what to do
- reasoning: why this is recommended
- summary: brief explanation for the user

Return ONLY JSON, no markdown."""

        try:
            response_text = self._call_gemini(prompt)
            
            if not response_text:
                return {"success": False, "error": "Empty response from AI"}
            
            # Clean markdown
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            try:
                result = json.loads(response_text.strip())
            except:
                result = {"summary": response_text}
            
            return {
                "success": True,
                "result": result,
                "model": "gemini-pro"
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to execute AI workflow"
            }
    
    def analyze_productivity(self) -> Dict[str, Any]:
        """Analyze productivity patterns"""
        
        if not self.enabled:
            return {}
        
        context = self._get_context_data()
        
        prompt = f"""Analyze this person's productivity:

{json.dumps(context, indent=2)}

Provide JSON analysis with:
- overall_assessment: brief assessment of productivity
- strengths: list of what they're doing well
- areas_for_improvement: specific areas to improve
- daily_tip: one actionable tip for today
- weekly_goal: one goal for the week

Return ONLY JSON."""

        try:
            response_text = self._call_gemini(prompt)
            
            if not response_text:
                return {}
            
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            return json.loads(response_text.strip())
        
        except:
            return {}


class ConversationalAIAgent:
    """Multi-turn conversation with AI - optimized for fast responses"""
    
    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        
        if self.api_key and self.api_key != "your-google-api-key-here":
            self.enabled = True
        else:
            self.enabled = False
    
    def _get_project_context(self, use_cache=False) -> str:
        """Fetch project data with optional caching - optimized for speed"""
        global _context_cache
        
        # Check cache validity (5 minute TTL)
        if use_cache and _context_cache["data"] and (time.time() - _context_cache["timestamp"]) < 300:
            return _context_cache["data"]
        
        try:
            # Only fetch minimal data for context
            tasks = self.db.query(Task).filter(Task.status != "completed").limit(5).all()
            events = self.db.query(ScheduleEvent).limit(3).all()
            
            context_parts = []
            
            # Minimal task info
            if tasks:
                context_parts.append(f"Active Tasks: {len(tasks)} pending")
            
            # Minimal event info
            if events:
                context_parts.append(f"Upcoming Events: {len(events)}")
            
            context_text = ". ".join(context_parts) if context_parts else "Project active"
            
            # Cache the result
            _context_cache["data"] = context_text
            _context_cache["timestamp"] = time.time()
            
            return context_text
        except Exception as e:
            print(f"[AI] Error fetching context: {e}")
            return "Project active"
    
    def chat(self, user_message: str) -> str:
        """Chat with AI - optimized for speed"""
        
        if not self.enabled:
            return "AI is not configured. Add GOOGLE_API_KEY to .env"
        
        try:
            # Get minimal context (use cache for faster responses)
            project_context = self._get_project_context(use_cache=True)
            
            # Minimal prompt - reduces tokens and processing time
            enhanced_prompt = f"""You are a helpful assistant. Keep responses brief and direct.

Context: {project_context}

User: {user_message}

Rules: No markdown, no asterisks, no special formatting. Plain text only."""
            
            # Use fastest model with shorter timeout
            api_url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
            
            payload = {
                "contents": [{
                    "parts": [{"text": enhanced_prompt}]
                }]
            }
            
            params = {"key": self.api_key}
            headers = {"Content-Type": "application/json"}
            
            # Shorter timeout for faster fail-over
            response = requests.post(api_url, json=payload, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                try:
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return self._clean_response(text)
                except (KeyError, IndexError):
                    return self._generate_smart_response(user_message)
            else:
                return self._generate_smart_response(user_message)
        
        except requests.Timeout:
            # Fast timeout recovery
            return self._generate_smart_response(user_message)
        except Exception as e:
            print(f"[AI] Chat error: {e}")
            return self._generate_smart_response(user_message)
    
    def _clean_response(self, text: str) -> str:
        """Clean response - optimized version"""
        # Remove greetings
        greetings = ["Hello!", "Hi!", "Hi there!", "Hey!", "Greetings!", "Welcome!"]
        for greeting in greetings:
            if text.startswith(greeting):
                text = text[len(greeting):].strip()
                break
        
        # Remove markdown in one pass
        text = text.replace('**', '').replace('_', '').replace('`', '')
        text = re.sub(r'\*([^\*]+)\*', r'\1', text)
        
        # Clean formatting
        text = re.sub(r'^\d+\.\s+', '', text, flags=re.MULTILINE)
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
        
        # Clean whitespace
        text = re.sub(r'\n\n+', '\n', text)
        text = re.sub(r'  +', ' ', text)
        
        return text.strip()
    
    def _generate_smart_response(self, message: str) -> str:
        """Fallback: Smart response - instant, no API call"""
        
        message_lower = message.lower()
        
        # Quick keyword matching for common requests
        if any(word in message_lower for word in ["priorit", "urgent", "important", "focus"]):
            return "Focus on three priority levels: Do first (due today/critical), Schedule (this week), Delegate/Defer (later). Work on your top priority first."
        elif any(word in message_lower for word in ["productiv", "efficient", "concent"]):
            return "Use time blocking: Dedicate specific hours for different tasks. The Pomodoro technique works well - 25 minutes focused work, 5 minute break."
        elif any(word in message_lower for word in ["plan", "schedule", "organize", "day"]):
            return "Start with your 3 most important tasks for the day. Block time for deep work. Review progress at the end of day."
        elif any(word in message_lower for word in ["motivat", "stuck", "overwhelm", "help"]):
            return "Break big goals into smaller tasks. Celebrate small wins. Remember your why. Progress over perfection."
        elif any(word in message_lower for word in ["balance", "stress", "break", "relax"]):
            return "Set clear work hours and stick to them. Take real breaks without devices. Prioritize sleep, exercise, and time with family."
        elif any(word in message_lower for word in ["goal", "target", "achieve"]):
            return "Use SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound. Review and adjust monthly."
        elif any(word in message_lower for word in ["habit", "routine", "consist"]):
            return "Small consistent actions beat sporadic effort. Track your habits. Find your peak productivity hours and protect that time."
        else:
            return "Every task starts with clear next steps. Break work into manageable chunks. Review progress regularly and stay flexible with your approach."
    
    def reset_conversation(self):
        """Reset conversation"""
        pass


# Backwards compatibility
ClaudeAIAgent = GoogleAIAgent
