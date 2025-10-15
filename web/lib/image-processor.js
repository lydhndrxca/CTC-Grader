import fs from 'fs';
import path from 'path';
import convert from 'heic-convert';
import sharp from 'sharp';

// Supported image formats (including HEIC for conversion)
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
];

// HEIC/HEIF formats that need conversion
const HEIC_FORMATS = ['.heic', '.heif'];
const HEIC_MIME_TYPES = [
  'image/heic',
  'image/heif'
];

/**
 * Check if a file is in HEIC/HEIF format
 */
export function isHEICFormat(file) {
  const ext = path.extname(file.name).toLowerCase();
  const mimeType = file.mimetype?.toLowerCase();
  
  return HEIC_FORMATS.includes(ext) || HEIC_MIME_TYPES.includes(mimeType);
}

/**
 * Check if a file is in a supported format
 */
export function isSupportedFormat(file) {
  const ext = path.extname(file.name).toLowerCase();
  const mimeType = file.mimetype?.toLowerCase();
  
  return SUPPORTED_FORMATS.includes(ext) || SUPPORTED_MIME_TYPES.includes(mimeType);
}

/**
 * Convert any image format to JPEG with standardized dimensions
 * For fan submissions: 1024x1024px
 * For admin submissions: full resolution maintained
 */
export async function convertToStandardJPEG(inputPath, outputPath, options = {}) {
  const { maxSize = 1024, quality = 90, isFanSubmission = true } = options;
  
  try {
    console.log(`Converting image to standard JPEG: ${inputPath} -> ${outputPath}`);
    
    let sharpInstance = sharp(inputPath);
    
    // For fan submissions, resize to 1024x1024
    if (isFanSubmission) {
      sharpInstance = sharpInstance.resize(maxSize, maxSize, {
        fit: 'cover', // Cover entire area, cropping if needed
        position: 'center'
      });
    }
    
    // Convert to JPEG
    await sharpInstance
      .jpeg({ quality })
      .toFile(outputPath);
    
    console.log(`✅ Image converted to JPEG: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error converting image to JPEG:', error);
    throw error;
  }
}

/**
 * Convert HEIC file to JPEG (legacy - now uses convertToStandardJPEG internally)
 */
export async function convertHEICToJPEG(inputPath, outputPath) {
  try {
    console.log(`Converting HEIC to JPEG: ${inputPath} -> ${outputPath}`);
    
    // Read the HEIC file
    const inputBuffer = fs.readFileSync(inputPath);
    
    // Convert to JPEG
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 1
    });
    
    // Write the converted file
    fs.writeFileSync(outputPath, outputBuffer);
    
    console.log(`HEIC conversion successful: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    return false;
  }
}

/**
 * Process uploaded image file
 * - Converts HEIC to JPEG if needed
 * - Returns the final file path
 */
export async function processUploadedImage(file, destPath) {
  try {
    console.log(`Processing file: ${file.name}, type: ${file.mimetype}`);
    console.log(`File properties:`, {
      name: file.name,
      mimetype: file.mimetype,
      size: file.size,
      tempFilePath: file.tempFilePath,
      data: file.data ? 'present' : 'missing'
    });
    
    // Check if it's HEIC format
    if (isHEICFormat(file)) {
      console.log(`Processing HEIC file: ${file.name}`);
      
      // For HEIC files, we need to handle the file data differently
      // When useTempFiles is enabled, the file is on disk, not in memory
      let inputBuffer;
      
      if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
        // File is on disk (file.tempFilePath) - this is the primary path when useTempFiles: true
        inputBuffer = fs.readFileSync(file.tempFilePath);
        console.log(`Using file.tempFilePath for HEIC conversion (${file.tempFilePath})`);
      } else if (file.data && file.data.length > 0) {
        // File is in memory (file.data) - fallback for when useTempFiles is false
        inputBuffer = file.data;
        console.log('Using file.data for HEIC conversion');
      } else {
        throw new Error('Cannot find HEIC file data for conversion');
      }
      
      // Convert HEIC to JPEG
      const jpegPath = destPath.replace(/\.(heic|heif)$/i, '.jpg');
      console.log(`Converting HEIC to JPEG: ${jpegPath}`);
      
      const outputBuffer = await convert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 1
      });
      
      // Write the converted file
      fs.writeFileSync(jpegPath, outputBuffer);
      console.log(`HEIC conversion successful: ${jpegPath}`);
      
      // Clean up temporary file if it exists
      if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
        try {
          fs.unlinkSync(file.tempFilePath);
          console.log('Cleaned up temporary HEIC file');
        } catch (deleteError) {
          console.warn('Could not delete original HEIC file:', deleteError);
        }
      }
      
      return jpegPath;
    } else {
      // For non-HEIC files, just move them
      console.log(`Moving non-HEIC file to: ${destPath}`);
      return new Promise((resolve, reject) => {
        file.mv(destPath, (err) => {
          if (err) {
            console.error('Error moving file:', err);
            reject(err);
          } else {
            console.log(`File moved successfully to: ${destPath}`);
            resolve(destPath);
          }
        });
      });
    }
  } catch (error) {
    console.error('Image processing failed:', error);
    throw error;
  }
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file) {
  // Check if file exists and has required properties
  if (!file || !file.name) {
    return {
      valid: false,
      error: 'Invalid file upload'
    };
  }
  
  // Check if it's a supported format (including HEIC)
  if (!isSupportedFormat(file)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPG, PNG, GIF, WEBP, or HEIC image.'
    };
  }
  
  // Check if file data exists (either in tempFilePath or in memory)
  if (isHEICFormat(file)) {
    // HEIC files can be in file.tempFilePath (disk) or file.data (memory)
    const hasTempFile = file.tempFilePath && fs.existsSync(file.tempFilePath);
    const hasDataBuffer = file.data && file.data.length > 0;
    
    if (!hasTempFile && !hasDataBuffer) {
      return {
        valid: false,
        error: 'HEIC file data not found'
      };
    }
  } else {
    // For non-HEIC files, check if file exists on disk
    if (!file.tempFilePath || !fs.existsSync(file.tempFilePath)) {
      return {
        valid: false,
        error: 'Uploaded file not found on server'
      };
    }
  }
  
  return {
    valid: true,
    error: null
  };
}

/**
 * Check if a saved image file is in supported format
 */
export function validateSavedImage(imagePath) {
  if (!fs.existsSync(imagePath)) {
    return {
      valid: false,
      error: 'Image file not found'
    };
  }
  
  const ext = path.extname(imagePath).toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported image format: ${ext}. Supported formats: JPG, PNG, GIF, WEBP`
    };
  }
  
  return {
    valid: true,
    error: null
  };
}

export default {
  isHEICFormat,
  isSupportedFormat,
  convertHEICToJPEG,
  processUploadedImage,
  validateImageFile,
  validateSavedImage
};
