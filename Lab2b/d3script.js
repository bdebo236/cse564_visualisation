// Helper: clear SVG and set margins
function setupSVG(container, width, height) {
    const margin = {top: 20, right: 30, bottom: 40, left: 50};
    const svg = d3.select(container).select("svg")
        .attr("width", width)
        .attr("height", height);
    svg.selectAll("*").remove();
    return { svg, margin, width: width - margin.left - margin.right, height: height - margin.top - margin.bottom };
  }
  
  // Navigation handling: show only the selected plot
  function showPlot(id) {
    d3.selectAll(".plot").style("display", "none");
    d3.select(id).style("display", "block");
  }
  
  // Event listeners for nav links
  d3.select("#link-mds-obs").on("click", function() {
    showPlot("#mds-obs");
    renderMDSObs();
  });
  d3.select("#link-mds-vars").on("click", function() {
    showPlot("#mds-vars");
    renderMDSVars();
  });
  d3.select("#link-pcp").on("click", function() {
    showPlot("#pcp");
    renderPCP();
  });
  
  // Default: show MDS Observations plot on load
  showPlot("#mds-obs");
  renderMDSObs();
  
  // Render MDS Observations Plot (scatterplot)
  function renderMDSObs() {
    d3.json("http://127.0.0.1:5000/data/mds_obs").then(data => {
      const { svg, margin, width, height } = setupSVG("#mds-obs", 800, 600);
  
      // Set scales based on data extent
      const xExtent = d3.extent(data, d => d.Dim1);
      const yExtent = d3.extent(data, d => d.Dim2);
      const xScale = d3.scaleLinear().domain(xExtent).range([margin.left, width]);
      const yScale = d3.scaleLinear().domain(yExtent).range([height, margin.top]);
  
      // Color scale for clusters
      const color = d3.scaleOrdinal(d3.schemeCategory10);
  
      svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
          .attr("cx", d => xScale(d.Dim1))
          .attr("cy", d => yScale(d.Dim2))
          .attr("r", 4)
          .attr("fill", d => color(d.cluster));
      
      // Axes
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));
      svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));
    });
  }
  
  // Render MDS Variables Plot (scatterplot with labels)
  function renderMDSVars() {
    d3.json("http://127.0.0.1:5000/data/mds_vars").then(data => {
      const { svg, margin, width, height } = setupSVG("#mds-vars", 800, 600);
  
      const xExtent = d3.extent(data, d => d.Dim1);
      const yExtent = d3.extent(data, d => d.Dim2);
      const xScale = d3.scaleLinear().domain(xExtent).range([margin.left, width]);
      const yScale = d3.scaleLinear().domain(yExtent).range([height, margin.top]);
  
      svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
          .attr("cx", d => xScale(d.Dim1))
          .attr("cy", d => yScale(d.Dim2))
          .attr("r", 6)
          .attr("fill", "orange");
      
      // Add labels
      svg.selectAll("text")
        .data(data)
        .enter().append("text")
          .attr("x", d => xScale(d.Dim1) + 5)
          .attr("y", d => yScale(d.Dim2))
          .text(d => d.variable)
          .attr("font-size", "10px")
          .attr("fill", "black");
  
      // Axes
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));
      svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));
    });
  }
  
  // Render Parallel Coordinates Plot
  function renderPCP() {
    d3.json("http://127.0.0.1:5000/data/pcp").then(data => {
      const { svg, margin, width, height } = setupSVG("#pcp", 1000, 600);
  
      // Get list of dimensions (except cluster) from the first object keys.
      const dims = Object.keys(data[0]).filter(d => d !== "cluster");
  
      // For each dimension, create a scale. We use linear scales for simplicity.
      const yScales = {};
      dims.forEach(dim => {
        const extent = d3.extent(data, d => +d[dim]);
        yScales[dim] = d3.scaleLinear().domain(extent).range([height, margin.top]);
      });
  
      // x scale: evenly space the dimensions along the width.
      const xScale = d3.scalePoint().domain(dims).range([margin.left, width]);
  
      // Color scale for clusters
      const color = d3.scaleOrdinal(d3.schemeCategory10);
  
      // Draw lines for each data point
      svg.selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("d", function(d) {
          return d3.line()(dims.map(p => [xScale(p), yScales[p](d[p])]));
        })
        .attr("fill", "none")
        .attr("stroke", d => color(d.cluster))
        .attr("stroke-opacity", 0.5);
  
      // Draw axes for each dimension
      dims.forEach(dim => {
        const g = svg.append("g")
            .attr("transform", `translate(${xScale(dim)},0)`);
        g.call(d3.axisLeft(yScales[dim]));
        g.append("text")
          .style("text-anchor", "middle")
          .attr("y", margin.top - 10)
          .text(dim)
          .style("fill", "black");
      });
    });
  }
  