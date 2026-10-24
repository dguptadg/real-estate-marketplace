from django.db import models

#AbstractUser is the model through which our user model will inherit to have the custom functionality : 
from django.contrib.auth.models import AbstractUser
# Create your models here.

#abstract user model with email = unique overridden which is not unique by default in User model 
class User(AbstractUser):

    email = models.EmailField(unique=True)

    def __str__(self):
        return self.username
