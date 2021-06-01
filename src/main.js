

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

function changeHeightInputVisibility(show = false) {
    document.getElementById('stippleHeightContainer').style.display = show ? 'block' : 'none';
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
        case 'gradient':
            changeHeightInputVisibility(true);
            document.getElementById('gradientX2').value = document.getElementById('stippleWidth').value;
            break;
        case 'custom':
            changeHeightInputVisibility(true);
            break;
        default:
            changeHeightInputVisibility(false);
            break;
    }
}

/**
 * True if stippling is currently in progress, false otherwise.
 * @type {boolean}
 */
let stipplingInProgress = false;

/**
 * Holds the last stippled dataset.
 * @type {null}
 */
let currentStippledDataSet = null;

/**
 * Disables triggering the stippling process from the UI.
 */
function disableStippling() {
    stipplingInProgress = true;
    const stippleButton = document.getElementById('stippleButton');
    stippleButton.style.backgroundColor = '#929292';
    stippleButton.value = 'Stippling ...';
}

/**
 * Enables triggering the stippling process from the UI.
 */
function enableStippling() {
    stipplingInProgress = false;
    const stippleButton = document.getElementById('stippleButton');
    stippleButton.style.backgroundColor = '#4CAF50';
    stippleButton.value = 'Stipple!';
}

async function loadStates(name) {
    const states = await d3.json(name);
    return topojson.feature(states, states.objects.states).features;
}

function geoPath(width, height, projectionMethod = 'geoAlbersUsa') {
    const projection = createProjection(width, height, projectionMethod);
    return d3.geoPath().projection(projection);
}

async function visualizeCurrentStipples() {
    // remove existing visualization
    const visDiv = '#mapDiv';
    d3.select(visDiv).select('svg').remove();

    if (currentStippledDataSet && !stipplingInProgress) {
        const outputScale = document.getElementById('visScale').value;
        const scaleByDensity = document.getElementById('scaleByDensity').checked;
        const colorMap = document.getElementById('stippleColorMap').value;
        const interpolateColor = document.getElementById('interpolateColorMap').checked;
        const reverseColors = document.getElementById('reverseColors').checked;

        const outputWidth = currentStippledDataSet.width * outputScale;
        const outputHeight = currentStippledDataSet.height * outputScale;
        const svg = d3.select(visDiv)
            .append('svg')
            .attr('width', outputWidth)
            .attr('height', outputHeight);

        if (reverseColors) {
            svg.append('rect')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', 'black');
        }

        if (currentStippledDataSet.geographicalDataset) {
            const path = geoPath(outputWidth, outputHeight);
            svg.append('g')
                .attr('id', 'states')
                .selectAll('path')
                .data(await loadStates("county_us.topojson"))
                .enter().append('path')
                .attr('d', path)
                //.attr('class', 'state')
                .style('fill', 'none')
                .style('stroke', 'grey')
                .style('stroke-width', '1px');
        }

        const card = initCard(currentStippledDataSet, currentStippledDataSet.geographicalDataset)

        const getStippleColor = (density) => {
            if (reverseColors) {
                if (colorMap === 'none') {
                    return 'white';
                } else {
                    return getColorString(1.0 - density, colorMap, interpolateColor);
                }
            } else {
                if (colorMap === 'none') {
                    return 'black';
                } else {
                    return getColorString(density, colorMap, interpolateColor);
                }
            }
        }

        currentStippledDataSet.stipples.forEach(s => {
            if (s.density !== 0.0) {
                svg.append('circle')
                    .attr('cx', s.relativeX * outputWidth)
                    .attr('cy', s.relativeY * outputHeight)
                    .attr('r', currentStippledDataSet.stippleRadius * outputScale * (scaleByDensity ? s.density : 1))
                    .style('fill', getStippleColor(s.density))
                    .on('mouseenter', function () {
                        d3.select(this).style('fill', 'rgb(255, 0, 0)'); // color stipples
                        if (currentStippledDataSet.geographicalDataset) {
                            let bounds = stippleBounds(s, currentStippledDataSet.voronoi);
                            card.drawArea(bounds, currentStippledDataSet.voronoi, getVoronoiCell(s.position(), currentStippledDataSet.voronoi));
                        }
                    })
                    .on('mouseleave', function () {
                        d3.select(this).style('fill', getStippleColor(s.density));
                    })
            }
        })
    }
}

const initCard = (data, geographical) => {
    const cardDiv = '#cardDiv';
    d3.select(cardDiv).select('svg').remove();

    const box = document.querySelector(cardDiv);

    const detailsDiv = 'details'
    const details = document.getElementById(detailsDiv);

    if (geographical) {
        details.style.display = 'block';
    } else {
        details.style.display = 'none';
    }
    const myData = {data: data.locationToData, width: data.width, height: data.height};
    return new Card(myData, box.clientWidth, box.clientHeight, cardDiv);
}

function stippleDataSet() {
    if (!stipplingInProgress) {
        disableStippling();

        const width = parseInt(document.getElementById('stippleWidth').value);
        const height = parseInt(document.getElementById('stippleHeight').value);
        const stippleRadius = parseFloat(document.getElementById('stippleRadius').value);
        const useMachbanding = document.getElementById('machbanding').checked;
        const machbandingQuantization = parseInt(document.getElementById('machbandingQuantization').value);
        const machbandingWeight = parseFloat(document.getElementById('machbandingWeight').value);
        const machbandingBlurRadius = parseFloat(document.getElementById('machbandingBlurRadius').value);
        const dataset = document.forms['dataSetForm']['dataset'].value;

        let dataSourceFunc;
        let geographicalDataset;
        switch (dataset) {
            case 'accidentsNov':
                dataSourceFunc = async () => {
                    const data = await d3.csv("us-accidents-severity-4-Nov-Dec-2020.csv");
                    return createGeographicDataImage(data, width);
                };
                geographicalDataset = true;
                break;
            case 'accidentsDec':
                dataSourceFunc = async () => {
                    const data = await d3.csv("us-accidents-severity-4-Dec-2020.csv");
                    return createGeographicDataImage(data, width);
                };
                geographicalDataset = true;
                break;
            case 'hailstorm0':
                dataSourceFunc = async () => {
                    const data = await d3.csv("hail-2015-sevprob-larger-0.csv");
                    return createGeographicDataImage(data, width);
                };
                geographicalDataset = true;
                break;
            case 'hailstorm56':
                dataSourceFunc = async () => {
                    const data = await d3.csv("hail-2015-sevprob-larger-56.csv");
                    return createGeographicDataImage(data, width);
                };
                geographicalDataset = true;
                break;
            case 'hailstorm80':
                dataSourceFunc = async () => {
                    const data = await d3.csv("hail-2015-sevprob-larger-80.csv");
                    return createGeographicDataImage(data, width);
                };
                geographicalDataset = true;
                break;
            case 'italy':
                geographicalDataset = false;
                dataSourceFunc = async () => {
                    return createImageData('italy.png', width);
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
            enableStippling();
            visualizeCurrentStipples().then(r => {
                console.log("Done with stippling");
            });
        }).catch(console.error);
    }

    return false; // i.e. do not refresh the page
}
