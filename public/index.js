// created by Dariush Dehghani (farghani)

// set the variables
var socket = io()
var submit_btn = document.getElementById("sub_btn");
var name_inp = document.getElementById("name_inp");
var email_inp = document.getElementById("email");
var pass_inp = document.getElementById("pass_inp");
var person;
var my_contacts = [{uuid : "global", other_people : "global"}]
var position;

// what do we do when the button add user (submit btn) clicked 
function add_user() {
    var password = pass_inp.value
    if(!(password.toString().length <= 7)){
            var user = {
                id:socket.id,
                name:name_inp.value,
                password:pass_inp.value,
                email:email_inp.value
            };
            socket.emit("addUser", user);
            console.log(user.name)
    } else {
        alert("incorrect password")
    }
}
submit_btn.addEventListener("click", () => {
    add_user()
})
socket.on("incorrect-username" , () => {
    alert("username is taken")
})
socket.on("saccufully-add_user", (user) => {
    go_to_contacts(user)
})

// setups to go to contacts screen
function go_to_contacts(user) {
    document.getElementById("first_screen").style.display = "none";
    document.getElementById("contacts").style.display = "block";
    document.getElementById("chat").style.display = 'none';
    var title = document.getElementById("title");
    title.innerHTML = `${user.name}'s id is ${user.id}`;
    var name_context = document.getElementById("name_context");
    name_context.innerHTML = "Login By " + user.name;
    var id_context = document.getElementById("id_context");
    id_context.innerHTML = "@" + user.id;
    socket.in_chat = false;
    person = user;
}

// to create a contact
function create_contacts(contacts) {
    console.log(contacts)
    document.getElementById("show_contacts").innerHTML = ''
    let room_num = 0
    for (var room of contacts) {
        if (room.uuid === "global") {
            document.getElementById("show_contacts").innerHTML += `<div id="contact" onclick="go_to_chat(my_contacts[0])">
            <h3>global</h3>
        </div>`
        } else {
            console.log("create contacts room:" + room.uuid + room.other_people)
            document.getElementById("show_contacts").innerHTML += `<div id="contact" onclick="go_to_chat(my_contacts[${room_num}])">
            <h3>${room.other_people}</h3>
        </div>`
        }
        room_num += 1
    }
}

// when send massage btn clicked what do we do
var send_btn = document.getElementById("send_btn");
send_btn.addEventListener("click", () => {
    msg_text = document.getElementById("massage_text");
    if(!(msg_text == '')){
        var date = new Date();
        var msg = {
            text : msg_text.value,
            sender : person.name,
            receiver_uuid : position.uuid,
            receiver : position.other_people,
            date : date
        }
        socket.emit("send_msg", msg)
        msg_text.value = "";
    }
})

// when we call search massages, it returns
socket.on("results", massages => {
    var massages_ctx = document.getElementById("massages");
    massages_ctx.innerHTML = ""
    for(var msg of massages) {
        var massage = {
            text:'',
            id:''
        }
        massage.text = msg.sender + " : " + msg.content;
        massage.id = msg.sender === person.name ? "my_massage" : "their_massage"
        massages_ctx.innerHTML += `<p id="${massage.id}">${massage.text}</p>`
    }
})

// it stups to go to chat screen
function go_to_chat(room) {
    console.log(room)
    document.getElementById("contacts").style.display = "none";
    document.getElementById("chat").style.display = "block";
    document.getElementById("contact_name").innerHTML = room.other_people;
    console.log(room.other_people)
    socket.in_chat = true;
    position = room;
    console.log(position)
    socket.emit("search_massages", room.other_people)
}

// when a new message received, what does app do
socket.on("new_msg", msg => {
    if (position.uuid === msg.receiver_uuid) {
        var massages_ctx = document.getElementById("massages");
        console.log(msg.receiver + ' ' + position.uuid)
        var massage = {
            text:'',
            id:''
        }
        massage.text = msg.sender + " : " + msg.text;
        massage.id = msg.sender === person.name ? "my_massage" : "their_massage"
        massages_ctx.innerHTML += `<p id="${massage.id}">${massage.text}</p>`
    }
})


document.getElementById("back_from_contacts_btn").addEventListener("click", () => {
    go_to_contacts(person)
})

// setups to go to login page
document.getElementById("go_to_login").addEventListener("click", () => {
    var signup_scr = document.getElementById("signup_scr");
    var login_scr = document.getElementById("login_scr");
    signup_scr.style.display = "none"
    login_scr.style.display = "block"
})

// setups to go to signup page
document.getElementById("go_to_signup").addEventListener("click", () => {
    var signup_scr = document.getElementById("signup_scr");
    var login_scr = document.getElementById("login_scr");
    signup_scr.style.display = "block"
    login_scr.style.display = "none"
})

//
document.getElementById("sub_log_btn").addEventListener("click", () => {
    var uname = document.getElementById("name_inp_log").value
    var pass = document.getElementById("pass_inp_log").value
    var info = {
        name : uname,
        password : pass
    }
    socket.emit("login_request", info)
})
socket.on("login_unsaccufully", (err) => {
    alert(err)
})
socket.on("login_saccufully", (user) => {
    go_to_contacts(user)
})

// setups to go to add a contact screen
function go_add_a_contact() {
    document.getElementById("first_screen").style.display = "none";
    document.getElementById("contacts").style.display = "none";
    document.getElementById("chat").style.display = 'none';
    document.getElementById("add_a_contact_scr").style.display = "block";
}
function back_from_add_a_contact() {
    document.getElementById("first_screen").style.display = "none";
    document.getElementById("contacts").style.display = "block";
    document.getElementById("chat").style.display = 'none';
    document.getElementById("add_a_contact_scr").style.display = "none";
}

// sends a message to server to search a contact
document.getElementById("search_contact_btn").addEventListener("click", () => {
    var contact = document.getElementById("name_of_contact_inp");
    socket.emit("search_contact", contact.value);
    back_from_add_a_contact()
})
socket.on("cannot_search", err => {
    alert(err)
})
socket.on("user_found", user => {
    socket.emit("search_contacts")
    console.log("adding " + user + " to contacts")
})


socket.on("joining_room", (room) => {
    socket.emit("search_contacts")
    console.log("joining to :" + room.uuid)
})

socket.on("adding_users", (users) => {
    my_contacts = [{uuid : "global", other_people : "global"}]
    console.table(users)
    for (var user of users) {
        console.log(user)
        let contact = {
            uuid : user.uuid,
            other_people : user.creator === person.name ? user.other_people : user.creator
        }
        my_contacts.push(contact)
    }
    create_contacts(my_contacts)
})
