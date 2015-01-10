var mqttConnection = require('mqtt-vsp');
var firmata = require('firmata');

var myId = '7f2e1761-8e5c-11e4-b522-13090455f557';
var token = 'bwi26661g5unb3xrglgewz4d1r5uq5mi';
var srv = '192.168.100.109';

var sendId = 'a9f96c20-8e24-11e4-9ef0-f9837fb24bee';
var board;
var pinState = 1;

var conn = new mqttConnection.Connection({
    uuid: myId,
    token: token,
    server: srv,
    username: myId,
    password: token
});

conn.on('ready', function (data) {
    var serialPort = new mqttConnection.SerialPort(conn, sendId);
    var options = {skipHandshake: true};
    board = new firmata.Board(serialPort, options, function (err, ok) {
        if (err) {
            throw err;
        }

        togglePin();

    });
});

function togglePin() {
    console.log('toggling', pinState);
    if (pinState) {
        pinState = 0;
    } else {
        pinState = 1;
    }
    board.digitalWrite(13, pinState);
    setTimeout(togglePin, 750);
}
