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
        console.log('\n\nnew request: ' + u.pathname)
            switch (u.pathname) {
                case '/':
                    res.write('<h1>api server</h1>')
                    res.end()
                    break
                case '/notes':
                    const db = new sql.Database('notes/notes.db', (err) => {
                        if (err) throw err
                        notes.run(req, res, body, db, u.query)
                    })
                    break
            
                default:
                    break
        }
    })
}).listen(8080)


