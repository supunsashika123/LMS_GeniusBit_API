const express = require('express');
const bcrypt = require('bcrypt');
const {StatusCodes: Codes} = require('http-status-codes');
const {validateUser} = require('../helpers/validator');
const userService = require('./user.service');

const router = express.Router();


router.post('/signUp', signUp);


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

module.exports = router;
