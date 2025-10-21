const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db'); // your DB connection

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage }).single('profile_pic');

exports.uploadProfilePic = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });

    const userId = req.body.user_id;
    const filePath = req.file.path.replace('public/', '');

    // Optional: delete old profile pic from disk
    const [user] = await db.query('SELECT profile_pic FROM users WHERE id = ?', [userId]);
    if (user[0].profile_pic) fs.unlink('public/' + user[0].profile_pic, () => {});

    await db.query('UPDATE users SET profile_pic = ? WHERE id = ?', [filePath, userId]);
    res.json({ success: true, path: '/' + filePath });
  });
};

exports.deleteProfilePic = async (req, res) => {
  const userId = req.params.user_id;
  const [user] = await db.query('SELECT profile_pic FROM users WHERE id = ?', [userId]);
  if (user[0].profile_pic) fs.unlink('public/' + user[0].profile_pic, () => {});
  await db.query('UPDATE users SET profile_pic = NULL WHERE id = ?', [userId]);
  res.json({ success: true });
};
