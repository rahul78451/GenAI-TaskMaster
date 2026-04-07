#!/usr/bin/env python
"""Quick test to verify schedule creation works"""
import subprocess
import time
import sys
import os

os.chdir(r"c:\Users\91969\OneDrive\Desktop\GenAIProject\backend")

print("Starting backend server...")
proc = subprocess.Popen([sys.executable, "main.py"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

# Wait for server to start
time.sleep(5)

# Check if still running
if proc.poll() is None:
    print("✓ Backend started successfully on port 8000")
    print("\nNow you can test schedule creation in the browser:")
    print("1. Go to http://localhost:3000")
    print("2. Click 'Schedule' tab")
    print("3. Click '➕ New Event'")
    print("4. Fill in event details")
    print("5. Click 'Create Event'")
else:
    # Process died, show error
    output, _ = proc.communicate()
    print("✗ Backend failed to start:")
    print(output)
