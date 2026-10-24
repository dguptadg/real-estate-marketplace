from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RegistrationTests(APITestCase):

    def setUp(self):
        self.url = reverse('register')

        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'StrongPassword@123',
            'first_name': 'Test',
            'last_name': 'User'
        }

    def test_successful_registration(self):
        response = self.client.post(
            self.url,
            self.user_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

        user = User.objects.get(username='testuser')

        self.assertTrue(user.check_password('StrongPassword@123'))
        self.assertNotIn('password', response.data)

    def test_duplicate_email(self):
        User.objects.create_user(
            username='existinguser',
            email='test@example.com',
            password='ExistingPassword@123'
        )

        response = self.client.post(
            self.url,
            self.user_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_weak_password(self):
        self.user_data['password'] = '123'

        response = self.client.post(
            self.url,
            self.user_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

class JWTLoginTests(APITestCase):

    def setUp(self):
        self.url = reverse('login')

        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='StrongPassword@123'
        )

    def test_successful_login(self):
        response = self.client.post(
            self.url,
            {
                'username': 'testuser',
                'password': 'StrongPassword@123'
            },
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_invalid_password(self):
        response = self.client.post(
            self.url,
            {
                'username': 'testuser',
                'password': 'WrongPassword123'
            },
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

class JWTRefreshTests(APITestCase):

    def setUp(self):
        self.login_url = reverse('login')
        self.refresh_url = reverse('token_refresh')

        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='StrongPassword@123'
        )

        response = self.client.post(
            self.login_url,
            {
                'username': 'testuser',
                'password': 'StrongPassword@123'
            },
            format='json'
        )

        self.refresh_token = response.data['refresh']

    def test_successful_token_refresh(self):
        response = self.client.post(
            self.refresh_url,
            {'refresh': self.refresh_token},
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)

    def test_invalid_refresh_token(self):
        response = self.client.post(
            self.refresh_url,
            {'refresh': 'invalid_token'},
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

class ProfileTests(APITestCase):

    def setUp(self):
        self.url = reverse('profile')

        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='StrongPassword@123',
            first_name='Test',
            last_name='User'
        )

        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.access_token}'
        )

    def test_authenticated_profile_get(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertNotIn('password', response.data)

    def test_unauthenticated_profile_get(self):
        self.client.credentials()

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

    def test_successful_profile_update(self):
        response = self.client.patch(
            self.url,
            {'first_name': 'Updated'},
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.user.refresh_from_db()

        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'User')

    def test_unauthenticated_profile_update(self):
        self.client.credentials()

        response = self.client.patch(
            self.url,
            {'first_name': 'Hacker'},
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

    def test_email_cannot_be_updated(self):
        response = self.client.patch(
            self.url,
            {'email': 'changed@example.com'},
            format='json'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.user.refresh_from_db()

        self.assertEqual(
            self.user.email,
            'test@example.com'
        )