import pandas as pd
import os
csv_file = "Data/CICIDS2017_sample_0.02_fs.csv"
if os.path.exists(csv_file):
    df = pd.read_csv(csv_file)
    print(f"Columns: {df.columns.tolist()}")
    print(f"Number of columns: {len(df.columns)}")
    if 'Label' in df.columns:
        print("Label column is present.")
        print(f"Features after dropping Label: {len(df.columns) - 1}")
else:
    print("CSV file not found.")
