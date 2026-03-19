from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Corrige as sequências do PostgreSQL após inserções manuais'

    def handle(self, *args, **options):
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
            
        self.stdout.write(
            self.style.SUCCESS('✅ Sequências corrigidas com sucesso!')
        )