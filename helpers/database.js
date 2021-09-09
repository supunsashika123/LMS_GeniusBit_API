const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_PATH, {useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promise = global.Promise;

module.exports = {
  User: require('../user/user.model'),
  Class: require('../class/class.model'),
  Video: require('../video/video.model'),
};
