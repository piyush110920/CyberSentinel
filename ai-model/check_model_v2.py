import joblib
import numpy as np
model = joblib.load("model1.pkl")
print(f"Model type: {type(model)}")
if hasattr(model, 'feature_name_'):
    print(f"Feature names: {model.feature_name_}")
    print(f"Count: {len(model.feature_name_)}")
elif hasattr(model, 'n_features_in_'):
    print(f"Features expected (count only): {model.n_features_in_}")
else:
    print("Could not determine feature names or count from model object.")
