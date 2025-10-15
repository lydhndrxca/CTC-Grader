/**
 * Fan Edition Certificate Generator
 * Generates simplified 2-page PDF certificates for Visual-Only submissions
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';

/**
 * Generate Fan Edition Certificate (2-page PDF)
 */
export async function generateFanCertificate(specimenData) {
  const {
    specimenId,
    grade,
    curvature,
    notes,
    userTag,
    frameworkVersion,
    dateGraded
  } = specimenData;

  // Create certificates directory if it doesn't exist
  const certificatesDir = path.join(C.root, 'Documents', 'Certificates');
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }

  const pdfPath = path.join(certificatesDir, `${specimenId}_CTC_Fan_Certificate.pdf`);
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 72, bottom: 72, left: 72, right: 72 }
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // ===== PAGE 1: Certificate Details =====
      
      // Header
      doc.fontSize(28).font('Helvetica-Bold')
         .text('MULTIVIEW TECHNOLOGY', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(20).font('Helvetica-Bold')
         .text('FAN EDITION DIGITAL CERTIFICATE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique')
         .text('"Why not take the most ordinary thing and bury it in paperwork until it feels important?"', 
               { align: 'center' });
      doc.moveDown(2);

      // Specimen Information
      doc.fontSize(16).font('Helvetica-Bold')
         .text('Specimen Identification', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      const infoStartY = doc.y;
      
      doc.text(`Specimen ID: ${specimenId}`, 72, infoStartY);
      doc.text(`Submitted By: ${userTag || 'Anonymous'}`, 72, infoStartY + 20);
      doc.text(`Classification: VO (Visual-Only)`, 72, infoStartY + 40);
      doc.text(`Framework: ${frameworkVersion}`, 72, infoStartY + 60);
      doc.text(`Date: ${new Date(dateGraded).toLocaleDateString('en-US', { 
        month: '2-digit', day: '2-digit', year: 'numeric' 
      })}`, 72, infoStartY + 80);
      doc.text(`Time: ${new Date(dateGraded).toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      })}`, 72, infoStartY + 100);

      doc.moveDown(7);

      // Grade Box
      doc.fontSize(18).font('Helvetica-Bold')
         .text('OFFICIAL GRADE', { align: 'center' });
      doc.moveDown(0.5);
      
      // Draw grade box
      const gradeBoxY = doc.y;
      doc.rect(150, gradeBoxY, 300, 80)
         .stroke();
      
      doc.fontSize(36).font('Helvetica-Bold')
         .text(grade, 150, gradeBoxY + 20, { width: 300, align: 'center' });
      
      doc.moveDown(6);

      // Curvature Information
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Morphological Analysis', { underline: true });
      doc.moveDown(0.3);
      
      doc.fontSize(11).font('Helvetica');
      doc.text(`Curvature: ${curvature ? curvature.toFixed(2) : 'N/A'}%`);
      
      let curvatureBand = 'Unknown';
      if (curvature) {
        if (curvature < 2) curvatureBand = 'Flat Band';
        else if (curvature <= 5) curvatureBand = 'Ideal Range (2-5%)';
        else if (curvature <= 8) curvatureBand = 'Minor Warp';
        else if (curvature <= 12) curvatureBand = 'Warped Band';
        else curvatureBand = 'Severe Warp';
      }
      doc.text(`Classification: ${curvatureBand}`);
      
      doc.moveDown(1);

      // AI Analysis Summary
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Analysis Summary', { underline: true });
      doc.moveDown(0.3);
      
      doc.fontSize(10).font('Helvetica');
      const summaryText = notes || 'AI analysis completed. This specimen was evaluated using computer vision and multiview grading standards.';
      doc.text(summaryText, { width: 450, align: 'justify' });

      doc.moveDown(1.5);

      // Footer
      doc.fontSize(8).font('Helvetica-Oblique')
         .text('This is a Fan Edition certificate for Visual-Only submissions.', { align: 'center' });
      doc.text('For official measurement-verified certification, please upgrade to full grading.', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica')
         .text('Page 1 of 2 • Cataloged by Multiview Technology', { align: 'center' });

      // ===== PAGE 2: About Multiview & Philosophy =====
      doc.addPage();

      doc.fontSize(20).font('Helvetica-Bold')
         .text('About Multiview Technology', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica');
      doc.text(
        'Multiview Technology is a conceptual grading authority that applies forensic-level ' +
        'analysis to disposable breakfast objects. Each specimen passes through an AI-assisted ' +
        'vision pipeline measuring geometry, curvature, color variance, and texture integrity.',
        { width: 450, align: 'justify' }
      );
      doc.moveDown(1);

      doc.text(
        'Results are deterministic, weighted, and rounded conservatively to enforce discipline ' +
        'in absurdity. The paperwork is real. The subject is breakfast.',
        { width: 450, align: 'justify' }
      );
      doc.moveDown(2);

      // Fan Submission Info
      doc.fontSize(16).font('Helvetica-Bold')
         .text('Fan Submission System', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica');
      doc.text(
        'Visual-Only (VO) submissions provide instant AI grading based on photographic analysis. ' +
        'This classification does not include physical measurements or caliper verification.',
        { width: 450, align: 'justify' }
      );
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Features:', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text('• Instant AI grading using GPT-4o Vision');
      doc.text('• Digital certificate generation');
      doc.text('• Leaderboard eligibility');
      doc.text('• 3 submissions per day limit');
      doc.text('• Upgrade path to Official (MV) certification');
      
      doc.moveDown(2);

      // Upgrade Option
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Upgrade to Official Certification', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(
        'For measurement-verified (MV) certification with caliper measurements, weight data, ' +
        'and full 4-page official report, visit the upgrade portal or re-submit with measurement equipment.',
        { width: 450, align: 'justify' }
      );
      
      doc.moveDown(3);

      // Philosophy Quote
      doc.fontSize(12).font('Helvetica-BoldOblique')
         .text(
           '"The act of taking something mundane—a square of cinnamon-coated cereal—and ' +
           'subjecting it to the full weight of bureaucratic documentation transforms it ' +
           'from breakfast into artifact."',
           { width: 450, align: 'center', oblique: true }
         );
      
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica')
         .text('— Multiview Technology Manifesto', { align: 'center' });

      doc.moveDown(3);

      // Footer
      doc.fontSize(8).font('Helvetica-Oblique')
         .text(`Generated: ${new Date(dateGraded).toLocaleString('en-US')}`, { align: 'center' });
      doc.text(`System: Multiview CTC Grader v2.0 • Framework ${frameworkVersion}`, { align: 'center' });
      doc.text(`Specimen: ${specimenId} • User: ${userTag || 'Anonymous'}`, { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(9).font('Helvetica')
         .text('Page 2 of 2 • End of Certificate', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ Fan certificate generated: ${pdfPath}`);
        resolve(pdfPath);
      });

      stream.on('error', (error) => {
        console.error('❌ Certificate generation error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('Error generating fan certificate:', error);
      reject(error);
    }
  });
}

export default { generateFanCertificate };


