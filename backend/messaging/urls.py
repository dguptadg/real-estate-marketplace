
from django.urls import path

from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageHistoryView
)

urlpatterns = [
    path(
        "",
        ConversationListCreateView.as_view(),
        name="conversation-list-create"
    ),

    path(
        "<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail"
    ),

    path(
        "<int:conversation_id>/messages/",
        MessageHistoryView.as_view(),
        name="conversation-messages"
    ),
]
