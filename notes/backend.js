
exports.run = function (request, response, b, dotenv, mysql, q, set) {
    req = request
    res = response
    body = JSON.parse(b)
    dotenv = dotenv
    mysql = mysql
    query = q
    fs = require('fs')
    settings = JSON.parse(fs.readFileSync('./notes/config.json', 'utf8'))

    responseMessage = {
        result: "error",
        message: "Unknown error"
    }

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
    
    sql.query("CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, username TEXT, password TEXT, isAdmin BOOLEAN)", function (err, result) {
        if (err) throw err
        console.log("Table ok")

    body.username ? body.username = body.username.trim() : undefined
    body.password ? body.password = body.password.trim() : undefined

    console.log("\naction: " + query.action)
    switch (query.action) {
        case 'addUser':
            if (body.username && body.password) {
                addUserChecks(body.username, body.password)
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
        case 'getFullNote':
            if (body.username && body.password) {
                getFullNote(body.username, body.password, body.noteId)
            }
            break
        case 'saveNote':
            if (body.username && body.password) {
                saveNote(body.username, body.password, body.noteId, JSON.parse(body.note))
            }
            break
        case 'ping':
            console.log("ping")
            responseMessage = {
                result: "success",
                message: "pong"
            }
            disconnectSQL()
            break
        default:
            console.log("No action specified")
            disconnectSQL()
            break
    }
    })
    })
}


function addUserChecks(username, password) {
    console.log("adding user: " + username)
    // checks
    if (settings.allowUserCreation) {
        if (!username || !password) {
            responseMessage = {
                result: "error",
                message: "username or password not specified"
            }
            console.log("username or password not specified")
            // disconnect from database and write web response
            disconnectSQL()

        } else {
            sql.query('SELECT * FROM notes', [], function (err, result) {
                if (err) throw err

                if (result.length < settings.maxUsers) {
                    delete result
                    // if the number of users is less than or equal to the maximum number of users
                    let validUser = true
                    // check if username and password are valid
                    if (username.length < 5 || password.length < 6) {
                        //validUser = false
                        responseMessage = {
                            result: "error",
                            message: "username or password too short"
                        }
                    }
                    if ((username.length > 20 || password.length > 40) && validUser) {
                        validUser = false
                        responseMessage = {
                            result: "error",
                            message: "username or password too long"
                        }
                    }
                    if (!validUser) {
                        console.log("invalid user")
                        // disconnect from database and write web response
                        disconnectSQL()
                    } else {
                        console.log("can add user")
                        addUserToDatabase(username, password)
                    }
                } else {
                    // if the number of users is equal to the maximum number of users
                    console.log("too many users")
                    responseMessage = {
                        result: "error",
                        message: "max number of users reached for this server"
                    }
                    // disconnect from database and write web response
                    disconnectSQL()
                }
            })
        }
    } else {
        console.log("user creation is not allowed")
        responseMessage = {
            result: "error",
            message: "user creation is not allowed"
        }
        // disconnect from database and write web response
        disconnectSQL()
    }
}



