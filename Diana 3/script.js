// Lista de secciones (si no hay guardadas, inicia con Saludos y Despedidas)
let sectionsList = JSON.parse(localStorage.getItem('mySections')) || [
    { id: 'saludos', name: 'Saludos' },
    { id: 'despedidas', name: 'Despedidas' }
];

// Iniciar aplicación
window.onload = function() {
    renderMenu();
    renderAllSections();
    showSection('instrucciones');
};

// ================= NAVEGACIÓN Y SECCIONES =================

function renderMenu() {
    const menu = document.getElementById('menu-principal');
    // Limpiamos botones antiguos excepto Instrucciones y Nueva Sección
    const botonesExtra = menu.querySelectorAll('.nav-section-btn');
    botonesExtra.forEach(btn => btn.remove());

    const btnNew = menu.querySelector('.btn-new-section');
    
    sectionsList.forEach(sec => {
        let btn = document.createElement('button');
        btn.className = 'nav-section-btn';
        btn.innerText = sec.name;
        btn.onclick = () => showSection(sec.id);
        menu.insertBefore(btn, btnNew); // Inserta antes del botón "+ Nueva Sección"
    });
}

function renderAllSections() {
    const container = document.getElementById('contenedor-secciones');
    container.innerHTML = ''; // Limpiar
    sectionsList.forEach(sec => createSectionHTML(sec.id, sec.name, container));
    loadData(); // Cargar los datos guardados en las tablas
}

function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

function createNewSection() {
    let name = prompt("¿Cómo se llamará la nueva sección? (Ej. Familia, Colores):");
    if (!name || name.trim() === "") return;
    
    // Crear un ID sin espacios ni caracteres raros
    let id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Verificar que no exista
    if (sectionsList.find(s => s.id === id)) {
        alert("Esa sección ya existe."); return;
    }

    sectionsList.push({ id: id, name: name });
    localStorage.setItem('mySections', JSON.stringify(sectionsList));
    
    renderMenu();
    createSectionHTML(id, name, document.getElementById('contenedor-secciones'));
    showSection(id);
}

// Genera la estructura HTML de cada sección
function createSectionHTML(id, name, container) {
    let section = document.createElement('section');
    section.id = id;
    section.style.display = 'none';
    section.innerHTML = `
        <h2>Sección: ${name}</h2>
        <table id="tabla_${id}">
            <thead>
                <tr>
                    <th>Palabra</th>
                    <th>Queirema (Forma)</th>
                    <th>Kinema (Movimiento)</th>
                    <th>Toponema (Lugar)</th>
                    <th>Ejemplo (Video y Frase)</th>
                </tr>
            </thead>
            <tbody>
                ${generarFilaVacia()}
            </tbody>
        </table>
        <div class="action-buttons">
            <button class="btn-add-row" onclick="addRow('tabla_${id}')">+ Añadir Nueva Palabra</button>
            <button class="btn-save" onclick="saveData('tabla_${id}')">Guardar Avance de ${name}</button>
        </div>
    `;
    container.appendChild(section);
}

function generarFilaVacia() {
    return `
        <tr>
            <td contenteditable="true">Palabra</td>
            <td class="media-cell"><button class="btn-add" onclick="insertMedia(this, 'imagen')">+ Añadir Imagen</button></td>
            <td class="media-cell"><button class="btn-add" onclick="insertMedia(this, 'video')">+ Añadir Video/GIF</button></td>
            <td contenteditable="true">Lugar</td>
            <td class="media-cell">
                <button class="btn-add" onclick="insertMedia(this, 'video')">+ Video de Enlace</button>
                <button class="btn-record" onclick="openRecorder(this)">🔴 Grabar en Vivo</button>
                <div class="editable-example" contenteditable="true">Escribe un ejemplo de uso aquí...</div>
            </td>
        </tr>
    `;
}

// ================= FUNCIONES DE TABLA =================

function addRow(tablaId) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    const newRow = document.createElement('tr');
    newRow.innerHTML = generarFilaVacia();
    tbody.appendChild(newRow);
}

function insertMedia(boton, tipo) {
    let url = prompt(`Por favor, pega el enlace (URL) de tu ${tipo}:`);
    if (url && url.trim() !== "") {
        crearContenedorMultimedia(boton, url, tipo === 'imagen' || url.toLowerCase().match(/\.(gif|jpe?g|png)$/i));
    }
}

function crearContenedorMultimedia(boton, source, isImage, isBlob = false) {
    let mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-content';
    let contenidoHTML = isImage ? `<img src="${source}" alt="Queirema">` : `<video src="${source}" autoplay loop muted playsinline controls></video>`;
    
    if(isBlob) {
        contenidoHTML += `<br><a href="${source}" download="ejemplo_señas.webm" class="btn-save" style="text-decoration:none; display:block; text-align:center; font-size:0.8em; margin-bottom:5px;">📥 Descargar Video</a>`;
    }
    
    contenidoHTML += `<button class="btn-add" onclick="insertMedia(this, '${isImage?'imagen':'video'}')">Cambiar</button>`;
    mediaContainer.innerHTML = contenidoHTML;
    
    if (boton.parentElement.classList.contains('media-content')) {
        boton.parentElement.replaceWith(mediaContainer);
    } else {
        boton.replaceWith(mediaContainer);
    }
}

function saveData(tablaId) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    localStorage.setItem(tablaId, tbody.innerHTML);
    alert("¡Progreso guardado con éxito! (Nota: Los videos grabados en vivo no se guardan permanentemente, debes descargarlos).");
}

function loadData() {
    sectionsList.forEach(sec => {
        let savedData = localStorage.getItem(`tabla_${sec.id}`);
        if(savedData) {
            let tbody = document.querySelector(`#tabla_${sec.id} tbody`);
            if(tbody) tbody.innerHTML = savedData;
        }
    });
}

// ================= GRABACIÓN EN VIVO (CÁMARA) =================

let mediaRecorder;
let recordedChunks = [];
let streamCamara;
let botonDestinoActual = null;

async function openRecorder(boton) {
    botonDestinoActual = boton;
    const modal = document.getElementById('recordModal');
    const preview = document.getElementById('videoPreview');
    modal.style.display = 'block';

    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        preview.srcObject = streamCamara;
    } catch (err) {
        alert("No se pudo acceder a la cámara. Revisa los permisos de tu navegador.");
        closeRecorder();
    }
}

function startRecording() {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(streamCamara, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = saveRecording;
    
    mediaRecorder.start();
    document.getElementById('btnStart').disabled = true;
    document.getElementById('btnStop').disabled = false;
    document.getElementById('btnStart').innerText = "Grabando...";
}

function stopRecording() {
    mediaRecorder.stop();
    closeRecorder();
}

function closeRecorder() {
    if (streamCamara) streamCamara.getTracks().forEach(track => track.stop());
    document.getElementById('recordModal').style.display = 'none';
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnStart').innerText = "Empezar Grabación";
    document.getElementById('btnStop').disabled = true;
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(blob);
    crearContenedorMultimedia(botonDestinoActual, videoUrl, false, true);
}