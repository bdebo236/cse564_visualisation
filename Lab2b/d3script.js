// Global variables
let selectedOrder = [];
let allVars = [];
let currentK = 3;
let globalMSE = null;  // will store MSE scores from the elbow endpoint
let currentDims = [];  // current ordering of dimensions for PCP

// SVG setup helper: clear the container completely and create an SVG inside it.
function setupSVG(container, width, height) {
  // Clear only the SVG element within the container
  d3.select(container).select("svg").html("");
  const margin = { top: 40, right: 30, bottom: 40, left: 50 };
  const svg = d3.select(container).select("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  return { svg, margin, width: width, height: height };
}

// Plot visibility control
function showPlot(id) {
  d3.selectAll(".plot").style("display", "none");
  d3.select(id).style("display", "block");
}

// Navigation handlers
d3.select("#link-mds-obs").on("click", () => { showPlot("#mds-obs"); renderMDSObs(); });
d3.select("#link-mds-vars").on("click", () => { showPlot("#mds-vars"); renderMDSVars(); });
d3.select("#link-pcp").on("click", () => { showPlot("#pcp"); renderPCP(); });
d3.select("#link-elbow").on("click", () => { showPlot("#elbow"); renderElbowPlot(currentK); });

// Initial view
showPlot("#mds-obs");
renderMDSObs();

// MDS Observations Plot
function renderMDSObs() {
  const url = `http://127.0.0.1:5000/data/mds_obs?k=${currentK}&_=${Date.now()}`;
  d3.json(url).then(data => {
    const { svg, margin, width, height } = setupSVG("#mds-obs", 1800, 600);
    
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => +d.Dim1))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => +d.Dim2))
      .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    svg.selectAll("circle")
      .data(data)
      .enter().append("circle")
        .attr("cx", d => xScale(+d.Dim1))
        .attr("cy", d => yScale(+d.Dim2))
        .attr("r", 4)
        .attr("fill", d => color(d.cluster));

    // Axes with white tick labels
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("fill", "white");
    
    svg.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "white");

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .text("Dimension 1");

    // Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .text("Dimension 2");

    // Create a legend for clusters
    const clusters = Array.from(new Set(data.map(d => d.cluster)));
    const legend = svg.append("g")
       .attr("class", "legend")
       .attr("transform", `translate(${width - 100},20)`);
    clusters.forEach((c, i) => {
         const legendRow = legend.append("g")
              .attr("transform", `translate(0, ${i * 20})`);
         legendRow.append("circle")
              .attr("r", 6)
              .attr("fill", color(c));
         legendRow.append("text")
              .attr("x", 12)
              .attr("y", 4)
              .attr("fill", "white")
              .text(`Cluster ${+c + 1}`);
    });
  });
}

// MDS Variables Plot
function renderMDSVars() {
  selectedOrder = [];
  d3.select("#selected-order").text("Selected Order: (none)");
  
  d3.json("http://127.0.0.1:5000/data/mds_vars").then(data => {
    const { svg, margin, width, height } = setupSVG("#mds-vars", 1800, 600);
    allVars = data.map(d => d.variable);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => +d.Dim1))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => +d.Dim2))
      .range([height, 0]);

    const points = svg.selectAll("g.point")
      .data(data)
      .enter().append("g")
      .attr("class", "point")
      .attr("transform", d => `translate(${xScale(+d.Dim1)}, ${yScale(+d.Dim2)})`)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        const idx = selectedOrder.indexOf(d.variable);
        if (idx === -1) {
          selectedOrder.push(d.variable);
          d3.select(this).select("circle").attr("stroke", "red").attr("stroke-width", 2);
        } else {
          selectedOrder.splice(idx, 1);
          d3.select(this).select("circle").attr("stroke", null);
        }
        d3.select("#selected-order").text("Selected Order: " + (selectedOrder.length ? selectedOrder.join(", ") : "(none)"));
      });

    // Use Spotify green for non-cluster marks here
    points.append("circle")
      .attr("r", 6)
      .attr("fill", "#1DB954");

    points.append("text")
      .attr("x", 8)
      .attr("y", 3)
      .text(d => d.variable)
      .attr("font-size", "10px")
      .attr("fill", "white");

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("fill", "white");

      // X-axis label
    svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("fill", "white")
    .attr("text-anchor", "middle")
    .text("Dimension 1");

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("fill", "white")
    .attr("text-anchor", "middle")
    .text("Dimension 2");

    svg.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "white");
  });
}

