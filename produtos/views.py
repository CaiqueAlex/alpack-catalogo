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
from django.db import connection
from .models import Categoria, Produto
import logging

# Configurar logging para debug
logger = logging.getLogger(__name__)

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
        
        # Corrigir sequência após inserções manuais
        fix_postgresql_sequences()
    
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
        
        # Corrigir sequência após inserções manuais
        fix_postgresql_sequences()

def fix_postgresql_sequences():
    """Corrige as sequências do PostgreSQL após inserções manuais"""
    try:
        with connection.cursor() as cursor:
            # Corrigir sequência da tabela categorias
            cursor.execute("""
                SELECT setval('produtos_categoria_id_seq', 
                    COALESCE((SELECT MAX(id) FROM produtos_categoria), 1), 
                    true);
            """)
            
            # Corrigir sequência da tabela produtos  
            cursor.execute("""
                SELECT setval('produtos_produto_id_seq', 
                    COALESCE((SELECT MAX(id) FROM produtos_produto), 1), 
                    true);
            """)
            
        logger.info("✅ Sequências PostgreSQL corrigidas")
        
    except Exception as e:
        logger.error(f"Erro ao corrigir sequências: {e}")

def carregar_dados():
    """Carrega dados sempre do banco de dados"""
    try:
        salvar_dados_no_banco()
        
        categorias = list(Categoria.objects.all().values('id', 'nome', 'emoji'))
        
        produtos = []
        for produto in Produto.objects.all():
            produtos.append({
                'id': produto.id,
                'nome': escape(produto.nome),
                'descricao': escape(produto.descricao),
                'categoria_id': produto.categoria.id,
                'emoji': produto.emoji,
                'imagem': produto.imagem,
                'destaque': produto.destaque,
                'tags': produto.get_tags_list()
            })
        
        return {"categorias": categorias, "produtos": produtos}
        
    except Exception as e:
        logger.error(f"Erro ao carregar dados: {e}")
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
    except Categoria.DoesNotExist:
        logger.error("Categoria não encontrada")
        return JsonResponse({'success': False, 'error': 'Categoria não encontrada'})
    except ValueError as e:
        logger.error(f"Erro de validação no produto: {e}")
        return JsonResponse({'success': False, 'error': 'Dados inválidos fornecidos'})
    except Exception as e:
        logger.error(f"Erro interno ao salvar produto: {e}")
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'})

@login_required
@require_http_methods(["DELETE"])
def api_deletar_produto(request, produto_id):
    try:
        produto = Produto.objects.get(id=int(produto_id))
        produto.delete()
        return JsonResponse({'success': True})
    except Produto.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Produto não encontrado'})
    except Exception as e:
        logger.error(f"Erro ao deletar produto: {e}")
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'})

@login_required
@csrf_protect
@require_http_methods(["POST"])
def api_salvar_categoria(request):
    try:
        # Verificar se o request tem body válido
        if not hasattr(request, 'body') or not request.body:
            logger.error("Request body vazio")
            return JsonResponse({'success': False, 'error': 'Dados não fornecidos'})
        
        # Parse do JSON
        try:
            data = json.loads(request.body)
            logger.info(f"Dados recebidos: {data}")
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao fazer parse do JSON: {e}")
            return JsonResponse({'success': False, 'error': 'Dados JSON inválidos'})
        
        # Validação dos campos obrigatórios
        nome = data.get('nome', '').strip()
        emoji = data.get('emoji', '📦').strip()
        
        if not nome:
            return JsonResponse({'success': False, 'error': 'Nome é obrigatório'})
            
        if len(nome) > 100:
            return JsonResponse({'success': False, 'error': 'Nome muito longo (máximo 100 caracteres)'})
            
        if len(emoji) > 10:
            return JsonResponse({'success': False, 'error': 'Emoji muito longo (máximo 10 caracteres)'})
        
        # Escapar dados para segurança
        nome = escape(nome)
        emoji = escape(emoji)
        
        # Salvar ou atualizar categoria
        if data.get('id'):
            # Atualizar categoria existente
            try:
                categoria_id = int(data['id'])
                categoria = Categoria.objects.get(id=categoria_id)
                categoria.nome = nome
                categoria.emoji = emoji
                categoria.save()
                logger.info(f"Categoria {categoria_id} atualizada com sucesso")
            except Categoria.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Categoria não encontrada'})
            except ValueError:
                return JsonResponse({'success': False, 'error': 'ID de categoria inválido'})
        else:
            # Criar nova categoria SEM especificar ID (deixa o PostgreSQL decidir)
            categoria = Categoria.objects.create(nome=nome, emoji=emoji)
            logger.info(f"Nova categoria {categoria.id} criada com sucesso")
        
        return JsonResponse({'success': True, 'id': categoria.id})
        
    except Exception as e:
        # Log detalhado do erro
        logger.error(f"Erro interno ao salvar categoria: {str(e)}", exc_info=True)
        
        # Verificar se é erro de sequência e tentar corrigir
        if 'duplicate key value violates unique constraint' in str(e):
            try:
                fix_postgresql_sequences()
                return JsonResponse({
                    'success': False, 
                    'error': 'Erro de sequência detectado e corrigido. Tente novamente.'
                })
            except:
                pass
        
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'})

@login_required
@require_http_methods(["DELETE"])
def api_deletar_categoria(request, categoria_id):
    try:
        categoria = Categoria.objects.get(id=int(categoria_id))
        
        # Verificar se há produtos usando esta categoria
        produtos_count = Produto.objects.filter(categoria=categoria).count()
        if produtos_count > 0:
            return JsonResponse({
                'success': False, 
                'error': f'Não é possível excluir. Há {produtos_count} produto(s) usando esta categoria.'
            })
        
        categoria.delete()
        logger.info(f"Categoria {categoria_id} deletada com sucesso")
        return JsonResponse({'success': True})
        
    except Categoria.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Categoria não encontrada'})
    except Exception as e:
        logger.error(f"Erro ao deletar categoria: {e}")
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'})