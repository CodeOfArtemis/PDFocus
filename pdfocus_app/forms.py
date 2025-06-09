from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import PDFDocument, Note


class CustomAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Имя пользователя'})
        self.fields['password'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Пароль'})
        self.error_messages['invalid_login'] = 'Неверное имя пользователя или пароль.'

class CustomUserCreationForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            field.widget.attrs.update({'class': 'form-control'})
    
    class Meta(UserCreationForm.Meta):
        fields = ('username',)


class PDFUploadForm(forms.ModelForm):
    class Meta:
        model = PDFDocument
        fields = ['title', 'file', 'doc_type', 'authors', 'theme', 'keywords']
        widgets = {
            'doc_type': forms.Select(attrs={'class': 'form-control'}),
            'file': forms.FileInput(attrs={'accept': '.pdf'}),
            'authors': forms.TextInput(attrs={'class': 'form-control'}),
            'theme': forms.TextInput(attrs={'class': 'form-control'}),
            'keywords': forms.TextInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'doc_type': 'Тип документа',
            'theme': 'Тема документа',
            'authors': 'Авторы',
            'keywords': 'Ключевые слова',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Делаем все поля необязательными, кроме title и file
        for field in self.fields:
            if field not in ['title', 'file']:
                self.fields[field].required = False


class NoteForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = ['text', 'page_number']
        widgets = {
            'text': forms.Textarea(attrs={'rows': 3}),
            'page_number': forms.NumberInput(attrs={'min': 1}),
        }
