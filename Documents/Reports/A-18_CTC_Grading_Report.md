# Multiview Official Grading Report

## Header / Identification
- **Specimen ID:** A-18
- **Date/Time:** 2025-10-06T01:21:53.498Z
- **Grading Framework:** v1.5 Strict++
- **Verification:** VO
- **Overall Grade:** PSA 8.0 (Good)

## Photo Set Metadata
| View | File Path | Dimensions | Notes |
|------|-----------|------------|-------|
| Front | D:\Projects\CTC_Grading\Specimens\A-18\A-18_front.jpg | Auto-detected | Primary view for surface analysis |
| Side | D:\Projects\CTC_Grading\Specimens\A-18\A-18_side.jpg | Auto-detected | Curvature and edge analysis |

## Subgrade Breakdown
| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Geometry | 8 | 30% | Overall shape and proportions |
| Corners | 7.5 | 20% | Corner radius and sharpness |
| Coating | 8.5 | 12% | Surface coating quality |
| Surface | 8 | 20% | Texture and finish |
| Alignment | 8 | 18% | Edge alignment and symmetry |

**Weighted Mean:** 7.96  
**Curvature %:** 4.60 (Nominal camber)  
**Overall Grade:** PSA 8.0 (Good)

## Detailed Interpretation
The specimen shows a generally good shape but lacks perfect symmetry, with slight irregularities in its geometry. The corners exhibit noticeable wear, particularly on the top left, which affects the overall corner grade. The coating is fairly consistent, with a good distribution of cinnamon and sugar, though not perfectly even. The surface texture is typical for a Cinnamon Toast Crunch piece, with some minor defects and roughness. Edge alignment is decent but not perfectly straight, contributing to a moderate alignment score.

## Issues / Exceptions
None reported.

## Framework Application
This specimen was graded using v1.5 Strict++ standards, applying strict deductive grading principles with no rounding up and additive flaw penalties.

## Measurements & Weight
Length × Width × Thickness: not recorded  
Weight: not recorded


---

## AI Technical Breakdown  
**Framework:** v1.5 Strict++  
**AI Confidence:** 94.5%  
**Curvature:** 4.60% (Nominal camber band)

---

### Image Normalization
- **Color Space:** LAB  
- **Histogram Equalization:** CLAHE (clip=2.0, grid=8×8)  
- **Background Segmentation:** Otsu–Sauvola hybrid thresholding  
- **Object Mask Confidence:** 0.982  
- **Detected Contour Vertices:** 142  
These preprocessing stages correct iPhone lighting skew and isolate cereal geometry for curvature and ridge mapping.

---

### Geometric Reconstruction
| Metric | Value | Interpretation |
|--------|-------:|----------------|
| PCA Aspect Ratio | 1.004 : 1 | Nominal symmetry |
| Rotational Skew | 1.30° | Slight lateral bias |
| Curvature Deviation | 4.60% | Nominal camber |
| Vertex Angle Variance | 2.73° | Stable corner geometry |

Curvature mapping performed by differential height estimation under Lambertian assumption.  
Cap enforcement: **No**.

---

### Ridge & Surface Analysis
| Submetric | Value | Units | Description |
|------------|-------:|-------|-------------|
| FFT Ridge Frequency | 0.380 | cycles/mm | Grain periodicity |
| Ridge Variance | 2.04 | % | Deviation from A-REF periodic ridge spacing |
| Pock Density | 1.50 | /cm² | Localized micro-defects |
| Ridge Integrity Index | 8.60 | /10 | Structural topography stability |

Interpretation: minor pocking under angled light; ridge map variance remains within Multiview tolerance envelope.

---

### Coating & Luminance Uniformity
| Submetric | Value | Units | Description |
|------------|-------:|-------|-------------|
| Luminance σ (HSV V-channel) | 7.35 | % | Distribution variance |
| Chromatic Skew | 0.88 | ΔE | Cinnamon hue offset |
| Granule Cluster Ratio | 1.12 | % | Detected granular aggregation |
| Coverage Balance | 9.05 | /10 | Evenness metric |

Result: even distribution with balanced sheen — acceptable variance.

---

### Edge & Corner Diagnostics
| Metric | Value | Units | Observation |
|---------|-------:|-------|-------------|
| Edge Compression | 1.00 | % thickness loss | Minor compression detected |
| Corner Radius (avg) | 0.28 | mm | minor rounding visible |
| Edge Continuity | 8.00 | /10 | Consistency across 4 edges |
| Corner Variance | 2.73 | ° | Angular deviation consistency |

Edges analyzed by contour differential; corner sharpness by local curvature maxima.  
Detected degradation consistent with PSA 8.0 (Good) classification.

---

### Weighted Grade Computation
| Category | Subgrade | Weight | Contribution |
|-----------|----------:|-------:|--------------:|
| Geometry / Flatness | 8 | 0.30 | 2.40 |
| Corners | 7.5 | 0.20 | 1.50 |
| Surface Integrity | 8 | 0.20 | 1.60 |
| Coating Uniformity | 8.5 | 0.12 | 1.02 |
| Alignment / Edges | 8 | 0.18 | 1.44 |
| **Weighted Mean** |  |  | **7.96** |

Final grade computed via weighted mean → curvature cap → deterministic rounding-down.  
Outcome: **PSA 8.0 (Good)**, per Multiview Strict++ deductive enforcement.

---

### System Context
All numeric metrics produced by deterministic image-analysis pipelines with fixed random seeds (seed=42) to ensure reproducibility.  
No stochastic sampling applied during evaluation; all variance arises from specimen geometry alone.  

This system assumes imperfection until proven otherwise.  
All results represent verified outputs of **Multiview CTC Grader v2.0** operating under **Framework v1.5 Strict++** —  
where curvature governs geometry, geometry governs grade, and grade governs meaning.  
  

## Report Generation
- **Generated:** 2025-10-06T01:21:53.498Z
- **System:** Multiview CTC Grader v2.0
- **Report Format:** Multiview Official Grading Report Format v1.2
 - **Verification Type:** VO

---
*This report was generated automatically by the Multiview CTC Grading System.*

---

## System Hash & Provenance Record  
**Multiview Digital Integrity Hash (SHA-256):** 8fa00f87…f12335cf  
*(Full hash stored in archive metadata)*  

**Generated:** 2025-10-06T01:21:53.505Z  
**System:** Multiview CTC Grader v2.0 • Framework v1.5 Strict++  
**Seed:** 42  
**Verification Type:** VO  

This cryptographic digest links the specimen’s imagery, analysis, and report into a single verifiable record.  
Tampering with any source file will invalidate the hash upon re-verification.  
A complete copy of the digest is archived within Multiview’s internal ledger for future audit.  
