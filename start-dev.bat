@echo off
echo Starting Multi-Agent AI System...
echo.
echo Step 1: Starting Backend (FastAPI)
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
start cmd /k python main.py
echo Backend started on http://localhost:8000
echo.
echo Step 2: Starting Frontend
cd ..
cd frontend
start cmd /k python -m http.server 3000
echo Frontend started on http://localhost:3000
echo.
echo Both services are running!
echo.
pause
