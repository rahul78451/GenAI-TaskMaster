# Google Cloud Deployment - Quick Start Guide

## 🚀 5-Minute Quick Deploy

### Step 1: Install Prerequisites (One-time)
```bash
# Install Google Cloud SDK from https://cloud.google.com/sdk/docs/install
# Make sure Docker Desktop is installed and running
```

### Step 2: Create Google Cloud Account
- Visit [console.cloud.google.com](https://console.cloud.google.com)
- Create new project named `genai-task-manager`
- Copy your Project ID

### Step 3: Run Automated Deployment Script

**For Windows (PowerShell):**
```powershell
cd "c:\Users\91969\OneDrive\Desktop\GenAIProject"
.\deploy-gcp.ps1
```

**For Linux/Mac (Bash):**
```bash
cd ~/Desktop/GenAIProject
bash deploy-gcp.sh
```

The script will automatically:
- ✅ Authenticate with Google Cloud
- ✅ Enable required APIs
- ✅ Build Docker image
- ✅ Deploy backend to Cloud Run
- ✅ Upload frontend to Cloud Storage
- ✅ Configure and optimize resources
- ✅ Display your live URLs

**Deployment time: ~10-15 minutes**

---

## 📌 What Gets Deployed

### Backend (Cloud Run)
- **Service**: `genai-backend`
- **URL**: `https://genai-backend-xxxx.run.app`
- **Features**:
  - Auto-scaling (0-100 instances)
  - Load balancing
  - HTTPS enabled
  - Health checks

### Frontend (Cloud Storage + CDN)
- **Bucket**: `gs://genai-task-manager-frontend/`
- **URL**: `https://storage.googleapis.com/genai-task-manager-frontend/index.html`
- **Features**:
  - Global CDN distribution
  - Fast content delivery
  - Automatic caching

---

## 💰 Estimated Costs

**Monthly estimates** (for typical usage):
```
Cloud Run:      $0.20 per 1M requests + compute
Cloud Storage:  $0.02 per GB stored
Total:          $15-50/month (depending on traffic)

Always within Google Cloud free tier for small projects!
```

---

## 🔍 After Deployment

### Verify Everything Works
```bash
# Test backend
curl https://genai-backend-xxxx.run.app/

# View frontend
Open https://storage.googleapis.com/genai-task-manager-frontend/index.html
```

### Monitor Performance
```bash
# View logs
gcloud run services logs read genai-backend --region us-central1 --limit 50

# Get service details
gcloud run services describe genai-backend --region us-central1
```

### Access Dashboard
```bash
# View in Google Cloud Console
gcloud run services describe genai-backend --region us-central1 --format='value(status.url)'
```

---

## ⚙️ Manual Setup (If Script Fails)

If the automated script doesn't work, follow these manual steps:

### 1. Authenticate
```bash
gcloud auth login
gcloud config set project genai-task-manager
gcloud auth configure-docker
```

### 2. Build & Deploy Backend
```bash
cd c:\Users\91969\OneDrive\Desktop\GenAIProject

# Build image
docker build -f backend/Dockerfile.prod -t gcr.io/genai-task-manager/genai-backend:latest .

# Push to Google Container Registry
docker push gcr.io/genai-task-manager/genai-backend:latest

# Deploy to Cloud Run
gcloud run deploy genai-backend \
  --image gcr.io/genai-task-manager/genai-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 120
```

### 3. Deploy Frontend
```bash
# Create storage bucket
gsutil mb gs://genai-task-manager-frontend/

# Upload files
gsutil -m cp -r frontend/* gs://genai-task-manager-frontend/

# Make public
gsutil web set -m index.html -e 404.html gs://genai-task-manager-frontend/
```

---

## 🛠️ Troubleshooting

### Problem: "gcloud command not found"
**Solution**: Install Google Cloud SDK from https://cloud.google.com/sdk/docs/install

### Problem: "Docker daemon not running"
**Solution**: Start Docker Desktop application

### Problem: "Authentication failed"
**Solution**: 
```bash
gcloud auth login
gcloud auth application-default login
```

### Problem: "Quota exceeded"
**Solution**: 
- Check API quotas in Google Cloud Console
- Request quota increases if needed

### Problem: "Cloud Run deployment fails"
**Solution**: Check logs
```bash
gcloud builds log LATEST
gcloud run services describe genai-backend --region us-central1
```

---

## 📊 Next Steps (Optional)

### 1. Add Custom Domain
```bash
gcloud run domain-mappings create \
  --service=genai-backend \
  --domain=api.yourdomain.com \
  --region=us-central1
```

### 2. Setup Production Database
```bash
# Create Cloud SQL instance
gcloud sql instances create genai-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1
```

### 3. Enable Monitoring
- Visit: [Google Cloud Console](https://console.cloud.google.com)
- Go to: Monitoring → Dashboards
- Create alerts for error rates and latency

### 4. Setup Backups
```bash
gcloud sql backups create \
  --instance=genai-db \
  --description="Daily backup"
```

### 5. Configure CI/CD
- Connect github repository to Cloud Build
- Automatic deployments on git push

---

## 📚 Useful Commands

```bash
# View all deployments
gcloud run services list --region us-central1

# View logs in real-time
gcloud alpha run services logs read genai-backend --region us-central1 --follow

# Update environment variables
gcloud run services update genai-backend \
  --region us-central1 \
  --set-env-vars KEY=VALUE

# Scale down to save costs
gcloud run services update genai-backend \
  --region us-central1 \
  --max-instances 1

# Delete deployment (be careful!)
gcloud run services delete genai-backend --region us-central1
```

---

## 🎯 Key Features After Deployment

✅ **App is live** at `https://storage.googleapis.com/genai-task-manager-frontend/`  
✅ **Backend API** at `https://genai-backend-xxxx.run.app`  
✅ **Auto-scaling** - handles traffic automatically  
✅ **Global CDN** - fast loading worldwide  
✅ **HTTPS enabled** - secure by default  
✅ **Monitoring included** - view logs and metrics  
✅ **Cost-effective** - pay only for what you use  

---

## 📞 Support & Resources

- **Google Cloud Documentation**: https://cloud.google.com/docs
- **Cloud Run Guide**: https://cloud.google.com/run/docs
- **Cloud Storage Guide**: https://cloud.google.com/storage/docs
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Troubleshooting Docs**: https://cloud.google.com/run/docs/troubleshooting

---

## 🎉 Deployment Complete!

Your GenAI Task Manager is now running on Google Cloud Platform!

```
Frontend: https://storage.googleapis.com/genai-task-manager-frontend/
Backend:  https://genai-backend-xxxx.run.app
Status:   🟢 LIVE AND RUNNING
```

**Congratulations! Your app is production-ready.** 🚀
