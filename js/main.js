/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

// init global variables
let myMapVis;
let myScatterVis;
let myBrushVis;

// init globalDataSets
let dataSet;

// init global switches
let selectedState = '';

// load data using promises
let promises = [
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json"),
    d3.csv("data.csv")
];

Promise.all(promises)
    .then( function(data){ initMainPage(data) })
    .catch( function (err){console.log(err)} );

// initMainPage
function initMainPage(dataArray) {

    // log data
    console.log(dataArray);
    dataSet = dataArray[1];

    // init map
    myMapVis = new mapVis('mapDiv', dataArray[0], dataArray[1]);

    // init scatter
    myScatterVis = new scatterVis('scatterDiv', dataArray[1]);

    // init brush
    myBrushVis = new brushVis('brushDiv', dataArray[1]);
}


