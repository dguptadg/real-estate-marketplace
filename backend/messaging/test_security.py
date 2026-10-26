
from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from properties.models import Property
from messaging.models import Conversation, Message


User = get_user_model()


class MessagingSecurityTests(APITestCase):

    @classmethod
    def setUpTestData(cls):
        cls.seller = User.objects.create_user(
            username="seller_security",
            email="seller_security@example.com",
            password="TestPassword123!"
        )

        cls.buyer = User.objects.create_user(
            username="buyer_security",
            email="buyer_security@example.com",
            password="TestPassword123!"
        )

        cls.outsider = User.objects.create_user(
            username="outsider_security",
            email="outsider_security@example.com",
            password="TestPassword123!"
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

    def authenticate(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

    def create_conversation(self):
        return Conversation.objects.create(
            property=self.property,
            buyer=self.buyer
        )

    def message_url(self, conversation):
        return reverse(
            "conversation-messages",
            args=[conversation.id]
        )

    def results(self, response):
        if isinstance(response.data, dict):
            return response.data["results"]
        return response.data

    def test_conversation_creation(self):
        self.authenticate(self.buyer)

        response = self.client.post(
            reverse("conversation-list-create"),
            {
                "property": self.property.id,
                "buyer": self.outsider.id,
                "seller": self.outsider.id
            },
            format="json"
        )

        self.assertEqual(response.status_code, 201)

        conversation = Conversation.objects.get(
            id=response.data["id"]
        )

        self.assertEqual(conversation.buyer, self.buyer)
        self.assertEqual(conversation.seller, self.seller)

    def test_duplicate_conversation(self):
        self.authenticate(self.buyer)
        url = reverse("conversation-list-create")
        payload = {"property": self.property.id}

        first = self.client.post(url, payload, format="json")
        second = self.client.post(url, payload, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_seller_cannot_contact_self(self):
        self.authenticate(self.seller)

        response = self.client.post(
            reverse("conversation-list-create"),
            {"property": self.property.id},
            format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_private_conversation_access(self):
        conversation = self.create_conversation()

        url = reverse(
            "conversation-detail",
            args=[conversation.id]
        )

        for user in [self.buyer, self.seller]:
            self.authenticate(user)
            self.assertEqual(
                self.client.get(url).status_code, 200
            )

        self.authenticate(self.outsider)
        self.assertEqual(
            self.client.get(url).status_code, 404
        )

    def test_outsider_cannot_send_messages(self):
        conversation = self.create_conversation()
        self.authenticate(self.outsider)

        response = self.client.post(
            self.message_url(conversation),
            {"text": "Unauthorized message"},
            format="json"
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Message.objects.count(), 0)

    def test_sender_cannot_be_impersonated(self):
        conversation = self.create_conversation()
        self.authenticate(self.buyer)

        response = self.client.post(
            self.message_url(conversation),
            {
                "text": "Hello!",
                "sender": self.outsider.id,
                "conversation": 99999
            },
            format="json"
        )

        self.assertEqual(response.status_code, 201)

        message = Message.objects.get(id=response.data["id"])

        self.assertEqual(message.sender, self.buyer)
        self.assertEqual(message.conversation, conversation)

    def test_invalid_messages(self):
        conversation = self.create_conversation()
        self.authenticate(self.buyer)

        url = self.message_url(conversation)

        for text in ["", "    ", "A" * 2001]:
            response = self.client.post(
                url,
                {"text": text},
                format="json"
            )

            self.assertEqual(response.status_code, 400)

        self.assertEqual(Message.objects.count(), 0)

    def test_message_history(self):
        conversation = self.create_conversation()

        Message.objects.create(
            conversation=conversation,
            sender=self.buyer,
            text="First message"
        )

        Message.objects.create(
            conversation=conversation,
            sender=self.seller,
            text="Second message"
        )

        self.authenticate(self.buyer)

        response = self.client.get(
            self.message_url(conversation)
        )

        self.assertEqual(response.status_code, 200)

        texts = [
            item["text"] for item in self.results(response)
        ]

        self.assertEqual(
            texts,
            ["First message", "Second message"]
        )

    def test_incremental_polling(self):
        conversation = self.create_conversation()

        first = Message.objects.create(
            conversation=conversation,
            sender=self.buyer,
            text="Old message"
        )

        second = Message.objects.create(
            conversation=conversation,
            sender=self.seller,
            text="New message"
        )

        self.authenticate(self.buyer)

        url = self.message_url(conversation)

        response = self.client.get(
            url,
            {"after_id": first.id}
        )

        self.assertEqual(response.status_code, 200)

        ids = [
            item["id"] for item in self.results(response)
        ]

        self.assertEqual(ids, [second.id])

        for invalid in ["abc", "-1"]:
            response = self.client.get(
                url,
                {"after_id": invalid}
            )
            self.assertEqual(response.status_code, 400)

    def test_unauthenticated_access(self):
        conversation = self.create_conversation()

        self.client.credentials()

        urls = [
            reverse("conversation-list-create"),
            reverse(
                "conversation-detail",
                args=[conversation.id]
            ),
            self.message_url(conversation)
        ]

        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 401)

        response = self.client.post(
            self.message_url(conversation),
            {"text": "Hello"},
            format="json"
        )

        self.assertEqual(response.status_code, 401)
