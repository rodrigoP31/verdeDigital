// Lista inicial de cidades e coordenadas (adicione mais se quiser)
const cidadesBase = [
    { nome: "Manaus", lat: -3.119, lon: -60.0217 },
    { nome: "Belém", lat: -1.4558, lon: -48.4902 },
    { nome: "São Paulo", lat: -23.5505, lon: -46.6333 },
    { nome: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
    { nome: "Brasília", lat: -15.7939, lon: -47.8828 },
    { nome: "Fortaleza", lat: -3.7172, lon: -38.5433 },
    { nome: "Recife", lat: -8.0476, lon: -34.877 },
    { nome: "Curitiba", lat: -25.4284, lon: -49.2733 },
    { nome: "Salvador", lat: -12.9777, lon: -38.5016 },
    { nome: "Porto Alegre", lat: -30.0346, lon: -51.2177 }
];

const STORAGE_KEY = 'verde_digital_registros';

function medalha(i) {
    return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
}

// Inicializa o mapa
const mapa = L.map("mapa").setView([-14.235, -51.9253], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
}).addTo(mapa);

// Normaliza registros: garante id e verificado para cada usuário e recalcula totals
function normalizeRegistros(raw) {
    const registros = raw || {};
    Object.keys(registros).forEach(city => {
        const r = registros[city];
        if (!Array.isArray(r.usuarios)) r.usuarios = [];
        r.usuarios = r.usuarios.map(u => ({
            id: u.id || (Date.now() + Math.floor(Math.random() * 10000)),
            nome: u.nome || '—',
            qtd: Number(u.qtd || u.arvores || 0),
            verificado: !!u.verificado
        }));
        r.total = r.usuarios.reduce((s, u) => s + (u.qtd || 0), 0);
    });
    return registros;
}

function loadRegistros() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return normalizeRegistros(raw);
    } catch (e) {
        console.error('Erro lendo registros:', e);
        return {};
    }
}

function saveRegistros(r) {
    const normal = normalizeRegistros(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normal));
}

// Popula o <select> com cidades
function populateCidadesSelect() {
    const selectCidade = document.getElementById("cidade");
    if (!selectCidade) return;
    selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';
    cidadesBase.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.nome;
        opt.textContent = c.nome;
        selectCidade.appendChild(opt);
    });
}

// Atualiza os marcadores no mapa
function atualizarMapa() {
    // remove apenas marcadores (mantém tile layer)
    mapa.eachLayer((layer) => {
        if (layer instanceof L.Marker) mapa.removeLayer(layer);
    });

    const registros = loadRegistros();
    for (const cidade in registros) {
        const dados = registros[cidade];
        adicionarMarcador(cidade, dados.lat, dados.lon, dados.total, dados.usuarios);
    }
}

// Adiciona um marcador no mapa
function adicionarMarcador(cidade, lat, lon, total, usuarios) {
    const marcador = L.marker([lat, lon]).addTo(mapa);

    const listaUsuarios = (usuarios || [])
        .map(u => `<li>${u.nome} — 🌳 ${u.qtd} ${u.verificado ? '✅' : ''}</li>`)
        .join("");

    marcador.bindPopup(`
    <b>${cidade}</b><br>
    🌳 Total: ${total} árvores plantadas<br>
    <details>
      <summary>Ver contribuidores</summary>
      <ul>${listaUsuarios}</ul>
    </details>
  `);
}

// RENDER: ranking (top 5)
function renderRanking() {
    const container = document.getElementById('ranking-list');
    if (!container) return;

    const registros = loadRegistros();
    const contribuidores = [];
    Object.keys(registros).forEach(cityName => {
        const dados = registros[cityName];
        if (Array.isArray(dados.usuarios)) {
            dados.usuarios.forEach(u => {
                contribuidores.push({
                    id: u.id,
                    nome: u.nome,
                    cidade: cityName,
                    arvores: u.qtd || 0,
                    verificado: !!u.verificado
                });
            });
        }
    });

    if (contribuidores.length === 0) {
        container.innerHTML = '<p>Nenhum registro ainda.</p>';
        return;
    }

    const top = contribuidores
        .slice()
        .sort((a, b) => b.arvores - a.arvores)
        .slice(0, 5);

    container.innerHTML = top.map((p, i) => {
        const verif = p.verificado ? ' ✅' : '';
        return `
      <div class="rank-item">
        <div class="rank-left">
          <span class="medal">${medalha(i)}</span>
          <div class="rank-meta">
            <div class="nome">${p.nome}${verif}</div>
            <div class="cidade">${p.cidade || ''}</div>
          </div>
        </div>
        <div class="rank-right">
          <div class="qtd">${p.arvores || 0}</div>
          <button class="btn-small" data-action="toggle-verif" data-id="${p.id}" data-city="${p.cidade}">${p.verificado ? 'Desverificar' : 'Verificar'}</button>
        </div>
      </div>
    `;
    }).join('');
}

