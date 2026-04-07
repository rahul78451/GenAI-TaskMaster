# AI Integration Guide - Claude AI Setup

## Overview
Your application now has **real Claude AI** integrated for:
- **AI Suggestions** - Personalized task recommendations
- **Workflow Automation** - AI-powered task execution  
- **AI Assistant** - Chat-based task management help
- **Productivity Analysis** - Intelligence insights about your work patterns

---

## Step 1: Get Your Anthropic API Key

### Option A: Get Free API Key (Recommended for Testing)
1. Go to: https://console.anthropic.com/
2. Sign up with email
3. Get **$5 free credits** (enough to test extensively)
4. Copy your API key from the dashboard

### Option B: Use Existing API Key
If you already have an Anthropic account, use your existing API key.

---

## Step 2: Configure API Key in Backend

Edit the `.env` file in the backend folder:

```
# .env file location:
c:\Users\91969\OneDrive\Desktop\GenAIProject\backend\.env

# Change this:
ANTHROPIC_API_KEY=your-api-key-here

# To this (paste your actual key):
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Restart the backend** after updating:
```powershell
# In PowerShell:
cd c:\Users\91969\OneDrive\Desktop\GenAIProject\backend
python main.py
```

---

## Step 3: Understanding the AI Features

### **1. AI Suggestions Endpoint** (`GET /api/suggestions`)
**What it does:** Analyzes your tasks and generates personalized suggestions

**How it works:**
- Frontend calls: `http://localhost:8000/api/suggestions`
- Claude AI analyzes your task data
- Returns 3-5 specific, actionable suggestions

**Example Response:**
```json
{
  "suggestions": [
    {
      "id": 1,
      "type": "Productivity",
      "title": "🎯 Focus on High Priority First",
      "description": "You have 3 high-priority tasks due today. Complete these before medium-priority items to maximize impact.",
      "icon": "🔴",
      "priority": "high"
    },
    {
      "id": 2,
      "type": "Health",
      "title": "💪 Add a Break",
      "description": "You've worked 3 hours straight. Take a 5-minute break to refresh and maintain focus.",
      "icon": "☕",
      "priority": "medium"
    }
  ],
  "ai_powered": true,
  "timestamp": "2026-03-31T12:30:00"
}
```

### **2. Productivity Analysis** (`GET /api/productivity-analysis`)
**What it does:** Deep analysis of your productivity patterns

