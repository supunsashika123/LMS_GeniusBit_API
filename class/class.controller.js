const express = require('express');
const { StatusCodes:Codes } = require('http-status-codes');
const { authenticateToken, adminOnly } = require('../helpers/auth');
const { validateMongoId: validateMID } = require('../helpers/validator');
const { validateClass } = require("../helpers/validator")
const { sendFailed: failed, sendSuccess: success } = require("../helpers/status");

const classService = require('./class.service');

const router = express.Router();

router.get('/', authenticateToken, getAll);
router.get('/:id', authenticateToken, validateMID, getById);

router.put('/:id', authenticateToken, adminOnly, validateMID, update);

module.exports = router;

async function getById(req, res) {
    try {
        let id = req.params.id;

        let _class = await classService.getById(id);
        if(!_class) return res.status(Codes.BAD_REQUEST).json(failed("class with id provided does not exists."));
        return res.json(success("class found.", _class))
    } catch (e) {
        return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed("unexpected error occurred."));
    }
}

async function update(req, res) {
    try {
        let _class = req.body;
        let _id = req.params.id;

        const error = await validateClass(_class);
        if(error) {
            return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(error));
        }

        let found_class = classService.findOne(_id);
        if(!found_class) return res.status(Codes.NOT_FOUND).json(failed("class not found."));

        let updated_class = await classService.update(_class, _id);
        return res.json(success("class has been updated.", updated_class))
    } catch (e) {
        return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed("unexpected error occurred."));
    }
}

async function getAll(req, res) {
    try {
        let project = req.body.project;
        let _classes = await classService.getAll(project);
        return res.json(success("class found.", _classes))
    } catch (e) {
        return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed("unexpected error occurred."));
    }
}