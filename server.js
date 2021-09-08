const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const bodyParser = require('body-parser');

app.use((req, res, next) => {
  console.log(`${new Date().toString()} => ${req.method+' '+req.originalUrl}`);
  next();
});

app.get('/', async (req, res) => {
  res.send({
    'message': 'Welcome to the GeniusBit api.',
  });
});

app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(express.json());
app.use(cors());

app.use('/user', require('./user/user.controller'));
app.use('/class', require('./class/class.controller'));
app.use('/video', require('./video/video.controller'));


app.listen(process.env.PORT, function() {
  console.log('Server listening on port '+process.env.PORT);
});
