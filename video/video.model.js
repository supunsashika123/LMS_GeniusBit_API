const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    url: {
        type: String,
        required: true
    },
    thumbnail: String,
    classes: Array,
    expiry_date: {
        type: Date,
        required: true
    },
    created_date: Date,
    auto_publish_date: {
        type: Date,
        required: true,
        default: new Date()
    },
    timestamps: Array,
    source: {
        enum: ["vimeo","youtube"],
        type: String,
        default: 'vimeo',
        required: true
    },
});

schema.set('toJSON', {virtuals: true});

module.exports = mongoose.model('Video', schema);