# Generated by Django 3.2.12 on 2022-10-14 13:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("maasserver", "0286_node_deploy_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="controllerinfo",
            name="vault_configured",
            field=models.BooleanField(default=False),
        ),
    ]
