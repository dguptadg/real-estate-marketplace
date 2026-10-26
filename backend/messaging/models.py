from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator
# Create your models here.

#create the model for conversations of a property : 
class Conversation(models.Model):
    property = models.ForeignKey("properties.Property", on_delete=models.CASCADE, related_name="conversations")

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_conversation")

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_conversation")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta : 
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["buyer", "property"],
                name = "unique_buyer_property_conversation"
            ),
            models.CheckConstraint(
                condition=~models.Q(buyer=models.F("seller")),
                name= "buyer_not_seller_conversation"
            )
        ]

    def clean(self):
        super().clean()

        if self.property_id and self.buyer_id:
            if self.buyer_id == self.property.seller_id:
                raise ValidationError({"buyer" : "You cann't message yourself"})

        if self.property_id and self.seller_id:
            if self.seller_id != self.property.seller_id:
                raise ValidationError({"seller" : "seller must be the owner of property"})

    def save(self, *args, **kwargs):
        if self.property_id:
            self.seller_id = self.property.seller_id

        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Conversation {self.pk} - Property {self.property_id}"


#model for the message in the conversation : 
class Message(models.Model):
    conversation = models.ForeignKey("messaging.Conversation", on_delete=models.CASCADE, related_name="messages")

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")

    text = models.TextField(
        validators=[MaxLengthValidator(2000)]
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta : 
        ordering = ["created_at", "id"]

    def clean(self):
        super().clean()

        if self.conversation_id and self.sender_id:
            participants = (
                self.conversation.seller_id,
                self.conversation.buyer_id
            )

            if self.sender_id not in participants :
                raise ValidationError({"sender" : "sender must be the part of conversation"})

        if self.text and not self.text.strip():
            raise ValidationError({"text" : "message can't contain white spaces"})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Message {self.pk} Conversation {self.conversation_id}"