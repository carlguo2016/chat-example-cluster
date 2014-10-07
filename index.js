var cluster = require('cluster');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('redis');
var redisAdapter = require('socket.io-redis');

var port = process.env.PORT || 3333;
// var workers = process.env.WORKERS || require('os').cpus().length;
var workers = 3;

var redisUrl = process.env.REDISTOGO_URL || 'redis://127.0.0.1:6379';
var redisOptions = require('parse-redis-url')(redis).parse(redisUrl);
var pub = redis.createClient(redisOptions.port, redisOptions.host, {
  detect_buffers: true,
  auth_pass: redisOptions.password
});
var sub = redis.createClient(redisOptions.port, redisOptions.host, {
  detect_buffers: true,
  auth_pass: redisOptions.password
});

io.adapter(redisAdapter({
  pubClient: pub,
  subClient: sub
}));

console.log('Redis adapter started with url: ' + redisUrl);

app.get('/', function(req, res) {
  console.log('express request handled by process '+process.pid);
  res.sendfile('index.html');
});

io.on('connection', function(socket) {

  console.log('Connection made. socket.id='+socket.id+' . pid = '+process.pid);

  socket.on('chat_in', function(msg) {
    console.log('emitting message: '+msg+' . socket.id='+socket.id+' . pid = '+process.pid);
    io.emit('chat_out', 'Process '+process.pid+': '+msg);
  });
  socket.on('disconnect', function(){
    console.log('socket disconnected. socket.id='+socket.id+' . pid = '+process.pid);
  });

  socket.emit('chat_out', 'Connected to socket server. Socket = '+socket.id+'.  Process = '+process.pid);
});

if (cluster.isMaster) {
  console.log('start cluster with %s workers', workers - 1);
  console.log('master pid is', process.pid);
  workers--;
  for (var i = 0; i < workers; ++i) {
    var worker = cluster.fork();
    console.log('worker %s started.', worker.process.pid);
  }

  cluster.on('death', function(worker) {
    console.log('worker %s died. restart...', worker.process.pid);
  });
} else {
  start();
}

function start() {
  http.listen(port, function() {
    console.log('worker: ' + process.pid+' listening on port ' + port);
  });
}


