const SHEET_ID = "1kWJoIXDPWUjw4NCgKolCCtHdfPuyc_hUA8np7pejCDg";
const SHEET_URL = `https://opensheet.elk.sh/${SHEET_ID}/Sheet1`;

let sheetData = [];

let examLoad = {};

const collegeData = {

"Chandigarh Engineering College (CEC)":{

BTech:["CSE","ECE","ME","AIML","AIDS","CIVIL","CSE-DS","CSE-IOT","RAI"],
MTech:["CSE","ECE","ME","AIML","AIDS","CIVIL","CSE-DS","CSE-IOT","RAI"],
MBA:["General","MBA-BA","MBA-DM"]

},

"Chandigarh College of Engineering (CCE)":{

BTech:["Civil","ME"],
MTech:["Civil"]

},

"Chandigarh School of Business (CSB)":{

BBA:["General"],
BCA:["General"],
BAJMC:["General"],
BCom:["General"],
MBA:["General","MBA-FT",],
BSc:["B.Sc-FD","B.Sc-MM","B.Sc-IT","B.Sc-GWD","B.Sc-CS","B.Sc-RIT","B.Sc-BT","B.Sc-MLS","B.Sc-OTT","B.Sc-AOTT","B.Sc-FS","B.Sc-N&D"],
MCA:["General"]

},

"Chandigarh Pharmacy College (CPC)":{

BPharma:["General"],



},

"CGC University":{

BTech:["CSE","ECE","ME","Civil"],
MBA:["Marketing","Finance","HR"],
BBA:["General"],
BCA:["General"]


}


};

let colleges = {};
let holidays = [];

function updateCourses(){

let college = document.getElementById("college").value;
let courseSelect = document.getElementById("course");

courseSelect.innerHTML="";

let courses = Object.keys(collegeData[college]);

courses.forEach(c=>{
courseSelect.innerHTML += `<option value="${c}">${c}</option>`;
});

updateStreams();

}
/* STREAM UPDATE */

function updateStreams(){

let college = document.getElementById("college").value;
let course = document.getElementById("course").value;
let streamSelect = document.getElementById("stream");

streamSelect.innerHTML="";

let streams = collegeData[college][course];

streams.forEach(s=>{
streamSelect.innerHTML += `<option>${s}</option>`;
});

}
/* ADD COURSE */

function addCourse(){

let college = document.getElementById("college").value;
let course = document.getElementById("course").value;
let stream = document.getElementById("stream").value;
let semester = document.getElementById("semester").value;
let subjectsInput = document.getElementById("subjects").value;

if(!subjectsInput){
alert("Enter subjects");
return;
}

let subjects = [];

subjectsInput.split(",").forEach(s=>{

let parts = s.split("|");

if(parts.length < 2){
alert("Use format: CODE|Subject Name");
return;
}

subjects.push({
code: parts[0].trim(),
name: parts[1].trim()
});

});

if(!colleges[college]){
colleges[college] = [];
}

colleges[college].push({
course,
stream,
semester,
subjects
});

document.getElementById("subjects").value="";

showPreview();

}

/* PREVIEW */

function showPreview(){

let preview = document.getElementById("preview");

let html = "";

for(let college in colleges){

html += `<h3>${college}</h3>`;

colleges[college].forEach((c,i)=>{

html += `<div style="margin-bottom:10px">

<b>${c.course} ${c.stream} - ${c.semester}</b>

<button onclick="editCourse('${college}',${i})">Edit</button>
<button onclick="removeCourse('${college}',${i})">Remove</button>

<br>`;

c.subjects.forEach((s,si)=>{

html += `${s.code} - ${s.name}
<button onclick="removeSubject('${college}',${i},${si})">x</button> `;

});

html += "</div>";

});

}

let totalCourses = 0;

for(let col in colleges){
totalCourses += colleges[col].length;
}

html = `<b>Total Courses Added: ${totalCourses}</b><br><br>` + html;
preview.innerHTML = html;

}

/* REMOVE */

