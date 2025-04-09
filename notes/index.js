const { get } = require('http')
const { version } = require('os')

// Description: This is the main file for the notes app. It connects to the database and handles the requests.
let sql
let query
let res
let actionResult
let fs

exports.run = function (r, dotenv, mysql, q) {
    query = q
    res = r
    fs = require('fs')
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
    
    // create a database
    sql.query("CREATE DATABASE IF NOT EXISTS notes", function (err, result) {
        if (err) throw err
        console.log("Database ok")

    // select database
    sql.query("USE notes", function (err, result) {
        if (err) throw err
        console.log("Database selected")

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
                addNote(query.username.trim(), query.password.trim(), JSON.parse(atob(query.note.trim())))
            }
            break;
        case 'getListNotes':
            // get all notes of a user
            if (query.username.trim() && query.password.trim()) {
                getListNotes(query.username.trim(), query.password.trim())
            }
            break;
        case 'add':
            // add a note
            break;
        case 'delete':
            // delete a note
            break;
        case 'update':
            // update a note
            break;
        case 'get':
            // get all notes
            break;
        default:
            console.log("No action specified")
            disconnectSQL()
            break;
    }
    })
    })
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
    let validUser = false

    // check if username and password are not empty
    if (username === "" || password === "") {
        console.log("Username or password cannot be empty")
        validUser = false
    } else {
        validUser = true
    }
    // check if username and password are not too long
    if ((username.length > 20 || password.length > 20) && validUser) {
        console.log("Username and password cannot be longer than 20 characters")
        validUser = false
    }

    // add user to database
    sql.query(`SELECT * FROM notes WHERE username='${username}'`, function (err, result) {
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
            notes = []
            sql.query(`INSERT INTO notes (username, password, listNotes) VALUES ('${username}', '${password}', '${JSON.stringify(notes)}')`, function (err, result) {
                if (err) throw err

                // creating user folder
                console.log("Creating user folder")
                sql.query(`SELECT * FROM notes WHERE username='${username}' AND password='${password}'`, function (err, result) {
                    if (err) throw err
                    if (result.length == 1) {
                        fs.mkdir(`./notes/data/${btoa(result[0].id)}`, { recursive: true }, (err) => {
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
    sql.query(`SELECT * FROM notes WHERE username='${username}' AND password='${password}'`, function (err, result) {
        if (err) throw err

        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            console.log("adding note")

            // check if note already exists
            let listNotes = result[0].listNotes
            noteAlreadyExists = false
            for (let i = 0; i < listNotes.length; i++) {
                if (listNotes[i].name === note.name) {
                    noteAlreadyExists = true
                }
            }
            if (!noteAlreadyExists) {
                // push note
                listNotes.push({name:note.name, dateCreated: note.dateCreated, dateModified: note.dateModified, version: note.version})
                sql.query(`UPDATE notes SET listNotes='${JSON.stringify(listNotes)}' WHERE username='${username}' AND password='${password}'`, function (err) {
                    if (err) throw err
                    // creating note elements file
                    fs.writeFile(`./notes/data/${btoa(result[0].id)}/${btoa(note.name)}.json`, JSON.stringify(note.elements), (err) => {
                        if (err) throw err
                        console.log("Note added")
                        actionResult = {
                            status: "success",
                            message: "Note added"
                        }
                        // disconnect from database and write web response
                        disconnectSQL()
                    })
                })
            } else {
                console.log("Note already exist")
                actionResult = {
                    status: "error",
                    message: "Note already exists"
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


function getListNotes(username, password) {
    // get user from database
    sql.query(`SELECT * FROM notes WHERE username='${username}' AND password='${password}'`, function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            actionResult = {
                status: "success",
                message: btoa(JSON.stringify(result[0].listNotes))
            }
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


function writeResponse() {
    res.writeHead(200, {'Content-Type': 'text/json', 'Access-Control-Allow-Origin': '*'})
    res.write(JSON.stringify(actionResult))
    res.end()
}