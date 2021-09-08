const express = require('express');
const fs = require('../helpers/fs');

const {StatusCodes: Codes} = require('http-status-codes');
const {authenticateToken, adminOnly} = require('../helpers/auth');
const {
  sendFailed: failed,
  sendSuccess: success,
} = require('../helpers/status');
const {isMongoId} = require('validator');
const {isBase64} = require('../helpers/common');
const {validateVideo} = require('../helpers/validator');

const videoService = require('./video.service');

const router = express.Router();

router.get('/getFiltered', authenticateToken, getFiltered);
router.get('/test', test);
router.get('/:id', authenticateToken, getById);
router.post('/', authenticateToken, adminOnly, create);
router.put('/:id', authenticateToken, adminOnly, update);

module.exports = router;

async function create(req, res) {
  const new_video = req.body;
  const error = await validateVideo(new_video);
  if (error) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(error));

  const base64thumbnail = new_video.thumbnail;
  console.log(base64thumbnail);

  delete new_video.thumbnail;

  const created_video = await videoService.create(new_video);
  if (created_video.error) {
    return res
        .status(Codes.INTERNAL_SERVER_ERROR)
        .json(failed(created_video.error));
  }

  if (!base64thumbnail || base64thumbnail.trim().length === 0) {
    return res.json(success('Video has been created.', created_video));
  }

  if (isBase64(base64thumbnail)) {
    const created_file_name = await fs.uploadImageToFileSystem(
        base64thumbnail,
        'video/' + created_video._id,
    );
    created_video.thumbnail = process.env.UPLOAD_PATH + created_file_name;
  }

  const updated_video = await videoService.update(
      created_video,
      created_video._id,
  );

  return res.json(success('Video has been created.', updated_video));
}

async function getById(req, res) {
  const id = req.params.id;

  if (!isMongoId(id)) {
    return res.status(Codes.BAD_REQUEST).json(failed('invalid mongoId.'));
  }

  const video = await videoService.getById(id);

  if (!video) {
    return res
        .status(Codes.BAD_REQUEST)
        .json(failed('Video with id provided does not exists.'));
  }

  return res.json(success('Video queried.', video));
}

async function update(req, res) {
  const video = req.body;
  const id = req.params.id;

  if (!isMongoId(id)) {
    return res.status(Codes.BAD_REQUEST).json(failed('invalid mongoId.'));
  }
  const found_video = videoService.getById(id);
  if (!found_video) {
    return res
        .status(Codes.NOT_FOUND)
        .json(failed('provided videoid is not valid.'));
  }

  const error = await validateVideo(video);
  if (error) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(error));

  if (isBase64(video.thumbnail)) {
    const uploaded_image = await fs.uploadImageToFileSystem(
        video.thumbnail,
        'video/' + id,
    );
    video.thumbnail = process.env.UPLOAD_PATH + uploaded_image;
  }

  const updated_video = await videoService.update(video, id);
  return res.json(success('video has been updated.', updated_video));
}

async function getFiltered(req, res) {
  const filters = req.query;

  let status = filters.status;

  if (req.user.type === 'student') {
    status = 'active';
  }

  if (status) {
    delete filters.status;
    const todayDate = new Date();
    todayDate.setHours(0);
    todayDate.setMinutes(0);
    todayDate.setSeconds(0);
    todayDate.setMilliseconds(0);
    todayDate.setDate(todayDate.getDate() + 1);
    if (status === 'active') {
      filters.$where =
        todayDate.getTime() +
        ' >= this.auto_publish_date.getTime() && this.expiry_date.getTime() > ' +
        todayDate.getTime() +
        ' ';
    } else if (status === 'expired') {
      filters.$where = todayDate.getTime() + ' >= this.expiry_date.getTime() ';
    } else if (status === 'pending') {
      filters.$where =
        todayDate.getTime() + ' < this.auto_publish_date.getTime() ';
    } else {
      return res
          .status(Codes.INTERNAL_SERVER_ERROR)
          .json(failed('unidentified status.'));
    }
  }

  if (filters['class_id']) {
    const class_id = filters['class_id'];
    delete filters['class_id'];
    const exp = 'this.classes.includes(\'' + class_id + '\')';
    console.log(exp);
    if (filters.$where) {
      filters.$where += '&& ' + exp;
    } else {
      filters.$where = exp;
    }
  }

  console.log(filters);

  const videos = await videoService.getAll(filters, {
    title: true,
    description: true,
    thumbnail: true,
    url: true,
  });
  return res.json(
      success(
      videos.length === 0 ?
        'no videos found for provided criteria' :
        'videos queried.',
      videos,
      ),
  );
}

async function test(req, res) {
  const x = await fs.uploadImageToFileSystem(
      'data:image/png;base64,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',
      'video_id',
  );
  return res.json(success('', x));
}
