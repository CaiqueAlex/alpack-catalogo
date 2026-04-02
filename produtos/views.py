# produtos/views.py
import json
import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from django.utils.html import escape
from django.db import connection
from .models import Categoria, Produto, ConfiguracaoEmpresa
import logging

logger = logging.getLogger(__name__)


def salvar_dados_no_banco():
    if not Categoria.objects.exists():
        categorias_padrao = [
            {"id": 1, "nome": "Embalagens",          "emoji": "📦"},
            {"id": 2, "nome": "Plásticos",            "emoji": "🥤"},
            {"id": 3, "nome": "Descartáveis",         "emoji": "🍽️"},
            {"id": 4, "nome": "Produtos de Limpeza",  "emoji": "🧽"},
            {"id": 5, "nome": "Cestos e Lixeiras",    "emoji": "🗑️"},
            {"id": 6, "nome": "Sacos de Lixo",        "emoji": "🛍️"},
            {"id": 7, "nome": "Sacolas Plásticas",    "emoji": "🛒"},
        ]
        for cat_data in categorias_padrao:
            Categoria.objects.get_or_create(
                id=cat_data['id'],
                defaults={'nome': cat_data['nome'], 'emoji': cat_data['emoji']}
            )
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
        fix_postgresql_sequences()


def fix_postgresql_sequences():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT setval('produtos_categoria_id_seq',
                    COALESCE((SELECT MAX(id) FROM produtos_categoria), 1), true);
            """)
            cursor.execute("""
                SELECT setval('produtos_produto_id_seq',
                    COALESCE((SELECT MAX(id) FROM produtos_produto), 1), true);
            """)
        logger.info("✅ Sequências PostgreSQL corrigidas")
    except Exception as e:
        logger.error(f"Erro ao corrigir sequências: {e}")


def carregar_dados():
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

    # Ordenação: Destaques primeiro, depois nome
    produtos.sort(key=lambda x: (not x.get('destaque', False), x.get('nome', '')))

    # ✅ Busca as configurações do banco para passar ao HTML
    empresa_config = ConfiguracaoEmpresa.get_config()

    context = {
        'produtos': produtos,
        'categorias': categorias,
        'produtos_json': json.dumps(produtos),
        'categorias_json': json.dumps(categorias),
        'categoria_atual': categoria_filtro,
        'busca_atual': busca,
        'empresa': empresa_config, # <--- Isso faz o {{ empresa.xxx }} funcionar
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
        user = authenticate(request, username=username, password=password)
        if user is not None and user.is_active:
            login(request, user)
            return redirect('produtos:backend')
        else:
            messages.error(request, 'Credenciais inválidas.')
    
    if request.user.is_authenticated:
        config = ConfiguracaoEmpresa.get_config()
        
        # Criamos o dicionário para o JSON
        config_dict = {
            "nome": config.nome,
            "whatsapp": config.whatsapp,
            "email": config.email,
            "endereco": config.endereco,
            "horario": config.horario,
            "mensagem_padrao": config.mensagem_padrao,
            "header_titulo": config.header_titulo,
            "header_subtitulo": config.header_subtitulo
        }
        
        return render(request, 'backend/admin.html', {
            'empresa': config,
            'config_atual_json': json.dumps(config_dict, default=str) # O 'default=str' previne erros
        })
    
    return render(request, 'backend/admin.html', {'show_login': True})


def api_produtos(request):
    dados = carregar_dados()
    return JsonResponse(dados, safe=False)


# ✅ NOVO: Salvar configurações no banco
@login_required
@csrf_protect
@require_http_methods(["POST"])
def api_salvar_config(request):
    """
    Recebe os dados do formulário de configurações via AJAX (JSON)
    e salva no banco de dados.
    """
    try:
        data = json.loads(request.body)
        # Chama o método set_config que definimos no models.py
        ConfiguracaoEmpresa.set_config(data)
        return JsonResponse({'success': True})
    except Exception as e:
        logger.error(f"Erro ao salvar configurações: {e}")
        return JsonResponse({'success': False, 'error': str(e)})


# ✅ NOVO: Exportar XML
@login_required
@require_http_methods(["GET"])
def api_exportar_xml(request):
    """
    Parâmetros GET:
      categoria_id=<int>  — filtra por categoria (omitir = todos)
      destaque=1          — apenas produtos em destaque
    """
    try:
        queryset = Produto.objects.select_related('categoria').all()

        categoria_id = request.GET.get('categoria_id')
        if categoria_id:
            queryset = queryset.filter(categoria_id=int(categoria_id))

        if request.GET.get('destaque') == '1':
            queryset = queryset.filter(destaque=True)

        # ── Montar XML ──────────────────────────────────────
        root = ET.Element('catalogo')
        root.set('versao', '1.0')
        root.set('exportado_em', __import__('datetime').datetime.now().isoformat())

        # Bloco de categorias (apenas as presentes nos produtos filtrados)
        cats_ids = {p.categoria_id for p in queryset}
        cats_el = ET.SubElement(root, 'categorias')
        for cat in Categoria.objects.filter(id__in=cats_ids):
            cat_el = ET.SubElement(cats_el, 'categoria')
            ET.SubElement(cat_el, 'id').text     = str(cat.id)
            ET.SubElement(cat_el, 'nome').text   = cat.nome
            ET.SubElement(cat_el, 'emoji').text  = cat.emoji

        # Bloco de produtos
        prods_el = ET.SubElement(root, 'produtos')
        for p in queryset:
            prod_el = ET.SubElement(prods_el, 'produto')
            ET.SubElement(prod_el, 'id').text          = str(p.id)
            ET.SubElement(prod_el, 'nome').text        = p.nome
            ET.SubElement(prod_el, 'descricao').text   = p.descricao
            ET.SubElement(prod_el, 'categoria_id').text = str(p.categoria_id)
            ET.SubElement(prod_el, 'categoria_nome').text = p.categoria.nome
            ET.SubElement(prod_el, 'emoji').text       = p.emoji
            ET.SubElement(prod_el, 'destaque').text    = 'true' if p.destaque else 'false'
            tags_el = ET.SubElement(prod_el, 'tags')
            for tag in p.get_tags_list():
                ET.SubElement(tags_el, 'tag').text = tag
            # Imagem base64 — incluída apenas se existir
            if p.imagem:
                ET.SubElement(prod_el, 'imagem').text = p.imagem
            else:
                ET.SubElement(prod_el, 'imagem').text = ''

        # Pretty-print
        xml_str = minidom.parseString(
            ET.tostring(root, encoding='unicode')
        ).toprettyxml(indent='  ', encoding=None)
        # toprettyxml adiciona <?xml ...?> no topo — manter
        xml_bytes = xml_str.encode('utf-8')

        response = HttpResponse(xml_bytes, content_type='application/xml; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="alpack_produtos.xml"'
        return response

    except Exception as e:
        logger.error(f"Erro ao exportar XML: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


# ✅ NOVO: Importar XML
@login_required
@csrf_protect
@require_http_methods(["POST"])
def api_importar_xml(request):
    """
    Recebe um arquivo XML via multipart/form-data (campo 'arquivo').
    Estratégia: upsert por nome do produto.
    Retorna JSON com resumo da operação.
    """
    try:
        arquivo = request.FILES.get('arquivo')
        if not arquivo:
            return JsonResponse({'success': False, 'error': 'Nenhum arquivo enviado.'})

        if not arquivo.name.endswith('.xml'):
            return JsonResponse({'success': False, 'error': 'O arquivo deve ser um .xml'})

        tree = ET.parse(arquivo)
        root = tree.getroot()

        criados   = 0
        atualizados = 0
        erros     = []

        for prod_el in root.findall('.//produto'):
            try:
                nome      = (prod_el.findtext('nome') or '').strip()
                descricao = (prod_el.findtext('descricao') or '').strip()
                cat_id    = prod_el.findtext('categoria_id')
                emoji     = (prod_el.findtext('emoji') or '📦').strip()
                destaque  = prod_el.findtext('destaque') == 'true'
                imagem    = (prod_el.findtext('imagem') or '').strip()
                tags      = ', '.join(
                    tag.text.strip()
                    for tag in prod_el.findall('.//tag')
                    if tag.text
                )

                if not nome or not descricao or not cat_id:
                    erros.append(f"Produto ignorado: dados incompletos — nome='{nome}'")
                    continue

                try:
                    categoria = Categoria.objects.get(id=int(cat_id))
                except Categoria.DoesNotExist:
                    # Tentar pelo nome da categoria
                    cat_nome = (prod_el.findtext('categoria_nome') or '').strip()
                    if cat_nome:
                        categoria, _ = Categoria.objects.get_or_create(
                            nome=cat_nome,
                            defaults={'emoji': '📦'}
                        )
                    else:
                        erros.append(f"Produto '{nome}': categoria {cat_id} não encontrada.")
                        continue

                produto, created = Produto.objects.update_or_create(
                    nome=nome,
                    defaults={
                        'descricao': descricao,
                        'categoria': categoria,
                        'emoji': emoji,
                        'destaque': destaque,
                        'imagem': imagem,
                        'tags': tags,
                    }
                )
                if created:
                    criados += 1
                else:
                    atualizados += 1

            except Exception as e:
                erros.append(f"Erro num produto: {str(e)}")

        return JsonResponse({
            'success': True,
            'criados': criados,
            'atualizados': atualizados,
            'erros': erros
        })

    except ET.ParseError as e:
        return JsonResponse({'success': False, 'error': f'XML inválido: {str(e)}'})
    except Exception as e:
        logger.error(f"Erro ao importar XML: {e}")
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
@csrf_protect
@require_http_methods(["POST"])
def api_salvar_produto(request):
    try:
        data = json.loads(request.body)
        nome      = escape(data.get('nome', '').strip())
        descricao = escape(data.get('descricao', '').strip())
        if not nome or not descricao:
            return JsonResponse({'success': False, 'error': 'Nome e descrição são obrigatórios'})
        categoria = Categoria.objects.get(id=int(data['categoria_id']))
        if data.get('id'):
            produto = Produto.objects.get(id=int(data['id']))
            produto.nome      = nome
            produto.descricao = descricao
            produto.categoria = categoria
            produto.emoji     = data.get('emoji', '📦')
            produto.imagem    = data.get('imagem', '')
            produto.destaque  = bool(data.get('destaque', False))
            produto.tags      = ', '.join([escape(t.strip()) for t in data.get('tags', [])])
            produto.save()
        else:
            produto = Produto.objects.create(
                nome=nome, descricao=descricao, categoria=categoria,
                emoji=data.get('emoji', '📦'), imagem=data.get('imagem', ''),
                destaque=bool(data.get('destaque', False)),
                tags=', '.join([escape(t.strip()) for t in data.get('tags', [])])
            )
        return JsonResponse({'success': True, 'id': produto.id})
    except Categoria.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Categoria não encontrada'})
    except ValueError as e:
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
        if not hasattr(request, 'body') or not request.body:
            return JsonResponse({'success': False, 'error': 'Dados não fornecidos'})
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({'success': False, 'error': 'Dados JSON inválidos'})

        nome  = data.get('nome', '').strip()
        emoji = data.get('emoji', '📦').strip()
        if not nome:
            return JsonResponse({'success': False, 'error': 'Nome é obrigatório'})
        if len(nome) > 100:
            return JsonResponse({'success': False, 'error': 'Nome muito longo (máximo 100 caracteres)'})
        if len(emoji) > 10:
            return JsonResponse({'success': False, 'error': 'Emoji muito longo (máximo 10 caracteres)'})

        nome  = escape(nome)
        emoji = escape(emoji)

        if data.get('id'):
            try:
                categoria = Categoria.objects.get(id=int(data['id']))
                categoria.nome  = nome
                categoria.emoji = emoji
                categoria.save()
            except Categoria.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Categoria não encontrada'})
            except ValueError:
                return JsonResponse({'success': False, 'error': 'ID de categoria inválido'})
        else:
            categoria = Categoria.objects.create(nome=nome, emoji=emoji)

        return JsonResponse({'success': True, 'id': categoria.id})

    except Exception as e:
        logger.error(f"Erro interno ao salvar categoria: {str(e)}", exc_info=True)
        if 'duplicate key value violates unique constraint' in str(e):
            try:
                fix_postgresql_sequences()
                return JsonResponse({'success': False, 'error': 'Erro de sequência detectado e corrigido. Tente novamente.'})
            except:
                pass
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'})


@login_required
@require_http_methods(["DELETE"])
def api_deletar_categoria(request, categoria_id):
    try:
        categoria = Categoria.objects.get(id=int(categoria_id))
        produtos_count = Produto.objects.filter(categoria=categoria).count()
        if produtos_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Não é possível excluir. Há {produtos_count} produto(s) usando esta categoria.'
            })
        categoria.delete()
        return JsonResponse({'success': True})
    except Categoria.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Categoria não encontrada'})
    except Exception as e:
        logger.error(f"Erro ao deletar categoria: {e}")
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'})