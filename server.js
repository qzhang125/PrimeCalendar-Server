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

app.get("/api/user/events/:id/timers",passport.authenticate('jwt', { session: false }), (req, res) =>{
    userService.getTimer(req.user._id,req.params.id)
    .then((timers)=>{
        res.json(timers);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

app.post("/api/user/events/:id/timers/add",passport.authenticate('jwt', { session: false }), (req, res) =>{
    userService.addTimer(req.user._id,req.params.id,req.body)
    .then((timers)=>{
        res.json(timers);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

app.put("/api/user/events/:id/timers/:timerId",authenticate('jwt', { session: false }), (req, res) =>{
    userService.editTimer(req.user._id,req.params.timerId,req.body)
    .then((timers)=>{
        res.json(timers);
    })
    .catch(err=>{
        res.json({"message":err})
    })
})

app.delete("/api/user/events/:id/timers/:timerId",authenticate('jwt', { session: false }), (req, res) =>{
    userService.deleteTimer(req.user._id,req.params.timerId)
    .then((timers)=>{
        res.json(timers);
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