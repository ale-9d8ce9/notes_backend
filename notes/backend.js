exports.run = function (request, response, b, sqlitedb, q) {
    req = request
    res = response
    query = q
    fs = require('fs')
    secure = require('./secure')
    script = require('./scripts')
    settings = JSON.parse(fs.readFileSync('./notes/config.json', 'utf8'))
    db = sqlitedb
    body = JSON.parse(b)

    responseMessage = {
        result: "error",
        message: "unknown error"
    }

    db.exec("CREATE TABLE IF NOT EXISTS notes (username TEXT, salt TEXT, passwordHash TEXT, isAdmin BOOLEAN)", async function (err) {
        if (err) throw err
        console.log("Table ok")

    if (settings.useEncryption) {
        if (fs.existsSync('./notes/AES_GCM.key')) {
            try {
                // import key
                const keyData = fs.readFileSync('./notes/AES_GCM.key', 'utf8')
                AES_GCM_key = await secure.importKey(new Uint8Array(keyData.split(',')))
                // decrypt body
                body = await secure.decrypt(AES_GCM_key, body)
                body = JSON.parse(body)
                console.log("decrypted request")
            } catch (e) {
                console.error("Error decrypting request body:", e)
                writeResponse(true)
                return
            }
        } else {
            AES_GCM_key = await secure.AES_GCM.getKey()
            console.log(await secure.exportKey(AES_GCM_key))
            fs.writeFileSync('./notes/AES_GCM.key', (await secure.exportKey(AES_GCM_key)).toString())
            throw new Error("AES-GCM key not found, generated new key")
        }
    }
    body.username ? body.username = body.username.trim() : undefined
    body.password ? body.password = body.password.trim() : undefined

    console.log("action: " + query.action)
    switch (query.action) {
        case 'addUser':
            if (body.username && body.password) {
                addUserChecks(body.username, body.password)
            } else {
                writeResponse(true)
            }
            break
        case 'addNote':
            if (body.username && body.password) {
                addNote(body.username, body.password, JSON.parse(body.note))
            } else {
                writeResponse(true)
            }
            break
        case 'getListNotes':
            if (body.username && body.password) {
                getListNotes(body.username, body.password)
            } else {
                writeResponse(true)
            }
            break
        case 'getFullNote':
            if (body.username && body.password) {
                getFullNote(body.username, body.password, body.noteId)
            } else {
                writeResponse(true)
            }
            break
        case 'saveNote':
            if (body.username && body.password) {
                saveNote(body.username, body.password, body.noteId, JSON.parse(body.note))
            } else {
                writeResponse(true)
            }
            break
        case 'deleteNote':
            if (body.username && body.password) {
                deleteNote(body.username, body.password, body.noteId)
            } else {
                writeResponse(true)
            }
            break
        case 'ping':
            console.log("ping")
            responseMessage = {
                result: "success",
                message: "pong"
            }
            writeResponse()
            break
        default:
            console.log("No action specified")
            writeResponse()
            break
    }
    })
}


