const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    title: String,
    description: String,
    url: String,
    classes: Array,
    expiry_date: Date,
    created_date: Date,
    auto_publish_date: {
        type: Date,
        required: true,
        default: new Date()
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

schema.set('toJSON', {virtuals: true});

module.exports = mongoose.model('Doc', schema);