
from rest_framework import serializers

from properties.models import Property
from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Conversation
        fields = [
            "id",
            "property",
            "buyer",
            "seller",
            "created_at"
        ]
        read_only_fields = fields


class ConversationCreateSerializer(serializers.ModelSerializer):

    property = serializers.PrimaryKeyRelatedField(
        queryset=Property.objects.filter(is_active=True)
    )

    class Meta:
        model = Conversation
        fields = ["property"]

    def validate_property(self, value):
        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        if value.seller_id == request.user.id:
            raise serializers.ValidationError(
                "You cannot start a conversation with yourself."
            )

        return value


class MessageSerializer(serializers.ModelSerializer):

    text = serializers.CharField(
        max_length=2000,
        allow_blank=False,
        trim_whitespace=True
    )

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "text",
            "created_at"
        ]

        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "created_at"
        ]
