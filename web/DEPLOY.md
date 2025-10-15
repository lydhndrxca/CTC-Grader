# Deployment Instructions

## Render.com (Recommended)

1. Install Render CLI:
```bash
npm install -g render
```

2. Login to Render:
```bash
render login
```

3. Deploy:
```bash
cd D:\Projects\CTC_Grading\web
render deploy
```

4. Set environment variable in Render dashboard:
   - OPENAI_API_KEY=msy_36LgKWbOX5WSxqIzvNkAyYW6Vbjl7nDgVgdf

5. Access at: https://ctc-grading.onrender.com

---

## Railway.app (Alternative)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Deploy:
```bash
cd D:\Projects\CTC_Grading\web
railway up
```

4. Set environment:
```bash
railway variables set OPENAI_API_KEY=msy_36LgKWbOX5WSxqIzvNkAyYW6Vbjl7nDgVgdf
```

5. Access at: https://<your-project>.up.railway.app

---

## Manual Git Deployment

1. Create GitHub repo
2. Push code:
```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin <your-repo-url>
git push -u origin main
```

3. Connect to Render/Railway via GitHub
4. Auto-deploy on push

