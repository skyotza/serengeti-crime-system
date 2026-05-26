const mongoose = require("mongoose");

const MarkSchema = new mongoose.Schema({

    name: String,

    type: String,

    lat: Number,

    lng: Number,

    created_at: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Mark", MarkSchema);