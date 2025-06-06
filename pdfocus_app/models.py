from django.db import models
from django.contrib.auth.models import User
import os
from .utils import extract_text_from_pdf


def user_pdf_path(instance, filename):
    return f'user_{instance.user.id}/pdfs/{filename}'

class PDFDocument(models.Model):
    DOC_TYPES = (
        ('book', 'Книга'),
        ('article', 'Статья'),
        ('report', 'Отчет'),
        ('other', 'Другое'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    title = models.CharField(max_length=128)
    authors = models.CharField(max_length=128)
    keywords = models.CharField(max_length=128)
    doc_type = models.CharField(max_length=20, choices=DOC_TYPES)
    theme = models.CharField(max_length=128)
    file = models.FileField(upload_to=user_pdf_path)
    extracted_text = models.TextField()
    upload_date = models.DateTimeField(auto_now_add=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)

    def __str__(self):
        return self.title


class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    document = models.ForeignKey(PDFDocument, on_delete=models.CASCADE)
    text = models.CharField(max_length=140)
    created_at = models.DateTimeField(auto_now_add=True)
    page_number = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.user.username} - {self.document.title}"