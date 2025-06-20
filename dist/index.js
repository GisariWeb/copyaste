"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var http_1 = require("http");
var socket_io_1 = require("socket.io"); // Import Server dari socket.io
var path_1 = __importDefault(require("path"));
var app = (0, express_1.default)();
var server = (0, http_1.createServer)(app);
// Ganti WSServer dengan Socket.IO Server
var io = new socket_io_1.Server(server); // Buat instance Socket.IO server
// Map untuk menyimpan data teks berdasarkan ID URL (topik)
// Kita tetap menggunakan ini karena Socket.IO Rooms tidak menyimpan data
var rooms = {};
// Fungsi untuk menghasilkan string 8 karakter unik (tetap sama)
function generateUniqueUrlId() {
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    var charactersLength = characters.length;
    for (var i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
// Rute untuk root URL (tetap sama)
app.get('/', function (req, res) {
    var uniqueId = generateUniqueUrlId();
    console.log("Generated uniqueId:", uniqueId);
    res.redirect("/".concat(uniqueId));
});
// Rute untuk URL unik (tetap sama)
app.get('/test', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, '../public/test.html'));
});
// Rute untuk URL unik (tetap sama)
app.get('/:roomId', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, '../public/page.html'));
});
// Serve file statis (tetap sama)
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Ganti wss.on('connection', ...) dengan io.on('connection', ...)
io.on('connection', function (socket) {
    console.log('Client terhubung');
    // Socket.IO tidak otomatis mendapatkan URL handshake HTTP
    // Klien perlu memberitahu ke room mana mereka ingin bergabung
    // Kita akan menangani ini di sisi klien dengan event 'joinRoom'
    socket.on('joinRoom', function (roomId) {
        // Validasi roomId (opsional tapi disarankan)
        if (!/^[a-zA-Z0-9]{8}$/.test(roomId)) {
            console.log('Client mencoba bergabung ke room ID tidak valid:', roomId);
            socket.disconnect(true); // Putuskan koneksi jika ID tidak valid
            return;
        }
        // Gabungkan socket ke Socket.IO room
        socket.join(roomId);
        console.log("Client ".concat(socket.id, " bergabung ke room: ").concat(roomId));
        // Inisialisasi room data jika belum ada
        if (!rooms[roomId]) {
            rooms[roomId] = '';
        }
        // Kirim data teks yang sudah ada di room HANYA ke klien yang baru bergabung
        socket.emit('currentText', rooms[roomId]);
    });
    // Tangani pesan dari klien
    socket.on('textChange', function (data) {
        var roomId = data.roomId, text = data.text;
        console.log("Pesan diterima di room ".concat(roomId, " dari client ").concat(socket.id, ": ").concat(text));
        // Pastikan klien benar-benar berada di room yang mereka klaim
        if (!socket.rooms.has(roomId)) {
            console.warn("Client ".concat(socket.id, " mencoba mengirim pesan ke room ").concat(roomId, " tanpa bergabung."));
            return; // Abaikan pesan jika klien tidak di room
        }
        // Update data teks di room
        rooms[roomId] = text;
        // Siarkan pesan ke semua klien di room yang sama, KECUALI pengirim
        socket.to(roomId).emit('textUpdate', text);
        // Atau, siarkan ke SEMUA klien di room, termasuk pengirim:
        // io.to(roomId).emit('textUpdate', text);
    });
    socket.on('disconnect', function () {
        console.log('Client terputus:', socket.id);
        // Socket.IO secara otomatis menghapus socket dari rooms saat disconnect
        // Mungkin perlu logika tambahan jika Anda ingin menghapus data room jika kosong
        // Assuming you have a way to get the roomIds the socket was in
        var roomIds = Object.keys(socket.rooms).filter(function (roomId) { return roomId !== socket.id; }); // Exclude the default room
        roomIds.forEach(function (roomId) {
            // Check if the room is now empty
            // This part requires logic to count clients in a room
            // If room `roomId` is empty:
            // delete rooms[roomId];
            // console.log(`Room ${roomId} is empty and data has been destroyed.`);
        });
    });
    socket.on('error', function (error) {
        console.error('Socket.IO error:', error);
    });
});
var port = parseInt(process.env.PORT || '3000');
server.listen(port, function () {
    console.log("Server berjalan di http://localhost:".concat(port));
});
//# sourceMappingURL=index.js.map