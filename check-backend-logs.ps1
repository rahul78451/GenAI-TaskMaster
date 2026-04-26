# Diagnostic and Fix Script for Backend Issues

Write-Host "[INFO] Checking backend service status..." -ForegroundColor Blue

# Check Cloud Run service status
$PROJECT_ID = "thermal-rain-459618-t5"
$SERVICE_NAME = "genai-backend"

Write-Host "[INFO] Getting service details..." -ForegroundColor Blue
gcloud run services describe $SERVICE_NAME --region us-central1 --project $PROJECT_ID

Write-Host ""
Write-Host "[INFO] Getting recent logs..." -ForegroundColor Blue
gcloud run services logs read $SERVICE_NAME --region us-central1 --project $PROJECT_ID --limit 50

Write-Host ""
Write-Host "[INFO] Testing backend health endpoint..." -ForegroundColor Blue
$response = curl -s "https://genai-backend-3ludjxqvpa-uc.a.run.app/health" 2>&1
Write-Host $response