function removeCourse(college,index){

colleges[college].splice(index,1);

if(colleges[college].length===0){
delete colleges[college];
}

showPreview();

}

function removeSubject(college,courseIndex,subjectIndex){

colleges[college][courseIndex].subjects.splice(subjectIndex,1);
showPreview();

}

/* EDIT */

function editCourse(college,index){

let c = colleges[college][index];

document.getElementById("course").value = c.course;
updateStreams();

document.getElementById("stream").value = c.stream;
document.getElementById("semester").value = c.semester;

document.getElementById("subjects").value =
c.subjects.map(s=>`${s.code}|${s.name}`).join(",");

removeCourse(college,index);

}

/* HOLIDAYS */

function addHoliday(){

let h = holidayDate.value;

if(h){
holidays.push(new Date(h).toDateString());
holidayDate.value="";
showHolidays();
}

}

function showHolidays(){

let html = "<b>Holidays:</b><br>";

holidays.forEach((h,i)=>{
html += `
<div class="holiday-chip">
${h}
<button onclick="removeHoliday(${i})">×</button>
</div>
`;
});

holidayList.innerHTML = html;

}


function removeHoliday(i){

holidays.splice(i,1);
showHolidays();

}

/* WORKING DATE */

function getNextWorkingDate(date){

let d = new Date(date);

while(true){

let day = d.getDay();

if(skipSunday.checked && day===0){ d.setDate(d.getDate()+1); continue; }
if(skipSaturday.checked && day===6){ d.setDate(d.getDate()+1); continue; }
if(holidays.includes(d.toDateString())){ d.setDate(d.getDate()+1); continue; }

break;

}

return d;

}

/* GENERATE DATESHEET */

/* GENERATE DATESHEET */
let subjectDateMap = {};
async function generate() {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<p style='color:blue'>Engine is solving conflicts... Please wait.</p>";

  const settings = {
    startDate: document.getElementById("startDate").value,
    gap: Number(document.getElementById("gap").value),
    morningTime: document.getElementById("morningTimeInput").value,
    eveningTime: document.getElementById("eveningTimeInput").value,
    morningSems: [...document.querySelectorAll(".morningSem:checked")].map(cb => cb.value),
    eveningSems: [...document.querySelectorAll(".eveningSem:checked")].map(cb => cb.value),
    skipSunday: document.getElementById("skipSunday").checked,
    skipSaturday: document.getElementById("skipSaturday").checked,
    enableLoadControl: document.getElementById("enableLoadControl").checked,
    maxMorningLoad: Number(document.getElementById("maxMorningLoad").value) || 999,
    maxEveningLoad: Number(document.getElementById("maxEveningLoad").value) || 999
  };

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colleges: colleges,
        settings: settings,
        holidays: holidays
      })
    });

    const response = await res.json();

    if (!response.success) {
      resultDiv.innerHTML = `
        <div style="background:#fee2e2; color:#b91c1c; padding:20px; border-radius:8px; border:1px solid #f87171">
          <h3>Scheduling Conflict Detected</h3>
          <p>${response.error}</p>
          <p>Try increasing the start date range or reducing constraints.</p>
        </div>
      `;
      return;
    }

    const data = response.data;

    // Arrange Data: College -> Course -> Semester -> Stream
    data.sort((a, b) => {
      if (a.college !== b.college) return a.college.localeCompare(b.college);
      if (a.course !== b.course) return a.course.localeCompare(b.course);
      
      const semA = parseInt(a.semester.replace("Sem ", "")) || 0;
      const semB = parseInt(b.semester.replace("Sem ", "")) || 0;
      if (semA !== semB) return semA - semB;
      
      return a.stream.localeCompare(b.stream);
    });

    let html = `
      <div style="margin-bottom:10px; color:green; font-weight:bold">
        ✅ Success! Generated ${response.count} exams with zero clashes.
      </div>
      <table id="datesheetTable">
      <tr>
        <th>College</th>
        <th>Course</th>
        <th>Stream</th>
        <th>Semester</th>
        <th>Code</th>
        <th>Subject</th>
        <th>Date</th>
        <th>Time</th>
      </tr>`;


    data.forEach(item => {
      html += `
        <tr>
          <td>${item.college}</td>
          <td>${item.course}</td>
          <td>${item.stream}</td>
          <td>${item.semester}</td>
          <td>${item.code}</td>
          <td>${item.subject}</td>
          <td>${item.date}</td>
          <td>${item.time}</td>
        </tr>
      `;
    });

    html += "</table>";
    resultDiv.innerHTML = html;

  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red">Server Error: ${err.message}</p>`;
  }
}

