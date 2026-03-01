const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

console.log("1. 🟢 Iniciando script de creación...");

// PARTE A: Crear el archivo físico a la fuerza
try {
    console.log("2. 🔨 Intentando crear archivo 'juego.db' vacio...");
    fs.writeFileSync('./juego.db', ''); 
    console.log("   ✅ ¡ÉXITO! Archivo físico creado.");
} catch (error) {
    console.log("   ❌ ERROR creando archivo físico:", error.message);
}

// PARTE B: Inyectar la estructura de la base de datos
console.log("3. 🔌 Conectando SQLite...");
const db = new sqlite3.Database('./juego.db', (err) => {
    if (err) {
        console.error("   ❌ ERROR DE CONEXIÓN:", err.message);
    } else {
        console.log("   ✅ Conexión establecida.");
    }
});

db.serialize(() => {
    console.log("4. 🏗️ Creando tablas...");
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        usuario TEXT PRIMARY KEY,
        email TEXT,
        pass TEXT,
        victorias INTEGER DEFAULT 0
    )`);

    console.log("5. 👑 Insertando Admin 'harvein'...");
    db.run(`INSERT OR IGNORE INTO usuarios (usuario, email, pass, victorias) 
            VALUES ('harvein', 'admin@juego.com', '123456', 999)`);
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log("6. 🏁 FINALIZADO. Revisa tu carpeta.");
});