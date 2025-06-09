from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from difflib import SequenceMatcher
import re

class CustomMinimumLengthValidator:
    """
    Проверяет, что пароль имеет минимальную длину.
    """
    def __init__(self, min_length=8):
        self.min_length = min_length

    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                f"Этот пароль слишком короткий. Он должен содержать как минимум {self.min_length} символов.",
                code='password_too_short',
            )

    def get_help_text(self):
        return f"Ваш пароль должен содержать как минимум {self.min_length} символов."

class CustomCommonPasswordValidator:
    """
    Проверяет, что пароль не является слишком распространённым.
    """
    def validate(self, password, user=None):
        # Этот валидатор использует внутренний список Django.
        # Мы просто вызываем оригинальную логику, но перехватываем ошибку, чтобы заменить сообщение.
        from django.contrib.auth.password_validation import CommonPasswordValidator as DjangoCommonPasswordValidator
        try:
            DjangoCommonPasswordValidator().validate(password, user)
        except ValidationError:
            raise ValidationError(
                "Этот пароль слишком распространён.",
                code='password_too_common',
            )

    def get_help_text(self):
        return "Ваш пароль не может быть одним из самых распространённых."

class CustomNumericPasswordValidator:
    """
    Проверяет, что пароль не состоит только из цифр.
    """
    def validate(self, password, user=None):
        if password.isdigit():
            raise ValidationError(
                "Пароль не может состоять только из цифр.",
                code='password_entirely_numeric',
            )

    def get_help_text(self):
        return "Ваш пароль не может состоять только из цифр."

class CustomUserAttributeSimilarityValidator:
    """
    Проверяет, что пароль не слишком похож на личные данные пользователя.
    """
    def __init__(self, user_attributes=('username', 'first_name', 'last_name', 'email')):
        self.user_attributes = user_attributes

    def validate(self, password, user=None):
        if not user:
            return

        for attribute_name in self.user_attributes:
            value = getattr(user, attribute_name, None)
            if not value or not isinstance(value, str):
                continue
            
            # Используем SequenceMatcher для сравнения схожести
            if SequenceMatcher(None, password.lower(), value.lower()).quick_ratio() >= 0.7:
                raise ValidationError(
                    "Пароль слишком похож на вашу личную информацию (имя пользователя, email и т.д.).",
                    code='password_too_similar',
                )

    def get_help_text(self):
        return "Ваш пароль не должен быть слишком похож на вашу личную информацию." 