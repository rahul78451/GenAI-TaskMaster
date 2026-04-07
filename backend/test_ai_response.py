#!/usr/bin/env python
"""Test AI response formatting"""
import urllib.request
import json

try:
    # Test the AI chat endpoint
    url = 'http://localhost:8001/api/ai-chat'
    data = json.dumps({'message': 'How do I prioritize my tasks?'}).encode()
    req = urllib.request.Request(
        url, 
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    with urllib.request.urlopen(req, timeout=10) as response:
        result = json.loads(response.read().decode())
        response_text = result.get('assistant_response', 'No response')
        
        print("=" * 60)
        print("AI RESPONSE TEST")
        print("=" * 60)
        print(f"\nResponse:\n{response_text}\n")
        
        # Check for problematic characters
        issues = []
        if '**' in response_text:
            issues.append("❌ Contains ** (bold markdown)")
        if '*' in response_text:
            issues.append("❌ Contains * (asterisks)")
        if '_' in response_text:
            issues.append("❌ Contains _ (underscores)")
        if '#' in response_text and response_text.startswith('#'):
            issues.append("❌ Contains # (heading markdown)")
        
        if issues:
            print("ISSUES FOUND:")
            for issue in issues:
                print(f"  {issue}")
        else:
            print("✅ Response is clean - no markdown formatting found!")
        
        print("\n" + "=" * 60)

except Exception as e:
    print(f"Error: {e}")
