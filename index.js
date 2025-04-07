var http = require('http')
var url = require('url')
var mysql = require('mysql2')
var dotenv = require('./dotenv').dotenv

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    var q = url.parse(req.url, true)
    res.end('Hello World\n<hi>')
}).listen(8080)


var con = mysql.createConnection({
    host: "localhost",
    user: dotenv.user,
    password: dotenv.password
})

con.connect(function(err) {
    if (err) {console.log(err);}
    console.log("Connected!");
})