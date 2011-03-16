/**
 * @fileoverview This file contains a simple chat server client.
 *
 * @author robinsk
 */

////////////////////////////////////////////////////////////////////////////////
//
// Constructor:
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a client object.
 *
 * @constructor
 * @param {Object} gui An object with references to elements that should
 *                     be updated when stuff happens. Format:
 *                     {
 *                         // required: command input
 *                         input: HTMLInputElement,
 *
 *                         // required: container to append messages
 *                         messages: HTMLElement,
 *
 *                         // optional: ul element to populate nick list
 *                         nickList: HTMLUlistelement,
 *
 *                         // optional: any element to update status
 *                         statusBar: HTMLElement
 *                     }
 * @throws TypeError if required elements are missing
 */
function Client(gui) {
    var self = this;

    if (typeof gui == 'object') {
        if (gui.input instanceof HTMLInputElement) {
            this.gui.input = gui.input;
            this.gui.input.addEventListener("keydown", function(event) {
                self.onInputKeyDown(event);
            });
        } else {
            throw new TypeError("gui.input must be an input element");
        }
        
        if (gui.messages instanceof HTMLElement) {
            this.gui.messages = gui.messages;
        } else {
            throw new TypeError("gui.messages must be an element");
        }
        
        if (gui.nickList instanceof HTMLUListElement) {
            this.gui.nickList = gui.nickList;
        } else {
            console.warn("gui.nickList is not given, or is not a list element");
        }
        
        if (gui.statusBar instanceof HTMLElement) {
            this.gui.statusBar = gui.statusBar;
        } else {
            console.warn("gui.statusBar is not given, or is not an element");
        }
    } else {
        throw new TypeError("Constructor expects an object with GUI elements");
    }
}

////////////////////////////////////////////////////////////////////////////////
//
// Public variables:
//
////////////////////////////////////////////////////////////////////////////////

/**
 * A list of connected clients.
 *
 * @type Array
 */
Client.prototype.clients = [];

/**
 * The socket (connection to chat server).
 *
 * @type io.Socket
 */
Client.prototype.socket = null;

/**
 * Whether the client is currently connected.
 *
 * @type Boolean
 */
Client.prototype.__defineGetter__('connected', function() {
    return this.socket != null && this.socket.connected;
});

////////////////////////////////////////////////////////////////////////////////
//
// Client command handlers:
//
////////////////////////////////////////////////////////////////////////////////

Client.prototype.commands = {};

/**
 * Client command: connect to server.
 *
 * @param {String} host  [optional] Defaults to localhost.
 * @param {int}    port  [optional] Defaults to 80.
 */
Client.prototype.commands.connect = 
Client.prototype.connect          = function(host, port) {
    host = typeof host == "string" ? host : "localhost";
    port = parseInt(port) || 80;

    console.log("Connect to %s:%d", host, port);

    if (this.connected) {
        this.disconnect();
    }

    var self = this;

    // create new socket
    this.socket = new io.Socket(host, { port: port });

    // hook up listeners
    this.socket.on("connect", function() {
        self._onConnect();
    })

    this.socket.on("disconnect", function() {
        self._onDisconnect();
    });

    this.socket.on("connect_failed", function() {
        self._onConnectFailed();
    });

    this.socket.on("message", function(message) {
        self._onMessage(message);
    });

    // connect to server
    this.socket.connect();

    this.updateStatus("Connecting to " + host + ":" + port + " ...");
};

/**
 * Client command: disconnect from server.
 */
Client.prototype.commands.disconnect = 
Client.prototype.disconnect          = function() {
    if (this.connected) {
        console.info("Disconnecting from server")
        this.socket.disconnect();
        this.socket = null
    }
};


/**
 * Client command: quit client.
 */
Client.prototype.commands.quit =
Client.prototype.quit          = function() {
    console.log("Quit client, window closing in 1 second");
    this.disconnect();
    setTimeout(function() {
        window.close();
    }, 1000);
}

////////////////////////////////////////////////////////////////////////////////
//
// Server message handlers:
//
////////////////////////////////////////////////////////////////////////////////

