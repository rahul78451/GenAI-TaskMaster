# Google Cloud Deployment Script for GenAI Task Manager (Windows PowerShell)

# Configuration
$PROJECT_ID = "genai-task-manager"
$REGION = "us-central1"
$BACKEND_IMAGE = "gcr.io/$PROJECT_ID/genai-backend"
$FRONTEND_BUCKET = "gs://$PROJECT_ID-frontend"

# Color output functions
function Write-Info {
    Write-Host "[INFO] $args" -ForegroundColor Blue
}

function Write-Success {
    Write-Host "[SUCCESS] $args" -ForegroundColor Green
}

function Write-Warning {
    Write-Host "[WARNING] $args" -ForegroundColor Yellow
}

function Write-Error {
    Write-Host "[ERROR] $args" -ForegroundColor Red
}

# Check prerequisites
function Check-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    
    if (-not $gcloud) {
        Write-Error "Google Cloud SDK is required. Install from https://cloud.google.com/sdk/docs/install"
        exit 1
    }
    
    if (-not $docker) {
        Write-Error "Docker is required. Install from https://www.docker.com/products/docker-desktop"
        exit 1
    }
    
    Write-Success "All prerequisites installed"
}

# Set up GCP project
function Setup-GCPProject {
    Write-Info "Setting up GCP project..."
    
    gcloud config set project $PROJECT_ID
    
    Write-Info "Enabling required APIs..."
    gcloud services enable `
        cloudbuild.googleapis.com `
        run.googleapis.com `
        container.googleapis.com `
        containerregistry.googleapis.com `
        storage-api.googleapis.com `
        cloudsql.googleapis.com `
        cloudresourcemanager.googleapis.com
    
    Write-Success "GCP project configured"
}

# Authenticate with GCP
function Authenticate-GCP {
    Write-Info "Authenticating with Google Cloud..."
    
    gcloud auth login
    gcloud auth application-default login
    gcloud auth configure-docker
    
    Write-Success "GCP authentication successful"
}

# Create storage bucket
function Create-StorageBucket {
    Write-Info "Creating Cloud Storage bucket for frontend..."
    
    try {
        gsutil ls -b $FRONTEND_BUCKET | Out-Null
        Write-Warning "Bucket $FRONTEND_BUCKET already exists"
    }
    catch {
        gsutil mb $FRONTEND_BUCKET
        Write-Success "Cloud Storage bucket created"
    }
}

# Build backend Docker image
function Build-Backend {
    Write-Info "Building backend Docker image..."
    
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    docker build -f backend/Dockerfile.prod -t "$($BACKEND_IMAGE):latest" -t "$($BACKEND_IMAGE):$timestamp" .
    
    Write-Success "Backend Docker image built"
}

# Push backend image to GCR
function Push-Backend {
    Write-Info "Pushing backend image to Google Container Registry..."
    
    docker push "$($BACKEND_IMAGE):latest"
    
    Write-Success "Backend image pushed to GCR"
}

# Deploy backend to Cloud Run
function Deploy-Backend {
    Write-Info "Deploying backend to Cloud Run..."
    
    gcloud run deploy genai-backend `
        --image "$($BACKEND_IMAGE):latest" `
        --platform managed `
        --region $REGION `
        --allow-unauthenticated `
        --memory 1Gi `
        --cpu 2 `
        --timeout 120 `
        --max-instances 100 `
        --quiet
    
    $BACKEND_URL = gcloud run services describe genai-backend --region $REGION --format='value(status.url)'
    Write-Success "Backend deployed to Cloud Run"
    Write-Success "Backend URL: $BACKEND_URL"
    
    return $BACKEND_URL
}

# Upload frontend to Cloud Storage
function Deploy-Frontend {
    Write-Info "Uploading frontend to Cloud Storage..."
    
    gsutil -m cp -r "frontend/*" $FRONTEND_BUCKET
    
    Write-Success "Frontend uploaded to Cloud Storage"
}

# Configure bucket for website serving
function Configure-Bucket {
    Write-Info "Configuring bucket for website serving..."
    
    gsutil web set -m index.html -e 404.html $FRONTEND_BUCKET
    
    # Make files publicly readable
    gsutil -m acl ch -u AllUsers:R "$FRONTEND_BUCKET/index.html"
    gsutil -m acl ch -u AllUsers:R "$FRONTEND_BUCKET/app.js"
    
    $FRONTEND_URL = "https://storage.googleapis.com/$PROJECT_ID-frontend/index.html"
    Write-Success "Bucket configured for website serving"
    Write-Success "Frontend URL: $FRONTEND_URL"
    
    return $FRONTEND_URL
}

# Update frontend with backend URL
function Update-FrontendConfig {
    param(
        [string]$BackendURL
    )
    
    Write-Info "Updating frontend configuration..."
    
    $appJsPath = "frontend/app.js"
    
    # Read the file
    $content = Get-Content $appJsPath -Raw
    
    # Replace localhost with Cloud Run URL
    $content = $content -replace "http://localhost:8001", $BackendURL
    
    # Write back
    Set-Content $appJsPath $content
    
    # Upload updated file
    gsutil cp $appJsPath "$FRONTEND_BUCKET/app.js"
    
    Write-Success "Frontend configuration updated with backend URL"
}

# Display deployment summary
function Display-Summary {
    param(
        [string]$BackendURL,
        [string]$FrontendURL
    )
    
    Write-Host ""
    Write-Success "========================================="
    Write-Success "Deployment Complete!"
    Write-Success "========================================="
    Write-Host ""
    
    Write-Host "Backend URL: " -NoNewline -ForegroundColor Green
    Write-Host $BackendURL
    Write-Host "Frontend URL: " -NoNewline -ForegroundColor Green
    Write-Host $FrontendURL
    
    Write-Host ""
    Write-Host "Deployment details:"
    Write-Host "  - Backend: Cloud Run ($REGION)"
    Write-Host "  - Frontend: Cloud Storage + CDN (Optional)"
    Write-Host "  - Database: Cloud SQL (Recommended for production)"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Test the application at: $FrontendURL"
    Write-Host "  2. Configure custom domain (optional)"
    Write-Host "  3. Set up monitoring and alerts"
    Write-Host "  4. Configure Cloud SQL for production database"
    Write-Host ""
}

# Main deployment flow
function Start-Deployment {
    Write-Host ""
    Write-Success "GenAI Task Manager - Google Cloud Deployment (Windows)"
    Write-Host ""
    
    Check-Prerequisites
    Write-Warning "Make sure you have a Google Cloud account and have configured gcloud CLI"
    
    $response = Read-Host "Do you want to continue? (yes/no)"
    if ($response -ne "yes") {
        Write-Error "Deployment cancelled"
        exit 1
    }
    
    Authenticate-GCP
    Setup-GCPProject
    Create-StorageBucket
    Build-Backend
    Push-Backend
    
    $backendURL = Deploy-Backend
    Deploy-Frontend
    $frontendURL = Configure-Bucket
    Update-FrontendConfig -BackendURL $backendURL
    Display-Summary -BackendURL $backendURL -FrontendURL $frontendURL
}

# Run deployment
Start-Deployment
