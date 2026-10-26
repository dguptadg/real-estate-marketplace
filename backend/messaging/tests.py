from django.test import TestCase

# Create your tests here.

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from properties.models import Property
from .models import Conversation, Message


User = get_user_model()


class ConversationAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):

        cls.seller = User.objects.create_user(
            username="seller_test",
            email="seller_test@example.com",
            password="TestPass123!"
        )

        cls.buyer = User.objects.create_user(
            username="buyer_test",
            email="buyer_test@example.com",
            password="TestPass123!"
        )

        cls.outsider = User.objects.create_user(
            username="outsider_test",
            email="outsider_test@example.com",
            password="TestPass123!"
        )

        cls.property = Property.objects.create(
            seller=cls.seller,
            title="Test Apartment",
            description="Apartment for testing",
            property_type="apartment",
            listing_type="sale",
            price="5000000.00",
            city="Patiala",
            state="Punjab",
            address="Test Street",
            bedrooms=2,
            bathrooms=2,
            area_sqft="1000.00"
        )

        cls.list_url = reverse("conversation-list-create")

    def authenticate(self, user):
        token = RefreshToken.for_user(user).access_token

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

    def get_results(self, response):
        if isinstance(response.data, dict):
            return response.data["results"]

        return response.data

    def test_create_conversation(self):
        self.authenticate(self.buyer)

        response = self.client.post(
            self.list_url,
            {
                "property": self.property.id,
                "buyer": self.outsider.id,
                "seller": self.outsider.id
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

        conversation = Conversation.objects.get(
            id=response.data["id"]
        )

        self.assertEqual(
            conversation.buyer_id,
            self.buyer.id
        )

        self.assertEqual(
            conversation.seller_id,
            self.seller.id
        )

    def test_duplicate_conversation(self):
        self.authenticate(self.buyer)

        payload = {"property": self.property.id}

        first = self.client.post(
            self.list_url, payload, format="json"
        )

        second = self.client.post(
            self.list_url, payload, format="json"
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)

        self.assertEqual(
            first.data["id"],
            second.data["id"]
        )

        self.assertEqual(Conversation.objects.count(), 1)

    def test_seller_cannot_contact_self(self):
        self.authenticate(self.seller)

        response = self.client.post(
            self.list_url,
            {"property": self.property.id},
            format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_invalid_or_inactive_property(self):
        self.authenticate(self.buyer)

        response = self.client.post(
            self.list_url,
            {"property": 999999},
            format="json"
        )

        self.assertEqual(response.status_code, 400)

        self.property.is_active = False
        self.property.save(update_fields=["is_active"])

        response = self.client.post(
            self.list_url,
            {"property": self.property.id},
            format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_unauthenticated_access(self):
        conversation = Conversation.objects.create(
            property=self.property,
            buyer=self.buyer
        )

        detail_url = reverse(
            "conversation-detail",
            args=[conversation.id]
        )

        messages_url = reverse(
            "conversation-messages",
            args=[conversation.id]
        )

        self.client.credentials()

        for url in [self.list_url, detail_url, messages_url]:
            response = self.client.get(url)

            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED
            )

        response = self.client.post(
            self.list_url,
            {"property": self.property.id},
            format="json"
        )

        self.assertEqual(response.status_code, 401)

    def test_list_only_participant_conversations(self):

        buyer_conversation = Conversation.objects.create(
            property=self.property,
            buyer=self.buyer
        )

        outsider_conversation = Conversation.objects.create(
            property=self.property,
            buyer=self.outsider
        )

        self.authenticate(self.buyer)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)

        ids = [
            item["id"] for item in self.get_results(response)
        ]

        self.assertEqual(ids, [buyer_conversation.id])

        self.authenticate(self.seller)
        response = self.client.get(self.list_url)

        ids = {
            item["id"] for item in self.get_results(response)
        }

        self.assertEqual(
            ids,
            {buyer_conversation.id, outsider_conversation.id}
        )

    def test_conversation_detail_permissions(self):
        conversation = Conversation.objects.create(
            property=self.property,
            buyer=self.buyer
        )

        url = reverse(
            "conversation-detail",
            args=[conversation.id]
        )

        for user in [self.buyer, self.seller]:
            self.authenticate(user)

            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)

        self.authenticate(self.outsider)

        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_message_history_permissions_and_order(self):
        conversation = Conversation.objects.create(
            property=self.property,
            buyer=self.buyer
        )

        Message.objects.create(
            conversation=conversation,
            sender=self.buyer,
            text="Hello!"
        )

        Message.objects.create(
            conversation=conversation,
            sender=self.seller,
            text="Hello, how can I help?"
        )

        url = reverse(
            "conversation-messages",
            args=[conversation.id]
        )

        for user in [self.buyer, self.seller]:
            self.authenticate(user)

            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)

            messages = self.get_results(response)

            self.assertEqual(
                [message["text"] for message in messages],
                ["Hello!", "Hello, how can I help?"]
            )

        self.authenticate(self.outsider)

        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_message_creation(self):
        conversation = Conversation.objects.create(
            property=self.property,
            buyer=self.buyer
        )
    
        self.authenticate(self.buyer)
    
        url = reverse(
            "conversation-messages",
            args=[conversation.id]
        )
    
        response = self.client.post(
            url,
            {"text": "Hello from buyer"},
            format="json"
        )
    
        self.assertEqual(response.status_code, 201)
    
        message = Message.objects.get(id=response.data["id"])
    
        self.assertEqual(message.sender, self.buyer)
        self.assertEqual(message.conversation, conversation)
