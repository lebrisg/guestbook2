var http = require("http");
var path = require("path");
var express = require("express");
var morgan = require("morgan");
var bodyParser = require("body-parser");
var mongodb = require('mongodb');
var app = express();

app.set("views", path.resolve(__dirname, "views")); // path.resolve or path.join?
app.set("view engine", "ejs");

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;

  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}

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
initDb();

// Load records in memory
//loadDb();

app.get("/", function(request, response) {
  response.render("index");
});

app.get("/display", function(request, response) {
  // Try to initialize the db on every request if it's not already initialized.
  //if (!db) {
  //  initDb(function(err){});
  //}
  if (db) {
    var col = db.collection('records');
    // Count row number
    //col.count(function(err, count) {
    //  if (err) console.log('Error running count. Message:\n'+err);
    //  console.log('Count: ', count);
    //});
   
    console.log('count=', entries.length); 
    // console.log('count=', col.count()); 
    //col.find();
  }
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
    published: new Date()
  });

  // Try to initialize the db on every request if it's not already initialized.
  //if (!db) {
  //  initDb(function(err){});
  //}
  if (db) {
    // Create a new collection called records
    var col = db.collection('records');

    // Create a record with the title and the body
    col.insert({title: request.body.title, body: request.body.body, published: Date.now()});
  }
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

http.createServer(app).listen(8080, function() {
  console.log("Guestbook2 app started on port 8080.");
});

function initDb() {
  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      console.log("Can't connect to MongoDB!");
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
    
    let col = db.collection('records');

    console.log('test2');
    col.find().toArray((err, result) => {
      console.log(JSON.stringify(result));
  });
};

// Load records in memory
function loadDb() {
  // Try to initialize the db on every request if it's not already initialized.
  //if (!db) {
  //  initDb(function(err){});
  //}
  console.log('Test');
  console.log('db=', db);
  if (db) {
    // Create a new collection called records
    var col = db.collection('records');

    console.log('test2');
    col.find().toArray((err, result) => {
      console.log(JSON.stringify(result));
    }); 

//    console.log('count: ', col.count());

//    col.find(function(err, data) {
//      if(err) console.log(err);

//      data.forEach(function(result) {
//        entries.push(result);
//      })
//      console.log(entries);
//    })

//    col.find().toArray(function(err, docs) {
//      if (err) throw err;
//      entries = docs;
//    });
  } 
}
