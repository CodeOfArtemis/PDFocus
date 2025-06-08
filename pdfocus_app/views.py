from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from .forms import PDFUploadForm, NoteForm, CustomAuthenticationForm, CustomUserCreationForm
from .models import PDFDocument, Note, PDFPageText
from django.views.decorators.http import require_POST
from .utils import extract_text_from_pdf, extract_keywords_from_text, extract_theme_from_text, extract_text_by_pages


def auth_view(request):
    # Вкладка по умолчанию
    active_tab = 'login'
    
    # Инициализируем пустые формы
    login_form = CustomAuthenticationForm(request)
    register_form = CustomUserCreationForm()

    if request.method == 'POST':
        # Данные извлекаются и обрабатываются внутри соответствующих блоков

        # Обработка входа
        if 'login-submit' in request.POST:
            active_tab = 'login'
            
            # Создаем копию данных для модификации, чтобы сделать логин нечувствительным к регистру
            login_post_data = request.POST.copy()
            if 'username' in login_post_data:
                login_post_data['username'] = login_post_data['username'].lower()

            login_form = CustomAuthenticationForm(request, data=login_post_data)
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
            
            register_form = CustomUserCreationForm(data=register_post_data)
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
    return render(request, 'main.html', {'form': form})


@login_required
def catalog(request):
    # Показываем свои документы + опубликованные документы других пользователей
    user_documents = PDFDocument.objects.filter(user=request.user)
    published_documents = PDFDocument.objects.filter(is_published=True).exclude(user=request.user)
    
    # Объединяем и сортируем по дате загрузки
    all_documents = list(user_documents) + list(published_documents)
    all_documents.sort(key=lambda x: x.upload_date, reverse=True)
    
    return render(request, 'catalog.html', {'documents': all_documents})

@login_required
def detailed(request, id):
    pdf = get_object_or_404(PDFDocument, id=id, user=request.user)
    notes = Note.objects.filter(document=pdf).order_by('page_number')
    
    # Получаем текст по страницам (с обработкой ошибки для несуществующей таблицы)
    page_texts_dict = {}
    try:
        page_texts = PDFPageText.objects.filter(document=pdf).order_by('page_number')
        page_texts_dict = {pt.page_number: pt.text_content for pt in page_texts}
    except Exception as e:
        print(f"Error accessing PDFPageText: {e}")
        # Если таблица не существует, используем общий текст как fallback
        page_texts_dict = {1: pdf.extracted_text} if pdf.extracted_text else {}
    
    # Обновляем время последнего доступа
    pdf.save() # Простое сохранение обновит `last_accessed` из-за `auto_now=True`

    if request.method == 'POST':
        pdf.authors = request.POST.get('authors', '')
        pdf.doc_type = request.POST.get('doc_type', '')
        pdf.theme = request.POST.get('theme', '')
        pdf.keywords = request.POST.get('keywords', '')
        pdf.save()
        
        # Проверяем, был ли это AJAX-запрос
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Изменения сохранены успешно!'
            })
        else:
            messages.success(request, 'Изменения сохранены успешно!')
            return redirect('detailed', id=pdf.id)

    return render(request, 'detail.html', {
        'pdf': pdf, 
        'notes': notes,
        'page_texts': page_texts_dict
    })

@login_required
def account(request):
    recent_documents = PDFDocument.objects.filter(user=request.user).order_by('-last_accessed')[:100]
    recent_notes = Note.objects.filter(user=request.user).order_by('-created_at')[:100]
    return render(request, 'account.html', {
        'documents': recent_documents,
        'notes': recent_notes
    })


@login_required
def upload_pdf(request):
    if request.method == 'POST':
        try:
            # Создаем данные для формы
            post_data = {
                'title': request.FILES['file'].name if 'title' not in request.POST else request.POST['title'],
                'doc_type': request.POST.get('doc_type', 'other')
            }
            
            # Создаем форму с данными и файлом
            form = PDFUploadForm(post_data, request.FILES)
            
            if form.is_valid():
                pdf = form.save(commit=False)
                pdf.user = request.user
                
                # Автоматически устанавливаем автора
                if request.user.get_full_name():
                    pdf.authors = request.user.get_full_name()
                else:
                    pdf.authors = request.user.username

                # Извлекаем текст и метаданные
                pdf.extracted_text = extract_text_from_pdf(pdf.file)
                pdf.keywords = extract_keywords_from_text(pdf.extracted_text)
                # pdf.theme остается пустым для ручного заполнения
                
                # Сохраняем документ
                pdf.save()
                
                # Извлекаем и сохраняем текст по страницам
                pages_text = extract_text_by_pages(pdf.file)
                for page_num, page_text in pages_text.items():
                    PDFPageText.objects.create(
                        document=pdf,
                        page_number=page_num,
                        text_content=page_text
                    )
                
                response_data = {
                    'success': True,
                    'file_url': pdf.file.url,
                    'document_id': pdf.id
                }
                print("Response data:", response_data)
                return JsonResponse(response_data)
            else:
                print("Form errors:", form.errors)
                return JsonResponse({
                    'success': False,
                    'error': 'Ошибка валидации формы',
                    'details': form.errors
                }, status=400)
                
        except Exception as e:
            print("Error processing upload:", str(e))
            return JsonResponse({
                'success': False,
                'error': 'Ошибка при обработке файла',
                'details': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Метод не поддерживается'
    }, status=405)


