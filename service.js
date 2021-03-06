const mongoose = require("mongoose");
//mongoose.set('useFindAndModify', false); //https://mongoosejs.com/docs/deprecations.html#findandmodify
const bcrypt = require("bcryptjs");
var validator = require("email-validator");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;
let userSchema = new Schema({
  userName: { type: String, require: true, unique: true },
  password: String,
  eventId: [String],
  noteId: [String],
  timerId: [String],
  resetPasswordToken: String,
  resetPasswordExpires: Number
});
let eventSchema = new Schema({
  eventTitle: String,
  groupId: String,
  start: String,
  end: String,
  startTime: Number,
  endTime: Number,
  description: String,
  daysOfWeek: [Number],
  startRecur: String,
  endRecur: String,
  userId: String,
  date: { type: Date, default: Date.now() },
  recurring: String,
});
let noteSchema = new Schema({
  noteTitle: String,
  noteText: String,
  creationDate: { type: Date, default: Date.now() },
  lastEditedDate: Date,
  heading: { title: String, lineNum: Number },
  subHeading: { title: String, lineNum: Number },
  eventId: String,
  userId: String,
});
let timerSchema = new Schema({
  timerTitle: String,
  timerDuration: Number,
  breaks: Boolean,
  breakDuration: Number,
  eventId: String,
  userId: String,
});

let User;
let Event;
let Note;
let Timer;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
    });

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      User = db.model("users", userSchema);
      Event = db.model("events", eventSchema);
      Note = db.model("notes", noteSchema);
      Timer = db.model("timers", timerSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    if (userData.password != userData.password2) {
      reject("Passwords do not match");
    } else if (validator.validate(userData.userName) == false) {
      reject("Invalid email");
    } else {
      bcrypt
        .hash(userData.password, 10)
        .then((hash) => {
          userData.password = hash;
          let newUser = new User(userData);
          newUser.save((err) => {
            if (err) {
              if (err.code == 11000) {
                reject("Email already taken");
              } else {
                reject("There was an error creating the user: " + err);
              }
            } else {
              resolve("User " + userData.userName + " successfully registered");
            }
          });
        })
        .catch((err) => reject(err));
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({ userName: userData.userName })
      .exec()
      .then((user) => {
        bcrypt.compare(userData.password, user.password).then((res) => {
          if (res === true) {
            resolve(user);
          } else {
            reject("Incorrect password for user " + userData.userName);
          }
        });
      })
      .catch((err) => {
        console.log(err);
        reject("Unable to find user " + userData.userName);
      });
  });
};

module.exports.checkUserName = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({ userName: userData.userName })
      .exec()
      .then((user) => {
            console.log("find username: "+user.userName)
            resolve(user);
        })
      .catch((err) => {
        console.log(err);
        reject("Unable to find user " + userData.userName);
      });
  });
};

module.exports.updateUser = function (user,updateData) {
  return new Promise(function (resolve, reject) {
    User.findOneAndUpdate({ userName: user.userName },updateData,{ new: true })
      .exec()
      .then((user) => {
            console.log("updated: "+ user.userName)
            resolve(user);
        })
      .catch((err) => {
        console.log(err);
        reject("Unable to update user " + userData.userName);
      });
  });
};

module.exports.updateUserPass = function (user,updateData) {
  return new Promise(function (resolve, reject) {
    bcrypt
  .hash(updateData.password, 10)
  .then((hash) => { 
    updateData.password = hash})
    .then(()=>User.findOneAndUpdate(
      { userName: user },
      {$set: {
        password: updateData.password,
      }},
      { new: true })
    )
      .exec()
      .then((user) => {
            console.log("updated pass: "+ user)
            resolve(user);
        })
    
      .catch((err) => {
        console.log(err);
        reject("Unable to update user pass " + user);
      });
  });
};


