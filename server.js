const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuración para servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

const db = new sqlite3.Database('./toxic_v2.db');

// --- NUEVA TIENDA EXPANDIDA (31 ICONOS) ---
const CATALOGO = [
    { id: 'base_1', icon: '👤', precio: 0, moneda: 'gratis', nombre: 'Default' },
    { id: 'c_poop', icon: '💩', precio: 10, moneda: 'coins', nombre: 'Caca' },
    { id: 'c_fox',   icon: '🦊', precio: 50, moneda: 'coins', nombre: 'Zorro' },
    { id: 'c_ghost', icon: '👻', precio: 80, moneda: 'coins', nombre: 'Fantasma' },
    { id: 'c_robot', icon: '🤖', precio: 100, moneda: 'coins', nombre: 'Bot' },
    { id: 'c_diablo',icon: '😈', precio: 120, moneda: 'coins', nombre: 'Diablito' },
    { id: 'c_luna',  icon: '🌚', precio: 150, moneda: 'coins', nombre: 'Luna Turbia' },
    { id: 'c_fuego', icon: '🔥', precio: 200, moneda: 'coins', nombre: 'Fueguito' },
    { id: 'c_alien', icon: '👽', precio: 200, moneda: 'coins', nombre: 'Alien' },
    { id: 'c_duraz', icon: '🍑', precio: 250, moneda: 'coins', nombre: 'Duraznito' },
    { id: 'c_beren', icon: '🍆', precio: 300, moneda: 'coins', nombre: 'Berenjena' },
    { id: 'c_ninja', icon: '🥷', precio: 300, moneda: 'coins', nombre: 'Shinobi' }, 
    { id: 'c_calor', icon: '🥵', precio: 350, moneda: 'coins', nombre: 'Hot' },
    { id: 'c_beso',  icon: '💋', precio: 400, moneda: 'coins', nombre: 'Besito' },
    { id: 'c_rico',  icon: '🤑', precio: 500, moneda: 'coins', nombre: 'Ricachón' },

    { id: 't_snake', icon: '🐍', precio: 50, moneda: 'toxic', nombre: 'Víbora' },
    { id: 't_king',  icon: '👑', precio: 100, moneda: 'toxic', nombre: 'King' },
    { id: 't_escorp',icon: '🦂', precio: 150, moneda: 'toxic', nombre: 'Escorpión' },
    { id: 't_skull', icon: '💀', precio: 200, moneda: 'toxic', nombre: 'Skull' },
    { id: 't_marc',  icon: '👾', precio: 250, moneda: 'toxic', nombre: 'Marciano' },
    { id: 't_clown', icon: '🤡', precio: 300, moneda: 'toxic', nombre: 'Clown' },
    { id: 't_moon',  icon: '🚀', precio: 350, moneda: 'toxic', nombre: 'To The Moon' },
    { id: 't_luci',  icon: '👿', precio: 400, moneda: 'toxic', nombre: 'Lucifer' },
    { id: 't_vamp',  icon: '🦇', precio: 450, moneda: 'toxic', nombre: 'Vampiro' },
    { id: 't_cens',  icon: '🔞', precio: 500, moneda: 'toxic', nombre: 'Censurado' },
    { id: 't_dragon',icon: '🐉', precio: 500, moneda: 'toxic', nombre: 'Dragón' },
    { id: 't_sugar', icon: '💍', precio: 600, moneda: 'toxic', nombre: 'Sugar' },
    { id: 't_millo', icon: '💸', precio: 700, moneda: 'toxic', nombre: 'Millonario' },
    { id: 't_diam',  icon: '💎', precio: 800, moneda: 'toxic', nombre: 'Diamante' },
    { id: 't_brain', icon: '🧠', precio: 900, moneda: 'toxic', nombre: 'Big Brain' },
    { id: 't_ojo',   icon: '👁️', precio: 1000, moneda: 'toxic', nombre: 'Illuminati' }
];

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (usuario TEXT PRIMARY KEY, email TEXT, pass TEXT, victorias INTEGER DEFAULT 0, avatar TEXT DEFAULT '👤', avatar_type TEXT DEFAULT 'emoji', coins INTEGER DEFAULT 0, toxic INTEGER DEFAULT 0, items TEXT DEFAULT 'base_1', vip INTEGER DEFAULT 0)`);
    db.run("ALTER TABLE usuarios ADD COLUMN vip INTEGER DEFAULT 0", (err) => {});
    db.run(`CREATE TABLE IF NOT EXISTS amigos (id INTEGER PRIMARY KEY AUTOINCREMENT, de TEXT, para TEXT, estado TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS historial (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT, resultado TEXT, fecha TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS soporte (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT, email TEXT, mensaje TEXT, respuesta TEXT, fecha TEXT)`);
    
    const todos = CATALOGO.map(i => i.id).join(',');
    db.run(`INSERT OR IGNORE INTO usuarios (usuario, email, pass, victorias, avatar, coins, toxic, items, vip) VALUES ('admin', 'admin@toxic.com', '123456', 999, '👑', 99999, 99999, '${todos}', 1)`);
    db.run(`INSERT OR IGNORE INTO usuarios (usuario, email, pass, victorias, avatar, coins, toxic, items, vip) VALUES ('soporte1', 'soporte@toxic.com', '123456', 0, '🛡️', 0, 0, '${todos}', 1)`);
});

let salas = {};
let usuariosConectados = {}; 
let usuariosOnline = {};

io.on('connection', (socket) => {
    let miUsuario = null;
    let miSalaID = null;

    // --- AUTH ---
    socket.on('registro', (data) => {
        if (!data.usuario || !data.pass || !data.email) return socket.emit('errorLogin', '⚠️ Faltan datos.');
        const query = `INSERT INTO usuarios (usuario, email, pass, coins, toxic, avatar, avatar_type, items, vip) VALUES (?, ?, ?, 0, 0, '👤', 'emoji', 'base_1', 0)`;
        db.run(query, [data.usuario, data.email, data.pass], function(err) {
            if (err) socket.emit('errorLogin', '⚠️ Usuario ocupado.'); else iniciarSesion(socket, data.usuario);
        });
    });

    socket.on('login', (data) => {
        db.get("SELECT * FROM usuarios WHERE usuario = ?", [data.usuario], (err, row) => {
            if (!row || row.pass !== data.pass) socket.emit('errorLogin', '⚠️ Datos incorrectos.'); else iniciarSesion(socket, row.usuario);
        });
    });

    function iniciarSesion(socket, usuario) {
        miUsuario = usuario; usuariosConectados[socket.id] = usuario; usuariosOnline[usuario] = socket.id;
        const esAdmin = (usuario === 'soporte1' || usuario === 'admin');
        db.get("SELECT * FROM usuarios WHERE usuario = ?", [usuario], (err, row) => {
            db.all("SELECT resultado, fecha FROM historial WHERE usuario = ? ORDER BY id DESC LIMIT 10", [usuario], (eh, history) => {
                socket.emit('loginExitoso', { ...row, historial: history || [], esAdmin: esAdmin });
                socket.emit('datosCatalogo', CATALOGO);
            });
        });
    }

    // --- PANEL DE ADMIN ---
    socket.on('adminActualizarUsuario', (data) => {
        if (miUsuario !== 'soporte1' && miUsuario !== 'admin') return;
        db.get("SELECT * FROM usuarios WHERE usuario = ?", [data.usuario], (err, row) => {
            if (!row) return socket.emit('notificacion', '❌ Usuario no encontrado.');
            db.run("UPDATE usuarios SET vip = ?, coins = coins + ?, toxic = toxic + ? WHERE usuario = ?", 
                [data.vip ? 1 : 0, parseInt(data.coins) || 0, parseInt(data.toxic) || 0, data.usuario], 
                (err) => {
                    if (!err) {
                        socket.emit('notificacion', `✅ Cuenta de ${data.usuario} actualizada.`);
                        if (usuariosOnline[data.usuario]) {
                            const targetSocket = usuariosOnline[data.usuario];
                            db.get("SELECT * FROM usuarios WHERE usuario = ?", [data.usuario], (e, upRow) => {
                                io.to(targetSocket).emit('saldoActualizado', { coins: upRow.coins, toxic: upRow.toxic, vip: upRow.vip });
                                io.to(targetSocket).emit('notificacion', '💎 Tu cuenta ha sido actualizada por un Administrador.');
                            });
                        }
                    }
                }
            );
        });
    });

    // --- SOPORTE ---
    socket.on('enviarSoporte', (data) => {
        if(!miUsuario) return;
        const fecha = new Date().toLocaleString();
        db.run("INSERT INTO soporte (usuario, email, mensaje, fecha) VALUES (?, ?, ?, ?)", [miUsuario, data.email, data.mensaje, fecha], (err) => {
            if(!err) { socket.emit('notificacion', '✅ Ticket enviado.'); if(usuariosOnline['soporte1']) io.to(usuariosOnline['soporte1']).emit('notificacion', '🔔 Nuevo Ticket Recibido'); } 
            else socket.emit('notificacion', '❌ Error al guardar ticket.');
        });
    });
    socket.on('obtenerMisTickets', () => { if(miUsuario) db.all("SELECT * FROM soporte WHERE usuario = ? ORDER BY id DESC", [miUsuario], (err, rows) => { socket.emit('misTickets', rows || []); }); });
    socket.on('obtenerTicketsAdmin', () => { if(miUsuario === 'soporte1' || miUsuario === 'admin') db.all("SELECT * FROM soporte ORDER BY id DESC", [], (err, rows) => { socket.emit('listaTicketsAdmin', rows || []); }); });
    socket.on('adminResponderTicket', (data) => {
        if(miUsuario !== 'soporte1' && miUsuario !== 'admin') return;
        db.run("UPDATE soporte SET respuesta = ? WHERE id = ?", [data.respuesta, data.id], function(err) {
            if(!err) {
                socket.emit('notificacion', 'Respuesta enviada.');
                db.all("SELECT * FROM soporte ORDER BY id DESC", [], (err, rows) => { socket.emit('listaTicketsAdmin', rows || []); });
                db.get("SELECT usuario FROM soporte WHERE id = ?", [data.id], (e, row) => { if(row && usuariosOnline[row.usuario]) { const sUser = usuariosOnline[row.usuario]; io.to(sUser).emit('notificacion', '💬 Soporte ha respondido tu ticket.'); db.all("SELECT * FROM soporte WHERE usuario = ? ORDER BY id DESC", [row.usuario], (e2, rowsUser) => { io.to(sUser).emit('misTickets', rowsUser || []); }); } });
            }
        });
    });

    // --- SALAS ---
    socket.on('obtenerSalas', () => {
        const lista = Object.keys(salas).map(id => ({ id: id, nombre: salas[id].nombre, privada: !!salas[id].pass, jugadores: salas[id].jugadores.length, enCurso: salas[id].juegoEnCurso, meta: salas[id].metaPuntos }));
        socket.emit('listaSalas', lista);
    });

    socket.on('crearSala', (data) => {
        const idSala = 'sala_' + Math.random().toString(36).substr(2, 6);
        const meta = parseInt(data.meta) || 100; 
        salas[idSala] = {
            id: idSala, nombre: data.nombre || `Sala de ${miUsuario}`, pass: data.clave || null, metaPuntos: meta,
            jugadores: [], juegoEnCurso: false, rumores: [], victimaID: null, puntajesPartida: {}, turnoActual: 0, timerVotacion: null,
            estadisticas: {} 
        };
        unirseASala(socket, idSala, data.clave);
    });

    socket.on('unirseSala', (data) => unirseASala(socket, data.id, data.clave));

    function unirseASala(socket, idSala, clave) {
        const sala = salas[idSala];
        if (!sala) return socket.emit('notificacion', 'Sala no existe.');
        if (sala.juegoEnCurso) return socket.emit('notificacion', 'Partida en curso.');
        if (sala.pass && sala.pass !== clave) return socket.emit('notificacion', 'Clave incorrecta.');
        if (miSalaID && miSalaID !== idSala) salirDeSala(socket);

        db.get("SELECT victorias, avatar, avatar_type FROM usuarios WHERE usuario = ?", [miUsuario], (err, row) => {
            miSalaID = idSala;
            socket.join(idSala);
            const index = sala.jugadores.findIndex(p => p.nombre === miUsuario);
            if (index !== -1) { sala.jugadores[index].id = socket.id; sala.jugadores[index].avatar = row.avatar; sala.jugadores[index].avatarType = row.avatar_type || 'emoji'; } 
            else { sala.jugadores.push({ id: socket.id, nombre: miUsuario, victorias: row.victorias, avatar: row.avatar, avatarType: row.avatar_type || 'emoji' }); }

            if (!sala.puntajesPartida[miUsuario]) sala.puntajesPartida[miUsuario] = 0;
            if (!sala.estadisticas[miUsuario]) sala.estadisticas[miUsuario] = { ganados: 0, victima: 0 };
            
            socket.emit('entradoEnSala', { nombreSala: sala.nombre, codigo: idSala, meta: sala.metaPuntos });
            io.to(idSala).emit('actualizarSala', sala.jugadores);
            io.emit('actualizarListaSalas');
        });
    }

    socket.on('salirSala', () => salirDeSala(socket));

    function salirDeSala(socket) {
        if (!miSalaID || !salas[miSalaID]) { socket.emit('vueltoAlDashboard'); return; }
        const sala = salas[miSalaID];
        if (sala.timerVotacion) clearTimeout(sala.timerVotacion);

        const eraLider = sala.jugadores.length > 0 && sala.jugadores[0].id === socket.id;
        sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id);
        socket.leave(miSalaID);
        socket.emit('vueltoAlDashboard');

        if (sala.jugadores.length === 0) delete salas[miSalaID];
        else {
            if (eraLider) io.to(miSalaID).emit('notificacion', `👑 Nuevo líder: ${sala.jugadores[0].nombre}`);
            io.to(miSalaID).emit('actualizarSala', sala.jugadores);
        }
        miSalaID = null; io.emit('actualizarListaSalas');
    }

    socket.on('invitarAmigo', (nombreAmigo) => {
        if (!miUsuario || !miSalaID || !salas[miSalaID]) return;
        const targetSocket = usuariosOnline[nombreAmigo];
        if (targetSocket) { io.to(targetSocket).emit('invitacionRecibida', { salaId: miSalaID, salaNombre: salas[miSalaID].nombre, host: miUsuario, pass: salas[miSalaID].pass }); socket.emit('notificacion', `📩 Invitación enviada a ${nombreAmigo}`); } 
        else { socket.emit('notificacion', '⚠️ El usuario no está conectado.'); }
    });

    // --- GAME LOOP ---
    socket.on('iniciarJuego', () => {
        const sala = salas[miSalaID];
        if(!sala || sala.jugadores.length < 4) return socket.emit('notificacion', 'Mínimo 4 jugadores.');
        sala.jugadores.forEach(j => { sala.puntajesPartida[j.nombre] = 0; sala.estadisticas[j.nombre] = { ganados: 0, victima: 0 }; });
        sala.turnoActual = 0; sala.juegoEnCurso = true;
        iniciarRonda(sala);
    });

    function iniciarRonda(sala) {
        if (!sala || sala.jugadores.length < 4) return;
        sala.rumores = [];
        if (sala.timerVotacion) clearTimeout(sala.timerVotacion);

        const indiceElegido = sala.turnoActual % sala.jugadores.length;
        const victima = sala.jugadores[indiceElegido];
        if (!victima) { sala.turnoActual++; return iniciarRonda(sala); }

        sala.victimaID = victima.id;
        sala.puntajesPartida[victima.nombre] += 20;
        sala.estadisticas[victima.nombre].victima++; 
        
        db.run("UPDATE usuarios SET coins = coins + 20 WHERE usuario = ?", [victima.nombre]);

        if (sala.puntajesPartida[victima.nombre] >= sala.metaPuntos) { declararVictoriaFinal(sala, victima.nombre); return; }

        io.to(sala.id).emit('actualizarPuntajesPartida', sala.puntajesPartida);
        sala.jugadores.forEach(j => { io.to(j.id).emit('faseEscritura', { msj: j.id === victima.id ? "👑 ERES EL ELEGIDO (+20 PTS)" : `RUMOR SOBRE ${victima.nombre}`, esVictima: j.id === victima.id }); });
        io.emit('actualizarListaSalas');
    }

    // AQUI SE SOLUCIONÓ EL ERROR DEL OBJECT OBJECT
    socket.on('enviarRumor', (data) => {
        const sala = salas[miSalaID];
        if(!sala) return;
        const autor = sala.jugadores.find(j => j.id === socket.id);
        
        if(autor && !sala.rumores.find(r => r.id === socket.id)) {
            db.get("SELECT coins, toxic FROM usuarios WHERE usuario = ?", [autor.nombre], (err, row) => {
                let costoCoins = data.escudo ? 50 : 0;
                let costoToxic = data.dobleFilo ? 10 : 0;
                
                if (row.coins < costoCoins || row.toxic < costoToxic) {
                    socket.emit('notificacion', '❌ No tienes saldo suficiente para esos Power-Ups.');
                    data.escudo = false; data.dobleFilo = false; costoCoins = 0; costoToxic = 0;
                }
                
                db.run("UPDATE usuarios SET coins = coins - ?, toxic = toxic - ?, coins = coins + 5 WHERE usuario = ?", [costoCoins, costoToxic, autor.nombre], () => {
                    db.get("SELECT coins, toxic, vip FROM usuarios WHERE usuario = ?", [autor.nombre], (e, upRow) => socket.emit('saldoActualizado', upRow));
                    
                    // Aseguramos que data.texto se guarde como String
                    sala.rumores.push({ 
                        id: socket.id, 
                        texto: String(data.texto), 
                        autor: data.escudo ? "Anónimo (Escudo)" : autor.nombre, 
                        dobleFilo: data.dobleFilo 
                    });
                    
                    sala.puntajesPartida[autor.nombre] += 5; 
                    io.to(sala.id).emit('actualizarPuntajesPartida', sala.puntajesPartida);

                    if(sala.rumores.length >= sala.jugadores.length - 1) {
                        const rumoresParaVotar = sala.rumores
                            .map(r => ({ texto: r.texto, originalIndex: sala.rumores.indexOf(r), autor: r.autor }))
                            .sort(() => Math.random() - 0.5);

                        io.to(miSalaID).emit('faseVotacion', { rumores: rumoresParaVotar, idDecisor: sala.victimaID, tiempo: 30 });
                        sala.timerVotacion = setTimeout(() => { castigarElegido(sala); }, 30000);
                    }
                });
            });
        }
    });

    function castigarElegido(sala) {
        const victima = sala.jugadores.find(j => j.id === sala.victimaID);
        if (victima) {
            sala.puntajesPartida[victima.nombre] -= 20;
            io.to(sala.id).emit('notificacion', `⌛ Tiempo agotado. ${victima.nombre} pierde 20 puntos.`);
            io.to(sala.id).emit('actualizarPuntajesPartida', sala.puntajesPartida);
            sala.turnoActual++;
            setTimeout(() => { if(salas[sala.id] && sala.juegoEnCurso) iniciarRonda(sala); }, 3000);
        }
    }

    socket.on('elegirGanador', (originalIndex) => {
        const sala = salas[miSalaID];
        if(!sala) return;
        if(socket.id !== sala.victimaID) return;
        if (sala.timerVotacion) clearTimeout(sala.timerVotacion);

        const ganador = sala.rumores[originalIndex];
        if (ganador) {
            const ptsGanados = ganador.dobleFilo ? 40 : 20;
            const nombreReal = sala.jugadores.find(j => j.id === ganador.id).nombre;
            
            sala.puntajesPartida[nombreReal] += ptsGanados;
            sala.estadisticas[nombreReal].ganados++; 
            db.run("UPDATE usuarios SET coins = coins + ? WHERE usuario = ?", [ptsGanados, nombreReal]);
            
            if (sala.puntajesPartida[nombreReal] >= sala.metaPuntos) {
                declararVictoriaFinal(sala, nombreReal);
            } else {
                // AQUI ENVIAMOS LOS PUNTOS AL FRONTEND PARA EVITAR EL "undefined"
                io.to(sala.id).emit('resultadoRonda', { ganador: "Anónimo", texto: ganador.texto, puntajes: sala.puntajesPartida, pts: ptsGanados });
                sala.turnoActual++; 
                setTimeout(() => { if(salas[sala.id] && sala.juegoEnCurso) iniciarRonda(sala); }, 5000);
            }
        }
    });

    function declararVictoriaFinal(sala, nombreGanador) {
        const fecha = new Date().toLocaleDateString();
        let elToxico = { nombre: "Nadie", valor: -1 };
        let blancoFacil = { nombre: "Nadie", valor: -1 };
        
        Object.keys(sala.estadisticas).forEach(n => {
            if(sala.estadisticas[n].ganados > elToxico.valor) { elToxico = { nombre: n, valor: sala.estadisticas[n].ganados }; }
            if(sala.estadisticas[n].victima > blancoFacil.valor) { blancoFacil = { nombre: n, valor: sala.estadisticas[n].victima }; }
        });

        sala.jugadores.forEach(j => {
            const res = j.nombre === nombreGanador ? "VICTORIA SUPREMA" : "DERROTA";
            db.run("INSERT INTO historial (usuario, resultado, fecha) VALUES (?, ?, ?)", [j.nombre, res, fecha]);
        });
        
        // AQUI ESTAN LAS 300 MONEDAS POR GANAR LA PARTIDA
        db.run("UPDATE usuarios SET victorias = victorias + 1, coins = coins + 300 WHERE usuario = ?", [nombreGanador], () => {
             if(usuariosOnline[nombreGanador]) {
                 db.get("SELECT coins, toxic, vip FROM usuarios WHERE usuario = ?", [nombreGanador], (e, row) => {
                     io.to(usuariosOnline[nombreGanador]).emit('saldoActualizado', row);
                     io.to(usuariosOnline[nombreGanador]).emit('notificacion', '🏆 ¡Has ganado 300 Coins por tu victoria!');
                 });
             }
        });
        
        io.to(sala.id).emit('finDePartidaTotal', { 
            ganador: nombreGanador, meta: sala.metaPuntos, titulos: { toxico: elToxico.nombre, victima: blancoFacil.nombre }
        });
        sala.juegoEnCurso = false; io.emit('actualizarListaSalas');
    }

    socket.on('lobbyReaction', (e) => { if(miSalaID) io.to(miSalaID).emit('gameReaction', { id: socket.id, emoji: e }); });
    
    // UTILS VARIOS
    socket.on('comprarItem', (id) => { if(!miUsuario) return; const item = CATALOGO.find(i=>i.id===id); db.get("SELECT coins,toxic,items FROM usuarios WHERE usuario=?", [miUsuario], (e,r)=>{ if(r.items.split(',').includes(id)) return socket.emit('notificacion','Ya lo tienes.'); if(item.moneda==='coins' && r.coins<item.precio) return socket.emit('notificacion','Faltan Coins'); if(item.moneda==='toxic' && r.toxic<item.precio) return socket.emit('notificacion','Faltan Toxic'); let q = item.moneda==='coins' ? "UPDATE usuarios SET coins=coins-?, items=items||','||? WHERE usuario=?" : "UPDATE usuarios SET toxic=toxic-?, items=items||','||? WHERE usuario=?"; db.run(q, [item.precio, id, miUsuario], ()=>{ socket.emit('notificacion',`✅ Comprado: ${item.nombre}`); db.get("SELECT * FROM usuarios WHERE usuario=?",[miUsuario],(e,up)=>socket.emit('loginExitoso',up)); }); }); });
    socket.on('cambiarAvatar', (d) => { if(!miUsuario) return; db.run("UPDATE usuarios SET avatar=?, avatar_type=? WHERE usuario=?",[d.valor,d.tipo,miUsuario],()=>{ if(miSalaID && salas[miSalaID]) { const p = salas[miSalaID].jugadores.find(j=>j.nombre===miUsuario); if(p) { p.avatar=d.valor; p.avatarType=d.tipo; io.to(miSalaID).emit('actualizarSala',salas[miSalaID].jugadores); } } socket.emit('avatarActualizado', d); }); });
    socket.on('cargarSocial', () => { if(!miUsuario) return; db.all(`SELECT id, de, para FROM amigos WHERE (de=? OR para=?) AND estado='aceptado'`, [miUsuario, miUsuario], (err, rows) => { const amigosList = rows.map(r => { const nombreAmigo = r.de === miUsuario ? r.para : r.de; return { id: r.id, nombre: nombreAmigo, online: !!usuariosOnline[nombreAmigo] }; }); db.all(`SELECT id, de FROM amigos WHERE para=? AND estado='pendiente'`, [miUsuario], (err2, reqs) => { socket.emit('socialData', { amigos: amigosList, solicitudes: reqs || [] }); }); }); });
    socket.on('buscarPersona', (b) => { if(!miUsuario) return; db.all("SELECT usuario FROM usuarios WHERE usuario LIKE ? AND usuario != ? LIMIT 5", [`%${b}%`, miUsuario], (err, rows) => { socket.emit('resultadoBusquedaSocial', rows || []); }); });
    socket.on('enviarSolicitudAmistad', (d) => { if(!miUsuario) return; db.get("SELECT * FROM amigos WHERE (de=? AND para=?) OR (de=? AND para=?)", [miUsuario, d, d, miUsuario], (err, row) => { if(row) return socket.emit('notificacion', 'Ya existe relación.'); db.run("INSERT INTO amigos (de, para, estado) VALUES (?, ?, 'pendiente')", [miUsuario, d], () => { socket.emit('notificacion', `Solicitud enviada a ${d}`); socket.emit('refrescarSocial'); if(usuariosOnline[d]) { io.to(usuariosOnline[d]).emit('notificacion', `Solicitud de ${miUsuario}`); io.to(usuariosOnline[d]).emit('refrescarSocial'); } }); }); });
    socket.on('responderSolicitud', (d) => { db.get("SELECT de, para FROM amigos WHERE id=?", [d.id], (err, row) => { if(!row) return; const otroUsuario = row.de === miUsuario ? row.para : row.de; if(d.accion === 'aceptar') { db.run("UPDATE amigos SET estado='aceptado' WHERE id=?", [d.id], () => { socket.emit('notificacion', '¡Nuevo amigo!'); socket.emit('refrescarSocial'); if(usuariosOnline[otroUsuario]) io.to(usuariosOnline[otroUsuario]).emit('refrescarSocial'); }); } else { db.run("DELETE FROM amigos WHERE id=?", [d.id], () => { socket.emit('refrescarSocial'); if(usuariosOnline[otroUsuario]) io.to(usuariosOnline[otroUsuario]).emit('refrescarSocial'); }); } }); });
    socket.on('eliminarAmigo', (n) => { db.run("DELETE FROM amigos WHERE (de=? AND para=?) OR (de=? AND para=?)", [miUsuario, n, n, miUsuario], () => { socket.emit('notificacion', 'Eliminado.'); socket.emit('refrescarSocial'); if(usuariosOnline[n]) io.to(usuariosOnline[n]).emit('refrescarSocial'); }); });
    socket.on('disconnect', () => { salirDeSala(socket); delete usuariosConectados[socket.id]; if(miUsuario) delete usuariosOnline[miUsuario]; });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,'0.0.0.0', () => console.log(`🔥 SERVIDOR ACTIVO EN EL PUERTO: ${PORT}`));