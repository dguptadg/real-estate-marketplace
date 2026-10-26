from django.shortcuts import render

# Create your views here.
from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework.exceptions import ValidationError

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationCreateSerializer,
    MessageSerializer
)


class ParticipantConversationsMixin:

    def get_queryset(self):
        user = self.request.user

        return Conversation.objects.filter(
            Q(buyer=user) | Q(seller=user)
        ).select_related("property", "buyer", "seller")


class ConversationListCreateView(
    ParticipantConversationsMixin,
    generics.ListAPIView
):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):

        serializer = ConversationCreateSerializer(
            data=request.data,
            context=self.get_serializer_context()
        )

        serializer.is_valid(raise_exception=True)

        property_obj = serializer.validated_data["property"]

        conversation, created = Conversation.objects.get_or_create(
            property=property_obj,
            buyer=request.user,
            defaults={"seller": property_obj.seller}
        )

        output_serializer = ConversationSerializer(conversation)

        response_status = (
            status.HTTP_201_CREATED
            if created
            else status.HTTP_200_OK
        )

        return Response(
            output_serializer.data,
            status=response_status
        )


class ConversationDetailView(
    ParticipantConversationsMixin,
    generics.RetrieveAPIView
):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]




class MessageHistoryView(generics.ListCreateAPIView):

    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_conversation(self):
        user = self.request.user
        conversation_id = self.kwargs["conversation_id"]

        return get_object_or_404(
            Conversation.objects.filter(
                Q(buyer=user) | Q(seller=user)
            ),
            pk=conversation_id
        )

    def get_queryset(self):
        conversation = self.get_conversation()

        queryset = Message.objects.filter(
            conversation=conversation
        ).select_related("sender").order_by("id")

        after_id = self.request.query_params.get("after_id")

        if after_id is not None:
            try:
                after_id = int(after_id)
            except (ValueError, TypeError):
                raise ValidationError({
                    "after_id": "Must be a valid non-negative integer."
                })

            if after_id < 0:
                raise ValidationError({
                    "after_id": "Must be a non-negative integer."
                })

            queryset = queryset.filter(id__gt=after_id)

        return queryset

    def perform_create(self, serializer):
        conversation = self.get_conversation()

        serializer.save(
            conversation=conversation,
            sender=self.request.user
        )



