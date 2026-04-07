#!/bin/bash

# Cleanup script to remove unnecessary files from the project
# Run this script from the project root directory: bash cleanup.sh

echo "Cleaning up unnecessary files..." 

# Files to remove
files_to_remove=(
    # Frontend backups and test files
    "frontend/app_backup_20260331_163200.js"
    "frontend/app_backup_old.js"
    "frontend/app_backup_simple.js"
    "frontend/debug.html"
    "frontend/diagnostic.html"
    "frontend/test-simple.html"
    "frontend/test.html"
    "frontend/tempCodeRunnerFile.js"
    
    # Backend test files
    "backend/test_ai_multiple.py"
    "backend/test_ai_response.py"
    "backend/test_models.py"
    "backend/test_schedule_create.py"
    "backend/test_setup.py"
    
    # Database files
    "app.db"
    "backend/app.db"
    
    # Documentation files (not needed for deployment)
    "00_DELIVERY_SUMMARY.md"
    "DELIVERY_COMPLETE.txt"
    "HACKATHON_SUBMISSION.md"
    "IMPLEMENTATION_SUMMARY.md"
    "PROJECT_COMPLETION_SUMMARY.md"
    "PROJECT_MANIFEST.md"
    "AI_ASSISTANT_VOICE_CHAT.md"
    "VOICE_CHAT_QUICKSTART.md"
)

# Directories to remove
dirs_to_remove=(
    "backend/__pycache__"
    "backend/venv"
)

# Remove files
for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "✓ Removed: $file"
    fi
done

# Remove directories
for dir in "${dirs_to_remove[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "✓ Removed: $dir"
    fi
done

echo ""
echo "Cleanup complete! Project is now ready for deployment."
echo ""
echo "Remaining essential files:"
echo "- frontend/ (app.js, index.html, package.json)"
echo "- backend/ (main.py, requirements.txt, app/, Dockerfile)"
echo "- docker-compose.yml"
echo "- .gitignore"
echo "- README.md, QUICKSTART.md, etc."
