import os
import sys

# Добавляем путь к проекту в PYTHONPATH
current_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_path)

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PDFocus.settings')

application = get_wsgi_application() 