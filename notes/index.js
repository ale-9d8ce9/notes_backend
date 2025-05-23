
let sql
let query
let res
let responseMessage
let fs
let req
let body

exports.run = function (request, r, b, dotenv, mysql, q) {
    req = request
    res = r
    body = JSON.parse(b)
    dotenv = dotenv
    mysql = mysql
    query = q
    fs = require('fs')
    
    console.log("query: " + JSON.stringify(query))

    sql = mysql.createConnection({
        host: "localhost",
        user: dotenv.user,
        password: dotenv.password,
        database: 'notes'
    })
    sql.connect(function(err) {
        if (err) throw err
        console.log("connected!")
    
    sql.query("CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, username TEXT, password TEXT)", function (err, result) {
        if (err) throw err
        console.log("Table ok")

    body.username = body.username.trim()
    body.password = body.password.trim()

    console.log("\naction: " + query.action)
    switch (query.action) {
        case 'addUser':
            if (body.username && body.password) {
                addUser(body.username, body.password)
            }
            break
        case 'addNote':
            if (body.username && body.password) {
                addNote(body.username, body.password, JSON.parse(body.note))
            }
            break
        case 'getListNotes':
            if (body.username && body.password) {
                getListNotes(body.username, body.password)
            }
            break
        case 'getNote':
            if (body.username && body.password) {
                getNote(body.username, body.password, body.noteId)
            }
            break
        case 'saveNote':
            if (body.username && body.password) {
                saveNote(body.username, body.password, body.noteId, JSON.parse(body.note))
            }
            break
        default:
            console.log("No action specified")
            disconnectSQL()
            break
    }
    })
    })
}



function addUser(username, password) {
    let validUser = true
    // check if username and password are valid
    if (username.length < 5 || password.length < 6) {
        //validUser = false
        responseMessage = {
            result: "error",
            message: "Username or password too short"
        }
    }
    if ((username.length > 20 || password.length > 40) && validUser) {
        validUser = false
        responseMessage = {
            result: "error",
            message: "Username or password too long"
        }
    }
    if (!validUser) {
        console.log("Invalid user")
        // disconnect from database and write web response
        disconnectSQL()
        return
    }
    // start adding user to database
    sql.query(`SELECT * FROM notes WHERE username = ?`,[username], function (err, result) {
        if (err) throw err
        if (result.length > 0) {
            // if user already exists
            console.log("user already exists")
            responseMessage = {
                result: "error",
                message: "user already exists"
            }
            // disconnect from database and write web response
            disconnectSQL()
        } else {
            // if user does not exist
            console.log("user doesn't exist")
            responseMessage = {
                result: "error",
                message: "unknown error"
            }

            console.log("adding user in the database")
            sql.query(`INSERT INTO notes (username, password) VALUES ( ? , ? )`, [username, password], function (err, result) {
                if (err) throw err
                console.log("user added to database")

                console.log("creating user folder")
                findUser(username, password, function (user) {
                    fs.mkdir(`./notes/data/${user.id}`,{recursive:true}, (err) => {
                        if (err) throw err
                        console.log("user folder created")

                        console.log("creating user file")
                        fs.writeFile(`./notes/data/${user.id}/user.json`, JSON.stringify({listNotes: []}), (err) => {
                            if (err) throw err
                            console.log("user file created")

                            console.log("user added")
                            responseMessage = {
                                result: "success",
                                message: "User added"
                            }
                            // disconnect from database and write web response
                            disconnectSQL()
                        })
                    })
                })
            })
        }
    })
}


function addNote(username, password, noteHead) {
    findUser(username, password, function (user) {
        fs.readFile(`./notes/data/${user.id}/user.json`, 'utf8', (err, data) => {
            if (err) throw err
            console.log("Note read")
            data = JSON.parse(data)

            // delete unnecessary values
            delete noteHead.elements
            delete noteHead.files
            delete noteHead.editable
            // path should look like this: YYYY/MM/DD/hh_mm_ss_xxx
            noteHead.path = [
                noteHead.dateCreated.split("T")[0].split("-").join("/"),
                noteHead.dateCreated.split("T")[1].replace('.',':').split(":").join("_")
            ].join("/").replace("Z", "")

            data.listNotes.push(noteHead)
            fs.writeFile(`./notes/data/${user.id}/user.json`, JSON.stringify(data), (err) => {
                if (err) throw err

                console.log("creating note folder")
                fs.mkdir(`./notes/data/${user.id}/${noteHead.path}`,{recursive:true}, (err) => {
                    if (err) throw err
                    console.log("note folder created")
                    responseMessage = {
                        result: "success",
                        message: "note added"
                    }
                    console.log("note added")
                    disconnectSQL()
                })
            })
        })
    })
}


