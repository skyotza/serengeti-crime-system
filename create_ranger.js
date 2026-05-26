const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({

user:'postgres',
host:'localhost',
database:'serengeti_np_criminal_system_db',
password:'control2026_',
port:5432

});

async function createRanger(){

const hashedPassword = await bcrypt.hash('ranger123',10);

await pool.query(

`INSERT INTO users(username,password,role)
VALUES($1,$2,$3)`,

[
'ranger1',
hashedPassword,
'ranger'
]

);

console.log('Ranger created successfully');

process.exit();

}

createRanger();