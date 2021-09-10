const db = require('../helpers/database');
const Doc = db.Doc;

module.exports = {
    create,
    getById,
    getAll,
    update
}

async function create(_class){
    _class.created_date = (new Date()).toISOString().split('T')[0];

    const new_class = Doc(_class);
    let response = {};
    try{
        response = await new_class.save();
    }catch (err){
        console.log(err)
        response.error = "There was an issue while creating the doc.";
    }
    return response;
}