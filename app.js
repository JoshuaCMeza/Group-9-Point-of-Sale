var express = require('express');
var dboperation = require('./dboperation');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var config = require('./dbconfig');
var sql = require('mssql');
var session = require('express-session');
var flash = require('connect-flash');
var app = express();

var index = require('./routes/index');
var signup = require('./routes/signup');
var productCatalog = require('./routes/productCatalog');
var insertForm = require('./routes/insertForm');
var viewInventory = require('./routes/viewInventory');
var mainAdmin = require('./routes/mainAdmin');
var mainUser = require('./routes/mainUser');
var logout = require('./routes/logout');
var contact = require('./routes/contact');
var about = require('./routes/about');
var login = require('./routes/login');
var geoReport = require('./routes/geoReport');




app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: 'secret',
    cookie: {maxAge : 60000},
    resave: true,
    saveUninitialized: true
}));
app.use(flash());


app.use('/', index);
app.use('/signup', signup);
app.use('/productCatalog', productCatalog);
app.use('/contact', contact);
app.use('/about', about);
app.use('/mainAdmin', mainAdmin)
app.use('/mainUser', mainUser);
app.use('/insertForm', insertForm);
app.use('/viewInventory', viewInventory);
app.use('/logout', logout);
app.use('/login', login);
app.use('/geoReport', geoReport);
app.use(express.static("public"));


app.post('/login', function(req, res) {
    let username = req.body.username;
    let password = req.body.password;
    var query = "SELECT * FROM [dbo].[users] WHERE username = \'"+username+"\' AND pword = \'"+password+"\';"
    sql.connect(config, function(err) {
        if(err) console.log(err);
        var request = new sql.Request();
        request.query(query, function(err, row) {
            if(err) {
                req.flash('message', 'Something went wrong, please try again');
                res.redirect('/login');
            }
            if(row.recordsets[0].length == 0) {
                req.flash('message', 'Username and/or Password is incorrect. Please try again');
                res.redirect('/login');
            }
            else {
                req.session.userID = row.recordsets[0][0].userID;
                req.session.isAdmin = row.recordsets[0][0].isAdmin;
                if(row.recordsets[0][0].isAdmin == 1) {
                    res.redirect('mainAdmin');
                }
                else {
                    res.redirect('mainUser');
                }
            }
        })
    })
});

app.post('/signup', function(req, res) {

    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.pword;
    let passwordConfirmation = req.body.pwordConfirmation;

    if(password.length < 5) {
        req.flash('message', 'Password needs to be longer than 5 characters')
        res.redirect('/signup');
    }

    if(password != passwordConfirmation) {
        req.flash('message', 'Password Confirmation must match Password')
        res.redirect('/signup');
    }

    var queryUser = "SELECT * FROM [dbo].[users] WHERE username = \'"+username+"\';"
    var queryEmail = "SELECT * FROM [dbo].[users] WHERE email = \'"+email+"\';"

    sql.connect(config, function(err) {
        if(err) console.log(err);
        var request = new sql.Request();
        request.query(queryUser, function(err, recordset) {
            if(err) {
                req.flash('message', 'Something went wrong, please try again');
                res.redirect('/signup');
            }
            if(recordset.recordsets[0].length == 0) {
                var request = new sql.Request();
                request.query(queryEmail, function(err, recordset) {
                    if(err) {
                        req.flash('message', 'Something went wrong, please try again');
                        res.redirect('/signup');
                    }
                    if(recordset.recordsets[0].length == 0) {
                        var querySignUp = "INSERT INTO [dbo].[users] (username, email, pword) VALUES ('"+req.body.username+"','"+req.body.email+"','"+req.body.pword+"')";
                        dboperation.insertQuerySignup(querySignUp);
                        req.flash('message', 'Welcome Aboard! Please user new your credentials to sign in!');
                        res.redirect('/');
                    }
                    else {
                        req.flash('message', 'This email is already taken');
                        res.redirect('/signup');
                    }
                })
            }
            else {
                req.flash('message', 'This username is already taken');
                res.redirect('/signup');
            }
        })
    })

});

dboperation.getUsers().then(res => {
    console.log(res);
});

app.post('/insertForm', (req, res) => {
    var query = "INSERT INTO [dbo].[products] VALUES(\'"+req.body.productName+"\', \'"+req.body.productType+"\', \'"+req.body.productDesc+"', '"+req.body.size+"', '"+req.body.color+"', "+req.body.price+", "+req.body.productQuantity+", "+req.body.discount+");";
    dboperation.insertQuery(query);
});

app.post('/viewSingleProduct', (req, res) => {
    var query = "SELECT * FROM [dbo].[products] WHERE fullName = '"+req.body.fullName+"';";
    sql.connect(config, function(err) {
        if(err) res.send(err);
        var request = new sql.Request();
        request.query(query, function(err, rows) {
            if(err) res.send(err);
            res.render('singleProduct', {data: rows.recordsets[0], userID: req.body.userID, isAdmin: req.body.isAdmin})
        })
    })
})

app.post('/addToCart', (req, res) => {
    productID = req.body.productID;
    userID = req.body.userID;
    isAdmin = req.body.isAdmin;
    sql.connect(config, function(err) {
        if(err) res.send(err);
        var request = new sql.Request();
        if(!isAdmin) {
            var query = "SELECT * FROM [dbo].[shoppingCart] WHERE productID = "+productID+" AND customerID = "+userID+";";
            var request = new sql.Request();
            request.query(query, function(err, row) {
                if(err) res.send(err);
                if(row.recordsets[0].length == 0) {
                    var query = "INSERT INTO [dbo].[shoppingCart] (customerID, productID, numItems) VALUES("+userID+", "+productID+", 1);"
                    var request = new sql.Request();
                    request.query(query, function(err) {
                        if(err) res.send(err);
                        else {
                            req.flash('message', 'Successfully added to cart');
                            res.redirect('productCatalog');
                        }
                    })
                }
                else {
                    var query = "UPDATE [dbo].[shoppingCart] SET numItems = numItems + 1 WHERE customerID = "+userID+" AND productID = "+productID+";";
                    var request = new sql.Request();
                    request.query(query, function(err) {
                        if(err) res.send(err);
                        else {
                            req.flash('message', 'Successfully updated cart');
                            res.redirect('productCatalog');
                        }
                    })
                }
            })
        }
        else {
            var query = "SELECT * FROM [dbo].[shoppingCart] WHERE productID = "+productID+" AND userID = "+userID+";";
            var request = new sql.Request();
            request.query(query, function(err, row) {
                if(err) res.send(err);
                if(row.recordsets[0].length == 0) {
                    var query = "INSERT INTO [dbo].[shoppingCart] (userID, productID, numItems) VALUES("+userID+", "+productID+", 1);"
                    var request = new sql.Request();
                    request.query(query, function(err) {
                        if(err) res.send(err);
                        else {
                            req.flash('message', 'Successfully added to cart');
                            res.redirect('productCatalog');
                        }
                    })
                }
                else {
                    var query = "UPDATE [dbo].[shoppingCart] SET numItems = numItems + 1 WHERE userID = "+userID+" AND productID = "+productID+";";
                    var request = new sql.Request();
                    request.query(query, function(err) {
                        if(err) res.send(err);
                        else {
                            req.flash('message', 'Successfully updated cart');
                            res.redirect('productCatalog');
                        }
                    })
                }
            })
        }
    })
})



const port = process.env.PORT || 3000




app.listen(port, () => console.log("Listening on port " + port));

module.exports = app;