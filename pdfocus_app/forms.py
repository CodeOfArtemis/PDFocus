from django import forms
from .models import PDFDocument, Note


class PDFUploadForm(forms.ModelForm):
    class Meta:
        model = PDFDocument
        fields = ['title', 'file']
        widgets = {
            'doc_type': forms.Select(attrs={'class': 'form-control'}),
            'file': forms.FileInput(attrs={'accept': '.pdf'}),
        }
        labels = {
            'doc_type': 'Тип документа',
            'theme': 'Тема документа',
        }


class NoteForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = ['text', 'page_number']
        widgets = {
            'text': forms.Textarea(attrs={'rows': 3}),
            'page_number': forms.NumberInput(attrs={'min': 1}),
        }
