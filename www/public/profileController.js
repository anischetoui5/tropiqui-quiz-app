const multer = require('multer');
const path = require('path');
const fs = require('fs');
const createDbConnection = require('../db'); // the function from above

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage }).single('profile_pic');

// Upload profile picture
exports.uploadProfilePic = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ success: false, error: 'Upload failed' });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const db = await createDbConnection(); // ✅ await connection here
    const userId = req.body.user_id;
    const filePath = '/uploads/' + req.file.filename;

    try {
      const [rows] = await db.query('SELECT profile_picture FROM users WHERE user_id = ?', [userId]);
      if (rows[0].profile_picture) fs.unlink('public/' + rows[0].profile_picture, () => {});
      await db.query('UPDATE users SET profile_picture = ? WHERE user_id = ?', [filePath, userId]);
      res.json({ success: true, path: filePath });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });
};

// Delete profile picture
exports.deleteProfilePic = async (req, res) => {
  const db = await createDbConnection(); // ✅ await connection here
  const userId = req.params.user_id;

  try {
    const [rows] = await db.query('SELECT profile_picture FROM users WHERE user_id = ?', [userId]);
    if (rows[0].profile_picture) fs.unlink('public/' + rows[0].profile_picture, () => {});
    await db.query('UPDATE users SET profile_picture = NULL WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};
