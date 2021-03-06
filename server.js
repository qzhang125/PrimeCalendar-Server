const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");
dotenv.config();
const app = express();

//email
const bodyParser = require("body-parser");
app.use(bodyParser.json());
const nodeMailer = require("nodemailer");
const crypto = require("crypto")

const userService = require("./service.js");
const SendmailTransport = require("nodemailer/lib/sendmail-transport");
const { defaultMaxListeners } = require("nodemailer/lib/xoauth2");

const HTTP_PORT = process.env.PORT || 8080;

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
jwtOptions.secretOrKey = process.env.JWT_SECRET;
var strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  console.log("payload received", jwt_payload);

  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
      password: jwt_payload.password,
    });
  } else {
    next(null, false);
  }
});
passport.use(strategy);
app.use(passport.initialize());
app.use(express.json());

// IGNORE WILL CLEAN LATER
// app.use(cors());
// // Method 1 CORS
// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "http://localhost:4200"); //add deployed front-end url after
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
//   });
// Method 2 - add  cors(corsOptions), to relevant routes
// var corsOptions = {
//     origin: 'http://localhost:4200',
//     optionsSuccessStatus: 200
// }

// Method 3 - comment out line 37 if using, non-functional atm
const corsOptionsDelegate = function (req, callback) {
  const allowlist = [
    `https://fascinating-meringue-45e4dd.netlify.app`,
    `https://cool-kringle-5f7efa.netlify.app`,
    `http://localhost:4200`,
  ];
  let corsOptions;
  if (allowlist.indexOf(req.header("Origin")) !== -1) {
    corsOptions = { origin: true };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};
app.use(cors(corsOptionsDelegate));

/* TODO Add Your Routes Here */
app.post("/api/user/register", (req, res) => {
  userService
    .registerUser(req.body)
    .then(() => {
      res.json({ message: "Resolve sucessful" });
    })
    .catch((err) => {
      res.status(422).json({ message: err });
    });
});

app.post("/api/user/login", (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      let token = jwt.sign(
        {
          _id: user._id,
          userName: user.userName,
        },
        jwtOptions.secretOrKey
      );
      res.json({ message: "User Logged In", token: token });
    })
    .catch((err) => {
      console.log(err);
      res.status(422).json({ message: err });
    });
});

//Send mail
app.post("/api/user/regmail", (req, res) => {
  console.log("email request came");
  let user = req.body;

  sendMail(user, (info) => {
    console.log(`The mail has been sent`);
    res.send(info);
  });
});

app.post("/api/user/changepassword", (req, res) => {
  userService.checkUserName(req.body).then((user)=>{
  console.log("email address: "+ user.userName);
  
  //Set resetToken and expiration
  const token = crypto.randomBytes(20).toString('hex');
  userService.updateUser(user,{
    resetPasswordToken:token,
    resetPasswordExpires: Date.now() + 3600000,
  }).then((user)=>{
    console.log(user);
  
  //Nodemailer transporter
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: `${process.env.businessEmail}`, // generated gmail user
      pass: `${process.env.businessPassword}`, //// generated gmail user
    },
  })

  //mail options
  const mailOptions = {
    from: '"Prime Calendar" <team2prj@gmail.com>',
    to:`${user.userName}`,
    subject:`Link to Reset Password`,
    text:
    `Dear User: \n\n` +
    `You are receiving this email because you have requested the reset of the password for your account. \n\n` +
    `Please click on the following link to update your password: \n\n` +
    `https://fascinating-meringue-45e4dd.netlify.app/reset/${token} \n\n` +
    `If you did ot request this, please ignore this email and your password will remain unchanged. \n`
  }

  //sending email
  transporter.sendMail(mailOptions,function(err,response){
    if(err){
      console.log(err);
    }else{
      console.log("sending successful: "+response)
      res.json({ userName:  user.userName});
    }
  })
  }).catch((err)=>{console.log(err)})

  }).catch((err)=>{
    console.log(err);
    res.status(422).json({ message: err });
  });
});

app.get("/api/user/checkToken/:token", (req, res) => {
  console.log(req.params.token);
  userService.checkToken(req.params.token).then((user)=>{
    console.log("user token: "+ user.resetPasswordToken);
    res.json({ user:user,message: "reset link is ok" });
  }).catch((err)=>{
    console.log(err);
    res.json({ message: err });
  });
});

async function sendMail(user, callback) {
  //create transporter object using default SMTP transport
  let transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.businessEmail, // generated gmail user
      pass: process.env.businessPassword, //// generated gmail user
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Prime Calendar" <team2prj@gmail.com>', // sender address
    to: `${user.userName}`,
    subject: "Welcome to Prime Calendar",
    html: `<h1>${user.userName}</h1><br>
        <h4>Thank you for joining Prime Calendar.</h4>`,
  });
  callback(info);
  console.log("Message sent: %s", info.messageId);
}
//sendMail().catch(console.error);

//update password
app.put("/api/user/passwordChange/:id", (req, res) => {

  userService
    .updateUserPass(req.params.id, req.body)
    .then((event) => {
      res.json(event);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});



//add event
app.post(
  "/api/user/events/add",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .addEvent(req.user._id, req.body)
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//update Event
app.put("/api/user/events/:id", (req, res) => {
  userService
    .updateEvent(req.params.id, req.body)
    .then((event) => {
      res.json(event);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

//getEvent
app.get("/api/user/events/:id", (req, res) => {
  userService
    .getEvent(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

//Get all events
app.get(
  "/api/user/events",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .getAllEvents(req.user._id)
      .then((events) => {
        res.json(events);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//Delete Event
app.delete(
  "/api/user/events/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Hard code the user id for now to avoid JWT issue
    userService
      .deleteEvent(req.user._id, req.params.id)
      .then((events) => {
        res.json(events);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//Create note
app.post(
  "/api/user/events/:id/notes/add",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .createNotes(req.user._id, req.params.id, req.body)
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//Update Note
app.put("/api/user/events/:id/notes/:noteId", (req, res) => {
  userService
    .editNotes(req.params.noteId, req.body)
    .then((notes) => {
      res.json(notes);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

//Get Note
app.get("/api/user/events/:id/notes", (req, res) => {
  userService
    .getNotes(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

//Delete Note
app.delete(
  "/api/user/events/:id/notes/:noteId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .deleteNotes(req.user._id, req.params.noteId)
      .then((notes) => {
        res.json(notes);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//TODO: add timer
app.post(
  "/api/user/events/:id/timers/add",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .addTimer(req.user._id, req.params.id, req.body)
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//TODO: edit timer
app.put("/api/user/events/:id/timers/:timerId", (req, res) => {
  userService
    .editTimer(req.params.timerId, req.body)
    .then((timers) => {
      res.json(timers);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

//TODO: delete timer
app.delete(
  "/api/user/events/:id/timers/:timerId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .deleteTimer(req.user._id, req.params.timerId)
      .then((timers) => {
        res.json(timers);
      })
      .catch((err) => {
        res.json({ message: err });
      });
  }
);

//TODO: Display timer route
app.get("/api/user/events/:id/timers", (req, res) => {
  userService
    .getTimer(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });
