# Quick rebuild and redeploy script

# Configuration
$PROJECT_ID = "thermal-rain-459618-t5"
$REGION = "us-central1"
$BACKEND_IMAGE = "gcr.io/$PROJECT_ID/genai-backend"

Write-Host "[INFO] Rebuilding backend Docker image..." -ForegroundColor Blue

# Build backend Docker image
docker build -f backend/Dockerfile.prod -t "$($BACKEND_IMAGE):latest" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to build Docker image" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Backend Docker image built" -ForegroundColor Green

Write-Host "[INFO] Pushing backend image to Google Container Registry..." -ForegroundColor Blue

docker push "$($BACKEND_IMAGE):latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to push Docker image" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Backend image pushed to GCR" -ForegroundColor Green

Write-Host "[INFO] Deploying backend to Cloud Run..." -ForegroundColor Blue

gcloud run deploy genai-backend `
    --image "$($BACKEND_IMAGE):latest" `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 2 `
    --timeout 120 `
    --max-instances 10 `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to deploy to Cloud Run" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Backend deployed to Cloud Run" -ForegroundColor Green

# Get the backend URL
$BACKEND_URL = gcloud run services describe genai-backend --region $REGION --format='value(status.url)'
Write-Host "[SUCCESS] Backend URL: $BACKEND_URL" -ForegroundColor Green

Write-Host ""
Write-Host "[INFO] Testing backend health..." -ForegroundColor Blue
Start-Sleep -Seconds 5

$response = curl -s "$BACKEND_URL/health"
Write-Host "Health check response: $response"

Write-Host ""
Write-Host "[SUCCESS] Deployment completed!" -ForegroundColor Green
