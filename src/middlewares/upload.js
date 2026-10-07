const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ALLOWED[file.mimetype];

  if (!allowedExts || !allowedExts.includes(ext)) {
    const err = new Error(`ไม่รองรับไฟล์ชนิด ${file.mimetype} (${ext})`);
    err.status = 415;
    return cb(err);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE, // ขนาดต่อไฟล์
    files: 5,           // จำนวนไฟล์ต่อคำขอ
    fields: 10,         // จำนวนฟิลด์ข้อความ
  },
});

/**
 * Middleware ชั้นที่ 3: ตรวจสอบ Magic Bytes ของไฟล์หลังบันทึกลง Disk
 * หากเป็นไฟล์ปลอม จะลบออกจาก Disk ทันที
 */
const validateMagicBytes = async (req, res, next) => {
  // รองรับทั้งแบบไฟล์เดียว (req.file) และหลายไฟล์ (req.files)
  const files = req.files 
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : (req.file ? [req.file] : []);

  if (files.length === 0) return next();

  try {
    // Dynamic import สำหรับ file-type (รองรับ Codespaces และ ESM)
    const { fileTypeFromFile } = await import('file-type');

    for (const file of files) {
      const type = await fileTypeFromFile(file.path);
      const allowedMimes = Object.keys(ALLOWED);

      // กรณีไฟล์รูปภาพ/PDF แล้วตรวจ Magic Bytes ไม่ผ่าน หรือ MIME จริงไม่ตรงกับที่อนุญาต
      const isValidMime = type && allowedMimes.includes(type.mime);

      if (!isValidMime) {
        // ลบไฟล์อันตราย/ไฟล์ปลอมทิ้งทันที
        cleanupFiles(files);
        return res.status(400).json({
          message: `Security Error: โครงสร้างไฟล์ ${file.originalname} ไม่ถูกต้อง หรือถูกปลอมแปลงนามสกุล!`,
        });
      }
    }

    next();
  } catch (error) {
    cleanupFiles(files);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการตรวจสอบความถูกต้องของไฟล์',
      error: error.message,
    });
  }
};

// ฟังก์ชันสำหรับลบไฟล์ออกจากดิสก์เมื่อตรวจไม่ผ่าน
function cleanupFiles(files) {
  files.forEach((file) => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error(`Failed to delete file: ${file.path}`, e);
      }
    }
  });
}

module.exports = { upload, validateMagicBytes, UPLOAD_DIR, ALLOWED };