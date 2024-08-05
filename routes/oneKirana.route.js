const express = require('express');
const app = express();
const multer = require('multer');
const oneKiranaController = require('../controller/oneKirana.controller');
const router = express.Router();

const upload = multer();

router.post('/generate_pdf', upload.single('excelFile'), oneKiranaController.importExcel);

module.exports = router;