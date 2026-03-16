import joblib
import numpy as np
for filename in ["model1.pkl", "model2.pkl"]:
    try:
        model = joblib.load(filename)
        print(f"{filename} type: {type(model)}")
        if hasattr(model, 'n_features_in_'):
            print(f"{filename} features expected: {model.n_features_in_}")
        elif hasattr(model, 'feature_importances_'):
            print(f"{filename} features expected (from importances): {len(model.feature_importances_)}")
    except Exception as e:
        print(f"Failed to load {filename}: {e}")
