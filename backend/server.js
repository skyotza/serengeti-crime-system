const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const https = require('https');
const fs = require('fs');

const app = express();

/* =======================================================
   MIDDLEWARE
======================================================= */

app.use(cors());

app.use(express.json({
limit: "50mb"
}));

app.use(express.urlencoded({
extended: true,
limit: "50mb"
}));

app.use(session({
secret: 'serengeti_secret',
resave: false,
saveUninitialized: false,
cookie:{
secure:false,
maxAge:1000*60*60*24
}
}));

/* =======================================================
   DATABASE
======================================================= */

const pool = new Pool({
user:'postgres',
host:'localhost',
database:'serengeti_np_criminal_system_db',
password:'control2026_',
port:5432
});

/* =======================================================
   AUTH
======================================================= */

function auth(req,res,next){

if(req.session.user){
return next();
}

return res.redirect('/');

}

/* =======================================================
   SESSION USER
======================================================= */

app.get('/session-user',(req,res)=>{

if(!req.session.user){

return res.status(401).json({
error:"No session"
});

}

res.json(req.session.user);

});

/* =======================================================
   LOGIN
======================================================= */

app.post('/login', async(req,res)=>{

try{

const { username,password } = req.body;

const r = await pool.query(
"SELECT * FROM users WHERE username=$1",
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

req.session.user = {
id:user.id,
username:user.username,
role:user.role
};

res.redirect('/dashboard');

}catch(err){

console.log("LOGIN ERROR:",err);

res.status(500).send("Login failed");

}

});

/* =======================================================
   LOGOUT
======================================================= */

app.get('/logout',(req,res)=>{

req.session.destroy(err=>{

if(err){

console.log("LOGOUT ERROR:",err);

return res.send("Logout failed");

}

res.clearCookie('connect.sid');

res.redirect('/');

});

});

/* =======================================================
   PAGES
======================================================= */

app.get('/',(req,res)=>{

res.sendFile(
path.join(__dirname,'../frontend/login.html')
);

});

app.get('/dashboard',auth,(req,res)=>{

res.sendFile(
path.join(__dirname,'../frontend/dashboard.html')
);

});

app.get('/crime-form',auth,(req,res)=>{

res.sendFile(
path.join(__dirname,'../frontend/index.html')
);

});

/* =======================================================
   GET CRIMINALS
======================================================= */

app.get('/criminals',auth,async(req,res)=>{

try{

const r = await pool.query(
"SELECT * FROM criminals ORDER BY id DESC"
);

res.json(r.rows);

}catch(err){

console.log("FETCH CRIMINALS ERROR:",err);

res.status(500).json({
error:"Database error"
});

}

});

/* =======================================================
   ADD CRIMINAL
======================================================= */

app.post('/criminals',auth,async(req,res)=>{

try{

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
VALUES(
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
d.coord_lat,
d.coord_lng,
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

}catch(err){

console.log("INSERT ERROR:",err);

res.status(500).json({
error:"Insert failed"
});

}

});

/* =======================================================
   OFFLINE SYNC
======================================================= */

app.post('/sync-criminals',auth,async(req,res)=>{

try{

const crimes = req.body;

if(!Array.isArray(crimes)){

return res.status(400).json({
error:"Invalid sync data"
});

}

for(const d of crimes){

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
VALUES(
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
d.coord_lat,
d.coord_lng,
d.witnesses,
d.case_type,
d.case_number,
d.court_status,
d.sentence,
d.photo
]);

}

res.json({
success:true,
synced:crimes.length
});

}catch(err){

console.log("SYNC ERROR:",err);

res.status(500).json({
error:"Sync failed"
});

}

});

/* =======================================================
   DELETE CRIMINAL
======================================================= */

app.delete('/criminals/:id',auth,async(req,res)=>{

try{

if(req.session.user.role!=="admin"){

return res.status(403).json({
error:"Access denied"
});

}

await pool.query(
"DELETE FROM criminals WHERE id=$1",
[req.params.id]
);

res.json({
success:true
});

}catch(err){

console.log("DELETE ERROR:",err);

res.status(500).json({
error:"Delete failed"
});

}

});

/* =======================================================
   PERMANENT MARKERS
======================================================= */

app.get('/permanent_markers',auth,async(req,res)=>{

try{

const r = await pool.query(
"SELECT * FROM permanent_marks ORDER BY id DESC"
);

res.json(r.rows);

}catch(err){

console.log("MARKERS ERROR:",err);

res.status(500).json({
error:"Database error"
});

}

});

app.post('/permanent_markers',auth,async(req,res)=>{

try{

if(req.session.user.role!=="admin"){

return res.status(403).json({
error:"Admin only"
});

}

let { name,icon,lat,lng } = req.body;

lat=parseFloat(lat);
lng=parseFloat(lng);

if(!name || !icon || isNaN(lat) || isNaN(lng)){

return res.status(400).json({
error:"Invalid data"
});

}

await pool.query(`
INSERT INTO permanent_marks(
name,
icon,
lat,
lng
)
VALUES($1,$2,$3,$4)
`,[
name,
icon,
lat,
lng
]);

res.json({
success:true
});

}catch(err){

console.log("SAVE MARKER ERROR:",err);

res.status(500).json({
error:"Save marker failed"
});

}

});

app.delete('/permanent_markers/:id',auth,async(req,res)=>{

try{

if(req.session.user.role!=="admin"){

return res.status(403).json({
error:"Admin only"
});

}

await pool.query(
"DELETE FROM permanent_marks WHERE id=$1",
[req.params.id]
);

res.json({
success:true
});

}catch(err){

console.log("DELETE MARKER ERROR:",err);

res.status(500).json({
error:"Delete failed"
});

}

});

/* =======================================================
   CREATE USER
======================================================= */

app.post('/create-user',auth,async(req,res)=>{

try{

if(req.session.user.role!=="admin"){

return res.status(403).json({
error:"Admin only"
});

}

const {
username,
password,
role
} = req.body;

if(!username || !password){

return res.status(400).json({
error:"Missing fields"
});

}

const exists = await pool.query(
"SELECT * FROM users WHERE username=$1",
[username]
);

if(exists.rows.length>0){

return res.status(400).json({
error:"Username exists"
});

}

const hashed = await bcrypt.hash(password,10);

await pool.query(`
INSERT INTO users(
username,
password,
role
)
VALUES($1,$2,$3)
`,[
username,
hashed,
role || "user"
]);

res.json({
success:true
});

}catch(err){

console.log("CREATE USER ERROR:",err);

res.status(500).json({
error:"Create user failed"
});

}

});

/* =======================================================
   CHANGE PASSWORD
======================================================= */

app.post('/change-password',auth,async(req,res)=>{

try{

const {
oldPassword,
newPassword
} = req.body;

const r = await pool.query(
"SELECT * FROM users WHERE id=$1",
[req.session.user.id]
);

if(r.rows.length===0){

return res.status(404).json({
error:"User not found"
});

}

const user = r.rows[0];

const ok = await bcrypt.compare(
oldPassword,
user.password
);

if(!ok){

return res.status(400).json({
error:"Wrong old password"
});

}

const hashed = await bcrypt.hash(newPassword,10);

await pool.query(
"UPDATE users SET password=$1 WHERE id=$2",
[hashed,user.id]
);

res.json({
success:true
});

}catch(err){

console.log("CHANGE PASSWORD ERROR:",err);

res.status(500).json({
error:"Password change failed"
});

}

});

/* =======================================================
   GEOFENCE
======================================================= */

app.get('/serengeti_boundary.geojson',(req,res)=>{

const filePath = path.join(
__dirname,
'../frontend/serengeti_boundary.geojson'
);

res.setHeader(
'Content-Type',
'application/geo+json'
);

res.sendFile(filePath,(err)=>{

if(err){

console.log("GEOFENCE ERROR:",err);

res.status(500).json({
error:"GeoJSON file missing"
});

}

});

});

/* =======================================================
   STATIC FRONTEND FILES
======================================================= */

app.use(express.static(
path.join(__dirname,'../frontend')
));

/* =======================================================
   HTTPS / DEPLOYMENT SAFE SERVER
======================================================= */

const PORT = process.env.PORT || 3000;

const keyPath = path.join(__dirname,'../key.pem');

const certPath = path.join(__dirname,'../cert.pem');

const hasSSL =
fs.existsSync(keyPath) &&
fs.existsSync(certPath);

if(hasSSL){

/* ================= LOCAL HTTPS ================= */

const sslOptions = {

key: fs.readFileSync(keyPath),

cert: fs.readFileSync(certPath)

};

https.createServer(
sslOptions,
app
).listen(PORT,'0.0.0.0',()=>{

console.log("================================");
console.log("SERENGETI HTTPS SERVER RUNNING");
console.log(`https://localhost:${PORT}`);
console.log("GPS + CAMERA ENABLED");
console.log("Offline Sync Enabled");
console.log("================================");

});

}else{

/* ================= DEPLOYMENT HTTP ================= */

app.listen(PORT,'0.0.0.0',()=>{

console.log("================================");
console.log("SERENGETI SERVER RUNNING");
console.log(`PORT: ${PORT}`);
console.log("DEPLOYMENT MODE ENABLED");
console.log("================================");

});

}