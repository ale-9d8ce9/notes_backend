var http = require('http')
var url = require('url')
var sql = require('sqlite3')
sql.verbose()
var notes = require('./notes/backend')

http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    }).on('end', () => {
        
        var u = url.parse(req.url, true)
        console.log('\n\n' + new Date().toISOString() + ' - new request: ' + u.pathname)
        console.log('from ' + req.socket.remoteAddress) // client IP address
            switch (u.pathname) {
                case '/':
                    res.write('<h1>api server</h1>')
                    res.end()
                    break
                case '/notes':
                    try {
                        const db = new sql.Database('notes/notes.db', (err) => {
                            if (err) throw err
                            try {
                                notes.run(req, res, body, db, u.query)
                            } catch (e) {
                                console.error(e)
                                res.writeHead(500)
                                res.end('Internal Server Error')
                            }
                        })
                    } catch (e) {
                        console.error(e)
                        res.writeHead(500)
                        res.end('Internal Server Error')
                    }
                    break
            
                default:
                    res.writeHead(404)
                    res.end('Not Found')
                    break
        }
    })
}).listen(8080)
