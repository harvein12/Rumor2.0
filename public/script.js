const socket = io();
let soyVictima = false;

// --- NAVEGACIÓN ---
function cambiarPantalla(idDestino) {
    document.querySelectorAll('.pantalla').forEach(p => p.style.display = 'none');
    document.getElementById(idDestino).style.display = 'block';
}

// --- ACCIONES ---
function unirse() {
    const nombre = document.getElementById('nombreInput').value;
    if (nombre) {
        socket.emit('unirse', nombre);
        cambiarPantalla('sala-espera');
    } else {
        alert("¡Escribe un nombre!");
    }
}

function comenzar() {
    socket.emit('iniciarJuego');
}

function enviarRumor() {
    const texto = document.getElementById('rumorInput').value;
    if (texto.trim() !== "") {
        socket.emit('enviarRumor', texto);
        document.getElementById('caja-escritura').style.display = 'none';
        document.getElementById('espera-escritura').style.display = 'block';
    }
}

// --- EVENTOS DEL SERVIDOR ---
socket.on('actualizarLista', (lista) => {
    document.getElementById('listaJugadores').innerHTML = lista.map(j => `<li>👤 ${j.nombre}</li>`).join('');
});

// AVISO DE ERROR (Importante para saber si algo falla)
socket.on('error', (msg) => {
    alert(msg);
});

// 1. INICIO RONDA
socket.on('faseEscritura', (data) => {
    soyVictima = data.esVictima;
    cambiarPantalla('pantalla-escritura');
    document.getElementById('instrucciones-escritura').innerText = data.msj;

    document.getElementById('caja-escritura').style.display = soyVictima ? 'none' : 'block';
    document.getElementById('espera-escritura').style.display = soyVictima ? 'block' : 'none';
    
    if (soyVictima) {
        document.getElementById('espera-escritura').innerHTML = "<h3>Eres la Víctima</h3><p>Relájate, están escribiendo sobre ti...</p>";
    } else {
        document.getElementById('rumorInput').value = "";
    }
});

// 2. VOTACIÓN
socket.on('faseVotacion', (rumores) => {
    cambiarPantalla('pantalla-votacion');
    const titulo = document.getElementById('titulo-voto');
    const sub = document.getElementById('subtitulo-voto');
    const grid = document.getElementById('grid-rumores');

    document.getElementById('mensaje-ya-voto').style.display = 'none';
    grid.style.pointerEvents = 'auto';

    if (soyVictima) {
        titulo.innerText = "¡ELIJE LA VERDAD!";
        sub.innerText = "Selecciona el rumor VERDADERO (o tu favorito).";
    } else {
        titulo.innerText = "¿CUÁL ELEGIRÁ LA VÍCTIMA?";
        sub.innerText = "Adivina qué tarjeta elegirá el protagonista.";
    }

    grid.innerHTML = rumores.map((r, index) => `
        <div class="tarjeta" onclick="votar(${index}, this)">
            "${r.texto}"
        </div>
    `).join('');
});

function votar(index, elemento) {
    const tarjetas = document.querySelectorAll('.tarjeta');
    tarjetas.forEach(t => t.style.opacity = '0.5');
    elemento.style.opacity = '1';
    elemento.style.border = '4px solid #feca57';

    document.getElementById('grid-rumores').style.pointerEvents = 'none';
    document.getElementById('mensaje-ya-voto').style.display = 'block';

    if (soyVictima) {
        socket.emit('eleccionVictima', index);
    } else {
        socket.emit('enviarVoto', index);
    }
}

// 3. RESULTADOS
socket.on('faseResultados', (data) => {
    cambiarPantalla('pantalla-resultados');
    const div = document.getElementById('resultado-final');
    
    const indexGanador = data.correcta !== null ? data.correcta : 0;
    const rumorGanador = data.rumores[indexGanador];
    const acertantes = data.votos.filter(v => v.voto === indexGanador && v.tipo === 'adivinador');

    div.innerHTML = `
        <h3>La Víctima eligió:</h3>
        <div class="tarjeta ganadora">"${rumorGanador.texto}"</div>
        <p>Autor: <strong>${rumorGanador.autor}</strong></p>
        <hr>
        <h3>🏆 Adivinaron:</h3>
        <p>${acertantes.length > 0 ? acertantes.length + " jugadores" : "Nadie acertó 😢"}</p>
    `;
});

socket.on('tick', (t) => document.getElementById('reloj').innerText = t + "s");