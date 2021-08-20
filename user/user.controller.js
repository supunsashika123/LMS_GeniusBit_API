const express = require('express');
const bcrypt = require('bcrypt');


router.post('/signUp', signUp);


async function signUp(req, res) {
  const newUser = req.body;

  const user = await userService.getUnique({email: req.body.email});
  if (user) return res.status(404).json(failed('Email already exists.'));

  if (error) {
    return res.status(500).json();
  }

  const salt = bcrypt.genSaltSync(parseInt(process.env.SALT_ROUNDS));
  newUser.password = bcrypt.hashSync(newUser.password, salt);


  if (!createdUser._id) {
    return res.status(400).json(createdUser.error);
  }

  return res.json(success('user has been created.', createdUser));
}
