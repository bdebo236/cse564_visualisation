document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".tablinks");
    const charts = document.querySelectorAll(".chart-container");

    buttons.forEach(button => {
        button.addEventListener("click", function () {
            buttons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            charts.forEach(chart => chart.classList.remove("active"));
            const targetId = this.getAttribute("data-target");
            document.getElementById(targetId).classList.add("active");
        });
    });

    document.getElementById("bar-container").classList.add("active");
});