module.exports.checkToken = function (token) {
  return new Promise(function (resolve, reject) {
    User.findOne({ resetPasswordToken: token, resetPasswordExpires:{$gt: Date.now()}})
      .exec()
      .then((user) => {
            console.log("find username: "+user.userName)
            resolve(user);
        })
      .catch((err) => {
        console.log(err);
        reject("Unable to find user token");
      });
  });
};

/*NOTE*/
//Create Note
module.exports.createNotes = function (id, eventId, noteData) {
  return new Promise(function (resolve, reject) {
    let newNote = new Note(noteData);
    newNote.userId = id;
    newNote.eventId = eventId;
    newNote.save((err) => {
      if (err) {
        reject("There was an error creating the note: " + err);
      } else {
        User.findByIdAndUpdate(
          id,
          { $addToSet: { noteId: newNote._id } },
          { new: true }
        )
          .exec()
          .then((data) => resolve(data))
          .catch((err) => {
            reject("There was an error creating the note: " + err);
          });
      }
    });
  });
};

//upadate Note
module.exports.editNotes = function (noteId, noteData) {
  return new Promise(function (resolve, reject) {
    Note.findByIdAndUpdate(
      noteId,
      {
        $set: {
          noteTitle: noteData.noteTitle,
          noteText: noteData.noteText,
          lastEditedDate: noteData.lastEditedDate,
          heading: noteData.heading,
          subHeading: noteData.subHeading,
        },
      },
      { new: true }
    )
      .exec()
      .then((data) => resolve(data))
      .catch((err) => reject(`Unable to update note, error: ${err}`));
  });
};

//Delete Note
module.exports.deleteNotes = function (id, noteId) {
  return new Promise(function (resolve, reject) {
    Note.deleteOne({ _id: noteId }, function (err) {
      if (err) {
        reject("There was an error deleting the notes: " + err);
      } else {
        User.findByIdAndUpdate(id, { $pull: { noteId: noteId } }, { new: true })
          .exec()
          .then((data) => resolve(data))
          .catch((err) => {
            reject("There was an error deleting the notes: " + err);
          });
      }
    });
  });
};

//Display note
module.exports.getNotes = function (eventId) {
  return new Promise(function (resolve, reject) {
    Note.find({ eventId: eventId })
      .exec()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(`Unable to get the note, error: ${err}`);
      });
  });
};

//EVENT
//prepare event:
module.exports.addEvent = function (id, eventData) {
  return new Promise(function (resolve, reject) {
    let newEvent = new Event(eventData);
    newEvent.userId = id;
    newEvent.save((err) => {
      if (err) {
        reject("There was an error creating the event: " + err);
      } else {
        User.findByIdAndUpdate(
          id,
          { $addToSet: { eventId: newEvent._id } },
          { new: true }
        )
          .exec()
          .then((data) => resolve(data))
          .catch((err) => {
            reject("There was an error creating the event: " + err);
          });
      }
    });
  });
};
// eventTitle: String,
// start: String,   //missing
// end: String,     //missing
// startTime : Number,
// endTime : Number,
// description : String,  //missing
// daysOfWeek: [Number],
// startRecur: String,    //missing
// endRecur: String,      //missing
// userId: String,
// date: {type: Date, default: Date.now()},
// recurring: String
//update event
module.exports.updateEvent = function (eventId, eventData) {
  return new Promise(function (resolve, reject) {
    if (eventData.recurring == "none") {
      Event.findByIdAndUpdate(
        eventId,
        {
          $set: {
            eventTitle: eventData.eventTitle,
            start: eventData.start,
            end: eventData.end,
            description: eventData.description,
            date: eventData.date,
            recurring: eventData.recurring,
          },
          $unset: {
            startTime: null,
            endTime: null,
            startRecur: null,
            endRecur: null,
            daysOfWeek: null,
          },
        },
        { new: true }
      )
        .exec()
        .then((data) => resolve(data))
        .catch((err) => reject(`Unable to update event, error: ${err}`));
    } else if (eventData.recurring == "daily") {
      Event.findByIdAndUpdate(
        eventId,
        {
          $set: {
            eventTitle: eventData.eventTitle,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            startRecur: eventData.startRecur,
            endRecur: eventData.endRecur,
            date: eventData.date,
            daysOfWeek: null,
            recurring: eventData.recurring,
            start: null,
            end: null,
          },
        },
        { new: true }
      )
        .exec()
        .then((data) => resolve(data))
        .catch((err) => reject(`Unable to update event, error: ${err}`));
    } else if (eventData.recurring == "weekly") {
      Event.findByIdAndUpdate(
        eventId,
        {
          $set: {
            eventTitle: eventData.eventTitle,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            startRecur: eventData.startRecur,
            endRecur: eventData.endRecur,
            date: eventData.date,
            daysOfWeek: eventData.daysOfWeek,
            recurring: eventData.recurring,
            start: null,
            end: null,
          },
        },
        { new: true }
      )
        .exec()
        .then((data) => resolve(data))
        .catch((err) => reject(`Unable to update event, error: ${err}`));
    }
  });
};

