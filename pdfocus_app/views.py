from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from .forms import PDFUploadForm, NoteForm
from .models import PDFDocument, Note
from django.views.decorators.http import require_POST
from .utils import extract_text_from_pdf


def auth(request):
    # Если пользователь уже авторизован - перенаправляем
    if request.user.is_authenticated:
        return redirect(request.POST.get('next') or 'main')

    # Инициализация форм
    login_form = AuthenticationForm(request, data=request.POST or None)
    register_form = UserCreationForm(request.POST or None)

    if request.method == 'POST':
        # Обработка входа
        if 'login-submit' in request.POST and login_form.is_valid():
            user = login_form.get_user()
            login(request, user)
            return redirect(request.POST.get('next') or 'main')

        # Обработка регистрации
        if 'register-submit' in request.POST and register_form.is_valid():
            user = register_form.save()
            login(request, user)
            return redirect('main')

    context = {
        'login_form': login_form,
        'register_form': register_form,
        'next': request.GET.get('next', '')  # Передаем параметр next в шаблон
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
            pdf.extracted_text = extract_text_from_pdf(pdf.file)
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
