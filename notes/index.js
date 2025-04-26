// Description: This is the main file for the notes app. It connects to the database and handles the requests.
let sql
let query
let res
let actionResult
let fs
let req

exports.run = function (r, dotenv, mysql, q, request) {
    query = q
    res = r
    fs = require('fs')
    req = request
    
    console.log("query: " + JSON.stringify(query))

    // connect to mysql
    sql = mysql.createConnection({
        host: "localhost",
        user: dotenv.user,
        password: dotenv.password,
        database: 'notes'
    })
    sql.connect(function(err) {
        if (err) throw err
        console.log("Connected!")
    
    // create table
    sql.query("CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, username TEXT, password TEXT, listNotes JSON)", function (err, result) {
        if (err) throw err
        console.log("Table ok")


    console.log("\naction: " + query.action)
    switch (query.action) {
        case 'addUser':
            // add a user
            if (query.username.trim() && query.password.trim()) {
                addUser(query.username.trim(), query.password.trim())
            }
            break;
        case 'addNote':
            // add a note to a user
            if (query.username.trim() && query.password.trim()) {
                addNote(query.username.trim(), query.password.trim(), JSON.parse(query.note.trim()))
            }
            break;
        case 'getListNotes':
            // get all notes of a user
            if (query.username.trim() && query.password.trim()) {
                getListNotes(query.username.trim(), query.password.trim())
            }
            break;
        case 'getNote':
            // get a note
            if (query.username.trim() && query.password.trim()) {
                getNote(query.username.trim(), query.password.trim(), query.noteId)
            }
            break;
        case 'saveNote':
            // save a note
            if (query.username.trim() && query.password.trim()) {
                saveNote(query.username.trim(), query.password.trim(), query.noteId)
            }
            break;
        default:
            console.log("No action specified")
            disconnectSQL()
            break;
    }
    })
    })
}


function disconnectSQL() {
    sql.end(function(err) {
        if (err) throw err
        console.log("Disconnected!")
        writeResponse()
    })
}


function logDatabase(callback) {
    sql.query("SELECT * FROM notes", function (err, result, fields) {
        if (err) throw err
        console.log(result)
        if (callback) {
            callback()
        } else {
            disconnectSQL()
        }
    })
}


function addUser(username, password) {
    let validUser = true

    // check if username and password are too short
    if (username.length < 5 || password.length < 6) {
        //validUser = false
        actionResult = {
            status: "error",
            message: "Username or password too short"
        }
    }
    // check if username and password are too long
    if ((username.length > 20 || password.length > 40) && validUser) {
        validUser = false
        actionResult = {
            status: "error",
            message: "Username or password too long"
        }
    }

    if (validUser == false) {
        console.log("Invalid user")
        // disconnect from database and write web response
        disconnectSQL()
        return
    }
    // add user to database
    sql.query(`SELECT * FROM notes WHERE username = ?`,[username], function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length > 0) {
            console.log("User already exists")
            actionResult = {
                status: "error",
                message: "User already exists"
            }
            // disconnect from database and write web response
            disconnectSQL()

        } else {
            console.log("User does not exist")
            actionResult = {
                status: "error",
                message: "unknown error"
            }
            // add user to database
            console.log("Adding user in the database")
            sql.query(`INSERT INTO notes (username, password, listNotes) VALUES ( ? , ? , ? )`, [username, password, JSON.stringify([])], function (err, result) {
                if (err) throw err

                // creating user folder
                console.log("Creating user folder")
                sql.query(`SELECT * FROM notes WHERE username = ? AND password = ?`,[username, password], function (err, result) {
                    if (err) throw err
                    if (result.length == 1) {
                        fs.mkdir(`./notes/data/${result[0].id}`,{recursive:true}, (err) => {
                            if (err) throw err
                            
                            // user added
                            console.log("User added")
                            actionResult = {
                                status: "success",
                                message: "User added"
                            }
                            // disconnect from database and write web response
                            disconnectSQL()
                        })
                    }
                })
            })
        }
    })
}


