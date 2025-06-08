# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pdfocus_app', '0006_pdfpagetext'),
    ]

    operations = [
        migrations.AddField(
            model_name='pdfdocument',
            name='is_published',
            field=models.BooleanField(default=False),
        ),
    ] 