import joblib
import numpy as np
model = joblib.load("model1.pkl")
print(f"Model type: {type(model)}")
if hasattr(model, 'n_features_in_'):
    print(f"Features expected: {model.n_features_in_}")
else:
    print("Could not determine number of features from model object.")
