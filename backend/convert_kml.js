const fs = require("fs");
const path = require("path");
const { DOMParser } = require("xmldom");

// FILE PATHS
const kmlPath = path.join(__dirname, "../frontend/serengeti_boundary.kml");
const geojsonPath = path.join(__dirname, "../frontend/serengeti_boundary.geojson");

// READ KML
const kmlText = fs.readFileSync(kmlPath, "utf8");

const parser = new DOMParser();
const kml = parser.parseFromString(kmlText, "text/xml");

// GET ALL COORDINATES
const coordNodes = kml.getElementsByTagName("coordinates");

let allPolygons = [];

// LOOP
for (let i = 0; i < coordNodes.length; i++) {

    const coordString = coordNodes[i].textContent.trim();

    const points = coordString
        .split(/\s+/)
        .map(p => {
            const [lng, lat] = p.split(",").map(Number);
            return [lng, lat];
        });

    allPolygons.push(points);
}

// BUILD GEOJSON
const geojson = {
    type: "FeatureCollection",
    features: allPolygons.map(poly => ({
        type: "Feature",
        properties: {
            name: "Serengeti Boundary"
        },
        geometry: {
            type: "Polygon",
            coordinates: [poly]
        }
    }))
};

// SAVE FILE
fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));

console.log("✅ Serengeti boundary converted successfully!");