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

// Inicializa o mapa
const mapa = L.map("mapa").setView([-14.235, -51.9253], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
}).addTo(mapa);

// Popula o <select> com cidades
const selectCidade = document.getElementById("cidade");
cidadesBase.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.nome;
    opt.textContent = c.nome;
    selectCidade.appendChild(opt);
});

// Carrega registros anteriores
let registros = JSON.parse(localStorage.getItem("verde_digital_registros")) || {};
atualizarMapa();

// Evento do formulário
document.getElementById("form").addEventListener("submit", (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const cidadeNome = document.getElementById("cidade").value;
    const qtd = parseInt(document.getElementById("qtd").value.trim());

    if (!nome || !cidadeNome || !qtd) {
        alert("Preencha todos os campos!");
        return;
    }

    const cidade = cidadesBase.find(c => c.nome === cidadeNome);
    if (!cidade) return alert("Cidade não encontrada.");

    // Atualiza registros
    if (registros[cidadeNome]) {
        registros[cidadeNome].total += qtd;
        registros[cidadeNome].usuarios.push({ nome, qtd });
    } else {
        registros[cidadeNome] = {
            lat: cidade.lat,
            lon: cidade.lon,
            total: qtd,
            usuarios: [{ nome, qtd }],
        };
    }

    // Salva e atualiza mapa
    localStorage.setItem("verde_digital_registros", JSON.stringify(registros));
    atualizarMapa();

    alert("🌱 Ação registrada com sucesso!");
    document.getElementById("form").reset();
});

// Atualiza os marcadores no mapa
function atualizarMapa() {
    mapa.eachLayer((layer) => {
        if (layer instanceof L.Marker) mapa.removeLayer(layer);
    });

    for (const cidade in registros) {
        const dados = registros[cidade];
        adicionarMarcador(cidade, dados.lat, dados.lon, dados.total, dados.usuarios);
    }
}

// Adiciona um marcador no mapa
function adicionarMarcador(cidade, lat, lon, total, usuarios) {
    const marcador = L.marker([lat, lon]).addTo(mapa);

    const listaUsuarios = usuarios
        .map(u => `<li>${u.nome} — 🌳 ${u.qtd}</li>`)
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
