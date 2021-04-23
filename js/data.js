
/**
 * A utility class that renders multiple data sets in ImageData objects
 */
class DataLoader{
    /**
     * Creates an ImageData object holding representing the given data
     * @param data array holding all objects. Each object must contain a LON, LAT value
     * @param width of the returned image
     * @param height of the returned image
     * @returns ImageData
     */
    static loadUsGeoData(data, width, height) {
        const projection = d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale(width);
        const array = Array(width *  height).fill(0.0);
        const data2D = Array(width *  height).fill([]);
        data.forEach(d => {
            const proj = projection([d.LON, d.LAT]);
            if (proj != null) {
                const x = Math.floor(proj[0]);
                const y = Math.floor(proj[1]);
                const i = (y * width) + x;
                array[i] += 1.0;
                data2D[i].push(d);
            }
        });
        const maxValue = array.reduce((max, x) => {
            return max > x ? max : x;
        }, 0.0);
        console.log(array.map(x => x/maxValue), width);
        return floatArrayToImageData(array, width);
        //return new ImageData(array, width, height);
    }
}