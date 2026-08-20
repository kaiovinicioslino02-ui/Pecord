const socket=io();let room='',localStream=null,screenStream=null,peers=new Map();let micOn=true,camOn=true;
const $=id=>document.getElementById(id);const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]};
function setStatus(t){$('status').textContent=t}
async function media(){if(localStream)return;localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});$('local').srcObject=localStream}
function newPeer(id,offer){const pc=new RTCPeerConnection(rtcConfig);peers.set(id,pc);localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));pc.ontrack=e=>{$('remote').srcObject=e.streams[0]};pc.onicecandidate=e=>{if(e.candidate)socket.emit('signal',{to:id,data:{candidate:e.candidate}})};if(offer)pc.createOffer().then(o=>pc.setLocalDescription(o).then(()=>socket.emit('signal',{to:id,data:{description:pc.localDescription}})));return pc}
socket.on('connect',()=>setStatus('Conectado'));
socket.on('room-info',async info=>{await media();$('join').classList.add('hidden');$('call').classList.remove('hidden');$('roomLabel').textContent=room;setStatus(`Sala conectada • ${info.peers} participante(s)`)});
socket.on('peer-joined',({id})=>newPeer(id,true));
socket.on('signal',async({from,data})=>{let pc=peers.get(from)||newPeer(from,false);if(data.description){await pc.setRemoteDescription(data.description);if(data.description.type==='offer'){const a=await pc.createAnswer();await pc.setLocalDescription(a);socket.emit('signal',{to:from,data:{description:pc.localDescription}})}}else if(data.candidate)await pc.addIceCandidate(data.candidate)});
socket.on('peer-left',({id})=>{peers.get(id)?.close();peers.delete(id);$('remote').srcObject=null});
$('joinBtn').onclick=async()=>{room=$('room').value.trim();if(!room)return alert('Digite um código.');try{await media();socket.emit('join-room',room)}catch(e){alert('Permita câmera e microfone no navegador.')}};
$('randomBtn').onclick=()=>{$('room').value=Math.random().toString(36).slice(2,8).toUpperCase();$('joinBtn').click()};
$('mic').onclick=()=>{micOn=!micOn;localStream?.getAudioTracks().forEach(t=>t.enabled=micOn);$('mic').textContent=micOn?'🎤 Microfone':'🔇 Microfone'};
$('cam').onclick=()=>{camOn=!camOn;localStream?.getVideoTracks().forEach(t=>t.enabled=camOn);$('cam').textContent=camOn?'📷 Câmera':'🚫 Câmera'};
$('screen').onclick=async()=>{try{screenStream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});const track=screenStream.getVideoTracks()[0];for(const pc of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(track)}$('local').srcObject=new MediaStream([track,...localStream.getAudioTracks()]);track.onended=async()=>{const cam=localStream.getVideoTracks()[0];for(const pc of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(cam)}$('local').srcObject=localStream}}catch(e){console.log(e)}};
$('hang').onclick=()=>{socket.emit('leave-room');peers.forEach(p=>p.close());peers.clear();localStream?.getTracks().forEach(t=>t.stop());location.reload()};
$('copy').onclick=async()=>{await navigator.clipboard.writeText(room);$('copy').textContent='Copiado!';setTimeout(()=>$('copy').textContent='Copiar código',1500)};
