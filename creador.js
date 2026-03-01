const db = require('better-sqlite3')('juego.db');

console.log("🔥  Generando EXOTIC: Versión RED ROOM...");

// 1. Reiniciar Tablas (Usuarios, Retos y CASTIGOS)
db.exec(`
  DROP TABLE IF EXISTS usuarios;
  DROP TABLE IF EXISTS retos;
  DROP TABLE IF EXISTS castigos;

  CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, password TEXT, avatar TEXT);
  CREATE TABLE retos (id INTEGER PRIMARY KEY AUTOINCREMENT, texto TEXT, nivel INTEGER, modo TEXT);
  CREATE TABLE castigos (id INTEGER PRIMARY KEY AUTOINCREMENT, texto TEXT);
`);

// --- DICCIONARIO PROVOCATIVO ---

// SUAVE (Seducción)
const accionesSuaves = ["Recorre con la nariz", "Besa lentamente", "Acaricia con las uñas", "Sopla caliente en", "Muerde suavemente", "Lame una vez", "Dibuja círculos con la lengua en"];
const partesSuaves = ["el cuello", "el lóbulo de la oreja", "la clavícula", "la palma de la mano", "la nuca", "el interior de la muñeca"];

// HOT (Deseo)
const accionesHot = ["Chupa con fuerza", "Aprieta firmemente", "Pasa un hielo por", "Besa con mucha lengua", "Deja un chupetón en", "Mete la mano y toca", "Nalguea en", "Pasa tu entrepierna por"];
const partesHot = ["la cintura", "la parte interna del muslo", "el abdomen bajo", "el borde de su ropa interior", "los glúteos", "el pecho"];

// EXTREME (Lujuria Total)
const accionesExtreme = ["Venda los ojos y estimula", "Usa saliva para mojar", "Simula sexo oral en", "Muerde fuerte", "Restriega tus genitales en", "Somete contra la pared y besa", "Introduce un dedo en la boca de", "Haz un baile privado pegado a"];
const partesExtreme = ["la entrepierna (con ropa)", "los pezones", "el bulto/zona V", "el trasero desnudo (o baja un poco la ropa)", "el perineo", "donde más le excite"];

const tiempos = ["por 20 segundos", "hasta que gima", "mirando a los ojos", "mientras te graban (simulado)", "sin usar las manos"];

// --- GENERADOR DE RETOS ---
const stmtReto = db.prepare('INSERT INTO retos (texto, nivel, modo) VALUES (?, ?, ?)');

function generar(nivel, modo, cantidad) {
    let acciones = (nivel === 1) ? accionesSuaves : (nivel === 2) ? accionesHot : accionesExtreme;
    let partes = (nivel === 1) ? partesSuaves : (nivel === 2) ? partesHot : partesExtreme;

    for (let i = 0; i < cantidad; i++) {
        const accion = acciones[Math.floor(Math.random() * acciones.length)];
        const parte = partes[Math.floor(Math.random() * partes.length)];
        const tiempo = tiempos[Math.floor(Math.random() * tiempos.length)];
        
        let texto = (modo === 'pareja') 
            ? `${accion} ${parte} de tu pareja ${tiempo}.` 
            : `${accion} ${parte} de {victima} ${tiempo}.`;
        
        stmtReto.run(texto, nivel, modo);
    }
}

// Generamos 300 retos
generar(1, 'pareja', 50); generar(1, 'grupo', 50);
generar(2, 'pareja', 50); generar(2, 'grupo', 50);
generar(3, 'pareja', 50); generar(3, 'grupo', 50);

// --- GENERADOR DE CASTIGOS (PENITENCIAS) ---
const stmtCastigo = db.prepare('INSERT INTO castigos (texto) VALUES (?)');
const listaCastigos = [
    "Quítate una prenda de ropa (elección del grupo).",
    "Bebe un fondo blanco (shot completo).",
    "Deja que el grupo te escriba algo en el cuerpo.",
    "Muestra tu historial de búsqueda del celular.",
    "Envia un mensaje picante a quien el grupo elija.",
    "Recibe una nalgada fuerte de cada jugador.",
    "Baila sin música de forma sexy por 1 minuto.",
    "Quédate en ropa interior por 2 turnos.",
    "Deja que te pasen un hielo por la espalda (por dentro de la ropa).",
    "Confiesa tu fantasía sexual más oscura."
];

listaCastigos.forEach(c => stmtCastigo.run(c));

console.log("✅ EXOTIC RED ROOM: Base de datos cargada con Retos y Castigos.");