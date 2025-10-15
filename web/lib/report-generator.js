import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate Markdown report content
async function generateMarkdownReport(specimenData) {
  const { specimenId, frameworkVersion, grade, subgrades, notes, frontPath, sidePath, verificationType, issues } = specimenData;
  const timestamp = new Date().toISOString();

  // derive or default extended analytics
  const framework = frameworkVersion || 'v1.5 Strict++';
  const weightedMean = specimenData.weightedMean ?? computeWeightedMean(subgrades);
  const curvature = specimenData.curvature ?? estimateCurvatureFromGeometry(subgrades?.geometry);
  const finalGrade = grade;
  const aiConfidence = specimenData.aiConfidence ?? 0.945;
  const provenance = specimenData.provenance ?? 'Source box and batch not recorded.';
  const measurements = specimenData.measurements ?? 'not recorded';
  const weight = specimenData.weight ?? 'not recorded';

  // 0) Try to render from master template if available
  try {
    const templatePath = path.join(C.root, 'web', 'src', 'templates', 'multiview_grading_report_template.md');
    if (fs.existsSync(templatePath)) {
      const tpl = fs.readFileSync(templatePath, 'utf8');
      const pad = (n)=> (n==null||Number.isNaN(n)) ? '' : n;
      const d = new Date();
      const vars = {
        specimen_id: specimenId,
        cert_id: specimenData.certificationId || '',
        classification: (verificationType||'VO'),
        framework,
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString(),
        dimensions: specimenData.dimensions || measurements,
        weight: weight,
        condition_summary: notes || 'No summary provided.',
        front_image_path: frontPath || '',
        side_image_path: sidePath || '',
        back_image_path: specimenData.backPath || '',
        corners_score: pad(subgrades?.corners),
        corners_notes: '—',
        edges_score: pad(subgrades?.alignment ?? subgrades?.edges),
        edges_notes: '—',
        surface_score: pad(subgrades?.surface),
        surface_notes: '—',
        coating_score: pad(subgrades?.coating),
        coating_notes: '—',
        geometry_score: pad(subgrades?.geometry),
        geometry_notes: '—',
        curvature_percent: Number(curvature).toFixed(2),
        penalty_trigger: Number(curvature) > 7.5 ? 'Curvature cap ≤ 8.0' : 'None',
        ai_confidence: (Number(aiConfidence)*100).toFixed(1) + '%',
        weighted_mean: Number(weightedMean).toFixed(2),
        strict_mode_notes: Number(curvature) > 7.5 ? 'Strict++ curvature cap applied' : 'No strict adjustments beyond baseline',
        final_grade: (finalGrade||'').toString().replace(/[^\d.]+/, ''),
        grade_label: (finalGrade||'').split('(')[1]?.replace(')','') || '',
        analysis_paragraph: notes || '—',
        manufacturer: specimenData.manufacturer || '',
        box_code: specimenData.box_code || '',
        best_by: specimenData.best_by || '',
        capture_era: specimenData.capture_era || '',
        personal_note: specimenData.personal_note || ''
      };
      const rendered = renderTemplate(tpl, vars);

      // Append System Hash footer using same path-based context
      const hashInfo = await generateSystemHash({
        frontImage: frontPath,
        sideImage: sidePath,
        framework: framework,
        verificationType: verificationType || 'VO'
      }, rendered);

      return rendered + `\n---\n\n## System Hash & Provenance Record  \n**Multiview Digital Integrity Hash (SHA-256):** ${hashInfo.short}  \n*(Full hash stored in archive metadata)*  \n\n**Generated:** ${new Date().toISOString()}  \n**System:** Multiview CTC Grader v2.0 • Framework ${framework}  \n**Seed:** 42  \n**Verification Type:** ${verificationType || 'VO'}  \n\nThis cryptographic digest links the specimen’s imagery, analysis, and report into a single verifiable record.  \nTampering with any source file will invalidate the hash upon re-verification.  \nA complete copy of the digest is archived within Multiview’s internal ledger for future audit.  \n`;
    }
  } catch (e) {
    console.warn('Template render failed, using built-in report layout:', e.message);
  }
  
  let markdown = `# Multiview Official Grading Report

## Header / Identification
- **Specimen ID:** ${specimenId}
- **Date/Time:** ${timestamp}
- **Grading Framework:** ${frameworkVersion}
- **Verification:** ${verificationType || 'VO'}
- **Overall Grade:** ${grade}

## Photo Set Metadata
| View | File Path | Dimensions | Notes |
|------|-----------|------------|-------|
| Front | ${frontPath} | Auto-detected | Primary view for surface analysis |
| Side | ${sidePath} | Auto-detected | Curvature and edge analysis |

## Subgrade Breakdown
| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Geometry | ${subgrades.geometry || 'N/A'} | 30% | Overall shape and proportions |
| Corners | ${subgrades.corners || 'N/A'} | 20% | Corner radius and sharpness |
| Coating | ${subgrades.coating || 'N/A'} | 12% | Surface coating quality |
| Surface | ${subgrades.surface || 'N/A'} | 20% | Texture and finish |
| Alignment | ${subgrades.alignment || 'N/A'} | 18% | Edge alignment and symmetry |

**Weighted Mean:** ${Number(weightedMean).toFixed(2)}  
**Curvature %:** ${Number(curvature).toFixed(2)} (${getCurvatureBand(curvature)})  
**Overall Grade:** ${finalGrade}

## Detailed Interpretation
${notes || 'No additional notes provided.'}

## Issues / Exceptions
${(issues && issues.length) ? issues.map((i, idx) => `- [${idx+1}] ${i}`).join("\n") : 'None reported.'}

## Framework Application
This specimen was graded using ${frameworkVersion} standards, applying strict deductive grading principles with no rounding up and additive flaw penalties.

## Measurements & Weight
Length × Width × Thickness: ${measurements}  
Weight: ${weight}

${generateTechnicalBreakdown({
  subgrades,
  curvature: Number(curvature),
  weightedMean: Number(weightedMean),
  framework,
  aiConfidence: Number(aiConfidence),
  finalGrade
})}

## Report Generation
- **Generated:** ${timestamp}
- **System:** Multiview CTC Grader v2.0
- **Report Format:** Multiview Official Grading Report Format v1.2
 - **Verification Type:** ${verificationType || 'VO'}

---
*This report was generated automatically by the Multiview CTC Grading System.*
`;

  // Append System Hash & Provenance footer
  const hashInfo = await generateSystemHash({
    frontImage: frontPath,
    sideImage: sidePath,
    framework: framework,
    verificationType: verificationType || 'VO'
  }, markdown);

  markdown += `
---

## System Hash & Provenance Record  
**Multiview Digital Integrity Hash (SHA-256):** ${hashInfo.short}  
*(Full hash stored in archive metadata)*  

**Generated:** ${new Date().toISOString()}  
**System:** Multiview CTC Grader v2.0 • Framework ${framework}  
**Seed:** 42  
**Verification Type:** ${verificationType || 'VO'}  

This cryptographic digest links the specimen’s imagery, analysis, and report into a single verifiable record.  
Tampering with any source file will invalidate the hash upon re-verification.  
A complete copy of the digest is archived within Multiview’s internal ledger for future audit.  
`;

  return markdown;
}

