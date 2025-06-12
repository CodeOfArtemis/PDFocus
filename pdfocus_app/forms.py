from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
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


class CustomPasswordChangeForm(forms.Form):
    old_password = forms.CharField(
        label='Текущий пароль',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Введите текущий пароль'})
    )
    new_password1 = forms.CharField(
        label='Новый пароль',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Введите новый пароль'})
    )
    new_password2 = forms.CharField(
        label='Подтверждение пароля',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Повторите новый пароль'})
    )

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_old_password(self):
        old_password = self.cleaned_data.get('old_password')
        if not self.user.check_password(old_password):
            raise forms.ValidationError('Неверный текущий пароль')
        return old_password

    def clean_new_password1(self):
        password1 = self.cleaned_data.get('new_password1')
        if password1:
            try:
                password_validation.validate_password(password1, self.user)
            except ValidationError as error:
                raise forms.ValidationError(error)
        return password1

    def clean_new_password2(self):
        password1 = self.cleaned_data.get('new_password1')
        password2 = self.cleaned_data.get('new_password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('Пароли не совпадают')
        return password2

    def save(self, commit=True):
        self.user.set_password(self.cleaned_data['new_password1'])
        if commit:
            self.user.save()
        return self.user
