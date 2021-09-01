const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://GeniusBit1:Nibm2021@zone1.v4dpd.mongodb.net/geniusbit', {useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promise = global.Promise;

module.exports = {
  User: require('../user/user.model'),
  Class: require('../class/class.model'),
};
