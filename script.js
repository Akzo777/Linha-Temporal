import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDhAP2RMQ1TQyLzB1N9hs76AVjfqTjB9Pk",
  authDomain: "correio-91c8e.firebaseapp.com",
  databaseURL: "https://correio-91c8e-default-rtdb.firebaseio.com",
  projectId: "correio-91c8e",
  storageBucket: "correio-91c8e.firebasestorage.app",
  messagingSenderId: "40461554553",
  appId: "1:40461554553:web:92720144d48859c8e215a8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let momentos = [];
let currentEditId = null; 

const categoryEmojis = { romance: "💖", encontro: "🍷", viagem: "✈️", surpresa: "🎁", conquista: "🏆", default: "✨" };

// --- LISTENERS DO FIREBASE ---
const timelineRef = ref(db, 'linha_temporal/nossa_historia');
onValue(timelineRef, (snapshot) => {
  const data = snapshot.val();
  momentos = [];
  if (data) {
    Object.keys(data).forEach(key => momentos.push({ firebaseKey: key, ...data[key] }));
  }
  renderTimeline();
  atualizarEstatisticas(); // Chama a atualização do painel toda vez que o banco mudar
});

// --- NOVO: PAINEL DE ESTATÍSTICAS ---
function atualizarEstatisticas() {
  if (momentos.length === 0) {
    document.getElementById('stat-dias').innerText = "0";
    document.getElementById('stat-momentos').innerText = "0";
    document.getElementById('stat-viagens').innerText = "0";
    return;
  }

  // Conta total de momentos
  document.getElementById('stat-momentos').innerText = momentos.length;

  // Conta total de viagens
  const viagens = momentos.filter(m => m.categoria === 'viagem').length;
  document.getElementById('stat-viagens').innerText = viagens;

  // Calcula os dias juntos (Do momento mais antigo até hoje)
  const datas = momentos.map(m => new Date(m.data + "T00:00:00"));
  const dataMaisAntiga = new Date(Math.min(...datas));
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  
  const diffTempo = hoje - dataMaisAntiga;
  const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
  
  document.getElementById('stat-dias').innerText = diffDias >= 0 ? diffDias : 0;
}

// Variável para guardar o último sorteio e não repetir
let ultimaMemoriaSorteada = null;

// --- NOVO: REVIVER MEMÓRIA ALEATÓRIA (Sem Repetições) ---
window.reviverMemoria = function() {
  if (momentos.length === 0) {
    showCustomAlert("Poxa...", "Ainda não há nenhuma memória registrada para reviver. Comece adicionando um novo momento!", "🎲");
    return;
  }
  
  // Se só existir 1 momento, mostra ele mesmo
  if (momentos.length === 1) {
    openViewModal(momentos[0].firebaseKey);
    return;
  }

  let randomIndex;
  let momentoSorteado;

  // O "do...while" faz o sorteio rodar repetidas vezes ATÉ achar um diferente do último
  do {
    randomIndex = Math.floor(Math.random() * momentos.length);
    momentoSorteado = momentos[randomIndex];
  } while (momentoSorteado.firebaseKey === ultimaMemoriaSorteada);
  
  // Salva este como o último sorteado
  ultimaMemoriaSorteada = momentoSorteado.firebaseKey;
  
  // Abre o modal de visualização
  openViewModal(momentoSorteado.firebaseKey);
}

// --- LÓGICA DE TEMPO ---
function formatarData(dataISO) {
  if (!dataISO) return "";
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const partes = dataISO.split('-');
  if(partes.length < 3) return dataISO;
  return `${partes[2]} de ${meses[parseInt(partes[1]) - 1]}, ${partes[0]}`;
}

