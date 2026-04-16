from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import traceback
import sys
import numpy as np

app = Flask(__name__)
CORS(app)

# Attempt to load Both Models
model1, model2 = None, None
MODEL1_PATH = "model1.pkl"
MODEL2_PATH = "model2.pkl"

try:
    print(f"Loading {MODEL1_PATH} (CICIDS2017 XGBoost)...", file=sys.stderr)
    model1 = joblib.load(MODEL1_PATH)
    print("Model 1 loaded successfully.", file=sys.stderr)
except Exception as e:
    print(f"Failed to load model 1: {e}", file=sys.stderr)

try:
    print(f"Loading {MODEL2_PATH} (5G-NIDD LightGBM)...", file=sys.stderr)
    model2 = joblib.load(MODEL2_PATH)
    print("Model 2 loaded successfully.", file=sys.stderr)
except Exception as e:
    print(f"Failed to load model 2: {e}", file=sys.stderr)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model1_loaded": model1 is not None, "model2_loaded": model2 is not None})

@app.route('/predict', methods=['POST'])
def predict():
    if model1 is None and model2 is None:
        return jsonify({"error": "No Models loaded properly"}), 500
        
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        # Expecting either a list of features or a dictionary of features
        if "features" in data:
            features = data["features"]
        else:
            features = data
            
        if isinstance(features, dict):
            # Convert dict to values
            features = list(features.values())
            
        # Ensure it's a 2D array for prediction: [[f1, f2, ...]]
        if isinstance(features, list) and not isinstance(features[0], list):
            features = [features]
            
        features_array = np.array(features)
        
        # Deep evaluate with Model 1 (Needs 24 Features max)
        prob1 = 0.0
        pred1 = 0
        if model1 is not None:
            features_m1 = features_array.copy()
            if hasattr(model1, 'n_features_in_') and features_m1.shape[1] > model1.n_features_in_:
                features_m1 = features_m1[:, :model1.n_features_in_]
            elif hasattr(model1, 'feature_importances_') and features_m1.shape[1] > len(model1.feature_importances_):
                features_m1 = features_m1[:, :len(model1.feature_importances_)]
            
            p1 = model1.predict(features_m1)
            pred1 = int(p1[0]) if isinstance(p1, np.ndarray) else p1[0]
            
            if hasattr(model1, "predict_proba"):
                probs1 = model1.predict_proba(features_m1)
                prob1 = float(probs1[0][1]) if len(probs1[0]) > 1 else float(probs1[0][0])
                
        # Deep evaluate with Model 2 (Needs 30 Features max)
        prob2 = 0.0
        pred2 = 0
        if model2 is not None:
            features_m2 = features_array.copy()
            # If input has FEWER features than Model 2 expects (24 < 30), pad with zeros
            target_features = 30
            if hasattr(model2, 'n_features_in_'):
                target_features = model2.n_features_in_
            
            if features_m2.shape[1] < target_features:
                padding = np.zeros((features_m2.shape[0], target_features - features_m2.shape[1]))
                features_m2 = np.hstack((features_m2, padding))
            # If input has MORE features, truncate
            elif features_m2.shape[1] > target_features:
                features_m2 = features_m2[:, :target_features]
                
            p2 = model2.predict(features_m2)
            pred2 = int(p2[0]) if isinstance(p2, np.ndarray) else p2[0]
            
            if hasattr(model2, "predict_proba"):
                probs2 = model2.predict_proba(features_m2)
                prob2 = float(probs2[0][1]) if len(probs2[0]) > 1 else float(probs2[0][0])
                
        # Consolidate results - if either model flags a threat, we treat it as a threat
        merged_prediction = max(pred1, pred2)
        merged_probability = max(prob1, prob2)
            
        result = {
            "prediction": merged_prediction,
            "threat_probability": merged_probability,
            "model1_probability": prob1,
            "model2_probability": prob2
        }
        
        # In CICIDS2017 & 5G-NIDD encoded, >0 implies an anomaly/threat. Or > 0.5 percent prob
        result["is_threat"] = bool(result["prediction"] > 0 or result["threat_probability"] > 0.5)
        
        return jsonify(result)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)


# hello world 

print("hello world")