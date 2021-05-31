/**
 * Info Card showing details when hovering over a stipple
 */
class Card {
    /**
     *
     * @param data holding the detailed meta information about individual data points
     * @param width of the card div
     * @param height of the card div
     * @param div where the info card should appear
     */
    constructor(data, width, height, div) {
        this.data = data;
        this.width = width;
        this.height = height;
        this.svg = this.setupSVG();

        this.circleRadius = 2.0;
        this.lineWidth = 1.0;
    }

    setupSVG() {
        return d3.select('#cardDiv')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
    }

    /**
     *
     * @param bounds of the region that is investigated in more detail
     * @param voronoi
     * @param voronoiIndex
     */
    drawArea(bounds, voronoi, voronoiIndex) {
        let [maxX, maxY] = bounds.max;
        let [minX, minY] = bounds.min;

        maxX = Math.ceil(maxX);
        maxY = Math.ceil(maxY);

        minY = Math.floor(minY);
        minX = Math.floor(minX);

        let croppedData = [];

        for (let x = minX; x < maxX; x++) {
            for (let y = minY; y < maxY; y++) {
                let thisVoronoiIndex = getVoronoiCell([x, y], voronoi);
                if (thisVoronoiIndex === voronoiIndex) { // check whether the coordinate is in the voronoi region
                    const idx = (y * this.data.width) + x;
                    croppedData = croppedData.concat(this.data.data[idx]);
                }
            }
        }

        this.svg.selectAll("*").remove(); // clear svg before plotting new elements

        const projection = createProjection(this.data.width, this.data.height)

        let dx = maxX - minX;
        let dy = maxY - minY;
        let x = (minX + maxX) / 2;
        let y = (minY + maxY) / 2;
        let scale = 1.0 / Math.max(dx / this.width, dy / this.height);
        let translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];


        let g = this.svg.append("g")
            .attr('transform', 'translate(' + translate + ')scale(' + scale + ')')
            .attr('width', this.width)
            .attr('height', this.height);

        let lineFunc = d3.line()
            .x(function (d) {
                return d[0];
            })
            .y(function (d) {
                return d[1];
            });

        g.append('path')
            .attr('d', lineFunc(voronoi.cellPolygon(voronoiIndex)))
            .attr('stroke', 'black')
            .attr('stroke-width', this.lineWidth * (1 / scale))
            .attr('fill', 'none');

        g.selectAll('circle')
            .data(croppedData).enter()
            .append('circle')
            .attr('cx', function (d) {
                    const cx = projection([d.LON, d.LAT])[0];
                    const cy = projection([d.LON, d.LAT])[1];
                    if(getVoronoiCell([cx, cy], voronoi) === voronoiIndex) {
                        return cx;
                    } else {
                        return 0;
                    }
            })
            .attr('cy', function (d) {
                const cx = projection([d.LON, d.LAT])[0];
                const cy = projection([d.LON, d.LAT])[1];
                if(getVoronoiCell([cx, cy], voronoi) === voronoiIndex) {
                    return cy;
                } else {
                    return 0;
                }
            })
            .attr('r', this.circleRadius * (2 / scale))
            .style('fill', 'red');
    }
}