function getListNotes(username, password) {
    findUser(username, password, function (user) {
        fs.readFile(`./notes/data/${user.id}/user.json`, 'utf8', (err, data) => {
            if (err) throw err

            console.log("user file read")
            data = JSON.parse(data)
            responseMessage = {
                result: "success",
                message: data.listNotes
            }
            // disconnect from database and write web response
            disconnectSQL()
        })
    })
}


function getNote(username, password, noteId) {
    findUser(username, password, function (user) {
        fs.readFile(`./notes/data/${user.id}/user.json`, 'utf8', (err, data) => {
            if (err) throw err
            console.log("user file read")
            data = JSON.parse(data)
            // check if note exists
            if (data.listNotes.length > noteId) {
                // get note
                let note = data.listNotes[noteId]
                responseMessage = {
                    result: "success",
                    message: note
                }
            } else {
                console.log("Note does not exist")
                responseMessage = {
                    result: "error",
                    message: "Note does not exist"
                }
            }
            // disconnect from database and write web response
            disconnectSQL()
        })
    })
}


function saveNote(username, password, noteId, note) {
    findUser(username, password, function (user) {
        // get note path
        getNoteHead(user, noteId, function (noteHead) {
            path = `./notes/data/${user.id}/${noteHead.path}`
            console.log("note path: " + path)

            // update note text elements and index
            fs.writeFile(`${path}/elements.json`, JSON.stringify(note.elements), (err) => {
                if (err) throw err
                console.log("note basic data updated")
            
            // update note files
            for (let i = 0; i < note.files.length; i++) {
                let file = note.files[i]
                if (file != null) {
                    fs.writeFile(`${path}/file_${i}.json`, file.data, (err) => {
                        if (err) throw err
                        console.log(`note file ${i} updated`)
                    })
                }
            }

            // update note head
            noteHead.dateModified = note.dateModified
            noteHead.name = note.name
            updateNoteHead(user, noteId, noteHead, function () {
                responseMessage = {
                    result: "success",
                    message: "note updated"
                }
                // disconnect from database and write web response
                disconnectSQL()
            })

            })
        })
    })
}




function findUser(username, password, callback) {
    sql.query(`SELECT * FROM notes WHERE username = ? AND password = ?`, [username, password], function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            callback(result[0])
        } else {
            // if user does not exist
            console.log("User does not exist")
            responseMessage = {
                result: "error",
                message: "User does not exist"
            }
            disconnectSQL()
            return null
        }
    })
}


function getNoteHead(user, noteId, callback) {
    fs.readFile(`./notes/data/${user.id}/user.json`, 'utf8', (err, data) => {
        if (err) throw err
        console.log("user file read")

        data = JSON.parse(data)
        if (data.listNotes.length > noteId) {
            callback(data.listNotes[noteId])
        } else {
            console.log("Note does not exist")
            responseMessage = {
                result: "error",
                message: "Note does not exist"
            }
            // disconnect from database and write web response
            disconnectSQL()
        }
    })
}


function updateNoteHead(user, noteId, noteHead, callback) {
    fs.readFile(`./notes/data/${user.id}/user.json`, 'utf8', (err, data) => {
        if (err) throw err
        console.log("user file read")

        data = JSON.parse(data)
        // check if note exists
        if (data.listNotes.length > noteId) {

            // overwrite note head
            data.listNotes[noteId] = noteHead
            fs.writeFile(`./notes/data/${user.id}/user.json`, JSON.stringify(data), (err) => {
                if (err) throw err

                console.log("note head updated")
                responseMessage = {
                    result: "operation",
                    message: "note head updated"
                }
                callback()
            })
        } else {
            console.log("Note does not exist")
            responseMessage = {
                result: "error",
                message: "Note does not exist"
            }
            // disconnect from database and write web response
            disconnectSQL()
        }
    })
    
}


function disconnectSQL() {
    sql.end(function(err) {
        if (err) throw err
        console.log("disconnected")
        writeResponse()
    })
}


function logDatabase(callback) {
    sql.query("SELECT * FROM notes", function (err, result, fields) {
        if (err) throw err
        console.log(result)
        callback ? callback() : writeResponse()
    })
}


function writeResponse() {
    console.log(responseMessage)
    res.write(JSON.stringify(responseMessage))
    res.end()
    console.log("request done")
}


function decrypt(i) {
    return atob(i)
}

function encrypt(i) {
    return btoa(i)
}


