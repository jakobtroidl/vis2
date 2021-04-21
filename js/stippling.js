/*
 * Stippling based on Görtler et al. 'Stippling of 2D Scalar Fields'.
 */


/*
 * Some utility functions.
 */

/**
 *
 * @param val
 * @param lower
 * @param upper
 * @returns {number}
 */
const clamp = (val, lower = 0.0, upper = 1.0) => Math.min(upper, Math.max(lower, val));
const rgbaToLuminance = (r, g, b, _a) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
const createQuantization = (num) => {
    const fraction = 1.0 / num;
    const quantization = [];
    for (let q = fraction; q < 1.0; q += fraction) {
        quantization.push(q);
    }
    return quantization;
};
const quantize = (arr, quantization) => {
    return arr.map(p => {
        for (let i = 0; i < quantization.length; ++i) {
            if (p < quantization[i]) {
                if (i === 0) {
                    return 0;
                } else {
                    return quantization[i - 1];
                }
            }
        }
        return 1.0;
    });
};
const floatArrayToImageData = (arr, stride, mapFromMinus1 = false) => {
    const mapVal = mapFromMinus1 ? p => (p + 1.0) / 2.0 : p => p;
    return new ImageData(
        new Uint8ClampedArray(arr.map(p => {
            const v = clamp(Math.round(mapVal(p) * 255), 0, 255);
            return [v, v, v, 255];
        }).flat()),
        stride,
        arr.length / stride);
}
const imageDataToFloatArray = (imageData, rgbaToFloat = rgbaToLuminance) => {
    const data = [];
    let maxValue = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
        const density = rgbaToFloat(
            imageData.data[i],
            imageData.data[i+1],
            imageData.data[i+2],
            imageData.data[i+3]
        );
        data.push(density);
        if (maxValue < density) {
            maxValue = density;
        }
    }
    return {data, maxValue};
}
const polygonBounds = (points) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    for (const [x, y] of points) {
        if (x < minX) {
            minX = x;
        }
        if (x > maxX) {
            maxX = x;
        }
        if (y < minY) {
            minY = y;
        }
        if (y > maxY) {
            maxY = y;
        }
    }
    return {min: [minX, minY], max: [maxX, maxY]};
}
const integerBounds = (points, toInt = Math.round) => {
    const bounds = polygonBounds(points);
    bounds.min = bounds.min.map(toInt);
    bounds.max = bounds.max.map(toInt);
    return bounds;
}

/**
 * Creates a canvas as a child of a div-tag and uses it to present the given {@link ImageData} instance.
 * @param img the {@link ImageData} to show
 * @param divName a string, the id of the div
 */
const showImage = (img, divName) => {
    const ctx = d3.select(`#${divName}`)
        .append('canvas')
        .attr('width', img.width)
        .attr('height', img.height)
        .node()
        .getContext('2d');
    ctx.putImageData(img, 0, 0);
}

/**
 * Calculates two new cell centroids from a Voronoi cell that should be split.
 *
 * @param cell
 * @returns {{position1: *[], position2: *[]}}
 */