**Response includes:**
- Overall assessment of productivity
- Strengths (what you're doing well)
- Areas for improvement
- Daily tip
- Weekly goal

---

### **3. AI Chat / Assistant** (`POST /api/ai-chat`)
**What it does:** Multi-turn conversation with Claude about tasks

**How to use:**
```javascript
// Frontend code
fetch('http://localhost:8000/api/ai-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I have 10 tasks today, what should I prioritize?"
  })
})
.then(res => res.json())
.then(data => console.log(data.assistant_response))
```

**Example conversation:**
```
User: "I have 5 pending tasks and 2 high-priority ones due today. What should I do?"

AI: "Based on your task list, here's what I recommend:

1. **First (30 mins)**: Complete the 2 high-priority tasks
   - They're due today and impact your other work
   
2. **Second (45 mins)**: Work on the 3 medium-priority tasks
   - These won't be urgent but should be done this week
   
3. **Break (15 mins)**: Take a proper break - you've earned it

This approach ensures you handle urgent items first while maintaining momentum on other work. Would you like help organizing these into time blocks?"
```

---

## Step 4: Frontend Integration Examples

### Add AI Suggestions to Your Frontend

In [frontend/app.js](frontend/app.js), update your AI Assistant section:

```javascript
// Add this to your AI Assistant component
async function loadAISuggestions() {
    try {
        const response = await fetch('http://localhost:8000/api/suggestions');
        const data = await response.json();
        
        if (data.suggestions.length > 0) {
            displaySuggestions(data.suggestions);
        }
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

function displaySuggestions(suggestions) {
    // Display each suggestion as a card
    suggestions.forEach(suggestion => {
        const card = document.createElement('div');
        card.innerHTML = `
            <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <h4>${suggestion.icon} ${suggestion.title}</h4>
                <p>${suggestion.description}</p>
            </div>
        `;
        document.getElementById('suggestions-container').appendChild(card);
    });
}
```

### Add AI Chat Input

```javascript
// AI Chat component
async function sendChatMessage(message) {
    const response = await fetch('http://localhost:8000/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    return data.assistant_response;
}
```

---

## Step 5: Behind the Scenes Architecture

### **Backend AI Components:**

```
backend/app/agents/
├── ai_agent.py          ← NEW: Claude AI agents
│   ├── ClaudeAIAgent    ← Suggestions & analysis
│   └── ConversationalAIAgent ← Chat/conversation
├── coordinator.py       ← Orchestrates workflows
└── __init__.py
```

### **How Claude Processes Requests:**

1. **User Action** → Frontend sends request to backend
2. **Data Collection** → Backend gathers task, schedule, notes data
3. **Context Building** → Creates detailed context for Claude
4. **Claude Processing** → Sends to Claude API with instructions
5. **Response Generation** → Claude returns intelligent suggestions
6. **Formatting** → Backend formats response for frontend
7. **Display** → Frontend shows beautiful suggestions

---

## Step 6: API Endpoints Reference

### All AI Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/suggestions` | GET | Get AI suggestions |
| `/api/productivity-analysis` | GET | Get productivity insights |
| `/api/ai-chat` | POST | Chat with AI assistant |
| `/api/workflow` | POST | Execute AI workflow |

### Request Examples:

**1. Get Suggestions**
```
GET http://localhost:8000/api/suggestions
```

**2. Get Productivity Analysis**
```
GET http://localhost:8000/api/productivity-analysis
```

**3. Chat with AI**
```
POST http://localhost:8000/api/ai-chat
Content-Type: application/json

{
  "message": "Help me prioritize my tasks"
}
```

---

## Step 7: Troubleshooting

### "AI not configured" message?
- ✅ Add API key to `.env` file
- ✅ Restart backend with `python main.py`
- ✅ Check `.env` format (no spaces around `=`)

### No suggestions showing?
- ✅ Add some tasks to your database first
- ✅ Check browser console (F12) for errors
- ✅ Verify backend is running: `http://localhost:8000/health`

### API key not working?
- ✅ Verify key is correct in console.anthropic.com
- ✅ Check for trailing spaces in `.env`
- ✅ Ensure key starts with `sk-ant-`

### Getting rate limited?
- ✅ Add more credit to your Anthropic account
- ✅ Wait a few hours before retrying
- ✅ Use batch requests for multiple suggestions

---

## Step 8: Cost Estimation

### Anthropic Claude Pricing (very affordable):
- **$0.003** per 1K input tokens
- **$0.015** per 1K output tokens

### Real-world costs:
- Generating 1 suggestion: ~$0.001
- AI chat message: ~$0.002
- Productivity analysis: ~$0.003

**Your $5 free credit covers:**
- ✅ 1,000+ suggestions
- ✅ 1,000+ chat messages
- ✅ Weeks of testing

---

## Step 9: Customizing AI Behavior

### Modify Claude Instructions (Optional)

In [backend/app/agents/ai_agent.py](backend/app/agents/ai_agent.py), find the `generate_ai_suggestions()` method:

```python
# Line ~70 - Change the system prompt
prompt = f"""Analyze this user's task and productivity data and generate 3-5 specific, actionable suggestions:

USER DATA:
{json.dumps(context, indent=2)}

Generate suggestions in JSON format...
"""

# You can customize:
# - Number of suggestions: "3-5" → "5-10"
# - Types: Add "Health", "Social", "Learning" suggestions
# - Focus: Change from general to specific (e.g., "code quality tips")
```

---

## Next Steps

1. **✅ Add API key to `.env`**
2. **✅ Restart backend**
3. **✅ Test at:** `http://localhost:3000`
4. **✅ Check suggestions load with AI badge**
5. **✅ Try the AI chat feature**
6. **✅ Monitor usage in Anthropic dashboard**

---

## Questions?

- **Anthropic Docs**: https://docs.anthropic.com
- **API Reference**: https://docs.anthropic.com/en/api
- **Status Page**: https://status.anthropic.com

Your AI is now ready to make your task management smarter! 🚀
