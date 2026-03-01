const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const db = require('better-sqlite3')('juego.db');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

console.log("🔥 INICIANDO EXOTIC SERVER...");

// --- 1. BASE DE DATOS ---
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE, password TEXT, avatar TEXT);
        CREATE TABLE IF NOT EXISTS retos (id INTEGER PRIMARY KEY AUTOINCREMENT, texto TEXT, nivel INTEGER, modo TEXT);
        CREATE TABLE IF NOT EXISTS castigos (id INTEGER PRIMARY KEY AUTOINCREMENT, texto TEXT);
        /* NUEVA TABLA PARA LOS RETOS PERSONALES DE CADA JUGADOR */
        CREATE TABLE IF NOT EXISTS retos_personales (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT, texto TEXT);
    `);

    db.exec("DELETE FROM retos;"); 
    const stmt = db.prepare('INSERT INTO retos (texto, nivel, modo) VALUES (?, ?, ?)');
    
    // Tus 30 retos base (Puedes agregar los 270 restantes aquí)
    const listaRetos = [
        ["Dale un beso en el cuello a tu pareja por 10 segundos.", 1, "parejas"],
        ["Hazle un masaje en los hombros a tu pareja.", 1, "parejas"],
        ["Dile al oído cuál es tu fantasía más leve.", 1, "parejas"],
        ["Besa la palma de su mano lentamente.", 1, "parejas"],
        ["Deja que tu pareja te bese donde quiera por 5 segundos.", 1, "parejas"],
        ["Quítale una prenda a tu pareja usando solo los dientes.", 2, "parejas"],
        ["Pasa un hielo por su abdomen.", 2, "parejas"],
        ["Hazle un chupetón suave en un lugar que no se vea.", 2, "parejas"],
        ["Muerde su labio inferior mientras lo miras.", 2, "parejas"],
        ["Tápale los ojos y dale a probar algo misterioso de tu cuerpo.", 2, "parejas"],
        ["Simula sexo oral (con ropa) por 30 segundos.", 3, "parejas"],
        ["Hazle un baile erótico sin camisa/blusa.", 3, "parejas"],
        ["Ponle alguna bebida en el cuello/pecho y tómatela desde ahí.", 3, "parejas"],
        ["Mete tu mano en su ropa interior por 1 minuto.", 3, "parejas"],
        ["Nalguea a tu pareja 3 veces.", 3, "parejas"],
        ["Dale un pico a {victima}.", 1, "grupo"],
        ["Siéntate en las piernas de {victima} por 1 ronda.", 1, "grupo"],
        ["Susúrrale algo sucio al oído a {victima}.", 1, "grupo"],
        ["Haz que {victima} te dé de beber en la boca.", 1, "grupo"],
        ["Manda un mensaje comprometedor a tu ex.", 1, "grupo"],
        ["Besa el cuello de {victima} por 10 segundos.", 2, "grupo"],
        ["Quítate una prenda frente a todos.", 2, "grupo"],
        ["Pasa un hielo por el pecho de {victima}.", 2, "grupo"],
        ["Véndate los ojos y adivina quién te toca.", 2, "grupo"],
        ["Dale un beso con lengua de 5 segundos a {victima}.", 2, "grupo"],
        ["Métete al baño 2 minutos a solas con {victima}.", 3, "grupo"],
        ["Hazle un lap dance a {victima}.", 3, "grupo"],
        ["Que {victima} te quite una prenda con los dientes.", 3, "grupo"],
        ["Tómate un shot del ombligo de {victima}.", 3, "grupo"],
        ["Simula una posición sexual con {victima}.", 3, "grupo"]
    ];

    const insertMany = db.transaction((retos) => {
        for (const r of retos) stmt.run(r[0], r[1], r[2]);
    });
    insertMany(listaRetos);

    db.exec("DELETE FROM castigos;");
    const stmtC = db.prepare('INSERT INTO castigos (texto) VALUES (?)');
    stmtC.run("Fondo blanco (Shot doble).");
    stmtC.run("Quítate dos prendas.");
    stmtC.run("Deja que revisen tu galería de fotos por 30 segundos.");

} catch (e) { console.error("Error en DB:", e); }

// --- 2. APIS REST ---
app.post('/api/registro', async (req, res) => {
    const { nombre, password, avatar } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        db.prepare('INSERT INTO usuarios (nombre, password, avatar) VALUES (?, ?, ?)').run(nombre, hash, avatar);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, msg: "Nombre ocupado." }); }
});

app.post('/api/login', async (req, res) => {
    const { nombre, password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM usuarios WHERE nombre = ?').get(nombre);
        if (user && await bcrypt.compare(password, user.password)) 
            res.json({ success: true, user: { id: user.id, nombre: user.nombre, avatar: user.avatar } });
        else res.json({ success: false, msg: "Datos incorrectos." });
    } catch (e) { res.json({ success: false, msg: "Error server." }); }
});

// NUEVO: Guardar reto personal
app.post('/api/guardar-reto', (req, res) => {
    const { usuario, texto } = req.body;
    db.prepare('INSERT INTO retos_personales (usuario, texto) VALUES (?, ?)').run(usuario, texto);
    res.json({ success: true });
});

// NUEVO: Cargar retos personales al iniciar sesión
app.post('/api/mis-retos', (req, res) => {
    const { usuario } = req.body;
    const retos = db.prepare('SELECT texto FROM retos_personales WHERE usuario = ?').all(usuario);
    res.json({ success: true, retos: retos.map(r => r.texto) });
});


// --- 3. SOCKETS ---
let salas = {}; 
let historiasSociales = [];
let contadorIdHistoria = 1;

io.on('connection', (socket) => {
    socket.emit('cargarHistorias', historiasSociales);

    socket.on('nuevaHistoria', (data) => {
        const nueva = { id: contadorIdHistoria++, autor: data.autor, texto: data.texto, likes: 0 };
        historiasSociales.unshift(nueva);
        if (historiasSociales.length > 50) historiasSociales.pop();
        io.emit('historiaRecibida', nueva);
    });

    socket.on('darLikeHistoria', (idHistoria) => {
        const historia = historiasSociales.find(h => h.id === idHistoria);
        if (historia) { historia.likes++; io.emit('likeActualizado', { id: historia.id, likes: historia.likes }); }
    });

    // MODIFICADO: Ahora recibe tus retos y los inyecta en la partida
    socket.on('entrarSala', ({ codigo, modo, usuario, misRetos }) => {
        socket.join(codigo);
        if (!salas[codigo]) salas[codigo] = { modo: modo || 'grupo', jugadores: [], turno: null, retosCustom: [] };
        
        const existe = salas[codigo].jugadores.find(j => j.nombre === usuario.nombre);
        if (!existe) salas[codigo].jugadores.push({ ...usuario, socketId: socket.id });
        
        // Agregar tu mazo personal a la ruleta de la sala
        if (misRetos && misRetos.length > 0) {
            salas[codigo].retosCustom.push(...misRetos);
        }

        io.to(codigo).emit('actualizarSala', salas[codigo]);
    });

    socket.on('agregarJugadorManual', ({ codigo, nombre }) => {
        if (salas[codigo]) {
            const existe = salas[codigo].jugadores.find(j => j.nombre === nombre);
            if (!existe) {
                salas[codigo].jugadores.push({ nombre: nombre, avatar: '👤', socketId: null, tipo: 'manual' });
                io.to(codigo).emit('actualizarSala', salas[codigo]);
            }
        }
    });

    socket.on('siguienteTurno', (codigo) => {
        const sala = salas[codigo];
        if (!sala) return;
        const nuevoActor = sala.jugadores[Math.floor(Math.random() * sala.jugadores.length)];
        sala.turno = nuevoActor;
        io.to(codigo).emit('cambioDeTurno', { actor: nuevoActor });
    });

    socket.on('pedirReto', ({ codigo, nivel }) => {
        const sala = salas[codigo];
        if (!sala) return;
        
        let texto = "¡Te salvaste! No hay retos cargados.";
        
        // 30% de probabilidad de que salga un reto de la lista secreta/personal de los jugadores
        if (sala.retosCustom.length > 0 && Math.random() < 0.3) {
            texto = "🤫 (De la Lista Negra): " + sala.retosCustom[Math.floor(Math.random() * sala.retosCustom.length)];
        } else {
            const dbReto = db.prepare('SELECT texto FROM retos WHERE nivel = ? AND modo = ? ORDER BY RANDOM() LIMIT 1').get(nivel, sala.modo);
            if(dbReto) texto = dbReto.texto;
        }

        let victima = "Tu Pareja";
        if (sala.modo === 'grupo' && sala.jugadores.length > 1) {
            const posibles = sala.jugadores.filter(j => j.nombre !== sala.turno.nombre);
            if(posibles.length > 0) {
                victima = posibles[Math.floor(Math.random() * posibles.length)].nombre;
                texto = texto.replace(/{victima}/g, victima);
            }
        }

        io.to(codigo).emit('resultadoReto', { texto, actor: sala.turno.nombre, victima, nivel: nivel });
    });

    socket.on('pedirCastigo', (codigo) => {
        const c = db.prepare('SELECT texto FROM castigos ORDER BY RANDOM() LIMIT 1').get();
        io.to(codigo).emit('mostrarCastigo', c ? c.texto : "¡Toma un shot!");
    });
});

// Cambia la última parte de tu archivo por esto:
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🔥 SERVER EXOTIC ACTIVO EN PUERTO ${PORT}`);
});