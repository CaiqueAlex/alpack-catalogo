#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --noinput
python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py fix_sequences

# Criar superuser com credenciais específicas
python manage.py shell << EOF
from django.contrib.auth.models import User
import os

# Suas credenciais específicas
username = 'admin'
email = 'admin@alpack.com'
password = 'AdminFP*MFC*0808'

# Deletar usuário existente se necessário
if User.objects.filter(username=username).exists():
    User.objects.filter(username=username).delete()
    print(f"Usuário existente '{username}' removido!")

# Criar novo superuser
User.objects.create_superuser(username, email, password)
print(f"✅ Superuser '{username}' criado com sucesso!")
print(f"📧 Email: {email}")
print("🔑 Senha configurada!")
EOF