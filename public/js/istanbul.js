
/**
 * Istanbul namespace.
 */
window.istanbul = {};

/**
 * Create a new client.
 *
 * @constructor
 */
istanbul.Client = function(gui) {
	if (typeof gui != 'object') {
		throw new Error('Needs gui elements');
	} else if (!gui.messageContainer) {
		throw new Error('Needs message container element');
	} else if (!gui.nickList) {
		throw new Error('Needs nick list element');
	} else if (!gui.peopleCount) {
		throw new Error('Needs people count element');
	} else if (!gui.statusBar) {
		throw new Error('Needs status bar element');
	}

	this.gui.messageContainer = gui.messageContainer;
	this.gui.nickList = gui.nickList;
	this.gui.peopleCount = gui.peopleCount;
	this.gui.statusBar = gui.statusBar;
}

/**
 * Contains jQuery elements that are updated on events.
 */
istanbul.Client.prototype.gui = {};

/**
 * List of connected clients.
 *
 * @type Array
 */
istanbul.Client.prototype.clients = [];

/**
 * The Socket.IO socket.
 *
 * @type io.Socket
 * @private
 */
istanbul.Client.prototype._socket = null;

/**
 * Whether the client is connected to a server.
 *
 * @type Boolean
 */
istanbul.Client.prototype.__defineGetter__('connected', function() {
	return this._socket != null && this._socket.connected;
});

/**
 * Send a command to a server.
 *
 * @param {String} command  The command to send.
 */
istanbul.Client.prototype.send = function(command) {
	if (this.connected) {
		console.log('Send command to server: %s', command);
		this._socket.send(command);
	} else {
		console.warn('Not connected to server, cannot send command');
	}
};

/**
 * Parse (and invoke) client command, or send it to the server.
 *
 * @param {String} command  The command to invoke/send.
 */
istanbul.Client.prototype.parseCommand = function(command) {
	if (typeof command != 'string') {
		console.warn("Malformed command. Expected 'string', was: ",  command);
		return;
	}

	// check if command matches a client command
	var match = command.match(/^\/(\w+)(?:\s(.+)*)*$/im);
	if (match) {
		var commandName = match[1];
		if (typeof this.commands[commandName] == 'function') {
			var commandArgs = match[2] ?  match[2].split(/\s/)  : [];
			// invoke command and return without sending to server
			this.commands[commandName].apply(this, commandArgs);
			return;
		}
	}

	// did not match a client command, send to server
	this.send(command);
};

/**
 * Client commands.
 */
istanbul.Client.prototype.commands = {};

/**
 * Client command: connect to server.
 *
 * @param {String} host  [optional] Defaults to localhost
 * @param {int}    port  [optional] Defaults to 80
 */
istanbul.Client.prototype.commands.connect =
istanbul.Client.prototype.connect          = function(host, port) {
	host = typeof host == 'string' ? host : 'localhost';
	port = parseInt(port) || 80;

    console.log("Connect to %s:%d", host, port);

	if (this.connected) {
		this.disconnect();
	}

	this._socket = new io.Socket(host, {
		port: port
	});

	var self = this;

	this._socket.on('connect', function() {
		self._onConnect();
	});

	this._socket.on('disconnect', function() {
		self._onDisconnect();
	});

	this._socket.on('connect_failed', function() {
		self._onConnectFailed();
	});

	this._socket.on('message', function(message) {
		self._onMessage(message);
	});

	this._socket.connect();

	this.gui.statusBar.html(
		'<img src="gfx/loading.gif" alt=" " width="16" height="16" />' +
		' Connecting to server...');
};

/**
 * Client command: disconnect from server.
 */
istanbul.Client.prototype.commands.disconnect = 
istanbul.Client.prototype.disconnect          = function() {
	if (this.connected) {
		console.info('Disconnecting from server');
		this._socket.disconnect();
		this._socket = null;
	}
};

/**
 * Client command: quit.
 */
istanbul.Client.prototype.commands.quit =
istanbul.Client.prototype.quit          = function() {
	console.log('Quit client!');
	// TODO: implement
};

/**
 * Event handler for Socket.IO 'connect' event.
 */
istanbul.Client.prototype._onConnect = function() {
	console.info('Connected to server');
	this.send('/who');
	this.gui.statusBar.html('Connected to server');
};

/**
 * Event handler for Socket.IO 'disconnect' event.
 */
istanbul.Client.prototype._onDisconnect = function() {
	console.info('Disconnected from server');
	this.gui.statusBar.html('Disconnected from server');
	this.clients = [];
	this._populateNickList();
};

/**
 * Event handler for Socket.IO 'connect_failed' event.
 */
istanbul.Client.prototype._onConnectFailed = function() {
	console.warn('Connection to server failed!');
	this.gui.statusBar.html('Connection to server failed! Check console.');
	this.clients = [];
	this._populateNickList();
};

/**
 * Event handler for Socket.IO 'message' event.
 */
istanbul.Client.prototype._onMessage = function(message) {
    if (typeof message != 'object' ||
        typeof message.type != 'string') {
        console.error('Received malformed message: ', message);
        return;
    }

	if (typeof this.handlers[message.type] == 'function') {
		this.handlers[message.type].call(this, message);
	} else {
		console.warn("No message handler for type '%s'", message.type);
	}
};

istanbul.Client.prototype._populateNickList = function() {
	var sorted = this.clients.sort();
	var newList = sorted.map(function(nick) {
		return '<li>' + nick + '</li>';
	}, this);

	// update DOM
	this.gui.nickList.html(newList.join(''));
	this.gui.peopleCount.html(this.clients.length);
};

/**
 * Message handlers.
 */
istanbul.Client.prototype.handlers  = {
    'error': function(message) {
        console.error(text);
    },
    
    'notice': function(message) {
        console.info(text);
    },
    
    'user-connected': function(message) {
		console.info("User connected: '%s'", message.nick);
		this.clients.push(message.nick);
		this._populateNickList();
    },
    
    'user-disconnected': function(message) {
		console.info("User disconnected: '%s'", message.nick);
		var index = this.clients.indexOf(message.nick);
		if (index != -1) {
			this.clients = this.clients.filter(function(nick) {
				return nick != message.nick;
			});
			this._populateNickList();
		}
    },
    
    'user-says': function(message) {
		console.info("User '%s' says '%s'", message.nick, message.text);
    },
    
    'nick-list': function(message) {
		console.log('Received nick list: ', message.list);
		this.clients = message.list;
		this._populateNickList();
    },
    
    'nick-change': function(message) {
		console.info("User '%s' changed nick to '%s'", message.oldNick, message.newNick);
		var index = this.clients.indexOf(message.oldNick);
		if (index != -1) {
			this.clients[index] = message.newNick;
			this._populateNickList();
		}
    }
};

