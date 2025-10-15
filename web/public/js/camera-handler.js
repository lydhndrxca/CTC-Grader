/**
 * Camera Input Handler
 * Optimizes camera/file inputs for each device type
 */

import { getDeviceType, supportsCameraCapture } from './device-detect.js';

/**
 * Setup camera inputs with device-specific attributes
 */
export function setupCameraInputs() {
  const inputs = document.querySelectorAll('input[type="file"][data-capture]');
  const device = getDeviceType();
  
  inputs.forEach(input => {
    // Set accept attribute for all image types
    input.accept = "image/*";
    
    // Add capture attribute for mobile devices
    if (device !== 'desktop') {
      input.capture = "environment"; // Rear camera
      input.setAttribute('capture', 'environment');
    } else {
      // Desktop - remove capture attribute
      input.removeAttribute('capture');
    }
    
    console.log(`📸 Camera input configured for ${device}:`, input.id);
  });
}

/**
 * Create file input programmatically with proper attributes
 */
export function createCameraInput(label, accept = 'image/*') {
  const device = getDeviceType();
  const input = document.createElement('input');
  
  input.type = 'file';
  input.accept = accept;
  input.id = `${label}Input`;
  input.style.display = 'none';
  
  // Mobile: use camera capture
  if (device !== 'desktop') {
    input.capture = 'environment';
  }
  
  document.body.appendChild(input);
  return input;
}

/**
 * Open camera or file picker
 */
export async function openCameraForLabel(label, callback) {
  const device = getDeviceType();
  
  // Create hidden input if doesn't exist
  let input = document.getElementById(`${label}Input`);
  if (!input) {
    input = createCameraInput(label);
  }
  
  // Setup one-time handler
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log(`📷 ${label} photo captured:`, file.name, file.type);
    
    // Call callback with file
    if (callback) {
      await callback(file, label);
    }
    
    // Reset input for reuse
    input.value = '';
  };
  
  // Trigger picker/camera
  input.click();
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file) {
  const errors = [];
  const warnings = [];
  
  // Check file exists
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors, warnings };
  }
  
  // Check file size (max 20MB)
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 20MB)`);
  }
  
  // Check file size (min 50KB to prevent screenshots)
  const minSize = 50 * 1024;
  if (file.size < minSize) {
    warnings.push(`File very small: ${(file.size / 1024).toFixed(2)}KB. May be low quality or screenshot.`);
  }
  
  // Check type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
    errors.push(`Unsupported format: ${file.type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create preview for captured image
 */
export function createImagePreview(file, container) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'photo-preview';
      img.style.maxWidth = '200px';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      
      // Clear existing preview
      container.innerHTML = '';
      container.appendChild(img);
      container.style.display = 'block';
      
      resolve(img);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Handle camera capture and upload
 */
export async function captureAndUpload(label, uploadCallback) {
  try {
    await openCameraForLabel(label, async (file, lbl) => {
      // Validate file
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        alert(`Error: ${validation.errors.join(', ')}`);
        return;
      }
      
      if (validation.warnings.length > 0) {
        console.warn(`Warnings for ${lbl}:`, validation.warnings);
      }
      
      // Create preview
      const previewContainer = document.getElementById(`${lbl}Preview`);
      if (previewContainer) {
        await createImagePreview(file, previewContainer);
      }
      
      // Call upload callback
      if (uploadCallback) {
        await uploadCallback(file, lbl);
      }
    });
  } catch (error) {
    console.error(`Camera capture error for ${label}:`, error);
    alert(`Failed to capture ${label} photo: ${error.message}`);
  }
}

// Export global reference
window.CameraHandler = {
  setupCameraInputs,
  openCameraForLabel,
  captureAndUpload,
  validateImageFile,
  createImagePreview
};

export default {
  setupCameraInputs,
  openCameraForLabel,
  captureAndUpload,
  validateImageFile,
  createImagePreview
};


