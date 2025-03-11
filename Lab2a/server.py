from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json
from flask.json.provider import DefaultJSONProvider

# Convert numpy int64 to normal int
class NumpyJSONProvider(DefaultJSONProvider):
    def dumps(self, obj, **kwargs):
        return json.dumps(obj, default=self.numpy_encoder, **kwargs)

    @staticmethod
    def numpy_encoder(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        raise TypeError(f"Type {type(obj)} not serializable")

app = Flask(__name__)
CORS(app)
app.json = NumpyJSONProvider(app)

# Load dataset and do initial processing (same as before)
data = pd.read_csv("merged_songs.csv")
data = data.dropna()
numerical_data = data.select_dtypes(include=[np.number])
scaler = StandardScaler()
scaled_data = scaler.fit_transform(numerical_data)

# Perform PCA once on the scaled data
pca = PCA()
pca_data = pca.fit_transform(scaled_data)
explained_variance = pca.explained_variance_ratio_
cumulative_variance = np.cumsum(explained_variance)
intrinsic_dim = np.argmax(cumulative_variance >= 0.90) + 1

# Precompute an initial elbow for k using intrinsic_dim on PCA data
def compute_k_elbow(chosen_dim):
    mse_scores = []
    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(pca_data[:, :chosen_dim])
        mse_scores.append(kmeans.inertia_)
    k_elbow = np.argmin(np.diff(mse_scores, 2)) + 2
    return mse_scores, k_elbow

mse_scores, k_elbow = compute_k_elbow(intrinsic_dim)

# API Endpoints with dynamic parameters
@app.route('/pca')
def get_pca():
    # Get chosen intrinsic dimension from query (default to computed value)
    chosen_dim = request.args.get('intrinsic_dim', default=intrinsic_dim, type=int)
    # Recompute top-4 features based on the sum of squared loadings for the chosen dimension
    top4_attributes = np.argsort(np.sum(np.abs(pca.components_[:chosen_dim]) ** 2, axis=0))[-4:]
    top4_features = numerical_data.columns[top4_attributes].tolist()
    loadings = pca.components_[:chosen_dim].T
    loadings_df = pd.DataFrame(loadings, index=numerical_data.columns)
    top4_loadings = loadings_df.loc[top4_features].to_dict()

    return jsonify({
        "explained_variance": explained_variance.tolist(),
        "intrinsic_dim": chosen_dim,
        "top_4_features": top4_features,
        "top_4_loadings": top4_loadings
    })

@app.route('/kmeans')
def get_kmeans():
    chosen_dim = request.args.get('intrinsic_dim', default=intrinsic_dim, type=int)
    chosen_k = request.args.get('k', default=k_elbow, type=int)
    mse_scores, k_elbow_new = compute_k_elbow(chosen_dim)
    
    # Also recalc full cluster assignments for k=1...10
    cluster_assignments = {}
    for k in range(1, 11):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(pca_data[:, :chosen_dim])
        cluster_assignments[k] = km.labels_.tolist()

    return jsonify({
        "mse_scores": mse_scores,
        "k_elbow": k_elbow_new,
        "chosen_k": chosen_k,
        "cluster_assignments": cluster_assignments
    })

@app.route('/scatterplot')
def get_scatterplot_data():
    chosen_dim = request.args.get('intrinsic_dim', default=intrinsic_dim, type=int)
    chosen_k = request.args.get('k', default=k_elbow, type=int)
    # Recompute top-4 features based on chosen_dim
    top4_attributes = np.argsort(np.sum(np.abs(pca.components_[:chosen_dim]) ** 2, axis=0))[-4:]
    top4_features = numerical_data.columns[top4_attributes].tolist()

    kmeans = KMeans(n_clusters=chosen_k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(pca_data[:, :chosen_dim])
    
    scatter_data = data[top4_features].copy()
    scatter_data['Cluster'] = cluster_labels.tolist()
    
    return jsonify({
        "top_4_features": top4_features,
        "scatter_data": scatter_data.to_dict(orient="records")
    })

@app.route('/pca_biplot')
def get_pca_biplot():
    chosen_dim = request.args.get('intrinsic_dim', default=intrinsic_dim, type=int)
    chosen_k = request.args.get('k', default=k_elbow, type=int)
    # For biplot we always project on the first two PCs (assume chosen_dim ≥ 2)
    kmeans = KMeans(n_clusters=chosen_k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(pca_data[:, :2])  
    pca_df = pd.DataFrame(pca_data[:, :2], columns=["PC1", "PC2"])
    pca_df["cluster"] = cluster_labels

    # For biplot, we still determine the top-4 features from the chosen intrinsic dimension
    if chosen_dim < 2:
        chosen_dim = 2
    top4_attributes = np.argsort(np.sum(np.abs(pca.components_[:chosen_dim]) ** 2, axis=0))[-4:]
    top4_features = numerical_data.columns[top4_attributes].tolist()

    loadings = pca.components_[:2].T
    loadings_df = pd.DataFrame(loadings, index=numerical_data.columns, columns=["PC1", "PC2"])
    top4_loadings = loadings_df.loc[top4_features].to_dict(orient="records")

    return jsonify({
        "pca_biplot_data": pca_df.to_dict(orient="records"),
        "top_4_features": top4_features,
        "top_4_loadings": top4_loadings
    })

@app.route('/page1')
def page1():
    return render_template('page1.html')

@app.route('/page2')
def page2():
    return render_template('page2.html')

@app.route('/page3')
def page3():
    return render_template('page3.html')

if __name__ == '__main__':
    app.run(debug=True)