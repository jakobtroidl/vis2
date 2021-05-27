brushVis = function(_parentElement, _data) {
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];

    // call method initVis
    this.initVis();
};

// init brushVis
brushVis.prototype.initVis = function() {
    let vis = this;

    vis.margin = {top: 20, right: 50, bottom: 20, left: 50};
    vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
    vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // clip path
    vis.svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", vis.width)
        .attr("height", vis.height);

    // add title
    vis.svg.append('g')
        .attr('class', 'title')
        .append('text')
        .text('Title for Timeline')
        .attr('transform', `translate(${vis.width/2}, -20)`)
        .attr('text-anchor', 'middle');

    // init scales
    vis.x = d3.scaleTime().range([0, vis.width]);
    vis.y = d3.scaleLinear().range([vis.height, 0]);

    // init x & y axis
    vis.xAxis = vis.svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + vis.height + ")");
    vis.yAxis = vis.svg.append("g")
        .attr("class", "axis axis--y");

    // init pathGroup
    vis.pathGroup = vis.svg.append('g').attr('class','pathGroup');

    // init path one (average)
    vis.pathOne = vis.pathGroup
        .append('path')
        .attr("class", "pathOne");

    // init path two (single state)
    vis.pathTwo = vis.pathGroup
        .append('path')
        .attr("class", "pathTwo");

    // init path generator
    vis.area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(function(d) { return vis.x(d.date); })
        .y0(vis.y(0))
        .y1(function(d) { return vis.y(d.average); });

    // init brushGroup:
    vis.brushGroup = vis.svg.append("g")
        .attr("class", "brush");

    // init brush
    vis.brush = d3.brushX()
        .extent([[0, 0], [vis.width, vis.height]])
        .on("brush end", function(){
            let currentBrushRegion = d3.event.selection;
            myMapVis.selectedRegion = [vis.x.invert(currentBrushRegion[0]), vis.x.invert(currentBrushRegion[1])];
            myMapVis.wrangleData();
            myScatterVis.selectedRegion = [vis.x.invert(currentBrushRegion[0]), vis.x.invert(currentBrushRegion[1])];
            myScatterVis.wrangleData();
        });

    // call method initVis
    this.initDataWrangling();
};

// initDataWrangling - data wrangling, done only once
brushVis.prototype.initDataWrangling = function() {
    let vis = this;

    let parseDate = d3.timeParse("%Y");

    vis.data.forEach(function(d){
        d.date = parseDate(d.date);
        d.average = parseFloat(d.average);
        d.salary = parseFloat(d.salary);
    });

    vis.filteredData = vis.data.sort(function(a,b){
        return a.date - b.date
    });

    let dataByDate = d3.nest()
        .key(function(d) { return d.date; })
        .entries(vis.filteredData);

    vis.averageData = [];

    // iterate over each year
    dataByDate.forEach( year => {
        let tmpSum = 0;
        let tmpLength = year.values.length;
        let tmpDate = year.values[0].date;
        year.values.forEach( value => {
            tmpSum += value.average;
        });

        vis.averageData.push (
            {date: tmpDate, average: tmpSum/tmpLength}
        )
    });

    this.wrangleData();
};

// wrangleData - gets called whenever a state is selected
brushVis.prototype.wrangleData = function(){
    let vis = this;

    // reset displayData
    vis.displayData = [];

    // iterate over filteredData and gab only selected States
    if (selectedState === '') {
        vis.filteredData.forEach(d => {
            vis.displayData.push(d);
        })
    } else {
        vis.filteredData.forEach(d => {
            if (d.state === selectedState) {
                vis.displayData.push(d);
            }
        })
    }

    // Update the visualization
    this.updateVis();
};

// updateVis
brushVis.prototype.updateVis = function() {
    let vis = this;

    // update domains
    vis.x.domain( d3.extent(vis.displayData, function(d) { return d.date }) );
    vis.y.domain( d3.extent(vis.filteredData, function(d) { return d.average }) );

    // draw x & y axis
    vis.xAxis.transition().duration(400).call(d3.axisBottom(vis.x));
    vis.yAxis.transition().duration(400).call(d3.axisLeft(vis.y).ticks(2));

    // draw pathOne
    vis.pathOne.datum(vis.averageData)
        .transition().duration(400)
        .attr("d", vis.area)
        .attr("clip-path", "url(#clip)");

    // draw pathTwo if selectedState
    if (selectedState !== ''){
        vis.pathTwo.datum(vis.displayData)
            .transition().duration(400)
            .attr('fill', 'rgba(255,0,0,0.47)')
            .attr('stroke', 'darkred')
            .attr("d", vis.area);
    } else {
        vis.pathTwo.datum([vis.filteredData[1], vis.filteredData[299]])
            .transition().duration(400)
            .attr('fill', 'rgba(255,0,0,0)')
            .attr('stroke', 'transparent')
            .attr("d", vis.area);
    }

    vis.brushGroup
        .call(vis.brush);
};


// tooltip - in case one wants it
/*div.transition().duration(100)
    .style('opacity', 1)
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px");
div
    .html(`<div class="row"><div class="col-12" style="color: lightcyan">plain text</div></div>`);*/