from django.urls import path
from . import views

app_name = "oral_message"

urlpatterns = [
    path('', views.index, name="index"),
    path('index2/', views.index2, name="index2"),
    path('api/om/', views.om_api, name='om_api')
]