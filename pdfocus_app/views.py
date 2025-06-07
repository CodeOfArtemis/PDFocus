from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from .forms import PDFUploadForm, NoteForm
from .models import PDFDocument, Note
from django.views.decorators.http import require_POST
from .utils import extract_text_from_pdf, extract_keywords_from_text, extract_theme_from_text


def auth_view(request):
    # Вкладка по умолчанию
    active_tab = 'login'
    
    # Инициализируем пустые формы
    login_form = AuthenticationForm(request)
    register_form = UserCreationForm()

    if request.method == 'POST':
        # Данные извлекаются и обрабатываются внутри соответствующих блоков

        # Обработка входа
        if 'login-submit' in request.POST:
            active_tab = 'login'
            # Используем request.POST напрямую, AuthenticationForm сама разберется
            login_form = AuthenticationForm(request, data=request.POST)
            if login_form.is_valid():
                user = login_form.get_user()
                login(request, user)
                # 'next' теперь тоже берем напрямую из POST
                return redirect(request.POST.get('next') or 'main')

        # Обработка регистрации
        elif 'register-submit' in request.POST:
            active_tab = 'register'
            # Создаем копию данных для модификации
            register_post_data = request.POST.copy()
            if 'username' in register_post_data:
                register_post_data['username'] = register_post_data['username'].lower()
            
            register_form = UserCreationForm(data=register_post_data)
            if register_form.is_valid():
                user = register_form.save()
                login(request, user)
                return redirect('main')

    context = {
        'login_form': login_form,
        'register_form': register_form,
        'active_tab': active_tab,
        # 'next' для GET-запроса, чтобы передать его в POST
        'next': request.GET.get('next', ''),
    }
    return render(request, 'auth.html', context)


@login_required
def main(request):
    form = PDFUploadForm()
    recent_notes = Note.objects.filter(user=request.user).order_by('-created_at')[:5]
    return render(request, 'main.html', {'form': form, 'recent_notes': recent_notes})


@login_required
def catalog(request):
    documents = PDFDocument.objects.filter(user=request.user)
    return render(request, 'catalog.html', {'documents': documents})

@login_required
def detailed(request, pk):
    pdf = get_object_or_404(PDFDocument, pk=pk)

    if request.method == 'POST':
        pdf.authors = request.POST.get('authors', '')
        pdf.doc_type = request.POST.get('doc_type', '')
        pdf.theme = request.POST.get('theme', '')
        pdf.keywords = request.POST.get('keywords', '')
        pdf.save()
        messages.success(request, 'Изменения сохранены успешно!')
        return redirect('detailed', pk=pdf.id)

    return render(request, 'detail.html', {'pdf': pdf})
@login_required
def account(request):
    documents = PDFDocument.objects.filter(user=request.user)
    notes = Note.objects.filter(user=request.user)
    return render(request, 'account.html', {
        'documents': documents,
        'notes': notes
    })


@login_required
def upload_pdf(request):
    if request.method == 'POST':
        form = PDFUploadForm(request.POST, request.FILES)
        if form.is_valid():
            pdf = form.save(commit=False)
            pdf.user = request.user
            
            # Автоматически устанавливаем автора
            if request.user.get_full_name():
                pdf.authors = request.user.get_full_name()
            else:
                pdf.authors = request.user.username

            pdf.extracted_text = extract_text_from_pdf(pdf.file)
            pdf.keywords = extract_keywords_from_text(pdf.extracted_text)
            pdf.theme = extract_theme_from_text(pdf.extracted_text)
            pdf.save()
            return JsonResponse({
                'success': True,
                'file_url': pdf.file.url
            }, content_type="application/json")
    else:
        form = PDFUploadForm()
    return redirect('main')


@login_required
def get_detailed(request, id):
    pdf = PDFDocument.objects.get(id=id)
    return render(request, 'detail.html', context={'pdf': pdf})


@login_required
@require_POST
def save_note(request):
    form = NoteForm(request.POST)

    if form.is_valid():
        try:
            note = form.save(commit=False)
            note.user = request.user

            # Получаем связанный PDF документ
            document_id = request.POST.get('document_id')
            if document_id:
                note.document = PDFDocument.objects.get(id=document_id, user=request.user)

            note.save()

            return JsonResponse({
                'success': True,
                'note': {
                    'text': note.text,
                    'page_number': note.page_number,
                    'created_at': note.created_at.strftime("%d.%m.%Y %H:%M")
                }
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Ошибка сохранения заметки: {str(e)}'
            }, status=500)
    return None


def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return redirect('auth')
