const CANVAS_SIZE = 1000;
const WEBSOCKET_URL = `ws://${window.location.hostname}:8081`;
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

$(function () {
    // Populate color selection
    var $colorSelect = $('#colorSelect');
    $.each(colors, function (index, color) {
        $colorSelect.append($('<option></option>').val(index).html(color));
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
            context.fillStyle = colors[o.color];
            context.fillRect(o.x, o.y, 10, 10);
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