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

router.get('/getFiltered', authenticateToken, getFiltered);
router.get('/:id', authenticateToken, getById);
router.post('/', authenticateToken, adminOnly, create);

router.put('/:id', authenticateToken, adminOnly, update);

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
      const new_path = '/var/www/LMS_GeniusBit_API/doc/' + created_doc._id + '.pdf';

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

async function update(req, res) {
  const doc = req.body;
  const id = req.params.id;

  if (!isMongoId(id)) return res.status(Codes.BAD_REQUEST).json(failed('invalid mongoId.'));

  const error = await validateDocs(doc);
  if (error) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(error));

  const found_doc = await docService.getById(id);
  if (!found_doc) return res.status(Codes.NOT_FOUND).json(failed('provided docid is not valid.'));

  const updated_doc = await docService.update(doc, id);
  return res.json(success('Doc has been updated.', updated_doc));
}

async function getFiltered(req, res) {
  const filters = req.query;

  let status = filters.status;

  if (req.user.type === 'student') {
    status = 'active';
  }

  delete filters.status;
  const todayDate = new Date();

  todayDate.setHours(0);
  todayDate.setMinutes(0);
  todayDate.setSeconds(0);
  todayDate.setMilliseconds(0);
  todayDate.setDate(todayDate.getDate() + 1);
  if (status === 'active') {
    filters.$where = todayDate.getTime() + ' >= this.auto_publish_date.getTime() && this.expiry_date.getTime() > ' + todayDate.getTime();
  } else if (status === 'expired') {
    filters.$where = todayDate.getTime() + ' >= this.expiry_date.getTime() ';
  } else if (status === 'pending') {
    filters.$where = todayDate.getTime() + ' < this.auto_publish_date.getTime() ';
  } else {
    return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed('unidentified status.'));
  }

  const videos = await docService.getAll(filters, {
    title: true,
    description: true,
    url: true,
  });
  return res.json(success(videos.length === 0 ? 'no doc found for provided criteria' : 'doc queried.', videos));
}
