/**
 * Info Card showing details when hovering over a stipple
 */
class Card{
    /**
     *
     * @param data holding the detailed meta information about individual data points
     * @param width
     * @param height
     * @param div where the info card should appear
     */
    constructor(data, width, height, div) {
        this.data = data;
        this.width = width;
        this.height = height;
        this.div = div;
    }

    /**
     *
     * @param bounds of the region that is investigated in more detail
     * @param voronoi
     * @param voronoiIndex
     */
    drawArea(bounds, voronoi, voronoiIndex){
        let [maxX, maxY] = bounds.max;
        let [minX, minY] = bounds.min;

        maxX = Math.ceil(maxX);
        maxY = Math.ceil(maxY);

        minY = Math.floor(minY);
        minX = Math.floor(minX);

        let croppedData = [];

        for(let x = minX; x < maxX; x++) {
            for (let y = minY; y < maxY; y++) {
                let thisVoronoiIndex = getVoronoiCell([x, y], voronoi);
                if(thisVoronoiIndex === voronoiIndex){ // check whether the coordinate is in the voronoi region
                    const idx = (y * this.width) + x;
                    croppedData = croppedData.concat(this.data[idx]);
                }
            }
        }
        console.log("---------------------")
        console.log(croppedData);
    }
}