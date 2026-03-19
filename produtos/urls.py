# produtos/urls.py
from django.urls import path
from . import views

app_name = 'produtos'

urlpatterns = [
    path('', views.catalogo, name='catalogo'),
    path('backend/', views.backend, name='backend'),
    path('api/produtos/', views.api_produtos, name='api_produtos'),
    path('api/salvar-produto/', views.api_salvar_produto, name='api_salvar_produto'),
    path('api/deletar-produto/<int:produto_id>/', views.api_deletar_produto, name='api_deletar_produto'),
    path('api/salvar-categoria/', views.api_salvar_categoria, name='api_salvar_categoria'),
    path('api/deletar-categoria/<int:categoria_id>/', views.api_deletar_categoria, name='api_deletar_categoria'),
]