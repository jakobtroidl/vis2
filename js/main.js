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

const testStippling = (width, height, machBanding = true, stippleRadius = 1.0, fromTo = undefined) => {
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
        (machBanding ?
                //MachBandingDensityFunction2D.fromImageData2D(
                DensityFunction2D.machBandingFromImageData2D(
                    context2D.getImageData(...bounds),
                    5,
                    1.0, // unweighted
                    stippleRadius) :
                DensityFunction2D.fromImageData2D(context2D.getImageData(...bounds))),
        stippleRadius
    ).then(({stipples, voronoi}) => {
        // draw
        const svg = d3.select('#mapDiv')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        /*
         * The stipple size or color could also be dependent on the density (i.e. s.density ∈ [0,1]).
         * The color could also encode some property of the underlying data (e.g. like in the voting data).
         *
         * Hovering on a stipple could also show some description of the data points that are represented by the stipple.
         * For this you can use the voronoi diagram:
         *   i = current stipple index
         *   cell = voronoi.polygonCell(i)
         *   bounds = polygonBounds(cell)
         *   dataCoords = []
         *   for x&y from bounds.min to bounds.max
         *       if (i === voronoi.delaunay.find(x, y, i)
         *           dataCoords.push([x,y])
         *   dataCoords can now be used to index a 2d array containing the actual data
         *
         *   e.g.:
         *   data = [
         *     [ [{description: 'foo'}, {description: 'bar'}], [], [] ],
         *     [ [], [], [{description: 'baz'}] ]
         *   ]
         *   dataCoords = [[0,0], [1,0]]
         *   for (const p of dataCoords)
         *       data[p[1]][p[0]].forEach(x => console.log(x.description));
         *   >>> 'foo'
         *   >>> 'bar'
         */
        stipples.forEach(s => {
            svg.append('circle')
                .attr('cx', s.x)
                .attr('cy', s.y)
                .attr('r', stippleRadius) // * s.density
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


