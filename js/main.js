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

const testStippling = async (data, width, height, outputScale = 1.5, machBanding = false, stippleRadius = 1.0, fromTo = undefined) => {
    const bounds = [0, 0, width, height];
    if (!fromTo) {
        // just point from left to right by default
        fromTo = [...bounds];
        fromTo[3] = 0;
    }

    // init
    // const context2D = d3.select('#mapDiv')
    //     .append('canvas')
    //     .attr('width', width)
    //     .attr('height', height)
    //     .node()
    //     .getContext('2d');

    let [imageData, metaData] = DataLoader.loadUsGeoData(data, width, height);

    //showImage(imageData, "mapDiv")

    //const gradient = context2D.createLinearGradient(...fromTo);

    // gradient.addColorStop(0, 'black');
    // gradient.addColorStop(1, 'white');
    // context2D.fillStyle = gradient;
    // context2D.fillRect(...bounds);


    // stipple
    const {stipples, voronoi} = await stipple(
        (machBanding ?
                DensityFunction2D.machBandingFromImageData2D(
                    imageData,//context2D.getImageData(...bounds),
                    5,
                    1.0, // full weight
                    stippleRadius) :
                DensityFunction2D.fromImageData2D(imageData)),
        stippleRadius);

    // draw
    const outputWidth = width * outputScale;
    const outputHeight = height * outputScale;
    const svg = d3.select('#mapDiv')
        .append('svg')
        .attr('width', outputWidth)
        .attr('height', outputHeight);

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

    let cardDiv = '#cardDiv';
    let box = document.querySelector(cardDiv);
    let cardWidth = box.clientWidth;
    let cardHeight = box.clientHeight;

    console.log(cardWidth, " ", cardHeight);

    let myData = {data: metaData, width: width, height: height};

    let card = new Card(myData, cardWidth, cardHeight, cardDiv);

    svg.selectAll("circle")
        .data(stipples).enter()
        .append('circle')
        .attr('cx', function(s){
            return s.relativeX * outputWidth;
        })
        .attr('cy', function(s){
            return s.relativeY * outputHeight;
        })
        .attr('r', function (s) {
            return stippleRadius * s.density * outputScale;
        })
        .style('fill', 'black')
        .on('mouseover', function (s) {
            d3.select(this).style('fill', 'rgb(255, 0, 0)'); // color stipples
            let bounds = stippleBounds(s, voronoi);
            card.drawArea(bounds, voronoi, getVoronoiCell(s.position(), voronoi));
        })
        .on('mouseleave', function (s) {
            d3.select(this).style('fill', 'black');
        })

    // stipples.forEach(s => {
    //     if (s.density !== 0.0) {
    //         svg.append('circle')
    //             .attr('cx', s.relativeX * outputWidth)
    //             .attr('cy', s.relativeY * outputHeight)
    //             .attr('r', stippleRadius * s.density * outputScale)
    //             .style('fill', 'black')
    //             .on("mouseenter", function (s) {
    //                 console.log(s);
    //             })
    //     }
    // });
}

// initMainPage
function initMainPage(dataArray) {
    // test stippling using a canvas gradient
    testStippling(dataArray[1], 480, 250).then(_x => console.log('finished stippling'));

    /*
     * TODO: Accumulate densities of data sets in images (e.g. in an CanvasRenderingContext2D from an OffscreenCanvas)
     *       and use these images to create DensityFunction2D instances.
     *       While accumulating the densities, we should also create a backing 2d-array of arrays containing our actual
     *       data (e.g. descriptions of car accidents).
     *       This can later be used to show all data points represented by a stipple to the user on hover events.
     */

    // init map
    //myMapVis = new mapVis('mapDiv', dataArray[0], dataArray[1]);

    // init scatter
    //myScatterVis = new scatterVis('scatterDiv', dataArray[1]);

    // init brush
    //myBrushVis = new brushVis('brushDiv', dataArray[1]);
}


