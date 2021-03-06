var mongoose = require('mongoose');
var uriUtil = require('mongodb-uri');
var options = { server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 }}};       
var mongodbUri = process.env.PROD_MONGODB;
var mongooseUri = uriUtil.formatMongoose(mongodbUri);
var Location = require('./models/location.js');

mongoose.connect(mongooseUri, options);
console.log("MongoDB connection URI = " + mongodbUri)
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function callback () {
  console.log("MongoDB opened.");
});

module.exports = {
  find: find,
  load: load
}

function find (searchText, cb) {
  if (searchText) {
    searchText = '\"' + searchText + '\"';
  }
  Location
    .find(searchText?{'$text':{'$search':searchText}}:{})
    .sort('name')
    .exec(function (err, links) {
      err?console.log("DB - find error: " + JSON.stringify(err)):null;
      cb(links?links:[]);
  })
}

function load(fileUrl, cb) {
  var request = require('request');
  var Converter = require("csvtojson").core.Converter;
  var converter = new Converter({constructResult:true});
  cb("Uploading file...");
  try {
    converter.on("end_parsed",function(jsonObj){
      console.log(jsonObj); //here is your result json object 
      cb(jsonObj.length + " records uploaded. Saving data...");
        mongoose.connection.db.dropCollection('locations', function(err, result) {
          Location.collection.insert(jsonObj, function (err, docs) {
            if (err) {
              cb("DB error on insert:" + JSON.stringify(err))
            }
            else {
              cb("Database updated. Re-Indexing...");
              Location.ensureIndexes(function (err) {
                if (err) {
                  cb("Error indexing: " + JSON.stringify(err))
                }
                else {
                  cb("Indexing complete.");
                }
              });
            }

        });
      });
   
    });

    request(fileUrl).pipe(converter);
  }
  catch (e) {
    cb("Error importing file: " + JSON.stringify(e))
  }
}

// function load (url) {
//   var Tabletop = require('tabletop');

//   Tabletop.init( { key: url,
//                    callback: function(data, tabletop) { console.log(data) },
//                    simpleSheet: true } )
// };

