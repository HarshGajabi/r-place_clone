const BOARD_SIZE = 1000;
const WEBSOCKET_URL = `ws://${window.location.hostname}:8081`;
const BOARD_DATA_URL = `/board`;
var socket;
const colors = [
    "white",
    "silver",
    "gray",
    "lime",
    "yellow",
    "aqua",
    "fuchsia",
    "red",
    "blue",
    "green",
    "teal",
    "purple",
    "maroon",
    "olive",
    "navy",
    "black"
];
const colorsRGBA = [
    [255, 255, 255, 255], // white
    [192, 192, 192, 255], // silver
    [128, 128, 128, 255], // gray
    [0, 255, 0, 255],     // lime
    [255, 255, 0, 255],   // yellow
    [0, 255, 255, 255],   // aqua
    [255, 0, 255, 255],   // fuchsia
    [255, 0, 0, 255],     // red
    [0, 0, 255, 255],     // blue
    [0, 128, 0, 255],     // green
    [0, 128, 128, 255],   // teal
    [128, 0, 128, 255],   // purple
    [128, 0, 0, 255],     // maroon
    [128, 128, 0, 255],   // olive
    [0, 0, 128, 255],     // navy
    [0, 0, 0, 255]        // black
];

async function fetchBoardData(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob.arrayBuffer();
}

function processBoardData(arrayBuffer) {
    const byteArray = new Uint8Array(arrayBuffer);
    let board = Array.from(Array(BOARD_SIZE), () => new Array(BOARD_SIZE));

    let byteIndex = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x += 2) { // Increment by 2 as each byte has 2 pixels
            if (byteIndex < byteArray.length) {
                const byte = byteArray[byteIndex++];
                const high = byte >> 4; // Extract the high 4 bits
                const low = byte & 0x0F; // Extract the low 4 bits

                board[y][x] = high; // Assign the high 4 bits to the first pixel
                if (x + 1 < BOARD_SIZE) {
                    board[y][x + 1] = low; // Assign the low 4 bits to the second pixel
                }
            }
        }
    }
    return board;
}

function convertBoardToRGBA(board) {
    const boardSize = board.length;
    const rgbaArray = new Uint8ClampedArray(boardSize * boardSize * 4); // 4 entries for each pixel (R, G, B, A)

    board.forEach((row, y) => {
        row.forEach((value, x) => {
            const [r, g, b, a] = colorsRGBA[value];
            const index = (y * boardSize + x) * 4;
            rgbaArray[index] = r;
            rgbaArray[index + 1] = g;
            rgbaArray[index + 2] = b;
            rgbaArray[index + 3] = a;
        });
    });
    console.log(rgbaArray);
    return rgbaArray;
}

function drawBoardOnCanvas(board, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const boardSize = board.length;
    canvas.width = boardSize;
    canvas.height = boardSize;
    const rgbaArray = convertBoardToRGBA(board);
    const imageData = new ImageData(rgbaArray, boardSize, boardSize);
    console.log(imageData);
    ctx.putImageData(imageData, 0, 0);
}

$(function () {
    // Populate color selection
    var $colorSelect = $('#colorSelect');
    $.each(colors, function (index, color) {
        $colorSelect.append($('<option></option>').val(index).html(color));
    });


    fetchBoardData(BOARD_DATA_URL)
        .then(arrayBuffer => processBoardData(arrayBuffer))
        .then(board => {
            drawBoardOnCanvas(board, 'canvas');
        })
        .catch(error => {
            console.error('Error:', error);
        });

    socket = new WebSocket(WEBSOCKET_URL);
    socket.onopen = function (event) {
        $('#sendButton').removeAttr('disabled');
        console.log("connected");
    };
    socket.onclose = function (event) {
        alert("closed code:" + event.code + " reason:" + event.reason + " wasClean:" + event.wasClean);
    };
    socket.onmessage = function (event) {
        var o = JSON.parse(event.data);
        if (o.type == "set") {
            var context = document.getElementById('canvas').getContext('2d');
            // assume that o.color stores a 4-bit color index, o.x and o.y give position
            console.log("Setting pixel at (" + o.x + ", " + o.y + ") to color " + o.color);
            context.fillStyle = colors[o.color];
            context.fillRect(o.x, o.y, 1, 1);
        } else if (o.type == "timeout") {
            alert("timeout, try again in a few minutes");
        }
    }
    $('#setForm').submit(function (event) {
        var o = {
            'x': $('#x').val(),
            'y': $('#y').val(),
            'color': $colorSelect.val(),
        };

        for (var key in o) {
            o[key] = parseInt(o[key]);
        }
        socket.send(JSON.stringify(o));
        event.preventDefault();
    });
});