/* EXPORT PDF */

function exportPDF(){

let table = document.querySelector("#result table");

if(!table){
alert("Generate DateSheet first");
return;
}

const { jsPDF } = window.jspdf;

const doc = new jsPDF("l"); // landscape for better spacing

let y = 15;

/* HEADER */

doc.setFontSize(18);
doc.text("CGC UNIVERSITY",148,y,{align:"center"});
y+=8;

doc.setFontSize(12);
doc.text("Office of Controller of Examination",148,y,{align:"center"});
y+=8;

let examType = document.getElementById("examType").value;

doc.text(examType + " Examination Date Sheet",148,y,{align:"center"});
y += 10;

let year = new Date(document.getElementById("startDate").value).getFullYear();
doc.setFontSize(11);
doc.text("Session: "+year,14,y);

y+=5;


/* FORMAT TABLE DATA */

let rows = [];

document.querySelectorAll("#result table tr").forEach((tr,i)=>{

if(i===0) return;

let tds = tr.querySelectorAll("td");

let date = new Date(tds[8].innerText);

let formattedDate = date.toLocaleDateString("en-GB",{
day:"2-digit",
month:"short",
year:"numeric"
});

let day = date.toLocaleDateString("en-GB",{weekday:"long"});

let time = tds[9].innerText.replace("-", "\nto\n");

rows.push([
tds[0].innerText,
tds[1].innerText,
tds[2].innerText,
tds[3].innerText,
tds[4].innerText,
tds[5].innerText,
tds[6].innerText,
tds[7].innerText,
formattedDate,
time
]);

});


doc.autoTable({

startY: y,

head: [[
"College",
"Course",
"Stream",
"Sem",
"Block",
"Status",
"Code",
"Subject",
"Date",
"Time"
]],

body: rows,

styles:{
fontSize:9,
cellPadding:3,
valign:"middle",
halign:"center"
},

tableWidth:"auto",

columnStyles:{
0:{cellWidth:18}, // College
1:{cellWidth:18}, // Course
2:{cellWidth:40}, // Stream
3:{cellWidth:18}, // Semester (more space)
4:{cellWidth:16}, // Block
5:{cellWidth:24}, // Status (more space)
6:{cellWidth:26}, // Code
7:{cellWidth:50}, // Subject
8:{cellWidth:26}, // Date
9:{cellWidth:32}  // Time (more space)
},

headStyles:{
fillColor:[37,99,235],
textColor:255,
fontStyle:"bold"
},

margin:{left:8,right:8}

});

/* FOOTER */

/* FOOTER */

let pageCount = doc.internal.getNumberOfPages();

for(let i=1;i<=pageCount;i++){

doc.setPage(i);

doc.setFontSize(9);

doc.text(
"Page "+i+" of "+pageCount,
250,
200
);

}

let finalY = doc.lastAutoTable.finalY + 15;

doc.setFontSize(10);

doc.text(
"Controller of Examination",
doc.internal.pageSize.getWidth() - 70,
finalY
);

doc.save("CGC_DateSheet.pdf");

}
/* EXPORT EXCEL */

function exportExcel(){

let table = document.querySelector("#result table");

if(!table){
alert("Generate first");
return;
}

let rows = [];

document.querySelectorAll("#result table tr").forEach((tr,i)=>{

let cols = tr.querySelectorAll("th,td");
let row=[];

cols.forEach(td=>{
row.push(td.innerText);
});

rows.push(row);

});

let worksheet = XLSX.utils.aoa_to_sheet(rows);
let workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"DateSheet");

