from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.main, name='main'),
    path('main/', views.main, name='main'),
    path('auth/', views.auth, name='auth'),
    path('upload/', views.upload_pdf, name='upload_pdf'),
    path('detailed/<int:id>', views.get_detailed, name='detailed'),
    path('save-note/', views.save_note, name='save_note'),
    path('catalog/', views.catalog, name='catalog'),
    path('account/', views.account, name='account'),
    path('logout/', auth_views.LogoutView.as_view(next_page='auth'), name='logout'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
