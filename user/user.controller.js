const express = require('express');
const bcrypt = require('bcrypt');
const {StatusCodes: Codes} = require('http-status-codes');
const {validateUser} = require('../helpers/validator');
const userService = require('./user.service');

const router = express.Router();


router.post('/signUp', signUp);
router.post('/signIn', signIn);


async function signUp(req, res) {
  const newUser = req.body;

  const user = await userService.getUnique({email: req.body.email});
  if (user) return res.status(Codes.NOT_FOUND).json(failed('Email already exists.'));

  const error = await validateUser(newUser);

  if (error) {
    return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(error));
  }

  const salt = bcrypt.genSaltSync(parseInt(process.env.SALT_ROUNDS));
  newUser.password = bcrypt.hashSync(newUser.password, salt);

  const createdUser = await userService.create(newUser);

  if (!createdUser._id) {
    return res.status(Codes.BAD_REQUEST).json(failed(createdUser.error));
  }

  return res.json(success('user has been created.', createdUser));
}


async function signIn(req, res) {
  const user = await userService.getUnique({username: req.body.username, status: 'approved'});

  if (!user) return res.status(Codes.NOT_FOUND).json(failed('Username does not exists.'));

  if (!user.date_from || !user['date_to']) return res.status(Codes.NOT_FOUND).json(failed('user validity period is not set.'));

  let today = new Date();
  today = today.getTime();
  if (!((new Date(user.date_from)).getTime() <= today && (new Date(user['date_to']).getTime() > today))) return res.status(Codes.NOT_FOUND).json(failed('Your account has been expired, Please contact administration.'));

  if (!bcrypt.compareSync(req.body.password, user['password'])) return res.status(Codes.PARTIAL_CONTENT).json(failed('password is invalid.'));

  const tokenizing_user = {
    id: user.id,
    type: user.type,
    email: user.email,
  };

  const token = createToken(tokenizing_user);

  return res.json(success('user authenticated.', {
    'token': token,
    'user': user,
  }));
}

module.exports = router;
