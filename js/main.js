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
    d3.csv("data/hail-2015-sevprob-larger-80.csv")
];

Promise.all(promises)
    .then( function(data){ initMainPage(data) })
    .catch( function (err){console.log(err)} );

// initMainPage
function initMainPage(dataArray) {

    // init map
    myMapVis = new mapVis('mapDiv', dataArray[0], dataArray[1]);

    // init scatter
    //myScatterVis = new scatterVis('scatterDiv', dataArray[1]);

    // init brush
    //myBrushVis = new brushVis('brushDiv', dataArray[1]);
}


