# Multiview Grading Standards — v1.7 Strict+++

**Updated:** October 2025  
**Supersedes:** v1.6 Strict++  
**Framework:** Multiview Technology  
**Classification:** MV (Measurement-Verified) / VO (Visual-Only)

---

## 1. Purpose

This revision redefines the **A-REF ideal specimen** to favor **natural character and bowing**, improving aesthetic accuracy while retaining all strict-mode constraints. Previous frameworks penalized any deviation from perfect flatness; v1.7 recognizes that **slight curvature (2–5%) is the morphological ideal** for Cinnamon Toast Crunch specimens.

### Key Changes from v1.6:
- **Curvature 2–5% is now the IDEAL target** (not flat)
- Flat pieces (< 2% curvature) receive mild penalties for lacking dimensional character
- Warped pieces (> 5% curvature) continue to receive penalties as before
- All other Strict++ rules remain in effect

---

## 2. Ideal Specimen — A-REF (v1.7)

| Property | Description | Target |
|----------|-------------|--------|
| **Curvature** | Slight concave bow preferred | **2 – 5%** (ideal) |
| **Corners** | Four clean 90° tips | Radius ≤ 0.30 mm |
| **Edges** | Continuous, uncompressed | Deflection ≤ 0.20 mm |
| **Surface Integrity** | Ridge pattern intact | ≤ 2 pocks per cm² |
| **Coating Distribution** | Even cinnamon/sugar coverage | Luminance variance ≤ 8% |

### Philosophy
A perfectly flat piece suggests production rigidity or post-manufacturing compression. The **ideal specimen exhibits gentle curvature (2–5%)**, indicating proper expansion during baking and natural stress distribution. This dimensional character is now recognized as aesthetically superior.

---

## 3. Revised Curvature Interpretation

| Condition | Curvature % | Interpretation | Grade Cap |
|-----------|-------------|----------------|-----------|
| **Slight Bow (Ideal)** | **2 – 5%** | **Aesthetic target** | — |
| Flat / Rigid | < 2% | Lacks dimensional character | ≤ 9.5 |
| Minor Warp | 5 – 8% | Acceptable deviation | ≤ 9.0 |
| Warped | 8 – 12% | Visible curvature | ≤ 8.0 |
| Severe Warp | > 12% | Structural deformity | ≤ 7.5 |

### Curvature Calculation
```
Curvature % = (Maximum Height Deviation / Half-Span Length) × 100
```

**Example:**
- Piece length: 20 mm → Half-span: 10 mm
- Maximum bow height: 0.4 mm
- Curvature: (0.4 / 10) × 100 = **4.0%** (IDEAL)

---

## 4. Subgrade Categories and Weights

| Category | Weight | Criteria |
|----------|--------|----------|
| **Geometry / Flatness** | **30%** | Bowing, warping, aspect ratio, shape accuracy |
| **Corners** | **20%** | Sharpness, chips, rounding, symmetry |
| **Surface Integrity** | **20%** | Ridge clarity, pock density, scarring |
| **Edges / Alignment** | **18%** | Compression, cracks, uniformity |
| **Coating Uniformity** | **12%** | Evenness, granule distribution, bare spots |

### Geometry Scoring Logic (v1.7 Update)

**Ideal Curvature Range:** 2–5%

```javascript
let idealRange = [2, 5]; // New ideal curvature window
let curvaturePenalty = 0;

if (curvature < idealRange[0]) {
  // Too flat — lacks character
  curvaturePenalty = (idealRange[0] - curvature) × 0.4; // mild deduction
} else if (curvature > idealRange[1]) {
  // Too warped — same as before
  curvaturePenalty = (curvature - idealRange[1]) × 1.2; // stronger penalty
}

let geometryScore = 10 - curvaturePenalty;
geometryScore = Math.max(Math.min(geometryScore, 10), 0);
```

**Examples:**
- **0% curvature (perfectly flat):** Penalty = (2 - 0) × 0.4 = 0.8 → Score = 9.2
- **3.5% curvature (ideal):** Penalty = 0 → Score = 10.0
- **8% curvature (warped):** Penalty = (8 - 5) × 1.2 = 3.6 → Score = 6.4

