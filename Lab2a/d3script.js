document.addEventListener("DOMContentLoaded", function () {
    // Global parameters for dynamic updates:
    let currentDim = null;
    let currentK = null;

    // Tab switching logic:
    const tabs = document.querySelectorAll(".tab-link");
    const contents = document.querySelectorAll(".tab-content");
    tabs.forEach(tab => {
        tab.addEventListener("click", function (e) {
            e.preventDefault();
            const target = this.dataset.tab;
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(content => content.classList.remove("active"));
            this.classList.add("active");
            document.getElementById(target).classList.add("active");
        });
    });

    // Fetch initial PCA data using the default intrinsic dimensionality
    fetch("http://127.0.0.1:5000/pca")
        .then(response => response.json())
        .then(data => {
            currentDim = data.intrinsic_dim;
            renderScreePlot(data.explained_variance, currentDim);
            displayTopFeatures(data.top_4_features);
        })
        .catch(error => console.error("Error fetching PCA data:", error));

    // Fetch initial K-Means data using the default k (elbow)
    fetch("http://127.0.0.1:5000/kmeans")
        .then(response => response.json())
        .then(data => {
            currentK = data.k_elbow;
            renderElbowPlot(data.mse_scores, currentK);
        })
        .catch(error => console.error("Error fetching k-means data:", error));

    // Initial render of PCA biplot and scatterplot matrix
    fetch("http://127.0.0.1:5000/pca_biplot")
        .then(response => response.json())
        .then(data => {
            renderPCABiplot(data.pca_biplot_data, data.top_4_loadings);
        });
    fetch("http://127.0.0.1:5000/scatterplot")
        .then(response => response.json())
        .then(data => {
            renderScatterPlot(data.scatter_data, data.top_4_features);
        });

    // Function to display the top 4 PCA features on the page
    function displayTopFeatures(features) {
        const featureList = d3.select("#top-features").html(""); // Clear previous content
        featureList.selectAll("li")
            .data(features)
            .enter()
            .append("li")
            .text(d => d);
    }

    // Function to update all visualizations based on the current parameters
    function updateVisualizations() {
        // Update PCA endpoint (e.g. for top features)
        fetch(`http://127.0.0.1:5000/pca?intrinsic_dim=${currentDim}`)
            .then(response => response.json())
            .then(data => {
                displayTopFeatures(data.top_4_features);
            });
        // Update scatterplot matrix
        fetch(`http://127.0.0.1:5000/scatterplot?intrinsic_dim=${currentDim}&k=${currentK}`)
            .then(response => response.json())
            .then(data => {
                renderScatterPlot(data.scatter_data, data.top_4_features);
            });
        // Update PCA biplot
        fetch(`http://127.0.0.1:5000/pca_biplot?intrinsic_dim=${currentDim}&k=${currentK}`)
            .then(response => response.json())
            .then(data => {
                renderPCABiplot(data.pca_biplot_data, data.top_4_loadings);
            });
        // Optionally update the k-means elbow plot as well
        fetch(`http://127.0.0.1:5000/kmeans?intrinsic_dim=${currentDim}&k=${currentK}`)
            .then(response => response.json())
            .then(data => {
                d3.select("#kmeans-elbow").html("");
                renderElbowPlot(data.mse_scores, currentK);
            });
    }

    // Render PCA Scree Plot with interaction to update intrinsic dimensionality
    function renderScreePlot(variance, intrinsicDim) {
        const width = 500, height = 300;
        const margin = { top: 20, right: 20, bottom: 80, left: 80 };

        // Clear previous content if any
        d3.select("#pca-scree").html("");

        const svg = d3.select("#pca-scree").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const xScale = d3.scaleBand()
            .domain(d3.range(variance.length))
            .range([0, width])
            .padding(0.1);
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(variance)])
            .range([height, 0]);

        svg.selectAll("rect")
            .data(variance)
            .enter()
            .append("rect")
            .attr("x", (_, i) => xScale(i))
            .attr("y", d => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height - yScale(d))
            .attr("fill", (d, i) => i === intrinsicDim - 1 ? "#1DB954" : "#535353")
            .attr("data-index", (d, i) => i)
            .on("click", function (event, d) {
                let idx = +d3.select(this).attr("data-index");
                currentDim = idx + 1;
                // Update the bar colors
                d3.selectAll("#pca-scree svg rect")
                    .attr("fill", (d, i) => i === currentDim - 1 ? "#1DB954" : "#535353");
                updateVisualizations();
            });

        // Add X-axis
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Add Y-axis
        const yAxis = d3.axisLeft(yScale);
        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis);

        svg.append("text")
            .attr("class", "graph-label")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .text("Principal Component");

        svg.append("text")
            .attr("class", "graph-label")
            .attr("x", -height / 2)
            .attr("y", margin.left - 130)
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("Explained Variance");
    }

    // Render K-Means Elbow Plot with interaction to update k
    function renderElbowPlot(mseScores, kSelected) {
        const width = 500, height = 300;
        const margin = { top: 20, right: 20, bottom: 80, left: 80 };

        // Clear previous plot
        d3.select("#kmeans-elbow").html("");

        const svg = d3.select("#kmeans-elbow").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const xScale = d3.scaleLinear()
            .domain([0.5, mseScores.length])
            .range([0, width]);
        const yScale = d3.scaleLinear()
            .domain([d3.min(mseScores), d3.max(mseScores)])
            .range([height, 0]);

        const line = d3.line()
            .x((d, i) => xScale(i + 1))
            .y(d => yScale(d));
        svg.append("path")
            .datum(mseScores)
            .attr("fill", "none")
            .attr("stroke", "#1DB954")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Dots with click event for selecting k
        svg.selectAll(".dot")
            .data(mseScores)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", (d, i) => xScale(i + 1))
            .attr("cy", d => yScale(d))
            .attr("r", 4)
            .attr("fill", (d, i) => i === kSelected - 1 ? "#1DB954" : "#535353")
            .attr("data-index", (d, i) => i)
            .on("click", function (event, d) {
                let idx = +d3.select(this).attr("data-index");
                currentK = idx + 1;
                // Re-render the elbow plot to update the selected k
                renderElbowPlot(mseScores, currentK);
                updateVisualizations();
            });

        // Draw a vertical line showing the selected k value
        svg.append("line")
            .attr("x1", xScale(kSelected))
            .attr("x2", xScale(kSelected))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        // Add X-axis
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Add Y-axis
        const yAxis = d3.axisLeft(yScale);
        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis);

        svg.append("text")
            .attr("class", "graph-label")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .text("Number of Clusters (k)");

        svg.append("text")
            .attr("class", "graph-label")
            .attr("x", -height / 2)
            .attr("y", margin.left - 130)
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("MSE (Inertia)");
    }

    // Render PCA Biplot
    function renderPCABiplot(pcaBiplotData, top4Loadings) {
        d3.select("#pca-biplot").selectAll("svg").remove();
        const svg = d3.select("#pca-biplot").append("svg")
            .attr("width", 600)
            .attr("height", 400);

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = +svg.attr("width") - margin.left - margin.right;
        const height = +svg.attr("height") - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(pcaBiplotData, d => d.PC1))
            .range([0, width]);
        const yScale = d3.scaleLinear()
            .domain(d3.extent(pcaBiplotData, d => d.PC2))
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        g.selectAll(".point")
            .data(pcaBiplotData)
            .enter().append("circle")
            .attr("cx", d => xScale(d.PC1))
            .attr("cy", d => yScale(d.PC2))
            .attr("r", 1.5)
            .attr("fill", d => colorScale(d.cluster))
            .attr("opacity", 0.7);

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));
        g.append("g")
            .call(d3.axisLeft(yScale));

        top4Loadings.forEach(feature => {
            g.append("line")
                .attr("x1", xScale(0))
                .attr("y1", yScale(0))
                .attr("x2", xScale(feature.PC1 * 2))
                .attr("y2", yScale(feature.PC2 * 2))
                .attr("stroke", "red")
                .attr("stroke-width", 2);
        });
    }

    // Render Scatterplot Matrix
    function renderScatterPlot(data, features) {
        const size = 170; // Size of each plot cell
        const padding = 60;
        const numFeatures = features.length;

        d3.select("#scatterplot-matrix").html("");

        const svg = d3.select("#scatterplot-matrix")
            .append("svg")
            .attr("width", size * numFeatures + padding)
            .attr("height", size * numFeatures + padding);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        const scales = features.map(f =>
            d3.scaleLinear()
                .domain(d3.extent(data, d => d[f]))
                .range([padding, size - 20])
        );

        // Create axis labels for each feature
        features.forEach((feature, i) => {
            svg.append("text")
                .attr("x", padding + i * size + size / 2)
                .attr("y", padding / 2)
                .attr("text-anchor", "middle")
                .text(feature);

            svg.append("text")
                .attr("transform", `rotate(-90)`)
                .attr("x", -padding - i * size - size / 2)
                .attr("y", padding / 2)
                .attr("text-anchor", "middle")
                .text(feature);
        });

        // Create scatterplots (and density plots on the diagonal)
        features.forEach((xFeature, xIndex) => {
            features.forEach((yFeature, yIndex) => {
                const plot = svg.append("g")
                    .attr("transform", `translate(${xIndex * size + padding},${yIndex * size + padding})`);

                if (xIndex === yIndex) {
                    // Diagonal: density plot (histogram)
                    const histGenerator = d3.histogram()
                        .domain(scales[xIndex].domain())
                        .thresholds(20);
                    const bins = histGenerator(data.map(d => d[xFeature]));
                    const yHist = d3.scaleLinear()
                        .domain([0, d3.max(bins, d => d.length)])
                        .range([size - padding, 0]);

                    plot.selectAll("rect")
                        .data(bins)
                        .enter().append("rect")
                        .attr("x", d => scales[xIndex](d.x0) - 50)
                        .attr("y", d => yHist(d.length))
                        .attr("width", d => scales[xIndex](d.x1) - scales[xIndex](d.x0))
                        .attr("height", d => size - padding - yHist(d.length))
                        .attr("fill", "#1DB954")
                        .attr("opacity", 0.6);
                } else {
                    // Off-diagonal: scatterplot
                    plot.selectAll("circle")
                        .data(data)
                        .enter().append("circle")
                        .attr("cx", d => scales[xIndex](d[xFeature]) - 50)
                        .attr("cy", d => scales[yIndex](d[yFeature]) - 50)
                        .attr("r", 2)
                        .attr("fill", d => colorScale(d.Cluster))
                        .attr("opacity", 0.7);
                }

                // Add axes only on the edges
                const xAxis = d3.axisBottom(scales[xIndex]).ticks(4);
                if (yIndex === numFeatures - 1) {
                    plot.append("g")
                        .attr("transform", `translate(-60,${size - padding})`)
                        .call(xAxis);
                } else {
                    plot.append("line")
                        .attr("x1", 0)
                        .attr("x2", size - padding)
                        .attr("y1", size - padding)
                        .attr("y2", size - padding)
                        .attr("stroke", "#ccc");
                }

                const yAxis = d3.axisLeft(scales[yIndex]).ticks(4);
                if (xIndex === 0) {
                    plot.append("g")
                        .attr("transform", `translate(0,-40)`)
                        .call(yAxis);
                } else {
                    plot.append("line")
                        .attr("x1", 0)
                        .attr("x2", 0)
                        .attr("y1", 0)
                        .attr("y2", size - padding)
                        .attr("stroke", "#ccc");
                }
            });
        });
    }
});
