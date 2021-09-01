module.exports = {
  getImageType,
  isBase64,
  shuffleArray,
};

function shuffleArray(array) {
  let currentIndex = array.length; let temporaryValue; let randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

function getImageType(base64) {
  if (base64.indexOf('png') > -1) {
    return 'png';
  }
  if (base64.indexOf('jpeg') > -1) {
    return 'jpeg';
  }
  if (base64.indexOf('jpg') > -1) {
    return 'jpg';
  }
  return null;
}

function isBase64(str) {
  return str && str.indexOf('base64') > -1;
}
