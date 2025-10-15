import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, ".."); // /web

const root = path.resolve(projectRoot, ".."); // parent of /web
const standardsDir = path.resolve(projectRoot, "..", "Documents", "Grading Standards");

/**
 * Automatically detect the highest version grading standards file
 * Looks for files matching: Multiview_Grading_Standards_v*
 */
function getActiveFramework() {
  try {
    if (!fs.existsSync(standardsDir)) {
      console.warn(`⚠️  Standards directory not found: ${standardsDir}`);
      return {
        file: null,
        name: "Multiview Grading Standards v1.5 (Strict++)",
        version: "v1.5"
      };
    }

    // Find all standards files
    const files = fs.readdirSync(standardsDir)
      .filter(f => f.startsWith("Multiview_Grading_Standards_v") && f.endsWith(".pdf"))
      .sort(); // Alphabetical sort works for version numbers

    if (files.length === 0) {
      console.warn(`⚠️  No grading standards found in: ${standardsDir}`);
      return {
        file: null,
        name: "Multiview Grading Standards v1.5 (Strict++)",
        version: "v1.5"
      };
    }

    // Get the highest version (last in sorted array)
    const latestFile = files[files.length - 1];
    
    // Extract version from filename
    // Example: Multiview_Grading_Standards_v1_6_StrictPlusPlus.pdf
    const versionMatch = latestFile.match(/v(\d+)_(\d+)(?:_(.+?))?\.pdf$/);
    
    let versionString = "v1.5";
    let frameworkName = "Multiview Grading Standards v1.5 (Strict++)";
    
    if (versionMatch) {
      const major = versionMatch[1];
      const minor = versionMatch[2];
      const suffix = versionMatch[3] || "";
      
      versionString = `v${major}.${minor}`;
      
      // Format suffix (e.g., "StrictPlusPlus" -> "Strict++")
      let formattedSuffix = "";
      if (suffix) {
        formattedSuffix = suffix
          .replace(/Plus/g, '+')
          .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space before capitals
      }
      
      frameworkName = `Multiview Grading Standards ${versionString}${formattedSuffix ? ' (' + formattedSuffix + ')' : ''}`;
    }

    console.log(`📋 Active Framework: ${frameworkName}`);
    console.log(`📄 Standards File: ${latestFile}`);
    
    return {
      file: latestFile,
      name: frameworkName,
      version: versionString
    };
  } catch (error) {
    console.error('❌ Error detecting active framework:', error);
    return {
      file: null,
      name: "Multiview Grading Standards v1.5 (Strict++)",
      version: "v1.5"
    };
  }
}

const activeFramework = getActiveFramework();

export const MULTIVIEW_CONFIG = {
  root,
  standardsDir,
  reportsDir: path.resolve(projectRoot, "..", "Documents", "Reports"),
  errorsDir: path.resolve(projectRoot, "..", "Documents", "Errors"),
  specimensDir: path.resolve(projectRoot, "..", "Specimens"),
  activeFrameworkName: activeFramework.name,
  activeFrameworkFile: activeFramework.file,
  activeFrameworkVersion: activeFramework.version
};

// Export helper function for dynamic updates
export function refreshActiveFramework() {
  const updated = getActiveFramework();
  MULTIVIEW_CONFIG.activeFrameworkName = updated.name;
  MULTIVIEW_CONFIG.activeFrameworkFile = updated.file;
  MULTIVIEW_CONFIG.activeFrameworkVersion = updated.version;
  return updated;
}