const splitCell = (cell) => {
    // Note: this is a very naive implementation that chooses two new centroids that are halfway from the cell's centroid
    // to the two corners which are the farthest away from the center.
    // In some cases these two points might be very close together. Choosing more optimal centroids would probably lead
    // to faster convergence.
    const centroid = d3.polygonCentroid(cell);
    let largestDir = [0, 0];
    let secondLargestDir = [0, 0];
    let largestDistance = 0;
    let secondLargestDistance = 0;
    for (const p of cell) {
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


/*
 * Helper classes
 */

/**
 * A stipple as returned by {@link stipple}.
 * Has a position (x, y) coordinate with respect to the dimensions of the underlying {@link DensityFunction2D},
 * and a density ∈ [0,1].
 */
class Stipple {
    constructor(x, y) {
        this.setPosition(x, y);
        this.density = 0;
        this.absoluteDensity = 0;
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

/**
 * A discrete 2-dimensional density function.
 * Can be created from an {@link ImageData} instance.
 */
class DensityFunction2D {
    /**
     * Note: For performance reasons, if data is a 1d-array it is destroyed in the process of building the density
     * function.
     * @param data
     * @param stride the width of the 2d function. only needed if data is a 1d-array
     */
    constructor(data, stride = 0) {
        if (data instanceof DensityFunction2D) {
            this.data = data.data;
            this.width = data.width;
            this.height = data.height;
        } else if (!Array.isArray(data[0])) {
            if (!stride) {
                console.log(data);
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

    async areaDensity(polygon) {
        // this doesn't have any async calls, but we could e.g. add a backing tf.tensor2D to perform this operation
        // which would be asynchronous (& hopefully faster)
        const {min, max} = integerBounds(polygon);
        let density = 0;
        for (let y = min[1]; y < max[1]; ++y) {
            for (let x = min[0]; x < max[0]; ++x) {
                if (d3.polygonContains(polygon, [x, y])) {
                    density += this.density(x, y);
                }
            }
        }
        return density;
    }

    assignDensity(stipples, voronoi) {
        stipples.forEach(s => s.density = 0);
        let lastFound = 0;
        let lastFoundRow = Array(this.width);
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                // We use either the cell index of the pixel above or the pixel to the left, but prefer the one to the
                // top. Both choices are correct in approximately 60% of the cases, but if the choice was wrong then
                // choosing the pixel to the top will require us only to search (width + 1) cells in the worst case
                // whereas when choosing the pixel to the pixel to left we would have to search almost all other cells
                // in the worst case (because of how Delaunay.find is implemented).
                if (lastFoundRow[x]) {
                    lastFound = lastFoundRow[x];
                }
                lastFound = voronoi.delaunay.find(x, y, lastFound);
                lastFoundRow[x] = lastFound;
                stipples[lastFound].density += this.density(x, y);
            }
        }
        return stipples;
    }

    /**
     * Creates a basic {@link DensityFunction2D} from an {@link ImageData} instance.
     * Pixel data is mapped to a float value and scaled to the range [0,1]
     * @param imageData an {@link ImageData} instance (e.g. from CanvasRenderingContext2D.getImageData()).
     * @param rgbaToDensity (optional) maps 4 positive integers (r,g,b,a) to a float value
     * @returns {DensityFunction2D}
     */
    static fromImageData2D(imageData, rgbaToDensity = rgbaToLuminance) {
        const {data, maxValue: maxDensity} = imageDataToFloatArray(imageData, rgbaToDensity);
        return new DensityFunction2D(data.map(p => p / maxDensity), imageData.width);
    }

    /**
     * Creates a {@link DensityFunction2D} with artificial contours from an {@link ImageData} instance.
     *
     * The contours are created as follows:
     *   Φ' = Φ + 2w (C - G_dxd * C - 0.5), if C - G_dxd * C > 0.5
     *   Φ' = Φ + 2w (C - G_dxd * C - 1.0), if C - G_dxd * C <= 0.5
     * where...
     *   ...Φ is the original density function (i.e. the {@link ImageData},
     *   ...w is a weight controlling the strength of the contouring effect (w ∈ [0, 1])
     *   ...C is a quantized version of Φ
     *   ...G_dxd is a Gaussian blur kernel with radius d
     *
     * See: Görtler et al. Stippling of 2D Scalar Fields
     *
     * @param imageData an {@link ImageData} instance (e.g. from {@link CanvasImageData.getImageData}).
     * @param quantization a positive integer (quantization will be equal steps of size 1/quantization) or an array of quantization steps
     * @param weight (optional) a float in range [0,1], determines the strength of the contours. Default: 0.5
     * @param blurRadius (optional) the radius of the Gaussian blur applied to imageData. Default: 4
     * @param rgbaToDensity (optional) maps 4 positive integers (r,g,b,a) to a float value. Default: {@link rgbaToLuminance}
     * @param debugDiv (optional) a string, the id of a div that should be used to display intermediate results. Default: undefined
     * @return {DensityFunction2D}
     */
    static machBandingFromImageData2D(imageData, quantization = 5, weight = 0.5, blurRadius = 4, rgbaToDensity = rgbaToLuminance, debugDiv = undefined) {
        if (!Array.isArray(quantization)) {
            quantization = createQuantization(quantization);
        }

        const {data: originalData} = imageDataToFloatArray(imageData, rgbaToDensity);

        // C (quantize image)
        const quantizedData = quantize(originalData, quantization);

        // G_dxd * C (blur image)
        const blurSize = Math.pow(blurRadius, 2.0) * Math.PI;
        const quantizedImage = floatArrayToImageData(quantizedData, imageData.width);
        const offscreenCanvas = new OffscreenCanvas(imageData.width, imageData.height);
        const blurringContext = offscreenCanvas.getContext('2d');
        blurringContext.putImageData(quantizedImage, 0, 0);
        blurringContext.filter = `blur(${blurSize}px)`;
        blurringContext.drawImage(offscreenCanvas, 0, 0);
        const blurredImage = blurringContext.getImageData(0, 0, imageData.width, imageData.height);
        const {data: blurredData} = imageDataToFloatArray(blurredImage);

        const deltaData = [];
        const machBanded = [];
        for (let i = 0; i < imageData.width * imageData.height; ++i) {
            // Note: in the paper the weight is only doubled and depending on its value either 0.5 or 1 is substracted
            // frm delta. However, our delta values are in a different range
            machBanded.push(clamp(originalData[i] + 4 * weight * (quantizedData[i] - blurredData[i])));

            if (debugDiv) {
                deltaData.push(quantizedData[i] - blurredData[i]);
            }
        }

        // debug: show all stages
        if (debugDiv) {
            showImage(quantizedImage, debugDiv);
            showImage(blurredImage, debugDiv);
            showImage(floatArrayToImageData(deltaData, imageData.width, true), debugDiv);
            showImage(floatArrayToImageData(machBanded, imageData.width), debugDiv);
        }

        return new DensityFunction2D(machBanded, imageData.width);
    }
}

/**
 * Not implemented (yet?)
 *
 * For restricted stippling contours have to be defined manually
 */
class RestrictedStipplingDensityFunction2D extends DensityFunction2D {
    constructor() {
        super([], 1);
        throw new Error('Not implemented');
    }
}


/**
 * Creates stipples for a given target density function ({@link DensityFunction2D}) using the algorithm presented by
 * Görtler et al. (Stippling of 2D Scalar Fields).
 *
 * For contouring techniques use a {@link RestrictedStipplingDensityFunction2D} instead of a plain {@link DensityFunction2D}.
 *
 * Note that the function returns a {@link Promise}, so you either have to await it in an async context or use its
 * return values in a {@link Promise} chain.
 *
 * @param targetDensityFunction a {@link DensityFunction2D}
 * @param stippleRadius
 * @param initialErrorThreshold the initial error threshold used for splitting and merging stipples.
 * @param thresholdConvergenceRate the error threshold is increased by this amount in every iteration
 * @return {Promise<{voronoi: *, stipples: any[]}>}
 */
const stipple = async (targetDensityFunction, stippleRadius = 5.0, initialErrorThreshold = 0.0, thresholdConvergenceRate = 0.01) => {
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

    // keep track of computation time for indiviual steps
    const now = Date.now();
    let timeVoronoi = 0;
    let timeDensity = 0;
    let timeStipples = 0;

    const stippleArea = Math.pow(stippleRadius, 2) * Math.PI;
    const numInitialStipples = Math.round(
        ((targetDensityFunction.width * targetDensityFunction.height) / stippleArea) * 0.7);

    let lastVoronoi = null;
    let stipples = Stipple.createRandomStipples(
        numInitialStipples,
        targetDensityFunction.width,
        targetDensityFunction.height);

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
        // to compute the target density for each stipple, we can...
        //   - ...iterate over the stipples/Voronoi cells and find the density for the region
        //   - ...iterate over the target density function, find its corresponding stipple/Voronoi cell and add the current value to its density
        // the former is harder to implement (map the Voronoi cell to discrete indices) but could be done in parallel
        // the latter is easier to implement, so we'll stick to that for now
        stipples = targetDensityFunction.assignDensity(stipples, voronoi);
        const endDensity = Date.now();

        const startStipples = Date.now();
        const nextStipples = [];
        // Note: we also tried making the errorThreshold depend on the stipple area (i.e. e = A_s * errorThreshold)
        // and multiplying errorThreshold with a constant factor in each iteration, but it took about 10 times longer
        // to get the same results. Maybe multiplying it with r/t, where r is the convergence rate and t is the iteration
        // would work better, but it probably wouldn't be faster.
        const deleteThreshold = stippleArea - errorThreshold;
        const splitThreshold = stippleArea + errorThreshold;
        for (let i = 0; i < stipples.length; ++i) {
            const s = stipples[i];
            const cell = d3.polygonHull(voronoi.cellPolygon(i));
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
        lastVoronoi = voronoi;
        errorThreshold += thresholdConvergenceRate;

        timeVoronoi += endVoronoi-startVoronoi;
        timeDensity += endDensity-startDensity;
        timeStipples += endStipples-startStipples;
    } while (splitsOrMerges);

    // timing
    const timeTotal = Date.now() - now;
    console.debug(`Total time spent: ${timeTotal} ms`);
    console.debug(`Time spent building Voronoi diagrams: ${timeVoronoi} ms, ${(timeVoronoi / timeTotal) * 100} %`);
    console.debug(`Time spent integrating over Voronoi cells: ${timeDensity} ms, ${(timeDensity / timeTotal) * 100} %`);
    console.debug(`Time spent moving, merging and splitting stipples: ${timeStipples} ms, ${(timeStipples / timeTotal) * 100} %`);

    // map stipple densities to range [0,1]
    const maxDensity = stipples.reduce((maxDensity, s) => {
        return s.density > maxDensity ? s.density : maxDensity;
    }, 0);
    stipples.forEach(s => s.density /= maxDensity);

    return {stipples, voronoi: lastVoronoi};
};

/**
 * Creates stipples for a given target density function ({@link DensityFunction2D}) using the algorithm presented by
 * Görtler et al. (Stippling of 2D Scalar Fields).
 *
 * For contouring techniques use a {@link RestrictedStipplingDensityFunction2D} instead of a plain {@link DensityFunction2D}.
 *
 * Note that the function returns a {@link Promise}, so you either have to await it in an async context or use its
 * return values in a {@link Promise} chain.
 *
 * Note: this is currently much slower than {@link stipple}. The reason for this is that {@link DensityFunction2D.areaDensity}
 * is not optimized. Another problem with this version is that the contouring effect is much weaker than in {@link stipple}.
 * Probably because some density values don't contribute to the density of their Voronoi cells due to rounding errors.
 *
 * @param targetDensityFunction a {@link DensityFunction2D}
 * @param stippleRadius
 * @param initialErrorThreshold the initial error threshold used for splitting and merging stipples.
 * @param thresholdConvergenceRate the error threshold is increased by this amount in every iteration
 * @return {Promise<{voronoi: *, stipples: any[]}>}
 */
const stippleParallel = async (targetDensityFunction, stippleRadius = 5.0, initialErrorThreshold = 0.0, thresholdConvergenceRate = 0.01) => {
    // keep track of computation time for indiviual steps
    const now = Date.now();
    let timeVoronoi = 0;
    let timeStippling = 0;

    const stippleArea = Math.pow(stippleRadius, 2) * Math.PI;
    const numInitialStipples = Math.round(
        ((targetDensityFunction.width * targetDensityFunction.height) / stippleArea) * 0.7);

    let lastVoronoi = null;
    let stipples = Stipple.createRandomStipples(
        numInitialStipples,
        targetDensityFunction.width,
        targetDensityFunction.height);

    let errorThreshold = initialErrorThreshold;
    let splitsOrMerges = false;
    do {
        splitsOrMerges = false;

        const startVoronoi = Date.now();
        const voronoi = d3.Delaunay
            .from(stipples.map(s => s.toArray()))
            .voronoi([0, 0, targetDensityFunction.width, targetDensityFunction.height]);
        const endVoronoi = Date.now();

        const startStippling = Date.now();
        const deleteThreshold = stippleArea - errorThreshold;
        const splitThreshold = stippleArea + errorThreshold;
        const foo = (await Promise.all(
            stipples.map(async (s, i) => {
                const cell = d3.polygonHull(voronoi.cellPolygon(i));
                const density = await targetDensityFunction.areaDensity(cell);
                if (density < deleteThreshold) {
                    return null;
                } else if (density > splitThreshold) {
                    const {position1, position2} = splitCell(cell);
                    s.setPosition(...position1);
                    return [
                        s,
                        new Stipple(...position2)
                    ];
                } else {
                    s.setPosition(...d3.polygonCentroid(cell));
                    s.density = density;
                    return s;
                }
            })
        )).reduce((acc, s) => { // clean up stipples in one loop instead of doing filter(s => s).flat()
            if (s) {
                if (Array.isArray(s)) {
                    acc.splitsOrMerges = true;
                    acc.stipples.push(s[0]);
                    acc.stipples.push(s[1]);
                }
                else {
                    acc.stipples.push(s);
                }
            } else {
                acc.splitsOrMerges = true;
            }
            return acc;
        }, {stipples: [], splitsOrMerges: false});
        stipples = foo.stipples;
        splitsOrMerges = foo.splitsOrMerges;
        const endStippling = Date.now();

        lastVoronoi = voronoi;
        errorThreshold += thresholdConvergenceRate;

        timeVoronoi += endVoronoi - startVoronoi;
        timeStippling += endStippling - startStippling;
    } while (splitsOrMerges);

    // timing
    const timeTotal = Date.now() - now;
    console.debug(`Total time spent: ${timeTotal} ms`);
    console.debug(`Time spent building Voronoi diagrams: ${timeVoronoi} ms, ${(timeVoronoi / timeTotal) * 100} %`);
    console.debug(`Time spent integrating over Voronoi cells and processing stipples: ${timeStippling} ms, ${(timeStippling / timeTotal) * 100} %`);

    // map stipple densities to range [0,1]
    const maxDensity = stipples.reduce((maxDensity, s) => {
        return s.density > maxDensity ? s.density : maxDensity;
    }, 0);
    stipples.forEach(s => s.density /= maxDensity);

    return {stipples, voronoi: lastVoronoi};
};