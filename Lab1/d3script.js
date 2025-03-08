const margin = { top:50, right: 30, bottom: 90, left: 70 },
    width = 1200 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const featureLabels = {
    "duration_ms": "Duration (mins)",
    "year": "Year",
    "popularity": "Popularity",
    "danceability": "Danceability",
    "energy": "Energy",
    "key": "Key",
    "loudness": "Loudness (dB)",
    "mode": "Mode",
    "speechiness": "Speechiness",
    "acousticness": "Acousticness",
    "instrumentalness": "Instrumentalness",
    "liveness": "Liveness",
    "valence": "Valence",
    "tempo": "Tempo",
    "rank": "Rank",
    "last-week": "Last Week",
    "peak-rank": "Peak Rank",
    "genre": "Genre",
    "artist": "Artist",
    "mode": "Mode"
};
    
// SCATTER PLOT
const svg_scatter = d3.select("#scatterplot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

let selectedX = "year", selectedY = "popularity";

const dropdown_scatter = d3.select("#feature-dropdown");
const features = ["duration_ms", "year", "popularity", "danceability", "energy", "key", "loudness", "mode", 
    "speechiness", "acousticness", "instrumentalness", "liveness", "valence", "tempo", "rank", "last-week", 
    "peak-rank", "genre", "artist"];

features.forEach(f => 
    dropdown_scatter.append("option")
    .text(featureLabels[f] || f)
    .attr("value", f)
    .property("selected", f === selectedX)
);

let xScale = d3.scaleLinear().range([0, width]);
let yScale = d3.scaleLinear().range([height, 0]);
const xAxis = svg_scatter.append("g").attr("transform", `translate(0,${height})`);
const yAxis = svg_scatter.append("g");

const xlabel_scatter = svg_scatter.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text(featureLabels[selectedX]);

const ylabel_scatter = svg_scatter.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text(featureLabels[selectedY]);

const chart_title_scatter = svg_scatter.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold");

let data = [];

d3.csv("merged_songs.csv").then(csvData => {
    data = csvData.map(d => {
        let obj = {};
        features.forEach(f => obj[f] = (f === "genre" || f === "artist" ? d[f] : +d[f]));
        return obj;
    });
    updateScatterPlot();
});

dropdown_scatter.on("change", function () {
    // Check the selected radio button to update either X or Y axis based on the current selection
    if (document.getElementById("x-axis").checked) {
        selectedX = this.value;  // Update X-axis selection
    } else if (document.getElementById("y-axis").checked) {
        selectedY = this.value;  // Update Y-axis selection
    }
    updateScatterPlot();  // Call the update function to refresh the plot
});

function updateScatterPlot() {
    svg_scatter.selectAll("g").remove();
    svg_scatter.selectAll("rect").remove();
    
    // For categorical X-axis
    if (features.includes(selectedX) && (selectedX === "genre" || selectedX === "artist")) {
        xScale = d3.scaleBand().domain(data.map(d => d[selectedX])).range([0, width]).padding(0.1);
    } else {
        xScale = d3.scaleLinear().domain(d3.extent(data, d => d[selectedX])).range([0, width]);
    }

    // For categorical Y-axis
    if (features.includes(selectedY) && (selectedY === "genre" || selectedY === "artist")) {
        yScale = d3.scaleBand().domain(data.map(d => d[selectedY])).range([height, 0]).padding(0.1);
    } else {
        yScale = d3.scaleLinear().domain(d3.extent(data, d => d[selectedY])).range([height, 0]);
    }
    
    // Update axes based on selected scales
    svg_scatter.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    svg_scatter.append("g").call(d3.axisLeft(yScale));

    xlabel_scatter.text(featureLabels[selectedX])
    .attr("fill", "#b3b3b3");;
    ylabel_scatter.text(featureLabels[selectedY])
    .attr("fill", "#b3b3b3");;
    chart_title_scatter.text(`Scatterplot of ${featureLabels[selectedY]} vs ${featureLabels[selectedX]}`)
        .attr("fill", "#b3b3b3");

    let circles = svg_scatter.selectAll("circle").data(data);
    circles.enter().append("circle")
    circles.enter().append("circle")
        .merge(circles)
        .transition()
        .attr("cx", d => {
            if (xScale.bandwidth) {
                return xScale(d[selectedX]) + xScale.bandwidth() / 2;  // Centering for categorical axes
            }
            return xScale(d[selectedX]);  // Linear scale, no adjustment needed
        })
        .attr("cy", d => {
            if (yScale.bandwidth) {
                return yScale(d[selectedY]) + yScale.bandwidth() / 2;  // Centering for categorical axes
            }
            return yScale(d[selectedY]);  // Linear scale, no adjustment needed
        })
        .attr("r", 3)
        .attr("fill", "#1db954");

    
    circles.exit().remove();
}

// BAR CHART
const dropdown_bar = d3.select("#bar-category-dropdown");
const categories = ["year", "genre", "artist", "mode", "key"];
let categoricalFeature = categories[0]
let isVertical = true;
categories.forEach(
    f => dropdown_bar.append("option")
    .text(featureLabels[f] || f)
    .attr("value", f)
    .property("selected", f === categoricalFeature)
);

const svg_bar = d3.select("#barchart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

svg_bar.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", "#212121")
    .style("pointer-events", "all")
    .on("mouseover", function() {
        // Make the labels and bars scrollable on hover
        d3.select(this).style("overflow-x", "scroll");
    });

const xlabel_bar = svg_bar.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 80)
    .attr("text-anchor", "middle")
    .text(isVertical ? featureLabels[categoricalFeature] : "Frequency");

const ylabel_bar = svg_bar.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text(isVertical ? "Frequency" : featureLabels[categoricalFeature]);

const chart_title_bar = svg_bar.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold");

d3.csv("merged_songs.csv").then(csvData => {
    updateBarChart(processDataBar(csvData, categoricalFeature));
    dropdown_bar.on("change", function () {
        categoricalFeature = this.value;
        updateBarChart(processDataBar(csvData, categoricalFeature));
    });
    d3.select("#bar-toggle-axis").on("click", function () {
        isVertical = !isVertical;
        updateBarChart(processDataBar(csvData, categoricalFeature));
    });
});

function processDataBar(data, category) {
    const freqMap = d3.rollup(data, v => v.length, d => d[category]);
    return Array.from(freqMap, ([key, value]) => ({ key, value }));
}

function updateBarChart(data) {
    svg_bar.selectAll("rect").remove();
    svg_bar.selectAll("g").remove();
    
    const xScale = isVertical ? d3.scaleBand().domain(data.map(d => d.key)).range([0, width]).padding(0.2)
                              : d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([0, width]);
    
    const yScale = isVertical ? d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([height, 0])
                              : d3.scaleBand().domain(data.map(d => d.key)).range([height, 0]).padding(0.2);
    
    svg_bar.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale)).selectAll("text")
        .attr("transform", "rotate(-45)").style("text-anchor", "end");
    svg_bar.append("g").call(d3.axisLeft(yScale));

    xlabel_bar.text(isVertical ? featureLabels[categoricalFeature] : "Frequency")
    .attr("fill", "#b3b3b3");;
    ylabel_bar.text(isVertical? "Frequency": featureLabels[categoricalFeature])
    .attr("fill", "#b3b3b3");;
    chart_title_bar.text(`Bar Chart of ${featureLabels[categoricalFeature]} Frequency`)
        .attr("fill", "#b3b3b3");
    
    svg_bar.selectAll("rect").data(data).enter().append("rect")
        .attr("x", d => isVertical? xScale(d.key) : 0)
        .attr("y", d => isVertical? yScale(d.value) : yScale(d.key))
        .attr("width", d => isVertical ? xScale.bandwidth() : xScale(d.value))
        .attr("height", d => isVertical ? height - yScale(d.value) : yScale.bandwidth())
        .attr("fill", "#1db954");
}

