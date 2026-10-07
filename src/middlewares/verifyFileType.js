const fs = require('fs/promises');
const { ALLOWED } = require('./upload');

module.exports = async function verifyFileType(req, res, next) {
  const files = req.file ? [req.file] : req.files || [];
  try {
    // โหลด file-type แบบ Dynamic Import
    const { fileTypeFromFile } = await import('file-type');

    for (const f of files) {
      const detected = await fileTypeFromFile(f.path);
      if (!detected || !ALLOWED[detected.mime]) {
        await Promise.all(files.map((x) => fs.unlink(x.path).catch(() => {})));
        return res.status(415).json({ error: `เนื้อหาไฟล์ ${f.originalname} ไม่ตรงกับชนิดที่อนุญาต` });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};