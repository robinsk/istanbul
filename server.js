/**
 * @fileoverview This file is the main program when running as a server.
 *
 * @author Robin Skoglund <robinsk@gmail.com>
 */

process.title = "istanbul";

// shorthand for starting server
var server = require('./istanbul').startServer(31337);
