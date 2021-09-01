const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  username: {
    type: String,
    default: '',
  },
  image: {
    type: String,
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  email: {
    unique: true,
    type: String,
  },
  school: {
    type: String,
  },
  mobile: {
    type: String,
    required: true,
  },
  al_year: {
    type: Number,
    required: true,
  },
  status: {
    enum: ['pending', 'approved', 'rejected'],
    type: String,
    default: 'pending',
  },
  class_ids: {
    type: Array,
  },
  type: {
    enum: ['student', 'admin'],
    type: String,
    default: 'student',
  },
  gender: {
    enum: ['male', 'female'],
    type: String,
    required: true,
  },
  created_date: Date,
  subscription: {
    type: Object,
  },
  date_from: {
    type: Date,
    default: null,
  },
  date_to: {
    type: Date,
    default: null,
  },
  uid: {
    type: Number,
    default: -1,
  },
}, {
  versionKey: false,
});

schema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', schema);
