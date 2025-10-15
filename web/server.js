import express from "express";
import fileUpload from "express-fileupload";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { MULTIVIEW_CONFIG as C } from "./lib/multiview-config.js";
import { saveSpecimenRecord, getAllSpecimens, getSpecimenById } from "./lib/database.js";
import { gradeSpecimen, classifyCTC } from "./lib/ai-grader.js";
import { generateReports, generateErrorReport } from "./lib/report-generator.js";
import { detectCTC } from "./lib/ctc-detector.js";
import { processUploadedImage, validateImageFile, isHEICFormat, validateSavedImage } from "./lib/image-processor.js";
import { validateImage } from "./lib/image-validator.js";
import fanRoutes from "./routes/fan.js";
import leaderboardRoutes from "./routes/leaderboard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());
app.use(fileUpload({ 
  limits: { fileSize: 20 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'temp'),
  debug: true
}));

// Mount fan routes
app.use('/api/fan', fanRoutes);

// Mount leaderboard routes
app.use('/api/leaderboard', leaderboardRoutes);

// serve submission.html + static assets from /web
app.use(express.static(__dirname));
// expose saved images and reports as static URLs
app.use('/specimens', express.static(C.specimensDir));
app.use('/reports', express.static(C.reportsDir));
app.use('/documents', express.static(path.join(C.root, 'Documents')));
app.use('/certificates', express.static(path.join(C.root, 'Documents', 'Certificates')));

// serve submission.html at root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "submission.html"));
});

// serve browse.html at /browse
app.get("/browse", (req, res) => {
  res.sendFile(path.join(__dirname, "browse.html"));
});

// serve about.html at /about
app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "about.html"));
});

// API: get current framework info
app.get("/api/framework", (req, res) => {
  res.json({
    name: C.activeFrameworkName,
    file: C.activeFrameworkFile,
    version: C.activeFrameworkVersion
  });
});

// Leaderboard endpoint (legacy - now handled by routes/leaderboard.js)
// Kept for backward compatibility
app.get("/api/leaderboard-legacy", (req, res) => {
  const db = new sqlite3.Database(path.join(C.root, 'Documents', 'ctc_grades.db'));
  
  db.all(`
    SELECT specimenId, grade, userTag, curvature, dateGraded, urlFront
    FROM specimens
    WHERE submissionType = 'VO' AND published = 1
    ORDER BY 
      CAST(SUBSTR(grade, 5, 4) AS REAL) DESC, 
      dateGraded DESC
    LIMIT 5
  `, [], (err, rows) => {
    if (err) {
      console.error('Leaderboard query error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ 
      success: true, 
      count: rows.length,
      leaderboard: rows 
    });
    
    db.close();
  });
});

// Debug endpoint to test server functionality
app.get("/api/debug", (req, res) => {
  const debugInfo = {
    status: "Server is running",
    timestamp: new Date().toISOString(),
    version: "2.0",
    features: {
      heicSupport: true,
      imageValidation: true,
      aiGrading: true,
      pdfReports: true,
      database: true,
      fanSubmissions: true,
      rateLimiting: true,
      moderation: true,
      leaderboard: true
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    paths: {
      specimensDir: C.specimensDir,
      reportsDir: C.reportsDir,
      standardsDir: C.standardsDir
    },
    dependencies: {
      express: "installed",
      heicConvert: "installed",
      sqlite3: "installed",
      pdfkit: "installed",
      openai: "installed"
    }
  };
  
  res.json(debugInfo);
});

// helpers
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };

// API: get next specimen id and create its folder
app.get("/api/nextSpecimen", (req, res) => {
  ensureDir(C.specimensDir);
  const entries = fs.readdirSync(C.specimensDir).filter(n => /^A-\d+$/.test(n));
  const nextNum = entries.length ? Math.max(...entries.map(n => parseInt(n.split("-")[1],10))) + 1 : 1;
  const specimenId = `A-${String(nextNum).padStart(2,"0")}`;
  ensureDir(path.join(C.specimensDir, specimenId));
  res.json({ specimenId });
});

