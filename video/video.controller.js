router.post('/', authenticateToken, adminOnly, create);
router.get('/:id', authenticateToken, getById);

async function getById(req, res) {
    let id = req.params.id;

    if (!isMongoId(id)) return res.status(Codes.BAD_REQUEST).json(failed("invalid mongoId."));

    let video = await videoService.getById(id);

    if (!video) return res.status(Codes.BAD_REQUEST).json(failed("Video with id provided does not exists."));

    return res.json(success("Video queried.", video))
}

async function create(req, res) {
    let new_video = req.body;
    const error = await validateVideo(new_video);
    if (error) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(error));

    const base64thumbnail = new_video.thumbnail;
    console.log(base64thumbnail)

    delete new_video.thumbnail;

    let created_video = await videoService.create(new_video);
    if (created_video.error) return res.status(Codes.INTERNAL_SERVER_ERROR).json(failed(created_video.error));

    if (!base64thumbnail || base64thumbnail.trim().length === 0) return res.json(success("Video has been created.", created_video))

    if (isBase64(base64thumbnail)) {
        const created_file_name = await fs.uploadImageToFileSystem(base64thumbnail, "video/" + created_video._id);
        created_video.thumbnail = process.env.UPLOAD_PATH + created_file_name;
    }

    let updated_video = await videoService.update(created_video, created_video._id);

    return res.json(success("Video has been created.", updated_video))
}