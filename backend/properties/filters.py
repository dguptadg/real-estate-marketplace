from django_filters import rest_framework as filters
from .models import Property

class PropertyFilter(filters.FilterSet):
    
    city = filters.CharFilter(field_name = "city", lookup_expr = "iexact")

    min_price = filters.NumberFilter(field_name = "price", lookup_expr="gte")

    max_price = filters.NumberFilter(field_name = "price", lookup_expr="lte")

    class Meta:
        model = Property
        fields = ["city",
                  "listing_type",
                  "property_type"]

