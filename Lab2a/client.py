from flask import Flask, jsonify, render_template
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

# Load dataset
data = pd.read_csv("merged_songs.csv")
data = data.dropna()
print(data.head())
numerical_data = data.select_dtypes(include=[np.number])
scaler = StandardScaler()
scaled_data = scaler.fit_transform(numerical_data)

# Perform PCA
pca = PCA()
pca_data = pca.fit_transform(scaled_data)
explained_variance = pca.explained_variance_ratio_
cumulative_variance = np.cumsum(explained_variance)
intrinsic_dim = np.argmax(cumulative_variance >= 0.90) + 1

# Select top 4 attributes based on PCA loadings
# loading_sums = np.sum(np.abs(pca.components_), axis=0)
# top_4_indices = np.argsort(loading_sums)[-4:][::-1]
# top_4_features = numerical_data.columns[top_4_indices].tolist()
top4_attributes = np.argsort(np.sum(np.abs(pca.components_[:intrinsic_dim]) ** 2, axis=0))[-4:]
top4_features = numerical_data.columns[top4_attributes].tolist()

# Perform K-Means clustering for k=1 to 10
mse_scores = []
k_values = list(range(1, 11))
cluster_assignments = {}

for k in k_values:
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    kmeans.fit(pca_data[:, :intrinsic_dim])
    mse_scores.append(kmeans.inertia_)
    cluster_assignments[k] = kmeans.labels_.tolist()

k_elbow = np.argmin(np.diff(mse_scores, 2)) + 2

# API Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/pca')
def get_pca():
    loadings = pca.components_[:intrinsic_dim].T
    loadings_df = pd.DataFrame(loadings, index=numerical_data.columns)
    top4_loadings = loadings_df.loc[top4_features].to_dict()

    return jsonify({
        "explained_variance": explained_variance.tolist(),
        "intrinsic_dim": intrinsic_dim,
        "top_4_features": top4_features,
        "top_4_loadings": top4_loadings
    })

@app.route('/kmeans')
def get_kmeans():
    return jsonify({
        "mse_scores": mse_scores,
        "k_elbow": k_elbow,
        "cluster_assignments": cluster_assignments
    })

@app.route('/scatterplot')
def get_scatterplot_data():
    # Get cluster labels using the elbow point k
    kmeans = KMeans(n_clusters=k_elbow, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(pca_data[:, :intrinsic_dim])
    
    scatter_data = data[top4_features].copy()
    scatter_data['Cluster'] = cluster_labels.tolist()
    
    return jsonify({
        "top_4_features": top4_features,
        "scatter_data": scatter_data.to_dict(orient="records")
    })

@app.route('/pca_biplot')
def get_pca_biplot():
    # Fit KMeansk
    kmeans = KMeans(n_clusters=k_elbow, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(pca_data[:, :2])  
    
    # Prepare PCA component scores (already using first 2 PCs)
    pca_df = pd.DataFrame(pca_data[:, :2], columns=["PC1", "PC2"])
    pca_df["cluster"] = cluster_labels

    # Prepare PCA loadings for visualization
    loadings = pca.components_[:2].T
    loadings_df = pd.DataFrame(loadings, index=numerical_data.columns, columns=["PC1", "PC2"])
    top4_loadings = loadings_df.loc[top4_features].to_dict(orient="records")

    return jsonify({
        "pca_biplot_data": pca_df.to_dict(orient="records"),  # Convert pca_df to dict
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