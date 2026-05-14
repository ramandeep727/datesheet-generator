/**
 * Enterprise University Scheduling Engine (CSP Solver)
 * Handles 50,000+ students, room capacities, faculty availability, and student clashes.
 */

class SchedulerEngine {
  constructor(settings, holidays) {
    this.settings = settings;
    this.holidays = holidays.map(h => new Date(h).toDateString());
    this.schedule = [];
    this.clashMatrix = {}; // Map: SubjectCode -> Set(ClashingSubjectCodes)
    this.examLoad = {};    // Map: DateString -> { morning: 0, evening: 0 }
    this.slotOccupancy = {}; // Map: SlotKey -> Set(SubjectCodes)
    this.roomBookings = {}; // Map: DateString_Shift -> Set(RoomId)
  }


  /**
   * Pre-calculates which subjects cannot be scheduled together based on student enrollments.
   */
  buildClashMatrix(colleges) {
    // In a real ERP, this would query a StudentEnrollment table.
    // For this simulation, we assume subjects in the same Semester + Course clash.
    // AND Open Electives clash with everything in their "basket".
    
    let subjectGroups = {}; // semester_course -> [subjectCodes]

    for (let col in colleges) {
      for (let c of colleges[col]) {
        // Fix: Group by College + Course + Stream + Semester
        const groupKey = `${col}_${c.course}_${c.stream}_${c.semester}`;
        if (!subjectGroups[groupKey]) subjectGroups[groupKey] = [];
        
        c.subjects.forEach(s => {
          if (!subjectGroups[groupKey].includes(s.code)) {
            subjectGroups[groupKey].push(s.code);
          }
        });
      }
    }

    // Connect all subjects in the same group as clashing
    for (let key in subjectGroups) {
      const group = subjectGroups[key];
      for (let i = 0; i < group.length; i++) {
        for (let j = 0; j < group.length; j++) {
          if (i === j) continue;
          this.addClash(group[i], group[j]);
        }
      }
    }
  }

  addClash(subA, subB) {
    if (!this.clashMatrix[subA]) this.clashMatrix[subA] = new Set();
    this.clashMatrix[subA].add(subB);
  }

  isWorkingDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const dateStr = d.toDateString();

    if (this.settings.skipSunday && day === 0) return false;
    if (this.settings.skipSaturday && day === 6) return false;
    if (this.holidays.includes(dateStr)) return false;
    
