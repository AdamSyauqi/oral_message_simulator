from django.urls import path
from . import views

app_name = "oral_message"

urlpatterns = [
    path('', views.index2),
    path('api/om/', views.om_api, name='om_api')
]