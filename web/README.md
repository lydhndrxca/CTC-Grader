# 🔬 Multiview CTC Grader - Ready to Run!

## ✅ **Setup Complete!**

Your Multiview CTC Grading web project is **fully configured and ready to run**.

## 🚀 **Quick Start (2 Commands)**

Since Node.js v22.20.0 is already installed on your system, you just need to:

### **1. Install Dependencies**
Open **Command Prompt** (not PowerShell) and run:
```cmd
cd D:\Projects\CTC_Grading\web
npm install
```

### **2. Start the Web App**
```cmd
npm start
```

Then open: **http://localhost:3000**

## 🎯 **Alternative: One-Click Setup**

For the easiest setup, just double-click:
- **`install-and-start.bat`** - Installs dependencies and starts the server
- **`check-setup.bat`** - Verifies everything is ready

## 📱 **How to Use**

### **Guided Photo Capture Flow:**
1. **Start** → Generates specimen ID (A-01, A-02, A-03...)
2. **Take FRONT Photo** → Uses device camera
3. **Take SIDE Photo** → Shows curvature  
4. **Submit for Grading** → Returns dummy grade (PSA 8.5 NM+)

### **Features:**
- **Mobile Friendly**: Works on phones with camera access
- **Automatic Organization**: Photos saved to `Specimens/A-##/` folders
- **Framework Display**: Shows "Multiview Grading Standards v1.5 (Strict++)"
- **Incremental IDs**: Sequential specimen numbering

## 🔧 **Technical Details**

### **Project Structure:**
```
D:\Projects\CTC_Grading\
├── Documents\
│   ├── Grading Standards\     # Ready for v1.5 PDF
│   └── Reports\              # For generated reports
├── Specimens\                # Photo storage
└── web\
    ├── submission.html       # Guided capture UI
    ├── server.js            # Express backend
    ├── package.json         # Dependencies
    └── lib\
        └── multiview-config.js  # Configuration
```

### **API Endpoints:**
- `GET /api/nextSpecimen` - Generate next specimen ID
- `POST /api/savePhoto` - Save uploaded photos
- `POST /api/grade` - Return dummy grade

### **File Organization:**
- **Photos**: `Specimens/A-##/A-##_front.jpg` and `A-##_side.jpg`
- **Reports**: `Documents/Reports/` (ready for future PDF generation)
- **Standards**: `Documents/Grading Standards/` (ready for v1.5 PDF)

## 🎉 **Ready to Use!**

Your Multiview CTC Grader is **complete and ready**:

✅ **Node.js v22.20.0** - Installed and working  
✅ **Complete Project Structure** - All folders created  
✅ **All Required Files** - submission.html, server.js, package.json, config  
✅ **Dependencies Ready** - express, express-fileupload  
✅ **Guided Capture Interface** - Front/side photo workflow  
✅ **Automatic Organization** - Specimen folders and photo storage  
✅ **Framework Integration** - Ready for v1.5 standards  

**Just run `npm install` and `npm start` to begin!** 🔬✨

## 🆘 **Troubleshooting**

### **Use Command Prompt (not PowerShell)**
- Node.js works in Command Prompt
- If npm isn't found in PowerShell, use Command Prompt instead

### **Port 3000 already in use**
- Change port: `set PORT=3001 && npm start`
- Or stop other services using port 3000

### **Camera not working**
- Use HTTPS in production
- Ensure browser has camera permissions
- Try Chrome browser

---

**Built with ❤️ by Multiview Technology** 🥣