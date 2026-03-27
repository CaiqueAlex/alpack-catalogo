// ═══════════════════════════════════════════════════════════
//  script.js — VERSÃO COM SISTEMA DE CARRINHO + QUANTIDADE
// ═══════════════════════════════════════════════════════════

console.log('🔥 SCRIPT.JS CARREGADO - VERSÃO COM CARRINHO + QUANTIDADE');

// ─── Estado global ────────────────────────────────────────
const ITENS_POR_PAGINA = 12;
let paginaAtual = 1;
let categoriaAtiva = 'todos';
let termoBusca = '';
let todosOsProdutos = [];
let todasAsCategorias = [];

// ✅ NOVO: Sistema de Carrinho com quantidade
let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');

// ✅ NOVO: Variáveis para controle dos modais
let modalOriginCard = null;
let quantityModalProductId = null;

// ✅ NOVO: Estado dos filtros (expandido/minimizado)
let filtrosMinimizados = localStorage.getItem('filtros_minimizados') === 'true' || false;

// ─── Loading Screen (SIMPLIFICADO)
class LoadingScreen {
    constructor() {
        this.loadingElement = document.getElementById('loadingScreen');
        console.log('🔧 LoadingScreen criada, elemento:', this.loadingElement);
    }

    async init() {
        console.log('🚀 LoadingScreen.init() chamada');
        if (!this.loadingElement) {
            console.log('❌ Elemento loadingScreen não encontrado');
            return;
        }
        
        if (sessionStorage.getItem('loadingShown')) {
            console.log('⚡ Loading já foi mostrado, escondendo...');
            this.hide();
            return;
        }
        
        console.log('⏳ Aguardando 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.hide();
        sessionStorage.setItem('loadingShown', 'true');
    }

    async hide() {
        console.log('👻 Escondendo loading...');
        if (!this.loadingElement) return;
        this.loadingElement.style.display = 'none';
    }
}

// ─── Theme Manager
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        console.log('🎨 ThemeManager criado, tema atual:', this.currentTheme);
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.addEventListener('click', () => this.toggleTheme());
            console.log('✅ Event listener do tema adicionado');
        } else {
            console.log('❌ Botão themeToggle não encontrado');
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        console.log(`🔄 Mudando tema: ${this.currentTheme} → ${newTheme}`);
        this.applyTheme(newTheme);
    }
    
    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        console.log(`✅ Tema aplicado: ${theme}`);
    }
}

// ✅ WhatsApp Orb Arrastável
class WhatsAppOrb {
    constructor() {
        this.orb = document.getElementById('whatsappOrb');
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.init();
    }

    init() {
        if (!this.orb) return;

        // Restaurar posição salva ou usar padrão
        this.loadPosition();

        // Mouse events
        this.orb.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Touch events para mobile
        this.orb.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]), { passive: false });
        document.addEventListener('touchmove', (e) => this.drag(e.touches[0]), { passive: false });
        document.addEventListener('touchend', () => this.endDrag());

        // Click handler (só funciona se não estiver arrastando)
        this.orb.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.openWhatsApp();
            }
        });

        console.log('✅ WhatsApp Orb arrastável inicializada');
    }

    loadPosition() {
        const saved = localStorage.getItem('whatsapp_orb_position');
        if (saved) {
            const { x, y } = JSON.parse(saved);
            this.orb.style.left = `${x}px`;
            this.orb.style.top = `${y}px`;
        } else {
            // Posição padrão
            this.orb.style.left = '30px';
            this.orb.style.bottom = '30px';
            this.orb.style.right = 'auto';
        }
    }

    savePosition() {
        const rect = this.orb.getBoundingClientRect();
        const position = {
            x: rect.left,
            y: rect.top
        };
        localStorage.setItem('whatsapp_orb_position', JSON.stringify(position));
    }

    startDrag(e) {
        this.isDragging = true;
        this.orb.classList.add('dragging');
        
        const rect = this.orb.getBoundingClientRect();
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;
        
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) return;

        const newX = e.clientX - this.offsetX;
        const newY = e.clientY - this.offsetY;

        // Manter dentro da viewport
        const maxX = window.innerWidth - this.orb.offsetWidth;
        const maxY = window.innerHeight - this.orb.offsetHeight;

        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        this.orb.style.left = `${clampedX}px`;
        this.orb.style.top = `${clampedY}px`;
        this.orb.style.right = 'auto';
        this.orb.style.bottom = 'auto';

        e.preventDefault();
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.orb.classList.remove('dragging');
            this.savePosition();
        }
    }

    openWhatsApp() {
        const numero = window.dadosEmpresa?.whatsapp || '551434340001';
        const mensagem = 'Olá! Vim através do catálogo da Alpack e gostaria de mais informações.';
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
    }
}