XLSX.writeFile(workbook,"CGC_DateSheet.xlsx");

}

/* LOGIN */

function logout(){

sessionStorage.removeItem("loggedIn");
window.location.replace("login.html");

}

function disableSystem(){

localStorage.setItem("system","OFF");
alert("System Disabled by Admin");
logout();

}

/* GOOGLE SHEET */

fetch(SHEET_URL)
.then(res => res.json())
.then(data => {
sheetData = data;
})
.catch(()=>{
alert("Google Sheet not connected");
});

/* EXCEL UPLOAD */

function uploadExcel(){

let file = document.getElementById("excelFile").files[0];

if(!file){
alert("Select Excel file");
return;
}

let reader = new FileReader();

reader.onload=function(e){

let data = new Uint8Array(e.target.result);
let workbook = XLSX.read(data,{type:"array"});

let sheet = workbook.Sheets[workbook.SheetNames[0]];
let rows = XLSX.utils.sheet_to_json(sheet);

rows.forEach(r=>{

let college = r.College;

/* COURSE + STREAM FROM BRANCH NAME */

let branch = r.branchName;

let course = branch.includes("B.Tech") ? "BTech" :
             branch.includes("M.Tech") ? "MTech" :
             branch.includes("MBA") ? "MBA" :
             branch.includes("BBA") ? "BBA" :
             branch.includes("BCA") ? "BCA" : "General";

let stream = branch;

/* SEMESTER */

let semester = "Sem " + r.Sem;

/* SUBJECT */

let subject={
code: r.subCode,
name: r.subTitle,
status: (r["R/RP"] === "RP") ? "Reappear" : "Regular"
};

if(!colleges[college]){
colleges[college]=[];
}

/* CHECK IF SAME COURSE ALREADY EXISTS */

let existing = colleges[college].find(c=>
c.course===course &&
c.stream===stream &&
c.semester===semester
);

if(existing){

if(!existing.subjects.find(s => s.code === subject.code)){
existing.subjects.push(subject);
}

}
else{
colleges[college].push({
course,
stream,
semester,
subjects:[subject]
});
}

});

showPreview();

};

reader.readAsArrayBuffer(file);

}
updateCourses();

function showExamLoad(){

let panel = document.getElementById("examLoadPanel");

if(panel.style.display === "block"){
panel.style.display = "none";
return;
}

let html = "<h3>Exam Load Summary</h3>";

for(let d in examLoad){

html += `
<div style="margin-bottom:10px">
<b>${d}</b><br>
Morning : ${examLoad[d].morning} exams<br>
Evening : ${examLoad[d].evening} exams
</div>
`;

}

panel.innerHTML = html;
panel.style.display = "block";

}
function syncSessions(){

let morning = document.querySelectorAll(".morningSem");
let evening = document.querySelectorAll(".eveningSem");

/* MORNING → DISABLE EVENING */

morning.forEach(m=>{
let sem = m.value;

let e = document.querySelector(`.eveningSem[value="${sem}"]`);

if(m.checked){
e.disabled = true;
}else{
e.disabled = false;
}
});

/* EVENING → DISABLE MORNING */

evening.forEach(e=>{
let sem = e.value;

let m = document.querySelector(`.morningSem[value="${sem}"]`);

if(e.checked){
m.disabled = true;
}else{
m.disabled = false;
}
});

}

async function loadFromDB() {

  const res = await fetch("/test");
  const data = await res.json();

  let html = `<h3>Saved DateSheet (From MongoDB)</h3>
  <table>
  <tr>
    <th>Subject</th>
    <th>Date</th>
    <th>Time</th>
    <th>Action</th>
  </tr>`;

  data.forEach(item => {
    html += `
      <tr>
        <td>${item.subject}</td>
        <td>${item.date}</td>
        <td>${item.time}</td>
        <td>
          <button onclick="deleteItem('${item._id}')">Delete</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("result").innerHTML = html;
}

async function deleteItem(id) {

  await fetch(`/delete/${id}`, {
    method: "DELETE"
  });

  loadFromDB(); // refresh after delete
}

