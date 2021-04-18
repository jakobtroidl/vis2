/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

// init global variables
let myMapVis;
//let myScatterVis;
//let myBrushVis;

// init global switches
let selectedState = '';

// load data using promises
let promises = [
    d3.json("data/county_us.topojson"),
    d3.csv("data/us-accidents-severity-4-Nov-Dec-2020.csv")
];

Promise.all(promises)
    .then( function(data){ initMainPage(data) })
    .catch( function (err){console.log(err)} );

const testStippling = (width, height, stippleRadius = 5.0, fromTo = undefined) => {
    const bounds = [0, 0, width, height];
    if (!fromTo) {
        // just point from left to right by default
        fromTo = [...bounds];
        fromTo[3] = 0;
    }

    // init
    const context2D = d3.select('#mapDiv')
        .append('canvas')
        .attr('width', width)
        .attr('height', height)
        .node()
        .getContext('2d');
    const gradient = context2D.createLinearGradient(...fromTo);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'white');
    context2D.fillStyle = gradient;
    context2D.fillRect(...bounds);

    // stipple

    stipple(
        DensityFunction2D.fromImageData2D(context2D.getImageData(...bounds)),
        stippleRadius
    ).then(stipples => {
        // draw
        const svg = d3.select('#mapDiv')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        stipples.forEach(s => {
            svg.append('circle')
                .attr('cx', s.x)
                .attr('cy', s.y)
                .attr('r', stippleRadius)
                .style('fill', 'black')
        });
    });
}

// initMainPage
function initMainPage(dataArray) {
    // test stippling using a canvas gradient
    testStippling(300, 100);

    // init map
    //myMapVis = new mapVis('mapDiv', dataArray[0], dataArray[1]);

    // init scatter
    //myScatterVis = new scatterVis('scatterDiv', dataArray[1]);

    // init brush
    //myBrushVis = new brushVis('brushDiv', dataArray[1]);
}


