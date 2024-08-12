const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const postModel = require("./models/post");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.render("index");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.post("/register",async (req,res)=>{
    let {username,name,email,age,password} = req.body;

    let user = await userModel.findOne({email});
    if(user) return res.status(500).send("User already exist");

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt,async function(err, hash) {
        let createdUser = await userModel.create({
            username,
            name,
            age,
            email,
            password: hash
        });
      let token = jwt.sign({email: createdUser.email,userID: createdUser._id},"secret");
      res.cookie("token",token);
      res.send(createdUser);
    });
});
});

app.post("/login",async (req,res)=>{
    let {password,email} = req.body;

    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("Something went wrong");

    bcrypt.compare(password, user.password, function(err, result) {
        if(result) {
            let token = jwt.sign({email: email,user: user._id},"secret");
            res.cookie("token",token);
            res.redirect("/profile");
        }
        else res.send("Something went wrong");
    });

});

app.post("/post",async (req,res)=>{
    let user = await userModel.findOne({email:req.body});
    console.log(user);
    let {content} = req.body;

    if(!user) res.send("User does not exist");
     
    let post = await postModel.create({
        user: user._id,
        content: content
    });
    
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});

app.get("/logout",(req,res)=>{
    res.cookie("token","");
    res.redirect("/login");
});

app.get("/profile",isLoggedIn,async (req,res)=>{
    let {username,name,email,age,password} = req.user;

    let user = await userModel.findOne({email});
    if(user.posts==null) res.redirect("profile",{user});
    user.populate("posts");
    console.log(user);
    res.render("profile",{user});
});

function isLoggedIn(req,res,next){
    if(req.cookies.token==="") res.redirect("/login");
    else{
        let data = jwt.verify(req.cookies.token,"secret");
        req.user = data;
    }
    next();
}

app.listen(2001,()=>{
    console.log("server started");
});