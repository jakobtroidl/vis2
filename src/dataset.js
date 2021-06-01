/**
 * Reads a file and returns the file's contents.
 * @param file a {@link Blob}
 * @return {Promise<unknown>} the file's contents
 */
const readFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result);
        console.log(file);
        reader.readAsDataURL(file);
    });
}

/**
 * Creates an image from a given source.
 * @param src the source for the image
 * @return {Promise<Image>} the created image
 */
const loadImage = async (src) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => resolve(image);
        image.src = src;
    });
}

/**
 * Creates an image from an image source and scales it to the requested size.
 * @param imageSource a file path or a loaded image source (see {@link loadImage})
 * @param width the width to which the created image should be scaled to.
 * @return {Promise<{densityImage: ImageData, mapToLocation: ImageData}>}
 */
const createImageData = async (imageSource, width) => {
    const image = await loadImage(imageSource);

    // get image data in target resolution
    const ratio = width / image.width;
    const scaledHeight = image.height * ratio;
    const ctx = new OffscreenCanvas(width, scaledHeight).getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, scaledHeight);

    return {
        densityImage: ctx.getImageData(0, 0, width, scaledHeight),
        mapToLocation: ctx.getImageData(0, 0, width, scaledHeight)
    };
}

/**
 * Creates a gradient image.
 * @param width the width of the image.
 * @param height the height of the image.
 * @param fromTo a flat array containing the coordinates of the start and end point of the gradient ([x0, y0, x1, y1]), defaults to: [0, 0, width, 0]
 * @return gradientImage a {@link CanvasImageData.getImageData}
 */
const createGradientImage = (width, height, fromTo = undefined) => {
    const bounds = [0, 0, width, height];
    if (!fromTo) {
        // just point from left to right by default
        fromTo = [...bounds];
        fromTo[3] = 0;
    }
    const context2D = new OffscreenCanvas(width, height).getContext('2d');

    const gradient = context2D.createLinearGradient(...fromTo);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'white');

    context2D.fillStyle = gradient;
    context2D.fillRect(...bounds);

    return context2D.getImageData(...bounds);
};

/**
 * Scales a value from an original range to a target range.
 * @param oMin the minimum value of the original range.
 * @param oMax the maximum value of the original range.
 * @param tMin the minimum value of the target range.
 * @param tMax the maximum value of the target range.
 * @param v the value to scale.
 * @returns number the value of v in the target range
 */
const scaleToRange = (oMin, oMax, tMin, tMax, v) => ((v - oMin) / (oMax - oMin)) * (tMax - tMin) + tMin;

/**
 * Finds the minimum of an array of numbers (use this instead of Math.min(...array) if your array is very large).
 * @param arr an array of numbers
 * @returns number the minimum value in arr
 */
const arrayMin = (arr) => arr.reduce((min, x) => min > x ? x : min, Infinity);

/**
 * Finds the maximum of an array of numbers (use this instead of Math.max(...array) if your array is very large).
 * @param arr an array of numbers
 * @returns number the maximum value in arr
 */
const arrayMax = (arr) => arr.reduce((max, x) => max > x ? max : x, -Infinity);

/**
 * Renders a dataset to a {@link CanvasImageData.getImageData} and collects the individual data points in a backing 2d
 * array that can be used to map locations in the rendered image to their corresponding data points.
 * @param data an array containing the data to render
 * @param width the width of the image to render
 * @param height the height of the image to render
 * @param xAttribute the name of the attribute holding the x-coordinate in a single item in the given data array
 * @param yAttribute the name of the attribute holding the y-coordinate in a single item in the given data array
 * @param mapLocation a function mapping the x and y coordinate of a single item in the given data array to its location in the rendered image.
 *                    Takes an array of two floats and returns an array of two floats, defaults to the identity function.
 *                    If mapLocation is falsy, all x and y coordinates are mapped to the bounds of the rendered image.
 * @param scaleByMaxDensity a boolean flag, if set the rendered image is scaled by the maximum density in the image resulting in a grayscale image. Otherwise the result is a binary image. If your data set is sparse you'll probably want the latter.
 * @returns {{densityImage: ImageData, locationToData: any[]}} an object containing the rendered image and the backing 2d array.
 */
