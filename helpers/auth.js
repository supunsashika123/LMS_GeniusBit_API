const jwt = require('jsonwebtoken');
const {StatusCodes: Codes} = require('http-status-codes');
const {sendFailed: failed} = require('../helpers/status');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(Codes.UNAUTHORIZED).send(failed('The action performed is unauthorized!'));

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(Codes.FORBIDDEN).send(failed('The token provided is either expired or invalid!'));
    req.user = user;
    req.token = token;
    return next();
  });
}

function adminOnly(req, res, next) {
  if (req.user.type && req.user.type === 'admin') {
    return next();
  }
  return res.status(Codes.UNAUTHORIZED).send(failed('Only admins are authorized for this action!'));
}

function studentOnly(req, res, next) {
  if (req.user.type && req.user.type === 'student') {
    return next();
  }
  return res.status(Codes.UNAUTHORIZED).send(failed('Only students are authorized for this action!'));
}

function createToken(info) {
  return jwt.sign(info, process.env.ACCESS_TOKEN_SECRET);
}

module.exports = {
  authenticateToken,
  createToken,
  adminOnly,
  studentOnly,
};
