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




//TODO: Create note route
app.post("/api/user/notes", passport.authenticate('jwt',{session: false}), (req, res)=>{
    userService.createNotes(req.body).then(()=>{
        res.json({message: "Resolve sucessful"});
    }).catch(err=>{
        res.status(422).json({message: err});
    });
});

//TODO: Update note route
app.put("/api/user/notes/:id",(req, res)=>{
    userService.updateNotes(req.body, req.params.id).then((data)=>{
        res.json(data);
    }).catch(()=>{
        res.status(500).end();
    });
});

//TODO: Delete note route
app.delete("/api/user/notes/:id", passport.authenticate('jwt', {session: false}), (req, res)=>{
    userService.removeNotes(req.user._id, req.params.id).then((data)=>{
        res.json(data);
    }).catch(()=>{
        res.status(500).end();
    });
});

//TODO: Display note route
app.get("/api/user/notes/:id",(req, res)=>{
    userService.getNotes(req.params.id).then((data)=>{
        res.json(data);
    }).catch(()=>{
        res.status(500).end();
    });
});

userService.connect()
.then(() => {
    app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });
})
.catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
});
