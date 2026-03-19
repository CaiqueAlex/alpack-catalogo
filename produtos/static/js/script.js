// ─── Config da Empresa ───────────────────────────────────────────────
let empresaConfig = {
    whatsapp: "551434340001",
    mensagemPadrao: "Olá! Vi o produto {produto} no catálogo da Alpack e gostaria de mais informações."
};

if (window.dadosEmpresa) {
    empresaConfig = window.dadosEmpresa;
}

// ─── Carregar dados da API ─────────────────────────────────────────
async function carregarDadosAPI() {
    try {
        const response = await fetch('/produtos/api/produtos/');
        const data = await response.json();
        return data.produtos || [];
    } catch (error) {
        console.error('Erro ao carregar dados da API:', error);
        return dadosProdutosPadrao; // fallback
    }
}

// ─── Dados Padrão (fallback) ─────────────────────────────────────────
const dadosProdutosPadrao = [
    {
        id: 1, nome: "Caixas de Papelão Ondulado",
        descricao: "Caixas resistentes para transporte e armazenamento. Diversos tamanhos disponíveis. Ideais para e-commerce, mudanças e organização geral.",
        categoria_id: 1, emoji: "📦", imagem: "", destaque: true,
        tags: ["embalagem", "transporte", "papelao", "resistente"]
    },
    {
        id: 2, nome: "Sacolas Plásticas Biodegradáveis",
        descricao: "Sacolas ecológicas para o varejo. Material biodegradável e resistente. Contribua com o meio ambiente sem perder qualidade.",
        categoria_id: 7, emoji: "🛍️", imagem: "", destaque: false,
        tags: ["sacola", "biodegradavel", "varejo", "ecologica"]
    },
    {
        id: 3, nome: "Pratos Descartáveis Premium",
        descricao: "Pratos descartáveis de alta qualidade para eventos e food service. Diversos tamanhos e designs elegantes disponíveis.",
        categoria_id: 3, emoji: "🍽️", imagem: "", destaque: true,
        tags: ["prato", "descartavel", "evento", "premium"]
    }
];

// ─── Categorias Atualizadas ──────────────────────────────────────────
const categorias = [
    { id: 1, nome: "Embalagens", emoji: "📦" },
    { id: 2, nome: "Plásticos", emoji: "🥤" },
    { id: 3, nome: "Descartáveis", emoji: "🍽️" },
    { id: 4, nome: "Produtos de Limpeza", emoji: "🧽" },
    { id: 5, nome: "Cestos e Lixeiras", emoji: "🗑️" },
    { id: 6, nome: "Sacos de Lixo", emoji: "🛍️" },
    { id: 7, nome: "Sacolas Plásticas", emoji: "🛒" }
];

// ─── Estado Global ────────────────────────────────────────────────────
let produtos = [];
let produtosFiltrados = [];
let categoriaAtual = "todos";
let buscaAtual = "";

// ─── Sistema de Paginação ─────────────────────────────────────────────
let paginaAtual = 1;
const produtosPorPagina = 9;

// ─── Tela de Loading MAIS RÁPIDA (3s máximo) ────────────────────────
class LoadingScreen {
    constructor() {
        this.loadingElement = document.getElementById('loadingScreen');
        this.typewriterElement = null;
        this.logoElement = null;
    }

    async init() {
        if (!this.loadingElement) return;
        
        this.typewriterElement = this.loadingElement.querySelector('.typewriter');
        this.logoElement = this.loadingElement.querySelector('.logo-loading');
        
        // Só executa se não foi mostrado antes na sessão
        if (sessionStorage.getItem('loadingShown')) {
            this.hide();
            return;
        }
        
        await this.show();
    }

    async show() {
        // Aguarda um pequeno delay para garantir que tudo carregou
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Anima a logo MAIS RÁPIDO
        this.animateLogo();
        
        // Aguarda 0.8s e inicia o typewriter MAIS RÁPIDO
        await new Promise(resolve => setTimeout(resolve, 800));
        await this.typewriter("Bem-vindo! Venha conhecer nossos produtos...");
        
        // Aguarda 1.2s e esconde tudo MAIS RÁPIDO
        await new Promise(resolve => setTimeout(resolve, 1200));
        await this.hide();
        
        // Marca que já foi mostrado nesta sessão
        sessionStorage.setItem('loadingShown', 'true');
    }

