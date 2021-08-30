const express = require('express');
const bcrypt = require('bcrypt');
const {StatusCodes: Codes} = require('http-status-codes');
const {validateUser} = require('../helpers/validator');
const {sendFailed: failed, sendSuccess: success} = require('../helpers/status');
const {authenticateToken, createToken} = require('../helpers/auth');

const userService = require('./user.service');

const router = express.Router();

router.post('/signUp', signUp);
router.post('/signIn', signIn);
router.get('/', authenticateToken, validate);
router.get('/getFiltered', authenticateToken, getFiltered);
router.put('/reset-password', authenticateToken, resetPassword);
router.get('/logout', authenticateToken, logout);
router.get('/:id', authenticateToken, getById);
router.put('/:id', update);

async function getById(req, res) {
  const id = req.params.id;

  const user = await userService.getById(id, {'password': false});

  if (!user) return res.status(Codes.NOT_FOUND).json(failed('User with id provided does not exists.'));

  const classes = [];
  for (let i=0; i<user.class_ids.length; i++) {
    const class_id = user.class_ids[i];
    const _class = await classService.getById(class_id);
    classes.push(_class);
  }

  const copy = {...user}._doc;
  delete copy.class_ids;
  copy.classes = classes;

  return res.json(success('User queried.', copy));
}


async function logout(req, res) {
  return res.json({});
}


async function getFilter(params) {
  delete params['page_size'];
  delete params['page_index'];
  delete params['search_term'];

  const is_expired = params.status === 'expired';
  const is_approved = params.status === 'approved';

  const todayDate = new Date();// .toLocaleString('en-US', {timeZone: 'Asia/Colombo'});
  todayDate.setHours(0);
  todayDate.setMinutes(0);
  todayDate.setSeconds(0);
  todayDate.setMilliseconds(0);
  const todayDateBack = todayDate.getTime();
  todayDate.setDate(todayDate.getDate() + 1);
  const todayDateFor = todayDate.getTime();

  console.log(todayDateBack, todayDateFor);

  if (is_expired) {
    delete params.status;
    params.$where = 'this.status === \'approved\' && this.date_to.getTime() < '+todayDateFor; // this.status !== 'pending' &&
  } else if (is_approved) {
    params.$where = 'this.date_to !== null && this.date_to.getTime() > '+todayDateBack;
  }

  return params;
}

async function getFiltered(req, res) {
  try {
    const query_params = req.query;

    const page_size = query_params['page_size']?query_params['page_size']:25;
    let page_index = query_params['page_index']?query_params['page_index']:1;
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

    return res.json(success(users.length===0?'no users found for provided criteria':'users queried.', {
      users: users,
      page_count: Math.ceil(all_count/page_size),
    }));
  } catch (e) {
    return res.status(Codes.INTERNAL_SERVER_ERROR).send(failed(e.message));
  }
}

async function update(req, res){
  let id = req.params.id;
  console.log("step 1. id"+id);

  const form = formidable({multiples: true});
  form.parse(req, async function (err, fields, files) {
      let updated_user = {};
      let found_user = {};
      let prev_status = "";
      console.log("step 2. inside formidiable callback");
      if(fields){
          found_user = await userService.getById(id);
          console.log("step 3. user found by id");
          if(!found_user) return res.status(Codes.NOT_FOUND).json(failed("provided userid is not valid."));

          updated_user = JSON.parse(fields.payload);
          console.log("step 4. json parsed");

          prev_status = updated_user['prev_status'];
          delete updated_user.username;
          delete updated_user.gender;
          delete updated_user.al_year;
      }
      if(files && files.file){
          const file_type = getImageType(files.file.type);
          const new_path = "/var/www/api/uploads/user/"+id+"."+file_type;

          fileSystem.copyFile(files.file.path, new_path, async (err) => {
              if (err) {
                  console.log("Error on file upload");
              }
              else {
                  console.log("file uploaded")
              }
          });
          console.log("step 5. file copied");

          updated_user.image = process.env.UPLOAD_PATH+"user/"+id+"."+file_type;
      }

      if(isUsernameGenerationRequired(prev_status, updated_user.status, found_user.username)) { // prev_status === 'pending' && updated_user.status === 'approved' && found_user.username === ""
          console.log("step 6. username generation required block");

          updated_user.username = await generateNextUsername(found_user.gender, found_user.al_year);

          console.log("step 7. username generated"+updated_user.username);

          if(!updated_user.username) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed("there was an error generating username."));
          updated_user.uid = await getNextUID();

          console.log("step 8. uid generated "+updated_user.uid);
      }

      updated_user = await userService.update(updated_user, id);

      console.log("step 9. user has been updated");
      console.log(updated_user);

      if (err) {
          console.error(err)
          return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed("unexpected error occurred"));
      }
      return res.json(success("User has been updated.", updated_user))
  })
}

async function resetPassword(req, res) {
  const new_password = req.body['new_pw'];
  const user_id = req.body['user_id'];

  const user = userService.getById(user_id);
  if (!user) return res.status(Codes.NOT_FOUND).json(failed('User does not found'));

  const salt = bcrypt.genSaltSync(parseInt(process.env.SALT_ROUNDS));
  user.password = bcrypt.hashSync(new_password, salt);

  const updatedUser = await userService.update(user, user_id);

  return res.json(success('user has been updated.', updatedUser));
}

async function validate(req, res) {
  const user = await userService.getById(req.user.id, {'password': false});
  return res.json({
    'user': user,
  });
}

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