function addUserChecks(username, password) {
    console.log("adding user: " + username)
    // checks
    if (settings.allowAccountCreation) {
        if (!username || !password) {
            responseMessage = {
                result: "error",
                message: "username or password not specified"
            }
            console.log("username or password not specified")
            // disconnect from database and write web response
            writeResponse()

        } else {
            db.all('SELECT * FROM notes', [], function (err, result) {
                if (err) throw err

                if (result.length < settings.maxUsers) {
                    result = undefined
                    // if the number of users is less than or equal to the maximum number of users
                    let validUser = true
                    // check if username and password are valid
                    if (username.length < 3 || password.length < 6) {
                        validUser = false
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
                        writeResponse()
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
                    writeResponse()
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
        writeResponse()
    }
}



function addUserToDatabase(username, password) {
    // start adding user to database
    db.all(`SELECT * FROM notes WHERE username = ?`,[username], function (err, result) {
        if (err) throw err

        if (result.length > 0) {
            // if user already exists
            console.log("user already exists")
            responseMessage = {
                result: "error",
                message: "user already exists"
            }
            // disconnect from database and write web response
            writeResponse()

        } else {
            // if user does not exist
            console.log("user doesn't exist")
            responseMessage = {
                result: "error",
                message: "unknown error"
            }

            console.log("adding user in the database")
            let hash = JSON.parse(secure.hashPassword(password))
            console.log(hash)
            db.run(`INSERT INTO notes (username, salt, passwordHash, isAdmin) VALUES ( ? , ? , ? , ? )`, [username, hash.salt, hash.hash, settings.createUsersAsAdmin], function (err) {
                if (err) throw err
                console.log("user added to database")

                console.log("creating user folder")
                findUser(username, password, function (user) {
                    fs.mkdir(`./notes/data/${user.username}`,{recursive:true}, (err) => {
                        if (err) throw err
                        console.log("user folder created")

                        console.log("creating user file")
                        fs.writeFile(`./notes/data/${user.username}/user.json`, JSON.stringify({listNotes: []}), (err) => {
                            if (err) throw err
                            console.log("user file created")

                            console.log("user added")
                            responseMessage = {
                                result: "success",
                                message: "user added"
                            }
                            // disconnect from database and write web response
                            writeResponse()
                        })
                    })
                })
            })
        }
    })
}


function addNote(username, password, noteHead) {
    findUser(username, password, function (user) {
        fs.readFile(`./notes/data/${user.username}/user.json`, 'utf8', (err, data) => {
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
            fs.writeFile(`./notes/data/${user.username}/user.json`, JSON.stringify(data), (err) => {
                if (err) throw err

                console.log("creating note folder")
                fs.mkdir(`./notes/data/${user.username}/${noteHead.path}`,{recursive:true}, (err) => {
                    if (err) throw err
                    console.log("note folder created")

                    fs.writeFile(`./notes/data/${user.username}/${noteHead.path}/elements.json`, JSON.stringify([]), (err) => {
                        if (err) throw err
                        console.log("note elements.json created")
                        fs.writeFile(`./notes/data/${user.username}/${noteHead.path}/fileHeaders.json`, JSON.stringify([]), (err) => {
                            if (err) throw err
                            console.log("note fileHeaders.json created")
                            responseMessage = {
                                result: "success",
                                message: "note added"
                            }
                            console.log("note added")
                            writeResponse()
                        })
                    })
                })
            })
        })
    })
}


function getListNotes(username, password) {
    findUser(username, password, function (user) {
        fs.readFile(`./notes/data/${user.username}/user.json`, 'utf8', (err, data) => {
            if (err) throw err

            console.log("user file read")
            data = JSON.parse(data)
            responseMessage = {
                result: "success",
                message: data.listNotes
            }
            // disconnect from database and write web response
            writeResponse()
        })
    })
}


function getFullNote(username, password, noteId) {
    findUser(username, password, function (user) {
        getNoteHead(user, noteId, function (noteHead) {
            path = `./notes/data/${user.username}/${noteHead.path}`
            console.log("note path: " + path)

            // read note text elements and index
            fs.readFile(`${path}/elements.json`, 'utf8', (err, data) => {
                if (err) throw err
                console.log("note elements read")
            noteHead.elements = JSON.parse(data)

            fs.readFile(`${path}/fileHeaders.json`, 'utf8', (err, data) => {
                if (err) throw err
                console.log("note fileHeaders read")
            fileHeaders = JSON.parse(data)

            // read note files
            noteHead.files = []
            for (let i = 0; i < noteHead.elements.length; i++) {
                let filePath = `${path}/res${i}.bin`
                if (fileHeaders[i] != null) {
                    console.log("appending file: " + i + ", " + filePath)
                    let fileData = fs.readFileSync(filePath)
                    noteHead.files.push({
                        data: fileHeaders[i] + fileData.toString('base64'),
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
            writeResponse()
        })
        })
        })
    })
}


function saveNote(username, password, noteId, note) {
    findUser(username, password, function (user) {
        // get note path
        getNoteHead(user, noteId, function (noteHead) {
            path = `./notes/data/${user.username}/${noteHead.path}`
            console.log("note path: " + path)

            fs.readFile(`${path}/fileHeaders.json`, 'utf8', (err, data) => {
                if (err) throw err
                console.log("note fileHeaders read")
                fileHeaders = JSON.parse(data)
            

            // check for deleted files
            let filesToDelete = note.filesToDelete
            console.log("files to delete: " + filesToDelete)
            // if there are files to delete
            if (filesToDelete.length > 0) {
                // for all files to delete
                for (let i = 0; i < filesToDelete.length; i++) {
                    const element = filesToDelete[i];
                    //delete file res${filesToDelete[i]}.bin if exists (has a header)
                    if (fileHeaders[element] != null) {
                        try {
                            fs.unlinkSync(`${path}/res${element}.bin`)
                            console.log(`deleted file res${element}.bin`)
                        } catch (error) {
                            console.error(`Error deleting file ${path}/res${element}.bin:\n`, error)
                        }
                    } else {console.log(`file res${element}.bin should not exist (for deletion)`)}
                    fileHeaders.splice(element, 1)
                    // rename all files decreasing the number after the one that has been deleted
                    for (let j = element; j < fileHeaders.length; j++) {
                        if (fileHeaders[j] != null) {
                            try {
                                fs.renameSync(`${path}/res${j + 1}.bin`, `${path}/res${j}.bin`)
                                console.log(`renamed file ${path}/res${j + 1}.bin to ${path}/res${j}.bin`)
                            } catch (error) {
                                console.error(`Error renaming file ${path}/res${j + 1}.bin to ${path}/res${j}.bin:\n`, error)
                            }
                        } else {console.log(`file res${j + 1}.bin should not exist (for renaming)`)}
                    }
                }
            } else console.log("no files to delete")
            filesToDelete = undefined

            // for all files
            for (let i = 0; i < note.files.length; i++) {
                let noteFile = note.files[i]
                // if file exists and is updated
                if (note.elements[i].toUpload == true) {
                    if (noteFile != null) {
                        console.log(`note file ${i} needs to change / be created`)
                        // decode file
                        file = decodeFile(noteFile.data)
                        file.name = `res${i}.bin`
                        //save file
                        fs.writeFile(`${path}/${file.name}`, file.data, (err, i) => {
                            if (err) throw err
                            console.log(`note file updated`)
                        })
                        fileHeaders[i] = file.header
                        delete noteFile.data
                    } else {
                        fileHeaders[i] = null
                    }
                }
            }


            // update note text elements and index
            fs.writeFile(`${path}/elements.json`, JSON.stringify(note.elements), (err) => {
                if (err) throw err
                console.log("note elements.json updated")
            
            fs.writeFile(`${path}/fileHeaders.json`, JSON.stringify(fileHeaders), (err) => {
                if (err) throw err
                console.log("note fileHeaders.json updated")

            // update note head
            noteHead.dateModified = note.dateModified
            noteHead.position = note.position
            noteHead.name = note.name
            updateNoteHead(user, noteId, noteHead, function () {
                responseMessage = {
                    result: "success",
                    message: "note updated"
                }
                // disconnect from database and write web response
                writeResponse()
            })
            })
            })
            })
        })
    })
}


function deleteNote(username, password, noteId) {
    findUser(username, password, function (user) {
        getNoteHead(user, noteId, function (noteHead) {
            path = `./notes/data/${user.username}/${noteHead.path}`
            console.log("note path: " + path)

            // delete note folder
            fs.rm(path, { recursive: true }, (err) => {
                if (err) throw err
                console.log("note folder deleted")

                // delete note head
                fs.readFile(`./notes/data/${user.username}/user.json`, 'utf8', (err, data) => {
                    if (err) throw err
                    console.log("user file read")
                    data = JSON.parse(data)
                    data.listNotes.splice(noteId, 1)
                    fs.writeFile(`./notes/data/${user.username}/user.json`, JSON.stringify(data), (err) => {
                        if (err) throw err
                        console.log("note head deleted")
                        responseMessage = {
                            result: "success",
                            message: "note deleted"
                        }
                        // disconnect from database and write web response
                        writeResponse()
                    })
                })
            })
        })
    })
    console.log("deleting note: " + noteId)
}


function findUser(username, password, callback) {
    db.all(`SELECT * FROM notes WHERE username = ?`, [username], function (err, result) {
        if (err) throw err
        // check if user exists
        if (result.length == 1) {
            console.log("User exists")
            if (secure.verifyHash(password, result[0].salt, result[0].passwordHash)) {
                callback(result[0])
            } else {
                console.log("Invalid password")
                responseMessage = {
                    result: "error",
                    message: "Invalid password"
                }
                writeResponse()
                return null
            }
        } else {
            // if user does not exist
            console.log("User does not exist")
            responseMessage = {
                result: "error",
                message: "user does not exist"
            }
            writeResponse()
            return null
        }
    })
}


function getNoteHead(user, noteId, callback) {
    fs.readFile(`./notes/data/${user.username}/user.json`, 'utf8', (err, data) => {
        if (err) throw err
        console.log("user file read")

        data = JSON.parse(data)
        if (data.listNotes.length > noteId) {
            callback(data.listNotes[noteId])
        } else {
            console.log("Note does not exist")
            responseMessage = {
                result: "error",
                message: "note does not exist"
            }
            // disconnect from database and write web response
            writeResponse()
        }
    })
}


function updateNoteHead(user, noteId, noteHead, callback) {
    fs.readFile(`./notes/data/${user.username}/user.json`, 'utf8', (err, data) => {
        if (err) throw err
        console.log("user file read")

        data = JSON.parse(data)
        // check if note exists
        if (data.listNotes.length > noteId) {

            // overwrite note head
            data.listNotes[noteId] = noteHead
            fs.writeFile(`./notes/data/${user.username}/user.json`, JSON.stringify(data), (err) => {
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
                message: "note does not exist"
            }
            // disconnect from database and write web response
            writeResponse()
        }
    })
    
}


function logDatabase(callback) {
    db.all("SELECT * FROM notes", function (err, result) {
        if (err) throw err
        console.log(result)
        callback ? callback() : writeResponse()
    })
}




function decodeFile(base64) {
    let fileName = base64.split(',')[0].split(':')[1].split(';')[0]
    let fileHeader = base64.split(',')[0] + ','
    let type = fileName.split('/')[0]
    let extension = fileName.split('/')[1]
    let base64data = base64.split(',')[1]
    const fileData = Buffer.from(base64data, 'base64')
    return {data:fileData, type:type, extension:extension, header:fileHeader}
}





async function writeResponse(refuse) {
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
        if (settings.useEncryption) {
            responseMessage = await secure.encrypt(AES_GCM_key, JSON.stringify(responseMessage))
            console.log("encrypted response")
        }
        res.writeHead(200)
        res.write(JSON.stringify(responseMessage))
    }
    res.end()
    console.log("disconnecting")
    disconnectSQL()
}



function disconnectSQL() {
    db.close(function(err) {
        if (err) throw err
        console.log("done")
    })
}





let query
let res
let responseMessage
let fs
let req
let body
let settings
let db

let secure
let script
let AES_GCM_key