// Parallel Coordinates Plot with drag-enabled axes
function renderPCP() {
  const url = `http://127.0.0.1:5000/data/pcp?k=${currentK}&_=${Date.now()}`;
  d3.json(url).then(data => {
    const { svg, margin, width, height } = setupSVG("#pcp", 1800, 600);
    let brushSelections = {};

    // ─── SETUP DIMENSIONS & SCALES ──────────────────────────────
    let dims = Object.keys(data[0]).filter(d => !["MDS1", "MDS2", "cluster"].includes(d));
    if (currentDims.length === 0) currentDims = [...dims];
    
    // xScale for positioning dimensions
    const xScale = d3.scalePoint()
      .domain(currentDims)
      .range([margin.left, width])
      .padding(0.5);

    // yScales for each dimension
    const yScales = {};
    currentDims.forEach(dim => {
      const extent = d3.extent(data, d => +d[dim]);
      yScales[dim] = d3.scaleLinear()
        .domain(extent[0] === extent[1] ? [extent[0] - 1, extent[1] + 1] : extent)
        .range([height, 0]);
    });

    // Cluster colour scale (for polylines)
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // ─── DRAW POLYLINES WITH CLUSTER COLOURS ─────────────────────
    const paths = svg.selectAll("path")
      .data(data)
      .enter().append("path")
      .attr("d", d => d3.line()(
        currentDims.map(dim => [xScale(dim), yScales[dim](+d[dim])])
      ))
      .attr("fill", "none")
      .attr("stroke", d => color(d.cluster))
      .attr("stroke-opacity", 0.5);

    // ─── DRAG BEHAVIOR FOR DIMENSION GROUPS ───────────────────────
    const drag = d3.drag()
      .on("start", function(event, d) {
        d3.select(this).raise();
      })
      .on("drag", function(event, d) {
        // Calculate new x position within bounds
        const newX = Math.max(margin.left + 20, Math.min(width - 20, event.x));
        d3.select(this).attr("transform", `translate(${newX},0)`);
      })
      .on("end", function(event, d) {
        // Get new positions for each dimension group and update order
        const dimsPositions = [];
        svg.selectAll(".dimension").each(function(dim) {
          const transform = d3.select(this).attr("transform");
          const x = +transform.match(/translate\(([\d.]+),/)[1];
          dimsPositions.push({ dim: dim, x });
        });
        dimsPositions.sort((a, b) => a.x - b.x);
        currentDims = dimsPositions.map(p => p.dim);
        renderPCP();
      });

    // ─── CREATE DIMENSION GROUPS (AXIS + DRAG HANDLE) ─────────────
    const dimension = svg.selectAll(".dimension")
      .data(currentDims)
      .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", d => `translate(${xScale(d)},0)`)
      .call(drag);

    dimension.each(function(d) {
      // Append the axis for each dimension and style tick text white
      d3.select(this).append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScales[d]).ticks(5))
        .selectAll("text")
        .attr("fill", "white");

      // Append axis label (in white)
      d3.select(this).append("text")
        .attr("y", height + 30)  // Move it below the chart
        .attr("x", 0)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "14px")
        .text(d);
      
      // Append a drag handle for visual cue using Spotify green
      d3.select(this).append("rect")
        .attr("class", "drag-handle")
        .attr("x", -10)
        .attr("y", margin.top - 30 - 10)
        .attr("width", 20)
        .attr("height", 20)
        .attr("rx", 4)
        .attr("fill", "#1DB954")
        .attr("stroke", "white")
        .style("cursor", "grab");
    });

    // ─── BRUSHING ON THE FIRST DIMENSION ───────────────────────────
    if (currentDims.length > 0) {
      const firstDim = currentDims[0];
      const brush = d3.brushY()
        .extent([[-15, 0], [15, height]])
        .on("brush", function(event) {
          if (!event.selection) return;
          const [y0, y1] = event.selection;
          brushSelections[firstDim] = [
            yScales[firstDim].invert(y1),
            yScales[firstDim].invert(y0)
          ];
          // Update stroke opacity based on brush selection
          paths.attr("stroke-opacity", d =>
            +d[firstDim] >= Math.min(...brushSelections[firstDim]) &&
            +d[firstDim] <= Math.max(...brushSelections[firstDim]) ? 0.9 : 0.1
          );
        });

      svg.append("g")
        .attr("class", "brush")
        .attr("transform", `translate(${xScale(firstDim)},0)`)
        .call(brush);
    }
  });
}

