const express = require('express');
const formidable = require('formidable');
const fileSystem = require('fs');

const {StatusCodes: Codes} = require('http-status-codes');
const {authenticateToken, adminOnly} = require('../helpers/auth');
const {sendFailed: failed, sendSuccess: success} = require('../helpers/status');
const {validateDocs} = require('../helpers/validator');
const {isMongoId} = require('validator');

const docService = require('./doc.service');

const router = express.Router();

router.post('/', authenticateToken, adminOnly, create);
router.get('/:id', authenticateToken, getById);

module.exports = router;

async function create(req, res) {
  const form = formidable({multiples: true});
  form.parse(req, async function(err, fields, files) {
    let created_doc = null;
    let updated_doc = null;
    if (fields) {
      const new_doc = JSON.parse(fields.payload);
      created_doc = await docService.create(new_doc);
    }
    if (files) {
      const new_path = '/var/www/api/uploads/doc/' + created_doc._id + '.pdf';

      fileSystem.copyFile(files.file.path, new_path, (err) => {
        if (err) {
          console.log('Error on file upload');
        } else {
          console.log('file uploaded');
          created_doc.url = process.env.UPLOAD_PATH + 'doc/' + created_doc._id + '.pdf';
          docService.update(created_doc, created_doc._id);
        }
      });
      updated_doc = await docService.update(created_doc, created_doc._id);
    }
    if (err) {
      console.error(err);
      return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed('unexpected error occurred'));
    }
    return res.json(success('Doc has been created.', updated_doc ? updated_doc : created_doc));
  });
}
async function getById(req, res) {
  const doc = await docService.getById(req.params.id);
  if (!doc) return res.status(Codes.BAD_REQUEST).json(failed('Doc with id provided does not exists.'));
  return res.json(success('Doc queried.', doc));
}
