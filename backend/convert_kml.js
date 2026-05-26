const fs = require("fs");
const path = require("path");
const { DOMParser } = require("xmldom");

// ================= FILE PATHS =================
const kmlPath = path.join(__dirname, "../frontend/serengeti_marks.kml");
const geojsonPath = path.join(__dirname, "../frontend/serengeti_marks.geojson");

// ================= READ KML =================
const kmlText = fs.readFileSync(kmlPath, "utf8");

const parser = new DOMParser();
const kml = parser.parseFromString(kmlText, "text/xml");

// ================= GET PLACEMARKS =================
const placemarks = kml.getElementsByTagName("Placemark");

let features = [];

for (let i = 0; i < placemarks.length; i++) {

    const pm = placemarks[i];

    const nameNode = pm.getElementsByTagName("name")[0];
    const coordNode = pm.getElementsByTagName("coordinates")[0];

    if (!coordNode) continue;

    const name = nameNode ? nameNode.textContent.trim() : "UNKNOWN";

    const coordString = coordNode.textContent.trim();

    const [lng, lat] = coordString.split(",").map(Number);

    features.push({
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [lng, lat]
        },
        properties: {
            name: name
        }
    });
}

// ================= BUILD GEOJSON =================
const geojson = {
    type: "FeatureCollection",
    features: features
};

// ================= SAVE FILE =================
fs.writeFileSync(
    geojsonPath,
    JSON.stringify(geojson, null, 2)
);

console.log("✅ Serengeti marks converted successfully!");