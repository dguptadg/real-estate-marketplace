from rest_framework import serializers

from .models import Property, PropertyImage

from django.urls import reverse


#serilaizer for the images of the property : 
class PropertyImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta : 
        model = PropertyImage

        fields = ["id", "image", "file_url", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]

    def validate_image(self, image):
        if image.size > 5 * 1024 * 1024 : 
            raise serializers.ValidationError("Image size must not exceed 5 MB")
        return image

    def get_file_url(self, obj):
        url = reverse(
            "property-image-file",
            kwargs={
                "pk": obj.property_id,
                "image_id": obj.id
            }
        )

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(url)

        return url


#serializer for the property details as whole : 
class PropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)

    class Meta : 
        model = Property

        fields = '__all__'

        read_only_fields = ["id", "seller", "is_active", "created_at", "updated_at", ]

    def validate(self, attrs):
        listing_type = attrs.get("listing_type", self.instance.listing_type if self.instance else None)
        rent_period = attrs.get("rent_period", self.instance.rent_period if self.instance else "")

        if listing_type == Property.ListingType.RENT:
            if not rent_period:
                raise serializers.ValidationError({"rent period" : "rent period is required for rental properties"})
        if listing_type == Property.ListingType.SALE:
            if rent_period:
                raise serializers.ValidationError({"rent_period" : "rent period is not allowed for sale properties"})
            
        return attrs


