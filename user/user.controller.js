const express = require('express');
const bcrypt = require('bcrypt');
const fileSystem = require('fs');
const formidable = require('formidable');

const {StatusCodes: Codes} = require('http-status-codes');
const {authenticateToken, createToken} = require('../helpers/auth');
const {validateUser} = require('../helpers/validator');
const {getImageType} = require('../helpers/common');
const {isMongoId} = require('validator');
const {sendFailed: failed, sendSuccess: success} = require('../helpers/status');

const userService = require('./user.service');
const classService = require('../class/class.service');

const router = express.Router();

router.get('/test', (req, res) => {
  const todayDate = new Date();
  console.log(todayDate);
  res.json('ok');
});

// temporary user upload
// const readXlsxFile = require('read-excel-file/node');
// const filesystem = require('fs');
// router.get('/upload', (req, res) => {
//     readXlsxFile('/var/www/api/AC.xlsx').then(async (rows) => {
//
//         let _uid = 571;
//
//         for(let i=1;i<rows.length;i++) {
//             const row = rows[i];
//
//             let salt = bcrypt.genSaltSync(parseInt(process.env.SALT_ROUNDS));
//             let hash_pw = bcrypt.hashSync(row[6], salt);
//
//             const user = {
//                 uid: _uid,
//                 first_name: row[0],
//                 last_name: row[1],
//                 email: row[2],
//                 mobile: row[3],
//                 al_year: row[4],
//                 gender: row[5],
//                 password: hash_pw,
//                 username: row[7],
//                 class_ids: row[8].split(","),
//                 status: 'approved',
//                 type: 'student',
//                 date_from: new Date("2021-01-20"),
//                 date_to: new Date("2021-02-10")
//             };
//
//             const res = await userService.create(user);
//             console.log(res);
//             _uid++;
//         }
//     })
//
//     let salt = bcrypt.genSaltSync(parseInt(process.env.SALT_ROUNDS));
//     let hash_pw = bcrypt.hashSync('Z=fh-K:c_m,Q,j}:', salt);
//
//     res.json({"ok":hash_pw})
// });
// //////////////////////

router.get('/getFiltered', authenticateToken, getFiltered);
router.get('/logout', authenticateToken, logout);
router.get('/:id', authenticateToken, getById);
router.get('/', authenticateToken, validate);

router.post('/signIn', signIn);
router.post('/signUp', signUp);

router.put('/reset-password', authenticateToken, resetPassword);
router.put('/updateMultiple', updateMultiple);
router.put('/:id', update);


module.exports = router;

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

async function getById(req, res) {
  const id = req.params.id;
  if (!isMongoId(id)) return res.status(Codes.BAD_REQUEST).json(failed('Invalid mongoId.'));

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


async function updateMultiple(req, res) {
  const {student_ids, data, prev_status} = req.body;

  const update_obj = {};

  if (data.status === 'approved') {
    if (!data.date_from) return res.status(Codes.PARTIAL_CONTENT).send(failed('Please pick from date'));
    if (!data.date_to) return res.status(Codes.PARTIAL_CONTENT).send(failed('Please pick to date'));
  }

  if (data.class_ids) update_obj.class_ids = data.class_ids;
  if (data.status) update_obj.status = data.status;
  if (data.date_from) update_obj.date_from = data.date_from;
  if (data.date_to) update_obj.date_to = data.date_to;

  try {
    for (let i=0; i<student_ids.length; i++) {
      const id = student_ids[i];
      const found_student = await userService.getById(id);

      if (found_student) {
        if (isUsernameGenerationRequired(prev_status, data.status, found_student.username)) {
          try {
            update_obj.username = await generateNextUsername(found_student.gender, found_student.al_year);
            if (!update_obj.username) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed('there was an error generating username.'));
            update_obj.uid = await getNextUID();
          } catch (e) {
            console.error(e);
          }

          console.log(update_obj.username, update_obj.uid);
        } else {
          update_obj.username = found_student.username;
          update_obj.uid = found_student.uid;
        }

        await userService.update(update_obj, id);
      }
    }
  } catch (e) {
    console.error(e);
    return res.status(Codes.INTERNAL_SERVER_ERROR).send(failed('Unexpected error!'));
  }

  return res.send(success('success', {}));
}

async function update(req, res) {
  const id = req.params.id;
  console.log('step 1. id'+id);

  const form = formidable({multiples: true});
  form.parse(req, async function(err, fields, files) {
    let updated_user = {};
    let found_user = {};
    let prev_status = '';
    console.log('step 2. inside formidiable callback');
    if (fields) {
      found_user = await userService.getById(id);
      console.log('step 3. user found by id');
      if (!found_user) return res.status(Codes.NOT_FOUND).json(failed('provided userid is not valid.'));

      updated_user = JSON.parse(fields.payload);
      console.log('step 4. json parsed');

      prev_status = updated_user['prev_status'];
      delete updated_user.username;
      delete updated_user.gender;
      delete updated_user.al_year;
    }
    if (files && files.file) {
      const file_type = getImageType(files.file.type);
      const new_path = '/var/www/api/uploads/user/'+id+'.'+file_type;

      fileSystem.copyFile(files.file.path, new_path, async (err) => {
        if (err) {
          console.log('Error on file upload');
        } else {
          console.log('file uploaded');
        }
      });
      console.log('step 5. file copied');

      updated_user.image = process.env.UPLOAD_PATH+'user/'+id+'.'+file_type;
    }

    if (isUsernameGenerationRequired(prev_status, updated_user.status, found_user.username)) { // prev_status === 'pending' && updated_user.status === 'approved' && found_user.username === ""
      console.log('step 6. username generation required block');

      updated_user.username = await generateNextUsername(found_user.gender, found_user.al_year);

      console.log('step 7. username generated'+updated_user.username);

      if (!updated_user.username) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed('there was an error generating username.'));
      updated_user.uid = await getNextUID();

      console.log('step 8. uid generated '+updated_user.uid);
    }

    updated_user = await userService.update(updated_user, id);

    console.log('step 9. user has been updated');
    console.log(updated_user);

    if (err) {
      console.error(err);
      return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed('unexpected error occurred'));
    }
    return res.json(success('User has been updated.', updated_user));
  });
}

// functional methods
async function generateNextUsername(gender, al_year) {
  console.log(gender, al_year);

  const shortGender = gender === 'male' ? 'B' : 'G';

  const records = await userService.getLastRecordWithALYearAndGender(gender, al_year);

  console.log(records.length);

  if (records.length === 0) {
    return al_year+shortGender+'0001';
  }

  const lastRecord = records[0];

  const lastId = parseInt(lastRecord.username.split(shortGender)[1]);

  const nextId = lastId+1;

  let nextIdFormatted = '';
  for (let i=0; i<4 - nextId.toString().length; i++) {
    nextIdFormatted += '0';
  }
  nextIdFormatted += nextId;

  const generatedUsername = al_year+shortGender+nextIdFormatted;

  const found_user = await userService.getUnique({username: generatedUsername});

  if (found_user) return null;

  return generatedUsername;
}

async function getNextUID() {
  const record = await userService.getMaxUID();
  if (!record) return 0;
  return record.uid+1;
}

function isUsernameGenerationRequired(prev_status, new_status, curr_username) {
  return (prev_status === 'pending' && new_status === 'approved' && !curr_username) || (prev_status === 'rejected' && new_status === 'approved' && !curr_username);
}
