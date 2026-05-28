const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

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
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

/* =======================================================
   DATABASE
======================================================= */

const DATABASE_URL = process.env.DATABASE_URL;

const pool = DATABASE_URL

  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'serengeti_np_criminal_system_db',
      password: 'control2026_',
      port: 5432
    });

console.log(
  DATABASE_URL
    ? "CONNECTED TO RENDER POSTGRESQL"
    : "CONNECTED TO LOCAL POSTGRESQL"
);

/* =======================================================
   AUTH
======================================================= */

function auth(req, res, next) {

  if (req.session.user) {
    return next();
  }

  return res.redirect('/login');

}

/* =======================================================
   LOGIN PAGE ROUTE
======================================================= */

app.get('/login', (req, res) => {

  res.sendFile(
    path.join(__dirname, '../frontend/login.html')
  );

});

/* =======================================================
   HOME REDIRECT
======================================================= */

app.get('/', (req, res) => {

  res.redirect('/login');

});

/* =======================================================
   SESSION USER
======================================================= */

app.get('/session-user', (req, res) => {

  if (!req.session.user) {

    return res.status(401).json({
      error: "No session"
    });

  }

  res.json(req.session.user);

});

/* =======================================================
   LOGIN
======================================================= */

app.post('/login', async (req, res) => {

  try {

    const { username, password } = req.body;

    const r = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    if (r.rows.length === 0) {

      return res.send("User not found");

    }

    const user = r.rows[0];

    const ok = await bcrypt.compare(
      password,
      user.password
    );

    if (!ok) {

      return res.send("Wrong password");

    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.redirect('/dashboard');

  } catch (err) {

    console.log("LOGIN ERROR:", err);

    res.status(500).send("Login failed");

  }

});

/* =======================================================
   LOGOUT
======================================================= */

app.get('/logout', (req, res) => {

  req.session.destroy(err => {

    if (err) {

      console.log("LOGOUT ERROR:", err);

      return res.send("Logout failed");

    }

    res.clearCookie('connect.sid');

    res.redirect('/login');

  });

});

/* =======================================================
   PAGES
======================================================= */

app.get('/dashboard', auth, (req, res) => {

  res.sendFile(
    path.join(__dirname, '../frontend/dashboard.html')
  );

});

app.get('/crime-form', auth, (req, res) => {

  res.sendFile(
    path.join(__dirname, '../frontend/index.html')
  );

});

/* =======================================================
   GET CRIMINALS
======================================================= */

app.get('/criminals', auth, async (req, res) => {

  try {

    const r = await pool.query(
      "SELECT * FROM criminals ORDER BY id DESC"
    );

    res.json(r.rows);

  } catch (err) {

    console.log("FETCH CRIMINALS ERROR:", err);

    res.status(500).json({
      error: "Database error"
    });

  }

});

/* =======================================================
   ADD CRIMINAL
======================================================= */

app.post('/criminals', auth, async (req, res) => {

  try {

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
        photo,
        nin
      )
      VALUES(
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21
      )
    `, [
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
      d.photo,
      d.nin
    ]);

    res.json({
      success: true
    });

  } catch (err) {

    console.log("INSERT ERROR:", err);

    res.status(500).json({
      error: "Insert failed"
    });

  }

});

/* =======================================================
   EDIT CRIMINAL
======================================================= */

app.put('/criminals/:id', auth, async (req, res) => {

  try {

    if (req.session.user.role !== "admin") {

      return res.status(403).json({
        error: "Admin only"
      });

    }

    const d = req.body;

    await pool.query(`
      UPDATE criminals SET
      full_name=$1,
      case_type=$2,
      village=$3,
      region=$4,
      court_status=$5,
      case_number=$6,
      coord_lat=$7,
      coord_lng=$8,
      nin=$9
      WHERE id=$10
    `, [
      d.full_name,
      d.case_type,
      d.village,
      d.region,
      d.court_status,
      d.case_number,
      d.coord_lat,
      d.coord_lng,
      d.nin,
      req.params.id
    ]);

    res.json({
      success: true
    });

  } catch (err) {

    console.log("EDIT ERROR:", err);

    res.status(500).json({
      error: "Edit failed"
    });

  }

});

/* =======================================================
   DELETE CRIMINAL
======================================================= */

app.delete('/criminals/:id', auth, async (req, res) => {

  try {

    if (req.session.user.role !== "admin") {

      return res.status(403).json({
        error: "Access denied"
      });

    }

    await pool.query(
      "DELETE FROM criminals WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.log("DELETE ERROR:", err);

    res.status(500).json({
      error: "Delete failed"
    });

  }

});

/* =======================================================
   PERMANENT MARKERS
======================================================= */

app.get('/permanent_markers', auth, async (req, res) => {

  try {

    const r = await pool.query(
      "SELECT * FROM permanent_marks ORDER BY id DESC"
    );

    res.json(r.rows);

  } catch (err) {

    console.log("MARKERS ERROR:", err);

    res.status(500).json({
      error: "Database error"
    });

  }

});

app.post('/permanent_markers', auth, async (req, res) => {

  try {

    if (req.session.user.role !== "admin") {

      return res.status(403).json({
        error: "Admin only"
      });

    }

    let { name, icon, lat, lng } = req.body;

    lat = parseFloat(lat);
    lng = parseFloat(lng);

    await pool.query(`
      INSERT INTO permanent_marks(
        name,
        icon,
        lat,
        lng
      )
      VALUES($1,$2,$3,$4)
    `, [
      name,
      icon,
      lat,
      lng
    ]);

    res.json({
      success: true
    });

  } catch (err) {

    console.log("SAVE MARKER ERROR:", err);

    res.status(500).json({
      error: "Save marker failed"
    });

  }

});

app.delete('/permanent_markers/:id', auth, async (req, res) => {

  try {

    if (req.session.user.role !== "admin") {

      return res.status(403).json({
        error: "Admin only"
      });

    }

    await pool.query(
      "DELETE FROM permanent_marks WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.log("DELETE MARKER ERROR:", err);

    res.status(500).json({
      error: "Delete failed"
    });

  }

});

/* =======================================================
   GEOJSON
======================================================= */

app.get('/serengeti_boundary.geojson', (req, res) => {

  const filePath = path.join(
    __dirname,
    '../frontend/serengeti_boundary.geojson'
  );

  res.setHeader(
    'Content-Type',
    'application/geo+json'
  );

  res.sendFile(filePath);

});

/* =======================================================
   STATIC FILES
======================================================= */

app.use(express.static(
  path.join(__dirname, '../frontend')
));

/* =======================================================
   HEALTH CHECK
======================================================= */

app.get('/health', (req, res) => {

  res.json({
    status: "OK",
    server: "Serengeti Crime System"
  });

});

/* =======================================================
   404 FIX
======================================================= */

app.use((req, res) => {

  res.redirect('/login');

});

/* =======================================================
   SERVER
======================================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {

  console.log("================================");
  console.log("SERENGETI SERVER RUNNING");
  console.log(`PORT: ${PORT}`);
  console.log("DEPLOYMENT MODE ENABLED");
  console.log("================================");

});