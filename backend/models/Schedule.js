const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  subject: String,
  code: String,
  course: String,
  stream: String,
  semester: String,
  college: String,
  date: String,
  time: String,
  shift: String,
  roomId: { type: String, default: "Main Hall" },
  facultyId: { type: String, default: "Staff" }
});

// Prevent duplicate schedules for the same subject in same slot (Removed unique constraint since multiple streams take the same exam)
scheduleSchema.index({ code: 1, date: 1, shift: 1 });

// Prevent room double-booking (Removed unique constraint for now, since multiple courses might be in 'Main Hall')
scheduleSchema.index({ roomId: 1, date: 1, shift: 1 });

module.exports = mongoose.model("Schedule", scheduleSchema);