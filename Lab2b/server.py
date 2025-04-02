import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import MDS
from sklearn.cluster import KMeans
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)

# Load and preprocess data
data = pd.read_csv("merged_songs.csv")
data = data.dropna().reset_index(drop=True)

numerical_cols = [
    "duration_ms", "popularity", "danceability", "energy", 
    "key", "loudness", "speechiness", "acousticness", "instrumentalness", 
    "liveness", "valence", "tempo", "rank", "last-week", "peak-rank", "weeks-on-board"
]
categorical_cols = [col for col in data.columns if col not in numerical_cols]
data_cat = data[categorical_cols].copy()
for col in categorical_cols:
    data_cat[col] = data_cat[col].astype('category').cat.codes

df_all = pd.concat([data[numerical_cols], data_cat], axis=1)

# Sample data
np.random.seed(42)
sample_size = 500  # reduced sample size for faster updates
if df_all.shape[0] > sample_size:
    sampled_data = df_all.sample(n=sample_size, random_state=42)
else:
    sampled_data = df_all.copy()

# Standardize data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(sampled_data)

# Precompute MDS coordinates for observations
mds = MDS(n_components=2, random_state=42, dissimilarity="euclidean", n_init=1)
mds_obs_coords = mds.fit_transform(X_scaled)
sampled_data["MDS1"] = mds_obs_coords[:, 0]
sampled_data["MDS2"] = mds_obs_coords[:, 1]

# Endpoint for elbow plot (MSE scores for k=1..10)
@app.route('/data/elbow')
def get_elbow():
    max_k = 10
    inertias = []
    for k in range(1, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42)
        kmeans.fit(X_scaled)
        inertias.append(kmeans.inertia_)
    return jsonify(inertias)

# Endpoint for MDS Observations (with clustering using selected k)
@app.route('/data/mds_obs')
def mds_obs():
    k = request.args.get('k', default=3, type=int)
    kmeans = KMeans(n_clusters=k, random_state=42)
    cluster_labels = kmeans.fit_predict(X_scaled)
    df = sampled_data.copy()
    df["cluster"] = cluster_labels
    df.rename(columns={"MDS1": "Dim1", "MDS2": "Dim2"}, inplace=True)
    return jsonify(df.to_dict(orient="records"))

# Endpoint for MDS Variables
@app.route('/data/mds_vars')
def mds_vars_endpoint():
    corr_matrix = np.abs(sampled_data.corr())
    distance_matrix = 1 - corr_matrix
    mds_vars = MDS(n_components=2, random_state=42, dissimilarity="precomputed", n_init=1)
    mds_var_coords = mds_vars.fit_transform(distance_matrix)
    all_vars = [col for col in sampled_data.columns if col not in ["MDS1", "MDS2", "cluster"]]
    return jsonify([{"variable": var, "Dim1": coord[0], "Dim2": coord[1]} for var, coord in zip(all_vars, mds_var_coords)])

# Endpoint for Parallel Coordinates Plot (using selected k for clustering)
@app.route('/data/pcp')
def pcp():
    k = request.args.get('k', default=3, type=int)
    kmeans = KMeans(n_clusters=k, random_state=42)
    cluster_labels = kmeans.fit_predict(X_scaled)
    df = sampled_data.copy()
    df["cluster"] = cluster_labels
    return jsonify(df.to_dict(orient="records"))

if __name__ == '__main__':
    app.run(debug=True)