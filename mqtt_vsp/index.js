'use strict';

var util = require('util');
var stream = require('stream');
var _ = require('lodash');

var _Connection = require('./lib/Connection');

var SEND_INTERVAL = 500;
var CHECK_INTERVAL = 50;

function sendLoop(vsp) {
    vsp.running = true;

    var delta = Date.now() - vsp.lastCheck;
    vsp.lastCheck = Date.now();
    vsp.lastSend += delta;

    if (vsp.lastSend > vsp.sendInterval && vsp.buffer) {
        vsp.lastSend = 0;
        var binaryStr = vsp.buffer.toString('base64');

        // transmit payload
        vsp.binaryStr(binaryStr);
        vsp.buffer = null;
    }

    setTimeout(function () {
        sendLoop(vsp);
    }, vsp.checkInterval);
}

function MqttSerialPort(connx, options) {

    if (typeof options === 'string') {

        this.sendUuid = [options];
        this.checkInterval = CHECK_INTERVAL;
        this.sendInterval = SEND_INTERVAL;
    }

    this.bus = connx;
    this.buffer = null;
    this.lastCheck = 0;
    this.lastSend = 0;

    var self = this;
    connx.on('rx', function (message) {

        if (typeof message === 'string') {
            self.emit('data', new Buffer(message, 'base64'));
        }
        else if (typeof message === 'object' && _.contains(self.sendUuid, message.fromUuid) && typeof message.payload === 'string') {
            self.emit('data', new Buffer(message.payload, 'base64'));
        }
        else {
            console.log('invalid text broadcast', message);
        }
    });

    setTimeout(function () {
        sendLoop(self);
    }, 1000);
}

// Virtual serial port

util.inherits(MqttSerialPort, stream.Stream);

MqttSerialPort.prototype.open = function (callback) {
    this.emit('open');
    if (callback) {
        callback();
    }
};

MqttSerialPort.prototype.write = function (data, callback) {

    var self = this;
    if (!this.bus) {
        var err = new Error("port not open.");
        if (callback) {
            callback(err);
        } else {
            self.emit('error', err);
        }
        return;
    }

    if (!Buffer.isBuffer(data)) {
        data = new Buffer(data);
    }

    if (this.buffer) {
        this.buffer = Buffer.concat([this.buffer, data]);
    } else {
        this.buffer = data;
    }
};

MqttSerialPort.prototype.close = function (callback) {
    console.log('closing');
    if (callback) {
        callback();
    }
};

MqttSerialPort.prototype.flush = function (callback) {
    console.log('flush');
    if (callback) {
        callback();
    }
};

MqttSerialPort.prototype.drain = function (callback) {
    console.log('drain');
    if (callback) {
        callback();
    }
};

module.exports = {
    SerialPort: MqttSerialPort,
    Connection: _Connection
};