// ✅ NOVO: Sistema de Carrinho com Quantidades
class CarrinhoManager {
    constructor() {
        this.carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
        this.init();
    }

    init() {
        this.atualizarContador();
        this.configurarEventos();
        console.log('✅ Carrinho inicializado com', this.carrinho.length, 'itens');
    }

    configurarEventos() {
        const cartButton = document.getElementById('cartButton');
        if (cartButton) {
            cartButton.addEventListener('click', () => this.toggleCarrinho());
        }
    }

    adicionarProduto(produtoId, quantidade = 1) {
        const produto = todosOsProdutos.find(p => p.id === produtoId);
        if (!produto) return;

        // Verificar se já está no carrinho
        const itemExistente = this.carrinho.find(item => item.id === produtoId);
        if (itemExistente) {
            // Atualizar quantidade
            itemExistente.quantidade = quantidade;
            showNotification(`Quantidade de ${produto.nome} atualizada para ${quantidade}!`, 'success');
        } else {
            // Adicionar novo item
            this.carrinho.push({
                id: produto.id,
                nome: produto.nome,
                emoji: produto.emoji,
                quantidade: quantidade
            });
            showNotification(`${produto.nome} (${quantidade}UN) adicionado ao carrinho!`, 'success');
        }

        this.salvarCarrinho();
        this.atualizarContador();
        this.mostrarBotaoCarrinho();
        this.marcarProdutoNoCarrinho(produtoId);
        
        console.log('🛒 Produto adicionado:', produto.nome, 'Quantidade:', quantidade);
    }

    alterarQuantidadeNoCarrinho(produtoId, novaQuantidade) {
        if (novaQuantidade < 1) {
            this.removerProduto(produtoId);
            return;
        }

        const item = this.carrinho.find(item => item.id === produtoId);
        if (item) {
            item.quantidade = Math.min(99, Math.max(1, novaQuantidade));
            this.salvarCarrinho();
            this.atualizarListaCarrinho();
            this.atualizarContador();
        }
    }

    removerProduto(produtoId) {
        this.carrinho = this.carrinho.filter(item => item.id !== produtoId);
        this.salvarCarrinho();
        this.atualizarContador();
        this.desmarcarProdutoDoCarrinho(produtoId);
        this.atualizarListaCarrinho();
        
        if (this.carrinho.length === 0) {
            this.esconderBotaoCarrinho();
        }

        showNotification('Produto removido do carrinho', 'info');
        console.log('🗑️ Produto removido do carrinho');
    }

    salvarCarrinho() {
        localStorage.setItem('carrinho', JSON.stringify(this.carrinho));
        // ✅ CORREÇÃO: Também atualizar a variável global
        carrinho = this.carrinho;
    }

    atualizarContador() {
        const totalItens = this.carrinho.reduce((total, item) => total + item.quantidade, 0);
        const contador = document.getElementById('cartCount');
        if (contador) {
            contador.textContent = totalItens;
        }
        
        if (this.carrinho.length > 0) {
            this.mostrarBotaoCarrinho();
        } else {
            this.esconderBotaoCarrinho();
        }
    }

    mostrarBotaoCarrinho() {
        const cartButton = document.getElementById('cartButton');
        if (cartButton) {
            cartButton.classList.add('visible');
        }
    }

    esconderBotaoCarrinho() {
        const cartButton = document.getElementById('cartButton');
        if (cartButton) {
            cartButton.classList.remove('visible');
        }
    }

    toggleCarrinho() {
        const cartPanel = document.getElementById('cartPanel');
        if (cartPanel.classList.contains('open')) {
            this.fecharCarrinho();
        } else {
            this.abrirCarrinho();
        }
    }

