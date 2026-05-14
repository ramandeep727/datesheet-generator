const Datesheet = require("../models/Datesheet");

// Create Datesheet
exports.createDatesheet = async (req, res) => {
  try {
    const { title, subjects } = req.body;

    const newDatesheet = new Datesheet({ title, subjects });
    await newDatesheet.save();

    res.status(201).json(newDatesheet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All
exports.getDatesheets = async (req, res) => {
  try {
    const data = await Datesheet.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};