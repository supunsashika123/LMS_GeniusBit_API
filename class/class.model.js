const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    year: {
        type: Number,
        required: true
    },
    institute: {
        type: String,
        required: true
    },
    type: {
        enum: ["paper","revision","theory"],
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    deactivated: {
        type: Boolean,
        default: false
    }
});

schema.set('toJSON', {virtuals: true});

module.exports = mongoose.model('Class', schema);