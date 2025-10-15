"""
CTC Detector - Prediction Script
Outputs JSON for Node.js integration
"""
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import sys
import os
import json

def predict_image(img_path, model_version="v1"):
    """
    Predict if an image contains cereal
    
    Args:
        img_path: Path to image file
        model_version: "v1" (high recall) or "v2" (high precision)
    
    Returns:
        dict with prediction results
    """
    # Load appropriate model
    if model_version == "v1":
        model_path = "models/ctc_detector.h5"
        threshold = 0.5
    else:
        model_path = "models/ctc_detector_v2.h5"
        threshold = 0.90
    
    model = load_model(model_path)
    
    # Load and preprocess image
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # Normalize
    
    # Predict
    prediction = model.predict(img_array, verbose=0)[0][0]
    
    # Interpret (0 = cereal, 1 = not cereal)
    is_cereal = prediction < threshold
    confidence = (1 - prediction) if is_cereal else prediction
    
    return {
        'isCTC': is_cereal,  # Changed from is_cereal to match Node.js
        'confidence': float(confidence),
        'raw_prediction': float(prediction),
        'threshold': threshold,
        'reason': 'TensorFlow V1 detector (96.3% recall)'
    }


if __name__ == "__main__":
    # Check arguments
    if len(sys.argv) < 2:
        # Output JSON error for Node.js
        print(json.dumps({
            'isCTC': True,
            'confidence': 0.0,
            'reason': 'No image path provided'
        }))
        sys.exit(1)
    
    img_path = sys.argv[1]
    model_version = sys.argv[2] if len(sys.argv) > 2 else "v1"
    
    # Validate inputs
    if not os.path.exists(img_path):
        print(json.dumps({
            'isCTC': False,
            'confidence': 0.0,
            'reason': f'Image not found: {img_path}'
        }))
        sys.exit(1)
    
    if model_version not in ["v1", "v2"]:
        print(json.dumps({
            'isCTC': True,
            'confidence': 0.0,
            'reason': f'Invalid model version: {model_version}'
        }))
        sys.exit(1)
    
    # Predict
    try:
        result = predict_image(img_path, model_version)
        # Output JSON for Node.js integration
        print(json.dumps(result))
    except Exception as e:
        # Output error as JSON
        print(json.dumps({
            'isCTC': True,
            'confidence': 0.0,
            'reason': f'Prediction error: {str(e)}'
        }))
        sys.exit(1)
