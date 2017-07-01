const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const md5 = require('md5');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false })); 

mongoose.connect('mongodb://localhost/gb');

var Test = mongoose.model('Test', new Schema({ name: String }));

var first = new Test({ name: 'onStart' });
first.save();

var userSchema = new Schema({
  name: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String
}, { collection: 'users' });

var deedSchema = new Schema({
  pos: {type: [Number], index: '2dsphere'},
  photo: String,
  name: String,
  description: String,
  created_at: Number,
  created_by: String,
  status: String
});

var Deed = mongoose.model('Deed', deedSchema)
var User = mongoose.model('User', userSchema);

module.exports = User;
module.exports = Deed;


app.get('/', function(req,res) {
  res.send("Карта добрых дел")
})
app.get('/ping', function (req, res) {
  res.json({ping: 'pong'});
});

app.post('/signup', function (req, res) {
  var data = req.body;
  var user = new User({
    name: data.name,
    username: data.username,
    password: data.password,
    email: data.email
  });
  user.save(function(err) {
    if(err) {
      res.json({
        status: 'failed'
      })
      return;
    }
    res.json({
       status: "ok. you're in"
    })
  })
});


app.post('/oath', function (req, res) {
  var user = req.body.username;
  var pass = req.body.password;
  console.log(user,pass)
  
  User.findOne({
    username: user,
    password: pass
  }, function(err, user) {
    if(err) {
      console.log('err ', err);
      return;
    } else {
      res.json({token: user._id})
    }
  })
});

app.post('/deed', function (req, res) {
  var data = req.body;
  console.log(data)
  if (data.pos == undefined) {
    res.send('Нет позиции')
  }
  if (data.pos.lat == undefined) {
    res.send('Нет долготы')
  }
  if (data.pos.lon == undefined) {
    res.send('Нет ширины')
  }
  if (data.name == undefined) {
    res.send('Нет имени задания')
  }
  var deed = new Deed({
        pos: [data.pos.lat, data.pos.lon],
        photo: data.photo,
        name: data.name,
        description: data.description,
        created_at: Date.now(),
        status: 'created'
    });
    deed.save(function(err, deed) {
      if(err) {
        res.json({
          status: 'failed'
        })
        return;
      }
      res.json(deed)
    })
});

app.get('/deed', function(req, res) {
  var center = [56.3225259, 44.0075022];
  var max = 5000000;
  var params = req.query;
  var squery = {}
  if (params.status) {
    squery.status = params.status;
    console.log(squery)
    res.send(squery)
  }
  if (params.radius) {
    var radius = params.radius;
    max = radius;
  }
  if (params.lat && params.lon) {
    var lat = params.lat;
    var lon = params.lon;
    center = [params.lat, params.lon];
  }

  squery.pos = {
    "$near" :
      {
        "$geometry": { type: "Point",  coordinates: center },
        "$maxDistance": max
      }
  }
  console.log(squery);
  Deed.find(squery, function(err, deeds) {
      if(err) {console.log(err); return}
      var deedsMap = {};
      if (deeds != undefined) {
        deeds.forEach(function(deed) {
          var outputDeed = {
            pos: {lat: deed.pos[0], lon: deed.pos[1]},
            photo: deed.photo,
            name: deed.name,
            description: deed.description,
            created_at: deed.created_at,
            status: deed.status
          }
        deedsMap[deed._id] = outputDeed;
      });
      } else {
        res.send("0 Результатов")
      }
      
    res.json(deedsMap);  
    })
})

// Версия с токеном
// app.post('/deed', function(req, res) {
//   var token = req.query.token;
//   var data = req.body;
//   console.log(token, data)
//   User.findOne({_id: token}, function(err, user) {
//     if (err) {return}
//     if (!user) {return}
//     var deed = new Deed({
//         pos: [data.pos.lat, data.pos.lon],
//         photo: data.photo,
//         name: data.name,
//         description: data.description,
//         created_at: Date.now(),
//         created_by: user.username,
//         status: 'created'
//     })
//     deed.save(function(err, deed) {
//       if(err) {
//         res.json({
//           status: 'failed'
//         })
//         return;
//       }
//       res.json({
//          status: "ok",
//          id: deed._id
//       })
//     })
//   })
// });

app.put('/deed/:id', function(req, res) {
  //var token = req.query.token;
  var id = req.params.id;
  var data = req.body;
  console.log(id, body);
  Deed.findByIdAndUpdate(id, { "$set": body}, { new: true }, function (err, deed) {
  if (err) return handleError(err);
    res.send(deed);
  });
});



app.listen(4000, function () {
  console.log('Example app listening on port 4000!');
});
