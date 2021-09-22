const db = require('../helpers/database');
const Doc = db.Doc;

module.exports = {
  create,
  getById,
  getAll,
  update,
};

async function create(_class) {
  _class.created_date = (new Date()).toISOString().split('T')[0];

  const new_class = Doc(_class);
  let response = {};
  try {
    response = await new_class.save();
  } catch (err) {
    console.log(err);
    response.error = 'There was an issue while creating the doc.';
  }
  return response;
}

async function getById(id) {
  return Doc.findOne({_id: new Object(id), deleted: false});
}

async function getAll(filter = {}, project = {}) {
  return Doc.find({
    deleted: false,
    ...filter,
  }, project).sort({_id: -1});
}

async function update(doc, id) {
  const found_doc = await Doc.findOne({_id: id});

  Object.assign(found_doc, doc);

  let response = {};
  try {
    response = await found_doc.save();
  } catch (err) {
    console.log(err);
    response.error = 'There was an issue while updating the doc.';
  }
  return response;
}
