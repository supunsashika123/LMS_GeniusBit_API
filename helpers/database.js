const mongoose = require('mongoose');
mongoose.connect('mongodb://admin:geniusbit2021@104.42.249.174:27017/geniusbit?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false', {useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promise = global.Promise;

module.exports = {
  User: require('../user/user.model'),
  Class: require('../class/class.model'),
};
