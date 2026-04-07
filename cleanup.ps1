# Cleanup script to remove unnecessary files from the project
# Run this script from the project root directory

Write-Host "Cleaning up unnecessary files..." -ForegroundColor Green

# Files to remove
$filesToRemove = @(
    # Frontend backups and test files
    "frontend/app_backup_20260331_163200.js",
    "frontend/app_backup_old.js",
    "frontend/app_backup_simple.js",
    "frontend/debug.html",
    "frontend/diagnostic.html",
    "frontend/test-simple.html",
    "frontend/test.html",
    "frontend/tempCodeRunnerFile.js",
    
    # Backend test files
    "backend/test_ai_multiple.py",
    "backend/test_ai_response.py",
    "backend/test_models.py",
    "backend/test_schedule_create.py",
    "backend/test_setup.py",
    
    # Database files
    "app.db",
    "backend/app.db",
    
    # Documentation files (not needed for deployment)
    "00_DELIVERY_SUMMARY.md",
    "DELIVERY_COMPLETE.txt",
    "HACKATHON_SUBMISSION.md",
    "IMPLEMENTATION_SUMMARY.md",
    "PROJECT_COMPLETION_SUMMARY.md",
    "PROJECT_MANIFEST.md",
    "AI_ASSISTANT_VOICE_CHAT.md",
    "VOICE_CHAT_QUICKSTART.md"
)

# Directories to remove
$dirsToRemove = @(
    "backend/__pycache__",
    "backend/venv"
)

# Remove files
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "✓ Removed: $file" -ForegroundColor Cyan
    }
}

# Remove directories
foreach ($dir in $dirsToRemove) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "✓ Removed: $dir" -ForegroundColor Cyan
    }
}

Write-Host "`nCleanup complete! Project is now ready for deployment." -ForegroundColor Green
Write-Host "`nRemaining essential files:" -ForegroundColor Yellow
Write-Host "- frontend/ (app.js, index.html, package.json)"
Write-Host "- backend/ (main.py, requirements.txt, app/, Dockerfile)"
Write-Host "- docker-compose.yml"
Write-Host "- .gitignore"
Write-Host "- README.md, QUICKSTART.md, etc."
