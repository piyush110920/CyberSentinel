import requests
import json
import random
import time
import os
import pandas as pd

API_URL = "http://localhost:3000/api/analyze"
DATA_DIR = os.path.join(os.path.dirname(__file__), "Data")
CSV_FILE = os.path.join(DATA_DIR, "CICIDS2017_sample_0.02_fs.csv")

def generate_random_features():
    # If no CSV, send 24 random float features.
    return [random.random() for _ in range(24)]

def test():
    print(f"Testing ML Pipeline over to Node.js backend at {API_URL}...")
    
    # Try to load real features if available
    df = None
    if os.path.exists(CSV_FILE):
        try:
            df = pd.read_csv(CSV_FILE).drop(['Label'], axis=1, errors='ignore')
            print(f"Loaded real data from {CSV_FILE} for testing.")
        except Exception as e:
            print(f"Could not load CSV: {e}")

    count = 0
    while True:
        try:
            features = []
            if df is not None and not df.empty:
                # Get a sequential or random row
                row_idx = random.randint(0, len(df)-1)
                row = df.iloc[row_idx]
                row = row.where(pd.notnull(row), 0) # replace NaN
                features = row.tolist()
            else:
                features = generate_random_features()
                
            payload = {
                "source_ip": f"192.168.1.{random.randint(2, 254)}",
                "features": features
            }
            
            res = requests.post(API_URL, json=payload)
            print(res.json())
        except Exception as e:
            print("Error connecting to backend:", e)
            
        count += 1
        time.sleep(random.uniform(1.0, 3.0)) # sleep 1-3 seconds between requests

if __name__ == "__main__":
    test()
