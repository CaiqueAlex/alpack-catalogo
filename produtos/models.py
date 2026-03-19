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