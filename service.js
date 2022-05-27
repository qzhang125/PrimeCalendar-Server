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
module.exports.createNotes = function (noteContent) {

    return new Promise(function (resolve, reject) {

        let newNote = new User(noteContent);

        newNote.save(err => {
            if (err) {
                reject("There was an error creating the note: " + err);
            } else {
                resolve("New note is successfully created");
            }
        });
    });
}

//TODO: update notes
module.exports.updateNotes = function (data, id) {

    return new Promise(function (resolve, reject) {

        User.findById(id).exec().then(user => {
                User.event.noteForEvent.findByIdAndUpdate(id,
                    { $Set: {noteText: data } }
                ).exec()
                    .then(user => { resolve(user.event.noteForEvent); })
                    .catch(err => { reject(`Unable to update the note for user with id: ${id}`); })
        })

    });

}
//TODO: delete notes
module.exports.removeNotes = function (id, noteID) {
    return new Promise(function (resolve, reject) {
        User.findByIdAndUpdate(id,
            { $pull: { noteForEvent: noteID } },
            { new: true }
        ).exec()
            .then(user => {
                resolve(user.event.noteForEvent);
            })
            .catch(err => {
                reject(`Unable to delete the note for user with id: ${id}`);
            })
    });
}
//TODO: display notes
module.exports.getNotes = function (id) {
    return new Promise(function (resolve, reject) {
        User.findById(id)
            .exec()
            .then(user => {
                resolve(user.event.noteForEvent)
            }).catch(err => {
                reject(`Unable to get notes for user with id: ${id}`);
            });
    });
}
//TIMER
//TODO: get timer
module.exports.getTimer = function(id,eventId){
    User.find({_id:id,"event.eventId":eventId}).exec()
        .then(user => {resolve(user.event.timer)})
        .catch(err=>{reject(`Unable to get timer with error: ${err}`)})
}
//TODO: create new timer
module.exports.addTimer = function(id,eventId,timerData){
    User.findOneAndUpdate({_id:id,"event.eventId":eventId},
        {$addToSet:{"timer.timerID":timerData.timerId,
                    "timer.timerTitle":timerData.timerTitle,
                    "timer.timerDuration":timerData.duration,
                    "timer.breaks":timerData.breaks,
                    "timer.breakDuration":timerData.breakDuration}},
        {new:true}).exec()
        .then(user => {resolve(user.event.timer)})
        .catch(err=>{reject(`Unable to add timer with error: ${err}`)})
}
//TODO: edit timer
module.exports.editTimer = function(id,timerId,timerData){
    User.findOneAndUpdate({_id:id,"timer.timerID":timerId},
        {$Set:{     "timer.timerTitle":timerData.timerTitle,
                    "timer.timerDuration":timerData.duration,
                    "timer.breaks":timerData.breaks,
                    "timer.breakDuration":timerData.breakDuration}},
        {new:true}).exec()
        .then(user => {resolve(user.event.timer)})
        .catch(err=>{reject(`Unable to edit timer with error: ${err}`)})
}
//TODO: delete timer
module.exports.deleteTimer = function(id,timerId){
    User.findOneAndUpdate({_id:id,"timer.timerID":timerId},
        {$pull:{"timer.timerID":timerId}},
        {new:true}).exec()
        .then(user => {resolve(user.event.timer)})
        .catch(err=>{reject(`Unable to delete timer with error: ${err}`)})
}