    abrirCarrinho() {
        const cartPanel = document.getElementById('cartPanel');
        this.atualizarListaCarrinho();
        cartPanel.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    fecharCarrinho() {
        const cartPanel = document.getElementById('cartPanel');
        cartPanel.classList.remove('open');
        document.body.style.overflow = 'auto';
    }

    atualizarListaCarrinho() {
        const cartItems = document.getElementById('cartItems');
        const cartActions = document.getElementById('cartActions');

        if (this.carrinho.length === 0) {
            cartItems.innerHTML = '<div class="cart-empty">Carrinho vazio</div>';
            cartActions.style.display = 'none';
            return;
        }

        cartItems.innerHTML = this.carrinho.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <span class="cart-item-emoji">${item.emoji}</span>
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.nome}</span>
                    <div class="cart-item-quantity">
                        <button class="quantity-mini-btn" onclick="carrinhoManager.alterarQuantidadeNoCarrinho(${item.id}, ${item.quantidade - 1})">−</button>
                        <span class="quantity-display">${item.quantidade}</span>
                        <button class="quantity-mini-btn" onclick="carrinhoManager.alterarQuantidadeNoCarrinho(${item.id}, ${item.quantidade + 1})">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="carrinhoManager.removerProduto(${item.id})">&times;</button>
            </div>
        `).join('');

        cartActions.style.display = 'flex';
    }

    marcarProdutoNoCarrinho(produtoId) {
        const card = document.getElementById(`card-${produtoId}`);
        if (card) {
            card.classList.add('in-cart');
            const emoji = card.querySelector('.cart-emoji');
            if (emoji) {
                emoji.style.display = 'block';
            }
        }
    }

    desmarcarProdutoDoCarrinho(produtoId) {
        const card = document.getElementById(`card-${produtoId}`);
        if (card) {
            card.classList.remove('in-cart');
            const emoji = card.querySelector('.cart-emoji');
            if (emoji) {
                emoji.style.display = 'none';
            }
        }
    }

    marcarTodosProdutosNoCarrinho() {
        this.carrinho.forEach(item => {
            this.marcarProdutoNoCarrinho(item.id);
        });
    }

    fazerPedido() {
        if (this.carrinho.length === 0) return;

        const numero = window.dadosEmpresa?.whatsapp || '551434340001';
        let mensagem = 'Olá! Gostaria de fazer um pedido...\n\n';
        
        this.carrinho.forEach((item, index) => {
            mensagem += `${index + 1}. ${item.nome} - ${item.quantidade}UN\n`;
        });

        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
        
        // Limpar carrinho após fazer pedido
        this.carrinho = [];
        this.salvarCarrinho();
        this.atualizarContador();
        this.fecharCarrinho();
        
        // Desmarcar todos os produtos
        document.querySelectorAll('.produto-card.in-cart').forEach(card => {
            card.classList.remove('in-cart');
            const emoji = card.querySelector('.cart-emoji');
            if (emoji) {
                emoji.style.display = 'none';
            }
        });

        showNotification('Pedido enviado! Carrinho limpo.', 'success');
    }
}

// ✅ NOVO: Sistema de Modal de Quantidade
function abrirModalQuantidade(produtoId) {
    console.log('🛒 Abrindo modal quantidade para produto:', produtoId);
    
    const produto = todosOsProdutos.find(p => p.id === produtoId);
    if (!produto) {
        console.error('❌ Produto não encontrado:', produtoId);
        return;
    }

    quantityModalProductId = produtoId;

    // ✅ CORREÇÃO: Usar carrinho global correto
    const itemNoCarrinho = carrinho.find(item => item.id === produtoId);
    const quantidadeAtual = itemNoCarrinho ? itemNoCarrinho.quantidade : 1;

    // ✅ VERIFICAÇÃO: Conferir se elementos existem
    const emojiEl = document.getElementById('quantityProductEmoji');
    const nameEl = document.getElementById('quantityProductName');
    const inputEl = document.getElementById('quantityInput');
    const modalEl = document.getElementById('quantityModal');

    if (!emojiEl || !nameEl || !inputEl || !modalEl) {
        console.error('❌ Elementos do modal não encontrados');
        console.log('Elements found:', {
            emoji: !!emojiEl,
            name: !!nameEl,
            input: !!inputEl,
            modal: !!modalEl
        });
        return;
    }

    emojiEl.textContent = produto.emoji;
    nameEl.textContent = produto.nome;
    inputEl.value = quantidadeAtual;

    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focar no input
    setTimeout(() => {
        inputEl.select();
    }, 100);
    
    console.log('✅ Modal de quantidade aberto');
}

function alterarQuantidade(delta) {
    const input = document.getElementById('quantityInput');
    if (!input) return;
    
    let valor = parseInt(input.value) + delta;
    valor = Math.max(1, Math.min(99, valor));
    input.value = valor;
}

function validarQuantidade() {
    const input = document.getElementById('quantityInput');
    if (!input) return;
    
    let valor = parseInt(input.value) || 1;
    valor = Math.max(1, Math.min(99, valor));
    input.value = valor;
}

function confirmarQuantidade() {
    const input = document.getElementById('quantityInput');
    if (!input) return;
    
    const quantidade = parseInt(input.value);
    if (quantityModalProductId && quantidade >= 1 && quantidade <= 99) {
        window.carrinhoManager.adicionarProduto(quantityModalProductId, quantidade);
        cancelarQuantidade();
    }
}

function cancelarQuantidade() {
    const modal = document.getElementById('quantityModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    quantityModalProductId = null;
}

// ✅ NOVO: Função Toggle dos Filtros
function toggleFiltros() {
    const filtrosContainer = document.getElementById('filtrosContainer');
    const toggleBtn = document.getElementById('filtrosToggle');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');
    
    filtrosMinimizados = !filtrosMinimizados;
    
    if (filtrosMinimizados) {
        // Minimizar
        filtrosContainer.classList.add('minimizado');
        toggleIcon.textContent = '⬇️';
        toggleBtn.setAttribute('aria-label', 'Expandir filtros');
        console.log('📦 Filtros minimizados');
    } else {
        // Expandir
        filtrosContainer.classList.remove('minimizado');
        toggleIcon.textContent = '⬆️';
        toggleBtn.setAttribute('aria-label', 'Minimizar filtros');
        console.log('📂 Filtros expandidos');
    }
    
    // Salvar estado
    localStorage.setItem('filtros_minimizados', filtrosMinimizados);
}

// ✅ INICIALIZAÇÃO COM LOGS EXTREMOS
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀🚀🚀 APLICAÇÃO INICIANDO - VERSÃO COM CARRINHO + QUANTIDADE 🚀🚀🚀');
    
    // Loading
    const loading = new LoadingScreen();
    await loading.init();
    
    // Tema
    new ThemeManager();

    // ✅ ORB ARRASTÁVEL
    new WhatsAppOrb();

    // ✅ NOVO: Carrinho
    window.carrinhoManager = new CarrinhoManager();

    // ✅ NOVO: Configurar eventos do modal de quantidade
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('quantityModal');
        if (e.target === modal) {
            cancelarQuantidade();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('quantityModal');
            if (modal && modal.style.display === 'flex') {
                cancelarQuantidade();
            }
        }
    });

    // ✅ NOVO: Restaurar estado dos filtros
    if (filtrosMinimizados) {
        const filtrosContainer = document.getElementById('filtrosContainer');
        const toggleBtn = document.getElementById('filtrosToggle');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        
        if (filtrosContainer && toggleBtn && toggleIcon) {
            filtrosContainer.classList.add('minimizado');
            toggleIcon.textContent = '⬇️';
            toggleBtn.setAttribute('aria-label', 'Expandir filtros');
            console.log('🔄 Estado dos filtros restaurado: minimizado');
        }
    }

    // ✅ CARREGAR DADOS COM VALIDAÇÃO EXTREMA
    console.log('📊 Verificando window.DADOS_BANCO...');
    console.log('window.DADOS_BANCO exists:', !!window.DADOS_BANCO);
    console.log('window.DADOS_BANCO value:', window.DADOS_BANCO);
    
    if (window.DADOS_BANCO) {
        todosOsProdutos = window.DADOS_BANCO.produtos || [];
        todasAsCategorias = window.DADOS_BANCO.categorias || [];
        
        console.log('📦 PRODUTOS CARREGADOS:');
        console.log('- Total:', todosOsProdutos.length);
        console.log('- Primeiro produto:', todosOsProdutos[0]);
        
        console.log('📁 CATEGORIAS CARREGADAS:');
        console.log('- Total:', todasAsCategorias.length);
        console.log('- Primeira categoria:', todasAsCategorias[0]);
        
        if (todosOsProdutos.length === 0) {
            console.error('❌ NENHUM PRODUTO CARREGADO!');
        }
        
        if (todasAsCategorias.length === 0) {
            console.error('❌ NENHUMA CATEGORIA CARREGADA!');
        }
    } else {
        console.error('❌❌❌ window.DADOS_BANCO NÃO EXISTE!');
        console.log('window object keys:', Object.keys(window));
    }

    // Verificar elementos DOM
    console.log('🔍 Verificando elementos DOM...');
    console.log('- categoriasContainer:', !!document.getElementById('categoriasContainer'));
    console.log('- produtosGrid:', !!document.getElementById('produtosGrid'));
    console.log('- buscaInput:', !!document.getElementById('buscaInput'));
    console.log('- quantityModal:', !!document.getElementById('quantityModal'));

    construirBotoesCategorias();
    aplicarFiltros();
    inicializarBusca();
    inicializarModal();
    
    console.log('✅✅✅ APLICAÇÃO INICIADA COM SUCESSO! ✅✅✅');
});

// ✅ CONSTRUIR CATEGORIAS COM LOGS
function construirBotoesCategorias() {
    console.log('🔧🔧 Construindo botões de categorias...');
    const container = document.getElementById('categoriasContainer');
    if (!container) {
        console.error('❌ categoriasContainer NÃO ENCONTRADO!');
        return;
    }

    console.log('📋 Container encontrado, filhos atuais:', container.children.length);

    // Remove botões extras, mantém só o "Todos"
    while (container.children.length > 1) {
        container.removeChild(container.lastChild);
    }

    console.log(`🏗️ Criando ${todasAsCategorias.length} botões de categoria...`);

    todasAsCategorias.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = 'categoria-btn';
        btn.dataset.categoria = String(cat.id);
        btn.textContent = cat.emoji + ' ' + cat.nome;
        btn.addEventListener('click', () => filtrarCategoria(String(cat.id), btn));
        container.appendChild(btn);
        console.log(`➕ [${index + 1}] Categoria criada: ID ${cat.id} - ${cat.nome}`);
    });

    const btnTodos = container.querySelector('[data-categoria="todos"]');
    if (btnTodos) {
        btnTodos.addEventListener('click', () => filtrarCategoria('todos', btnTodos));
        console.log('✅ Botão "Todos" configurado');
    } else {
        console.error('❌ Botão "Todos" não encontrado!');
    }
    
    console.log(`✅ BOTÕES CRIADOS! Total no container: ${container.children.length}`);
}

// ✅ FILTROS COM LOGS DETALHADOS
function filtrarCategoria(cat, btnEl) {
    console.log(`🎯🎯 FILTRO CATEGORIA ACIONADO: "${cat}"`);
    categoriaAtiva = cat;
    paginaAtual = 1;

    document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('ativo'));
    if (btnEl) btnEl.classList.add('ativo');

    aplicarFiltros();
}

function inicializarBusca() {
    console.log('🔍 Inicializando busca...');
    const input = document.getElementById('buscaInput');
    if (!input) {
        console.error('❌ buscaInput NÃO ENCONTRADO!');
        return;
    }
    
    let timer;
    input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            termoBusca = this.value.trim().toLowerCase();
            console.log(`🔍 BUSCA EXECUTADA: "${termoBusca}"`);
            paginaAtual = 1;
            aplicarFiltros();
        }, 300);
    });
    console.log('✅ Busca configurada');
}

// ✅ APLICAR FILTROS COM LOGS EXTREMOS
function aplicarFiltros() {
    console.log('⚡⚡⚡ === APLICANDO FILTROS === ⚡⚡⚡');
    console.log(`📊 Estado atual:`);
    console.log(`  - categoriaAtiva: "${categoriaAtiva}"`);
    console.log(`  - termoBusca: "${termoBusca}"`);
    console.log(`  - todosOsProdutos.length: ${todosOsProdutos.length}`);
    
    let resultado = [...todosOsProdutos];
    console.log(`📦 Produtos iniciais: ${resultado.length}`);

    // ✅ FILTRO POR CATEGORIA
    if (categoriaAtiva !== 'todos') {
        const catId = parseInt(categoriaAtiva);
        console.log(`🎯 Filtrando por categoria ID: ${catId}`);
        
        resultado = resultado.filter(p => {
            const match = p.categoria_id === catId;
            if (!match) {
                console.log(`🚫 Produto "${p.nome}" (cat ${p.categoria_id}) rejeitado`);
            } else {
                console.log(`✅ Produto "${p.nome}" (cat ${p.categoria_id}) aceito`);
            }
            return match;
        });
        console.log(`📂 Após filtro categoria: ${resultado.length} produtos`);
    }

    // ✅ FILTRO POR BUSCA
    if (termoBusca) {
        console.log(`🔍 Aplicando busca: "${termoBusca}"`);
        resultado = resultado.filter(p => {
            const matchNome = p.nome.toLowerCase().includes(termoBusca);
            const matchDesc = p.descricao.toLowerCase().includes(termoBusca);
            const matchTags = p.tags && p.tags.some(t => t.toLowerCase().includes(termoBusca));
            const match = matchNome || matchDesc || matchTags;
            
            if (match) {
                console.log(`✅ Produto "${p.nome}" passou na busca`);
            }
            return match;
        });
        console.log(`🔍 Após filtro busca: ${resultado.length} produtos`);
    }

    // ✅ ORDENAR
    resultado.sort((a, b) => {
        if (a.destaque && !b.destaque) return -1;
        if (!a.destaque && b.destaque) return 1;
        return a.nome.localeCompare(b.nome);
    });

    console.log(`✅ FILTROS APLICADOS! Resultado final: ${resultado.length} produtos`);
    console.log('🎨 Chamando renderizarPagina...');
    renderizarPagina(resultado);
}

function resetarFiltros() {
    console.log('🔄 RESETANDO FILTROS...');
    categoriaAtiva = 'todos';
    termoBusca = '';
    paginaAtual = 1;

    const input = document.getElementById('buscaInput');
    if (input) input.value = '';

    document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('ativo'));
    const btnTodos = document.querySelector('[data-categoria="todos"]');
    if (btnTodos) btnTodos.classList.add('ativo');

    aplicarFiltros();
}

// ✅ RENDERIZAÇÃO COM LOGS EXTREMOS
function renderizarPagina(produtos, animateCards = false) {
    console.log(`🎨🎨🎨 === RENDERIZANDO PÁGINA === 🎨🎨🎨`);
    console.log(`📊 Recebido ${produtos.length} produtos para renderizar`);
    
    const grid = document.getElementById('produtosGrid');
    const vazio = document.getElementById('produtosVazio');
    const controls = document.getElementById('paginationControls');
    const info = document.getElementById('infoTexto');

    // VERIFICAÇÃO CRÍTICA
    if (!grid) {
        console.error('❌❌❌ produtosGrid NÃO ENCONTRADO!');
        console.log('Elementos disponíveis:', document.querySelectorAll('[id]'));
        return;
    }
    
    console.log('✅ Grid encontrado:', grid);

    // ✅ ATUALIZAR INFO
    if (info) {
        const total = produtos.length;
        let txt = `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`;
        if (termoBusca) txt += ` para "${termoBusca}"`;
        if (categoriaAtiva !== "todos") {
            const cat = todasAsCategorias.find(c => c.id === parseInt(categoriaAtiva));
            if (cat) txt += ` em ${cat.nome}`;
        }
        info.textContent = txt;
        console.log(`📝 Info atualizada: "${txt}"`);
    } else {
        console.log('⚠️ infoTexto não encontrado');
    }

    // ✅ SE VAZIO
    if (produtos.length === 0) {
        console.log('📭 Nenhum produto para exibir');
        grid.innerHTML = '<p style="text-align:center;padding:40px;font-size:1.2rem;color:var(--cor-cinza);">🔍 Nenhum produto encontrado</p>';
        if (vazio) vazio.style.display = 'block';
        if (controls) controls.style.display = 'none';
        return;
    }

    if (vazio) vazio.style.display = 'none';

    // ✅ PAGINAÇÃO
    const totalPaginas = Math.ceil(produtos.length / ITENS_POR_PAGINA);
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const slice = produtos.slice(inicio, fim);

    console.log(`📄 Paginação: ${paginaAtual}/${totalPaginas} - Mostrando ${slice.length} produtos (${inicio}-${fim})`);

    // ✅ RENDERIZAR CARDS COM LOG INDIVIDUAL
    console.log('🎴 Criando cards...');
    const cardsHTML = slice.map((p, index) => {
        console.log(`🎴 [${index + 1}] Criando card para: "${p.nome}"`);
        return criarCardProduto(p, index);
    }).join('');

    console.log(`📝 HTML gerado (${cardsHTML.length} caracteres)`);
    grid.innerHTML = cardsHTML;
    
    console.log(`✅ Grid atualizado! Filhos agora: ${grid.children.length}`);

    // ✅ MARCAR PRODUTOS NO CARRINHO
    if (window.carrinhoManager) {
        window.carrinhoManager.marcarTodosProdutosNoCarrinho();
    }

    // ✅ CONTROLES DE PAGINAÇÃO
    if (totalPaginas > 1) {
        if (controls) controls.style.display = 'flex';
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (pageInfo) pageInfo.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
        if (prevBtn) prevBtn.disabled = paginaAtual === 1;
        if (nextBtn) nextBtn.disabled = paginaAtual === totalPaginas;
        console.log('✅ Controles de paginação atualizados');
    } else {
        if (controls) controls.style.display = 'none';
        console.log('📄 Paginação escondida (só 1 página)');
    }

    console.log('✅✅✅ RENDERIZAÇÃO CONCLUÍDA! ✅✅✅');
}

function mudarPagina(direcao) {
    console.log(`📄 Mudando página: ${direcao > 0 ? 'próxima' : 'anterior'}`);
    const totalPaginas = Math.ceil(todosOsProdutos.length / ITENS_POR_PAGINA);
    const novaPagina = paginaAtual + direcao;
    
    if (novaPagina < 1 || novaPagina > totalPaginas) {
        console.log('❌ Página fora dos limites');
        return;
    }
    
    paginaAtual = novaPagina;
    aplicarFiltros();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ✅ CARD MELHORADO COM CARRINHO E QUANTIDADE
function criarCardProduto(produto, index = 0) {
    const cat = todasAsCategorias.find(c => c.id === produto.categoria_id);
    const catNome = cat ? `${cat.emoji} ${cat.nome}` : '❓ Sem categoria';

    // ✅ IMAGEM OU EMOJI MELHORADO
    const imagemHtml = produto.imagem
        ? `<img src="${produto.imagem}" alt="${produto.nome}" loading="lazy" style="width:100%;height:200px;object-fit:contain;padding:10px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div style="display:none;font-size:4rem;align-items:center;justify-content:center;height:200px;color:var(--cor-primaria);">${produto.emoji || '📦'}</div>`
        : `<div style="font-size:4rem;display:flex;align-items:center;justify-content:center;height:200px;color:var(--cor-primaria);">${produto.emoji || '📦'}</div>`;

    const destaqueHtml = produto.destaque 
        ? `<div class="produto-destaque-badge">⭐ DESTAQUE</div>` 
        : '';

    const tagsHtml = produto.tags && produto.tags.length
        ? produto.tags.map(t => `<span class="tag">#${t}</span>`).join('')
        : '';

    return `
        <div class="produto-card ${produto.destaque ? 'destaque' : ''}" 
             id="card-${produto.id}"
             onclick="abrirModal(${produto.id}, this)" 
             style="cursor:pointer;">
            ${destaqueHtml}
            <div class="cart-emoji" style="display: none;">🛒</div>
            <div class="produto-imagem">
                ${imagemHtml}
            </div>
            <div class="produto-info">
                <div class="produto-categoria">${catNome}</div>
                <h3 class="produto-nome">${produto.nome}</h3>
                <p class="produto-descricao">${produto.descricao.slice(0, 100)}${produto.descricao.length > 100 ? '...' : ''}</p>
                <div class="produto-tags">${tagsHtml}</div>
                <div class="produto-actions">
                    <button class="btn-whatsapp" onclick="event.stopPropagation(); abrirWhatsapp('${produto.nome.replace(/'/g, "\\'")}')">
                        💬 WhatsApp
                    </button>
                    <button class="btn-add-cart" onclick="event.stopPropagation(); abrirModalQuantidade(${produto.id})">
                        🛒 Adicionar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ✅ NOVO: Função para adicionar ao carrinho
function adicionarAoCarrinho(produtoId) {
    abrirModalQuantidade(produtoId);
}

// ✅ NOVO: Função para fechar carrinho
function fecharCarrinho() {
    if (window.carrinhoManager) {
        window.carrinhoManager.fecharCarrinho();
    }
}

// ✅ NOVO: Função para fazer pedido
function fazerPedido() {
    if (window.carrinhoManager) {
        window.carrinhoManager.fazerPedido();
    }
}

// ✅ MODAL COM ANIMAÇÕES CORRIGIDAS
function inicializarModal() {
    const modal = document.getElementById('modalDetalhes');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) fecharModal();
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') fecharModal();
    });
    console.log('✅ Modal inicializado');
}

function abrirModal(id, cardElement) {
    console.log(`🔍 Abrindo modal para produto ID: ${id}`);
    const produto = todosOsProdutos.find(p => p.id === id);
    if (!produto) {
        console.error(`❌ Produto ${id} não encontrado`);
        return;
    }

    // ✅ SALVAR REFERÊNCIA DO CARD ORIGINAL
    modalOriginCard = cardElement || document.getElementById(`card-${id}`);

    const cat = todasAsCategorias.find(c => c.id === produto.categoria_id);
    const catNome = cat ? `${cat.emoji} ${cat.nome}` : 'Sem categoria';

    const imagemHtml = produto.imagem
        ? `<img src="${produto.imagem}" alt="${produto.nome}" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:10px;">`
        : `<div style="font-size:80px;text-align:center;padding:20px;color:var(--cor-primaria);">${produto.emoji || '📦'}</div>`;

    const tagsHtml = produto.tags && produto.tags.length
        ? produto.tags.map(t => `<span class="tag">#${t}</span>`).join('')
        : '';

    const detalhe = document.getElementById('produtoDetalhe');
    const modal = document.getElementById('modalDetalhes');

    if (detalhe) {
        detalhe.innerHTML = `
            <div class="produto-imagem-grande">${imagemHtml}</div>
            <div class="produto-info-detalhada">
                <div class="produto-categoria" style="margin-bottom:8px;">${catNome}</div>
                <h1 class="produto-nome-grande">${produto.nome}</h1>
                ${produto.destaque ? `<div class="produto-destaque-info">⭐ PRODUTO EM DESTAQUE ⭐</div>` : ''}
                <p class="produto-descricao-detalhada">${produto.descricao}</p>
                <div class="produto-tags" style="margin-bottom:20px;">${tagsHtml}</div>
                <div class="acoes-produto">
                    <button class="btn-whatsapp-grande" onclick="abrirWhatsapp('${produto.nome.replace(/'/g, "\\'")}')">
                        📱 Entrar em Contato
                    </button>
                    <button class="btn-add-cart-grande" onclick="abrirModalQuantidade(${produto.id})">
                        🛒 Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        `;
    }

    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Trigger animação
        requestAnimationFrame(() => {
            modal.classList.add('modal-opening');
        });
    }
}

