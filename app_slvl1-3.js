//jshint esversion:6
require('dotenv').config(); // for storing secret String
// const md5 = require('md5'); //for making hash function for password Level 3
const bcrypt = require('bcrypt'); // bcrypt is for Level 4 security: hashing and salting
// using hashing and salting, you have to specify Salt Round
const saltRounds = 10;

const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require(__dirname + "/model.js");
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/usersDB?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.6.1")
    .then(() => {
        console.log("Database connected");
    })
    .catch((err) => {
        console.log(err);
    });


app.get("/", (req, res) => {
    res.render("home");
});

app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post((req, res) => {
        // ====================== Level 4: hashing and salting ====================== //
        const email = req.body.username;
        const password = req.body.password;
        User.findOne({
            email: email
        }, (err, result) => {
            if (result) {
                bcrypt.compare(password, result.password, (err, out) => {
                    if (out === true) {
                        res.render("secrets");
                    } else {
                        res.send("Please check if your password is correct.");
                    }
                });
            } else {
                console.log(err);
            }
        });

        // ================================================================== //
        // ===================== Level 3: only hashing ====================== //
        // const email = req.body.username;
        // const password = md5(req.body.password);
        // User.findOne({email: email}, (err, result) =>{
        //     if (result) {
        //         if (password === result.password) {
        //             res.render("secrets");
        //         } else {
        //             res.send("Please check if your password is correct.");
        //         }      
        //     } else {
        //         console.log(err);
        //     }
        // });

        // ================================================================== //
    });

app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post((req, res) => {
        // ====================== Level 4: hashing and salting ====================== //
        bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
            const email = req.body.username;
            const password = hash;
            const newUser = new User({
                email: email,
                password: password
            });
            newUser.save((err) => {
                if (!err) {
                    res.render("secrets")
                } else {
                    console.log(err);
                }
            });
        });

        // ================================================================== //
        // ===================== Level 3: only hashing ====================== //
        // const email = req.body.username;
        // const password = md5(req.body.password);
        // const newUser = new User({
        //     email: email,
        //     password: password
        // });
        // newUser.save((err) => {
        //     if (!err) {
        //         res.render("secrets")
        //     } else {
        //         console.log(err);
        //     }
        // });
        // ================================================================== //
    });

app.listen((3000), () => {
    console.log("Server run on port localhost:3000");
})