// HIST CHART
const dropdown_hist = d3.select("#hist-category-dropdown");
const num_categories = ["duration_ms", "year", "popularity", "danceability", "energy", "key", "loudness", "mode", "speechiness", "acousticness", "instrumentalness", "liveness", "valence", "tempo", "rank", "last-week", "peak-rank"];
let NumericFeature = num_categories[0]
let isVertical_hist = true;
num_categories.forEach(
    f => dropdown_hist.append("option")
    .text(featureLabels[f] || f)
    .attr("value", f)
    .property("selected", f === NumericFeature)
);

const svg_hist = d3.select("#histogram")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

svg_hist.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", "#212121");

const xlabel_hist = svg_hist.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 80)
    .text(isVertical_hist ? featureLabels[NumericFeature] : "Frequency");

const ylabel_hist = svg_hist.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text(isVertical_hist ? "Frequency" : featureLabels[NumericFeature]);

const chart_title_hist = svg_hist.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold");

d3.csv("merged_songs.csv").then(csvData => {
    updateHistChart(processDataHist(csvData, NumericFeature));
    dropdown_hist.on("change", function () {
        NumericFeature = this.value;
        updateHistChart(processDataHist(csvData, NumericFeature));
    });
    d3.select("#hist-toggle-axis").on("click", function () {
        isVertical_hist = !isVertical_hist;
        updateHistChart(processDataHist(csvData, NumericFeature));
    });
});

function processDataHist(data, category) {
    const values = data.map(d => +d[category]); // Convert to numbers

    // Create histogram bins
    const histogram = d3.histogram()
        .domain([d3.min(values), d3.max(values)])
        .thresholds(10);  // Adjust number of bins here

    const bins = histogram(values);

    return bins.map(d => ({
        key: ( (d.x0 + d.x1) / 2 ).toFixed(2),  // Convert midpoint to string
        value: d.length  // Frequency count
    }));
}


function updateHistChart(data) {
    svg_hist.selectAll("rect").remove();
    svg_hist.selectAll("g").remove();

    // Use scaleBand for discrete categories (bins)
    const xScale = isVertical_hist 
        ? d3.scaleBand().domain(data.map(d => d.key)).range([0, width]).padding(0.1)
        : d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([0, width]);
    
    const yScale = isVertical_hist 
        ? d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([height, 0])
        : d3.scaleBand().domain(data.map(d => d.key)).range([0, height]).padding(0.1);

    // Axes
    svg_hist.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg_hist.append("g").call(d3.axisLeft(yScale));

    // Update Labels
    xlabel_hist.text(featureLabels[NumericFeature]).attr("fill", "#b3b3b3");
    ylabel_hist.text("Frequency").attr("fill", "#b3b3b3");
    chart_title_hist.text(`Histogram of ${featureLabels[NumericFeature]}`).attr("fill", "#b3b3b3");

    // Draw Histogram Bars
    svg_hist.selectAll("rect").data(data).enter().append("rect")
        .attr("x", d => isVertical_hist ? xScale(d.key) : 0)
        .attr("y", d => isVertical_hist ? yScale(d.value) : yScale(d.key))
        .attr("width", d => isVertical_hist ? xScale.bandwidth() : xScale(d.value))
        .attr("height", d => isVertical_hist ? height - yScale(d.value) : yScale.bandwidth())
        .attr("fill", "#1db954");
}