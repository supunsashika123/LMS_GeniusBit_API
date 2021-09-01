const db = require('../helpers/database');
const Class = db.Class;

module.exports = {
  create,
  update,
  getAll,
  findOne,
  getById,
};

async function create(_class) {
  _class.created_date = (new Date()).toISOString().split('T')[0];

  const new_class = Class(_class);
  let response = {};
  try {
    response = await new_class.save();
  } catch (err) {
    console.log(err);
    response.error = 'There was an issue while creating the class.';
  }
  return response;
}

async function getById(id) {
  return Class.findOne({_id: new Object(id), deactivated: false});
}

async function update(_class, _id) {
  const found_class = await Class.findOne({_id: _id});

  Object.assign(found_class, _class);

  const response = await found_class.save();
  return response;
}

async function getAll(project = {}) {
  return Class.find({deactivated: false}, project);
}

async function findOne(_id) {
  return Class.findOne({_id: _id});
}
