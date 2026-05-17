const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
extended:true
}));

app.use(session({

secret:'serengeti_secret',

resave:false,

saveUninitialized:false

}));

/* ================= DATABASE ================= */

const pool = new Pool({

user:'postgres',

host:'localhost',

database:'serengeti_np_criminal_system_db',

password:'control2026_',

port:5432

});

/* ================= AI RISK SCORING ================= */

function calculateRiskScore(crime){

let score = 0;

/* SEVERITY */

const severity = {

"Poaching (Commercial)":100,
"Wildlife Trafficking":95,
"Illegal Mining":85,
"Arson":80,
"Poaching (Subsistence)":70,
"Illegal Logging":60,
"Human-Wildlife Conflict":50,
"Illegal Grazing":40,
"Illegal Fishing":35,
"Encroachment":30,
"Other Wildlife Offence":20

};

score += severity[crime.case_type] || 10;

/* RECENCY */

let daysAgo =
(crime.date_of_arrest)

? (new Date() - new Date(crime.date_of_arrest))
/ (1000*60*60*24)

: 999;

if(daysAgo < 7) score += 30;
else if(daysAgo < 30) score += 20;
else if(daysAgo < 90) score += 10;

/* HOTSPOT BOOST */

if(crime.repeat_count){

score += crime.repeat_count * 5;

}

/* LIMIT */

if(score > 100){

score = 100;

}

return Math.round(score);

}

/* ================= AUTH ================= */

function auth(req,res,next){

if(req.session.user){

next();

}else{

res.redirect('/');

}

}

/* ================= LOGIN PAGE ================= */

app.get('/', (req,res)=>{

res.sendFile(
path.join(__dirname,'../frontend/login.html')
);

});

/* ================= LOGIN ================= */

app.post('/login', async (req,res)=>{

const {username,password} = req.body;

const r = await pool.query(

'SELECT * FROM users WHERE username=$1',

[username]

);

if(r.rows.length===0){

return res.send("User not found");

}

const user = r.rows[0];

const ok = await bcrypt.compare(
password,
user.password
);

if(!ok){

return res.send("Wrong password");

}

req.session.user = user;

/* OPEN DASHBOARD */

res.redirect('/dashboard');

});

/* ================= DASHBOARD ================= */

app.get('/dashboard', auth, (req,res)=>{

res.sendFile(
path.join(__dirname,'../frontend/dashboard.html')
);

});

/* ================= CRIME FORM ================= */
/* YOUR FORM IS index.html */

app.get('/crime-form', auth, (req,res)=>{

res.sendFile(
path.join(__dirname,'../frontend/index.html')
);

});

/* ================= GET CRIMINALS ================= */

app.get('/criminals', async (req,res)=>{

const r = await pool.query(
'SELECT * FROM criminals ORDER BY id DESC'
);

/* ADD AI SCORE */

const enriched = r.rows.map(c => ({

...c,

risk_score: calculateRiskScore(c)

}));

res.json(enriched);

});

/* ================= INSERT INCIDENT ================= */

app.post('/criminals', async (req,res)=>{

const d = req.body;

await pool.query(`

INSERT INTO criminals(

full_name,
also_known_as,
tribe,
age,
gender,
marital_status,
village,
ward,
district,
region,
weapons_used,
area_of_arrest,
coord_lat,
coord_lng,
witnesses,
case_type,
case_number,
court_status,
sentence,
photo

)

VALUES (

$1,$2,$3,$4,$5,
$6,$7,$8,$9,$10,
$11,$12,$13,$14,$15,
$16,$17,$18,$19,$20

)

`,[

d.full_name,
d.also_known_as,
d.tribe,
d.age,
d.gender,
d.marital_status,
d.village,
d.ward,
d.district,
d.region,
d.weapons_used,
d.area_of_arrest,
Number(d.coord_lat),
Number(d.coord_lng),
d.witnesses,
d.case_type,
d.case_number,
d.court_status,
d.sentence,
d.photo

]);

res.json({
success:true
});

});

/* ================= DELETE INCIDENT ================= */

app.delete('/criminals/:id', async (req,res)=>{

await pool.query(

'DELETE FROM criminals WHERE id=$1',

[req.params.id]

);

res.json({
success:true
});

});

/* ================= GEOFENCE ================= */

app.get('/serengeti_boundary.geojson',(req,res)=>{

res.sendFile(

path.join(
__dirname,
'../frontend/serengeti_boundary.geojson'
)

);

});

/* ================= LOGOUT ================= */

app.get('/logout',(req,res)=>{

req.session.destroy(()=>{

res.redirect('/');

});

});

/* ================= START SERVER ================= */

app.listen(3000,()=>{

console.log(
'Server running at http://localhost:3000'
);

});