function sendSuccess(msg, data = null) {
  if (!data) {
    return {
      'status': 'success',
      'message': capFirst(msg),
    };
  }

  return {
    'status': 'success',
    'message': capFirst(msg),
    'data': data,
  };
}

function sendFailed(msg) {
  return {
    'status': 'failed',
    'message': capFirst(msg),
  };
}

function capFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


module.exports = {
  sendSuccess,
  sendFailed,
};
