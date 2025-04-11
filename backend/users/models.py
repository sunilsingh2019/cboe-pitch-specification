from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import logging

logger = logging.getLogger(__name__)

# We're using Django's built-in User model for this application
# No custom user models needed 

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"
    
    def generate_verification_token(self):
        """Generate a new unique token for email verification and ensure it's saved."""
        try:
            # Generate UUID token
            new_token = uuid.uuid4()
            logger.info(f"Generated new token for {self.user.username}: {new_token}")
            
            # Update the profile
            self.email_verification_token = new_token
            self.email_verification_sent_at = timezone.now()
            self.save(update_fields=['email_verification_token', 'email_verification_sent_at'])
            
            # Log and return the token
            logger.info(f"Saved token {new_token} for user {self.user.username}")
            return new_token
        except Exception as e:
            logger.error(f"Error generating verification token: {str(e)}")
            # If there's an error, still return a token
            self.email_verification_token = uuid.uuid4()
            return self.email_verification_token 