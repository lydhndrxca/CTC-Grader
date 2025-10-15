import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';
import { CONFIG } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: CONFIG.OPENAI_API_KEY
});

// Read framework PDF content (simplified - in production you'd use a PDF parser)
function getFrameworkContent() {
  try {
    // Use auto-detected framework name
    const frameworkName = C.activeFrameworkName;
    const frameworkVersion = C.activeFrameworkVersion;
    
    // For now, return a basic framework description
    // In production, you'd parse the actual PDF file
    return `
${frameworkName}

GRADING CRITERIA:
- Geometry (30%): Overall shape, proportions, symmetry, curvature
- Corners (20%): Corner radius, sharpness, wear
- Coating (12%): Surface coating quality, consistency
- Surface (20%): Texture, finish, defects
- Alignment (18%): Edge alignment, symmetry

STRICT+++ RULES (v1.7):
- IDEAL CURVATURE: 2-5% (slight bow preferred for natural character)
- Curvature < 2%: Too flat, lacks dimensional character (penalty applied)
- Curvature 2-5%: IDEAL RANGE (no penalty, full score potential)
- Curvature 5-8%: Minor warp (mild penalty)
- Curvature > 7.5%: Grade cap ≤ 8.0
- Curvature > 12%: Grade cap ≤ 7.5
- Any subgrade < 8.0: Grade cap ≤ 8.0
- Corner radius > 0.35 mm: Grade cap ≤ 8.0
- Always round DOWN (no rounding up)
- Visual deviation override applies

CURVATURE SCORING LOGIC:
- If curvature < 2%: Apply penalty (idealRange[0] - curvature) × 0.4
- If curvature 2-5%: NO PENALTY (ideal aesthetic target)
- If curvature > 5%: Apply penalty (curvature - idealRange[1]) × 1.2

GRADE SCALE:
- PSA 10: Perfect specimen with 2-5% curvature
- PSA 9.5: Near perfect with minor flaws
- PSA 9.0: Excellent with minor wear
- PSA 8.5: Very good with noticeable wear
- PSA 8.0: Good with moderate wear
- PSA 7.5: Fair with significant wear
- PSA 7.0: Poor with major flaws
`;
  } catch (error) {
    console.error('Error reading framework:', error);
    return `${C.activeFrameworkName} - Framework content unavailable`;
  }
}

// Convert image to base64
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error reading image:', error);
    throw error;
  }
}

