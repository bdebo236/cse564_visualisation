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
    });

    // Fetch and visualize ScatterPlot
    fetch("http://127.0.0.1:5000/scatterplot").then(response => response.json()).then(data => {
        renderClusterScatter(data.scatter_data);
    });

    // Fetch and visualize K-Means Elbow Plot
    fetch("http://127.0.0.1:5000/kmeans").then(response => response.json()).then(data => {
        renderElbowPlot(data.mse_scores, data.k_elbow);
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

    // Function to render the scatter plot for clusters
    function renderClusterScatter(clusterAssignments) {
        const width = 500, height = 300;
        const margin = { top: 20, right: 20, bottom: 50, left: 50 };

        const svg = d3.select("#scatterplot-matrix").html("")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Generate random PCA-like data for scatter (Replace with actual PCA data from API later)
        const data = clusterAssignments.map((cluster, i) => ({
            x: Math.random() * width,  // Replace with actual PCA values
            y: Math.random() * height,
            cluster: cluster
        }));

        const xScale = d3.scaleLinear().domain([0, width]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, height]).range([height, 0]);

        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 5)
            .attr("fill", d => d3.schemeCategory10[d.cluster]);

        // Add Axes
        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));
        svg.append("g").call(d3.axisLeft(yScale));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .text("PCA Component 1");

        svg.append("text")
            .attr("x", -height / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("PCA Component 2");
    }
});
