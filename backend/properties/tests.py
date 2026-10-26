from django.test import TestCase

# Create your tests here.

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Property

import os
import tempfile
from io import BytesIO

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from .models import PropertyImage



User = get_user_model()


class PropertyAPITests(APITestCase):

    def setUp(self):
        # Create two users to test ownership permissions
        self.seller = User.objects.create_user(
            username="seller1",
            email="seller1@example.com",
            password="TestPass123!"
        )

        self.other_user = User.objects.create_user(
            username="buyer1",
            email="buyer1@example.com",
            password="TestPass123!"
        )

        self.list_url = reverse("property-list-create")

    def authenticate(self, user):
        # Generate a valid JWT access token
        token = RefreshToken.for_user(user).access_token

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

    def property_data(self, **overrides):
        data = {
            "title": "3 BHK Apartment",
            "description": "Spacious apartment",
            "property_type": "apartment",
            "listing_type": "rent",
            "price": "25000.00",
            "rent_period": "monthly",
            "city": "Gurugram",
            "state": "Haryana",
            "address": "Sector 56",
            "bedrooms": 3,
            "bathrooms": 2,
            "area_sqft": "1500.00"
        }

        data.update(overrides)
        return data

    def create_property(self, **overrides):
        data = self.property_data(**overrides)

        return Property.objects.create(
            seller=self.seller,
            **data
        )

    # TEST 1: Guests cannot access property APIs
    def test_authentication_required(self):
        prop = self.create_property()

        detail_url = reverse(
            "property-detail", kwargs={"pk": prop.id}
        )

        self.assertEqual(
            self.client.get(self.list_url).status_code,
            401
        )

        self.assertEqual(
            self.client.get(detail_url).status_code,
            401
        )

        self.assertEqual(
            self.client.post(
                self.list_url, self.property_data()
            ).status_code,
            401
        )

    # TEST 2: Property creation assigns correct seller
    def test_property_creation(self):
        self.authenticate(self.seller)

        data = self.property_data(
            seller=self.other_user.id,
            is_active=False
        )

        response = self.client.post(
            self.list_url, data, format="json"
        )

        self.assertEqual(response.status_code, 201)

        prop = Property.objects.get(
            pk=response.data["id"]
        )

        self.assertEqual(prop.seller, self.seller)
        self.assertTrue(prop.is_active)

    # TEST 3: Only active properties appear in listings
    def test_active_property_listing(self):
        active = self.create_property()
        self.create_property(is_active=False)

        self.authenticate(self.other_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

        self.assertEqual(
            response.data["results"][0]["id"],
            active.id
        )

    # TEST 4: Archived properties cannot be retrieved
    def test_property_detail(self):
        prop = self.create_property()

        url = reverse(
            "property-detail", kwargs={"pk": prop.id}
        )

        self.authenticate(self.other_user)

        self.assertEqual(
            self.client.get(url).status_code, 200
        )

        prop.is_active = False
        prop.save()

        self.assertEqual(
            self.client.get(url).status_code, 404
        )

    # TEST 5: Owner can update the property
    def test_owner_can_update(self):
        prop = self.create_property()

        self.authenticate(self.seller)

        url = reverse(
            "property-detail", kwargs={"pk": prop.id}
        )

        response = self.client.patch(
            url,
            {"price": "30000.00"},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        prop.refresh_from_db()
        self.assertEqual(float(prop.price), 30000.00)

    # TEST 6: Another user cannot update the property
    def test_non_owner_cannot_update(self):
        prop = self.create_property()

        self.authenticate(self.other_user)

        url = reverse(
            "property-detail", kwargs={"pk": prop.id}
        )

        response = self.client.patch(
            url,
            {"price": "1000.00"},
            format="json"
        )

        self.assertEqual(response.status_code, 403)

    # TEST 7: Protected fields cannot be modified
    def test_read_only_fields(self):
        prop = self.create_property()

        self.authenticate(self.seller)

        url = reverse(
            "property-detail", kwargs={"pk": prop.id}
        )

        response = self.client.patch(
            url,
            {
                "seller": self.other_user.id,
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        prop.refresh_from_db()

        self.assertEqual(prop.seller, self.seller)
        self.assertTrue(prop.is_active)

    # TEST 8: Only owner can archive the property
    def test_soft_delete(self):
        prop = self.create_property()

        url = reverse(
            "property-detail", kwargs={"pk": prop.id}
        )

        self.authenticate(self.other_user)

        self.assertEqual(
            self.client.delete(url).status_code, 403
        )

        self.authenticate(self.seller)

        self.assertEqual(
            self.client.delete(url).status_code, 204
        )

        prop.refresh_from_db()

        self.assertFalse(prop.is_active)
        self.assertTrue(
            Property.objects.filter(pk=prop.id).exists()
        )

        self.assertEqual(
            self.client.get(url).status_code, 404
        )

    # TEST 9: Invalid property information is rejected
    def test_property_validation(self):
        self.authenticate(self.seller)

        invalid_cases = [
            {"listing_type": "rent", "rent_period": ""},
            {"listing_type": "sale", "rent_period": "monthly"},
            {"price": "-5000"},
            {"area_sqft": "0"},
            {"property_type": "spaceship"}
        ]

        for changes in invalid_cases:
            with self.subTest(changes=changes):
                response = self.client.post(
                    self.list_url,
                    self.property_data(**changes),
                    format="json"
                )

                self.assertEqual(response.status_code, 400)

        self.assertEqual(Property.objects.count(), 0)

    # TEST 10: Filtering and searching
    def test_filtering_and_search(self):
        sale = self.create_property(
            title="Luxury Villa",
            property_type="villa",
            listing_type="sale",
            rent_period="",
            price="5000000.00"
        )

        self.create_property(
            title="Rental Apartment"
        )

        self.create_property(
            title="Delhi House",
            listing_type="sale",
            rent_period="",
            city="Delhi",
            price="8000000.00"
        )

        self.authenticate(self.seller)

        response = self.client.get(
            self.list_url,
            {"city": "gurugram", "listing_type": "sale"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["id"], sale.id
        )

        response = self.client.get(
            self.list_url, {"search": "Luxury Villa"}
        )

        self.assertEqual(response.data["count"], 1)

        response = self.client.get(
            self.list_url,
            {"min_price": 4000000, "max_price": 6000000}
        )

        self.assertEqual(response.data["count"], 1)

    # TEST 11: Ordering and pagination
    def test_pagination_and_ordering(self):
        self.create_property(price="30000.00")
        self.create_property(price="10000.00")
        self.create_property(price="20000.00")

        self.authenticate(self.seller)

        response = self.client.get(
            self.list_url,
            {
                "ordering": "price",
                "page_size": 2,
                "page": 1
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 2)

        self.assertEqual(
            response.data["results"][0]["price"],
            "10000.00"
        )

        response = self.client.get(
            self.list_url,
            {
                "ordering": "price",
                "page_size": 2,
                "page": 2
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(
            response.data["results"][0]["price"],
            "30000.00"
        )



class PropertyImageAPITests(APITestCase):

    def setUp(self):
        # Use temporary storage instead of real media files
        self.temp_media = tempfile.TemporaryDirectory()

        self.media_override = override_settings(
            MEDIA_ROOT=self.temp_media.name
        )
        self.media_override.enable()

        self.addCleanup(self.temp_media.cleanup)
        self.addCleanup(self.media_override.disable)

        self.seller = User.objects.create_user(
            username="image_seller",
            email="image_seller@example.com",
            password="TestPass123!"
        )

        self.other_user = User.objects.create_user(
            username="image_buyer",
            email="image_buyer@example.com",
            password="TestPass123!"
        )

        self.property = Property.objects.create(
            seller=self.seller,
            title="Test Apartment",
            description="Apartment for image testing",
            property_type="apartment",
            listing_type="rent",
            price="25000.00",
            rent_period="monthly",
            city="Gurugram",
            state="Haryana",
            address="Sector 56",
            bedrooms=3,
            bathrooms=2,
            area_sqft="1500.00"
        )

        self.upload_url = reverse(
            "property-image-upload",
            kwargs={"pk": self.property.id}
        )

    def authenticate(self, user):
        token = RefreshToken.for_user(user).access_token

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

    def make_image(self):
        buffer = BytesIO()

        image = Image.new("RGB", (100, 100), "white")
        image.save(buffer, format="PNG")

        return SimpleUploadedFile(
            "test_image.png",
            buffer.getvalue(),
            content_type="image/png"
        )

    def upload_as_owner(self):
        self.authenticate(self.seller)

        response = self.client.post(
            self.upload_url,
            {"image": self.make_image()},
            format="multipart"
        )

        self.assertEqual(response.status_code, 201)

        return PropertyImage.objects.get(
            id=response.data["id"]
        )

    def image_url(self, image_id):
        return reverse(
            "property-image-file",
            kwargs={
                "pk": self.property.id,
                "image_id": image_id
            }
        )

    # TEST 1: Owner can upload an image
    def test_owner_can_upload_image(self):
        image = self.upload_as_owner()

        self.assertEqual(
            image.property_id,
            self.property.id
        )

        self.assertTrue(
            os.path.isfile(image.image.path)
        )

    # TEST 2: Multiple images can belong to one property
    def test_multiple_image_uploads(self):
        self.upload_as_owner()
        self.upload_as_owner()

        self.assertEqual(
            PropertyImage.objects.filter(
                property=self.property
            ).count(),
            2
        )

        response = self.client.get(
            reverse(
                "property-detail",
                kwargs={"pk": self.property.id}
            )
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["images"]), 2)

    # TEST 3: Authentication is required for uploads
    def test_upload_requires_authentication(self):
        response = self.client.post(
            self.upload_url,
            {"image": self.make_image()},
            format="multipart"
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(PropertyImage.objects.count(), 0)

    # TEST 4: Other users cannot upload images
    def test_non_owner_cannot_upload(self):
        self.authenticate(self.other_user)

        response = self.client.post(
            self.upload_url,
            {"image": self.make_image()},
            format="multipart"
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(PropertyImage.objects.count(), 0)

    # TEST 5: Invalid image uploads are rejected
    def test_invalid_image_rejected(self):
        self.authenticate(self.seller)

        fake_image = SimpleUploadedFile(
            "fake.txt",
            b"This is not an image",
            content_type="text/plain"
        )

        response = self.client.post(
            self.upload_url,
            {"image": fake_image},
            format="multipart"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(PropertyImage.objects.count(), 0)

    # TEST 6: Oversized image uploads are rejected
    def test_oversized_image_rejected(self):
        self.authenticate(self.seller)

        buffer = BytesIO()

        large_image = Image.new(
            "RGB", (1400, 1400), "white"
        )
        large_image.save(buffer, format="BMP")

        self.assertGreater(
            len(buffer.getvalue()),
            5 * 1024 * 1024
        )

        uploaded_file = SimpleUploadedFile(
            "large.bmp",
            buffer.getvalue(),
            content_type="image/bmp"
        )

        response = self.client.post(
            self.upload_url,
            {"image": uploaded_file},
            format="multipart"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(PropertyImage.objects.count(), 0)

    # TEST 7: Image retrieval requires authentication
    def test_image_retrieval_permissions(self):
        image = self.upload_as_owner()
        url = self.image_url(image.id)

        self.authenticate(self.other_user)

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Type"],
            "image/png"
        )
        response.close()

        # Clear JWT credentials
        self.client.credentials()

        response = self.client.get(url)

        self.assertEqual(response.status_code, 401)

    # TEST 8: Archived property images are inaccessible
    def test_archived_property_image_hidden(self):
        image = self.upload_as_owner()

        self.property.is_active = False
        self.property.save()

        response = self.client.get(
            self.image_url(image.id)
        )

        self.assertEqual(response.status_code, 404)

    # TEST 9: Other users cannot delete images
    def test_non_owner_cannot_delete(self):
        image = self.upload_as_owner()

        self.authenticate(self.other_user)

        response = self.client.delete(
            self.image_url(image.id)
        )

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            PropertyImage.objects.filter(id=image.id).exists()
        )

        self.assertTrue(
            os.path.isfile(image.image.path)
        )

    # TEST 10: Owner deletion removes record and file
    def test_owner_deletes_image_and_file(self):
        image = self.upload_as_owner()

        image_id = image.id
        file_path = image.image.path

        self.assertTrue(os.path.isfile(file_path))

        response = self.client.delete(
            self.image_url(image_id)
        )

        self.assertEqual(response.status_code, 204)

        self.assertFalse(
            PropertyImage.objects.filter(id=image_id).exists()
        )

        self.assertFalse(os.path.exists(file_path))

        response = self.client.get(
            self.image_url(image_id)
        )

        self.assertEqual(response.status_code, 404)

    # TEST 11: Nonexistent images return 404
    def test_nonexistent_image(self):
        self.authenticate(self.seller)

        response = self.client.get(
            self.image_url(999999)
        )

        self.assertEqual(response.status_code, 404)
