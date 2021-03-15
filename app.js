//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const morgan = require('morgan');
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.use(morgan('combined'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//creating a user database with mongo
const { Schema } = mongoose;

const userSchema = new Schema ({
  email: String,
  password: String
});

//ENCRYPTION SECTION ***
//APPLYING THE MONGOOSE-ENCRYPTION TO ENCRYPT/## THE PASSWORD FIELD
const secret = 'Aunthenticationmodule.';
userSchema.plugin(encrypt, {secret: secret, encryptFields: ['passwords']});

// CREATING THE MODEL OF THE DATABASE
const User = new mongoose.model('User', userSchema);

app.get("/", (req, res) => {
  res.render("home")
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

// FOR WHEN A NEW USER REGISTERS
app.post('/register', (req, res) => {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save((err) => {
    if(err){
      console.log(err);
    }else{
      res.render('secrets');
    }
  });
});

//LOGIN PAGE THAT CONFIRMS OF THE USERNAME AND PASSWORD MATCHES
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, (err, foundUser) => {
    if(err) {
      console.log(err);
    } else {
      if (foundUser){
        if(foundUser.password === password){
          res.render('secrets');
        }
      }
    }
  });
});

app.listen(3000, function(){
  console.log("Booting on port 3000");
});
