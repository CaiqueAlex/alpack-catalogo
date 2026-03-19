from django.contrib import admin
from .models import Categoria, Produto

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'emoji', 'criado_em']
    search_fields = ['nome']

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'categoria', 'destaque', 'criado_em']
    list_filter = ['categoria', 'destaque', 'criado_em']
    search_fields = ['nome', 'descricao']
    list_editable = ['destaque']