// API: save uploaded photo as A-##_front.jpg or A-##_side.jpg
app.post("/api/savePhoto", async (req, res) => {
  try {
    const file = req.files?.photo;
    const specimenId = req.body?.specimenId;
    const label = req.body?.label; // "front" | "side"
    
    console.log('=== UPLOAD DEBUG ===');
    console.log('Has req.files?', !!req.files);
    console.log('req.files:', req.files);
    console.log('Has photo?', !!file);
    console.log('File details:', file ? {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
      tempFilePath: file.tempFilePath,
      hasData: !!file.data
    } : 'NO FILE');
    console.log('specimenId:', specimenId);
    console.log('label:', label);
    console.log('===================');
    
    if (!file || !specimenId || !label) {
      return res.status(400).json({ error: "Missing photo/specimenId/label" });
    }
    
    // Validate the uploaded file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const destDir = path.join(C.specimensDir, specimenId);
    ensureDir(destDir);
    
    // Determine the destination path (always save as .jpg)
    const dest = path.join(destDir, `${specimenId}_${label}.jpg`);
    
    // Process the image (convert HEIC if needed)
    const finalPath = await processUploadedImage(file, dest);
    
    res.json({ 
      ok: true, 
      path: finalPath,
      url: `/specimens/${specimenId}/${path.basename(finalPath)}`,
      originalFormat: file.name,
      converted: isHEICFormat(file)
    });
    
  } catch (error) {
    const errorDetails = logError(error, {
      endpoint: '/api/savePhoto',
      specimenId: req.body?.specimenId,
      label: req.body?.label,
      fileName: req.files?.photo?.name,
      fileSize: req.files?.photo?.size,
      fileType: req.files?.photo?.mimetype,
      requestBody: req.body,
      files: req.files
    });
    
    res.status(500).json({ 
      error: `Failed to save photo: ${error.message}`,
      fullError: errorDetails,
      timestamp: errorDetails.timestamp
    });
  }
});