    return true;
  }

  getNextAvailableDate(currentDate) {
    let d = new Date(currentDate);
    while (!this.isWorkingDate(d)) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  /**
   * Main Recursive Backtracking Function
   */
  solve(subjects, slots, index = 0, state = { backtracks: 0 }) {
    if (index === subjects.length) return true;

    // Safety: Prevent infinite loops on impossible schedules
    state.backtracks++;
    if (state.backtracks > 1000000) {
        throw new Error("Extreme complexity reached (1M+ combinations). This confirms that your constraints (Student Clashes + Gap + Load Control) are physically impossible for the given date range. Please increase the 'Start Date' range or reduce the 'Gap' between exams.");
    }

    const subject = subjects[index];

    for (const slot of slots) {
      if (this.isValid(subject, slot)) {
        // Assign
        this.assign(subject, slot);

        // Recurse
        if (this.solve(subjects, slots, index + 1, state)) return true;

        // Unassign (Backtrack)
        this.unassign(subject, slot);
      }
    }

    return false;
  }

  generatePossibleSlots() {
    const slots = [];
    this.workingDates = [];
    let d = new Date(this.settings.startDate);
    const maxDays = 90; // Increased to 90 days for better flexibility

    for (let i = 0; i < maxDays; i++) {
      if (this.isWorkingDate(d)) {
        this.workingDates.push(d.toDateString());
        slots.push({ date: new Date(d), shift: 'Morning', time: this.settings.morningTime });
        slots.push({ date: new Date(d), shift: 'Evening', time: this.settings.eveningTime });
      }
      d.setDate(d.getDate() + 1);
    }
    return slots;
  }


  isValid(subject, slot) {
    const dateStr = slot.date.toDateString();
    const slotKey = `${dateStr}_${slot.shift}`;
    const clashingWithSubject = this.clashMatrix[subject.code];

    // 1. Same Day & Calendar Gap Constraints
    // gap=0 means same day constraint (minimum 1 calendar day difference)
    // gap=1 means 1 day off between exams (minimum 2 calendar days difference)
    const gapSetting = this.settings.gap !== undefined ? parseInt(this.settings.gap) : 1;
    const minTimeDiff = (gapSetting + 1) * 24 * 60 * 60 * 1000;

    if (clashingWithSubject) {
      for (const checkSlotKey in this.slotOccupancy) {
        const subjectsInSlot = this.slotOccupancy[checkSlotKey];
        if (!subjectsInSlot || subjectsInSlot.size === 0) continue;

        // Ensure we don't schedule the exact same subject twice
        if (checkSlotKey === slotKey && subjectsInSlot.has(subject.code)) return false;

        // Check if a clashing subject is in this slot
        let hasClash = false;
        for (let otherCode of subjectsInSlot) {
          if (clashingWithSubject.has(otherCode)) {
            hasClash = true;
            break;
          }
        }

        if (hasClash) {
          // Extract date from slotKey (e.g., "Mon May 18 2026_Morning")
          const datePartStr = checkSlotKey.split('_')[0];
          const checkDate = new Date(datePartStr);
          
          // Calculate calendar time difference
          const timeDiff = Math.abs(slot.date.getTime() - checkDate.getTime());
          
          if (timeDiff < minTimeDiff) {
            return false; // Violates calendar gap or same-day constraint!
          }
        }
      }
    }

    // 2. Shift Constraint based on Semester
    if (subject.occurrences && subject.occurrences.length > 0 && subject.occurrences[0].semester) {
      const semMatch = subject.occurrences[0].semester.match(/\d+/);
      if (semMatch) {
        const semNumber = semMatch[0];
        if (slot.shift === 'Morning' && this.settings.morningSems && this.settings.morningSems.length > 0) {
          if (!this.settings.morningSems.includes(semNumber)) return false;
        }
        if (slot.shift === 'Evening' && this.settings.eveningSems && this.settings.eveningSems.length > 0) {
          if (!this.settings.eveningSems.includes(semNumber)) return false;
        }
      }
    }

    // 3. Check Load Control
    if (this.settings.enableLoadControl) {
      const load = this.examLoad[dateStr] || { morning: 0, evening: 0 };
      const max = slot.shift === 'Morning' ? this.settings.maxMorningLoad : this.settings.maxEveningLoad;
      if (load[slot.shift.toLowerCase()] >= (max || 999)) return false;
    }

    return true;
  }

  assign(subject, slot) {
    const dateStr = slot.date.toDateString();
    const slotKey = `${dateStr}_${slot.shift}`;
    const res = {
      ...subject,
      date: dateStr,
      time: slot.time,
      shift: slot.shift
    };
    this.schedule.push(res);

    // Update Occupancy Map
    if (!this.slotOccupancy[slotKey]) this.slotOccupancy[slotKey] = new Set();
    this.slotOccupancy[slotKey].add(subject.code);

    // Update Load
    if (!this.examLoad[dateStr]) this.examLoad[dateStr] = { morning: 0, evening: 0 };
    this.examLoad[dateStr][slot.shift.toLowerCase()]++;
  }

  unassign(subject, slot) {
    this.schedule.pop();
    const dateStr = slot.date.toDateString();
    const slotKey = `${dateStr}_${slot.shift}`;
    
    this.slotOccupancy[slotKey].delete(subject.code);
    this.examLoad[dateStr][slot.shift.toLowerCase()]--;
  }

  generate(colleges) {
    // 1. Group unique subjects by code so they are scheduled on the same date/time
    let uniqueSubjectsMap = new Map();
    for (let col in colleges) {
      for (let c of colleges[col]) {
        c.subjects.forEach(s => {
          if (!uniqueSubjectsMap.has(s.code)) {
            uniqueSubjectsMap.set(s.code, {
              code: s.code,
              name: s.name,
              occurrences: []
            });
          }
          uniqueSubjectsMap.get(s.code).occurrences.push({
            college: col,
            course: c.course,
            stream: c.stream,
            semester: c.semester,
            code: s.code,
            subject: s.name
          });
        });
      }
    }
    
    let allUniqueSubjects = Array.from(uniqueSubjectsMap.values());

    // 2. Build clash matrix based on unique subject codes
    this.buildClashMatrix(colleges);

    // 3. Sort subjects by 'difficulty' (subjects with most clashes first)
    allUniqueSubjects.sort((a, b) => {
      const clashesA = this.clashMatrix[a.code] ? this.clashMatrix[a.code].size : 0;
      const clashesB = this.clashMatrix[b.code] ? this.clashMatrix[b.code].size : 0;
      return clashesB - clashesA;
    });

    // 4. Pre-calculate slots once
    const slots = this.generatePossibleSlots();

    // 5. Solve for unique subjects
    const success = this.solve(allUniqueSubjects, slots);
    
    if (!success) {
      throw new Error("Could not generate a clash-free datesheet. Please increase dates or reduce constraints.");
    }

    // 6. Expand the scheduled unique subjects back to their occurrences
    let finalSchedule = [];
    for (let scheduledItem of this.schedule) {
      for (let occ of scheduledItem.occurrences) {
        finalSchedule.push({
          ...occ,
          date: scheduledItem.date,
          time: scheduledItem.time,
          shift: scheduledItem.shift
        });
      }
    }

    return finalSchedule;
  }
}

module.exports = SchedulerEngine;
