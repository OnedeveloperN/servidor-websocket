const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Mapa para rastrear los usuarios conectados (ws -> nombreDeUsuario)
const clientes = new Map();

// Función para enviar un objeto JSON a TODOS los clientes conectados (Broadcast)
function broadcast(data) {
  const mensajeJSON = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(mensajeJSON);
    }
  });
}

// Función para emitir la lista actualizada de usuarios activos
function broadcastUsuarios() {
  const listaUsuarios = Array.from(clientes.values());
  broadcast({
    type: 'user_list',
    users: listaUsuarios
  });
}

wss.on('connection', (ws) => {
  console.log('🔌 Nuevo cliente conectado');

  ws.on('message', (message) => {
    try {
      // Parseamos el mensaje recibido a objeto JS
      const data = JSON.parse(message.toString());

      // Registro de usuario (Nivel 3)
      if (data.type === 'login') {
        const nombreUsuario = data.user ? data.user.trim() : 'Anónimo';
        clientes.set(ws, nombreUsuario);

        console.log(`Usuario registrado: ${nombreUsuario}`);

        // Notificación del sistema
        broadcast({
          type: 'system',
          text: `${nombreUsuario} se ha unido al chat.`
        });

        // Actualizar lista de usuarios para todos
        broadcastUsuarios();
        return;
      }

      // Envío de mensaje de chat (Niveles 1, 2 y 3)
      if (data.type === 'message') {
        console.log(`💬 [${data.user || 'Anónimo'}]: ${data.message}`);

        broadcast({
          type: 'message',
          user: data.user || 'Anónimo',
          message: data.message
        });
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error.message);
    }
  });

  // Manejo de la desconexión
  ws.on('close', () => {
    const usuario = clientes.get(ws);
    if (usuario) {
      clientes.delete(ws);
      console.log(`❌ Usuario desconectado: ${usuario}`);

      // Notificar salida del usuario
      broadcast({
        type: 'system',
        text: `${usuario} ha salido del chat.`
      });

      // Enviar lista actualizada
      broadcastUsuarios();
    } else {
      console.log('🔌 Cliente sin registrar desconectado');
    }
  });

  ws.on('error', (err) => {
    console.error('⚠️ Error en Socket:', err.message);
  });
});

console.log(`🚀 Servidor WebSocket escuchando en ws://localhost:${PORT}`);