function calcularTempoPassado(dataISO) {
  if (!dataISO) return "";
  const dataMomento = new Date(dataISO + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  
  const diffTempo = hoje - dataMomento;
  const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
  
  if (diffDias === 0) return "Aconteceu Hoje!";
  if (diffDias === 1) return "Foi Ontem";
  if (diffDias < 30) return `Há ${diffDias} dias`;
  
  const diffMeses = Math.floor(diffDias / 30);
  if (diffMeses < 12) return `Há ${diffMeses} ${diffMeses === 1 ? 'mês' : 'meses'}`;
  
  const diffAnos = Math.floor(diffMeses / 12);
  const mesesRestantes = diffMeses % 12;
  
  let texto = `Há ${diffAnos} ${diffAnos === 1 ? 'ano' : 'anos'}`;
  if (mesesRestantes > 0) texto += ` e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
  return texto;
}

// --- ALERTA CUSTOMIZADO ---
window.showCustomAlert = function(title, message, icon = "⚠️") {
  document.getElementById('alert-icon').innerText = icon;
  document.getElementById('alert-title').innerText = title;
  document.getElementById('alert-message').innerHTML = message;
  document.getElementById('custom-alert-modal').classList.add('active');
}

window.closeAlertModal = function() {
  document.getElementById('custom-alert-modal').classList.remove('active');
}

// --- RENDERIZAÇÃO: LINHA DO TEMPO ---
window.renderTimeline = function() {
  const list = document.getElementById('moments-list');
  list.innerHTML = "";

  const categoriaFiltro = document.getElementById('filter-category').value;
  const ordemFiltro = document.getElementById('sort-date').value;

  let momentosFiltrados = momentos;
  if (categoriaFiltro !== "todas") {
    momentosFiltrados = momentosFiltrados.filter(m => (m.categoria || 'romance') === categoriaFiltro);
  }

  momentosFiltrados.sort((a, b) => {
    const dataA = new Date(a.data);
    const dataB = new Date(b.data);
    return ordemFiltro === 'asc' ? dataA - dataB : dataB - dataA;
  });

  if (momentosFiltrados.length === 0) {
    list.innerHTML = `<p style="text-align:center; color: var(--pc4); margin-top: 20px;">Nenhum momento encontrado.</p>`;
    return;
  }

  momentosFiltrados.forEach((momento) => {
    const cat = momento.categoria || 'romance';
    const emoji = categoryEmojis[cat] || categoryEmojis.default;
    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML = `
      <div class="timeline-dot">${emoji}</div>
      <div class="timeline-card" onclick="openViewModal('${momento.firebaseKey}')">
        <h3>${momento.titulo}</h3>
        <p class="date-badge">${formatarData(momento.data)}</p>
      </div>
    `;
    list.appendChild(row);
  });
  ativarAnimacaoScroll();
}

function ativarAnimacaoScroll() {
  const rows = document.querySelectorAll('.timeline-row');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  rows.forEach(row => observer.observe(row));
}

// --- INTERFACE ---
window.closeModals = function() {
  document.getElementById('view-modal').classList.remove('active');
  document.getElementById('edit-modal').classList.remove('active');
}

window.toggleTimeInput = function() {
  const hasTime = document.getElementById('edit-has-time').checked;
  document.getElementById('time-group').style.display = hasTime ? 'flex' : 'none';
}

window.openLightbox = function(imageSrc) {
  if(!imageSrc) return;
  const overlay = document.getElementById('lightbox-overlay');
  document.getElementById('lightbox-img').src = imageSrc;
  overlay.classList.add('active');
}

window.closeLightbox = function() {
  document.getElementById('lightbox-overlay').classList.remove('active');
}

// --- MODAIS DA LINHA DO TEMPO ---
window.openViewModal = function(firebaseKey) {
  const momento = momentos.find(m => m.firebaseKey === firebaseKey);
  if(!momento) return;
  currentEditId = firebaseKey; 
  document.getElementById('view-title').innerText = momento.titulo;
  document.getElementById('view-date').innerText = formatarData(momento.data);
  document.getElementById('view-time').innerText = momento.hora ? `às ${momento.hora}` : "";
  document.getElementById('view-time-ago').innerText = calcularTempoPassado(momento.data);
  document.getElementById('view-desc').innerText = momento.desc || "Nenhuma descrição adicionada.";
  
  const photoContainer = document.getElementById('view-photo-container');
  if (momento.foto) {
    document.getElementById('view-photo').src = momento.foto;
    photoContainer.style.display = 'flex';
  } else {
    photoContainer.style.display = 'none';
  }
  document.getElementById('view-modal').classList.add('active');
}

window.editCurrentMoment = function() {
  document.getElementById('view-modal').classList.remove('active');
  openEditModal(currentEditId);
}

window.openEditModal = function(firebaseKey = null) {
  currentEditId = firebaseKey;
  const isEditing = firebaseKey !== null;
  document.getElementById('edit-modal-title').innerText = isEditing ? "Editar Momento" : "Novo Momento";
  const btnDelete = document.getElementById('btn-delete');
  
  if (isEditing) {
    const momento = momentos.find(m => m.firebaseKey === firebaseKey);
    document.getElementById('edit-title').value = momento.titulo;
    document.getElementById('edit-category').value = momento.categoria || "romance";
    document.getElementById('edit-date').value = momento.data;
    document.getElementById('edit-photo').value = momento.foto || "";
    document.getElementById('edit-desc').value = momento.desc || "";
    
    if (momento.hora) {
      document.getElementById('edit-has-time').checked = true;
      document.getElementById('edit-time').value = momento.hora;
      document.getElementById('time-group').style.display = 'flex';
    } else {
      document.getElementById('edit-has-time').checked = false;
      document.getElementById('time-group').style.display = 'none';
    }
    btnDelete.style.display = 'block'; 
  } else {
    document.getElementById('edit-title').value = "";
    document.getElementById('edit-category').value = "romance"; 
    document.getElementById('edit-date').value = "";
    document.getElementById('edit-photo').value = "";
    document.getElementById('edit-desc').value = "";
    document.getElementById('edit-has-time').checked = false;
    document.getElementById('time-group').style.display = 'none';
    btnDelete.style.display = 'none'; 
  }
  document.getElementById('edit-modal').classList.add('active');
}

window.saveMoment = function() {
  const title = document.getElementById('edit-title').value.trim();
  const category = document.getElementById('edit-category').value;
  const date = document.getElementById('edit-date').value;
  const hasTime = document.getElementById('edit-has-time').checked;
  const time = hasTime ? document.getElementById('edit-time').value : "";
  const photo = document.getElementById('edit-photo').value.trim();
  const desc = document.getElementById('edit-desc').value.trim();
  
  if (!title || !date) {
    showCustomAlert("Campos Incompletos", "O Título e a Data são obrigatórios para registrar o momento!", "📝");
    return;
  }

  const dataEscolhida = new Date(date + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  
  if (dataEscolhida > hoje) {
    showCustomAlert(
      "Data Inválida", 
      "Não é possível registrar datas futuras na Linha do Tempo. ⏳<br><br>Se a intenção é escrever para o futuro, não se esqueça de usar o nosso <b>Correio do Amor</b>!<br><br>A Linha do Tempo é um espaço dedicado exclusivamente para relembrarmos os momentos mágicos que já vivemos.", 
      "🕰️"
    );
    return;
  }

  const momentData = { titulo: title, categoria: category, data: date, hora: time, desc: desc, foto: photo };
  
  if (currentEditId) update(ref(db, `linha_temporal/nossa_historia/${currentEditId}`), momentData);
  else push(ref(db, 'linha_temporal/nossa_historia'), momentData);
  
  closeModals();
}

window.deleteMoment = function() {
  if (currentEditId && confirm("Tem certeza que deseja apagar este momento?")) {
    remove(ref(db, `linha_temporal/nossa_historia/${currentEditId}`));
    closeModals();
  }
}