from django.urls import path
from . import views

app_name = "oral_message"

urlpatterns = [
    path('', views.index, name="index"),
]