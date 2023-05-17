/**
 * created by Dariush Dehghani (farghani)
 * for join to 'جشنواره خوارزمی'
 */
//setup project
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var localhost = 3000;
var users = new Array;
const  {  v4 : uuidv4  }  =  require ( 'uuid' ) ; 

//data base
const sqlite = require("sqlite3").verbose();
db = new sqlite.Database('data.sqlite')

// setup express
app.get('/', (_, res) => {
    res.sendFile(__dirname + "/public/index.html");
})
app.use(express.static('public'));

// start app
io.on('connection', socket => {
    // add user to global messages
    socket.join("global");
    // a variable for user info
    var person = ''

    console.log(socket.id + " connected")

    const searching_contacts = () => {
        if (!(person === '')) {
            db.all(`SELECT * FROM rooms WHERE creator = '${person.name}' OR other_people = '${person.name}'`, (err, rows) => {
                if (err) {
                    socket.emit("cannot_search", "we cannot search your contacts, if you want to get your contacts, try to signout and sign in again")
                    console.error("error in line 172 :" + err + Date.now());
                } else {
                    socket.emit("adding_users", rows)
                    for (i of rows) {
                        socket.join(i.uuid)
                    }
                }
            })
        }
    }

    // for adding an user
    socket.on("addUser", (user) => {
        if(users[user.name] == undefined){
                person = user
                console.log(`the username of ${user.id} is ${user.name}`)
                users[user.name] = user;
                db.serialize(function(){
                    db.run(`INSERT INTO users (userid, username, email, password, online) VALUES ("${socket.id}", "${person.name}", "${person.email}", "${person.password}", "true");`);
                    db.run(`create table if not exists ${person.name}_messages (content char, sender char, receiver char, gettingTime date)`)
                })
                socket.emit("saccufully-add_user", user)
        } else {
            socket.emit("incorrect-username")
        }
    })
    // this functuion turns when we want to send a message
    socket.on("send_msg", (msg) => {
        io.in(msg.receiver_uuid).emit("new_msg", msg);
        db.serialize(function(){
            if (msg.receiver === "global") {
                db.run(`INSERT INTO global_messages (content, sender, gettingtime) VALUES ("${msg.text}", "${msg.sender}", "${Date.now}")`);
            } else {
                db.run(`INSERT INTO ${msg.receiver}_messages (content, sender, receiver, gettingTime) VALUES ("${msg.text}", "${msg.sender}", "${msg.receiver}", "${Date.now()}");`);
                db.run(`INSERT INTO ${msg.sender}_messages (content, sender, receiver, gettingTime) VALUES ("${msg.text}", "${msg.sender}", "${msg.receiver}", "${Date.now()}");`);
            }
        })
    })
    // this turns when we calling login request from front-end
    socket.on("login_request", info => {
        db.serialize(function() {
            db.get(`SELECT online, username, password, email, count(*) FROM users WHERE username = "${info.name}"`, (err, row) => {
                if(err){
                    socket.emit("login_unsaccufully", "ERROR : error isn't from you, that's from our server, please try again later")
                    console.log("cannot read, error:" + err)
                }
                if(row['count(*)'] === 0) {
                    socket.emit('login_unsaccufully', "user doesn't exist");
                } else {
                    console.log(row)
                    if (row.password === info.password) {
                        if(row.online === 'false'){
                            var person2 = {
                                name : row.username,
                                id : socket.id,
                                password : row.password
                            }
                            socket.emit("login_saccufully", person2)
                            person = person2
                            db.run(`UPDATE users SET userid = '${socket.id}', online = 'true' WHERE username = '${row.username}'`);
                            searching_contacts(socket, person)
                        } else {
                            socket.emit("login_unsaccufully", "you can login just with one device")
                        }
                    } else {
                        socket.emit("login_unsaccufully", "check your password")
                        console.log(row.password)
                    }
                }
            })
        })
    })
    // it turns when we want to go to contacts page
    socket.on("search_contact", username => {
        console.log("search contact with this name : " + username )
        db.get(`SELECT count(*), creator, other_people FROM rooms WHERE creator = '${username}' AND other_people = '${person.name}' OR other_people = '${username}' AND creator = '${person.name}'`, (err, room) => {
            if (err) {
                console.error(err)
                socket.emit("cannot_search", "an error from server, we are trying to solve this problem, please try again later")
            } else if (!(room["count(*)"] === 0)) {
                socket.emit("cannot_search", "this room is created later, if it is not, try email this problem to chatting@app.com (email is an examole)")
            } else {
                db.get(`SELECT count(*), userid, username, email FROM users WHERE username = '${username}'`, (err, row) => {
                    if(err){
                        socket.emit("cannot_search", "ERROR: error isn't fom you, it's from us, try again later")
                        console.log("cannot search contact, error: " + err + " " + Date.now())
                    }
                    if(row['count(*)'] === 0) {
                        socket.emit("cannot_search", "cannot find user check input")
                    } 
                    if (!(row['count(*)'] === 0)) { 
                        let roomid = uuidv4()
                        let room = {
                            uuid : roomid,
                            other_people : row.username,
                            other_email : row.email,
                            other_id : row.userid
                        }
                        socket.emit("user_found", room)
                        socket.join(room.uuid)
                        io.to(row.userid).emit("joining_room", room)
                        db.run(`INSERT INTO rooms (uuid, creator, other_people) VALUES ('${roomid}', '${person.name}', '${row.username}')`)
                    }
                })
            }
        })
    })
    // when a person added you, it says to your computer to add that person to contacts page
    socket.on("joining_room", (room) => {
        socket.join(room.uuid)
        console.log(person.name + " is joining to " + room.uuid)
    })
    // when you go to a massage page, it searchs massages
    socket.on("search_massages", (chat) => {
        console.log('search massages of: ' + chat)
        console.log(person)
        if(chat === 'global') {
            db.all(`SELECT * FROM global_messages`, (err, massages) => {
                if (err) {
                    socket.emit("cannot_search", "cannot get messages, please try again later")
                    console.error("cannot search massages, error: "+ err + " " + Date.now())
                } else {
                    socket.emit("results", massages)
                }
            })
        } else {
            db.all(`SELECT * FROM ${person.name}_messages WHERE receiver = '${chat}' AND sender = '${person.name}' OR sender = '${chat}' AND receiver = '${person.name}'`, (err, msgs) => {
                if (err) {
                    socket.emit("cannot_search", "cannot get massages, this error is from server, try again later")
                    console.error("cannot search massages, err:" + err + " " + Date.now())
                } else {
                    /*db.all(`SELECT * FROM ${person.name}_messages WHERE sender = '${chat}' AND receiver = '${person.name}'`, (err, msgs2) => {
                        if (err) {
                            console.error("cannot search massages, err:" + err + "" + Date.now())
                            socket.emit("cannot_search", "cannot get massages, don't worry, error is from server, please try again later")
                        } else {*/
                    socket.emit("results", msgs)
                        /*}
                    })*/
                }
            })
        }
    })
    socket.on("search_contacts", () => {
        searching_contacts(socket, person)
    })
    // when a person disconnected, it sends a message to console to say that person disconnected, then it changes that person's online to offline
    socket.on("disconnect", () => {
        if(!(person === undefined)) {
            console.log(`${person.name} disconnected`)
            db.run(`UPDATE users SET online='false' WHERE username = '${person.name}'`)
        }
    })
})

// run the server
server.listen(localhost, () => {
    console.log('listening on: ' + localhost)
})

// creating sqlite tables
db.serialize(function() {
    console.log('creating databases if they don\'t exist');
    db.run('create table if not exists users (userid char, username text not null, email char, password char, online text)');
    db.run(`create table if not exists global_messages (content char, sender char, gettingTime date)`);
    db.run('create table if not exists rooms (uuid char, creator char, other_people char)')
});
