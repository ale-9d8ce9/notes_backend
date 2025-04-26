var http = require('http')
var url = require('url')
var mysql = require('mysql2')
var dotenv = require('./dotenv').dotenv

http.createServer(function (req, res) {
    var q = url.parse(req.url, true)
    console.log('\n\nnew request: ' + q.pathname)
    switch (q.pathname) {
        case '/':
            res.writeHead(200, {'Content-Type': 'text/html'})
            res.write('<h1>server</h1>')
            res.end()
            break;
        case '/notes':
            var notes = require('./notes/index')
            notes.run(res, dotenv, mysql, q.query, req)
            break;
    
        default:
            break;
    }
}).listen(8080)