---

## 5. Automatic Penalty Caps

Same as v1.6 Strict++:

| Condition | Grade Cap |
|-----------|-----------|
| Any subgrade < 8.0 | Overall ≤ 8.0 |
| Curvature > 7.5% | Overall ≤ 8.0 |
| Curvature > 12% | Overall ≤ 7.5 |
| Corner radius > 0.35 mm | Overall ≤ 8.0 |
| Visual deviation override | Manual adjustment down |

### Rounding Rules
- **Always round DOWN** (floor to nearest 0.5)
- 8.49 → 8.0
- 8.50 → 8.5
- 8.74 → 8.5
- 8.99 → 8.5

---

## 6. AI Technical Process (Summary)

### Image Normalization
1. **HEIC→JPEG conversion** (if applicable)
2. **LAB color space** transformation
3. **Contrast equalization** for consistent analysis
4. **Noise reduction** via bilateral filtering

### Segmentation
1. **Object mask** via adaptive threshold
2. **Morphological cleanup** (dilation → erosion)
3. **Contour extraction** for edge detection
4. **Background removal** for isolation

### Corner & Contour Detection
1. **Harris/Shi-Tomasi** corner detection
2. **PCA analysis** for aspect ratio
3. **Convex hull** for shape validation
4. **Symmetry analysis** for alignment scoring

### Curvature Mapping
1. **Height profile extraction** from side view
2. **Polynomial fitting** (degree 2–3)
3. **Maximum deviation calculation**
4. **Curvature % computation**
5. **Ideal range comparison (2–5%)**

### Scoring
1. **Subgrades computed** per category (0–10 scale)
2. **Weights applied** (Geometry 30%, Corners 20%, etc.)
3. **Curvature window bias:** Penalties for < 2% or > 5%
4. **Strict enforcement:** All caps applied
5. **Deterministic rounding:** Always floor

### Output
1. **JSON structure:**
   ```json
   {
     "frameworkVersion": "v1.7 (Strict+++)",
     "grade": "PSA X.X (XX)",
     "curvature": X.X,
     "subgrades": {
       "geometry": X.X,
       "corners": X.X,
       "coating": X.X,
       "surface": X.X,
       "alignment": X.X
     },
     "notes": "Detailed analysis..."
   }
   ```
2. **4-page PDF report** (Multiview Official Grading Report Format v1.2)
3. **Markdown source** for archival
4. **SHA-256 hash** for provenance

---

## 7. Certification

**Framework:** Multiview v1.7 (Strict+++)  
**Classification:**
- **MV** (Measurement-Verified) — Calipers + digital scale used
- **VO** (Visual-Only) — Photographic analysis only

**Authored by:** Shawn Wiederhoeft • Multiview Technology  
**Date:** October 2025  
**Status:** Active

---

## 8. PSA Grade Scale Reference

| PSA Grade | Label | Description | Requirements |
|-----------|-------|-------------|--------------|
| **10.0** | Gem Mint | Perfect specimen | All subgrades ≥ 9.8, curvature 2–5%, confidence ≥ 95% |
| **9.5** | Mint+ | Near-perfect | All subgrades ≥ 9.0, curvature 2–5% |
| **9.0** | Mint | Excellent | All subgrades ≥ 8.5, minor flaws |
| **8.5** | NM-MT+ | Very good | Minor wear, curvature < 8% |
| **8.0** | NM-MT | Good | Moderate wear, curvature < 8% |
| **7.5** | NM | Fair | Noticeable wear, curvature 8–12% |
| **7.0** | EX-MT | Acceptable | Visible flaws, curvature < 12% |
| **6.0** | EX | Poor | Significant damage, curvature > 12% |

---

## 9. Comparison with v1.6

| Aspect | v1.6 Strict++ | v1.7 Strict+++ |
|--------|---------------|----------------|
| **Ideal Curvature** | 0–3% (flat preferred) | **2–5% (bow preferred)** |
| **Flat Penalty** | None | **0.4× penalty per % below 2%** |
| **Warp Penalty** | 1.2× penalty per % > 3% | **1.2× penalty per % > 5%** |
| **PSA 10 Requirement** | Curvature ≤ 3% | **Curvature 2–5%** |
| **Grade Caps** | Same | Same (unchanged) |
| **Rounding** | Floor | Floor (unchanged) |

