
function ChatClient() {
    this.gui = {
        output:        $('#application > section.output'),
        serverAddress: $('#application > header > #server-address'),
        command:       $('#application > section.input > .command'),
        nickList:      $('#application > aside > ul'),
        peopleCounter: $('#application > aside > header > var')
    };
}

ChatClient.prototype.parseCommand = function(command) {
    console.log('Command entered: ', command);
};

ChatClient.prototype.connect = function(host, port) {
    console.log("Connect to %s:%d", host, port);
};

ChatClient.prototype.onMessage = function(message) {
    if (typeof message != 'object' ||
        typeof message.type != 'string') {
        console.error('Received malformed message: ', message);
        return;
    }
        
    switch (message.type) {
        case 'error':
            this.onErrorMessage(message.error);
        default:
            console.warn("No message handler for type '%s'", message.type);
            break;
    }
};

ChatClient.prototype.time = function() {
    var date = new Date();
    return date.toTimeString();
};

ChatClient.prototype.handlers  = {
    'error': function(text) {
        console.error(text);
    },
    
    'warning': function(text) {
        console.warn(text);
    },
    
    'notice': function(text) {
        console.info(text);
    },
    
    'user-connected': function(nick) {
        this.gui.output.append(
            '<article class="user-connected">' +
              this.time() + ' ' +
              '<strong>' + nick + '</strong>' +
              ' connected' +
            '</article>');
    },
    
    'user-disconnected': function(nick) {
        this.gui.output.append(
            '<article class="user-disconnected">' +
              this.time() + ' ' +
              '<strong>' + nick + '</strong>' +
              ' disconnected' +
            '</article>');
    },
    
    'user-says': function(nick, text) {
        this.gui.output.append(
            '<article class="user-says">' +
              this.time() + ' ' +
              '<strong>' + nick + '</strong> ' +
              text +
            '</article>');
    },
    
    'nick-list': function(list) {
        
    },
    
    'nick-change': function(oldNick, newNick) {
        this.gui.output.append(
            '<article class="nick-change">' +
              this.time() + ' ' +
              '<strong>' + oldNick + '</strong>' +
              ' is now known as ' +
              '<strong>' + newNick + '</strong>' +
            '</article>');
    }
};

ChatClient.prototype.messageHandlers = {
    'error': function(message) {
    
    },
    
    'notice': function(message) {
        
    },
    
    'user-connected': function(message) {
    
    },
    
    'user-disconnected': function(message) {
    
    },
    
    'user-says': function(message) {
    
    },
    
    'nick-list': function(list) {
    
    }
};
