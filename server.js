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
var http    = require("http"),
    exec    = require("child_process").exec,
    io      = require("socket.io"),
    url     = require("url");

////////////////////////////////////////////////////////////////////////
//
// Server:
//
////////////////////////////////////////////////////////////////////////

/**
 * Create a new Server object.
 *
 * @class This class creates a web server, 
 * and wraps some Socket.IO magic around it.
 * @constructor
 *
 * @param 
 *
 * @constructor
 */
var Server = module.exports = function(port, host) {
    if (typeof port == 'number') {
        this._port = port;
    }
    
    if (typeof host == 'string') {
        this._host = host;
    }
};

///////////////////
//
// Class variables:
//
///////////////////

/**
 * The default listening port.
 * @final
 */
Server.DEFAULT_PORT = 80;

/**
 * The default hostname/IP address to listen to.
 * Listening to 0.0.0.0 is equal to any.
 * @final
 */
Server.DEFAULT_HOST = '0.0.0.0';

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
Server.prototype.clients = {};

/////////////////////
//
// Private variables:
//
/////////////////////

/**
 * The hostname/IP address the server should listen on.
 *
 * @private
 * @type String
 */
Server.prototype._host = Server.DEFAULT_HOST;

/**
 * The port number the server should listen on.
 *
 * @private
 * @type int
 */
Server.prototype._port = Server.DEFAULT_PORT;

/**
 * HTTP server.
 *
 * @private
 * @type http.Server
 */
Server.prototype._httpServer = null;

/**
 * Socket.IO listener.
 *
 * @private
 * @type io.Listener
 */
Server.prototype._ioListener = null;

////////////////////
//
// Public functions:
//
////////////////////

/**
 * Start server.
 *
 * @returns The Server instance.
 * @type Server
 */
Server.prototype.start = function() {
    
    var self = this;

    // stop if already running
    if (this._httpServer) {
        this.stop();
    }
    
    // reset clients
    this.clients = {};

    // create server
    this._httpServer = http.createServer(function(request, response) {
		self._onRequest(request, response);
    });

    // listen for reqular requests
    this._httpServer.listen(this._port, this._host);
    
    // listen for socket connections
    this._ioListener = io.listen(this._httpServer, {
        flashPolicyServer: false
    });
    
    this._ioListener.on('clientMessage', function(message, client) {
        self._onClientMessage(message, client);
    });
     
    this._ioListener.on('clientConnect', function(client) {
        self._onClientConnect(client);
    });
    
    this._ioListener.on('clientDisconnect', function(client) {
        self._onClientDisconnect(client);
    });

    return this;
};

/**
 * Stop server.
 */
Server.prototype.stop = function() {
    this.broadcast({
        type: "server-notice",
        text: "Shutting down server"
    });
    
    if (this._ioListener) {
        this._ioListener = null;
    }
    
    if (this._httpServer) {
        this._httpServer.close();
        this._httpServer = null;
    }
};

/**
 * Send a message to all clients.
 *
 * @param message
 */
Server.prototype.broadcast = function(message) {
    if (this._ioListener) {
        this._ioListener.broadcast(message);
    }
};

Server.prototype.commands = {
    nick: function(sessionId, nick, value) {
		// TODO: sanitize value
		this.clients[sessionId].nick = value;
		this.broadcast({
			type: 'nick-change',
			oldNick: nick,
			newNick: value
		});
    },
    
    say: function(sessionId, nick, value) {
		// TODO: sanitize value
		this.broadcast({
			type: 'user-says',
			nick: this.clients[sessionId].nick,
			text: value
		});
    },

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

Server.prototype._onRequest = function(request, response) {
    response.writeHead(200, {
        "Content-Type": "text/plain"
    });

    var parsedUrl = url.parse(request.url);
    console.log("url: %j", parsedUrl);
    
    response.write('Your IP: ' + request.connection.remoteAddress);
    
    response.end();
};

Server.prototype._processMessage = function(message, client) {
    console.log('Got message: ', message);
    
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
Server.prototype._onClientMessage = function(message, client) {
    if (typeof message == 'string') {
		var match = message.match(/^\/(\w+)(?:\s(.+)*)*$/im);
        if (match) {
            this._processMessage({
                command: match[1],
                value: match[2]
            }, client);
        } else {
            this._processMessage({
                command: 'say',
                value: message
            }, client);
        }
    } else if (typeof message == 'object') {
        this._processMessage(message, client);
    } else {
        console.warn('Unknown message format');
        client.send({
            type: 'error',
            text: 'Unknown message format'
        });
    }
};

/**
 * Event handler for Socket.IO clientConnect.
 *
 * @private
 */
Server.prototype._onClientConnect = function(client) {
	client.nick = client.sessionId;
	this.clients[client.sessionId] = client;
	this.broadcast({
		type: 'user-connected',
		nick: client.nick
	});
};

/**
 * Event handler for Socket.IO clientDisconnect.
 *
 * @private
 */
Server.prototype._onClientDisconnect = function(client) {
    if (this.clients[client.sessionId]) {
		this.broadcast({
			type: 'user-disconnected',
			nick: this.clients[client.sessionId].nick
		});
		delete this.clients[client.sessionId];
	}
};

////////////////////////////////////////////////////////////////////////
//
// Bootstrapping:
//
////////////////////////////////////////////////////////////////////////

if (!module.parent) {
	new Server(process.env.PORT || 31337).start();
}


