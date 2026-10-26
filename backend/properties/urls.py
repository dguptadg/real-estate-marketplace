
from django.urls import path

from .views import (
    PropertyListCreateView,
    PropertyDetailView,
    PropertyImageUploadView,
    PropertyImageFileView,
)


urlpatterns = [
    path(
        "",
        PropertyListCreateView.as_view(),
        name="property-list-create"
    ),

    path(
        "<int:pk>/",
        PropertyDetailView.as_view(),
        name="property-detail"
    ),

    path(
        "<int:pk>/images/",
        PropertyImageUploadView.as_view(),
        name="property-image-upload"
    ),

    path(
        "<int:pk>/images/<int:image_id>/",
        PropertyImageFileView.as_view(),
        name="property-image-file"
    ),
]