// API: grade specimen with AI and generate reports
app.post("/api/grade", async (req, res) => {
  try {
    const { specimenId } = req.body || {};
    if (!specimenId) return res.status(400).json({ error: "Missing specimenId" });

    console.log(`Starting grading process for specimen ${specimenId}`);

    // Check if photos exist and validate formats
    const frontPath = path.join(C.specimensDir, specimenId, `${specimenId}_front.jpg`);
    const sidePath = path.join(C.specimensDir, specimenId, `${specimenId}_side.jpg`);

    // Validate front image
    const frontValidation = validateSavedImage(frontPath);
    if (!frontValidation.valid) {
      return res.status(400).json({
        error: true,
        message: `Front image: ${frontValidation.error}`,
        specimenId
      });
    }

    // Validate side image
    const sideValidation = validateSavedImage(sidePath);
    if (!sideValidation.valid) {
      return res.status(400).json({
        error: true,
        message: `Side image: ${sideValidation.error}`,
        specimenId
      });
    }

    // Perform image content validation (non-cereal detection)
    const contentValidationFront = await validateImage(frontPath);
    const contentValidationSide = await validateImage(sidePath);

    if (!contentValidationFront.valid || !contentValidationSide.valid) {
      const reason = contentValidationFront.reason || contentValidationSide.reason;
      const errorReport = await generateErrorReport({
        errorType: "Invalid Submission",
        reason: reason,
        specimenId: specimenId,
        frameworkVersion: C.activeFrameworkName,
        frontPath: frontPath,
        sidePath: sidePath
      });
      return res.status(400).json({
        status: "error",
        message: reason,
        recommendation: "Upload a front and side photo of a real Cinnamon Toast Crunch specimen under neutral light.",
        errorReportPath: errorReport.pdfPath
      });
    }

    // Run fast CTC detector (TFLite/Keras) before grading
    const detection = await detectCTC(frontPath, sidePath);
    
    // Only reject if detector explicitly says NOT CTC (isCTC = false)
    // Allow if detector bypassed (confidence = 1.0 or 0.5 with isCTC = true)
    if (detection.isCTC === false && detection.confidence > 0.80) {
      const reason = detection.reason || `Not a CTC specimen (confidence: ${(detection.confidence * 100).toFixed(1)}%)`;
      const errorReport = await generateErrorReport({
        errorType: "Non-CTC Image",
        reason: reason,
        specimenId: specimenId,
        frameworkVersion: C.activeFrameworkName,
        frontPath: frontPath,
        sidePath: sidePath
      });
      return res.status(400).json({
        status: "error",
        message: reason,
        recommendation: "Please upload images that clearly depict a single Cinnamon Toast Crunch piece.",
        detectorConfidence: detection.confidence ?? null,
        errorReportPath: errorReport.pdfPath
      });
    }

    // Perform CTC classification
    const ctcClassification = await classifyCTC(frontPath, sidePath);
    if (!ctcClassification.isCTC || ctcClassification.confidence < 0.75) {
      const reason = ctcClassification.reason || "Image does not appear to be a Cinnamon Toast Crunch piece.";
      const errorReport = await generateErrorReport({
        errorType: "Non-CTC Image",
        reason: reason,
        specimenId: specimenId,
        frameworkVersion: C.activeFrameworkName,
        frontPath: frontPath,
        sidePath: sidePath
      });
      return res.status(400).json({
        status: "error",
        message: reason,
        recommendation: "Please ensure both photos clearly show a single Cinnamon Toast Crunch specimen.",
        errorReportPath: errorReport.pdfPath
      });
    }

    // Use auto-detected framework from config
    const activeFrameworkFile = C.activeFrameworkFile || "Multiview_Grading_Standards_v1_6_StrictPlusPlus.pdf";
    const frameworkVersion = C.activeFrameworkVersion || "v1.6";

    // Perform AI grading
    console.log(`Calling AI grader for ${specimenId}`);
    let gradingResult;
    try {
      gradingResult = await gradeSpecimen(specimenId, frontPath, sidePath);
    } catch (aiError) {
      console.error('AI grading failed:', aiError);
      // Use fallback grading result
      gradingResult = {
        frameworkVersion: frameworkVersion,
        grade: "PSA 8.0 (NM)",
        subgrades: {
          geometry: 8.0,
          corners: 8.0,
          coating: 8.0,
          surface: 8.0,
          alignment: 8.0
        },
        notes: `AI grading failed: ${aiError.message}. Using fallback grade.`
      };
    }

    // Generate reports
    console.log(`Generating reports for ${specimenId}`);
    const reportData = {
      specimenId,
      frameworkVersion,
      grade: gradingResult.grade,
      subgrades: gradingResult.subgrades,
      notes: gradingResult.notes,
      frontPath,
      sidePath,
      verificationType: 'VO',
      issues: []
    };

    const reports = await generateReports(reportData);

    // Save to database
    const specimenData = {
      specimenId,
      frameworkVersion,
      frontPath: reports.specimenPdfPath.replace(C.root, ''),
      sidePath: reports.specimenPdfPath.replace(C.root, ''),
      grade: gradingResult.grade,
      subgrades: JSON.stringify(gradingResult.subgrades),
      notes: gradingResult.notes,
      pdfPath: reports.specimenPdfPath.replace(C.root, ''),
      dateGraded: new Date().toISOString(),
      systemHash: reports.systemHash,
      urlFront: `/specimens/${specimenId}/${path.basename(frontPath)}`,
      urlSide: `/specimens/${specimenId}/${path.basename(sidePath)}`
    };

    console.log(`Saving specimen ${specimenId} to database`);
    await saveSpecimenRecord(specimenData);

    // Return comprehensive result
    res.json({
      success: true,
      specimenId,
      frameworkVersion,
      grade: gradingResult.grade,
      subgrades: gradingResult.subgrades,
      notes: gradingResult.notes,
      reportPath: reports.pdfPath,
      markdownPath: reports.markdownPath,
      specimenReportPath: reports.specimenPdfPath,
      specimenMarkdownPath: reports.specimenMarkdownPath,
      reportJsonPath: reports.jsonPath,
      activeFramework: activeFrameworkFile,
      errorNotePath: reports.errorNotePath,
      urlFront: `/specimens/${specimenId}/${path.basename(frontPath)}`,
      urlSide: `/specimens/${specimenId}/${path.basename(sidePath)}`
    });

  } catch (error) {
    const errorDetails = logError(error, {
      specimenId: req.body?.specimenId,
      endpoint: '/api/grade',
      requestBody: req.body,
      files: req.files
    });
    
    res.status(500).json({ 
      error: "Grading failed", 
      details: error.message,
      specimenId: req.body?.specimenId,
      fullError: errorDetails,
      timestamp: errorDetails.timestamp
    });
  }
});

