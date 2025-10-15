/**
 * Moderation Logic for Fan Submissions
 * - Image hash duplicate detection
 * - CTC Detector integration
 * - OpenAI Moderation API
 */

import crypto from 'crypto';
import sharp from 'sharp';
import sqlite3 from 'sqlite3';
import path from 'path';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';
import { classifyCTC } from './ai-grader.js';

const db = new sqlite3.Database(path.join(C.root, 'Documents', 'ctc_grades.db'));

/**
 * Initialize image hash table
 */
export function initImageHashTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS image_hashes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        specimenId TEXT NOT NULL,
        imageHash TEXT NOT NULL,
        imageType TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Compute perceptual hash from image buffer
 * Using MD5 of resized 8x8 grayscale image for simplicity
 */
export async function computeImageHash(imagePath) {
  try {
    // Resize to 8x8 and convert to grayscale for perceptual hashing
    const buffer = await sharp(imagePath)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();
    
    // Compute MD5 hash
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    return hash;
  } catch (error) {
    console.error('Error computing image hash:', error);
    throw error;
  }
}

/**
 * Check if image hash already exists in database
 */
export async function checkDuplicateImage(imageHash) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT specimenId, timestamp FROM image_hashes 
       WHERE imageHash = ? 
       ORDER BY timestamp DESC LIMIT 1`,
      [imageHash],
      (err, row) => {
        if (err) reject(err);
        else resolve(row); // Returns {specimenId, timestamp} or undefined
      }
    );
  });
}

/**
 * Store image hash in database
 */
export async function storeImageHash(specimenId, imageHash, imageType) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO image_hashes (specimenId, imageHash, imageType, timestamp) 
       VALUES (?, ?, ?, ?)`,
      [specimenId, imageHash, imageType, new Date().toISOString()],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Moderate submission - full pipeline
 */
export async function moderateSubmission(frontPath, sidePath, backPath = null) {
  const results = {
    passed: true,
    errors: [],
    warnings: [],
    duplicates: []
  };

  try {
    // 1. Check for duplicate images
    const images = [
      { path: frontPath, type: 'front' },
      { path: sidePath, type: 'side' }
    ];
    if (backPath) images.push({ path: backPath, type: 'back' });

    for (const img of images) {
      const hash = await computeImageHash(img.path);
      const duplicate = await checkDuplicateImage(hash);
      
      if (duplicate) {
        results.duplicates.push({
          type: img.type,
          existingSpecimen: duplicate.specimenId,
          timestamp: duplicate.timestamp
        });
        results.errors.push(
          `Duplicate ${img.type} image detected. This photo was previously submitted as specimen ${duplicate.specimenId}.`
        );
        results.passed = false;
      }
    }

    // 2. CTC Classification Check (AI-based)
    console.log('Running CTC classification check...');
    const ctcResult = await classifyCTC(frontPath, sidePath);
    
    if (!ctcResult.isCTC || ctcResult.confidence < 0.7) {
      results.errors.push(
        `Image does not appear to be a Cinnamon Toast Crunch specimen. Reason: ${ctcResult.reason}`
      );
      results.passed = false;
    } else if (ctcResult.confidence < 0.85) {
      results.warnings.push(
        `CTC classification confidence is moderate (${(ctcResult.confidence * 100).toFixed(1)}%). Manual review recommended.`
      );
    }

    // 3. Basic image quality checks
    for (const img of images) {
      const metadata = await sharp(img.path).metadata();
      
      // Check resolution
      if (metadata.width < 512 || metadata.height < 512) {
        results.warnings.push(
          `${img.type} image resolution is low (${metadata.width}x${metadata.height}). Recommend 1024x1024 or higher.`
        );
      }
      
      // Check file size (too small = screenshot/fake)
      const stats = await import('fs').then(fs => fs.promises.stat(img.path));
      if (stats.size < 50000) { // < 50KB
        results.errors.push(
          `${img.type} image file size suspiciously small (${(stats.size / 1024).toFixed(1)}KB). May be screenshot or low-quality image.`
        );
        results.passed = false;
      }
    }

    // 4. OpenAI Moderation API (optional - requires OpenAI API key)
    // Skipped for now - can be added later if needed
    
  } catch (error) {
    console.error('Moderation error:', error);
    results.errors.push(`Moderation system error: ${error.message}`);
    results.passed = false;
  }

  return results;
}

/**
 * Async publish specimen after delay (1-2 minutes)
 */
export async function queuePublish(specimenId, delaySeconds = 90) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        // Update specimen to published=1
        await new Promise((res, rej) => {
          db.run(
            `UPDATE specimens SET published = 1 WHERE specimenId = ?`,
            [specimenId],
            (err) => {
              if (err) rej(err);
              else res();
            }
          );
        });
        console.log(`✅ Specimen ${specimenId} published to leaderboard after ${delaySeconds}s delay`);
        resolve(true);
      } catch (error) {
        console.error(`❌ Failed to publish specimen ${specimenId}:`, error);
        resolve(false);
      }
    }, delaySeconds * 1000);
  });
}

// Initialize table on module load
initImageHashTable().catch(err => {
  console.error('Failed to initialize image hash table:', err);
});

export default {
  computeImageHash,
  checkDuplicateImage,
  storeImageHash,
  moderateSubmission,
  queuePublish
};


