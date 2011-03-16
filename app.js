
// imports
var express = require('express');

// create express app
var app = module.exports = express.createServer();

// configure app with common middleware
app.configure(function(){
    var accesslog = express.logger({
        format: "\x1b[1m:response-time\x1b[0mms" +
                "\t\x1b[33m:method\x1b[0m\t\x1b[32m:url\x1b[0m"
    });
    
    app.use(accesslog);
    app.use(function(req, res, next) {
        res.setHeader("X-Powered-By", "your mother");
        next();
    });
    app.use(express.favicon(__dirname + "/public/favicon.ico"));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    //app.use(express.cookieParser());
    //app.use(express.session({ secret: 'keyboard cat' }));
    //app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.use(express.responseTime());
});

// dev config
app.configure("development", function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// prod config
app.configure("production", function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: false }));
});

// a route to dump requests (accepts any request method)
app.all("/dump-request", function(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/plain",
        "Connection": "close"
    });
    
    res.write(req.method + " " + req.url + " HTTP/" + req.httpVersion + "\n");
    
    function ucf(h) {
        return h.split("-").map(function(s) {
            return s[0].toUpperCase() + s.substr(1);
        }).join("-");
    }
    
    for (var header in req.headers) {
        res.write(ucf(header) + ": " + req.headers[header] + "\n");
    }
    
    req.on("data", function(chunk) {
        res.write(chunk);
    });
    
    res.on("end", function() {
        for (var trailer in req.trailers) {
            res.write(ucf(trailer) + ": " + req.trailers[trailer] + "\n");
        }
        res.end();
    });
});

app.all("/trigger-error", function(req, res) {
    throw new Error("what the shit?");  
});

if (!module.parent) {
    app.listen(3000, function() {
        var address = "http://" + app.address().address;
        if (app.address().port != 80) address += ":" + app.address().port;
        console.log("Chat server started at \x1b[1m%s/\x1b[0m", address);
    });
}
