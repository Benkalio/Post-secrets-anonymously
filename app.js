//jshint esversion:6

// INITIALIZING THE .ENV VARIABLE TO KEEP FILES HIDDEN AS THEY ARE UPLOADED ONLINE
require('dotenv').config();

//NODEJS DEPENDENCIES
const express = require('express'),
  bodyParser = require('body-parser'),
  ejs = require('ejs'),
  morgan = require('morgan'),
  mongoose = require('mongoose'),
  findOrCreate = require('mongoose-findorcreate'),
  passportLocalMongoose = require('passport-local-mongoose'),
  passport = require('passport'),
  util = require('util'),
  Strategy = require('passport-strategy'),
  session = require('express-session'),
  
  //OAUTH STRATEGY FOR GOOGLE AUTHORIZATION
  GoogleStrategy = require('passport-google-oauth20').Strategy,
  HttpsProxyAgent = require('https-proxy-agent');

//commenting out bcrypt to implement passportjs
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

// const encrypt = require("mongoose-encryption");

//USING MD5 TO HASH OUR USER PASSWORD
// const md5 = require('md5');

const app = express();
app.use(express.static("public"));
app.use(morgan('combined'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//FOR SESSIONs COOKIE EXPRESS
app.use(session({
  secret: 'One love keep us together',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true
  }
}));

//INITIALIZE PASSPORT AND SETUP SESSION
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
//FOR REMOVAL OF DEPRECATION WARNING ON MONGOOSE
mongoose.set('useCreateIndex', true);

//USER SCHEMA FOR MODELING MONGO DB
const { Schema } = mongoose;

const userSchema = new Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//ENABLE AND USE PASSPORT LOCAL MONGOOSE TO HASH AND STORE USER DATA
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//ENCRYPTION SECTION ***
//APPLYING THE MONGOOSE-ENCRYPTION TO ENCRYPT/## THE PASSWORD FIELD
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptFields: ['passwords']});

// CREATING THE MODEL OF THE DATABASE
const User = new mongoose.model('User', userSchema);
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
//REPLACED WITH PASSPORT METHOD
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//IMPLEMENTING OAUTH USING PASSPORTJS
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'http://localhost:1000/auth/google/secrets',

  //FOR GOOGLE PLUS DEPRECATION
  userProfileUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
}, function(accessToken, refreshToken, profile, cb){
  User.findOrCreate({googleId: profile.id}, (err, user)=>{
    return cb(err, user)
  });
}));

app.get("/", function(req, res) {
  res.render("home")
});

//ROUTE FOR THE LOGIN WITH THEIR GOOGLE ACCOUNT, INITIATING AUTHENTICATION ON GOOGLE SERVER
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
//ROUTE WHEN USERS LOGS IN TO REDIRECT TO THE SECRETS PAGE OR LOG IN AGAIN
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) =>{
    // Successful authentication, redirect SECRETS.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

//RENDERING SECRET PAGE TO BOTH LOGGED IN USERS AND NON-LOGGED IN USERS
app.get('/secrets', function(req, res){
  //$NE IS SHORT FOR NOT EQUAL TO NULL
  User.find({'secret': {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    } else{
      if(foundUsers){
        res.render('secrets', {usersWithSecrets: foundUsers});
      }
    }
  });
});

// //SECRET PAGE FOR REGISTERED USERS
// app.get('/secrets', (req, res)=>{
//   if(req.isAuthenticated()){
//     res.render('secrets');
//   } else{
//     res.redirect('/login');
//   }
// });

//FOR USERS TO SUBMIT A SECRET AND VIEW OTHER SECRETS
app.get('/submit', function(req, res){
  if(req.isAuthenticated()){
    res.render('submit');
  } else{
    res.redirect('/login');
  }
});

//POSTING SECRETS ON THE SECRETS PAGE
app.post('/submit', function(req, res){
  const submittedSecret = req.body.secret;
  // console.log(req.user.id);

  User.findById(req.user.id, (err, foundUser)=>{
    if(err){
      console.log(err);
    } else {
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(()=>{
          res.redirect('/secrets');
        });
      }
    }
  });
});

//LOGOUT 
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// FOR WHEN A NEW USER REGISTERS
app.post('/register', function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      //REDIRECT FAILED REGISTRATION TO REGISTER AGAIN
      res.redirect('/register');
    } else {
      //CREATE A COOKIE THAT AUTHENTICATES USERS WITH LOCAL PASSPORT
      passport.authenticate('local')(req, res, ()=>{
        res.redirect('/secrets');
      });
    }
  });

  // //USING BCRYPT TO HASH PASSWORD AND STORE THE HASH IN THE DATA BASE
  // bcrypt.genSalt(saltRounds, function(err, salt) {
  //   bcrypt.hash(req.body.password, salt, function(err, hash) {
  //     const newUser = new User({
  //       email: req.body.username,
  //       password: hash
  //     });
    
  //     newUser.save((err) => {
  //       if(err){
  //         console.log(err);
  //       }else{
  //         res.render('secrets');
  //       }
  //     });
  //   });
});

//LOGIN PAGE THAT CONFIRMS OF THE USERNAME AND PASSWORD MATCHES
app.post('/login', function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    } else{
      passport.authenticate('local')(req, res, function(){
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(1000, function(){
  console.log("Booting on port 1000");
});
