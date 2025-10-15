import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

/**
 * Validate uploaded image file
 */
export function validateImageFile(file) {
  // Check file size
  const fileSize = file.tempFilePath ? fs.statSync(file.tempFilePath).size : file.data.length;
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB (max 20MB)` };
  }
  
  // Check file extension
  const ext = file.name.split('.').pop().toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return { valid: false, error: `Unsupported format: ${ext}` };
  }
  
  return { valid: true };
}

/**
 * Process and save uploaded image
 * Converts HEIC to JPG automatically
 */
export async function processAndSaveImage(file, outputPath) {
  const ext = file.name.split('.').pop().toLowerCase();
  
  try {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let inputBuffer;
    
    // Get file data
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      inputBuffer = fs.readFileSync(file.tempFilePath);
    } else if (file.data && file.data.length > 0) {
      inputBuffer = file.data;
    } else {
      throw new Error('No file data available');
    }
    
    // Convert HEIC to JPG
    if (ext === 'heic' || ext === 'heif') {
      console.log(`🔄 Converting HEIC to JPG: ${file.name}`);
      
      const jpgBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.95
      });
      
      // Ensure output has .jpg extension
      const jpgPath = outputPath.replace(/\.(heic|heif)$/i, '.jpg');
      fs.writeFileSync(jpgPath, jpgBuffer);
      console.log(`✅ HEIC converted and saved: ${jpgPath}`);
      
      return jpgPath;
    } else {
      // Process other formats with sharp (resize if needed, optimize)
      await sharp(inputBuffer)
        .jpeg({ quality: 95 })
        .toFile(outputPath);
      
      console.log(`✅ Image saved: ${outputPath}`);
      return outputPath;
    }
  } catch (error) {
    console.error(`❌ Error processing image ${file.name}:`, error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Process multiple uploaded images
 */
export async function processImages(files, outputDir, specimenId) {
  const processedPaths = [];
  const fileArray = Array.isArray(files) ? files : [files];
  
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(`Image ${i + 1}: ${validation.error}`);
    }
    
    // Generate output filename
    const ext = file.name.split('.').pop().toLowerCase();
    const isHEIC = ext === 'heic' || ext === 'heif';
    const outputExt = isHEIC ? 'jpg' : ext;
    const outputFilename = `${specimenId}_${i + 1}.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Process and save
    const savedPath = await processAndSaveImage(file, outputPath);
    processedPaths.push(savedPath);
  }
  
  console.log(`✅ Processed ${processedPaths.length} images for ${specimenId}`);
  return processedPaths;
}