//deleteEvent
module.exports.deleteEvent = function (id, eventId) {
  return new Promise(function (resolve, reject) {
    Event.deleteOne({ _id: eventId }, function (err) {
      if (err) {
        reject("There was an error deleting the event: " + err);
      } else {
        User.findByIdAndUpdate(
          id,
          { $pull: { eventId: eventId } },
          { new: true }
        )
          .exec()
          .then((data) => resolve(data))
          .catch((err) => {
            reject("There was an error deleting the event: " + err);
          });
      }
    });
  });
};

//display event
module.exports.getEvent = function (eventId) {
  return new Promise(function (resolve, reject) {
    Event.find({ _id: eventId })
      .exec()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(`Unable to get the event, error: ${err}`);
      });
  });
};

//Display all events
module.exports.getAllEvents = function (id) {
  return new Promise(function (resolve, reject) {
    Event.find({ userId: id })
      .exec()
      .then((user) => {
        resolve(user);
      })
      .catch((err) => {
        reject(`Unable to get events for user with id: ${id}`);
      });
  });
};

//TIMER
//TODO: create new timer
module.exports.addTimer = function (id, eventId, timerData) {
  return new Promise(function (resolve, reject) {
    let newTimer = new Timer(timerData);
    newTimer.userId = id;
    newTimer.eventId = eventId;
    newTimer.save((err) => {
      if (err) {
        reject("There was an error creating the timer: " + err);
      } else {
        User.findByIdAndUpdate(
          id,
          { $addToSet: { timerId: newTimer._id } },
          { new: true }
        )
          .exec()
          .then((data) => resolve(data))
          .catch((err) => {
            reject("There was an error creating the event: " + err);
          });
      }
    });
  });
};

//TODO: edit timer
module.exports.editTimer = function (timerId, timerData) {
  return new Promise(function (resolve, reject) {
    Timer.findByIdAndUpdate(
      timerId,
      {
        $set: {
          timerTitle: timerData.timerTitle,
          timerDuration: timerData.timerDuration,
          breaks: timerData.breaks,
          breakDuration: timerData.breakDuration,
        },
      },
      { new: true }
    )
      .exec()
      .then((data) => resolve(data))
      .catch((err) => reject(`Unable to update timer, error: ${err}`));
  });
};

//TODO: delete timer
module.exports.deleteTimer = function (id, timerId) {
  return new Promise(function (resolve, reject) {
    Timer.deleteOne({ _id: timerId }, function (err) {
      if (err) {
        reject("There was an error deleting the timer: " + err);
      } else {
        User.findByIdAndUpdate(
          id,
          { $pull: { timerId: timerId } },
          { new: true }
        )
          .exec()
          .then((data) => resolve(data))
          .catch((err) => {
            reject("There was an error creating the event: " + err);
          });
      }
    });
  });
};

//TODO: get timer
module.exports.getTimer = function (eventId) {
  return new Promise(function (resolve, reject) {
    Timer.find({ eventId: eventId })
      .exec()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(`Unable to get timer, error: ${err}`);
      });
  });
};
