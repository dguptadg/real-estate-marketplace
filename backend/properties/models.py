from django.db import models

#use decimal to avoid precision errors caused by floating values : 
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator


# Create your models here.

#porperty model : 
class Property(models.Model):

    class PropertyType(models.TextChoices):
        APPARTMENT = "apartment", "Appartment"
        HOUSE = "house", "House"
        VILLA = "villa", "Villa"
        PLOT = "plot", "Plot"
        COMMERCIAL = "commercial", "Commercial"

    class ListingType(models.TextChoices):
        SALE = "sale", "Sale"
        RENT = "rent", "Rent"

    class RentPeriod(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='properties'
    )

    title = models.CharField(max_length=200)
    description = models.TextField()

    property_type = models.CharField(max_length=100, choices=PropertyType.choices)

    listing_type = models.CharField(max_length=10, choices=ListingType.choices)

    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])

    rent_period = models.CharField(max_length=20, choices=RentPeriod.choices, blank=True, default="")

    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    address = models.CharField(max_length=250)

    bedrooms = models.PositiveSmallIntegerField(default=0)
    bathrooms = models.PositiveSmallIntegerField(default=0)

    area_sqft = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta : 
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


#property image model : 
class PropertyImage(models.Model):
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="property_images/"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"Image for {self.property.title}"
