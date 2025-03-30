# client.py
from flask import Flask, jsonify, send_from_directory
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import MDS
from sklearn.cluster import KMeans
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)

# Load dataset
data = pd.read_csv("merged_songs.csv")
print("Columns in dataset:", data.columns.tolist())

# Define numerical columns (assume remaining are categorical)
numerical_cols = [
    'duration_ms', 'explicit', 'year', 'popularity', 'danceability', 
    'energy', 'key', 'loudness', 'mode', 'speechiness', 'acousticness', 
    'instrumentalness', 'liveness', 'valence', 'tempo', 'rank', 
    'last-week', 'peak-rank', 'weeks-on-board'
]

# Drop rows with missing values in the numerical columns
data = data.dropna(subset=numerical_cols)

# Scale numerical data and compute clusters (for coloring)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(data[numerical_cols])
kmeans = KMeans(n_clusters=3, random_state=42)
data['cluster'] = kmeans.fit_predict(X_scaled)

### Endpoint 1: MDS for observations (random sample)
@app.route('/data/mds_obs')
def mds_obs():
    # Random sampling (if too many rows)
    sample_size = 100
    if data.shape[0] > sample_size:
        sample_indices = np.random.choice(data.index, size=sample_size, replace=False)
        data_sample = data.loc[sample_indices]
        X_sample = scaler.transform(data_sample[numerical_cols])
    else:
        data_sample = data.copy()
        X_sample = X_scaled

    # Compute MDS (Euclidean)
    mds = MDS(n_components=2, random_state=42)
    mds_coords = mds.fit_transform(X_sample)

    # Build output: list of dicts
    out = []
    for i, idx in enumerate(data_sample.index):
        out.append({
            "id": int(idx),
            "Dim1": float(mds_coords[i, 0]),
            "Dim2": float(mds_coords[i, 1]),
            "cluster": int(data_sample.loc[idx, 'cluster'])
        })
    return jsonify(out)

### Endpoint 2: MDS for variables (using (1-|correlation|) as distance)
@app.route('/data/mds_vars')
def mds_vars():
    # Compute correlation matrix for numerical features
    corr = data[numerical_cols].corr()
    distance = 1 - corr.abs()
    
    # Compute MDS on the precomputed distance matrix
    mds_model = MDS(n_components=2, dissimilarity='precomputed', random_state=42)
    vars_coords = mds_model.fit_transform(distance)
    
    out = []
    for i, var in enumerate(numerical_cols):
        out.append({
            "variable": var,
            "Dim1": float(vars_coords[i, 0]),
            "Dim2": float(vars_coords[i, 1])
        })
    return jsonify(out)

### Endpoint 3: Data for Parallel Coordinates Plot
@app.route('/data/pcp')
def pcp_data():
    # Convert non-numerical columns to categorical codes.
    categorical_cols = [col for col in data.columns if col not in numerical_cols + ['cluster']]
    data_pc = data.copy()
    for col in categorical_cols:
        data_pc[col] = data_pc[col].astype('category').cat.codes

    # For PCP, order numerical columns based on variables' MDS (by Dim1)
    # Compute correlation MDS (reuse same as above)
    corr = data[numerical_cols].corr()
    distance = 1 - corr.abs()
    mds_model = MDS(n_components=2, dissimilarity='precomputed', random_state=42)
    vars_coords = mds_model.fit_transform(distance)
    vars_df = pd.DataFrame(vars_coords, index=numerical_cols, columns=['Dim1', 'Dim2'])
    sorted_numerical = vars_df.sort_values('Dim1').index.tolist()

    # Final order: categorical columns + sorted numerical columns
    final_order = categorical_cols + sorted_numerical
    if 'cluster' not in final_order:
        final_order.append('cluster')
    data_pc = data_pc[final_order]

    # Return as list of dictionaries (each row as a dict)
    out = data_pc.to_dict(orient='records')
    return jsonify(out)

### Serve static files (HTML, JS, CSS)
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