---

## 10. Examples

### Example A: Perfectly Flat Piece
**Measurements:**
- Curvature: 0.5%
- Corners: 9.5
- Surface: 9.0
- Coating: 9.0
- Alignment: 9.0

**v1.6 Analysis:**
- Geometry: 10.0 (perfectly flat, no penalty)
- Weighted mean: 9.49
- **Grade: PSA 9.5 (Mint+)**

**v1.7 Analysis:**
- Geometry: 10.0 - (2 - 0.5) × 0.4 = **9.4** (too flat)
- Weighted mean: 9.28
- **Grade: PSA 9.0 (Mint)** (rounded down from 9.25)

**Interpretation:** Flat pieces now receive mild penalties for lacking natural character.

---

### Example B: Slightly Bowed Piece (Ideal)
**Measurements:**
- Curvature: 3.5%
- Corners: 9.0
- Surface: 8.5
- Coating: 8.5
- Alignment: 9.0

**v1.6 Analysis:**
- Geometry: 10.0 - (3.5 - 3) × 1.2 = **9.4** (penalty for > 3%)
- Weighted mean: 8.90
- **Grade: PSA 8.5 (NM-MT+)**

**v1.7 Analysis:**
- Geometry: **10.0** (3.5% is in ideal 2–5% range, no penalty)
- Weighted mean: 9.08
- **Grade: PSA 9.0 (Mint)**

**Interpretation:** Pieces with 2–5% curvature now score higher in v1.7.

---

### Example C: Warped Piece
**Measurements:**
- Curvature: 9.5%
- Corners: 8.0
- Surface: 8.0
- Coating: 8.0
- Alignment: 8.0

**v1.6 Analysis:**
- Geometry: 10.0 - (9.5 - 3) × 1.2 = **2.2**
- Grade cap: ≤ 8.0 (curvature > 7.5%)
- **Grade: PSA 8.0 (NM-MT)** (capped)

**v1.7 Analysis:**
- Geometry: 10.0 - (9.5 - 5) × 1.2 = **4.6**
- Grade cap: ≤ 8.0 (curvature > 7.5%)
- **Grade: PSA 8.0 (NM-MT)** (capped)

**Interpretation:** Warped pieces (> 7.5%) still capped at 8.0 in both versions.

---

## 11. Visual Deviation Override

AI analysis may be **manually overridden** if visual inspection reveals:
- **Severe coating defects** not captured in photos
- **Hidden cracks** visible under magnification
- **Corner chips** obscured by angle
- **Surface damage** not resolved in imagery

Override always results in **grade reduction**, never increase. Documented in notes section.

---

## 12. Archival Policy

Every document—complete or erroneous—is **permanently preserved** for provenance continuity. Error or incomplete grades are recorded with the same status as valid reports.

**Storage:**
- `Documents/Reports/` - Official PDF reports
- `Specimens/A-##/` - Per-specimen copies + JSON metadata
- `Documents/Errors/` - Invalid submission reports
- Database: SQLite (`ctc_grades.db`) with full-text search

---

## 13. Provenance & System Hash

Every report includes a **SHA-256 cryptographic hash** computed from:
1. Front image data
2. Side image data
3. Markdown report content
4. Timestamp

**Format:**
```
Multiview Digital Integrity Hash (SHA-256):
a1b2c3d4e5f6789... (64 characters)

Generated: 2025-10-13T12:34:56.789Z
System: Multiview CTC Grader v2.0 • Framework v1.7 Strict+++
Seed: 42
Verification Type: VO
```

This hash links the specimen's imagery, analysis, and report generation into a **tamper-evident provenance record**.

---

## 14. API Integration

