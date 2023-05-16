from django.shortcuts import render

# Create your views here.
def index(request):
    return render(request, 'oral_message/index.html')

def index2(request):
    return render(request, 'oral_message/index2.html')