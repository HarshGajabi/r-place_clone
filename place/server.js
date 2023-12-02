const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

var dim = 1000;
var board = new Array(dim * dim / 2);
board.fill(0x00);

function getByteIndexAndBitPosition(x, y, dim) {
	const index = Math.floor((y * dim + x) / 2);
	const isHigh = (x % 2 === 0); // Even x values affect the high bits, odd affect the low bits
	return { index, isHigh };
}

function updateBoard(board, x, y, color) {
	const { index, isHigh } = getByteIndexAndBitPosition(x, y, dim);

	if (index >= 0 && index < board.length) {
		if (isHigh) {
			// Clear the high 4 bits then set them to the new color
			board[index] = (board[index] & 0x0F) | (color << 4);
		} else {
			// Clear the low 4 bits then set them to the new color
			board[index] = (board[index] & 0xF0) | color;
		}
	}
}


wss.on('close', function () {
	console.log('disconnected');
});

wss.broadcast = function broadcast(data) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

// for heartbeat to make sure connection is alive 
function noop() { }
function heartbeat() {
	this.isAlive = true;
}

function isValidSet(o) {
	var isValid = false;
	try {
		isValid =
			Number.isInteger(o.x) && o.x != null && 0 <= o.x && o.x < dim &&
			Number.isInteger(o.y) && o.y != null && 0 <= o.y && o.y < dim &&
			Number.isInteger(o.color) && o.color != null && 0 <= o.color && o.color <= 15
	} catch (err) {
		isValid = false;
	}
	return isValid;
}
wss.on('connection', function (ws) {
	// heartbeat
	ws.isAlive = true;
	ws.on('pong', heartbeat);
	// when we get a message from the client
	ws.on('message', function (message) {
		console.log(message);
		var o = JSON.parse(message);
		if (isValidSet(o)) {
			updateBoard(board, o.x, o.y, o.color);
			console.log("Broadcasting...")
			o.type = "set";
			wss.broadcast(JSON.stringify(o));
		} else {
			console.log("Invalid set: " + message);
		}
	});
});

// heartbeat (ping) sent to all clients
const interval = setInterval(function ping() {
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive === false) return ws.terminate();

		ws.isAlive = false;
		ws.ping(noop);
	});
}, 30000);

// Static content
var express = require('express');
var app = express();

// static_files has all of statically returned content
// https://expressjs.com/en/starter/static-files.html
app.use('/', express.static('static_files')); // this directory has files to be returned

// Endpoint to get the board state as binary data
app.get('/board', function (req, res) {
	res.end(Buffer.from(board));
});

app.listen(8080, function () {
	console.log('Example app listening on port 8080!');
});