function fecharModal() {
    const modal = document.getElementById('modalDetalhes');
    
    if (modal) {
        modal.classList.remove('modal-opening');
        modal.classList.add('modal-closing');
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('modal-closing');
            document.body.style.overflow = 'auto';
            modalOriginCard = null;
        }, 300);
    }
}

// ✅ WHATSAPP (SEM ALTERAÇÕES)
function abrirWhatsapp(nomeProduto) {
    console.log(`📱 Abrindo WhatsApp para: ${nomeProduto}`);
    const numero = window.dadosEmpresa?.whatsapp || '551434340001';
    const template = window.dadosEmpresa?.mensagemPadrao || 'Olá! Tenho interesse no produto {produto}.';
    const mensagem = template.replace('{produto}', nomeProduto);
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// ✅ COMPARTILHAR (SEM ALTERAÇÕES)
function compartilharProduto(nome, descricao) {
    console.log(`🔗 Compartilhando: ${nome}`);
    if (navigator.share) {
        navigator.share({ 
            title: `${nome} - Alpack`, 
            text: descricao, 
            url: window.location.href 
        }).catch(console.error);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href)
            .then(() => console.log('✅ Link copiado!'))
            .catch(() => console.error('❌ Erro ao copiar'));
    }
}

// ✅ NOTIFICAÇÕES (SEM ALTERAÇÕES)
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    const container = document.getElementById('notification-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type] || 'ℹ️'}</span>
            <span>${message}</span>
        </div>
        <div class="progress-bar"></div>
    `;
    container.appendChild(el);

    setTimeout(() => {
        el.classList.add('hide');
        setTimeout(() => el.remove(), 500);
    }, 5000);
}

console.log('✅ script.js carregado completamente - versão com carrinho + quantidade');