//imports
var express = require('express')
var mustache = require('mustache-express');
var bodyParse = require("body-parser");
var app = express();




//configuracion
app.use(express.static(__dirname + '/static'));
app.use(bodyParse.json());       // to support JSON-encoded bodies
app.use(bodyParse.urlencoded({extended: true}));
app.engine('.html', mustache());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
var sessions = {};
var usersInSessionLimit = 15;
app.ses = Math.round(Math.random() * 10);
// rutas
app.get('/', function (req, res) {
    res.render('index', {"app": "Hola mundo"});
});



app.get("/camara", function (req, res) {
    res.render('camara', {session: app.ses});
});

app.get('/administrador', function (req, res) {
    res.render('admin', {
        session: app.ses
    });
});

app.get('/principal', function (req, res) {
    res.render('principal', {
        session: app.ses
    });
});

app.all('/ctos/:sessionId/:userId/:peerId', function (req, res, next) {
    var headers = {
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "Expires": "0"
    };
    var sessionId = req.params.sessionId;
    var userId = req.params.userId;
    var peerId = req.params.peerId;
    var peer;
    var session = sessions[sessionId];
    if (!session || !(peer = session.users[peerId])) {
        res.writeHead(400, headers);
        console.log(session);
        res.end();
        return;
    }
    var body = "";
    req.on("data", function (data) {
        body += data;
    });
    req.on("end", function () {
        console.log("@" + sessionId + " - " + userId + " => " + peerId + " :");
        var evtdata = "data:" + body.replace(/\n/g, "\ndata:") + "\n";
        peer.esResponse.write("event:user-" + userId + "\n" + evtdata + "\n");
    });
    headers["Content-Type"] = "text/plain";
    res.writeHead(204, headers);
    res.end();
})

app.all('/stoc/:sessionId/:userId', function (req, res, next) {
    var headers = {
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "Expires": "0"
    };
    var sessionId = req.params.sessionId;
    var userId = req.params.userId;
    console.log("@" + sessionId + " - " + userId + " joined.");
    headers["Content-Type"] = "text/event-stream";
    res.writeHead(200, headers);
    function keepAlive(resp) {
        resp.write(":\n");
        resp.keepAliveTimer = setTimeout(arguments.callee, 30000, resp);
    }
    keepAlive(res);  // flush headers + keep-alive
    var session = sessions[sessionId];
    if (!session)
        session = sessions[sessionId] = {"users": {}};
    if (Object.keys(session.users).length > usersInSessionLimit - 1) {
        console.log("user limit for session reached (" + usersInSessionLimit + ")");
        res.write("event:busy\ndata:" + sessionId + "\n\n");
        clearTimeout(res.keepAliveTimer);
        res.end();
        return;
    }
    var user = session.users[userId];
    if (!user) {
        user = session.users[userId] = {};
        for (var pname in session.users) {
            var esResp = session.users[pname].esResponse;
            if (esResp) {
                clearTimeout(esResp.keepAliveTimer);
                keepAlive(esResp);
                esResp.write("event:join\ndata:" + userId + "\n\n");
                res.write("event:join\ndata:" + pname + "\n\n");
            }
        }
    } else if (user.esResponse) {
        user.esResponse.end();
        clearTimeout(user.esResponse.keepAliveTimer);
        user.esResponse = null;
    }
    user.esResponse = res;
    req.on("close", function () {
        for (var pname in session.users) {
            if (pname == userId)
                continue;
            var esResp = session.users[pname].esResponse;
            esResp.write("event:leave\ndata:" + userId + "\n\n");
        }
        delete session.users[userId];
        clearTimeout(res.keepAliveTimer);
        console.log("@" + sessionId + " - " + userId + " left.");
        console.log("users in session " + sessionId + ": " + Object.keys(session.users).length);
    });

})




var server = app.listen(8080, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});
