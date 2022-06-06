const express = require('express');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");
dotenv.config();

const userService = require("./service.js");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;


var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
jwtOptions.secretOrKey = process.env.JWT_SECRET;
var strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
    console.log('payload received', jwt_payload);

    if (jwt_payload) {
        next(null, { _id: jwt_payload._id, 
            userName: jwt_payload.userName, 
            password: jwt_payload.password}); 
    } else {
        next(null, false);
    }
});
passport.use(strategy);
app.use(passport.initialize());
app.use(express.json());


app.use(cors());
// Method 1 CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200"); //add deployed front-end url after
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// IGNORE BELOW - WILL CLEAN LATER

// Method 2 - add  cors(corsOptions), to relevant routes
// var corsOptions = {
//     origin: 'http://localhost:4200',
//     optionsSuccessStatus: 200
// }
// Method 3 - comment out line 37 if using, non-functional atm
// const corsOptionsDelegate = function (req, callback) {
//     const allowlist = [`http://localhost:4200`]
//     let corsOptions;
//     if (allowlist.indexOf(req.header('Origin')) !== -1) {
//         corsOptions = { origin : true }
//     } else {
//         corsOptions = { origin : false }
//     }
//     callback(null, corsOptions)
// }
// app.use(cors(corsOptionsDelegate))

/* TODO Add Your Routes Here */
app.post("/api/user/register",(req, res)=>{
    userService.registerUser(req.body).then(()=>{
        res.json({message: "Resolve sucessful"});
    }).catch(err=>{
        res.status(422).json({message: err});
    });
});

app.post("/api/user/login",(req,res)=>{
    userService.checkUser(req.body).then(user=>{
        let token = jwt.sign({
            _id: user._id,
            userName: user.userName
        }, jwtOptions.secretOrKey);
        res.json({message: "User Logged In", token: token});
    }).catch(err=>{
        console.log(err);
        res.status(422).json({message: err});
    });
});


//add event
app.post("/api/user/events/add", (req, res) =>{

    userService.addEvent("6297dd297f1fa17552d49c0a",req.body)
    .then((data)=>{
        res.json(data);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//update Event
app.put("/api/user/events/:id", (req, res) =>{
    userService.updateEvent(req.params.id,req.body)
    .then((event)=>{
        res.json(event);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//getEvent
app.get("/api/user/events/:id", (req, res) =>{
    userService.getEvent(req.params.id)
    .then((data)=>{
        res.json(data);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//Delete Event
app.delete("/api/user/events/:id", (req, res) =>{
    //Hard code the user id for now to avoid JWT issue
    userService.deleteEvent("6297dd297f1fa17552d49c0a",req.params.id)
    .then((events)=>{
        res.json(events);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//Create note
app.post("/api/user/events/:id/notes/add",(req, res) =>{
    userService.createNotes("6297dd297f1fa17552d49c0a",req.params.id,req.body)
    .then((data)=>{
        res.json(data);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//Update Note
app.put("/api/user/events/:id/notes/:noteId", (req, res) =>{
    userService.editNotes(req.params.noteId,req.body)
    .then((notes)=>{
        res.json(notes);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//Get Note 
app.get("/api/user/events/:id/notes", (req, res) =>{
    userService.getNotes(req.params.id)
    .then((data)=>{
        res.json(data);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//Delete Note
app.delete("/api/user/events/:id/notes/:noteId",(req, res) =>{
    userService.deleteNotes("6297dd297f1fa17552d49c0a",req.params.noteId)
    .then((notes)=>{
        res.json(notes);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//TODO: add timer
app.post("/api/user/events/:id/timers/add", (req, res) =>{
    userService.addTimer("6297dd297f1fa17552d49c0a",req.params.id,req.body)
    .then((data)=>{
        res.json(data);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//TODO: edit timer
app.put("/api/user/events/:id/timers/:timerId", (req, res) =>{
    userService.editTimer(req.params.timerId,req.body)
    .then((timers)=>{
        res.json(timers);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//TODO: delete timer
app.delete("/api/user/events/:id/timers/:timerId", (req, res) =>{
    userService.deleteTimer("6297dd297f1fa17552d49c0a",req.params.timerId)
    .then((timers)=>{
        res.json(timers);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

//TODO: Display timer route
app.get("/api/user/events/:id/timers", (req, res) =>{
    userService.getTimer(req.params.id)
    .then((data)=>{
        res.json(data);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})




userService.connect()
.then(() => {
    app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });
})
.catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
});
