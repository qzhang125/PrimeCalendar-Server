const mongoose = require('mongoose');
//mongoose.set('useFindAndModify', false); //https://mongoosejs.com/docs/deprecations.html#findandmodify
const bcrypt = require('bcryptjs');

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    event: 
    [{
        eventId: Number, 
        eventTitle: String, 
        startTime: String, 
        endTime: String, 
        date: {type: Date, default: Date.now()}, 
        dayOfWeek: Number,
        recurring: Boolean, 
        noteForEvent: 
        {
            noteID: Number,
            noteTitle: String,
            noteText: String,
            creationDate: {type: Date, default: Date.now()},
            lastEditedDate: Date,
            heading: { title: String, lineNum: Number},
            subHeading: { title: String, lineNum: Number},
        },
        timer: 
        [{
            timerID: Number,
            timerTitle: String,
            timerDuration: Number,
            breaks: Boolean,
            breakDuration: Number
        }]
    }]
});
let User;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(mongoDBConnectionString, { useUnifiedTopology: true });

        db.on('error', err => {
            reject(err);
        });

        db.once('open', () => {
            User = db.model("Account", userSchema);  
            resolve();
        });
    });
};

module.exports.registerUser = function (userData) {
    return new Promise(function (resolve, reject) {

        if (userData.password != userData.password2) {
            reject("Passwords do not match");
        } else {

            bcrypt.hash(userData.password, 10).then(hash => {

                userData.password = hash;

                let newUser = new User(userData);

                newUser.save(err => {
                    if (err) {
                        if (err.code == 11000) {
                            reject("User Name already taken");
                        } else {
                            reject("There was an error creating the user: " + err);
                        }

                    } else {
                        resolve("User " + userData.userName + " successfully registered");
                    }
                });
            })
                .catch(err => reject(err));
        }
    });
};

module.exports.checkUser = function (userData) {
    return new Promise(function (resolve, reject) {

        User.findOne({ userName: userData.userName })
            .exec()
            .then(user => {
                bcrypt.compare(userData.password, user.password).then(res => {
                    if (res === true) {
                        resolve(user);
                    } else {
                        reject("Incorrect password for user " + userData.userName);
                    }
                });
            }).catch(err => {
                console.log(err);
                reject("Unable to find user " + userData.userName);
            });
    });
};
//EVENTS
//TODO: create new event

//TODO: edit event

//TODO: delete event

//NOTES
//TODO: create new notes

//TODO: edit notes

//TODO: delete notes

//TIMER
//TODO: create new timer

//TODO: edit timer

//TODO: delete timer