function addNote(username, password, note) {
    // get user from database
    sql.query(`SELECT * FROM notes WHERE username = ? AND password = ?`, [username,password], function (err, result) {
        if (err) throw err

        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            console.log("adding note")

            // push note
            let listNotes = result[0].listNotes
            let noteIndex = listNotes.length
            listNotes.push(note)
            sql.query(`UPDATE notes SET listNotes = ? WHERE username = ? AND password = ?`, [JSON.stringify(listNotes), username, password], function (err) {
                if (err) throw err
                console.log("Note added to database")
                // creating note elements file
                date = new Date(note.dateCreated)
                fs.mkdir(`./notes/data/${result[0].id}/${date.getFullYear()}/${date.getMonth()}`,{recursive:true}, (err) => {
                    if (err) throw err
                    fs.writeFile(`./notes/data/${result[0].id}/${date.getFullYear()}/${date.getMonth()}/${noteIndex}.json`, JSON.stringify([]), (err) => {
                        if (err) throw err
                        console.log("Note file created")
                        console.log("Note added")
                        actionResult = {
                            status: "success",
                            message: "Note added"
                        }
                        // disconnect from database and write web response
                        disconnectSQL()
                    })
                })
            })
        } else {
            console.log("User does not exist")
            actionResult = {
                status: "error",
                message: "User does not exist"
            }
            // disconnect from database and write web response
            disconnectSQL()
        }
    })
}


function getListNotes(username, password) {
    // get user from database
    sql.query(`SELECT * FROM notes WHERE username = ? AND password = ?`, [username,password], function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            actionResult = {
                status: "success",
                message: JSON.stringify(result[0].listNotes)
            }
            console.log("note list ok")
            // disconnect from database and write web response
            disconnectSQL()
        } else {
            console.log("User does not exist")
            actionResult = {
                status: "error",
                message: "User does not exist"
            }
            // disconnect from database and write web response
            disconnectSQL()
        }
    })
}


function getNote(username, password, noteId) {
    // get user from database
    sql.query(`SELECT * FROM notes WHERE username = ? AND password = ?`, [username,password], function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            // check if note exists
            console.log("noteId: " + noteId)
            if (result[0].listNotes.length > noteId) {
                note = result[0].listNotes[noteId]
                date = new Date(note.dateCreated)
                console.log(noteId)
                fs.readFile(`./notes/data/${result[0].id}/${date.getFullYear()}/${date.getMonth()}/${noteId}.json`, 'utf8', (err, data) => {
                    if (err) throw err
                    console.log("Note read")
                    actionResult = {
                        status: "success",
                        message: data
                    }
                    // disconnect from database and write web response
                    disconnectSQL()
                })
            } else {
                console.log("Note does not exist")
                actionResult = {
                    status: "error",
                    message: "Note does not exist"
                }
                // disconnect from database and write web response
                disconnectSQL()
            }
        } else {
            console.log("User does not exist")
            actionResult = {
                status: "error",
                message: "User does not exist"
            }
            // disconnect from database and write web response
            disconnectSQL()
        }
    })
}


function saveNote(username, password, noteId, note) {
    // get user from database
    sql.query(`SELECT * FROM notes WHERE username = ? AND password = ?`, [username,password], function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            // check if note exists
            console.log("noteId: " + noteId)
            if (result[0].listNotes.length > noteId) {
                // get data
                let body = []
                req.on('data', (chunk) => {
                    body.push(chunk)
                }).on('end', () => {
                    // got body
                    body = Buffer.concat(body).toString()
                    console.log(body)
                    // create folder if it does not exist
                    console.log("creating folder")
                    note = result[0].listNotes[noteId]
                    date = new Date(note.dateCreated)
                    fs.mkdir(`./notes/data/${result[0].id}/${date.getFullYear()}/${date.getMonth()}`,{recursive:true}, (err) => {
                        if (err) throw err
                        // write file
                        console.log("writing file")
                        fs.writeFile(`./notes/data/${result[0].id}/${date.getFullYear()}/${date.getMonth()}/${noteId}.json`, JSON.stringify(body), (err) => {
                            if (err) throw err
                            actionResult = {
                                status: "success",
                                message: "note saved"
                            }
                            console.log("note saved")
                            disconnectSQL()
                        })
                    })
                })
            } else {
                console.log("Note does not exist")
                actionResult = {
                    status: "error",
                    message: "Note does not exist"
                }
                // disconnect from database and write web response
                disconnectSQL()
            }
        } else {
            console.log("User does not exist")
            actionResult = {
                status: "error",
                message: "User does not exist"
            }
            // disconnect from database and write web response
            disconnectSQL()
        }
    })
}


function writeResponse() {
    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.write(JSON.stringify(actionResult))
    res.end()
}