var http = require('http')
var url = require('url')
var mysql = require('mysql2')
var dotenv = require('./dotenv').dotenv

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    var q = url.parse(req.url, true)
    res.write(JSON.stringify(q.query))
    res.write(q.pathname)
    res.end('\nHello World\n<hi>')
}).listen(8080)


var con = mysql.createConnection({
    host: "localhost",
    user: dotenv.user,
    password: dotenv.password,
    database: dotenv.database
})

con.connect(function(err) {
    if (err) throw err
    console.log("Connected!")
});