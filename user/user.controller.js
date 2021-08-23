const express = require('express');
const bcrypt = require('bcrypt');


router.post('/signUp', signUp);
router.post('/signIn',  signIn);


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


async function signIn(req, res) {
  let user =  await userService.getUnique({username: req.body.username, status: 'approved'});

  if(!user) return res.status(Codes.NOT_FOUND).json(failed('Username does not exists.'))

  if(!user.date_from || !user['date_to']) return res.status(Codes.NOT_FOUND).json(failed('user validity period is not set.'))

  let today = new Date();
  today = today.getTime();
  if(!((new Date(user.date_from)).getTime() <= today && (new Date(user['date_to']).getTime() > today))) return res.status(Codes.NOT_FOUND).json(failed('Your account has been expired, Please contact administration.'))

  if(!bcrypt.compareSync(req.body.password, user['password'])) return res.status(Codes.PARTIAL_CONTENT).json(failed('password is invalid.'))

  const tokenizing_user = {
      id: user.id,
      type: user.type,
      email: user.email,
  }

  let token = createToken(tokenizing_user);

  return res.json(success("user authenticated.", {
      "token": token,
      "user": user
  }));
}