// Generate PDF report from specimen data
export function generatePDFReport(specimenData, opts = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { specimenId } = specimenData;
      const reportPath = path.join(C.reportsDir, `${specimenId}_CTC_Grading_Report.pdf`);
      
      // Ensure reports directory exists
      if (!fs.existsSync(C.reportsDir)) {
        fs.mkdirSync(C.reportsDir, { recursive: true });
      }
      
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      // Pipe to file
      const stream = fs.createWriteStream(reportPath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text('Multiview Official Grading Report', { align: 'center' });
      
      doc.moveDown(2);
      
      // Specimen Information
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Specimen Information');
      
      doc.fontSize(12).font('Helvetica')
         .text(`Specimen ID: ${specimenData.specimenId}`)
         .text(`Date/Time: ${new Date().toISOString()}`)
         .text(`Grading Framework: ${specimenData.frameworkVersion}`)
         .text(`Verification: ${specimenData.verificationType || 'VO'}`)
         .text(`Overall Grade: ${specimenData.grade}`);
      
      doc.moveDown(1);
      
      // Subgrades Table
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Subgrade Breakdown');
      
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidth = 100;
      
      // Table headers
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Category', tableLeft, tableTop)
         .text('Score', tableLeft + colWidth, tableTop)
         .text('Weight', tableLeft + colWidth * 2, tableTop)
         .text('Notes', tableLeft + colWidth * 3, tableTop);
      
      // Table rows
      const subgrades = specimenData.subgrades || {};
      const categories = [
        { name: 'Geometry', key: 'geometry', weight: '30%' },
        { name: 'Corners', key: 'corners', weight: '20%' },
        { name: 'Coating', key: 'coating', weight: '12%' },
        { name: 'Surface', key: 'surface', weight: '20%' },
        { name: 'Alignment', key: 'alignment', weight: '18%' }
      ];
      
      let currentY = tableTop + 20;
      
      categories.forEach(category => {
        doc.fontSize(10).font('Helvetica')
           .text(category.name, tableLeft, currentY)
           .text(subgrades[category.key] || 'N/A', tableLeft + colWidth, currentY)
           .text(category.weight, tableLeft + colWidth * 2, currentY)
           .text('Auto-analyzed', tableLeft + colWidth * 3, currentY);
        currentY += 15;
      });
      
      doc.moveDown(2);
      
      // Notes Section
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Detailed Interpretation');
      
      doc.fontSize(12).font('Helvetica')
         .text(specimenData.notes || 'No additional notes provided.', {
           width: 500,
           align: 'justify'
         });
      
      doc.moveDown(2);
      
      // System Hash & Provenance Record (if available)
      const hashShort = opts?.hashInfo?.short || 'unavailable';
      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica-Bold').text('System Hash & Provenance Record');
      doc.fontSize(10).font('Helvetica')
         .text(`Multiview Digital Integrity Hash (SHA-256): ${hashShort}`)
         .text('(Full hash stored in archive metadata)')
         .moveDown(0.5)
         .text(`Generated: ${new Date().toISOString()}`)
         .text(`System: Multiview CTC Grader v2.0 • Framework ${specimenData.frameworkVersion}`)
         .text('Seed: 42')
         .text(`Verification Type: ${specimenData.verificationType || 'VO'}`)
         .moveDown(0.5)
         .text('This cryptographic digest links the specimen’s imagery, analysis, and report into a single verifiable record.')
         .text('Tampering with any source file will invalidate the hash upon re-verification.');

      // Footer
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica')
         .text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
         .text('Multiview CTC Grader v2.0 - Report Format v1.2', { align: 'center' })
         .text(`Verification Type: ${specimenData.verificationType || 'VO'}`, { align: 'center' });
      
      // Finalize PDF
      doc.end();
      
      stream.on('finish', () => {
        console.log(`PDF report generated: ${reportPath}`);
        resolve(reportPath);
      });
      
      stream.on('error', (err) => {
        console.error('Error writing PDF:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      reject(error);
    }
  });
}

// Generate both Markdown and PDF reports
export async function generateReports(specimenData) {
  try {
    // Ensure directories exist
    if (!fs.existsSync(C.reportsDir)) fs.mkdirSync(C.reportsDir, { recursive: true });
    if (!fs.existsSync(C.errorsDir)) fs.mkdirSync(C.errorsDir, { recursive: true });
    const specimenDir = path.join(C.specimensDir, specimenData.specimenId);
    if (!fs.existsSync(specimenDir)) fs.mkdirSync(specimenDir, { recursive: true });

    // Generate Markdown content
    const markdownContent = await generateMarkdownReport(specimenData);
    
    // Save Markdown file
    const markdownPath = path.join(C.reportsDir, `${specimenData.specimenId}_CTC_Grading_Report.md`);
    fs.writeFileSync(markdownPath, markdownContent);
    console.log(`Markdown report saved: ${markdownPath}`);
    
    // Generate PDF using enhanced 4-page layout
    const hashInfo = await generateSystemHash({
      frontImage: specimenData.frontPath,
      sideImage: specimenData.sidePath,
      framework: specimenData.frameworkVersion,
      verificationType: specimenData.verificationType || 'VO'
    }, markdownContent);
    const pdfPath = await generateEnhancedPDFReport(specimenData, { hashInfo, markdownContent });
    
    // Also save copies into the specimen folder
    const specimenMarkdownPath = path.join(specimenDir, `${specimenData.specimenId}_CTC_Grading_Report.md`);
    const specimenPdfPath = path.join(specimenDir, `${specimenData.specimenId}_CTC_Grading_Report.pdf`);
    
    // Copy files
    try {
      fs.copyFileSync(markdownPath, specimenMarkdownPath);
      fs.copyFileSync(pdfPath, specimenPdfPath);
    } catch (copyErr) {
      console.warn('Warning: could not copy report files to specimen folder:', copyErr);
    }
    
    // Save JSON record beside the report in specimen folder
    const jsonRecord = {
      specimenId: specimenData.specimenId,
      frameworkVersion: specimenData.frameworkVersion,
      verificationType: specimenData.verificationType || 'VO',
      grade: specimenData.grade,
      subgrades: specimenData.subgrades,
      notes: specimenData.notes,
      images: {
        front: specimenData.frontPath,
        side: specimenData.sidePath
      },
      paths: {
        reportPdfMain: pdfPath,
        reportMarkdownMain: markdownPath,
        reportPdfSpecimen: specimenPdfPath,
        reportMarkdownSpecimen: specimenMarkdownPath
      },
      generatedAt: new Date().toISOString(),
      reportFormat: 'v1.2',
      systemHash: hashInfo.full
    };
    const jsonPath = path.join(specimenDir, `${specimenData.specimenId}_CTC_Grading_Report.json`);
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(jsonRecord, null, 2));
      console.log(`JSON report saved: ${jsonPath}`);
    } catch (jsonErr) {
      console.warn('Warning: could not write JSON report:', jsonErr);
    }

    // If there are issues, write an error note into Errors directory with v1.2 guidance
    let errorNotePath = null;
    if (specimenData.issues && specimenData.issues.length) {
      const errorDir = path.join(C.errorsDir, `${specimenData.specimenId}_CTC_Grading_Report_ERROR`);
      try {
        if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir, { recursive: true });
        errorNotePath = path.join(errorDir, `${specimenData.specimenId}_CTC_Grading_Report.txt`);
        const errorText = [
          `Specimen: ${specimenData.specimenId}`,
          `Timestamp: ${new Date().toISOString()}`,
          `Framework: ${specimenData.frameworkVersion}`,
          `Verification: ${specimenData.verificationType || 'VO'}`,
          '',
          'Detected Issues:',
          ...specimenData.issues.map((i, idx) => `${idx + 1}. ${i}`),
          '',
          'Reporter: Multiview CTC Grader v2.0',
          'Report Format: v1.2'
        ].join('\n');
        fs.writeFileSync(errorNotePath, errorText);
        console.log(`Error note saved: ${errorNotePath}`);
      } catch (e) {
        console.warn('Warning: could not write error note:', e);
      }
    }
    
    return {
      markdownPath,
      pdfPath,
      markdownContent,
      specimenMarkdownPath,
      specimenPdfPath,
      jsonPath,
      errorNotePath
    };
  } catch (error) {
    console.error('Error generating reports:', error);
    throw error;
  }
}

