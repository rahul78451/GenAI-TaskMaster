#!/bin/bash
echo "Starting Multi-Agent AI System..."
echo ""

# Start backend
echo "Step 1: Starting Backend (FastAPI)"
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &
BACKEND_PID=$!
echo "Backend started on http://localhost:8000 (PID: $BACKEND_PID)"
echo ""

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Step 2: Starting Frontend"
cd ../frontend
python -m http.server 3000 &
FRONTEND_PID=$!
echo "Frontend started on http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Both services are running!"
echo "Press Ctrl+C to stop"
echo ""

# Keep script running
wait