@login_required
def delete_pdf(request, id):
    document = get_object_or_404(PDFDocument, id=id)
    
    # Определяем, откуда пришел запрос
    referer = request.META.get('HTTP_REFERER', '')
    redirect_url = 'account' if '/account/' in referer else 'catalog'
    
    # Проверяем, что текущий пользователь является владельцем документа
    if document.user != request.user:
        messages.error(request, "У вас нет прав для удаления этого документа.")
        return redirect(redirect_url)

    if request.method == 'POST':
        # Удаляем связанный файл
        document.file.delete(save=False) # save=False, т.к. мы удалим объект целиком
        
        # Удаляем объект из базы данных
        document.delete()
        
        messages.success(request, f'Документ "{document.title}" был успешно удален.')
        return redirect(redirect_url)
    
    # Если это не POST-запрос, просто перенаправляем обратно
    return redirect(redirect_url)


def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return redirect('auth')


@login_required
@require_POST
def save_note(request):
    form = NoteForm(request.POST)

    if form.is_valid():
        note = form.save(commit=False)
        note.user = request.user
        document_id = request.POST.get('document_id')
        if document_id:
            note.document = get_object_or_404(PDFDocument, id=document_id, user=request.user)
            note.save()

        # Проверяем, был ли это AJAX-запрос или обычная отправка формы
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'note': {
                    'id': note.id,
                    'text': note.text,
                    'page_number': note.page_number,
                    'created_at': note.created_at.strftime("%d.%m.%Y %H:%M")
                }
            })
        else:
            messages.success(request, 'Заметка успешно добавлена.')
            return redirect('detailed', id=document_id)

    # Если форма невалидна, возвращаемся назад с сообщением об ошибке
    # (здесь можно сделать более сложную обработку, но для начала так)
    messages.error(request, 'Ошибка при добавлении заметки.')
    return redirect('detailed', id=request.POST.get('document_id'))


@login_required
def delete_note(request, id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'}, status=405)
    
    try:
        note = get_object_or_404(Note, id=id, user=request.user)
        
        # Проверяем, был ли это AJAX-запрос
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            note.delete()
            return JsonResponse({
                'success': True,
                'message': 'Заметка успешно удалена.'
            })
        else:
            # Для обычных запросов
            document_id = note.document.id
            note.delete()
            messages.success(request, 'Заметка успешно удалена.')
            return redirect('detailed', id=document_id)
    except Exception as e:
        print(f"Error deleting note {id}: {e}")
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
        else:
            messages.error(request, f'Ошибка при удалении заметки: {e}')
            return redirect('detailed', id=request.POST.get('document_id', '/catalog/'))


@login_required
def publish_document(request, id):
    """Toggle publish status of a document"""
    document = get_object_or_404(PDFDocument, id=id, user=request.user)
    
    if request.method == 'POST':
        # Переключаем статус публикации
        document.is_published = not document.is_published
        document.save()
        
        # AJAX-ответ
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'is_published': document.is_published,
                'message': 'Документ опубликован!' if document.is_published else 'Документ скрыт!'
            })
    
    # Если не AJAX, редирект назад
    return redirect('detailed', id=document.id)


@login_required  
def public_detail(request, id):
    """Просмотр опубликованного документа (только чтение)"""
    pdf = get_object_or_404(PDFDocument, id=id, is_published=True)
    
    # Получаем текст по страницам
    page_texts_dict = {}
    try:
        page_texts = PDFPageText.objects.filter(document=pdf).order_by('page_number')
        page_texts_dict = {pt.page_number: pt.text_content for pt in page_texts}
    except Exception as e:
        page_texts_dict = {1: pdf.extracted_text} if pdf.extracted_text else {}
    
    return render(request, 'public_detail.html', {
        'pdf': pdf,
        'page_texts': page_texts_dict,
        'is_readonly': True
    })
