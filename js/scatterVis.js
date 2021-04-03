// constructor
scatterVis = function(_parentElement, _data) {
    this.parentElement = _parentElement;
    this.data = _data;
    this.selectedRegion = [];

    // call method initVis
    this.initVis();
};


// init scatterVis
scatterVis.prototype.initVis = function() {
    let vis = this;

    vis.margin = {top: 50, right: 50, bottom: 50, left: 50};
    vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
    vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // add title
    vis.svg.append('g')
        .attr('class', 'title')
        .append('text')
        .text('Title for Scatter')
        .attr('transform', `translate(${vis.width/2}, -20)`)
        .attr('text-anchor', 'middle');

    // init x & y scales
    vis.x = d3.scaleLinear().range([0, vis.width]);
    vis.y = d3.scaleLinear().range([vis.height, 0]);

    // init x & y axis
    vis.xAxis = vis.svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + vis.height + ")");
    vis.yAxis = vis.svg.append("g")
        .attr("class", "axis axis--y");

    // init group for circles;
    vis.circleGroup = vis.svg.append('g').attr('class','circleGroup');

    this.wrangleData()
};

scatterVis.prototype.wrangleData = function() {
    let vis = this;

    // filter according to selectedRegion, init empty array
    let filteredData = [];

    // if there is a region selected
    if (vis.selectedRegion.length !== 0){
        // iterate over all rows of the csv (vis.data)
        vis.data.forEach( row => {
            // and push rows with proper dates into filteredData
            if (vis.selectedRegion[0].getTime() <= row.date.getTime() && row.date.getTime() <= vis.selectedRegion[1].getTime() ){
                filteredData.push(row);
            }
        });
    } else {
        filteredData = vis.data;
    }

    // nest data(filteredData) by state
    let dataByState = d3.nest()
        .key(function(d) { return d.state; })
        .entries(filteredData);

    vis.displayData = [];

    // iterate over each year
    dataByState.forEach( state => {
        let tmpSumCategoryOne = 0;
        let tmpSumCategoryTwo = 0;
        let tmpLength = state.values.length;
        let tmpState = state.values[0].state;

        // and calculate average for all values
        state.values.forEach( value => {
            tmpSumCategoryOne += +value.salary;
            tmpSumCategoryTwo += +value.average;
        });
        // then create an object with that info and push it into the displayData array
        vis.displayData.push (
            {state: tmpState, ratio: (tmpSumCategoryOne/tmpLength)/(tmpSumCategoryTwo/tmpLength), averageCategoryOne: tmpSumCategoryOne/tmpLength, averageCategoryTwo: tmpSumCategoryTwo/tmpLength}
        )
    });

    this.updateVis()
};


// init scatterVis
scatterVis.prototype.updateVis = function() {
    let vis = this;

    // color scale
    vis.colorScale = d3.scaleLinear().range(['white','steelblue']).domain(d3.extent(vis.displayData, function(d) { return d.ratio }));


    // update domains
    vis.x.domain( d3.extent(vis.displayData, function(d) { return d.averageCategoryOne }) );
    vis.y.domain( d3.extent(vis.displayData, function(d) { return d.averageCategoryTwo }) );


    // draw x & y axis
    vis.xAxis.transition().duration(400).call(d3.axisBottom(vis.x));
    vis.yAxis.transition().duration(400).call(d3.axisLeft(vis.y));


    vis.circles = vis.circleGroup.selectAll('.scatter-circle').data(vis.displayData, function (d) {
        return d.state;
    });

    vis.circles.enter().append('circle')
        .attr('class', 'scatter-circle')
        .attr('id', function (d){ return `circle_${d.state}`})
        .on('mouseover', function(d){
            // tooltip - in case one wants it
            div.transition().duration(400)
                .style('opacity', 1)
                .style("left", (d3.event.pageX + 30) + "px")
                .style("top", (d3.event.pageY) + "px");
            div
                .html(`<div class="row"><div class="col-12" style="color: lightcyan">ratio: ${d.ratio}</div></div>`);
            d3.select(this).attr('fill', 'rgba(255,10,22,0.72)').attr('stroke', 'darkred')})
        .on('mouseout', function(d){
            // tooltip
             div.transition().duration(500)
                 .style('opacity', 0);

            d3.select(this).attr('stroke', 'transparent').attr('fill', function(d){ return vis.colorScale(d.ratio) });})
        .merge(vis.circles)
        .transition()
        .duration(500)
        .attr('r', function(d,i){return 10})
        .attr('cx', function (d) { return vis.x(d.averageCategoryOne) })
        .attr('cy', function (d) { return vis.y(d.averageCategoryTwo) })
        .attr('fill', function(d){ return vis.colorScale(d.ratio) });
};


let div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
