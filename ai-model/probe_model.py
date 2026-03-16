import traceback
import pickle
import joblib

with open("probe_out_utf8.txt", "w", encoding="utf-8") as out:
    def probe_model(filename):
        out.write(f"--- Probing {filename} ---\n")
        try:
            model = joblib.load(filename)
            out.write("Successfully loaded with joblib.\n")
            out.write(f"Type: {type(model)}\n")
        except Exception as e:
            out.write(f"Failed to load with joblib: {e}\n")
            try:
                with open(filename, 'rb') as f:
                    model = pickle.load(f)
                out.write("Successfully loaded with pickle.\n")
                out.write(f"Type: {type(model)}\n")
            except Exception as e2:
                out.write(f"Failed to load with pickle: {e2}\n")
                out.write(traceback.format_exc() + "\n")
        out.write("\n")

    probe_model("model1.pkl")
    probe_model("model2.pkl")
