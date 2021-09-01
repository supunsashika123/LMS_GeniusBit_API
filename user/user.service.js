const db = require('../helpers/database');
const User = db.User;

module.exports = {
  create,
  update,
  getUnique,
  getById,
  getAll,
  getAllCount,
  getLastRecordWithALYearAndGender,
  getMaxUID,
};

async function create(user) {
  user.created_date = (new Date()).toISOString().split('T')[0];

  const new_user = User(user);
  let response = {};
  try {
    response = await new_user.save();
  } catch (err) {
    console.log(err);
    response.error = 'There was an issue while creating the user.';
  }
  return response;
}

async function update(user, id) {
  const found_user = await User.findOne({_id: id});

  Object.assign(found_user, user);

  let response = {};
  try {
    response = await found_user.save();
  } catch (err) {
    console.log(err);
    response.error = 'There was an issue while updating the user.';
  }
  return response;
}

async function getUnique(filter) {
  return User.findOne(filter);
}

async function getById(id, project = {}) {
  return User.findOne({_id: new Object(id)}, project);
}

async function getAll(filter = {}, page_size, page_index, project = {}, search_term = null) {
  const skip = page_size*page_index;

  if (search_term) {
    filter.$or = [{
      'first_name': {$regex: search_term, $options: 'i'},
    }, {
      'last_name': {$regex: search_term, $options: 'i'},
    }, {
      'username': {$regex: search_term, $options: 'i'},
    }, {
      'email': {$regex: search_term, $options: 'i'},
    }];
  }

  filter.type = 'student';

  return User.find(filter, project).sort({_id: -1}).collation({locale: 'en_US', numericOrdering: true}).skip(skip).limit(parseInt(page_size));
}

async function getAllCount(filter = {}) {
  return User.find(filter);
}

async function getMaxUID() {
  return User.findOne({}, {uid: true}).sort({'uid': -1}).limit(1);
}

async function getLastRecordWithALYearAndGender(gender, al_year) {
  return User.aggregate([
    {
      $match: {
        gender: gender,
        al_year: al_year,
        type: 'student',
        username: {$ne: ''},
      },
    },
    {$sort: {uid: -1}},
    {$limit: 1},
  ]);
}
