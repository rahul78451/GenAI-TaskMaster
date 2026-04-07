# Google Cloud Deployment Guide

## Prerequisites

1. **Google Cloud Account** - Create at [console.cloud.google.com](https://console.cloud.google.com)
2. **Google Cloud SDK** - Install from [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install)
3. **Docker** - Install Docker Desktop
4. **Git** - Initialize git repository

## Step 1: Create Google Cloud Project

### 1.1 Create a new GCP Project
```bash
gcloud projects create genai-task-manager --name="GenAI Task Manager"
gcloud config set project genai-task-manager
```

### 1.2 Enable Required APIs
```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    container.googleapis.com \
    containerregistry.googleapis.com \
    storage-api.googleapis.com \
    cloudsql.googleapis.com \
    cloudresourcemanager.googleapis.com
```

### 1.3 Create a Cloud Storage Bucket (for frontend)
```bash
gsutil mb gs://genai-task-manager-frontend/
```

## Step 2: Configure Environment Variables

### 2.1 Create `.env.gcp` file
```bash
# Backend configuration for GCP
DATABASE_URL=postgresql://user:password@cloud-sql-instance:5432/genai_db
DEBUG=False
GOOGLE_API_KEY=your_google_api_key_here
GCP_PROJECT_ID=genai-task-manager
```

## Step 3: Deploy Backend to Cloud Run

### 3.1 Build and Push Docker Image

```bash
# Authenticate with GCP
gcloud auth login
gcloud auth application-default login

# Configure Docker for GCP
gcloud auth configure-docker

# Navigate to project root
cd c:\Users\91969\OneDrive\Desktop\GenAIProject

# Build Docker image
docker build -f backend/Dockerfile.prod -t gcr.io/genai-task-manager/genai-backend:latest .

# Push to Google Container Registry
docker push gcr.io/genai-task-manager/genai-backend:latest
```

### 3.2 Deploy to Cloud Run

```bash
gcloud run deploy genai-backend \
  --image gcr.io/genai-task-manager/genai-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_key_here,DEBUG=False \
  --memory 1Gi \
  --cpu 2 \
  --timeout 120 \
  --max-instances 100
```

### 3.3 Retrieve Backend URL
```bash
gcloud run services describe genai-backend --region us-central1 --format='value(status.url)'
```

## Step 4: Deploy Frontend to Cloud Storage + CDN

### 4.1 Upload Frontend Files
```bash
gsutil -m cp -r frontend/* gs://genai-task-manager-frontend/
```

### 4.2 Set Public Access
```bash
gsutil iam ch serviceAccount:service-account@genai-task-manager.iam.gserviceaccount.com:objectViewer gs://genai-task-manager-frontend
gsutil acl ch -u AllUsers:R gs://genai-task-manager-frontend/index.html
gsutil -m acl ch -u AllUsers:R gs://genai-task-manager-frontend/app.js
```

### 4.3 Update app.js with Backend URL
Edit `frontend/app.js` and replace the backend URL:
```javascript
// Replace this line:
const API_BASE = 'http://localhost:8001/api';

// With your Cloud Run URL:
const API_BASE = 'https://genai-backend-xxxxxxxxxxxx.run.app/api';
```

Then re-upload:
```bash
gsutil cp frontend/app.js gs://genai-task-manager-frontend/app.js
```

### 4.4 Enable Website Serving
```bash
gsutil web set -m index.html -e 404.html gs://genai-task-manager-frontend/
```

### 4.5 Create Cloud CDN Load Balancer (Optional but Recommended)

```bash
# Create backend bucket
gcloud compute backend-buckets create genai-frontend-backend \
  --gcs-uri-prefix=gs://genai-task-manager-frontend \
  --enable-cdn

# Create URL map
gcloud compute url-maps create genai-frontend \
  --default-service=genai-frontend-backend

# Create HTTPS proxy
gcloud compute target-https-proxies create genai-frontend-https \
  --url-map=genai-frontend

# Reserve external IP
gcloud compute addresses create genai-frontend-ip --global

# Create forwarding rule
gcloud compute forwarding-rules create genai-frontend-https \
  --global \
  --target-https-proxy=genai-frontend-https \
  --address=genai-frontend-ip \
  --ports=443
```

## Step 5: Database Setup

### 5.1 Create Cloud SQL Instance (PostgreSQL)

```bash
gcloud sql instances create genai-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1 \
  --availability-type ZONAL \
  --backup-start-time 03:00
```

### 5.2 Create Database and User

```bash
gcloud sql databases create genai_db --instance=genai-db

gcloud sql users create genai_user --instance=genai-db --password=strong_password

# Update DATABASE_URL in Cloud Run environment
gcloud run services update genai-backend \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://genai_user:strong_password@/genai_db?unix_socket=/cloudsql/PROJECT_ID:us-central1:genai-db
```

## Step 6: Verify Deployment

### 6.1 Test Backend
```bash
# Get the Cloud Run URL
BACKEND_URL=$(gcloud run services describe genai-backend --region us-central1 --format='value(status.url)')

# Test health endpoint
curl $BACKEND_URL/

# Test API
curl $BACKEND_URL/api/schedule
```

### 6.2 Test Frontend
Visit your Cloud Storage website:
```
https://storage.googleapis.com/genai-task-manager-frontend/index.html
```

Or if using Cloud CDN:
```
https://YOUR_EXTERNAL_IP/index.html
```

## Step 7: Monitor and Logs

### 7.1 View Logs
```bash
# Backend logs
gcloud run services logs read genai-backend --region us-central1 --limit 50

# Real-time logs
gcloud alpha run services logs read genai-backend --region us-central1 --follow
```

### 7.2 Set Up Monitoring
```bash
# View Cloud Run metrics
gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.yaml
```

### 7.3 Set Up Alerts
```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Cloud Run High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5
```

## Step 8: Set Up Custom Domain (Optional)

### 8.1 Map Domain to Cloud Run
```bash
gcloud domains registrations configure dns \
  --location=global \
  --dns-settings-from-file=dns-config.yaml \
  genai-task-manager.com
```

### 8.2 Add Custom Domain to Cloud Run
```bash
gcloud run domain-mappings create \
  --service=genai-backend \
  --domain=api.genai-task-manager.com \
  --region=us-central1
```

## Step 9: Cost Optimization

### 9.1 Set Up Budget Alerts
```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="GenAI Monthly Budget" \
  --budget-amount=100 \
  --threshold-rule=percent=50,percent=90,percent=100
```

### 9.2 Configure Auto-scaling
- Cloud Run automatically scales based on traffic
- Adjust `--max-instances` in deploy command to control costs
- Use `--cpu=1` and `--memory=512Mi` for cost reduction (if performance allows)

## Step 10: CI/CD Pipeline (Optional)

### 10.1 Connect GitHub Repository
```bash
gcloud builds connect github \
  --repository-owner=your-username \
  --repository-name=genai-project
```

### 10.2 Create Cloud Build Trigger
```bash
gcloud builds triggers create github \
  --name=genai-deploy \
  --repo-name=genai-project \
  --repo-owner=your-username \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml
```

## Troubleshooting

### Issue: Build Fails
```bash
# Check build logs
gcloud builds log BUILD_ID

# View detailed error
gcloud builds describe BUILD_ID
```

### Issue: Cloud Run Service Unavailable
```bash
# Check service status
gcloud run services describe genai-backend --region us-central1

# View recent revisions
gcloud run revisions list --service=genai-backend --region us-central1
```

### Issue: Database Connection Error
```bash
# Verify instance
gcloud sql instances describe genai-db

# Test connection
gcloud sql databases get genai_db
```

## Rollback Deployment

### Rollback to Previous Version
```bash
# List revisions
gcloud run revisions list --service=genai-backend

# Route traffic to previous revision
gcloud run services update-traffic genai-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domain
3. Enable HTTPS/SSL certificates
4. Set up automated backups for database
5. Implement logging and error tracking (Cloud Logging, Error Reporting)
6. Configure rate limiting and DDoS protection (Cloud Armor)

## Useful Commands Reference

```bash
# Deployment status
gcloud run services describe genai-backend --region us-central1

# Update environment variables
gcloud run services update genai-backend \
  --region us-central1 \
  --set-env-vars KEY=VALUE

# Scale down to save costs
gcloud run services update genai-backend \
  --region us-central1 \
  --max-instances 1

# Delete deployment
gcloud run services delete genai-backend --region us-central1
```

## Cost Estimation

**Monthly Costs (Approximate):**
- Cloud Run: $0.20 per 1M requests + $0.00002400 per GB-second
- Cloud SQL (db-f1-micro): ~$10-15/month
- Cloud Storage: ~$0.02 per GB stored
- Cloud CDN: $0.085 per GB cached (after free tier)

**Total Estimated: $20-50/month** for small to medium usage
