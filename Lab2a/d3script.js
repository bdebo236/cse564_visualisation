document.addEventListener("DOMContentLoaded", function () {
    // Tab switching logic
    const tabs = document.querySelectorAll(".tab-link");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", function (e) {
            e.preventDefault();
            const target = this.dataset.tab;

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(content => content.classList.remove("active"));

            // Add active class to selected tab and content
            this.classList.add("active");
            document.getElementById(target).classList.add("active");
        });
    });

    // Fetch and visualize PCA Scree Plot
    fetch("http://127.0.0.1:5000/pca").then(response => response.json()).then(data => {
        renderScreePlot(data.explained_variance, data.intrinsic_dim);
    })
        .catch(error => console.error("Error fetching PCA Scree data:", error));

    // Fetch and visualize K-Means Elbow Plot
    fetch("http://127.0.0.1:5000/kmeans").then(response => response.json()).then(data => {
        renderElbowPlot(data.mse_scores, data.k_elbow);
    })
        .catch(error => console.error("Error fetching Elbow data:", error));

        fetch("http://127.0.0.1:5000/pca_biplot")
        .then(response => response.json())
        .then(data => {
            renderPCABiplot(data.pca_biplot_data, data.top_4_loadings); // Pass loadings instead of features
        });

    fetch("http://127.0.0.1:5000/scatterplot")
        .then(response => response.json())
        .then(data => {
            renderScatterPlot(data.scatter_data, data.top_4_features);
        });


    // Function to display the top 4 PCA features
    function displayTopFeatures(features) {
        const featureList = d3.select("#top-features").html(""); // Clear previous content
        featureList.selectAll("li")
            .data(features)
            .enter()
            .append("li")
            .text(d => d);
    }

    function renderScreePlot(variance, intrinsicDim) {
        const width = 500, height = 300;
        const margin = { top: 20, right: 20, bottom: 80, left: 80 };
        
        const svg = d3.select("#pca-scree").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const xScale = d3.scaleBand().domain(d3.range(variance.length)).range([0, width]).padding(0.1);
        const yScale = d3.scaleLinear().domain([0, d3.max(variance)]).range([height, 0]);

        svg.selectAll("rect")
            .data(variance)
            .enter()
            .append("rect")
            .attr("x", (_, i) => xScale(i))
            .attr("y", d => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height - yScale(d))
            .attr("fill", (d, i) => i === intrinsicDim - 1 ? "#1DB954" : "#535353");
        
        // Create the X-axis
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x-axis") 
            .attr("transform", "translate(0," + height + ")")  
            .call(xAxis);

        // Create the Y-axis
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

    function renderElbowPlot(mseScores, kElbow) {
        const width = 500, height = 300;
        const margin = { top: 20, right: 20, bottom: 80, left: 80 };
        const svg = d3.select("#kmeans-elbow").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        minY = 170000
        const xScale = d3.scaleLinear().domain([0.5, mseScores.length]).range([0, width]);
        const yScale = d3.scaleLinear()
        .domain([minY, d3.max(mseScores)]) // Set Y domain to start at minY (180,000)
        .range([height, 0]);

        const line = d3.line().x((d, i) => xScale(i + 1)).y(d => yScale(d));

        svg.append("path")
            .datum(mseScores)
            .attr("fill", "none")
            .attr("stroke", "#1DB954")
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.selectAll(".dot")
        .data(mseScores)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", (d, i) => xScale(i + 1))
        .attr("cy", d => yScale(d))
        .attr("r", 4)  // Small size for the dots
        .attr("fill", "#1DB954");

        // Add the vertical line for kElbow
        svg.append("line")
            .attr("x1", xScale(kElbow))
            .attr("x2", xScale(kElbow))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        // Create the X-axis
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x-axis") 
            .attr("transform", "translate(0," + height + ")")  
            .call(xAxis);

        // Create the Y-axis
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

    function renderPCABiplot(pcaBiplotData, top4Loadings) { // Rename parameters for clarity
        d3.select("#pca-biplot").selectAll("svg").remove();
        const svg = d3.select("#pca-biplot").append("svg")
            .attr("width", 600)
            .attr("height", 400);
    
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = +svg.attr("width") - margin.left - margin.right;
        const height = +svg.attr("height") - margin.top - margin.bottom;
    
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
        // Use pcaBiplotData directly (no longer nested under 'data')
        const xScale = d3.scaleLinear()
            .domain(d3.extent(pcaBiplotData, d => d.PC1))
            .range([0, width]);
    
        const yScale = d3.scaleLinear()
            .domain(d3.extent(pcaBiplotData, d => d.PC2))
            .range([height, 0]);
    
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
        // Plot data points
        g.selectAll(".point")
            .data(pcaBiplotData)
            .enter().append("circle")
            .attr("cx", d => xScale(d.PC1))
            .attr("cy", d => yScale(d.PC2))
            .attr("r", 1.5)
            .attr("fill", d => colorScale(d.cluster))
            .attr("opacity", 0.7);
    
        // Axes
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));
    
        g.append("g")
            .call(d3.axisLeft(yScale));
    
        // Draw loadings (using top4Loadings)
        top4Loadings.forEach(feature => {
            g.append("line")
                .attr("x1", xScale(0))
                .attr("y1", yScale(0))
                .attr("x2", xScale(feature.PC1 * 2)) // Scale loadings for visibility
                .attr("y2", yScale(feature.PC2 * 2))
                .attr("stroke", "red")
                .attr("stroke-width", 2);
        });
    }
    
    function renderScatterPlot(data, features) {
        const size = 170; // Size of each individual plot
        const padding = 60;
        const numFeatures = features.length;
    
        // Clear previous
        d3.select("#scatterplot-matrix").html("");
    
        const svg = d3.select("#scatterplot-matrix")
            .append("svg")
            .attr("width", size * numFeatures + padding)
            .attr("height", size * numFeatures + padding);
    
        // Create color scale for clusters
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
        // Create scales for each feature
        const scales = features.map(f => 
            d3.scaleLinear()
                .domain(d3.extent(data, d => d[f]))
                .range([padding, size - 20])
        );
    
        // Create axes and labels
        features.forEach((feature, i) => {
            // X-axis labels
            svg.append("text")
                .attr("x", padding + i * size + size/2)
                .attr("y", padding/2)
                .attr("text-anchor", "middle")
                .text(feature);
    
            // Y-axis labels
            svg.append("text")
                .attr("transform", `rotate(-90)`)
                .attr("x", -padding - i * size - size/2)
                .attr("y", padding/2)
                .attr("text-anchor", "middle")
                .text(feature);
        });
    
        // Create plot grid
        features.forEach((xFeature, xIndex) => {
            features.forEach((yFeature, yIndex) => {
                const plot = svg.append("g")
                    .attr("transform", `translate(${xIndex * size + padding},${yIndex * size + padding})`);
    
                if(xIndex === yIndex) {
                    // Diagonal: Add KDE-like density plots
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
                    // Off-diagonal: Scatter plots
                    plot.selectAll("circle")
                        .data(data)
                        .enter().append("circle")
                        .attr("cx", d => scales[xIndex](d[xFeature]) - 50)
                        .attr("cy", d => scales[yIndex](d[yFeature]) - 50)
                        .attr("r", 2)
                        .attr("fill", d => colorScale(d.Cluster))
                        .attr("opacity", 0.7);
                }
    
                // Add axes only on edges
                const xAxis = d3.axisBottom(scales[xIndex]).ticks(4);
                if(yIndex === numFeatures - 1) { // Bottom row
                    plot.append("g")
                        .attr("transform", `translate(-60,${size - padding})`)
                        .call(xAxis);
                } else { // Non-bottom row - axis line without ticks
                    plot.append("line")
                        .attr("x1", 0)
                        .attr("x2", size - padding)
                        .attr("y1", size - padding)
                        .attr("y2", size - padding)
                        .attr("stroke", "#ccc");
                }
    
                const yAxis = d3.axisLeft(scales[yIndex]).ticks(4);
                if(xIndex === 0) { // Leftmost column
                    plot.append("g")
                        .attr("transform", `translate(-0,-40)`)
                        .call(yAxis);
                } else { // Non-left column - axis line without ticks
                    plot.append("line")
                        .attr("x1", 0)
                        .attr("x2", 0)
                        .attr("y1", 0)
                        .attr("y2", size - padding)
                        .attr("stroke", "#ccc");
                }    
            });
        });
    
        // // Add legend
        // const legend = svg.append("g")
        //     .attr("transform", `translate(${size * numFeatures - 100},20)`);
    
        // [...new Set(data.map(d => d.Cluster))].forEach((cluster, i) => {
        //     legend.append("circle")
        //         .attr("cx", 0)
        //         .attr("cy", i * 20)
        //         .attr("r", 5)
        //         .attr("fill", colorScale(cluster));
    
        //     legend.append("text")
        //         .attr("x", 10)
        //         .attr("y", i * 20)
        //         .attr("dy", "0.32em")
        //         .text(`Cluster ${cluster}`);
        // });
    }
});
