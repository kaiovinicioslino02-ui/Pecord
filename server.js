const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const path=require('path');
const app=express(); const server=http.createServer(app); const io=new Server(server);
app.use(express.static(path.join(__dirname,'public')));
const rooms=new Map();
io.on('connection',socket=>{
 socket.on('join-room',room=>{
  room=String(room||'').trim().slice(0,32); if(!room)return;
  socket.join(room); socket.data.room=room;
  const peers=rooms.get(room)||new Set();
  socket.emit('room-info',{room,peers:peers.size});
  socket.to(room).emit('peer-joined',{id:socket.id});
  peers.add(socket.id); rooms.set(room,peers);
 });
 socket.on('signal',({to,data})=>{if(to)io.to(to).emit('signal',{from:socket.id,data});});
 socket.on('leave-room',()=>leave(socket));
 socket.on('disconnect',()=>leave(socket));
});
function leave(socket){const room=socket.data.room;if(!room)return;const peers=rooms.get(room);if(peers){peers.delete(socket.id);socket.to(room).emit('peer-left',{id:socket.id});if(!peers.size)rooms.delete(room);}}
const PORT=process.env.PORT||3000; server.listen(PORT,()=>console.log(`Servidor em http://localhost:${PORT}`));