function addUserToDatabase(username, password) {
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
            sql.query(`INSERT INTO notes (username, password, isAdmin) VALUES ( ? , ? , ? )`, [username, password, settings.createUsersAsAdmin], function (err, result) {
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


function getFullNote(username, password, noteId) {
    findUser(username, password, function (user) {
        getNoteHead(user, noteId, function (noteHead) {
            path = `./notes/data/${user.id}/${noteHead.path}`
            console.log("note path: " + path)

            // read note text elements and index
            fs.readFile(`${path}/elements.json`, 'utf8', (err, data) => {
                if (err) throw err
                console.log("note elements read")
                noteHead.elements = JSON.parse(data)

                // read note files
                noteHead.files = []
                for (let i = 0; i < noteHead.elements.length; i++) {
                    let filePath = `${path}/res${i}.bin`
                    if (fs.existsSync(filePath)) {
                        let fileData = fs.readFileSync(filePath)
                        noteHead.files.push({
                            data: fileData.toString('base64'),
                        })
                    } else {
                        noteHead.files.push(null)
                    }
                }

                responseMessage = {
                    result: "success",
                    message: noteHead
                }
                // disconnect from database and write web response
                disconnectSQL()
            })
        })
    })
}


function saveNote(username, password, noteId, note) {
    findUser(username, password, function (user) {
        // get note path
        getNoteHead(user, noteId, function (noteHead) {
            path = `./notes/data/${user.id}/${noteHead.path}`
            console.log("note path: " + path)

            // for all files
            for (let i = 0; i < note.files.length; i++) {
                let noteFile = note.files[i]
                // if file exists and is not deleted
                if (noteFile != null && noteFile.deleted == false) {
                    console.log(`note file ${i} exists`)
                    // decode file
                    file = decodeFile(noteFile.data)
                    file.name = `res${i}.bin`
                    //save file
                    fs.writeFile(`${path}/${file.name}`, file.data, (err) => {
                        if (err) throw err
                        console.log(`note file ${file.name} updated`)
                    })
                    delete noteFile.data
                }
            }

            // check for deleted files
            let filesToDelete = []
            for (let i = 0; i < note.files.length; i++) {
                if (note.files[i] != null && note.files[i].deleted) {
                    filesToDelete.push(i)
                }
            }
            // if there are files to delete
            if (filesToDelete.length > 0) {
                console.log("deleting files: " + filesToDelete)
                // delete files
                for (let i = filesToDelete.length - 1; i >= 0; i--) {
                    const j = filesToDelete[i]
                    note.elements.splice(j, 1)
                    fs.unlinkSync(`${path}/res${j}.bin`)
                }
                // get how many files were deleted before each file
                let fileNameChange = []
                for (let i = 0; i < note.files.length; i++) {
                    fileNameChange[i] = 0
                    for (let j = 0; j < filesToDelete.length; j++) {
                        if (filesToDelete[j] <= i) {
                            fileNameChange[i]++
                        }
                    }
                }
                // rename res files
                j = 0
                for (let i = filesToDelete[0]; i < note.files.length; i++) {
                    // if file is deleted, skip it
                    if (i == filesToDelete[j]) {
                        j++
                    } else {
                        let oldName = `${path}/res${i}.bin`
                        let newName = `${path}/res${i - fileNameChange[i]}.bin`
                        try {
                            fs.renameSync(oldName, newName)
                            console.log(`note file ${oldName} renamed to ${newName}`)
                        } catch (error) {
                            console.error(`Error renaming file ${oldName} to ${newName}:\n`, error);
                        }
                    }
                }
            } else console.log("no files to delete")
            delete filesToDelete

            // update note text elements and index
            fs.writeFile(`${path}/elements.json`, JSON.stringify(note.elements), (err) => {
                if (err) throw err
                console.log("note elements.json updated")
            
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


function logDatabase(callback) {
    sql.query("SELECT * FROM notes", function (err, result, fields) {
        if (err) throw err
        console.log(result)
        callback ? callback() : writeResponse()
    })
}



function decrypt(i) {
    return atob(i)
}

function encrypt(i) {
    return btoa(i)
}


function decodeFile(base64) {
    let fileName = base64.split(',')[0].split(':')[1].split(';')[0]
    let type = fileName.split('/')[0]
    let extension = fileName.split('/')[1]
    let base64data = base64.split(',')[1]
    const fileData = Buffer.from(base64data, 'base64')
    return {data:fileData, type:type, extension:extension}
}





function writeResponse(refuse) {
    // Set CORS headers to allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'text/plain')

    if (refuse) {
        res.writeHead(400)
        responseMessage = {
            result: "error",
            message: "Bad Request"
        }
        res.write(JSON.stringify(responseMessage))
        console.log("refusing request")
    } else {
        res.writeHead(200)
        res.write(JSON.stringify(responseMessage))
    }
    res.end()
    console.log("request done")
}



function disconnectSQL() {
    sql.end(function(err) {
        if (err) throw err
        console.log("disconnected")
        writeResponse()
    })
}





let sql
let query
let res
let responseMessage
let fs
let req
let body
let settings
