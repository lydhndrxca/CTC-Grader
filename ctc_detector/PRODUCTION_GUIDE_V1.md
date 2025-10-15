# CTC Detector V1 - Production Usage Guide

## ✅ Active Model: V1 (High Recall for Moderation)

**Status:** Ready for production use  
**Model File:** `models/ctc_detector.h5`  
**Use Case:** Active moderation with manual review  
**Performance:** 80.7% accuracy, 96.3% recall (catches 96% of cereals)

---

## 🎯 Why V1 for Moderation?

✅ **Finds 96.3% of cereals** - Only misses 1 out of 149  
✅ **Low false negative rate** - Won't let cereals slip through  
⚠️ **123 false positives** - But acceptable for manual review workflow  
✅ **Better safe than sorry** - Over-detection is preferable for moderation

---

## 📝 Quick Start

### Single Image Prediction:
```bash
cd D:\Projects\CTC_Grading\ctc_detector
.\venv\Scripts\Activate.ps1
python predict.py path/to/image.jpg
```

### Batch Prediction (Python):
```python
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np

# Load model once
model = load_model("models/ctc_detector.h5")

def is_cereal(img_path):
    """Returns True if image likely contains cereal"""
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    
    prediction = model.predict(img_array, verbose=0)[0][0]
    return prediction < 0.5  # Class 0 = cereal

# Use it
if is_cereal("submission.jpg"):
    print("⚠️ Flagged for manual review - possible cereal detected")
else:
    print("✓ Passed - no cereal detected")
```

---

## 📊 Expected Performance

### For Every 100 Images:
- **Real cereals (23):** Will catch ~22 of them ✅
- **Non-cereals (77):** Will flag ~19 as "cereal" ⚠️
- **Total flagged for review:** ~41 images

### False Positive Rate:
- **19%** of non-cereal images will be flagged (123/643 overall)
- These need manual review, but that's the trade-off for high recall

---

## 🔄 Moderation Workflow

```
1. Upload image
   ↓
2. Run V1 detector
   ↓
3a. If "NOT CEREAL" → Auto-approve
3b. If "CEREAL" → Flag for manual review
   ↓
4. Human moderator reviews flagged images
   ↓
5. Approve or reject based on actual content
```

### Expected Workload:
- **Auto-approved:** ~59% of submissions
- **Manual review needed:** ~41% of submissions (includes 96% of actual cereals)

---

## ⚙️ Integration Example

### Flask/FastAPI Endpoint:
```python
from tensorflow.keras.models import load_model
import tensorflow as tf

# Load model at startup (once)
detector_model = load_model("models/ctc_detector.h5")

@app.post("/api/submit_image")
async def submit_image(file: UploadFile):
    # Save uploaded file
    img_path = save_upload(file)
    
    # Run detection
    prediction = detect_cereal(img_path)
    
    if prediction['is_cereal']:
        # Flag for manual review
        return {
            "status": "pending_review",
            "message": "Flagged for manual moderation",
            "confidence": prediction['confidence']
        }
    else:
        # Auto-approve
        return {
            "status": "approved",
            "message": "Submission accepted",
            "confidence": prediction['confidence']
        }

def detect_cereal(img_path):
    img = tf.keras.preprocessing.image.load_img(
        img_path, target_size=(224, 224)
    )
    img_array = tf.keras.preprocessing.image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    
    raw_pred = detector_model.predict(img_array, verbose=0)[0][0]
    is_cereal = raw_pred < 0.5
    
    return {
        'is_cereal': is_cereal,
        'confidence': (1 - raw_pred) if is_cereal else raw_pred,
        'raw_score': float(raw_pred)
    }
```

---

## 📈 Future Improvement Plan

### Phase 1: Data Collection (Current)
- [x] V1 deployed for active moderation
- [ ] Collect more cereal images from flagged submissions
- [ ] Target: ~300 additional cereal images
- [ ] Goal: Balance 1:1 ratio (currently 1:3.3)

### Phase 2: V3 Training (After data collection)
- [ ] Retrain with balanced dataset
- [ ] Use class weights: 1.5x (reduced from 2.15x)
- [ ] Moderate data augmentation
- [ ] Target: 90%+ accuracy with balanced precision/recall

### Phase 3: A/B Testing (Optional)
- [ ] Deploy V3 alongside V1
- [ ] Compare false positive rates
- [ ] Measure moderator workload
- [ ] Switch to V3 if it outperforms

---

## 🛠️ Maintenance

### Model Files:
- **Primary:** `models/ctc_detector.h5` (80.7% accuracy)
- **Backup:** `models/ctc_detector_v2.h5` (for reference)

### Virtual Environment:
```bash
# Activate environment
cd D:\Projects\CTC_Grading\ctc_detector
.\venv\Scripts\Activate.ps1

# Update dependencies if needed
pip install --upgrade tensorflow
```

### Testing:
```bash
# Quick test
python predict.py dataset/cereal/IMG_0380.jpg

# Full analysis
python full_analysis.py
```

---

## 📊 Monitoring Metrics

Track these metrics in production:
- **Total submissions**
- **Auto-approved count** (~59%)
- **Flagged for review count** (~41%)
- **True positives** (cereals correctly caught)
- **False positives** (non-cereals incorrectly flagged)
- **False negatives** (cereals that slipped through - should be rare!)

---

## 🚨 When to Retrain

Consider retraining V3 when:
- ✅ You have 400+ cereal images (currently 149)
- ✅ False positive rate is causing moderator burnout
- ✅ You notice systematic misclassifications
- ✅ Dataset distribution changes significantly

---

## 📞 Support

**Model Location:** `D:\Projects\CTC_Grading\ctc_detector\`  
**Documentation:** `TRAINING_RESULTS_SUMMARY.md`  
**Analysis Tools:** `full_analysis.py`, `predict.py`  

**Quick Commands:**
```bash
# Test single image
python predict.py path/to/image.jpg

# Analyze model performance
python full_analysis.py

# Find optimal threshold (if needed)
python find_optimal_threshold.py
```

---

## ✅ Production Checklist

- [x] Model V1 trained (80.7% accuracy)
- [x] Prediction script created
- [x] Performance analyzed
- [x] Documentation complete
- [ ] Integration with moderation system
- [ ] Monitoring dashboard set up
- [ ] Start collecting more cereal images
- [ ] Plan V3 training timeline

---

*Last Updated: October 13, 2025*  
*Model Version: V1 (ctc_detector.h5)*  
*Status: Production Ready ✅*


