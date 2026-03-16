import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MongoDB URI and Database Name from .env
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "CyberSentinelData")

if not MONGO_URI:
    raise ValueError("MONGO_URI is not set in the .env file. Please add your MongoDB Atlas connection string.")

print(f"Connecting to MongoDB Atlas...")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Define the paths to your CSV files
data_dir = os.path.join(os.path.dirname(__file__), "Data")

csv_files = [
    "5G-NIDD_0.04.csv",
    "5G-NIDD_0.04_fs.csv",
    "CICIDS2017_sample_0.02.csv",
    "CICIDS2017_sample_0.02_fs.csv"
]

for filename in csv_files:
    file_path = os.path.join(data_dir, filename)
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}. Skipping.")
        continue
    
    # Use the filename (without extension) as the collection name
    collection_name = os.path.splitext(filename)[0]
    collection = db[collection_name]
    
    print(f"Reading {filename}...")
    try:
        # Read a smaller chunk size to avoid memory issues with large CSVs
        chunk_size = 10000
        total_inserted = 0
        
        for chunk in pd.read_csv(file_path, chunksize=chunk_size):
            # Convert NaN to None so MongoDB handles them properly
            chunk = chunk.where(pd.notnull(chunk), None)
            
            # Convert dataframe chunk to list of dictionaries
            records = chunk.to_dict(orient='records')
            
            if records:
                # Insert records into MongoDB
                collection.insert_many(records)
                total_inserted += len(records)
                print(f"  Inserted {total_inserted} rows so far into {collection_name}...")
                
        print(f"✅ Finished uploading {filename}! Total rows: {total_inserted}\n")
        
    except Exception as e:
        print(f"Error uploading {filename}: {e}\n")

print("All uploads completed successfully!")
