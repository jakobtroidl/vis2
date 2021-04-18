class Stipple {
    constructor(x, y) {
        this.setPosition(x, y);
        this.density = 0;
    }

    toArray() {
        return [this.x, this.y];
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    static createRandomStipples(numStipples, xScale = 1, yScale = 1, sampler = d3.randomUniform) {
        const xSampler = sampler(0, xScale);
        const ySampler = sampler(0, yScale);
        const stipples = Array(numStipples);
        for (let i = 0; i < numStipples; ++i) {
            stipples[i] = new Stipple(xSampler(), ySampler());
        }
        return stipples;
    }
}

class DensityFunction2D {
    /**
     * Note: For performance reasons, if data is a 1d-array it is destroyed in the process of building the density
     * function.
     * @param data
     * @param stride the width of the 2d function. only needed if data is a 1d-array
     */
    constructor(data, stride = 0) {
        if (!Array.isArray(data[0])) {
            if (!stride) {
                throw new Error('data is a 1d-array and stride is 0');
            }
            this.width = stride;
            this.data = [];
            while(data.length) {
                this.data.push(data.splice(0, stride));
            }
            this.height = this.data.length;
        } else {
            this.data = data;
            this.width = data.length;
            this.height = data[0].length;
        }
    }

    density(x, y) {
        return this.data[y][x];
    }

    areaDensity(polygon) {
        // TODO: map polygon to integer x,y coords and sum up all densitiy values for it
        throw new Error('not implemented');
    }

    assignDensity(stipples, voronoi) {
        stipples.forEach(s => s.density = 0);
        let lastFound = 0;
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                lastFound = voronoi.delaunay.find(x, y, lastFound);
                stipples[lastFound].density += this.density(x, y);
            }
        }
        return stipples;
    }

    /**
     * Creates a DensityFunction2D from an ImageData instance.
     * Pixel data is mapped to a float value and scaled to the range [0,1]
     * @param imageData an ImageData instance (e.g. from CanvasRenderingContext2D.getImageData()).
     * @param rgbaToDensity maps 4 positive integers (r,g,b,a) to a float value
     * @returns {DensityFunction2D}
     */
    static fromImageData2D(imageData, rgbaToDensity = (r, g, b, _a) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0) {
        const data = [];
        let maxDensity = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            const density = rgbaToDensity(
                imageData.data[i],
                imageData.data[i+1],
                imageData.data[i+2],
                imageData.data[i+3]
            );
            data.push(density);
            if (maxDensity < density) {
                maxDensity = density;
            }
        }
        return new DensityFunction2D(data.map(p => p / maxDensity), imageData.width);
    }
}

const splitCell = (cell) => {
    const centroid = d3.polygonCentroid(cell);
    let largestDir = [0, 0];
    let secondLargestDir = [0, 0];
    let largestDistance = 0;
    let secondLargestDistance = 0;
    for (const p of d3.polygonHull(cell)) {
        const direction = [
            p[0] - centroid[0],
            p[1] - centroid[1]
        ];
        const squaredDistance = direction.reduce((acc, c) => acc + Math.pow(c, 2), 0);
        if (squaredDistance > largestDistance) {
            secondLargestDistance = largestDistance;
            secondLargestDir = largestDir;
            largestDistance = squaredDistance;
            largestDir = direction;
        }
    }
    return {
        position1: [
            centroid[0] + largestDir[0] * 0.5,
            centroid[1] + largestDir[1] * 0.5
        ],
        position2: [
            centroid[0] + secondLargestDir[0] * 0.5,
            centroid[1] + secondLargestDir[1] * 0.5
        ]
    };
};

/**
 *
 * @param targetDensityFunction an instance of {@link DensityFunction2D}
 * @param stippleRadius
 * @param initialErrorThreshold
 * @param thresholdConvergenceRate
 * @param numInitialStipples positive integer
 * @param restrictedStippling boolean
 * @param machBanding boolean
 * @returns {any[]}
 */
