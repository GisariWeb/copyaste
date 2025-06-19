import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io'; // Import Server dari socket.io
import path from 'path';

const app = express();
const server = createServer(app);
// Ganti WSServer dengan Socket.IO Server
const io = new Server(server); // Buat instance Socket.IO server

// Map untuk menyimpan data teks berdasarkan ID URL (topik)
// Kita tetap menggunakan ini karena Socket.IO Rooms tidak menyimpan data
const rooms: { [key: string]: string } = {};

// Fungsi untuk menghasilkan string 8 karakter unik (tetap sama)
function generateUniqueUrlId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Rute untuk root URL (tetap sama)
app.get('/', (req, res) => {
  const uniqueId = generateUniqueUrlId();
  console.log("Generated uniqueId:", uniqueId);
  res.redirect(`/${uniqueId}`);
});

// Rute untuk URL unik (tetap sama)
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test.html'));
});

// Rute untuk URL unik (tetap sama)
app.get('/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/page.html'));
});

// Serve file statis (tetap sama)
app.use(express.static(path.join(__dirname, '../public')));


// Ganti wss.on('connection', ...) dengan io.on('connection', ...)
io.on('connection', (socket) => {
  console.log('Client terhubung');

  // Socket.IO tidak otomatis mendapatkan URL handshake HTTP
  // Klien perlu memberitahu ke room mana mereka ingin bergabung
  // Kita akan menangani ini di sisi klien dengan event 'joinRoom'

  socket.on('joinRoom', (roomId: string) => {
    // Validasi roomId (opsional tapi disarankan)
    if (!/^[a-zA-Z0-9]{8}$/.test(roomId)) {
      console.log('Client mencoba bergabung ke room ID tidak valid:', roomId);
      socket.disconnect(true); // Putuskan koneksi jika ID tidak valid
      return;
    }

    // Gabungkan socket ke Socket.IO room
    socket.join(roomId);
    console.log(`Client ${socket.id} bergabung ke room: ${roomId}`);

    // Inisialisasi room data jika belum ada
    if (!rooms[roomId]) {
      rooms[roomId] = '';
    }

    // Kirim data teks yang sudah ada di room HANYA ke klien yang baru bergabung
    socket.emit('currentText', rooms[roomId]);
  });


  // Tangani pesan dari klien
  socket.on('textChange', (data: { roomId: string, text: string }) => {
    const { roomId, text } = data;
    console.log(`Pesan diterima di room ${roomId} dari client ${socket.id}: ${text}`);

    // Pastikan klien benar-benar berada di room yang mereka klaim
    if (!socket.rooms.has(roomId)) {
      console.warn(`Client ${socket.id} mencoba mengirim pesan ke room ${roomId} tanpa bergabung.`);
      return; // Abaikan pesan jika klien tidak di room
    }

    // Update data teks di room
    rooms[roomId] = text;

    // Siarkan pesan ke semua klien di room yang sama, KECUALI pengirim
    socket.to(roomId).emit('textUpdate', text);
    // Atau, siarkan ke SEMUA klien di room, termasuk pengirim:
    // io.to(roomId).emit('textUpdate', text);

  });

  socket.on('disconnect', () => {
    console.log('Client terputus:', socket.id);
    // Socket.IO secara otomatis menghapus socket dari rooms saat disconnect
    // Mungkin perlu logika tambahan jika Anda ingin menghapus data room jika kosong

    // Assuming you have a way to get the roomIds the socket was in
    const roomIds = Object.keys(socket.rooms).filter(roomId => roomId !== socket.id); // Exclude the default room

    roomIds.forEach(roomId => {
      // Check if the room is now empty
      // This part requires logic to count clients in a room
      // If room `roomId` is empty:
      // delete rooms[roomId];
      // console.log(`Room ${roomId} is empty and data has been destroyed.`);
    });
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

});

const port = parseInt(process.env.PORT || '3000');
server.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