export default { generatePDFReport, generateReports, generateMarkdownReport };

// ===== Helper functions for detailed analytics =====
function computeWeightedMean(subgrades = {}) {
  const g = Number(subgrades.geometry ?? 0);
  const c = Number(subgrades.corners ?? 0);
  const s = Number(subgrades.surface ?? 0);
  const coat = Number(subgrades.coating ?? 0);
  const a = Number((subgrades.alignment ?? subgrades.edges) ?? 0);
  return g*0.30 + c*0.20 + s*0.20 + coat*0.12 + a*0.18;
}

function estimateCurvatureFromGeometry(geometry = 8) {
  // Simple synthetic mapping: lower geometry -> higher curvature
  const delta = Math.max(0, 10 - Number(geometry));
  return Math.min(15, 2 + delta * 1.3);
}

function getCurvatureBand(curv = 0) {
  const c = Number(curv);
  if (c > 12) return 'Severe warp';
  if (c > 8) return 'Warped band';
  if (c > 4) return 'Nominal camber';
  return 'Flat band';
}

function simulateCoatingVariance(coating = 8) {
  const d = (10 - Number(coating));
  return 6 + d * 0.9;
}

function estimateCornerRadius(corners = 8) {
  const d = (10 - Number(corners));
  return (0.15 + d * 0.05).toFixed(2);
}

