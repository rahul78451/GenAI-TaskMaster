# Quick fix script to deploy frontend and configure bucket

# Configuration
$PROJECT_ID = "thermal-rain-459618-t5"
$FRONTEND_BUCKET = "gs://$PROJECT_ID-frontend"

Write-Host "[INFO] Fixing frontend deployment..." -ForegroundColor Blue

# Step 1: Create bucket if it doesn't exist
Write-Host "[INFO] Creating Cloud Storage bucket..." -ForegroundColor Blue
gsutil mb $FRONTEND_BUCKET 2>&1 | ForEach-Object {
    if ($_ -notmatch "already exists") {
        Write-Host $_ -ForegroundColor Yellow
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Bucket created or already exists" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Bucket creation returned exit code $LASTEXITCODE" -ForegroundColor Yellow
}

# Step 2: Upload frontend files
Write-Host "[INFO] Uploading frontend files..." -ForegroundColor Blue
gsutil -m cp -r "frontend/*" $FRONTEND_BUCKET
if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Frontend files uploaded" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to upload frontend files" -ForegroundColor Red
    exit 1
}

# Step 3: Configure bucket for website serving
Write-Host "[INFO] Configuring bucket for website serving..." -ForegroundColor Blue
gsutil web set -m index.html -e 404.html $FRONTEND_BUCKET
if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Bucket configured for website" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Bucket web configuration may have failed" -ForegroundColor Yellow
}

# Step 4: Make files publicly readable
Write-Host "[INFO] Setting public read permissions..." -ForegroundColor Blue
gsutil -m acl ch -u AllUsers:R "$FRONTEND_BUCKET/index.html"
gsutil -m acl ch -u AllUsers:R "$FRONTEND_BUCKET/app.js"

# Step 5: Update frontend config with backend URL
Write-Host "[INFO] Updating frontend configuration..." -ForegroundColor Blue
$BACKEND_URL = "https://genai-backend-3ludjxqvpa-uc.a.run.app"
$appJsPath = "frontend/app.js"

$content = Get-Content $appJsPath -Raw
$content = $content -replace "http://localhost:8080", $BACKEND_URL
Set-Content $appJsPath $content

# Upload updated app.js
gsutil cp $appJsPath "$FRONTEND_BUCKET/app.js"

Write-Host ""
Write-Host "[SUCCESS] =========================================" -ForegroundColor Green
Write-Host "[SUCCESS] Frontend Deployment Fixed!" -ForegroundColor Green
Write-Host "[SUCCESS] =========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend URL: https://storage.googleapis.com/$PROJECT_ID-frontend/index.html"
Write-Host ""
Write-Host "Your application should now be accessible!"
