from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()

#serializer for registration process : 
class RegisterSerializer(serializers.ModelSerializer):
    #to validate the password field : 
    password = serializers.CharField(
        write_only = True,
        validators = [validate_password]
    )

    class Meta : 
        model = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'password',
            'email',
            'username'
        ]

        read_only_fields = ['id']

    #overridden create function to ensure password hashing while saving data to DB 
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


#serializer for profile view for the authenticated user : 
class ProfileSerializer(serializers.ModelSerializer):
    class Meta : 
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email'
        ]
        read_only_fields = ['id', 'username', 'email']