Client.prototype.handlers = {
    "error": function(message) {
        console.error("Server sent error: %s", message.text);
        this.addMessage(this.message.error(message.text));
    },

    "notice": function(message) {
        console.info("Server sent notice: %s", message.text);
        this.addMessage(this.message.notice(message.text));
    },

    "user-connected": function(message) {
        this.clients.push(message.nick);
        this.populateNickList();
        this.addMessage(this.message.userConnected(message.nick));
    },

    "user-disconnected": function(message) {
        var index = this.clients.indexOf(message.nick);
        if (index != -1) {
            this.clients = this.clients.filter(function(nick) {
                return nick != message.nick;
            });
            this.populateNickList();
        }
        this.addMessage(this.message.userDisconnected(message.nick));
    },

    "user-says": function(message) {
        this.addMessage(this.message.userSays(message.nick, message.text));
    },

    "nick-list": function(message) {
        this.clients = message.list;
        this.populateNickList();
    },

    "nick-change": function(message) {
        var index = this.clients.indexOf(message.oldNick);
        if (index != -1) {
            this.clients[index] = message.newNick;
        }
        this.populateNickList();
        this.addMessage(this.message.nickChange(message.oldNick, message.newNick));
    }
};

////////////////////////////////////////////////////////////////////////////////
//
// Public functions:
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Parse (and invoke) client command, or send it to the server.
 *
 * @param {String} command  The command to invoke/send.
 */
Client.prototype.parseCommand = function(command) {
    if (typeof command != "string") {
        console.warn("Command must be string (was '%s')", typeof command);
        return;
    }

    // check if command matches a client command
    var match = command.match(/^\/(\w+)(?:\s(.+)*)*$/im);
    if (match) {
        var commandName = match[1];
        if (typeof this.commands[commandName] == "function") {
            // invoke command and return without sending to server
            var commandArgs = match[2] ? match[2].split(/\s/) : [];
            this.commands[commandName].apply(this, commandArgs)
            return
        }
    }

    // did not match client command, send to server
    this.send(command);
};

/**
 * Send a command to the server.
 *
 * @param {String} command  The command to send.
 */
Client.prototype.send = function(command) {
    if (this.connected) {
        console.log("Send command to server: '%s'", command);
        this.socket.send(command);
    } else {
        console.warn("Not connected to server, cannot send command");
        this.addMessage(this.message.error("Not connected to server, cannot send command"));
    }
};

////////////////////////////////////////////////////////////////////////////////
//
// Public functions:
//
////////////////////////////////////////////////////////////////////////////////


/**
 * Event handler for Socket.IO 'connect' event.
 */
Client.prototype._onConnect = function() {
    this.send("/who");
    this.updateStatus("Connected to server");
};


/**
 * Event handler for Socket.IO 'disconnect' event.
 */
Client.prototype._onDisconnect = function() {
    this.clients = [];
    this.populateNickList();
    this.updateStatus("Disconnected from server");
};


/**
 * Event handler for Socket.IO 'connect_failed' event.
 */
Client.prototype._onConnectFailed = function() {
    this.clients = [];
    this.populateNickList();
    this.updateStatus("Connection to server failed. Check console.");
};

/**
 * Event handler for Socket.IO 'message' event.
 */
Client.prototype._onMessage = function(message) {
    if (typeof message != "object" ||
        typeof message.type != "string") {
        console.error("Received malformed message: ", message);
        return;
    }

    if (typeof this.handlers[message.type] == "function") {
        // inboke handler
        this.handlers[message.type].call(this, message);
    } else {
        console.warn("No message handler for type '%s'", message.type);
    }
};

////////////////////////////////////////////////////////////////////////////////
//
// GUI variables and functions:
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Contains DOM elements that are updated when stuff happens.
 *
 * @type Object
 */
Client.prototype.gui = { };

/**
 * GUI: The input element where you type in messages/commands.
 *
 * @type HTMLInputElement
 */
Client.prototype.gui.input = null;

/**
 * GUI: The element where messages are shown.
 *
 * @type HTMLElement
 */
