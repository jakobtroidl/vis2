
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
        let projection = d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale(width);
        const array = new Uint8ClampedArray(4 * width * height);
        data.forEach(d => {
            let proj = projection([d.LON, d.LAT]);
            if (proj != null) {
                let x = Math.floor(proj[0]);
                let y = Math.floor(proj[1]);
                array[x * y] += 20;
                array[x * y + 1] += 20;
                array[x * y + 2] += 20;
                array[x * y + 3] += 20;
            }
        })
        return new ImageData(array, width, height);
    }
}