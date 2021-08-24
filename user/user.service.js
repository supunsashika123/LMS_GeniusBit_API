const db = require('../helpers/database');
const User = db.User;


async function create(user) {
  user.created_date = (new Date()).toISOString().split('T')[0];

  const newUser = User(user);
  let response = {};
  try {
    response = await newUser.save();
  } catch (err) {
    console.log(err);
    response.error = 'There was an issue while creating the user.';
  }
  return response;
}


module.exports = {
  create,
};
