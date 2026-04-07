#!/usr/bin/env python
"""Test AI response formatting with multiple queries"""
import urllib.request
import json

test_queries = [
    "How should I organize my day?",
    "What's a good productivity tip?",
    "Help me with work-life balance",
    "Prioritize my tasks",
]

print("=" * 70)
print("AI RESPONSE FORMATTING TEST - MULTIPLE QUERIES")
print("=" * 70)

for query in test_queries:
    try:
        url = 'http://localhost:8001/api/ai-chat'
        data = json.dumps({'message': query}).encode()
        req = urllib.request.Request(
            url, 
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            response_text = result.get('assistant_response', 'No response')
            
            print(f"\n📝 Query: {query}")
            print(f"💬 Response: {response_text[:120]}...")
            
            # Check for markdown
            has_markdown = any(char in response_text for char in ['*', '_', '#', '**', '`'])
            status = "❌ Has markdown" if has_markdown else "✅ Clean"
            print(f"   Status: {status}")
            
    except Exception as e:
        print(f"\n❌ Error with query '{query}': {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE - All responses should show ✅ Clean")
print("=" * 70)
