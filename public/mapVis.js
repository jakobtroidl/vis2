/* * * * * * * * * * * * * *
*          MapVis          *
* * * * * * * * * * * * * */
let margin, width, height, active;
let path, projection, g, svg, rect;
let div, colorScale, noReports_color;
let dotRadiusBig, dotRadiusSmall;

// constructor
mapVis = function (_parentElement, county_data, data) {
    this.parentElement = _parentElement;
    this.county_data = county_data;
    this.data = data;

    // call method initVis
    this.initVis();
};

// init brushVis
mapVis.prototype.initVis = function () {

    margin = {top: 1, right: 10, bottom: 5, left: 10};
    width = $("#" + this.parentElement).width() - margin.left - margin.right;
    height = $("#" + this.parentElement).height() - margin.top - margin.bottom;
    active = d3.select(null);

    // init drawing area
    svg = d3.select("#" + this.parentElement).append("svg")
        .attr('class', 'center-container')
        .attr("width", width)
        .attr("height", height)
        .attr('transform', `translate (${margin.left}, ${margin.top})`);

    rect = svg.append('rect')
        .attr('class', 'background center-container')
        .attr('height', height + margin.top + margin.bottom)
        .attr('width', width + margin.left + margin.right);
    //.on('click', clicked);


    projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(width * 1.3);

    // path generator
    path = d3.geoPath()
        .projection(projection);

    g = svg.append("g")
        .attr('class', 'center-container center-items us-state')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    this.ready(this.county_data, this.data);

    // Append Div for tooltip to SVG
    div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    colorScale = d3.scaleThreshold()
        .domain([10, 20, 30, 40, 50])
        .range(["#ffffff", "#ffd5d5", "#ffabab", "#ff8181", "#ff5757", "#ff2d2d", "#ff0000"]);


    //this.initLegend();

};

mapVis.prototype.initLegend = function () {
    var ext_color_domain = [0, 10, 20, 30, 40, 50];
    var legend_labels = ["< 10", "10+", "20+", "30+", "40+", "50+"];
    var no_reports_label = "no reports";

    let leg_margin = {top: 10, right: 10, bottom: 10, left: 10};
    let leg_width = $("#" + this.legendElement).width() - leg_margin.left - leg_margin.right;
    let leg_height = $("#" + this.legendElement).height() - leg_margin.top - leg_margin.bottom;

    const leg_svg = d3.select("#" + this.legendElement)
        .append("svg")
        .attr('class', 'center-container')
        .attr("width", leg_width)
        .attr("height", leg_height)
        .attr('transform', `translate (${leg_margin.left}, ${leg_margin.top})`);

    let legend = leg_svg.selectAll("g.legend")
        .data(ext_color_domain)
        .enter().append("g")
        .attr("class", "legend");

    const ls_w = 73, ls_h = 7;

    legend.append("rect")
        .attr("x", function (d, i) {
            return (i * ls_w) + ls_w;
        })
        .attr("y", 20)
        .attr("width", ls_w)
        .attr("height", ls_h)
        .style("fill", function (d, i) {
            return colorScale(d);
        })
        .style("stroke", "black");

    legend.append("text")
        .attr("x", function (d, i) {
            return (i * ls_w) + ls_w + 10;
        })
        .attr("y", 45)
        .text(function (d, i) {
            return legend_labels[i];
        });

    legend.append("rect")
        .attr("x", ls_w)
        .attr("y", 60)
        .attr("width", ls_w)
        .attr("height", ls_h)
        .style("fill", noReports_color)
        .style("stroke", "black");

    legend.append("text")
        .attr("x", 2 * ls_w + 5)
        .attr("y", 67)
        .text(no_reports_label);

    const legend_title = "Number of reported cases";

    leg_svg.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .attr("class", "legend_title")
        .text(function () {
            return legend_title
        });
}

mapVis.prototype.ready = function (us, data) {
    g.append("g")
        .attr("id", "counties")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "county-boundary");
    //.on("click", resetMapZoom);

    g.append("g")
        .attr("id", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "state");
    //.on("click", clicked);


    // add circles to g
    g.selectAll("circle")
        .data(data).enter()
        .append("circle")
        .attr("cx", function (d) {
            let proj = projection([d.LON, d.LAT]);
            if (proj != null) {
                 return proj[0];
            }
            else {
               // console.log(d.LON, " ", d.LAT);
            }
            return 0
        })
        .attr("cy", function (d) {
            let proj = projection([d.LON, d.LAT]);
            if (proj != null) {
                return proj[1];
            }
            else {
                console.log(d.LON, " ", d.LAT);
            }
            return 0
        })
        .attr("r", 1)
        .style("fill", "rgb(255.0, 0.0, 0.0)")
        .style("opacity", 1.0)
    // .on("mouseover", function(d) {
    //     d3.select(this).
    //     transition()
    //         .duration(200)
    //         .attr('r', dotRadiusBig);
    //
    //     div.transition()
    //         .duration(200)
    //         .style("opacity", .9);
    //
    //     div.text(d.name)
    //         .style("left", (d3.event.pageX) + "px")
    //         .style("top", (d3.event.pageY - 28) + "px");
    // })
    //
    // // fade out tooltip on mouse out
    // .on("mouseout", function(d) {
    //
    //     if(d !== selectedCenter) {
    //         d3.select(this)
    //             .transition()
    //             .duration(200)
    //             .attr('r', dotRadiusSmall);
    //
    //         div.transition()
    //             .duration(500)
    //             .style("opacity", 0);
    //     }
    // })
    //
    // // BASEBALL CARD APPEARANCE ON MOUSE CLICK //
    // .on("click", function(d) {
    //     selectedCenter = d;
    //     d3.selectAll("circle").attr("r", dotRadiusSmall);
    //     console.log(d.name);
    //     let out = d.name.replace("(", "");
    //     out = out.replace(")", "");
    //     out = out.replace(/\s+/g, '');
    //     d3.select("#" + out)
    //         .attr("r", dotRadiusBig);
    //     myBaseballCard.renderCenter(d);
    // });


    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function (a, b) {
            return a !== b;
        }))
        .attr("id", "state-borders")
        .attr("d", path);
}

function clicked(d) {
    if (d3.select('.background').node() === this) return resetMapZoom;

    if (active.node() === this) return resetMapZoom;

    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = 0.9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    g.transition()
        .duration(750)
        .style("stroke-width", 1.5 / scale + "px")
        .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

    let zoom_btn = document.getElementById("zoom_btn");
    console.log(zoom_btn);
    zoom_btn.style.display = "";

}


function resetMapZoom() {
    active.classed("active", false);
    active = d3.select(null);

    g.transition()
        .delay(100)
        .duration(750)
        .style("stroke-width", "1.5px")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let zoom_btn = document.getElementById("zoom_btn");
    zoom_btn.style.display = "none";
}

mapVis.prototype.updateDot = function (center) {
    d3.selectAll("circle").attr("r", dotRadiusSmall);

    let out = center.name.replace("(", "");
    out = out.replace(")", "");
    out = out.replace(/\s+/g, '');
    //let dot_id = center.name.replace(/\s+/g, '');
    d3.selectAll("#" + out).transition()
        .duration(200)
        .attr("r", dotRadiusBig);
}