// RENDER: lista completa de gerenciamento
function renderManageList() {
    const container = document.getElementById('manage-list');
    if (!container) return;
    const registros = loadRegistros();
    const rows = [];
    Object.keys(registros).forEach(cityName => {
        const dados = registros[cityName];
        dados.usuarios.forEach(u => {
            rows.push({ cityName, usuario: u, total: dados.total });
        });
    });

    if (rows.length === 0) {
        container.innerHTML = '<p>Nenhum registro para gerenciar.</p>';
        return;
    }

    container.innerHTML = rows.map(r => `
      <div class="manage-row">
        <div>
          <strong>${r.usuario.nome}</strong> — ${r.usuario.qtd} árvores <span class="cidade">(${r.cityName})</span>
        </div>
        <div>
          <button class="btn-small" data-action="toggle-verif" data-id="${r.usuario.id}" data-city="${r.cityName}">
            ${r.usuario.verificado ? 'Desverificar' : 'Verificar'}
          </button>
          <button class="btn-small btn-danger" data-action="delete-user" data-id="${r.usuario.id}" data-city="${r.cityName}">Remover</button>
        </div>
      </div>
    `).join('');
}

// Toggle verificação por id + cidade
function toggleVerificar(id, cityName) {
    const registros = loadRegistros();
    const city = registros[cityName];
    if (!city) return;
    const idx = city.usuarios.findIndex(u => String(u.id) === String(id));
    if (idx === -1) return;
    city.usuarios[idx].verificado = !city.usuarios[idx].verificado;
    saveRegistros(registros);
    renderRanking();
    renderManageList();
    atualizarMapa();
}

// Remove usuário por id + cidade (recalcula total e remove cidade se vazia)
function deleteUser(id, cityName) {
    const registros = loadRegistros();
    const city = registros[cityName];
    if (!city) return;
    city.usuarios = city.usuarios.filter(u => String(u.id) !== String(id));
    city.total = city.usuarios.reduce((s, u) => s + (u.qtd || 0), 0);
    if (city.usuarios.length === 0) delete registros[cityName];
    saveRegistros(registros);
    renderRanking();
    renderManageList();
    atualizarMapa();
}

// Limpa todos os registros
function clearRegistros() {
    if (!confirm('Confirma limpar todos os registros? Esta ação é irreversível.')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderRanking();
    renderManageList();
    atualizarMapa();
    alert('Registros limpos.');
}

// Exporta registros para download JSON
function exportRegistros() {
    const registros = loadRegistros();
    const blob = new Blob([JSON.stringify(registros, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verde_digital_registros.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Importa registros via arquivo JSON
function importRegistrosFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            // simples validação básica: objeto com cidades
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                return alert('Arquivo JSON inválido.');
            }
            const normalized = normalizeRegistros(parsed);
            saveRegistros(normalized);
            renderRanking();
            renderManageList();
            atualizarMapa();
            alert('Importação concluída.');
        } catch (err) {
            alert('Erro ao ler JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// DOM: delegação de cliques para botões dentro dos renders
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;
    const id = btn.dataset.id;
    const city = btn.dataset.city;
    if (action === 'toggle-verif') toggleVerificar(id, city);
    if (action === 'delete-user') {
        if (confirm('Remover este registro?')) deleteUser(id, city);
    }
});

// Inicialização após DOM carregado
document.addEventListener('DOMContentLoaded', () => {
    populateCidadesSelect();
    atualizarMapa();
    renderRanking();
    renderManageList();

    const form = document.getElementById('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const nome = document.getElementById("nome").value.trim();
            const cidadeNome = document.getElementById("cidade").value;
            const qtd = parseInt(document.getElementById("qtd").value.trim(), 10);

            if (!nome || !cidadeNome || !qtd || qtd <= 0) {
                alert("Preencha todos os campos corretamente!");
                return;
            }

            const cidade = cidadesBase.find(c => c.nome === cidadeNome);
            if (!cidade) return alert("Cidade não encontrada.");

            const registros = loadRegistros();

            const novoUsuario = {
                id: Date.now() + Math.floor(Math.random() * 10000),
                nome,
                qtd,
                verificado: false
            };

            if (registros[cidadeNome]) {
                registros[cidadeNome].usuarios.push(novoUsuario);
                registros[cidadeNome].lat = cidade.lat;
                registros[cidadeNome].lon = cidade.lon;
                registros[cidadeNome].total = registros[cidadeNome].usuarios.reduce((s, u) => s + (u.qtd || 0), 0);
            } else {
                registros[cidadeNome] = {
                    lat: cidade.lat,
                    lon: cidade.lon,
                    total: novoUsuario.qtd,
                    usuarios: [novoUsuario],
                };
            }

            saveRegistros(registros);
            atualizarMapa();
            renderRanking();
            renderManageList();

            alert("🌱 Ação registrada com sucesso!");
            form.reset();
        });
    }

    // controles
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');
    const inputImport = document.getElementById('input-import');
    const btnToggleManage = document.getElementById('btn-toggle-manage');

    if (btnClear) btnClear.addEventListener('click', clearRegistros);
    if (btnExport) btnExport.addEventListener('click', exportRegistros);
    if (inputImport) inputImport.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (file) importRegistrosFile(file);
        inputImport.value = '';
    });
    if (btnToggleManage) btnToggleManage.addEventListener('click', () => {
        const m = document.getElementById('manage-list');
        if (!m) return;
        m.style.display = m.style.display === 'none' || m.style.display === '' ? 'block' : 'none';
    });
});
