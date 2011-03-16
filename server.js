/**
 * @fileoverview This file is a node module containing the server class of
 * the chat system.
 *
 * @author robinsk
 */

////////////////////////////////////////////////////////////////////////
//
// Imports:
//
////////////////////////////////////////////////////////////////////////
var express = require("express"),
    io      = require("socket.io");

////////////////////////////////////////////////////////////////////////
//
// Setup express app (http server):
//
////////////////////////////////////////////////////////////////////////

/**
 * Create express server.
 */
var server = module.exports = express.createServer();

/**
 * Configure app with common middleare.
 */
server.configure(function() {
    // access log
    server.use(express.logger({
        format: "\x1b[1m:response-time\x1b[0mms" +
                "\t\x1b[33m:method\x1b[0m\t\x1b[32m:url\x1b[0m"
    }));

    // override express' powered-by header
    server.use(function(req, res, next) {
        res.setHeader("X-Powered-By", "your mother");
        next();
    });

    // smarter handling of favicon (just because)
    server.use(express.favicon(__dirname + "/public/favicon.ico"));

    // serve static files intelligently
    server.use(express.static(__dirname + '/public'));

    // write response time as response header
    server.use(express.responseTime());
});

/**
 * Middleware config for development environment.
 */
server.configure("development", function() {
    server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

/**
 * Middleware config for production environment.
 */
server.configure("production", function() {
    server.use(express.errorHandler({ dumpExceptions: true, showStack: false }));
});

/**
 * A route for dumping requests.
 */
server.all("/dump-request", function(req, res) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write(req.method + " " + req.url + " HTTP/" + req.httpVersion + "\n");
    
    function ucf(h) {
        return h.split("-").map(function(s) {
            return s[0].toUpperCase() + s.substr(1);
        }).join("-");
    }
    
    for (var header in req.headers) {
        res.write(ucf(header) + ": " + req.headers[header] + "\n");
    }

    res.end();
    
    /*
    req.on("data", function(chunk) {
        res.write(chunk);
    });
    
    res.on("end", function() {
        for (var trailer in req.trailers) {
            res.write(ucf(trailer) + ": " + req.trailers[trailer] + "\n");
        }
        res.end();
    });
    */
});

////////////////////////////////////////////////////////////////////////
//
// Setup Socket.IO (chat server):
//
////////////////////////////////////////////////////////////////////////

/**
 * Chat server constructor.
 */
function ChatServer(httpServer) {

    this.httpServer = httpServer;
    this.socketServer = io.listen(httpServer, { flashPolicyServer: false });
    
    var self = this;
    
    this.socketServer.on('clientMessage', function(message, client) {
        self._onClientMessage(message, client);
    });
     
    this.socketServer.on('clientConnect', function(client) {
        self._onClientConnect(client);
    });
    
    this.socketServer.on('clientDisconnect', function(client) {
        self._onClientDisconnect(client);
    });
}

////////////////////
//
// Public variables:
//
////////////////////

/**
 * A hashmap of <sessionId, client> pairs.
 *
 * @type Object
 */
ChatServer.prototype.clients = {};

/**
 * HTTP server.
 *
 * @private
 * @type http.Server
 */
ChatServer.prototype.httpServer = null;

/**
 * Socket.IO listener.
 *
 * @private
 * @type io.Listener
 */
ChatServer.prototype.socketServer = null;

////////////////////
//
// Public functions:
//
////////////////////

/**
 * Stop server.
 */
ChatServer.prototype.stop = function() {
    // send notice before shutting down
    this.broadcast({
        type: "notice",
        text: "Shutting down server"
    });
    
    if (this.socketServer) {
        this.socketServer = null;
    }
    
    if (this.httpServer) {
        this.httpServer.close();
        this.httpServer = null;
    }
};

/**
 * Send a message to all clients.
 *
 * @param message
 */
ChatServer.prototype.broadcast = function(message) {
    if (this.socketServer) {
        this.socketServer.broadcast(message);
    }
};

/**
 * Commands a client can "call".
 */
ChatServer.prototype.commands = {
    /**
     * Change nick.
     */
    nick: function(sessionId, nick, value) {
        var client = this.clients[sessionId];
        var validNick = value.match(/^[\w-_æøå]+$/im);
        var nickExists = false;
        for (var clientSessionId in this.clients) {
            if (this.clients[clientSessionId].nick == value) {
                nickExists = true;
                break;
            }
        }

        if (nickExists) {
            client.send({
                type: "error",
                text: "The nick '" + value + "' is already taken"
            });
        } else if (!validNick) {
            client.send({
                type: "error",
                text: "'" + value + "' is not a valid nick"
            });
        } else {
		    this.clients[sessionId].nick = value;
		    this.broadcast({
			    type: 'nick-change',
			    oldNick: nick,
			    newNick: value
		    });
        }
    },
    
    /**
     * Say something.
     */
    say: function(sessionId, nick, value) {
		this.broadcast({
			type: 'user-says',
			nick: this.clients[sessionId].nick,
			text: value
		});
    },

    /**
     * Get the nick list.
     */
	who: function(sessionId, nick) {
		var list = [];

		for (var clientSessionId in this.clients) {
			list.push(this.clients[clientSessionId].nick);
		}

		this.clients[sessionId].send({
			type: 'nick-list',
			list: list
		});
	}
};

/////////////////////
//
// Private functions:
//
/////////////////////

/**
 * Process an incoming message (invoke a command or send error).
 */
ChatServer.prototype._processMessage = function(message, client) {
    if (typeof message.command == 'string') {
        if (typeof this.commands[message.command] == 'function') {
            // valid command
			var commandArguments = [
				client.sessionId,
				this.clients[client.sessionId].nick
			];

			if (message.value) {
				commandArguments.push(message.value);
			}

            // invoke command
			this.commands[message.command].apply(this, commandArguments);
        } else {
			// invalid command
			client.send({
				type: 'error',
				text: "Unknown command '" + message.command + "'"
			});
		}
    } else {
		client.send({
			type: 'error',
			text: "Malformed message: '" + message + "'"
		});
	}
};

/**
 * Event handler for Socket.IO clientMessage.
 *
 * @private
 */
ChatServer.prototype._onClientMessage = function(message, client) {
    //console.log("Client sent message: %s", message);
    if (typeof message == 'string') {
        // regex for /<command>[ <value>]
		var match = message.match(/^\/(\w+)(?:\s(.+)*)*$/im);
        if (match) {
            // client sent a command, process it
            this._processMessage({
                command: match[1],
                value: match[2]
            }, client);
        } else {
            // does not match command, default to /say
            this._processMessage({
                command: 'say',
                value: message
            }, client);
        }
    } else if (typeof message == 'object') {
        // the sent an object (haxx0r)
        this._processMessage(message, client);
    } else {
        // guru meditation
        var msg = "Unknown message type '" + typeof message + "', " +
                  "expects string or JSON object with command [and value]";
        console.warn(msg);
        client.send({ type: "error", text: msg });
    }
};

/**
 * Event handler for Socket.IO clientConnect.
 *
 * @private
 */
ChatServer.prototype._onClientConnect = function(client) {
    //console.log("Client connected, sessionId: %s", client.sessionId);
	client.nick = client.sessionId;
	this.clients[client.sessionId] = client;
	client.broadcast({
		type: "user-connected",
		nick: client.nick
	});
};

/**
 * Event handler for Socket.IO clientDisconnect.
 *
 * @private
 */
ChatServer.prototype._onClientDisconnect = function(client) {
    //console.log("Client disconnected, sessionId: %s", client.sessionId);
    if (this.clients[client.sessionId]) {
		this.broadcast({
			type: "user-disconnected",
			nick: this.clients[client.sessionId].nick
		});
		delete this.clients[client.sessionId];
	}
};

exports.ChatServer = ChatServer;

/**
 * Only listen if run directly.
 */
if (!module.parent) {
    var port = process.env.PORT || 3000;

    var chatServer = new ChatServer(server);

    server.listen(port, function() {
        var address = "http://" + server.address().address;
        if (port != 80) address += ":" + port;
        console.log("Chat server started at \x1b[1m%s/\x1b[0m", address);
    });
}