// Helper: Draw the elbow plot using provided inertias and selected k
function drawElbowPlot(inertias, kSelected) {
  const width = 1800, height = 400;
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  
  d3.select("#kmeans-elbow").html("");
  const svg = d3.select("#kmeans-elbow")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([1, inertias.length]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(inertias)]).range([height, 0]);

  // Elbow curve with Spotify green
  svg.append("path")
    .datum(inertias)
    .attr("d", d3.line()
      .x((d, i) => x(i + 1))
      .y(d => y(d)))
    .attr("fill", "none")
    .attr("stroke", "#1DB954")
    .attr("stroke-width", 2);

  // Clickable points in Spotify green (active point remains red)
  svg.selectAll(".elbow-point")
    .data(inertias)
    .enter().append("circle")
    .attr("class", "elbow-point")
    .attr("cx", (d, i) => x(i + 1))
    .attr("cy", d => y(d))
    .attr("r", 6)
    .attr("fill", (d, i) => (i + 1) === kSelected ? "red" : "#1DB954")
    .attr("data-index", (d, i) => i)
    .on("click", function(event, d) {
      const idx = +d3.select(this).attr("data-index");
      currentK = idx + 1;
      console.log("Updated k:", currentK);
      drawElbowPlot(inertias, currentK);
      // Clear entire containers for MDS and PCP and re-render them
      // d3.select("#mds-obs").html("");
      // d3.select("#pcp").html("");
      renderMDSObs();
      renderPCP();
    });

  // Vertical indicator line
  svg.append("line")
    .attr("x1", x(kSelected))
    .attr("x2", x(kSelected))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  // Axes with white tick labels
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(inertias.length).tickFormat(d => d))
    .selectAll("text")
    .attr("fill", "white");
    
  svg.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("fill", "white");

  // Axis Labels (in white)
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .style("text-anchor", "middle")
    .attr("fill", "white")
    .text("Number of Clusters (k)");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .style("text-anchor", "middle")
    .attr("fill", "white")
    .text("Inertia");
}

// Interactive Elbow Plot: fetch MSE scores if not loaded, then draw
function renderElbowPlot(kSelected) {
  if (globalMSE) {
    drawElbowPlot(globalMSE, kSelected);
  } else {
    d3.json("http://127.0.0.1:5000/data/elbow").then(inertias => {
      globalMSE = inertias;
      drawElbowPlot(globalMSE, kSelected);
    });
  }
}

// PCP ordering remains triggered by apply ordering button
d3.select("#apply-ordering").on("click", () => {
  // Fetch current PCP data to get the default list of dimensions
  d3.json(`http://127.0.0.1:5000/data/pcp?k=${currentK}&_=${Date.now()}`)
    .then(data => {
      // Get the default dimensions (excluding MDS and cluster)
      let defaultDims = Object.keys(data[0]).filter(d => !["MDS1", "MDS2", "cluster"].includes(d));
      // If the user selected all variables in the MDS Variables plot, use that order
      // Otherwise, append missing dimensions to the end in their default order
      if (selectedOrder.length === defaultDims.length) {
        currentDims = selectedOrder;
      } else {
        currentDims = selectedOrder.concat(defaultDims.filter(d => !selectedOrder.includes(d)));
      }
      // Update the PCP view with the new axis order
      showPlot("#pcp");
      renderPCP();
    })
    .catch(error => {
      console.error("Error fetching PCP data:", error);
    });
});