    animateLogo() {
        if (this.logoElement) {
            this.logoElement.style.animation = 'logoZoomIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        }
    }

    async typewriter(text) {
        if (!this.typewriterElement) return;
        
        this.typewriterElement.style.opacity = '1';
        
        for (let i = 0; i <= text.length; i++) {
            this.typewriterElement.textContent = text.substring(0, i);
            await new Promise(resolve => setTimeout(resolve, 50)); // MAIS RÁPIDO (era 80ms)
        }
    }

    async hide() {
        if (!this.loadingElement) return;
        
        // Animação de saída MAIS RÁPIDA
        this.loadingElement.style.animation = 'fadeOutUp 0.5s ease-in-out forwards';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Move a logo para sua posição final e remove a tela
        this.moveLogoToHeader();
        this.loadingElement.style.display = 'none';
    }

    moveLogoToHeader() {
        const headerLogo = document.querySelector('.logo-principal');
        if (headerLogo) {
            headerLogo.style.transform = 'scale(0.8)';
            headerLogo.style.animation = 'logoMoveToHeader 0.5s ease-out forwards';
        }
    }
}

// ─── Gerenciador de Tema (MODO ESCURO COMO PADRÃO) ─────────────────────────────────────────────
class ThemeManager {
    constructor() {
        // 🌙 MODO ESCURO COMO PADRÃO! Se não há preferência salva, usa dark
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }
    init() {
        this.applyTheme(this.currentTheme);
        const btn = document.getElementById('themeToggle');
        if (btn) btn.addEventListener('click', () => this.toggleTheme());
    }
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.classList.add('theme-changing');
            setTimeout(() => toggle.classList.remove('theme-changing'), 600);
        }
        setTimeout(() => this.applyTheme(newTheme), 300);
    }
    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
}

// ─── Inicialização ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const loading = new LoadingScreen();
    await loading.init();
    
    new ThemeManager();
    
    // Carregar produtos da API
    produtos = await carregarDadosAPI();
    produtosFiltrados = [...produtos];
    
    configurarEventos();
    exibirProdutos();
    atualizarInfoTexto();
    atualizarPaginacao();
});

// ─── Eventos ──────────────────────────────────────────────────────────
function configurarEventos() {
    const buscaInput = document.getElementById('buscaInput');
    let timer;
    if (buscaInput) {
        buscaInput.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(() => {
                buscaAtual = this.value.trim();
                paginaAtual = 1; // Reset para primeira página
                filtrarProdutos();
            }, 300);
        });
    }

    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('ativo'));
            this.classList.add('ativo');
            categoriaAtual = this.getAttribute('data-categoria');
            paginaAtual = 1; // Reset para primeira página
            filtrarProdutos();
            setTimeout(() => {
                document.querySelector('.produtos-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    });

    const modal = document.getElementById('modalDetalhes');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) fecharModal();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') fecharModal();
    });
}

// ─── Filtrar Produtos ─────────────────────────────────────────────────
function filtrarProdutos() {
    let lista = [...produtos];

    if (categoriaAtual !== "todos") {
        const id = parseInt(categoriaAtual);
        lista = lista.filter(p => p.categoria_id === id);
    }

    if (buscaAtual) {
        const q = buscaAtual.toLowerCase();
        lista = lista.filter(p =>
            p.nome.toLowerCase().includes(q) ||
            p.descricao.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q))
        );
    }

    lista.sort((a, b) => {
        if (a.destaque && !b.destaque) return -1;
        if (!a.destaque && b.destaque) return 1;
        return a.nome.localeCompare(b.nome);
    });

    produtosFiltrados = lista;
    exibirProdutos();
    atualizarInfoTexto();
    atualizarPaginacao();
}

// ─── Sistema de Paginação ─────────────────────────────────────────────
function obterProdutosPagina() {
    const inicio = (paginaAtual - 1) * produtosPorPagina;
    const fim = inicio + produtosPorPagina;
    return produtosFiltrados.slice(inicio, fim);
}

function getTotalPaginas() {
    return Math.ceil(produtosFiltrados.length / produtosPorPagina);
}

