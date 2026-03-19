# produtos/views.py
import json
import os
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.utils.html import escape
from .models import Categoria, Produto

def salvar_dados_no_banco():
    """Salva dados padrão no banco se estiver vazio"""
    if not Categoria.objects.exists():
        categorias_padrao = [
            {"id": 1, "nome": "Embalagens", "emoji": "📦"},
            {"id": 2, "nome": "Plásticos", "emoji": "🥤"},
            {"id": 3, "nome": "Descartáveis", "emoji": "🍽️"},
            {"id": 4, "nome": "Produtos de Limpeza", "emoji": "🧽"},
            {"id": 5, "nome": "Cestos e Lixeiras", "emoji": "🗑️"},
            {"id": 6, "nome": "Sacos de Lixo", "emoji": "🛍️"},
            {"id": 7, "nome": "Sacolas Plásticas", "emoji": "🛒"}
        ]
        
        for cat_data in categorias_padrao:
            Categoria.objects.get_or_create(
                id=cat_data['id'],
                defaults={
                    'nome': cat_data['nome'],
                    'emoji': cat_data['emoji']
                }
            )
    
    if not Produto.objects.exists():
        categoria_embalagens = Categoria.objects.get(id=1)
        Produto.objects.get_or_create(
            id=1,
            defaults={
                'nome': 'Caixas de Papelão Ondulado',
                'descricao': 'Caixas resistentes para transporte e armazenamento. Diversos tamanhos disponíveis.',
                'categoria': categoria_embalagens,
                'emoji': '📦',
                'imagem': '',
                'destaque': True,
                'tags': 'embalagem, transporte, papelao, resistente'
            }
        )

def carregar_dados():
    """Carrega dados sempre do banco de dados"""
    try:
        salvar_dados_no_banco()
        
        categorias = list(Categoria.objects.all().values('id', 'nome', 'emoji'))
        
        produtos = []
        for produto in Produto.objects.all():
            produtos.append({
                'id': produto.id,
                'nome': escape(produto.nome),  # Escape HTML para segurança
                'descricao': escape(produto.descricao),
                'categoria_id': produto.categoria.id,
                'emoji': produto.emoji,
                'imagem': produto.imagem,
                'destaque': produto.destaque,
                'tags': produto.get_tags_list()
            })
        
        return {"categorias": categorias, "produtos": produtos}
        
    except Exception as e:
        return {
            "categorias": [{"id": 1, "nome": "Embalagens", "emoji": "📦"}],
            "produtos": [{
                "id": 1, "nome": "Produto de Exemplo",
                "descricao": "Descrição de exemplo",
                "categoria_id": 1, "emoji": "📦", "imagem": "", "destaque": True,
                "tags": ["exemplo"]
            }]
        }

def catalogo(request):
    dados = carregar_dados()
    produtos = dados.get('produtos', [])
    categorias = dados.get('categorias', [])

    # Sanitização de entrada
    categoria_filtro = request.GET.get('categoria')
    busca = escape(request.GET.get('busca', '').strip())

    if categoria_filtro:
        try:
            categoria_id = int(categoria_filtro)
            produtos = [p for p in produtos if p.get('categoria_id') == categoria_id]
        except (ValueError, TypeError):
            pass

    if busca:
        busca_lower = busca.lower()
        produtos = [
            p for p in produtos
            if busca_lower in p.get('nome', '').lower()
            or busca_lower in p.get('descricao', '').lower()
            or any(busca_lower in tag.lower() for tag in p.get('tags', []))
        ]

    produtos.sort(key=lambda x: (not x.get('destaque', False), x.get('nome', '')))

    context = {
        'produtos': produtos,
        'categorias': categorias,
        'categoria_atual': categoria_filtro,
        'busca_atual': busca,
        'empresa': settings.EMPRESA_CONFIG,
        'total_produtos': len(produtos),
    }

    return render(request, 'HTMLs/home.html', context)

@csrf_protect
@require_http_methods(["GET", "POST"])
def backend(request):
    if request.GET.get('logout') == '1':
        logout(request)
        return redirect('produtos:backend')
    
    if request.method == 'POST':
        username = escape(request.POST.get('username', ''))
        password = request.POST.get('password', '')
        
        if not username or not password:
            messages.error(request, 'Usuário e senha são obrigatórios.')
        else:
            user = authenticate(request, username=username, password=password)
            if user is not None and user.is_active:
                login(request, user)
                return redirect('produtos:backend')
            else:
                messages.error(request, 'Credenciais inválidas.')
    
    if request.user.is_authenticated:
        return render(request, 'backend/admin.html')
    else:
        return render(request, 'backend/admin.html', {'show_login': True})

def api_produtos(request):
    dados = carregar_dados()
    return JsonResponse(dados, safe=False)

@login_required
@csrf_protect
@require_http_methods(["POST"])
def api_salvar_produto(request):
    try:
        data = json.loads(request.body)
        
        # Validação de dados
        nome = escape(data.get('nome', '').strip())
        descricao = escape(data.get('descricao', '').strip())
        
        if not nome or not descricao:
            return JsonResponse({'success': False, 'error': 'Nome e descrição são obrigatórios'})
        
        categoria = Categoria.objects.get(id=int(data['categoria_id']))
        
        if data.get('id'):
            produto = Produto.objects.get(id=int(data['id']))
            produto.nome = nome
            produto.descricao = descricao
            produto.categoria = categoria
            produto.emoji = data.get('emoji', '📦')
            produto.imagem = data.get('imagem', '')
            produto.destaque = bool(data.get('destaque', False))
            produto.tags = ', '.join([escape(tag.strip()) for tag in data.get('tags', [])])
            produto.save()
        else:
            produto = Produto.objects.create(
                nome=nome,
                descricao=descricao,
                categoria=categoria,
                emoji=data.get('emoji', '📦'),
                imagem=data.get('imagem', ''),
                destaque=bool(data.get('destaque', False)),
                tags=', '.join([escape(tag.strip()) for tag in data.get('tags', [])])
            )
        
        return JsonResponse({'success': True, 'id': produto.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'})

@login_required
@require_http_methods(["DELETE"])
def api_deletar_produto(request, produto_id):
    try:
        produto = Produto.objects.get(id=int(produto_id))
        produto.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'})

@login_required
@csrf_protect
@require_http_methods(["POST"])
def api_salvar_categoria(request):
    try:
        data = json.loads(request.body)
        
        nome = escape(data.get('nome', '').strip())
        emoji = data.get('emoji', '📦')
        
        if not nome:
            return JsonResponse({'success': False, 'error': 'Nome é obrigatório'})
        
        if data.get('id'):
            categoria = Categoria.objects.get(id=int(data['id']))
            categoria.nome = nome
            categoria.emoji = emoji
            categoria.save()
        else:
            categoria = Categoria.objects.create(nome=nome, emoji=emoji)
        
        return JsonResponse({'success': True, 'id': categoria.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'})

@login_required
@require_http_methods(["DELETE"])
def api_deletar_categoria(request, categoria_id):
    try:
        categoria = Categoria.objects.get(id=int(categoria_id))
        categoria.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'})