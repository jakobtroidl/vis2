/* * * * * * * * * * * * * *
*          MapVis          *
* * * * * * * * * * * * * */

// constructor
mapVis = function(_parentElement, _dataTopographic, _dataFill) {
    this.parentElement = _parentElement;
    this.dataTopographic = _dataTopographic;
    this.dataFill = _dataFill;
    this.selectedRegion = [];

    // call method initVis
    this.initVis();
};

// init brushVis
mapVis.prototype.initVis = function() {
    let vis = this;

    vis.colorScale = d3.scaleLinear().range(['white','steelblue']).domain([0,100]);

    vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
    vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
    vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;

    // init drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width)
        .attr("height", vis.height)
        .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

    // add title
    vis.svg.append('g')
        .attr('class', 'title')
        .append('text')
        .text('Title for Map')
        .attr('transform', `translate(${vis.width/2}, 20)`)
        .attr('text-anchor', 'middle');


    // since projections don't work for some reason, we will use some basic math & transformations;
    vis.viewpoint = {'width': 975, 'height': 610};
    vis.zoom = vis.width/vis.viewpoint.width;

    // adjust map position
    vis.map = vis.svg.append("g")
        .attr("class", "states")
        .attr('transform', `scale(${vis.zoom} ${vis.zoom})`);

    // path generator
    vis.path = d3.geoPath();

    // draw states
    vis.map.selectAll("path")
        .data(topojson.feature(vis.dataTopographic, vis.dataTopographic.objects.states).features)
        .enter().append("path")
        .attr("d", vis.path)
        .attr('class', 'state')
        .attr("fill", 'transparent')
        .attr("stroke", 'black')
        .attr("stroke-width", 1)
        .on('mouseover', function(d){

            // tooltip - in case one wants it
            /*div.transition().duration(100)
                .style('opacity', 1)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            div
                .html(`<div class="row"><div class="col-12" style="color: lightcyan">plain text</div></div>`);*/

            // set selectedState
            selectedState = d.properties.name;
            myBrushVis.wrangleData();

            d3.select(this)
                .attr('stroke','darkred')
                .attr('stroke-width', 2)
                .attr('fill', 'rgba(255,0,0,0.47)')
                .style('opacity', 1)
        })
        .on('mouseout', function(d){

            // tooltip
           /* div.transition().duration(500)
                .style('opacity', 0);*/

            // reset selectedState
            selectedState = '';
            myBrushVis.wrangleData();

            d3.select(this)
                .attr("fill", function(){
                    let tmpState = d.properties.name;
                    let color;
                    vis.displayData.forEach(state => {
                        if (tmpState === state.state ) {
                            color = vis.colorScale(state.average);
                        }
                    });
                    return color;
                })
                .attr('stroke', 'rgb(14,15,85)')
                .attr('stroke-width', 1)
                .style('opacity', 1)
        })
        .on('click', function(d){
            console.log(d3.event.pageX);
            /*
                        d3.select(this).attr('class', 'noState');
                        d3.selectAll('.state').transition().duration(1000).attr('transform', 'translate(2000,0)');
            */
        });


    // having initialized the map, move on to wrangle data
    this.wrangleData();
};

// data wrangling - gets called by brush - two tasks: 1) filtering by date 2) sorting & calculating average by state
mapVis.prototype.wrangleData = function() {
    let vis = this;

    // filter according to selectedRegion, init empty array
    let filteredData = [];

    // if there is a region selected
    if (vis.selectedRegion.length !== 0){
        // iterate over all rows the csv (dataFill)
        vis.dataFill.forEach( row => {
            // and push rows with proper dates into filteredData
            if (vis.selectedRegion[0].getTime() <= row.date.getTime() && row.date.getTime() <= vis.selectedRegion[1].getTime() ){
                filteredData.push(row);
            }
        });
    } else {
        filteredData = vis.dataFill;
    }

    // sort by state - nest data(filteredData) by state
    let dataByState = d3.nest()
        .key(function(d) { return d.state; })
        .entries(filteredData);

    vis.displayData = [];

    // iterate over each year
    dataByState.forEach( state => {
        let tmpSum = 0;
        let tmpLength = state.values.length;
        let tmpState = state.values[0].state;
        state.values.forEach( value => {
            tmpSum += +value.average;
        });
        vis.displayData.push (
            {state: tmpState, average: tmpSum/tmpLength}
        )
    });

    this.updateVis();
};


// init brushVis
mapVis.prototype.updateVis = function() {
    let vis = this;

    // draw states
    d3.selectAll('.state')
        .transition()
        .duration(400)
        .attr("fill", function(d){
            let tmpState = d.properties.name;
            let color;
            vis.displayData.forEach(state => {
                if (tmpState === state.state ) {
                    color = vis.colorScale(state.average);
                }
            });
            if (color === undefined){
                return 'transparent'
            } else {
                return color;
            }

        })
        .attr('stroke', 'rgb(14,15,85)')
        .attr("stroke-width", 1)
        .attr('opacity', 1)
};
/*

let div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
*/
