# GenAI Task Manager - Google Cloud Deployment Guide

## 📋 Table of Contents
1. [Quick Start](#-quick-start)
2. [Prerequisites](#-prerequisites)
3. [Deployment Options](#-deployment-options)
4. [Step-by-Step Guide](#-step-by-step-guide)
5. [Monitoring & Maintenance](#-monitoring--maintenance)
6. [Troubleshooting](#-troubleshooting)
7. [Cost Optimization](#-cost-optimization)

---

## 🚀 Quick Start

**For fastest deployment (5-10 minutes):**

### Windows (PowerShell):
```powershell
cd "c:\Users\91969\OneDrive\Desktop\GenAIProject"
.\deploy-gcp.ps1
```

### Linux/Mac (Bash):
```bash
cd ~/Desktop/GenAIProject
bash deploy-gcp.sh
```

✅ **The script handles everything automatically!**

---

## ✅ Prerequisites

### 1. **Google Cloud Account**
   - Sign up at [console.cloud.google.com](https://console.cloud.google.com)
   - Add billing method (you get $300 free credit)
   - Create a new project

### 2. **Google Cloud SDK**
   - Install from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
   - Verify: `gcloud --version`

### 3. **Docker Desktop**
   - Install from [docker.com](https://www.docker.com/products/docker-desktop)
   - Verify: `docker --version`

### 4. **Git** (Optional but recommended)
   - Install from [git-scm.com](https://git-scm.com)

---

## 🎯 Deployment Options

### Option 1: **Cloud Run** (Recommended ⭐)
- **Best for**: Serverless, auto-scaling backend
- **Cost**: Pay per request + compute
- **Pros**: 
  - No infrastructure management
  - Auto-scales to zero
  - Perfect for variable traffic
  - Includes free tier
- **Cons**: Cold starts (minor)
- **Setup time**: 5-10 minutes

### Option 2: **App Engine (Standard)**
- **Best for**: Fully managed platform
- **Cost**: Instance hours
- **Pros**:
  - Familiar deployment model
  - Built-in monitoring
  - Easy rollback
- **Cons**: 
  - No zero-scaling
  - Minimum instances required
- **Setup time**: 5 minutes

### Option 3: **Kubernetes Engine (GKE)**
- **Best for**: Complex deployments, multiple services
- **Cost**: Compute resources
- **Pros**:
  - Maximum control
  - Orchestration
  - Scaling policies
- **Cons**:
  - More complex
  - Higher minimum cost
  - Requires K8s knowledge
- **Setup time**: 15-20 minutes

### Option 4: **Compute Engine (VMs)**
- **Best for**: Custom setups, legacy apps
- **Cost**: Per VM instance
- **Pros**:
  - Full control
  - SSH access
  - Custom software
- **Cons**:
  - Manual management
  - Higher cost
  - Your responsibility to patch
- **Setup time**: 20-30 minutes

**✅ RECOMMENDED: Cloud Run (Options 1)**

---

## 📍 Step-by-Step Guide

### Phase 1: Preparation (5 minutes)

#### 1.1 Clone/Download Project
```bash
# If using Git
git clone https://github.com/your-username/genai-project
cd genai-project

# Or use existing project
cd c:\Users\91969\OneDrive\Desktop\GenAIProject
```

#### 1.2 Verify Project Structure
```bash
# Should see:
# - backend/           (FastAPI application)
# - frontend/          (React SPA)
# - docker-compose.yml
# - Dockerfile
# - requirements.txt
# - deploy-gcp.ps1     (Windows) or deploy-gcp.sh (Linux/Mac)
```

#### 1.3 Configure Google Cloud
```bash
# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project genai-task-manager

# Enable APIs
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    storage-api.googleapis.com
```

---

### Phase 2: Automated Deployment (10 minutes)

#### 2.1 Run Deployment Script

**Windows:**
```powershell
.\deploy-gcp.ps1
# Follow the prompts
# Script automatically:
# - Builds Docker image
# - Pushes to Google Container Registry
# - Creates Cloud Storage bucket
# - Deploys frontend and backend
# - Configures CDN
```

**Linux/Mac:**
```bash
bash deploy-gcp.sh
# Follow the prompts
```

#### 2.2 Wait for Completion
The script will display:
```
[SUCCESS] Deployment Complete!
Backend URL: https://genai-backend-xxxx.run.app
Frontend URL: https://storage.googleapis.com/genai-task-manager-frontend/index.html
```

---

### Phase 3: Verification (5 minutes)

#### 3.1 Test Backend
```bash
# Get the backend URL
BACKEND_URL=$(gcloud run services describe genai-backend --region us-central1 --format='value(status.url)')

# Test health endpoint
curl $BACKEND_URL/

# Expected response:
# {
#   "name": "Multi-Agent AI System",
#   "version": "1.0.0",
#   "status": "running"
# }
```

#### 3.2 Test Frontend
Open in browser:
```
https://storage.googleapis.com/genai-task-manager-frontend/index.html
```

Should see your application running!

#### 3.3 View Logs
```bash
# Real-time logs
gcloud alpha run services logs read genai-backend --region us-central1 --follow

# Last 50 log entries
gcloud run services logs read genai-backend --region us-central1 --limit 50
```

---

### Phase 4: Production Setup (Optional, 15-30 minutes)

#### 4.1 Setup PostgreSQL Database
```bash
# Create Cloud SQL instance
gcloud sql instances create genai-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1 \
  --backup-start-time 03:00

# Create database
gcloud sql databases create genai_db --instance=genai-db

# Create user
gcloud sql users create genai_user --instance=genai-db --password=secure_password

# Get connection details
gcloud sql instances describe genai-db
```

#### 4.2 Update Backend Environment
```bash
# Get the connection name from above command output
# Format: project-id:region:instance-name

gcloud run services update genai-backend \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://genai_user:password@/genai_db?unix_socket=/cloudsql/PROJECT_ID:us-central1:genai-db
```

#### 4.3 Enable Monitoring
```bash
# View metrics in Google Cloud Console
# 1. Go to https://console.cloud.google.com
# 2. Select your project
# 3. Go to Cloud Run → Services → genai-backend
# 4. Click "Logs" tab to see recent logs
```

---

## 📊 Monitoring & Maintenance

### View Dashboard
```bash
# Open Google Cloud Console
gcloud console run --region us-central1
# Or visit: https://console.cloud.google.com
```

### Monitor Performance
```bash
# View resource usage
gcloud run services describe genai-backend \
  --region us-central1 \
  --format='value(status)'

# View recent revisions
gcloud run revisions list \
  --service genai-backend \
  --region us-central1
```

### Update Code (After Making Changes)
```bash
# Rebuild and redeploy
.\deploy-gcp.ps1

# Or manually:
docker build -f backend/Dockerfile.prod -t gcr.io/genai-task-manager/genai-backend:latest .
docker push gcr.io/genai-task-manager/genai-backend:latest
gcloud run deploy genai-backend --image gcr.io/genai-task-manager/genai-backend:latest --region us-central1
```

### Rollback to Previous Version
```bash
# List revisions
gcloud run revisions list --service genai-backend --region us-central1

# Route traffic to previous revision
gcloud run services update-traffic genai-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

---

## 🔍 Troubleshooting

### "gcloud command not found"
```bash
# Install or add to PATH
# Windows: Reinstall Google Cloud SDK
# Mac: brew install --cask google-cloud-sdk
# Linux: curl https://sdk.cloud.google.com | bash
```

### "Docker daemon not running"
- Start Docker Desktop application
- Verify: `docker ps`

### "Build fails with permission denied"
```bash
# Authenticate with Docker
gcloud auth configure-docker

# Try again
docker push gcr.io/genai-task-manager/genai-backend:latest
```

### "Cloud Run deployment times out"
```bash
# Check build status
gcloud builds log LATEST --region us-central1

# Increase timeout in deploy script (usually not needed)
```

### "Frontend can't connect to backend"
```bash
# Verify backend URL in frontend/app.js
# Should match Cloud Run service URL

# Check CORS settings
gcloud run services describe genai-backend --region us-central1

# Ensure --allow-unauthenticated flag was used
```

### "Database connection fails"
```bash
# Verify Cloud SQL instance exists
gcloud sql instances list

# Check connection string format
gcloud sql instances describe genai-db

# Test from Cloud Run
gcloud run exec genai-backend --region us-central1
psql "postgresql://genai_user:password@/genai_db?unix_socket=/cloudsql/PROJECT_ID:us-central1:genai-db"
```

---

## 💰 Cost Optimization

### Reduce Costs
```bash
# Scale down max instances
gcloud run services update genai-backend \
  --max-instances 5 \
  --region us-central1

# Reduce memory/CPU
gcloud run services update genai-backend \
  --memory 512Mi \
  --cpu 1 \
  --region us-central1

# Use Cloud Storage lifecycle for old files
gsutil lifecycle set lifecycle.json gs://genai-task-manager-frontend/
```

### Monitor Costs
```bash
# View cost breakdown
gcloud billing accounts list

# Setup budget alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="GenAI Monthly Budget" \
  --budget-amount=50 \
  --threshold-rule=percent=50,percent=90,percent=100
```

### Estimated Monthly Costs
```
Scenario 1 (Low Traffic):
- Cloud Run: ~$5
- Cloud Storage: ~$0.5
- Database: ~$0 (free tier)
Total: ~$5.50/month ✅

Scenario 2 (Medium Traffic):
- Cloud Run: ~$20
- Cloud Storage: ~$2
- Database: ~$10
Total: ~$32/month ✅

Scenario 3 (High Traffic):
- Cloud Run: ~$100
- Cloud Storage: ~$10
- Database: ~$30
Total: ~$140/month ✅

(All within reasonable limits with free tier benefits)
```

---

## 🔐 Security Best Practices

### Secure Your Deployment
```bash
# 1. Never commit .env with real credentials
# Use .env.example as template
# Only commit .env.example

# 2. Set secure environment variables
gcloud run services update genai-backend \
  --set-env-vars GOOGLE_API_KEY=****** \
  --region us-central1 \
  --clear-key=DEBUG

# 3. Enable IAM policies
gcloud run services add-iam-policy-binding genai-backend \
  --member=allUsers \
  --role=roles/run.invoker \
  --region us-central1

# 4. Update app.yaml with security headers
# (Already configured in provided app.yaml)

# 5. Enable Cloud Armor (DDoS protection)
gcloud compute security-policies create genai-policy \
  --description="GenAI App Security"
```

---

## 📚 Additional Resources

- **Complete Documentation**: See `GOOGLE_CLOUD_DEPLOYMENT.md`
- **Quick Reference**: See `DEPLOY_QUICKSTART.md`
- **API Documentation**: http://localhost:8001/docs (when running locally)

---

## 🎯 Next Steps After Deployment

1. ✅ Configure custom domain (optional)
   ```bash
   gcloud run domain-mappings create \
     --service genai-backend \
     --domain api.yourdomain.com \
     --region us-central1
   ```

2. ✅ Set up CI/CD pipeline
   - Connect GitHub repo to Cloud Build
   - Auto-deploy on push to main branch

3. ✅ Enable monitoring alerts
   - High error rate notifications
   - Performance degradation alerts

4. ✅ Configure backups
   - Database backups (automated)
   - Application state backups

5. ✅ Performance optimization
   - Add caching headers
   - Optimize images
   - Enable compression

---

## 🎉 Congratulations!

Your GenAI Task Manager is now **live on Google Cloud!** 🚀

```
✅ Backend:  https://genai-backend-xxxx.run.app
✅ Frontend: https://storage.googleapis.com/genai-task-manager-frontend/
✅ Status:   🟢 PRODUCTION READY
```

---

## 📞 Support

- Google Cloud: https://cloud.google.com/support
- Cloud Run Docs: https://cloud.google.com/run/docs
- FastAPI Help: https://fastapi.tiangolo.com/
- Project Issues: Check project repository

---

**Last Updated**: March 31, 2026

**Version**: 1.0.0
