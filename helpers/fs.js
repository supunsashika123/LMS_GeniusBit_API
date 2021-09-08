const fileSystem = require('fs');
const {getImageType} = require('../helpers/common');

async function uploadImageToFileSystem(base64, path) {
  const type = getImageType(base64);

  await fileSystem.writeFile('./uploads/'+path+'.'+type, base64.split(',')[1], 'base64', (s) => {
    console.log(s);
  });
  return path+'.'+type;
}

module.exports = {
  uploadImageToFileSystem,
};