// Archive: list all specimens
app.get("/api/specimens", async (req, res) => {
  try {
    const { q } = req.query;
    let specimens = await getAllSpecimens();

    if (q) {
      const query = q.toLowerCase();
      specimens = specimens.filter(s => 
        s.specimenId.toLowerCase().includes(query) ||
        s.grade.toLowerCase().includes(query) ||
        s.frameworkVersion.toLowerCase().includes(query) ||
        s.notes.toLowerCase().includes(query)
      );
    }

    // Map paths to public URLs
    const mappedSpecimens = specimens.map(s => ({
      ...s,
      pdfPath: s.pdfPath ? `/reports/${path.basename(s.pdfPath)}` : `/specimens/${s.specimenId}/${s.specimenId}_CTC_Grading_Report.pdf`,
      urlFront: s.frontPath ? `/specimens/${s.specimenId}/${path.basename(s.frontPath)}` : `/specimens/${s.specimenId}/${s.specimenId}_front.jpg`,
      urlSide: s.sidePath ? `/specimens/${s.specimenId}/${path.basename(s.sidePath)}` : `/specimens/${s.specimenId}/${s.specimenId}_side.jpg`
    }));

    res.json({ success: true, specimens: mappedSpecimens, count: mappedSpecimens.length });
  } catch (e) {
    const errorDetails = logError(e, { endpoint: '/api/specimens', query: req.query });
    res.status(500).json({ error: 'Failed to list specimens', fullError: errorDetails });
  }
});

// Archive: list documents from Documents folder
app.get("/api/documents", (req, res) => {
  try {
    const docsRoot = path.join(C.root, 'Documents');
    const categories = ['Grading Standards', 'Errors', 'Misc', 'Process', 'Tests', 'Web App History'];
    const result = {};
    
    categories.forEach(cat => {
      const catPath = path.join(docsRoot, cat);
      if (fs.existsSync(catPath)) {
        const files = [];
        const scan = (dir, prefix = '') => {
          fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
            if (ent.isDirectory()) {
              scan(path.join(dir, ent.name), prefix + ent.name + '/');
            } else if (ent.name.endsWith('.pdf') || ent.name.endsWith('.txt')) {
              files.push({
                name: prefix + ent.name,
                url: `/documents/${encodeURIComponent(cat)}/${encodeURIComponent(prefix + ent.name)}`,
                type: ent.name.endsWith('.pdf') ? 'PDF' : 'TXT'
              });
            }
          });
        };
        scan(catPath);
        result[cat] = files;
      }
    });
    
    res.json({ success: true, documents: result });
  } catch (e) {
    const errorDetails = logError(e, { endpoint: '/api/documents' });
    res.status(500).json({ error: 'Failed to list documents', fullError: errorDetails });
  }
});

// Archive: single specimen by specimenId
app.get("/api/specimens/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await getSpecimenById(id);
    if (!r) return res.status(404).json({ error: 'Not found', specimenId: id });
    const mapped = {
      ...r,
      pdfPath: r.pdfPath ? `/reports/${path.basename(r.pdfPath)}` : `/specimens/${r.specimenId}/${r.specimenId}_CTC_Grading_Report.pdf`,
      urlFront: r.frontPath ? `/specimens/${r.specimenId}/${path.basename(r.frontPath)}` : `/specimens/${r.specimenId}/${r.specimenId}_front.jpg`,
      urlSide: r.sidePath ? `/specimens/${r.specimenId}/${path.basename(r.sidePath)}` : `/specimens/${r.specimenId}/${r.specimenId}_side.jpg`
    };
    res.json({ success: true, specimen: mapped });
  } catch (e) {
    const errorDetails = logError(e, { endpoint: '/api/specimens/:id', specimenId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve specimen', fullError: errorDetails });
  }
});

// API: serve generated reports
app.get("/api/reports/:filename", (req, res) => {
  const { filename } = req.params;
  const reportPath = path.join(C.reportsDir, filename);
  
  if (fs.existsSync(reportPath)) {
    res.sendFile(reportPath);
  } else {
    res.status(404).json({ error: "Report not found", filename });
  }
});

// Enhanced error logging
function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    message: error.message,
    stack: error.stack,
    context,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  console.error('=== FULL ERROR DETAILS ===');
  console.error(JSON.stringify(errorDetails, null, 2));
  console.error('=== END ERROR DETAILS ===');
  
  return errorDetails;
}

// Error handling middleware
app.use((err, req, res, next) => {
  const errorDetails = logError(err, {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    files: req.files
  });
  
  res.status(500).json({ 
    error: "Internal server error", 
    details: err.message,
    fullError: errorDetails,
    timestamp: errorDetails.timestamp
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiview CTC Grader v2.0 running → http://localhost:${PORT}`);
  console.log(`Database: ${path.join(C.root, 'Documents', 'ctc_grades.db')}`);
  console.log(`Reports: ${C.reportsDir}`);
  console.log(`Specimens: ${C.specimensDir}`);
});