### JSON Response Structure
```json
{
  "frameworkVersion": "v1.7 (Strict+++)",
  "grade": "PSA 9.0 (Mint)",
  "curvature": 3.5,
  "subgrades": {
    "geometry": 10.0,
    "corners": 9.0,
    "coating": 8.5,
    "surface": 8.5,
    "alignment": 9.0
  },
  "notes": "Specimen exhibits ideal curvature (3.5%) within the 2-5% morphological target range. All corners sharp with minimal rounding. Surface ridges well-preserved with minor pocking under magnification. Coating distribution balanced across all quadrants with slight variance in northwest region. Edges show excellent alignment with no compression artifacts. Overall excellent preservation warranting Mint classification."
}
```

### Curvature Field (New in v1.7)
The `curvature` field is now **required** in all AI responses. This enables:
- Transparent curvature calculation
- Historical trend analysis
- Statistical distribution studies
- Archive filtering by curvature range

---

## 15. Migration Notes

### For Existing Specimens
- **No retroactive regrading required** - v1.6 grades remain valid
- v1.7 applies to **new submissions only** (October 2025 onward)
- Database schema updated to include `curvature` column
- Reports display framework version for historical context

### For Developers
1. Update `ai-grader.js` to include curvature scoring logic
2. Ensure GPT prompts explicitly request curvature estimation
3. Update PDF report templates to display curvature %
4. Modify database schema to store curvature values
5. Update config to recognize `v1_7_StrictPlusPlusPlusPlus` filename pattern

---

## 16. Future Enhancements (v1.8+)

Potential future improvements under consideration:
- **3D scanning integration** for precise curvature mapping
- **Time-lapse degradation tracking** for aging studies
- **Rarity indexing** based on curvature distribution
- **Multi-angle photogrammetry** for surface topology
- **Machine learning curvature prediction** from front view only

---

## 17. Contact & Support

**Framework Author:** Shawn Wiederhoeft  
**Organization:** Multiview Technology  
**Email:** [Contact through system]  
**Documentation:** `D:\Projects\CTC_Grading\Documents\`  
**Archive:** `D:\Projects\CTC_Grading\Specimens\`

---

## Appendix A: Mathematical Foundations

### Curvature Estimation Algorithm
```python
def estimate_curvature(side_image):
    # Extract height profile from side view
    contour = detect_contour(side_image)
    heights = extract_height_profile(contour)
    
    # Fit polynomial (degree 2 for parabolic bow)
    poly = np.polyfit(range(len(heights)), heights, deg=2)
    curve = np.polyval(poly, range(len(heights)))
    
    # Calculate maximum deviation
    max_deviation = np.max(np.abs(heights - curve))
    half_span = len(heights) / 2
    
    # Compute curvature percentage
    curvature_pct = (max_deviation / half_span) * 100
    return curvature_pct
```

### Geometry Score Computation
```python
def compute_geometry_score(curvature_pct):
    ideal_min = 2.0
    ideal_max = 5.0
    
    if curvature_pct < ideal_min:
        # Too flat penalty
        penalty = (ideal_min - curvature_pct) * 0.4
    elif curvature_pct > ideal_max:
        # Too warped penalty
        penalty = (curvature_pct - ideal_max) * 1.2
    else:
        # Within ideal range
        penalty = 0
    
    score = 10.0 - penalty
    return max(0, min(10, score))
```

---

## Appendix B: Grade Distribution Analysis

Based on 32 specimens graded under v1.6, projected v1.7 impact:

| Original Grade (v1.6) | Projected Grade (v1.7) | Change |
|----------------------|------------------------|--------|
| PSA 9.5 (flat, < 2%) | PSA 9.0–9.5 | ↓ 0–0.5 |
| PSA 9.0 (2–5% curve) | PSA 9.0–9.5 | ↑ 0–0.5 |
| PSA 8.5 (5–8% curve) | PSA 8.0–8.5 | ↓ 0–0.5 |
| PSA 8.0 (> 8% curve) | PSA 8.0 | — (same) |

**Net Effect:** Slight redistribution toward specimens with natural curvature.

---

**END OF DOCUMENT**

---

**Multiview Grading Standards v1.7 (Strict+++)**  
**October 2025 • Multiview Technology**  
**"Why not take the most ordinary thing and bury it in paperwork until it feels important?"**


