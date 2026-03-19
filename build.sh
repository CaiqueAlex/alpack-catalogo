#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py makemigrations
python manage.py migrate

python manage.py shell << EOF
from django.contrib.auth.models import User
import os
username = os.getenv('ADMIN_USERNAME', 'admin')
email = os.getenv('ADMIN_EMAIL', 'admin@alpack.com')
password = os.getenv('ADMIN_PASSWORD')
if password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"Superuser '{username}' criado!")
else:
    print("Superuser já existe ou senha não definida.")
EOF