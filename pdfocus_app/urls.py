from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.main, name='main'),
    path('main/', views.main, name='main'),
    path('auth/', views.auth_view, name='auth'),
    path('upload/', views.upload_pdf, name='upload_pdf'),
    path('detailed/<int:id>', views.detailed, name='detailed'),
    path('save-note/', views.save_note, name='save_note'),
    path('delete-note/<int:id>/', views.delete_note, name='delete_note'),
    path('catalog/', views.catalog, name='catalog'),
    path('account/', views.account, name='account'),
    path('delete_pdf/<int:id>/', views.delete_pdf, name='delete_pdf'),
    path('publish/<int:id>/', views.publish_document, name='publish_document'),
    path('public/<int:id>/', views.public_detail, name='public_detail'),
    path('logout/', auth_views.LogoutView.as_view(next_page='auth'), name='logout'),
    path('password/change/', views.password_change, name='password_change'),
    path('password/change/done/', views.password_change_done, name='password_change_done'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
