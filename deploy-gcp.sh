#!/bin/bash
# Google Cloud Deployment Script for GenAI Task Manager

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="genai-task-manager"
REGION="us-central1"
BACKEND_IMAGE="gcr.io/${PROJECT_ID}/genai-backend"
FRONTEND_BUCKET="gs://${PROJECT_ID}-frontend"

# Functions
echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."
    
    command -v gcloud >/dev/null 2>&1 || { echo_error "Google Cloud SDK is required. Install from https://cloud.google.com/sdk/docs/install"; exit 1; }
    command -v docker >/dev/null 2>&1 || { echo_error "Docker is required. Install from https://www.docker.com/products/docker-desktop"; exit 1; }
    
    echo_success "All prerequisites installed"
}

# Set up GCP project
setup_gcp_project() {
    echo_info "Setting up GCP project..."
    
    gcloud config set project ${PROJECT_ID}
    
    echo_info "Enabling required APIs..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        container.googleapis.com \
        containerregistry.googleapis.com \
        storage-api.googleapis.com \
        cloudsql.googleapis.com \
        cloudresourcemanager.googleapis.com
    
    echo_success "GCP project configured"
}

# Authenticate with GCP
authenticate_gcp() {
    echo_info "Authenticating with Google Cloud..."
    
    gcloud auth login
    gcloud auth application-default login
    gcloud auth configure-docker
    
    echo_success "GCP authentication successful"
}

# Create storage bucket
create_storage_bucket() {
    echo_info "Creating Cloud Storage bucket for frontend..."
    
    if gsutil ls -b ${FRONTEND_BUCKET} >/dev/null 2>&1; then
        echo_warning "Bucket ${FRONTEND_BUCKET} already exists"
    else
        gsutil mb ${FRONTEND_BUCKET}
        echo_success "Cloud Storage bucket created"
    fi
}

# Build backend Docker image
build_backend() {
    echo_info "Building backend Docker image..."
    
    docker build -f backend/Dockerfile.prod -t ${BACKEND_IMAGE}:latest -t ${BACKEND_IMAGE}:$(date +%s) .
    
    echo_success "Backend Docker image built"
}

# Push backend image to GCR
push_backend() {
    echo_info "Pushing backend image to Google Container Registry..."
    
    docker push ${BACKEND_IMAGE}:latest
    
    echo_success "Backend image pushed to GCR"
}

# Deploy backend to Cloud Run
deploy_backend() {
    echo_info "Deploying backend to Cloud Run..."
    
    gcloud run deploy genai-backend \
        --image ${BACKEND_IMAGE}:latest \
        --platform managed \
        --region ${REGION} \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 2 \
        --timeout 120 \
        --max-instances 100 \
        --quiet
    
    BACKEND_URL=$(gcloud run services describe genai-backend --region ${REGION} --format='value(status.url)')
    echo_success "Backend deployed to Cloud Run"
    echo_success "Backend URL: ${BACKEND_URL}"
}

# Upload frontend to Cloud Storage
deploy_frontend() {
    echo_info "Uploading frontend to Cloud Storage..."
    
    gsutil -m cp -r frontend/* ${FRONTEND_BUCKET}/
    
    echo_success "Frontend uploaded to Cloud Storage"
}

# Configure bucket for website serving
configure_bucket() {
    echo_info "Configuring bucket for website serving..."
    
    gsutil web set -m index.html -e 404.html ${FRONTEND_BUCKET}
    
    # Make files publicly readable
    gsutil -m acl ch -u AllUsers:R ${FRONTEND_BUCKET}/index.html
    gsutil -m acl ch -u AllUsers:R ${FRONTEND_BUCKET}/app.js
    
    FRONTEND_URL="https://storage.googleapis.com/${PROJECT_ID}-frontend/index.html"
    echo_success "Bucket configured for website serving"
    echo_success "Frontend URL: ${FRONTEND_URL}"
}

# Update frontend with backend URL
update_frontend_config() {
    echo_info "Updating frontend configuration..."
    
    BACKEND_URL=$(gcloud run services describe genai-backend --region ${REGION} --format='value(status.url)')
    
    # Create temporary config file
    sed "s|http://localhost:8001|${BACKEND_URL}|g" frontend/app.js > frontend/app.js.tmp
    mv frontend/app.js.tmp frontend/app.js
    
    # Upload updated file
    gsutil cp frontend/app.js ${FRONTEND_BUCKET}/app.js
    
    echo_success "Frontend configuration updated with backend URL"
}

# Display deployment summary
display_summary() {
    echo ""
    echo_success "========================================="
    echo_success "Deployment Complete!"
    echo_success "========================================="
    echo ""
    
    BACKEND_URL=$(gcloud run services describe genai-backend --region ${REGION} --format='value(status.url)')
    FRONTEND_URL="https://storage.googleapis.com/${PROJECT_ID}-frontend/index.html"
    
    echo -e "${GREEN}Backend URL:${NC} ${BACKEND_URL}"
    echo -e "${GREEN}Frontend URL:${NC} ${FRONTEND_URL}"
    echo ""
    echo "Deployment details:"
    echo "  - Backend: Cloud Run (${REGION})"
    echo "  - Frontend: Cloud Storage + CDN (Optional)"
    echo "  - Database: Cloud SQL (Recommended for production)"
    echo ""
    echo "Next steps:"
    echo "  1. Test the application at: ${FRONTEND_URL}"
    echo "  2. Configure custom domain (optional)"
    echo "  3. Set up monitoring and alerts"
    echo "  4. Configure Cloud SQL for production database"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    echo_success "GenAI Task Manager - Google Cloud Deployment"
    echo ""
    
    check_prerequisites
    echo_warning "Make sure you have a Google Cloud account and have configured gcloud CLI"
    read -p "Do you want to continue? (yes/no) " -n 3 -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo_error "Deployment cancelled"
        exit 1
    fi
    
    authenticate_gcp
    setup_gcp_project
    create_storage_bucket
    build_backend
    push_backend
    deploy_backend
    deploy_frontend
    configure_bucket
    update_frontend_config
    display_summary
}

# Run main function
main "$@"