function describeSurface(score = 8) {
  if (score < 7.5) return 'ridge collapse and pocking evident';
  if (score < 8.5) return 'minor pocking under angled light';
  return 'ridge network intact with good preservation';
}

function describeCoating(score = 8) {
  if (score < 7.5) return 'uneven coverage with quadrant variance';
  if (score < 8.5) return 'slight imbalance with dulling in one region';
  return 'even distribution with balanced sheen';
}

function describeCorners(score = 8) {
  if (score < 7.5) return 'rounding and small chips beyond tolerance';
  if (score < 8.5) return 'minor rounding visible';
  return 'sharp, well-defined corners';
}

function generateTechnicalBreakdown(specimen) {
  const {
    subgrades,
    curvature,
    weightedMean,
    framework,
    aiConfidence = 0.945,
    finalGrade
  } = specimen;

  const ridgeFreq = (0.35 + (10 - subgrades.surface) * 0.015).toFixed(3);
  const ridgeVariance = (1.8 + (10 - subgrades.surface) * 0.12).toFixed(2);
  const luminanceVariance = (simulateCoatingVariance(subgrades.coating)).toFixed(2);
  const edgeCompression = (0.8 + (10 - (subgrades.edges ?? subgrades.alignment)) * 0.1).toFixed(2);
  const cornerAngleVar = (2.1 + (10 - subgrades.corners) * 0.25).toFixed(2);
  const pockDensity = (1.2 + (10 - subgrades.surface) * 0.15).toFixed(2);
  const symmetryDeviation = (0.9 + (10 - subgrades.geometry) * 0.2).toFixed(2);
  const aspectRatio = (1 + ((10 - subgrades.geometry) * 0.002)).toFixed(3);

  return `
---

## AI Technical Breakdown  
**Framework:** ${framework}  
**AI Confidence:** ${(aiConfidence * 100).toFixed(1)}%  
**Curvature:** ${Number(curvature).toFixed(2)}% (${getCurvatureBand(curvature)} band)

---

### Image Normalization
- **Color Space:** LAB  
- **Histogram Equalization:** CLAHE (clip=2.0, grid=8×8)  
- **Background Segmentation:** Otsu–Sauvola hybrid thresholding  
- **Object Mask Confidence:** 0.982  
- **Detected Contour Vertices:** 142  
These preprocessing stages correct iPhone lighting skew and isolate cereal geometry for curvature and ridge mapping.

---

### Geometric Reconstruction
| Metric | Value | Interpretation |
|--------|-------:|----------------|
| PCA Aspect Ratio | ${aspectRatio} : 1 | ${aspectRatio < 1.02 ? 'Nominal symmetry' : 'Minor elongation along major axis'} |
| Rotational Skew | ${symmetryDeviation}° | ${symmetryDeviation < 1 ? 'Centered' : 'Slight lateral bias'} |
| Curvature Deviation | ${Number(curvature).toFixed(2)}% | ${getCurvatureBand(curvature)} |
| Vertex Angle Variance | ${cornerAngleVar}° | ${cornerAngleVar < 3 ? 'Stable corner geometry' : 'Variable edge stress'} |

Curvature mapping performed by differential height estimation under Lambertian assumption.  
Cap enforcement: ${Number(curvature) > 7.5 ? '**Yes** (geometry limited ≤8.0)' : '**No**'}.

---

### Ridge & Surface Analysis
| Submetric | Value | Units | Description |
|------------|-------:|-------|-------------|
| FFT Ridge Frequency | ${ridgeFreq} | cycles/mm | Grain periodicity |
| Ridge Variance | ${ridgeVariance} | % | Deviation from A-REF periodic ridge spacing |
| Pock Density | ${pockDensity} | /cm² | Localized micro-defects |
| Ridge Integrity Index | ${(10 - (10 - subgrades.surface) * 0.7).toFixed(2)} | /10 | Structural topography stability |

Interpretation: ${describeSurface(subgrades.surface)}; ridge map variance remains within Multiview tolerance envelope.

---

### Coating & Luminance Uniformity
| Submetric | Value | Units | Description |
|------------|-------:|-------|-------------|
| Luminance σ (HSV V-channel) | ${luminanceVariance} | % | Distribution variance |
| Chromatic Skew | ${(0.8 + (10 - subgrades.coating) * 0.05).toFixed(2)} | ΔE | Cinnamon hue offset |
| Granule Cluster Ratio | ${(1.00 + (10 - subgrades.coating) * 0.08).toFixed(2)} | % | Detected granular aggregation |
| Coverage Balance | ${(9.5 - (10 - subgrades.coating) * 0.3).toFixed(2)} | /10 | Evenness metric |

Result: ${describeCoating(subgrades.coating)} — ${Number(luminanceVariance) > 10 ? 'visible quadrant imbalance' : 'acceptable variance'}.

---

### Edge & Corner Diagnostics
| Metric | Value | Units | Observation |
|---------|-------:|-------|-------------|
| Edge Compression | ${edgeCompression} | % thickness loss | ${Number(edgeCompression) < 1.2 ? 'Minor' : 'Noticeable'} compression detected |
| Corner Radius (avg) | ${estimateCornerRadius(subgrades.corners)} | mm | ${describeCorners(subgrades.corners)} |
| Edge Continuity | ${(9.0 - (10 - (subgrades.edges ?? subgrades.alignment)) * 0.5).toFixed(2)} | /10 | Consistency across 4 edges |
| Corner Variance | ${cornerAngleVar} | ° | Angular deviation consistency |

Edges analyzed by contour differential; corner sharpness by local curvature maxima.  
Detected ${subgrades.corners < 8 ? 'degradation' : 'retention'} consistent with ${finalGrade} classification.

---

### Weighted Grade Computation
| Category | Subgrade | Weight | Contribution |
|-----------|----------:|-------:|--------------:|
| Geometry / Flatness | ${subgrades.geometry} | 0.30 | ${(subgrades.geometry * 0.30).toFixed(2)} |
| Corners | ${subgrades.corners} | 0.20 | ${(subgrades.corners * 0.20).toFixed(2)} |
| Surface Integrity | ${subgrades.surface} | 0.20 | ${(subgrades.surface * 0.20).toFixed(2)} |
| Coating Uniformity | ${subgrades.coating} | 0.12 | ${(subgrades.coating * 0.12).toFixed(2)} |
| Alignment / Edges | ${(subgrades.alignment ?? subgrades.edges)} | 0.18 | ${((subgrades.alignment ?? subgrades.edges) * 0.18).toFixed(2)} |
| **Weighted Mean** |  |  | **${Number(weightedMean).toFixed(2)}** |

Final grade computed via weighted mean → curvature cap → deterministic rounding-down.  
Outcome: **${finalGrade}**, per Multiview Strict++ deductive enforcement.

---

### System Context
All numeric metrics produced by deterministic image-analysis pipelines with fixed random seeds (seed=42) to ensure reproducibility.  
No stochastic sampling applied during evaluation; all variance arises from specimen geometry alone.  

This system assumes imperfection until proven otherwise.  
All results represent verified outputs of **Multiview CTC Grader v2.0** operating under **Framework v1.5 Strict++** —  
where curvature governs geometry, geometry governs grade, and grade governs meaning.  
  `;
}

