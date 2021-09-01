const {isEmail, isMongoId} = require('validator');
const {StatusCodes: Codes} = require('http-status-codes');
const {sendFailed: failed} = require('../helpers/status');

async function validateUser({first_name, last_name, address, password, email, school, mobile, al_year, gender}, isUpdate = false) {
  // first_name
  if (!first_name || first_name.trim() === '') return 'First name is required.';
  if (hasNumber(first_name)) return 'First name cannot contain numbers.';
  if (hasSpecialCharsExceptDotSpaceOrDash(first_name)) return 'First name cannot contain special characters.';
  if (first_name.length < 3) return 'First name should be at least 3 chars.';
  if (first_name.length > 256) return 'First name should not exceed 256 chars.';

  // last name
  if (!last_name || last_name.trim() === '') return 'Last name is required.';
  if (hasNumber(last_name)) return 'Last name cannot contain numbers.';
  if (hasSpecialCharsExceptDotSpaceOrDash(last_name)) return 'Last name cannot contain special characters.';
  if (last_name.length < 3) return 'Last name should be at least 3 chars.';
  if (last_name.length > 256) return 'Last name should not exceed 256 chars.';

  // gender
  if (!gender || gender.trim() === '') return 'Gender is required.';
  if (gender != 'male' && gender != 'female') return 'Invalid gender.';

  // mobile
  if (!mobile || mobile.trim() === '') return 'Mobile number is required.';
  if (!mobile.length > 10) return 'Mobile number allows only 10 digits.';
  if (!isValidLKMobile(mobile)) return 'Invalid mobile number.';

  // email
  if (!email || email.trim() === '') return 'Email is required.';
  if (email.length > 320) return 'Email cannot exceed 320 chars.';
  if (!isEmail(email)) return 'Invalid email address.';

  if (!al_year || al_year.length > 4 || al_year.length <= 0) return 'Invalid a/l year';

  if (!address || address.trim() === '') return 'Address is required.';
  if (!school || school.trim() === '' ) return 'School is required.';

  // password
  if (!isUpdate && (!password || password.trim() === '')) return 'Password is required.';

  return null;
}

async function validateClass({year, institute, type, name}) {
  // year
  if (!year) return 'Year is required.';
  const year_string = year.toString();
  if (!year_string || year_string.trim() === '') return 'Year is required.';
  if (year_string.length != 4 || isNaN(year)) return 'Invalid year.';

  // institute
  if (!institute || institute.trim() === '') return 'Institute is required.';

  // type
  if (!type || type.trim() === '') return 'Type is required.';
  const types = ['paper', 'revision', 'theory'];
  if (!types.includes(type)) return 'Invalid type.';

  // year
  if (!name || name.trim() === '') return 'Name is required.';

  return null;
}

function hasNumber(text) {
  return /\d/.test(text);
}

function hasSpecialCharsExceptDotSpaceOrDash(text) {
  return /[<>%$\[\]!@#^&*(){}|?'",:;]/.test(text);
}

function isValidLKMobile(mobile) {
  // const regex = new RegExp(mobile);
  return true;// regex.test("^(?:0|94|\\+94|0094)?(?:(?P<area>11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)(?P<land_carrier>0|2|3|4|5|7|9)|7(?P<mobile_carrier>0|1|2|5|6|7|8)\\d)\\d{6}$");
}

function validateMongoId(req, res, next) {
  const id = req.params.id;
  if (isMongoId(id)) return next();
  return res.status(Codes.BAD_REQUEST).json(failed('id is not valid.'));
}

module.exports = {
  validateUser,
  validateClass,
  validateMongoId,
};
