//jshint esversion:6
require('dotenv').config(); // for storing secret String
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const user = require(__dirname + "/model.js");
const User = user;

// Import passport libraries
const session = require('express-session');
const passport = require('passport');

const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.set("view engine", "ejs");

// to enabling Session, it needs to be here, before mongodb connect.
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
// createStrategy function originated from plugin schema in data model
passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

// Google OAuth 2.0
// findOrCreate function originated from plugin schema in data model
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({
            displayName: profile.displayName,
            email: profile._json.email,
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

// Facebook OAuth
// findOrCreate function originated from plugin schema in data model
passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets",
        profileFields: ['id', 'displayName', 'photos', 'emails']
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({
            displayName: profile.displayName,
            facebookId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

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
        if (req.isAuthenticated()) {
            res.redirect("/secrets");
        } else {
            res.render("login");
            console.log("back to login");
        }
    })
    .post((req, res) => {
        const username = req.body.username;
        const password = req.body.password;
        const user = new User({
            username: username,
            password: password
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets")
                });
            }
        });
    });

app.route("/register")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.redirect("/secrets");
        } else {
            res.render("register");
            console.log("back to register");
        }
    })
    .post((req, res) => {
        const username = req.body.username;
        const password = req.body.password;
        User.register({
            username: username
        }, password, (err, user) => {
            if (err) {
                console.log(err);
                res.redirect('/register')
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets")
                });
            }
        });
    });

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        const currentUserId = req.user._id;
        User.findById(currentUserId, (err, result) => {
            if (!err) {
                res.render("secrets", {displayName: result.displayName , secret: result.secret})
            } else {
                console.log(err);
            }
        });
    } else {
        res.redirect("/login")
        console.log("login failed");
    }
});

app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

// For Google authentication
app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect secrets page.
        res.redirect("/secrets");
    });


// For Facebook authentication
app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

// Submit Secrets
app.route("/submit")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login")
            console.log("login failed");
        }
    })
    .post((req, res) => {
        const submittedSecret = req.body.secret;
        const currentUserId = req.user._id;
        User.findOneAndUpdate({_id: currentUserId},
            {secret: submittedSecret},
            (err) => {
                if (!err) {
                    res.redirect("/secrets");
                }
            });
        });

app.listen((3000), () => {
    console.log("Server run on port localhost:3000");
})