async function generateSystemHash(specimen, markdownText) {
  try {
    const { frontImage, sideImage } = specimen;
    const hash = crypto.createHash('sha256');
    if (frontImage && fs.existsSync(frontImage)) hash.update(fs.readFileSync(frontImage));
    if (sideImage && fs.existsSync(sideImage)) hash.update(fs.readFileSync(sideImage));
    hash.update(Buffer.from(markdownText, 'utf8'));
    const digest = hash.digest('hex');
    return { full: digest, short: `${digest.slice(0,8)}…${digest.slice(-8)}` };
  } catch (e) {
    return { full: '', short: 'unavailable' };
  }
}

// Minimal mustache-like renderer for {{var}} placeholders
function renderTemplate(template, vars) {
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (m, key) => {
    return (vars[key] !== undefined && vars[key] !== null) ? String(vars[key]) : '';
  });
}

// Enhanced 4-page PDF generator following the master template
export function generateEnhancedPDFReport(specimenData, opts = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { specimenId } = specimenData;
      const reportPath = path.join(C.reportsDir, `${specimenId}_CTC_Grading_Report.pdf`);
      
      if (!fs.existsSync(C.reportsDir)) {
        fs.mkdirSync(C.reportsDir, { recursive: true });
      }
      
      const doc = new PDFDocument({ size: 'A4', margins: { top: 72, bottom: 72, left: 72, right: 72 } });
      const stream = fs.createWriteStream(reportPath);
      doc.pipe(stream);
      
      const weightedMean = computeWeightedMean(specimenData.subgrades || {});
      const curvature = estimateCurvatureFromGeometry(specimenData.subgrades?.geometry || 8);
      
      // PAGE 1: Header & Identification
      doc.fontSize(24).font('Helvetica-Bold').text('MULTIVIEW TECHNOLOGY', { align: 'center' });
      doc.fontSize(18).font('Helvetica-Bold').text('OFFICIAL CINNAMON TOAST CRUNCH GRADING REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique').text('"Why not take the most ordinary thing and bury it in paperwork until it feels important?"', { align: 'center' });
      doc.moveDown(2);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Specimen Identification');
      doc.fontSize(11).font('Helvetica')
         .text(`Specimen ID: ${specimenId}`)
         .text(`Certification ID: ${specimenData.certificationId || ''}`)
         .text(`Classification: ${specimenData.verificationType || 'VO'}`)
         .text(`Framework: Multiview Grading Standards ${specimenData.frameworkVersion}`)
         .text(`Date: ${new Date().toLocaleDateString()}`)
         .text(`Time: ${new Date().toLocaleTimeString()}`)
         .text(`Certified By: Shawn Wiederhoeft`);
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Measurements & Weight');
      doc.fontSize(11).font('Helvetica')
         .text(`Length × Width × Thickness: ${specimenData.measurements || 'not recorded'} mm`)
         .text(`Weight: ${specimenData.weight || 'not recorded'} g`);
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Condition Summary');
      doc.fontSize(11).font('Helvetica').text(specimenData.notes || 'No summary provided.', { width: 450 });
      doc.moveDown(1);
      
      doc.fontSize(10).font('Helvetica-Oblique').text('Page 1 of 4 • Cataloged by Multiview Technology', { align: 'center' });
      doc.addPage();
      
      // PAGE 2: Subgrade Analysis
      doc.fontSize(18).font('Helvetica-Bold').text('Subgrade Analysis');
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').text('Weighted Subgrades (0–10)');
      doc.moveDown(0.5);
      
      const subgrades = specimenData.subgrades || {};
      const categories = [
        { name: 'Corners', key: 'corners', weight: '0.20' },
        { name: 'Edges', key: 'alignment', weight: '0.18' },
        { name: 'Surface Integrity', key: 'surface', weight: '0.20' },
        { name: 'Coating Uniformity', key: 'coating', weight: '0.12' },
        { name: 'Geometry / Flatness', key: 'geometry', weight: '0.30' }
      ];
      
      categories.forEach(cat => {
        doc.fontSize(11).font('Helvetica')
           .text(`${cat.name}: ${subgrades[cat.key] || 'N/A'} (Weight: ${cat.weight})`, { indent: 20 });
      });
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Curvature & Penalty Data');
      doc.fontSize(11).font('Helvetica')
         .text(`Curvature: ${Number(curvature).toFixed(2)} %`)
         .text(`Penalty Triggered: ${Number(curvature) > 7.5 ? 'Yes (cap ≤ 8.0)' : 'None'}`)
         .text(`AI Confidence: ${((specimenData.aiConfidence || 0.945) * 100).toFixed(1)}%`);
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Final Computation');
      doc.fontSize(11).font('Helvetica')
         .text(`Weighted Mean: ${Number(weightedMean).toFixed(2)}`)
         .text(`Strict-Mode Adjustments: ${Number(curvature) > 7.5 ? 'Curvature cap applied' : 'None'}`)
         .text(`Rounded Grade: PSA ${specimenData.grade || 'N/A'}`);
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Analytical Notes');
      doc.fontSize(11).font('Helvetica').text(specimenData.notes || 'No additional notes.', { width: 450 });
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Oblique').text('Page 2 of 4 • Multiview Technology', { align: 'center' });
      doc.addPage();
      
      // PAGE 3: Provenance & Interpretation
      doc.fontSize(18).font('Helvetica-Bold').text('Provenance & Interpretation');
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').text('Provenance');
      doc.fontSize(11).font('Helvetica')
         .text(`Manufacturer: ${specimenData.manufacturer || ''}`)
         .text(`Box Code / Batch: ${specimenData.box_code || ''}`)
         .text(`Best By: ${specimenData.best_by || ''}`)
         .text(`Capture Era: ${specimenData.capture_era || ''}`);
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Personal / Observational Note');
      doc.fontSize(11).font('Helvetica').text(specimenData.personal_note || '', { width: 450 });
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Interpretation');
      doc.fontSize(11).font('Helvetica').text(
        `This specimen was evaluated under Multiview Grading Standards ${specimenData.frameworkVersion}, applying full strict-mode enforcement and curvature cap logic. Any subgrade < 8.0 or curvature > 7.5 % automatically invoked the grade cap of ≤ 8.0. Rounding applied deterministically downward.`,
        { width: 450 }
      );
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Oblique').text('Page 3 of 4 • Multiview Technology', { align: 'center' });
      doc.addPage();
      
      // PAGE 4: Appendix & System Hash
      doc.fontSize(18).font('Helvetica-Bold').text('Appendix — Understanding the Report');
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').text('How to Read This Report');
      doc.fontSize(10).font('Helvetica')
         .text('• Subgrades (0–10): Corners = edge integrity, Edges = cracks/uniformity, Surface = ridge clarity, Coating = granule balance, Geometry = flatness + aspect ratio.')
         .text('• Measurements: Recorded in mm/g using calipers and digital scale.')
         .text('• Curvature: Max height deviation ÷ half-span × 100 %.')
         .text('• PSA Scale: 10 = Gem Mint → 1 = Poor (broken or burned).')
         .text('• Strict-Mode: Any uncertainty reduces grade; never rounds up.');
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('About Multiview Technology');
      doc.fontSize(10).font('Helvetica').text(
        'Multiview Technology is a conceptual grading authority that applies forensic-level analysis to disposable breakfast objects. Each specimen passes through an AI-assisted vision pipeline measuring geometry, curvature, color variance, and ridge frequency. Results are deterministic, weighted, and rounded conservatively to enforce discipline in absurdity.',
        { width: 450 }
      );
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique').text('The paperwork is real. The subject is breakfast.');
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica-Bold').text('Archival Policy');
      doc.fontSize(10).font('Helvetica').text(
        'Every document—complete or erroneous—is permanently preserved for provenance continuity. Error or incomplete grades are recorded with the same status as valid reports.'
      );
      doc.moveDown(2);
      
      // System Hash footer
      const hashShort = opts?.hashInfo?.short || 'unavailable';
      doc.fontSize(12).font('Helvetica-Bold').text('System Hash & Provenance Record');
      doc.fontSize(10).font('Helvetica')
         .text(`Multiview Digital Integrity Hash (SHA-256): ${hashShort}`)
         .text('(Full hash stored in archive metadata)')
         .text(`Generated: ${new Date().toISOString()}`)
         .text(`System: Multiview CTC Grader v2.0 • Framework ${specimenData.frameworkVersion}`)
         .text('Seed: 42')
         .text(`Verification Type: ${specimenData.verificationType || 'VO'}`);
      doc.moveDown(2);
      
      doc.fontSize(10).font('Helvetica-Bold').text('Certified & Catalogued by: Shawn Wiederhoeft  •  Multiview Technology');
      doc.fontSize(10).font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Oblique').text('Page 4 of 4 • End of Report', { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`Enhanced 4-page PDF report generated: ${reportPath}`);
        resolve(reportPath);
      });
      
      stream.on('error', (err) => {
        console.error('Error writing enhanced PDF:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('Error generating enhanced PDF report:', error);
      reject(error);
    }
  });
}

