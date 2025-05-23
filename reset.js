var mysql = require('mysql2')
var dotenv = require('./dotenv').dotenv
var fs = require('fs')

console.log('RESETTING')
console.log('connecting as ' + dotenv.user)
var sql = mysql.createConnection({
    host: 'localhost',
    user: dotenv.user,
    password: dotenv.password,
    database: 'notes'
})
sql.connect(function(err) {
    if (err) throw err
    console.log("connected")

sql.query("DROP TABLE notes", function(err, result) {
    if (err) throw err
    console.log("database deleted")
    sql.end()
    console.log("connection closed")

fs.rm('notes/data', { recursive: true }, (err) => {
    if (err) throw err

fs.mkdir('notes/data', (err) => {
    if (err) throw err
    console.log("user files deleted")

})
})
})
})

