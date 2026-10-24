from django.shortcuts import render

from rest_framework.generics import CreateAPIView #to handle the POST requests 
from rest_framework.generics import RetrieveUpdateAPIView #to handle the get and patch request for user profile 
from rest_framework.permissions import AllowAny

from .serializers import RegisterSerializer, ProfileSerializer

from rest_framework.permissions import IsAuthenticated


# Create your views here.

#we use CreateAPIView coz we only need to deal with the POST method & nothing else : 
class RegisterView(CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


#profile view in order to show the authenticated users their own profile : 
class ProfileView(RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user