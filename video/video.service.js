async function create(_video) {
  _video.created_date = (new Date()).toISOString().split('T')[0];

  const new_video = Video(_video);
  let response = {};
  try {
    response = await new_video.save();
  } catch (err) {
    console.log(err);
    response.error = err._message;
  }
  return response;
}

async function update(user, id) {
  const found_video = await Video.findOne({ _id: id });

  Object.assign(found_video, user);

  let response = {};
  try {
    response = await found_video.save();
  } catch (err) {
    console.log(err)
    response.error = "There was an issue while updating the user.";
  }
  return response;
}

async function getAll(filter = {}, project = {}) {
  return Video.find(filter, project).sort({ _id: -1 });
}
