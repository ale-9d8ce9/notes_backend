var http = require('http')
var url = require('url')
var mysql = require('mysql2')

// Load environment variables from ".env" file
var dotenv = require('./dotenv').dotenv

// Load the notes module and its configuration
var notes = require('./notes/backend')

http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    }).on('end', () => {
        
        var u = url.parse(req.url, true)
        console.log('\n\nnew request: ' + u.pathname)
            switch (u.pathname) {
                case '/':
                    res.write('<h1>api server</h1>')
                    res.end()
                    break
                case '/notes':
                    notes.run(req, res, body, dotenv, mysql, u.query)
                    break
            
                default:
                    break
        }
    })
}).listen(8080)


