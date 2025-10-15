/**
 * Device Detection for Adaptive UI
 * Detects iPhone, Android, and Desktop for optimized experience
 */

/**
 * Get device type from user agent
 */
export function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  if (/android/.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
}

/**
 * Get OS details
 */
export function getOSInfo() {
  const ua = navigator.userAgent;
  const device = getDeviceType();
  
  let osVersion = 'unknown';
  
  if (device === 'ios') {
    const match = ua.match(/OS (\d+)_(\d+)/);
    if (match) {
      osVersion = `iOS ${match[1]}.${match[2]}`;
    }
  } else if (device === 'android') {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    if (match) {
      osVersion = `Android ${match[1]}`;
    }
  }
  
  return {
    device,
    osVersion,
    isMobile: device !== 'desktop',
    userAgent: ua
  };
}

/**
 * Set app mode based on device
 * Adds CSS classes and data attributes for adaptive styling
 */
export function setAppMode() {
  const device = getDeviceType();
  const isMobile = device !== 'desktop';
  
  // Set data attribute for CSS targeting
  document.body.dataset.device = device;
  
  // Add CSS classes
  if (device === 'desktop') {
    document.body.classList.add('desktop-mode');
    document.body.classList.remove('mobile-mode');
  } else {
    document.body.classList.add('mobile-mode');
    document.body.classList.remove('desktop-mode');
  }
  
  // Add specific device classes
  document.body.classList.add(`${device}-device`);
  
  console.log(`📱 Device detected: ${device.toUpperCase()}`);
  console.log(`📐 Mode: ${isMobile ? 'Mobile' : 'Desktop'}`);
  
  return { device, isMobile };
}

/**
 * Check if device supports camera capture
 */
export function supportsCameraCapture() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get orientation
 */
export function getOrientation() {
  if (window.innerHeight > window.innerWidth) {
    return 'portrait';
  }
  return 'landscape';
}

/**
 * Listen for orientation changes
 */
export function setupOrientationListener(callback) {
  window.addEventListener('resize', () => {
    const orientation = getOrientation();
    document.body.dataset.orientation = orientation;
    if (callback) callback(orientation);
  });
  
  // Set initial orientation
  document.body.dataset.orientation = getOrientation();
}

/**
 * Show/hide mobile-specific tips
 */
export function setupMobileTips() {
  const device = getDeviceType();
  const lightingTip = document.getElementById('lighting-tip');
  
  if (lightingTip) {
    if (device === 'desktop') {
      lightingTip.style.display = 'none';
    } else {
      lightingTip.style.display = 'block';
      
      // Device-specific tips
      if (device === 'ios') {
        lightingTip.innerHTML = '💡 Tip: Use soft lighting and tap to focus. HEIC images auto-convert to JPEG.';
      } else if (device === 'android') {
        lightingTip.innerHTML = '💡 Tip: Use soft, even lighting and a neutral background for best results.';
      }
    }
  }
}

/**
 * Initialize device detection
 */
export function initDeviceDetection() {
  const info = setAppMode();
  setupOrientationListener();
  setupMobileTips();
  
  console.log('🔍 Device Detection Initialized:');
  console.log('   Device:', info.device);
  console.log('   Mobile:', info.isMobile);
  console.log('   Camera:', supportsCameraCapture() ? 'Supported' : 'Not supported');
  console.log('   Orientation:', getOrientation());
  
  return info;
}

// Export global reference
window.DeviceDetect = {
  getDeviceType,
  getOSInfo,
  setAppMode,
  supportsCameraCapture,
  getOrientation,
  setupOrientationListener,
  initDeviceDetection
};


