var http = require("http");
var path = require("path");
var express = require("express");
var morgan = require("morgan");
var bodyParser = require("body-parser");
var mongodb = require('mongodb');
var url = require('url');
var app = express();
var config = require('./config');

app.set("views", path.resolve(__dirname, "views")); // path.resolve or path.join?
app.set("view engine", "ejs");

var db = null,
    dbDetails = new Object();

// Use the prom-client module to expose our metrics to Prometheus
const client = require('prom-client');

// Enable prom-client to expose default application metrics
const collectDefaultMetrics = client.collectDefaultMetrics;

// Define a custom prefix string for application metrics
collectDefaultMetrics({ prefix: 'guestbook2:' });

var entries = [];
app.locals.entries = entries;

// Display requests at the console
app.use(morgan("combined"));

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Set the MongoDB connection
initDB();

app.get("/", function(request, response) {
  response.render("index");
});

app.get("/new-entry", function(request, response) {
  response.render("new-entry");
});

app.post("/new-entry", function(request, response) {
  if (!request.body.title || !request.body.body) {
    response.status(400).send("Entries must have a title and a body.");
    return;
  }
  entries.push({
    title: request.body.title,
    body: request.body.body,
    published: new Date().toUTCString() 
  });

  if (db) {
    // Create a new collection called records
    var col = db.collection('records');

    // Create a record with the title and the body
    col.insert({title: request.body.title, body: request.body.body, published: Date.now()});
  }
  response.redirect("/");
});

//app.get("/delete-entry", function(request, response) {
//  const queryObject = url.parse(request.url, true).query;
  //console.log(JSON.stringify(queryObject.title));

//  for(var i=0; i<entries.length; i++) {
//    if(entries[i].title == queryObject.title) {
//      entries.splice(i, 1);
//      if(db) {
//        var col = db.collection('records');
//        col.remove({title: queryObject.title}, true);
//      } 
//      break;
//    } 
//  } 

  response.redirect("/");
});

app.use(function(request, response) {
  response.status(404).render("404");
});

// Expose our metrics at the default URL for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

http.createServer(app).listen(config.port, function() {
  console.log("Guestbook2 app started on port "+config.port+".");
});

function initDB() {
  mongodb.connect(config.mongoURL, function(err, conn) {
    if (err) {
      console.log("Can't connect to MongoDB!");
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = config.mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', config.mongoURL);
    
    let col = db.collection('records');

    col.find().toArray((err, result) => {
      //console.log(JSON.stringify(result));
      result.forEach(function(entry) {
        entries.push({
          title: entry.title,
          body: entry.body,
          published: new Date(entry.published).toUTCString() 
        });
      });
      //console.log(JSON.stringify(entries));
    });
  });
};
