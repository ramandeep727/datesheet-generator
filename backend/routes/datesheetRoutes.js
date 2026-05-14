const express = require("express");
const router = express.Router();
const {
  createDatesheet,
  getDatesheets,
} = require("../controllers/datesheetController");

router.post("/", createDatesheet);
router.get("/", getDatesheets);

module.exports = router;