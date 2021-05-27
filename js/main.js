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

// TODO: do this properly
let accidents = [[], []];

Promise.all(promises)
    .then( function(data){
        accidents = data;//initMainPage(data)
    })
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

const stippleFoo = async (dataset, width, height, outputScale = 1.5, stippleRadius = 1.0) => {
    // stipple
    const {stipples, voronoi} = await stipple(dataset, stippleRadius);

    // draw
    const outputWidth = width * outputScale;
    const outputHeight = height * outputScale;
    const svg = d3.select('#mapDiv')
        .append('svg')
        .attr('width', outputWidth)
        .attr('height', outputHeight);

    stipples.forEach(s => {
        if (s.density !== 0.0) {
            svg.append('circle')
                .attr('cx', s.relativeX * outputWidth)
                .attr('cy', s.relativeY * outputHeight)
                .attr('r', stippleRadius * s.density * outputScale)
                .style('fill', 'black')
                .on("mouseenter", function (s) {
                    console.log(s);
                })
        }
    });
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

function showMachBandingForm() {
    const useMachbanding = document.getElementById('machbanding').checked;
    document.getElementById('machbandingForm').style.display = (useMachbanding ? 'block' : 'none');
}

function showDataSetForm() {
    const dataSetForms = ['imageForm', 'gradientForm', 'customForm'];
    const selected = document.forms['dataSetForm']['dataset'].value;
    const selectedForm = `${selected}Form`;
    dataSetForms.forEach(id => {
        document.getElementById(id).style.display = (id === selectedForm ? 'block' : 'none');
    })

    // todo: maybe fill other form fields based on selection (e.g. from/to for gradient)
    switch (document.forms['dataSetForm']['dataset'].value) {
        case 'accidents': break;
        case 'image': break;
        case 'gradient': break;
        case 'custom': break;
        default: break;
    }
}

let currentStippledDataSet = null;
function visualizeCurrentStipples() {
    // remove existing visualization
    const visDiv = '#mapDiv';
    d3.select(visDiv).select('svg').remove();

    if (currentStippledDataSet) {
        // todo: gather visualization parameters
        const outputScale = document.getElementById('visScale').value;
        const scaleByDensity = document.getElementById('scaleByDensity').checked;
        const colorMap = document.getElementById('stippleColorMap').value;
        // todo: add color map stuff

        const outputWidth = currentStippledDataSet.width * outputScale;
        const outputHeight = currentStippledDataSet.height * outputScale;
        const svg = d3.select(visDiv)
            .append('svg')
            .attr('width', outputWidth)
            .attr('height', outputHeight);

        currentStippledDataSet.stipples.forEach(s => {
            if (s.density !== 0.0) {
                svg.append('circle')
                    .attr('cx', s.relativeX * outputWidth)
                    .attr('cy', s.relativeY * outputHeight)
                    .attr('r', currentStippledDataSet.stippleRadius * outputScale * (scaleByDensity ? s.density : 1))
                    .style('fill', 'black')
                    .on("mouseenter", function (s) {
                        console.log(s);
                    })
            }
        });

        // todo: add mouse hovering stuff
    }
}

const readFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result);
        console.log(file);
        reader.readAsDataURL(file);
    });
}
const loadImage = async (src) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => resolve(image);
        image.src = src;
    });
}

function stippleDataSet() {
    const width = parseInt(document.getElementById('stippleWidth').value);
    const height = parseInt(document.getElementById('stippleHeight').value);
    const stippleRadius = parseFloat(document.getElementById('stippleRadius').value);
    const useMachbanding = document.getElementById('machbanding').checked;
    const machbandingQuantization = parseInt(document.getElementById('machbandingQuantization').value);
    const machbandingWeight = parseFloat(document.getElementById('machbandingWeight').value);
    const machbandingBlurRadius = parseFloat(document.getElementById('machbandingBlurRadius').value);
    const dataset = document.forms['dataSetForm']['dataset'].value;

    // todo: calculate height from width for geoAlbersUsa
    let dataSourceFunc;
    switch (dataset) {
        case 'accidents':
            dataSourceFunc = async () => {
                const data = await d3.csv("data/us-accidents-severity-4-Nov-Dec-2020.csv");
                return createGeographicDataImage(data, width, height);
            };
            break;
        case 'gradient':
            const fromTo = [
                document.getElementById('gradientX1').value,
                document.getElementById('gradientY1').value,
                document.getElementById('gradientX2').value,
                document.getElementById('gradientY2').value,
            ];
            dataSourceFunc = async () => {
                const gradient = createGradientImage(width, height, fromTo);
                return {
                    densityImage: gradient,
                    locationToData: gradient
                };
            };
            break;
        case 'image':
            const imageFile = document.getElementById('imageToStipple').files[0];
            dataSourceFunc = async () => {
                const image = await loadImage(await readFile(imageFile));

                // get image data in target resolution
                const ratio = width / image.width;
                const scaledHeight = image.height * ratio;
                const ctx = new OffscreenCanvas(width, scaledHeight).getContext('2d');
                ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, scaledHeight);

                return {
                    densityImage: ctx.getImageData(0, 0, width, scaledHeight),
                    mapToLocation: ctx.getImageData(0, 0, width, scaledHeight)
                };
            };
            break;
        case 'custom':
            const dataSource = document.getElementById('customDataURL').value;
            const projection = document.getElementById('customProjection').value;
            const xAttribute = document.getElementById('xAttribute').value;
            const yAttribute = document.getElementById('yAttribute').value;
            dataSourceFunc = async () => {
                let data;
                if (dataSource.toLowerCase().endsWith('.csv')) {
                    data = await d3.csv(dataSource);
                } else if (dataSource.toLowerCase().endsWith('.json')) {
                    data = await d3.json(dataSource);
                }
                if (projection === 'none') {
                    return createImageFromData(data, width, height, xAttribute, yAttribute, null, true);
                } else {
                    return createGeographicDataImage(data, width, height, projection, xAttribute, yAttribute, false);
                }
            };
            break;
    }

    (async () => {
        const {densityImage, locationToData} = await dataSourceFunc();
        let densityFunction;
        if (useMachbanding) {
            densityFunction = DensityFunction2D.machBandingFromImageData2D(
                densityImage, machbandingQuantization, machbandingWeight, machbandingBlurRadius, rgbaToLuminance, null);
        } else {
            densityFunction = DensityFunction2D.fromImageData2D(densityImage);
        }
        const {stipples, voronoi} = await stipple(densityFunction, stippleRadius);

        return {
            width: densityFunction.width,
            height: densityFunction.height,
            stippleRadius,
            datasetType: dataset,
            densityImage,
            locationToData,
            stipples,
            voronoi
        };
    })().then(stippledDataset => {
        currentStippledDataSet = stippledDataset;
        visualizeCurrentStipples();
    });

    return false; // i.e. do not refresh the page
}