Client.prototype.gui.messages = null;

/**
 * GUI: The list element where connected users are shown.
 *
 * @type HTMLUlistElement
 */
Client.prototype.gui.nickList = null;

/**
 * GUI: The element where the current status is shown.
 *
 * @type HTMLElement
 */
Client.prototype.gui.statusBar = null;

/**
 * Populates nick list with LI elements of connected users.
 
 * @returns this
 * @type Client
 */
Client.prototype.populateNickList = function() {
    if (!this.gui.nickList) {
        // we don't have a nick list element
        return;
    }
    
    // sort clients alphabetically
    var sorted = this.clients.sort();
    
    // generate new html
    var html = sorted.map(function(nick) {
        return "<li>" + nick + "</li>";
    }).join("");
    
    // update DOM
    this.gui.nickList.innerHTML = html;
    
    return this;
};

/**
 * Key handler for the input field.
 */
Client.prototype.onInputKeyDown = function(event) {
    var input = this.gui.input;

    // TODO: implement command history

    if (event.keyCode == 38) {
        // arrow up pressed
    } else if (event.keyCode == 13 && input.value.trim().length > 0) {
        // enter pressed, parse command
        this.parseCommand(input.value.trim());
        input.value = "";
    }
};

/**
 * Update the status bar (if available).
 */
Client.prototype.updateStatus = function(status, type) {
    var cls = typeof type == "string" ? type : "normal";
    var l = typeof console[cls] == "function" ? console[cls] : console.info;
    l.call(console, "STATUS: %s", status);
    if (this.gui.statusBar) {
        this.gui.statusBar.innerHTML = '<span class="' + cls + '">' + 
                status + '</span>';
    }
};

/**
 * Factory for creating messages.
 */
Client.prototype.message = (function() {

    function createText(text) {
        return document.createTextNode(text);
    }

    function createTimestamp() {
        var time = document.createElement("time");
        var now = new Date();

        var hours = now.getHours();
        if (hours < 10) hours = "0" + hours;

        var minutes = now.getMinutes();
        if (minutes < 10) minutes = "0" + minutes;

        time.datetime = now.toString();
        time.appendChild(createText(hours + ":" + minutes + " "));

        return time;
    }

    function createArticle(className) {
        var article = document.createElement("article");
        article.className = className;
        article.appendChild(createTimestamp());
        return article;
    }

    function createNick(nick) {
        var e = document.createElement("var");
        e.className = "nick";
        e.innerHTML = nick;
        return e;
    }
    
    return {
        error: function(text) {
            var a = createArticle("error");
            a.appendChild(createText(text));
            return a;
        },

        notice: function(text) {
            var a = createArticle("notice");
            a.appendChild(createText(text));
            return a;
        },

        userConnected: function(nick) {
            var a = createArticle("user-connected");
            a.appendChild(createNick(nick));
            a.appendChild(createText(" joined the chat"));
            return a;
        },

        userDisconnected: function(nick) {
            var a = createArticle("user-disconnected");
            a.appendChild(createNick(nick));
            a.appendChild(createText(" left the chat"));
            return a;
        },

        userSays: function(nick, text) {
            var a = createArticle("user-says");
            a.appendChild(createNick("&lt;" + nick + "&gt;"));
            a.appendChild(createText(" " + text));
            return a;
        },

        nickChange: function(oldNick, newNick) {
            var a = createArticle("nick-change");
            a.appendChild(createNick(oldNick));
            a.appendChild(createText(" is now known as "));
            a.appendChild(createNick(newNick));
            return a;
        }
    };
})();

/**
 * Adds a message to the container in the GUI.
 *
 * @param {String|HTMLElement} message  HTML-formatted message to add.
 * @returns this
 * @type Client
 */
Client.prototype.addMessage = function(message) {
    var messages = this.gui.messages;
    
    if (typeof message == 'string') {
        messages.innerHTML += message;
    } else if (message instanceof HTMLElement) {
        messages.appendChild(message);
    }
    
    // scroll to bottom
    messages.scrollTop = messages.scrollHeight;
    
    return this;
};