function atualizarPaginacao() {
    const totalPaginas = getTotalPaginas();
    const controls = document.getElementById('paginationControls');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (totalPaginas <= 1) {
        controls.style.display = 'none';
        return;
    }

    controls.style.display = 'flex';
    pageInfo.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    
    prevBtn.disabled = paginaAtual === 1;
    nextBtn.disabled = paginaAtual === totalPaginas;
    
    prevBtn.style.opacity = paginaAtual === 1 ? '0.5' : '1';
    nextBtn.style.opacity = paginaAtual === totalPaginas ? '0.5' : '1';
}

function mudarPagina(direcao) {
    const totalPaginas = getTotalPaginas();
    const novaPagina = paginaAtual + direcao;
    
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    
    // Animação de slide
    const grid = document.getElementById('produtosGrid');
    const slideDirection = direcao > 0 ? 'slideOutLeft' : 'slideOutRight';
    const slideInDirection = direcao > 0 ? 'slideInRight' : 'slideInLeft';
    
    // Slide out
    grid.style.animation = `${slideDirection} 0.3s ease-in-out forwards`;
    
    setTimeout(() => {
        paginaAtual = novaPagina;
        exibirProdutos(false); // Não animar cards individuais
        
        // Slide in
        grid.style.animation = `${slideInDirection} 0.3s ease-in-out forwards`;
        
        setTimeout(() => {
            grid.style.animation = '';
            atualizarPaginacao();
        }, 300);
        
        // Scroll suave para o topo da grid
        document.querySelector('.produtos-grid')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 300);
}

// ─── Exibir Cards ────────────────────────────────────────────────────
function exibirProdutos(animateCards = true) {
    const grid = document.getElementById('produtosGrid');
    const vazio = document.getElementById('produtosVazio');
    if (!grid || !vazio) return;

    if (produtosFiltrados.length === 0) {
        grid.style.display = 'none';
        vazio.style.display = 'block';
        document.getElementById('paginationControls').style.display = 'none';
        return;
    }

    grid.style.display = 'grid';
    vazio.style.display = 'none';

    const produtosPagina = obterProdutosPagina();
    
    grid.innerHTML = produtosPagina.map((produto, i) => {
        const cat = categorias.find(c => c.id === produto.categoria_id);
        const imagemOuEmoji = produto.imagem ? 
            `<img src="${produto.imagem}" alt="${produto.nome}" onerror="this.style.display='none'; this.nextSibling.style.display='block';">
             <div style="display:none; font-size: 4rem;">${produto.emoji}</div>` : 
            produto.emoji;
            
        return `
            <div class="produto-card ${produto.destaque ? 'destaque' : ''}"
                 style="${animateCards ? `animation-delay: ${i * 0.1}s` : ''}">
                ${produto.destaque ? '<div class="produto-destaque-badge">⭐ DESTAQUE</div>' : ''}
                <div class="produto-imagem">${imagemOuEmoji}</div>
                <div class="produto-info">
                    <span class="produto-categoria">
                        ${cat ? cat.emoji + ' ' + cat.nome : ''}
                    </span>
                    <h3 class="produto-nome">${produto.nome}</h3>
                    <p class="produto-descricao">${produto.descricao.slice(0, 100)}...</p>
                    <div class="produto-actions">
                        <a href="https://wa.me/${empresaConfig.whatsapp}?text=${encodeURIComponent(
                            empresaConfig.mensagemPadrao.replace('{produto}', produto.nome)
                        )}"
                           target="_blank" class="btn-whatsapp">
                            📱 WhatsApp
                        </a>
                        <button class="btn-detalhes" onclick="abrirModal(${produto.id})">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (animateCards) {
        requestAnimationFrame(() => {
            document.querySelectorAll('.produto-card').forEach((card, i) => {
                card.style.animation = 'none';
                card.offsetHeight;
                card.style.animation = `fadeInUp 0.5s ease forwards ${i * 0.1}s`;
            });
        });
    }
}

// ─── Abrir Modal ──────────────────────────────────────────────────────
function abrirModal(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const cat = categorias.find(c => c.id === produto.categoria_id);
    const whatsUrl = `https://wa.me/${empresaConfig.whatsapp}?text=${encodeURIComponent(
        empresaConfig.mensagemPadrao.replace('{produto}', produto.nome) +
        '\n\nEstou interessado neste produto e gostaria de mais informações.'
    )}`;

    const imagemOuEmoji = produto.imagem ? 
        `<img src="${produto.imagem}" alt="${produto.nome}" onerror="this.style.display='none'; this.nextSibling.style.display='flex'; this.nextSibling.style.alignItems='center'; this.nextSibling.style.justifyContent='center';">
         <div style="display:none; font-size: 6rem;">${produto.emoji}</div>` : 
        produto.emoji;

    document.getElementById('produtoDetalhe').innerHTML = `
        <div class="produto-imagem-grande">${imagemOuEmoji}</div>
        <div class="produto-info-detalhada">
            ${cat ? `<span class="produto-categoria">${cat.emoji} ${cat.nome}</span>` : ''}
            <h1 class="produto-nome-grande">${produto.nome}</h1>
            ${produto.destaque ? `<div class="produto-destaque-info">⭐ PRODUTO EM DESTAQUE ⭐</div>` : ''}
            <p class="produto-descricao-detalhada">${produto.descricao}</p>
            ${produto.tags?.length ? `
                <div class="produto-tags">
                    ${produto.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                </div>` : ''}
            <div class="acoes-produto">
                <a href="${whatsUrl}" target="_blank" class="btn-whatsapp-grande">
                    📱 Entrar em Contato
                </a>
                <button class="btn-compartilhar"
                    onclick="compartilharProduto('${produto.nome.replace(/'/g, "\\'")}',
                    '${produto.descricao.slice(0, 100).replace(/'/g, "\\'")}...')">
                    🔗 Compartilhar
                </button>
            </div>
        </div>
    `;

    const modal = document.getElementById('modalDetalhes');
    modal.style.display = 'block';
    modal.offsetHeight;
    modal.classList.add('aberto');
    document.body.style.overflow = 'hidden';
}

// ─── Demais funções ───────────────────────────────────────────────────
function atualizarInfoTexto() {
    const el = document.getElementById('infoTexto');
    if (!el) return;
    const total = produtosFiltrados.length;
    let txt = '';
    if (buscaAtual || categoriaAtual !== "todos") {
        txt = `Mostrando ${total} produto${total !== 1 ? 's' : ''}`;
        if (buscaAtual) txt += ` para "${buscaAtual}"`;
        if (categoriaAtual !== "todos") {
            const cat = categorias.find(c => c.id == categoriaAtual);
            if (cat) txt += `${buscaAtual ? ' em ' : ' na categoria '}${cat.nome}`;
        }
    } else {
        txt = `${total} produto${total !== 1 ? 's' : ''} disponível${total !== 1 ? 'is' : ''}`;
    }
    el.textContent = txt;
}

function fecharModal() {
    const modal = document.getElementById('modalDetalhes');
    if (!modal || !modal.classList.contains('aberto')) return;
    modal.classList.add('fechando');
    modal.classList.remove('aberto');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('fechando');
        document.body.style.overflow = 'auto';
    }, 300);
}

function compartilharProduto(nome, descricao) {
    if (navigator.share) {
        navigator.share({ title: `${nome} - Alpack`, text: descricao, url: window.location.href })
            .catch(console.error);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href)
            .then(() => alert('Link copiado para a área de transferência!'))
            .catch(() => {
                const ta = document.createElement('textarea');
                ta.value = window.location.href;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                alert('Link copiado!');
            });
    }
}

function resetarFiltros() {
    categoriaAtual = "todos";
    buscaAtual = "";
    paginaAtual = 1;
    const input = document.getElementById('buscaInput');
    if (input) input.value = "";
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.classList.toggle('ativo', btn.getAttribute('data-categoria') === 'todos');
    });
    filtrarProdutos();
}

// ─── Sistema de Notificações ─────────────────────────────────────────
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌', 
        warning: '⚠️',
        info: 'ℹ️'
    };

    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type]}</span>
            <span>${message}</span>
        </div>
        <div class="progress-bar"></div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// ─── Recarregar produtos da API periodicamente ────────────────────────
setInterval(async () => {
    try {
        const novosProdutos = await carregarDadosAPI();
        if (JSON.stringify(novosProdutos) !== JSON.stringify(produtos)) {
            produtos = novosProdutos;
            filtrarProdutos(); // Re-renderizar se houver mudanças
        }
    } catch (error) {
        // Silencioso - não perturbar o usuário
    }
}, 10000); // Verifica a cada 10 segundos