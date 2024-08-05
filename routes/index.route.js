const express = require('express');
const oneKirana = require('./oneKirana.route');

const router = express.Router();

router.use('/one_kirana', oneKirana);

module.exports = router;
