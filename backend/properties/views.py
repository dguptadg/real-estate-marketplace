from django.shortcuts import render

from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated

from .models import Property
from .serializers import PropertySerializer

from .permissions import IsOwnerOrReadOnly

from django_filters.rest_framework import DjangoFilterBackend
from .filters import PropertyFilter

from .pagination import PropertyPagination


import mimetypes

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404

from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from .models import PropertyImage
from .serializers import PropertyImageSerializer

from rest_framework.response import Response
from rest_framework import status



# Create your views here.

#view to POST/CREATE the property listing by authenticated users OR GET/FETCH the listed properties by authenticated users : 
class PropertyListCreateView(generics.ListCreateAPIView):

    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated]

    pagination_class = PropertyPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter, ]

    filterset_class = PropertyFilter

    search_fields = ["title", "description", "city", "state", "address",  ]

    ordering_fields = ["price", "created_at", ]

    ordering = ["-created_at"]

    def get_queryset(self):
        return Property.objects.filter(is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(seller = self.request.user)

#allow authenticated users to view specific property based on the property id : 
class PropertyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Property.objects.filter(is_active=True)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


#views for image upload : 

class PropertyImageUploadView(generics.CreateAPIView):
    serializer_class = PropertyImageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        property_obj = get_object_or_404(
            Property,
            pk=self.kwargs["pk"],
            is_active=True
        )

        if property_obj.seller_id != self.request.user.id:
            raise PermissionDenied(
                "Only the seller can upload property images."
            )

        serializer.save(property=property_obj)


class PropertyImageFileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, image_id):
        property_image = get_object_or_404(
            PropertyImage,
            pk=image_id,
            property_id=pk,
            property__is_active=True
        )

        content_type = (
            mimetypes.guess_type(property_image.image.name)[0]
            or "application/octet-stream"
        )

        try:
            image_file = property_image.image.open("rb")
        except (FileNotFoundError, OSError):
            raise Http404("Image file not found.")

        return FileResponse(
            image_file,
            content_type=content_type
        )

    def delete(self, request, pk, image_id):
        property_image = get_object_or_404(
            PropertyImage,
            pk=image_id,
            property_id=pk,
            property__is_active=True
        )

        if property_image.property.seller_id != request.user.id:
            raise PermissionDenied(
                "Only the seller can delete property images."
            )

        image_file = property_image.image

        # Delete the database record
        property_image.delete()

        # Delete the physical file from media storage
        image_file.delete(save=False)

        return Response(status=status.HTTP_204_NO_CONTENT)
