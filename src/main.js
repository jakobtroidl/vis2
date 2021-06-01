// load data using promises
let promises = [
    d3.json("county_us.topojson"),
    d3.csv("us-accidents-severity-4-Nov-Dec-2020.csv")
];

// TODO: do this properly
let accidents = [[], []];

Promise.all(promises)
    .then(function (data) {
        accidents = data;//initMainPage(data)
    })
    .catch(function (err) {
        console.log(err)
    });

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
        .attr('cx', function (s) {
            return s.relativeX * outputWidth;
        })
        .attr('cy', function (s) {
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

function showMachBandingForm() {
    const useMachbanding = document.getElementById('machbanding').checked;
    document.getElementById('machbandingForm').style.display = (useMachbanding ? 'block' : 'none');
}

function openTab(name) {
    let i;
    let x = document.getElementsByClassName("tab");
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    document.getElementById(name).style.display = "block";
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
        case 'accidents':
            break;
        case 'image':
            break;
        case 'gradient':
            break;
        case 'custom':
            break;
        default:
            break;
    }
}

let currentStippledDataSet = null;

async function visualizeCurrentStipples() {
    // remove existing visualization
    const visDiv = '#mapDiv';
    d3.select(visDiv).select('svg').remove();

    if (currentStippledDataSet) {
        const outputScale = document.getElementById('visScale').value;
        const scaleByDensity = document.getElementById('scaleByDensity').checked;
        const colorMap = document.getElementById('stippleColorMap').value;
        const interpolateColor = document.getElementById('interpolateColorMap').checked;

        const outputWidth = currentStippledDataSet.width * outputScale;
        const outputHeight = currentStippledDataSet.height * outputScale;
        const svg = d3.select(visDiv)
            .append('svg')
            .attr('width', outputWidth)
            .attr('height', outputHeight);

        if (currentStippledDataSet.geographicalDataset) {
            const states = await d3.json("county_us.topojson");
            const projection = createProjection(outputWidth, outputHeight);
            const path = d3.geoPath().projection(projection);

            svg.append('g')
                .attr('id', 'states')
                .selectAll('path')
                .data(topojson.feature(states, states.objects.states).features)
                .enter().append('path')
                .attr('d', path)
                .style('fill', 'none')
                .style('stroke', 'grey')
                .style('stroke-width', '1px');
        }


        const card = initCard(currentStippledDataSet, currentStippledDataSet.geographicalDataset)

        currentStippledDataSet.stipples.forEach(s => {
            if (s.density !== 0.0) {
                svg.append('circle')
                    .attr('cx', s.relativeX * outputWidth)
                    .attr('cy', s.relativeY * outputHeight)
                    .attr('r', currentStippledDataSet.stippleRadius * outputScale * (scaleByDensity ? s.density : 1))
                    .style('fill', (colorMap === 'none' ? 'black' : getColorString(s.density, colorMap, interpolateColor)))
                    .on('mouseenter', function () {
                        d3.select(this).style('fill', 'rgb(255, 0, 0)'); // color stipples
                        if (currentStippledDataSet.geographicalDataset) {
                            let bounds = stippleBounds(s, currentStippledDataSet.voronoi);
                            card.drawArea(bounds, currentStippledDataSet.voronoi, getVoronoiCell(s.position(), currentStippledDataSet.voronoi));
                        }
                    })
                    .on('mouseleave', function () {
                        d3.select(this).style('fill', (colorMap === 'none' ? 'black' : getColorString(s.density, colorMap, interpolateColor)));
                    })
            }
        })
    }
}

const initCard = (data, geographical) => {
    let cardDiv = '#cardDiv';
    let box = document.querySelector(cardDiv);

    let detailsDiv = 'details'
    let details = document.getElementById(detailsDiv);

    if (geographical) {
        details.style.display = 'block';
    } else {
        details.style.display = 'none';
    }
    let myData = {data: data.locationToData, width: data.width, height: data.height};
    return new Card(myData, box.clientWidth, box.clientHeight, cardDiv);
}

async function loadStates(filename) {
    const states = await d3.json(filename);
    return topojson.feature(states, states.objects.states).features;
}



function stippleDataSet() {
    // todo: height depends on width in most cases: only set height for gradient and custom datasets
    const width = parseInt(document.getElementById('stippleWidth').value);
    const height = parseInt(document.getElementById('stippleHeight').value);
    const stippleRadius = parseFloat(document.getElementById('stippleRadius').value);
    const useMachbanding = document.getElementById('machbanding').checked;
    const machbandingQuantization = parseInt(document.getElementById('machbandingQuantization').value);
    const machbandingWeight = parseFloat(document.getElementById('machbandingWeight').value);
    const machbandingBlurRadius = parseFloat(document.getElementById('machbandingBlurRadius').value);
    const dataset = document.forms['dataSetForm']['dataset'].value;

    // todo: add prepared heightmaps
    // todo: add prepared weather data
    // todo: calculate height from width for geoAlbersUsa
    let dataSourceFunc;
    let geographicalDataset;
    switch (dataset) {
        case 'accidentsNov':
            dataSourceFunc = async () => {
                const data = await d3.csv("us-accidents-severity-4-Nov-Dec-2020.csv");
                return createGeographicDataImage(data, width, height);
            };
            geographicalDataset = true;
            break;
        case 'accidentsDec':
            dataSourceFunc = async () => {
                const data = await d3.csv("us-accidents-severity-4-Dec-2020.csv");
                return createGeographicDataImage(data, width, height);
            };
            geographicalDataset = true;
            break;
        case 'hailstorm0':
            dataSourceFunc = async () => {
                const data = await d3.csv("hail-2015-sevprob-larger-0.csv");
                return createGeographicDataImage(data, width, height);
            };
            geographicalDataset = true;
            break;
        case 'hailstorm56':
            dataSourceFunc = async () => {
                const data = await d3.csv("hail-2015-sevprob-larger-56.csv");
                return createGeographicDataImage(data, width, height);
            };
            geographicalDataset = true;
            break;
        case 'hailstorm80':
            dataSourceFunc = async () => {
                const data = await d3.csv("hail-2015-sevprob-larger-80.csv");
                return createGeographicDataImage(data, width, height);
            };
            geographicalDataset = true;
            break;
        case 'topo':
            // TODO: replace filename
            geographicalDataset = false;
            dataSourceFunc = async () => {
                return createImageData('eggholder.png', width);
            }
            break;
        case 'eggholder':
            geographicalDataset = false;
            dataSourceFunc = async () => {
                return createImageData('eggholder.png', width);
            }
            break;
        case 'cglogo':
            // TODO: replace filename
            geographicalDataset = false;
            dataSourceFunc = async () => {
                return createImageData('eggholder.png', width);
            }
            break;
        case 'meister':
            // TODO: replace filename
            geographicalDataset = false;
            dataSourceFunc = async () => {
                return createImageData('eggholder.png', width);
            }
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
            geographicalDataset = false;
            break;
        case 'image':
            const imageFile = document.getElementById('imageToStipple').files[0];
            geographicalDataset = false;
            dataSourceFunc = async () => {
                return createImageData(await readFile(imageFile), width);
            }
            break;
        case 'custom':
            const dataSource = document.getElementById('customDataURL').value;
            const projection = document.getElementById('customProjection').value;
            const xAttribute = document.getElementById('xAttribute').value;
            const yAttribute = document.getElementById('yAttribute').value;
            const scaleByMaxDensity = document.getElementById('useGrayscale').checked;

            if (projection === 'none') {
                geographicalDataset = false;
            }

            dataSourceFunc = async () => {
                let data;
                if (dataSource.toLowerCase().endsWith('.csv')) {
                    data = await d3.csv(dataSource);
                } else if (dataSource.toLowerCase().endsWith('.json')) {
                    data = await d3.json(dataSource);
                }
                if (projection === 'none') {
                    return createImageFromData(data, width, height, xAttribute, yAttribute, null, scaleByMaxDensity);
                } else {
                    return createGeographicDataImage(data, width, height, projection, xAttribute, yAttribute, scaleByMaxDensity);
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
            voronoi,
            geographicalDataset
        };
    })().then(stippledDataset => {
        currentStippledDataSet = stippledDataset;
        visualizeCurrentStipples().then(r => console.log("Done with stippling"));
    });

    return false; // i.e. do not refresh the page
}
