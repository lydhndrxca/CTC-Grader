import sharp from 'sharp';
import fs from 'fs';

export async function validateImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      return { valid: false, reason: 'File not found' };
    }
    const metadata = await sharp(imagePath).metadata();
    const allowedFormats = ['jpeg', 'jpg', 'png'];
    if (!allowedFormats.includes((metadata.format || '').toLowerCase())) {
      return { valid: false, reason: 'Unsupported file format' };
    }

    const stats = await sharp(imagePath).stats();
    const d = stats?.dominant || { r: 128, g: 128, b: 128 };
    const avgR = d.r, avgG = d.g, avgB = d.b;
    const colorNeutrality = Math.abs(avgR - avgG) + Math.abs(avgG - avgB);
    const brightness = (avgR + avgG + avgB) / 3;

    if (colorNeutrality > 60 || brightness > 220) {
      return { valid: false, reason: 'Non-cereal image detected (likely screenshot)' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Image validation failed: ${err.message}` };
  }
}

export default { validateImage };


