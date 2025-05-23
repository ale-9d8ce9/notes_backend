var http = require('http')
var url = require('url')
var mysql = require('mysql2')
var dotenv = require('./dotenv').dotenv

http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    }).on('end', () => {
        // Set CORS headers to allow requests from any origin
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Content-Type', 'text/plain')
        
        var q = url.parse(req.url, true)
        console.log('\n\nnew request: ' + q.pathname)
            switch (q.pathname) {
                case '/':
                    res.write('<h1>api server</h1>')
                    res.end()
                    break
                case '/notes':
                    var notes = require('./notes/index')
                    notes.run(req, res, body, dotenv, mysql, q.query)
                    break
            
                default:
                    break
        }
    })
}).listen(8080)


