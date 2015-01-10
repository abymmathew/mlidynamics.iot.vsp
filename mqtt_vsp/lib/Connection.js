'use strict';

var mqtt = require("mqtt");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var DEFAULT_TIMEOUT = 10000;

function Connection(opt) {

    EventEmitter.call(this);

    var self = this;

    this._callbackHandlers = {};
    this._ackId = 0;

    if (!opt || typeof opt !== 'object') {
        throw new Error('invalid options');
    }

    this.options = opt;
    this.options.protocol = 'mqtt';

    this.mqttsettings = {
        keepalive: 1000,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        clientId: this.options.uuid,
        username: this.options.uuid,
        password: this.options.token,
        reconnectPeriod: this.options.reconnectPeriod || 5000
    };

    if (this.options.qos == undefined) {
        this.options.qos = 0;
    }

    try {
        this.mqttclient = mqtt.createClient(this.options.port || this.options.mqttport || 1883,
                this.options.host || this.options.mqtthost || this.options.server,
            this.mqttsettings);

        this.mqttclient.on('connect', function (a, b) {
            console.log('...connected via mqtt', a, b);
            self.mqttclient.subscribe(self.options.uuid, { qos: self.options.qos });
            self.emit('ready');
        });

        this.mqttclient.on('close', function () {
            console.log('...closed via mqtt');
        });

        this.mqttclient.on('error', function (error) {
            console.log('error connecting via mqtt');
            self.emit('error', error);
        });

        this.mqttclient.on('message', function (topic, data) {
            try {
                console.log('received', topic, data);
                if (typeof data === 'string' && data.indexOf('{') === 0) {
                    data = JSON.parse(data);
                    if (data.topic) {
                        if (data.topic === 'messageAck') {
                            var msg = data.data;
                            if (self._callbackHandlers[msg.ack]) {
                                try {
                                    self._callbackHandlers[msg.ack](msg.payload);
                                    delete self._callbackHandlers[msg.ack];
                                }
                                catch (err) {
                                    console.log('error resolving callback', err);
                                }
                            }
                        }
                        else {
                            self._handleAckRequest(data.topic, data.data);
                        }
                    } else if (data.payload) {
                        self._handleAckRequest('tb', data.payload);
                    }
                } else {
                    self.emit('rx', data);
                }

            } catch (exp) {
                console.log('error on message', exp);
                //self.emit('error', 'error receiving message: ' + exp);
            }
        });

    } catch (err) {
        console.log(err);
    }

}

util.inherits(Connection, EventEmitter);

Connection.prototype.binaryStr = function (data) {
    if (typeof data === 'string') {
        this.mqttclient.publish(this.mqttsettings.clientId, data, { qos: this.options.qos });
    }
    else {
        console.log('directText requires an object with a string payload property, and a devices property');
    }

    return this;
};

Connection.prototype.subscribe = function (uuid) {
    this.mqttclient.subscribe(uuid, { qos: this.options.qos });
    return this;
};

Connection.prototype.unsubscribe = function (data) {
    this.mqttclient.unsubscribe(data.uuid);
    return this;
};

module.exports = Connection;
