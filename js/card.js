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
        this.svg = this.setupSVG();

    }

    setupSVG(){
        return d3.select('#cardDiv')
            .append('svg')
            .attr('width', 300)
            .attr('height', 300);
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

        this.svg.selectAll("*").remove();

        let dx = maxX - minX;
        let dy = maxY - minY;
        let x = (minX + maxX) / 2;
        let y = (minY + maxY) / 2;
        let scale = 0.9 / Math.max(dx / this.width, dy / this.height);
        let translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];

        const projection = d3.geoAlbersUsa()
            .translate([this.width / 2, this.height / 2])
            .scale(this.width);

        let g = this.svg.append("g")
            //.attr('class', 'center-container center-items')
            .attr('transform', 'translate(' + translate + ')scale(' + scale + ')')
            .attr('width', this.width)
            .attr('height', this.height);

        g.selectAll('circle')
            .data(croppedData).enter()
            .append('circle')
            .attr('cx', function(d) {
                if (projection([d.LON, d.LAT]) !== null) {
                    return projection([d.LON, d.LAT])[0];
                } else {
                    return 0;
                }
            })
            .attr('cy', function (d) {
                if (projection([d.LON, d.LAT]) !== null) {
                    return projection([d.LON, d.LAT])[1];
                } else {
                    return 0;
                }
            })
            .attr('r', 1)
            .style('stroke', 'black')
            .style('fill', 'red');
    }
}