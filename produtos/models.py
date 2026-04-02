from django.db import models

class Categoria(models.Model):
    nome = models.CharField(max_length=100)
    emoji = models.CharField(max_length=10)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.emoji} {self.nome}"
    
    class Meta:
        verbose_name_plural = "Categorias"

class Produto(models.Model):
    nome = models.CharField(max_length=200)
    descricao = models.TextField()
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10, default="📦")
    imagem = models.TextField(blank=True, help_text="Base64 da imagem")
    destaque = models.BooleanField(default=False)
    tags = models.TextField(help_text="Tags separadas por vírgula")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.nome
    
    def get_tags_list(self):
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
    
    class Meta:
        verbose_name_plural = "Produtos"
        ordering = ['-destaque', 'nome']

class ConfiguracaoEmpresa(models.Model):
    nome = models.CharField(max_length=100, default="Alpack Distribuidora")
    whatsapp = models.CharField(max_length=20, default="551434340001")
    email = models.CharField(max_length=100, default="comercial@grupack.com.br")
    endereco = models.CharField(max_length=255, default="Rua 15 de Novembro, N 1206 - Marilia - SP")
    horario = models.CharField(max_length=100, default="Segunda à Sexta: 8h às 18h")
    mensagem_padrao = models.TextField(default="Olá! Vi o produto {produto} no catálogo.")
    
    # Campos do Header
    header_titulo = models.CharField(max_length=200, default="📦 Catálogo de Produtos")
    header_subtitulo = models.CharField(max_length=255, default="Qualidade e agilidade na entrega")

    @classmethod
    def get_config(cls):
        # Pega a primeira configuração ou cria uma se não existir
        config, _ = cls.objects.get_or_create(id=1)
        return config

    @classmethod
    def set_config(cls, dados):
        config = cls.get_config()
        # Mapeia o que vem do JSON para os campos do banco
        config.nome = dados.get('nome', config.nome)
        config.whatsapp = dados.get('whatsapp', config.whatsapp)
        config.email = dados.get('email', config.email)
        config.endereco = dados.get('endereco', config.endereco)
        config.horario = dados.get('horario', config.horario)
        config.mensagem_padrao = dados.get('mensagem_padrao', config.mensagem_padrao)
        config.header_titulo = dados.get('header_titulo', config.header_titulo)
        config.header_subtitulo = dados.get('header_subtitulo', config.header_subtitulo)
        config.save()
        return config

    def __str__(self):
        return "Configurações da Empresa"