// Generate error report for invalid submissions
export async function generateErrorReport(errorData) {
  return new Promise(async (resolve, reject) => {
    try {
      const { specimenId, errorType, reason, frameworkVersion, frontPath, sidePath } = errorData;
      const errorDir = path.join(C.errorsDir, `${specimenId}_CTC_Error_Report`);
      if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir, { recursive: true });

      const pdfPath = path.join(errorDir, `${specimenId}_CTC_Error_Report.pdf`);
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.fontSize(20).text('Multiview Official Error Report', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(14).text(`Specimen ID: ${specimenId}`);
      doc.fontSize(14).text(`Error Type: ${errorType}`);
      doc.fontSize(14).text(`Reason: ${reason}`);
      doc.fontSize(14).text(`Framework: ${frameworkVersion}`);
      doc.fontSize(14).text(`Date: ${new Date().toLocaleString()}`);
      doc.moveDown(1);

      if (frontPath && fs.existsSync(frontPath)) {
        doc.image(frontPath, { width: 200 });
        doc.text('Front Image (Submitted)');
        doc.moveDown(0.5);
      }
      if (sidePath && fs.existsSync(sidePath)) {
        doc.image(sidePath, { width: 200 });
        doc.text('Side Image (Submitted)');
        doc.moveDown(0.5);
      }

      doc.fontSize(10).text('This report documents an invalid submission to the Multiview CTC Grader. No grading was performed.', { align: 'center' });
      doc.end();

      stream.on('finish', () => resolve({ pdfPath }));
      stream.on('error', reject);
    } catch (error) {
      console.error('Error generating error report:', error);
      reject(error);
    }
  });
}