// Perform AI grading using GPT-4 Vision
export async function gradeSpecimen(specimenId, frontPath, sidePath) {
  try {
    console.log(`Starting AI grading for specimen ${specimenId}`);
    
    // Get framework content
    const frameworkContent = getFrameworkContent();
    
    // Convert images to base64
    const frontImage = imageToBase64(frontPath);
    const sideImage = imageToBase64(sidePath);
    
    // Create the system prompt
    const systemPrompt = `You are an expert cereal grading specialist using ${C.activeFrameworkName}.

${frameworkContent}

Analyze the provided front and side images of a Cinnamon Toast Crunch cereal piece and provide a comprehensive grade following the ${C.activeFrameworkName} framework.

Return your analysis as a JSON object with the following structure:
{
  "frameworkVersion": "${C.activeFrameworkVersion}",
  "grade": "PSA X.X (XX)",
  "curvature": X.X,
  "subgrades": {
    "geometry": X.X,
    "corners": X.X,
    "coating": X.X,
    "surface": X.X,
    "alignment": X.X
  },
  "notes": "Detailed analysis of the specimen including specific observations about each subgrade category and any notable features or flaws."
}

CRITICAL GRADING GUIDELINES FOR v1.7 (Strict+++):
- CURVATURE IS NOW A FEATURE: 2-5% bow is the IDEAL aesthetic target
- Estimate curvature % from side view (height deviation / half-span × 100)
- FLAT pieces (< 2% curvature): Apply mild penalty to geometry (lacks natural character)
- IDEAL pieces (2-5% curvature): NO PENALTY - this is the morphological target
- WARPED pieces (> 5% curvature): Apply stronger penalties as before
- Be strict in your assessment - this is Strict+++ mode
- Look for corner wear, surface defects, coating issues, and geometric imperfections
- Consider the overall condition and any visible damage
- Provide specific, detailed notes about what you observe, especially curvature estimation
- Use the full 1.0-10.0 scale for subgrades
- Always round DOWN - no rounding up
- Apply all strict-mode caps: any subgrade < 8.0 caps total at ≤ 8.0`;

    // Make the API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please grade this Cinnamon Toast Crunch specimen (ID: ${specimenId}) using the Multiview Grading Standards ${C.activeFrameworkVersion}. Analyze both the front and side views carefully. IMPORTANT: Estimate curvature % from the side view and remember that 2-5% curvature is the IDEAL target (not flat).`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${frontImage}`,
                detail: "high"
              }
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${sideImage}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    // Parse the response
    const content = response.choices[0].message.content;
    console.log('GPT Response:', content);
    
    // Try to extract JSON from the response
    let gradingResult;
    try {
      // Look for JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        gradingResult = JSON.parse(jsonMatch[0]);
        
        // Validate the structure
        if (!gradingResult.subgrades) {
          gradingResult.subgrades = {
            geometry: 8.0,
            corners: 8.0,
            coating: 8.0,
            surface: 8.0,
            alignment: 8.0
          };
        }
        
        if (!gradingResult.grade) {
          gradingResult.grade = "PSA 8.0 (NM)";
        }
        
        if (!gradingResult.notes) {
          gradingResult.notes = "AI analysis completed with partial data.";
        }
        
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      console.log('Raw GPT response:', content);
      
      // Fallback to a default response
      gradingResult = {
        frameworkVersion: C.activeFrameworkVersion,
        grade: "PSA 8.0 (NM)",
        curvature: 3.5,
        subgrades: {
          geometry: 8.0,
          corners: 8.0,
          coating: 8.0,
          surface: 8.0,
          alignment: 8.0
        },
        notes: `AI analysis failed - using default grade. Raw response: ${content.substring(0, 200)}...`
      };
    }

    // Validate the result
    if (!gradingResult.grade || !gradingResult.subgrades) {
      throw new Error('Invalid grading result structure');
    }

    console.log(`AI grading completed for ${specimenId}: ${gradingResult.grade}`);
    return gradingResult;

  } catch (error) {
    console.error('Error in AI grading:', error);
    
    // Return a fallback result
    return {
      frameworkVersion: C.activeFrameworkVersion,
      grade: "PSA 8.0 (NM)",
      curvature: 3.5,
      subgrades: {
        geometry: 8.0,
        corners: 8.0,
        coating: 8.0,
        surface: 8.0,
        alignment: 8.0
      },
      notes: `AI grading error: ${error.message}. Using fallback grade.`
    };
  }
}

// Lightweight CTC classifier using vision
export async function classifyCTC(frontPath, sidePath) {
  const frontImage = imageToBase64(frontPath);
  const sideImage = imageToBase64(sidePath);
  const prompt = `You are an expert visual classifier. Determine if BOTH images show a single Cinnamon Toast Crunch cereal piece. The first image should be a front view (square shape), the second should be a side/profile view (may appear elongated or curved). ACCEPT profile views as valid CTC pieces. Respond STRICTLY as JSON with fields: {"isCTC": boolean, "confidence": number, "reason": string}. Only reject if clearly not CTC cereal (screenshots, UI, paper, hands, or completely different foods).`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: [
        { type: 'text', text: 'Classify these two images.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frontImage}` } },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${sideImage}` } }
      ] }
    ],
    max_tokens: 200
  });
  const content = response.choices[0].message.content || '{}';
  try {
    const m = content.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : content);
  } catch {
    return { isCTC: true, confidence: 0.6, reason: 'Fallback allow' };
  }
}

export default { gradeSpecimen, classifyCTC };
