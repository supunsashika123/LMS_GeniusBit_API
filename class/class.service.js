const db = require('../helpers/database');
const Class = db.Class;

module.exports = {
    create,
    update,
    getAll,
    findOne,
    getById
}

async function getById(id) {
    return Class.findOne({_id: new Object(id), deactivated: false});
}

async function update(_class, _id) {
    const found_class = await Class.findOne({_id: _id});

    Object.assign(found_class, _class);

    let response = await found_class.save();
    return response;
}

async function getAll(project = {}){
    return Class.find({deactivated: false}, project);
}

async function findOne(_id) {
    return Class.findOne({_id: _id});
}