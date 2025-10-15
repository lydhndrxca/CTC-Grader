/**
 * Fan Submission Routes
 * Visual-Only (VO) grading with rate limiting and moderation
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { MULTIVIEW_CONFIG as C } from '../lib/multiview-config.js';
import { hybridIdentityMiddleware } from '../lib/rate-limit.js';
import { recordIdentity } from '../lib/identity-utils.js';
import { 
  moderateSubmission, 
  storeImageHash, 
  computeImageHash,
  queuePublish 
} from '../lib/moderation.js';
import { gradeSpecimen } from '../lib/ai-grader.js';
import { generateFanCertificate } from '../lib/certificate-generator.js';
import { 
  processUploadedImage, 
  validateImageFile,
  convertToStandardJPEG 
} from '../lib/image-processor.js';
import { updateLeaderboard } from './leaderboard.js';
import sqlite3 from 'sqlite3';

const router = express.Router();
const db = new sqlite3.Database(path.join(C.root, 'Documents', 'ctc_grades.db'));

/**
 * POST /api/fan/grade
 * Submit 3 photos for fan grading (VO)
 * NO DAILY LIMITS - Unlimited submissions with hybrid identity tracking
 */
router.post('/grade', hybridIdentityMiddleware, async (req, res) => {
  try {
    const { specimenId, userTag, deviceId } = req.body;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // deviceId should be set by middleware, but fallback to body
    const finalDeviceId = req.deviceId || deviceId;

    // Validate required fields
    if (!specimenId) {
      return res.status(400).json({ error: 'Missing specimenId' });
    }

    // Validate userTag format (3 chars, A-Z/0-9)
    let finalUserTag = userTag;
    if (!userTag || !userTag.match(/^[A-Z0-9]{3}$/)) {
      // Generate random 3-char tag
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      finalUserTag = Array(3).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      console.log(`Generated random userTag: ${finalUserTag}`);
    }

    // Validate photos uploaded
    if (!req.files || !req.files.front || !req.files.side || !req.files.back) {
      return res.status(400).json({
        error: 'Missing required photos',
        message: 'Please upload all 3 photos: front, side, and back views.'
      });
    }

    const frontFile = req.files.front;
    const sideFile = req.files.side;
    const backFile = req.files.back;

    // Validate all files
    const frontValidation = validateImageFile(frontFile);
    const sideValidation = validateImageFile(sideFile);
    const backValidation = validateImageFile(backFile);

    if (!frontValidation.valid) {
      return res.status(400).json({ error: frontValidation.error });
    }
    if (!sideValidation.valid) {
      return res.status(400).json({ error: sideValidation.error });
    }
    if (!backValidation.valid) {
      return res.status(400).json({ error: backValidation.error });
    }

    // Create specimen folder
    const specimenDir = path.join(C.specimensDir, specimenId);
    if (!fs.existsSync(specimenDir)) {
      fs.mkdirSync(specimenDir, { recursive: true });
    }

    // Define temp and final paths
    const tempFrontPath = frontFile.tempFilePath;
    const tempSidePath = sideFile.tempFilePath;
    const tempBackPath = backFile.tempFilePath;

    const frontPath = path.join(specimenDir, `${specimenId}_front.jpg`);
    const sidePath = path.join(specimenDir, `${specimenId}_side.jpg`);
    const backPath = path.join(specimenDir, `${specimenId}_back.jpg`);

    // Process and convert all images to JPEG 1024x1024
    console.log('Converting images to standard JPEG format...');
    await convertToStandardJPEG(tempFrontPath, frontPath, { isFanSubmission: true });
    await convertToStandardJPEG(tempSidePath, sidePath, { isFanSubmission: true });
    await convertToStandardJPEG(tempBackPath, backPath, { isFanSubmission: true });

    // Clean up temp files
    try {
      fs.unlinkSync(tempFrontPath);
      fs.unlinkSync(tempSidePath);
      fs.unlinkSync(tempBackPath);
    } catch (e) {
      console.warn('Temp file cleanup warning:', e.message);
    }

    console.log('✅ All images converted to JPEG 1024x1024');

    // Run moderation pipeline
    console.log('🔍 Running moderation checks...');
    const moderationResult = await moderateSubmission(frontPath, sidePath, backPath);

    if (!moderationResult.passed) {
      // Moderation failed - return error
      return res.status(400).json({
        error: 'Moderation failed',
        reasons: moderationResult.errors,
        warnings: moderationResult.warnings,
        duplicates: moderationResult.duplicates
      });
    }

    // Store image hashes for duplicate detection
    const frontHash = await computeImageHash(frontPath);
    const sideHash = await computeImageHash(sidePath);
    const backHash = await computeImageHash(backPath);

    await storeImageHash(specimenId, frontHash, 'front');
    await storeImageHash(specimenId, sideHash, 'side');
    await storeImageHash(specimenId, backHash, 'back');

    // Run AI grading
    console.log('🤖 Running AI grading...');
    const gradingResult = await gradeSpecimen(specimenId, frontPath, sidePath);

    // Extract curvature from AI response
    const curvature = gradingResult.curvature || 3.5; // Default to ideal if not provided
    
    // Compute combined image hash for duplicate detection
    const combinedHash = frontHash + sideHash + backHash;

    // Generate fan certificate
    console.log('📄 Generating fan certificate...');
    const certificatePath = await generateFanCertificate({
      specimenId,
      grade: gradingResult.grade,
      curvature,
      notes: gradingResult.notes,
      userTag: finalUserTag,
      frameworkVersion: gradingResult.frameworkVersion || C.activeFrameworkVersion,
      dateGraded: new Date().toISOString()
    });

    // Save to database (not published yet)
    const record = await saveSpecimenRecord({
      specimenId,
      frameworkVersion: gradingResult.frameworkVersion || C.activeFrameworkVersion,
      frontPath,
      sidePath,
      backPath,
      grade: gradingResult.grade,
      curvature,
      subgrades: gradingResult.subgrades,
      notes: gradingResult.notes,
      certificatePath,
      userTag: finalUserTag,
      deviceId: finalDeviceId,
      imageHash: combinedHash,
      submissionType: 'VO',
      published: 0, // Not published yet
      dateGraded: new Date().toISOString(),
      urlFront: `/specimens/${specimenId}/${specimenId}_front.jpg`,
      urlSide: `/specimens/${specimenId}/${specimenId}_side.jpg`,
      urlBack: `/specimens/${specimenId}/${specimenId}_back.jpg`
    });

    // Record identity for tracking (no limits enforced)
    await recordIdentity(finalDeviceId, ip, specimenId);

    // Update persistent leaderboard
    await updateLeaderboard(finalDeviceId, finalUserTag, specimenId, gradingResult.grade, curvature);

    // Queue async publish (90 seconds delay)
    queuePublish(specimenId, 90).catch(err => {
      console.error('Failed to queue publish:', err);
    });

    // Return instant response with grade and certificate
    const publishTime = new Date(Date.now() + 90000).toISOString();
    
    res.json({
      success: true,
      specimenId,
      grade: gradingResult.grade,
      curvature,
      frameworkVersion: gradingResult.frameworkVersion || C.activeFrameworkVersion,
      certificate: `/certificates/${specimenId}_CTC_Fan_Certificate.pdf`,
      userTag: finalUserTag,
      notes: gradingResult.notes,
      publishTime,
      message: 'Grade completed! No daily limits - submit as many as you like!',
      warnings: moderationResult.warnings.concat(req.identityWarnings || [])
    });

  } catch (error) {
    console.error('Fan grading error:', error);
    res.status(500).json({
      error: 'Grading failed',
      message: error.message
    });
  }
});

/**
 * Save specimen record to database
 */
function saveSpecimenRecord(data) {
  return new Promise((resolve, reject) => {
    const {
      specimenId,
      frameworkVersion,
      frontPath,
      sidePath,
      backPath,
      grade,
      curvature,
      subgrades,
      notes,
      certificatePath,
      userTag,
      deviceId,
      imageHash,
      submissionType,
      published,
      dateGraded,
      urlFront,
      urlSide,
      urlBack
    } = data;

    const subgradesJSON = JSON.stringify(subgrades);

    db.run(`
      INSERT INTO specimens (
        specimenId, frameworkVersion, frontPath, sidePath, grade,
        subgrades, notes, pdfPath, dateGraded, urlFront, urlSide,
        submissionType, userTag, curvature, published, deviceId, imageHash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      specimenId,
      frameworkVersion,
      frontPath,
      sidePath,
      grade,
      subgradesJSON,
      notes,
      certificatePath,
      dateGraded,
      urlFront,
      urlSide,
      submissionType,
      userTag,
      curvature,
      published,
      deviceId,
      imageHash
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, specimenId });
      }
    });
  });
}

export default router;

