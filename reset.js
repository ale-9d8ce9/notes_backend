var sql = require('sqlite3')
sql.verbose()
var fs = require('fs')

console.log('RESETTING')
console.log('opening database')
const db = new sql.Database('notes/notes.db', (err) => {
    if (err) throw err
    
    db.run("DROP TABLE notes", function(err, result) {
        if (err) throw err
        console.log("database deleted")
        db.close()
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

