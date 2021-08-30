const express = require('express');
const bcrypt = require('bcrypt');
const { StatusCodes: Codes } = require('http-status-codes');
const { validateUser } = require('../helpers/validator');
const { sendFailed: failed, sendSuccess: success } = require('../helpers/status');
const { authenticateToken, createToken } = require('../helpers/auth');

const userService = require('./user.service');

const router = express.Router();


router.post('/signUp', signUp);
router.post('/signIn', signIn);
router.get('/', authenticateToken, validate);
router.get('/getFiltered', authenticateToken, getFiltered);
router.get('/:id', authenticateToken, getById);


async function getById(req, res) {
  const id = req.params.id;
  if (!isMongoId(id)) return res.status(Codes.BAD_REQUEST).json(failed('Invalid mongoId.'));

  const user = await userService.getById(id, { 'password': false });

  if (!user) return res.status(Codes.NOT_FOUND).json(failed('User with id provided does not exists.'));

  const classes = [];
  for (let i = 0; i < user.class_ids.length; i++) {
    const class_id = user.class_ids[i];
    const _class = await classService.getById(class_id);
    classes.push(_class);
  }

  const copy = { ...user }._doc;
  delete copy.class_ids;
  copy.classes = classes;

  return res.json(success('User queried.', copy));
}


async function getFiltered(req, res) {
  try {
    const query_params = req.query;

    const page_size = query_params['page_size'] ? query_params['page_size'] : 25;
    let page_index = query_params['page_index'] ? query_params['page_index'] : 1;
    page_index = (+page_index) - 1;

    const search_term = query_params['search_term'];

    const is_expired = query_params.status === 'expired';

    const filter = await getFilter(query_params);
    console.log(filter);

    const users = await userService.getAll(filter, page_size, page_index, {
      'first_name': true,
      'last_name': true,
      'username': true,
      'email': true,
      'al_year': true,
      'status': true,
    }, search_term);


    if (is_expired) {
      users.forEach((user) => {
        user.status = 'expired';
      });
    }

    const all_count = (await userService.getAllCount(filter)).length;

    return res.json(success(users.length === 0 ? 'no users found for provided criteria' : 'users queried.', {
      users: users,
      page_count: Math.ceil(all_count / page_size),
    }));
  } catch (e) {
    return res.status(Codes.INTERNAL_SERVER_ERROR).send(failed(e.message));
  }
}


async function validate(req, res) {
  const user = await userService.getById(req.user.id, { 'password': false });
  return res.json({
    'user': user,
  });
}

async function signUp(req, res) {
  const newUser = req.body;

  const user = await userService.getUnique({ email: req.body.email });
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
  const user = await userService.getUnique({ username: req.body.username, status: 'approved' });

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
