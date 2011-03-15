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
    if (typeof gui == 'object') {
        if (gui.input instanceof HTMLInputElement) {
            this.gui.input = gui.input;
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
// Public functions:
//
////////////////////////////////////////////////////////////////////////////////

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