const createImageFromData = (data, width, height, xAttribute, yAttribute, mapLocation = (xy) => xy, scaleByMaxDensity = false) => {
    const filteredData = data.filter(d => d[xAttribute] && d[yAttribute]).map(d => {
        d[xAttribute] = parseFloat(d[xAttribute]);
        d[yAttribute] = parseFloat(d[yAttribute]);
        return d;
    });
    if (!filteredData) {
        throw new Error(`Data has zero elements with both ${xAttribute} and ${yAttribute} set`);
    }
    if (!mapLocation) {
        const xCoords = filteredData.map(d => d[xAttribute]);
        const yCoords = filteredData.map(d => d[yAttribute]);
        const scaleX = scaleToRange.bind(null, arrayMin(xCoords), arrayMax(xCoords), 0, width - 1);
        const scaleY = scaleToRange.bind(null, arrayMin(yCoords), arrayMax(yCoords), 0, height - 1);
        mapLocation = (xy) => [scaleX(xy[0]), scaleY(xy[1])];
    }

    const density = new Array(width * height).fill(0.0);
    const locationToData = new Array(width * height);
    for (let i = 0; i < locationToData.length; i++) {
        locationToData[i] = [];
    }

    filteredData.forEach(d => {
        const location = mapLocation([d[xAttribute], d[yAttribute]]);
        if (location) {
            const x = Math.floor(location[0]);
            const y = Math.floor(location[1]);
            const i = (y * width) + x;
            if (locationToData[i]) {
                density[i] += 1.0;
                locationToData[i].push(d);
            } else {
                console.log(`Sample out of bounds: ${i} not in [0, ${locationToData.length})`);
            }
        }
    });
    const maxDensity = density.reduce((max, x) => max > x ? max : x, 0.0);

    return {
        densityImage: floatArrayToImageData(
            scaleByMaxDensity ? density.map(d => d / maxDensity) : density,
            width),
        locationToData
    };
}

/**
 * Creates a D3 projection.
 * @param width the width of the projection
 * @param height the height of the projection
 * @param projectionMethod the
 * @returns function a D3 projection.
 */
const createProjection = (width, height, projectionMethod = 'geoAlbersUsa') => {
    let defaultHeight = 1;
    switch (projectionMethod) {
        case 'geoAlbersUsa':
            defaultHeight = 500;
        default:
            return d3[projectionMethod]()
                .translate([width / 2, height / 2]) // translate to center
                .scale(d3[projectionMethod]().scale() * (height / defaultHeight));
    }
};

/**
 * Calculates the height for a given width and projection method.
 * @param width the width for which the height should be calculated
 * @param projectionMethod the projection method for which the height should be calculated
 * @return {number} the calculated height
 */
const getProjectionHeight = (width, projectionMethod = 'geoAlbersUsa') => {
    switch (projectionMethod) {
        case 'geoAlbersUsa':
            return 500 * (width / 960);
        default:
            throw new Error(`Unknown projection method: ${projectionMethod}`);
    }
};

/**
 * A specialization of {@link createImageFromData} for geographic projections.
 * @param data the data source
 * @param width the width of the resulting image
 * @param height the height of the resulting image. If this is not set, it is calculated using {@link getProjectionHeight}.
 * @param projectionMethod the projection method to use.
 * @param longitudeAttribute the name of the longitude attribute of items in the data array
 * @param latitudeAttribute the name of the latitude attribute of items in the data array.
 * @param scaleByMaxDensity a boolean flag, if set the rendered image is scaled by the maximum density in the image resulting in a grayscale image. Otherwise the result is a binary image. If your data set is sparse you'll probably want the latter.
 * @returns {{densityImage: ImageData, locationToData: any[]}} an object containing the rendered image and the backing 2d array.
 */
const createGeographicDataImage = (data, width, height = null, projectionMethod = 'geoAlbersUsa', longitudeAttribute = 'LON', latitudeAttribute = 'LAT', scaleByMaxDensity = false) => {
    height = height === null ? getProjectionHeight(width, projectionMethod) : height;
    const projection = createProjection(width, height, projectionMethod);
    return createImageFromData(data, width, height, longitudeAttribute, latitudeAttribute, projection, scaleByMaxDensity);
};