const stipple = async (targetDensityFunction, stippleRadius = 5.0, initialErrorThreshold = 0.0, thresholdConvergenceRate = 0.01, numInitialStipples = 100, restrictedStippling = false, machBanding = false) => {
    /* Görtler et al:
     *   Input: target density function PHI
     *   Output: list of stipples S
     *
     *   S <- initialize random stipples
     *   repeat
     *     V <- compute Voronoi diagram of S using PHI
     *       foreach s in S do
     *         Ts <- Integral over Vs (PHI(x,y)) dA
     *         if restricted stippling then
     *           Ts <- argmax Integral over Vs (c_i(x,y) PHI(x,y)) dA
     *         else if Mach-banding
     *           Ts <- Integral over Vs (PHI'(x,y)) dA
     *       end
     *       foreach Voronoi cell Vs in V and resp. stipple s do
     *         if Density Ts too low then
     *           remove s from S
     *         else if Density Ts too high then
     *           split s into two and add to S
     *         else
     *           move s to weighted centroid of Vs
     *         end
     *       end
     *   until no more splits and merges
     *   return S
     *
     *   For discrete scalar fields the integral over Vs is just the sum(PHI(i)), for all points i in Vs.
     */

    const now = Date.now();
    let timeVoronoi = 0;
    let timeDensity = 0;
    let timeStipples = 0;

    let stipples = Stipple.createRandomStipples(
        numInitialStipples,
        targetDensityFunction.width,
        targetDensityFunction.height);

    const stippleArea = Math.pow(stippleRadius, 2) * Math.PI;
    let errorThreshold = initialErrorThreshold;
    let splitsOrMerges = false;
    do {
        splitsOrMerges = false;

        const startVoronoi = Date.now();
        const voronoi = d3.Delaunay
            .from(stipples.map(s => s.toArray()))
            .voronoi([0, 0, targetDensityFunction.width, targetDensityFunction.height]);
        const endVoronoi = Date.now();

        const startDensity = Date.now();
        if (restrictedStippling) {
        } else if (machBanding) {
        } else {
            // to compute the target density for each stipple, we can...
            //   - ...iterate over the stipples/Voronoi cells and find the density for the region
            //   - ...iterate over the target density function, find its corresponding stipple/Voronoi cell and add the current value to its density
            // the former is harder to implement (map the Voronoi cell to discrete indices) but could be done in parallel
            // the latter is easier to implement, so we'll stick to that for now

            // TODO: this takes up about 85% of the time
            stipples = targetDensityFunction.assignDensity(stipples, voronoi);
        }
        const endDensity = Date.now();

        const startStipples = Date.now();
        const nextStipples = [];
        const deleteThreshold = stippleArea - errorThreshold;
        const splitThreshold = stippleArea + errorThreshold;
        for (let i = 0; i < stipples.length; ++i) {
            const s = stipples[i];
            const cell = voronoi.cellPolygon(i);
            if (s.density < deleteThreshold) {
                splitsOrMerges = true;
            } else if (s.density > splitThreshold) {
                splitsOrMerges = true;
                const {position1, position2} = splitCell(cell);
                s.setPosition(...position1);
                nextStipples.push(s);
                nextStipples.push(new Stipple(...position2));
            } else {
                s.setPosition(...d3.polygonCentroid(cell));
                nextStipples.push(s);
            }
        }
        const endStipples = Date.now();

        stipples = nextStipples;
        errorThreshold += thresholdConvergenceRate;

        timeVoronoi += endVoronoi-startVoronoi;
        timeDensity += endDensity-startDensity;
        timeStipples += endStipples-startStipples;
    } while (splitsOrMerges);
    const timeTotal = Date.now() - now;
    console.log('total', timeTotal);
    console.log('timeVoronoi', timeVoronoi, timeVoronoi / timeTotal);
    console.log('timeDensity', timeDensity, timeDensity / timeTotal);
    console.log('timeStipples', timeStipples, timeStipples / timeTotal);
    return stipples;
};
