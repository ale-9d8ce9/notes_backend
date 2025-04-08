let sql
exports.run = function (res, dotenv, mysql, query) {
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
    })
    // create a database
    sql.query("CREATE DATABASE IF NOT EXISTS notes", function (err, result) {
        if (err) throw err
        console.log("Database ok")
    })
    // select database
    sql.query("USE notes", function (err, result) {
        if (err) throw err
        console.log("Database selected")
    })
    // create table
    sql.query("CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, username TEXT, password TEXT)", function (err, result) {
        if (err) throw err
        console.log("Table ok")
    })

    switch (query.action) {
        case 'addUser':
            // add a user
            if (query.username.trim() && query.password.trim()) {
                addUser(query.username.trim(), query.password.trim())
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
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.write(JSON.stringify(query))
    res.end()
}


function disconnectSQL() {
    sql.end(function(err) {
        if (err) throw err
        console.log("Disconnected!")
    })
}


function logDatabase() {
    sql.query("SELECT * FROM notes", function (err, result, fields) {
        if (err) throw err
        console.log(result)
    })
}


function addUser(username, password) {
    let validUser = false
    // check if username and password are not empty
    if (username === "" || password === "") {
        console.log("Username and password cannot be empty")
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
        } else {
            console.log("User does not exist")
            console.log("Adding user")
            let query = `INSERT INTO notes (username, password) VALUES ('${username}', '${password}')`
            sql.query(query, function (err, result) {
                if (err) throw err
                console.log("User added")
            })
        }
        // log database
        logDatabase()
    })
}


