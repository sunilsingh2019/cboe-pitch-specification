from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

def send_verification_email(user):
    """
    Send an email verification link to the user.
    """
    try:
        # Generate a new verification token
        verification_token = user.profile.generate_verification_token()
        
        # Build the verification URL
        frontend_url = settings.FRONTEND_URL 
        # Ensure no trailing slash in frontend_url
        if frontend_url.endswith('/'):
            frontend_url = frontend_url[:-1]
            
        # Ensure the token is properly formatted as a string
        token_str = str(verification_token)
        verification_url = f"{frontend_url}/verify-email/{token_str}"
        
        logger.info(f"Generated verification URL: {verification_url}")
        
        # Email content with proper formatting
        subject = "Verify your email address for CBOE PITCH Data Processor"
        message = f"""Hello {user.username},

Thank you for registering with the CBOE PITCH Data Processor!

Please verify your email address by clicking on the link below:

{verification_url}

This link will expire in 24 hours.

If you did not register for this service, please ignore this email.

Best regards,
The CBOE PITCH Data Processor Team"""
        
        # Send the email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # Update the sent timestamp
        user.profile.email_verification_sent_at = timezone.now()
        user.profile.save()
        
        logger.info(f"Verification email sent to {user.email} with token {token_str}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
        return False

def is_verification_token_valid(token, max_age_hours=24):
    """
    Check if a verification token is valid and not expired.
    """
    from .models import UserProfile
    
    try:
        # Find the profile with this token
        profile = UserProfile.objects.get(email_verification_token=token)
        
        # Check if already verified
        if profile.is_email_verified:
            return False
            
        # Check if token is expired
        if profile.email_verification_sent_at:
            expiration_time = profile.email_verification_sent_at + timedelta(hours=max_age_hours)
            if timezone.now() > expiration_time:
                return False
                
        return profile
    except UserProfile.DoesNotExist:
        return False
    except Exception as e:
        logger.error(f"Error validating verification token: {str(e)}")
        return False

def send_password_reset_email(user, reset_token=None):
    """
    Send a password reset email to the user.
    If reset_token is not provided, a new one will be generated.
    """
    try:
        # If no token provided, generate a new one
        if not reset_token:
            reset_token = user.profile.generate_verification_token()
        
        # Build the reset URL
        frontend_url = settings.FRONTEND_URL 
        reset_url = f"{frontend_url}/reset-password/{reset_token}"
        
        # Email content
        subject = "Reset your password for CBOE PITCH Data Processor"
        message = f"""
        Hello {user.username},
        
        We received a request to reset your password for the CBOE PITCH Data Processor.
        
        To reset your password, please click on the link below:
        
        {reset_url}
        
        This link will expire in 24 hours.
        
        If you did not request a password reset, please ignore this email and your password will remain unchanged.
        
        Best regards,
        The CBOE PITCH Data Processor Team
        """
        
        # Send the email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # Update the sent timestamp
        user.profile.email_verification_sent_at = timezone.now()
        user.profile.save()
        
        logger.info(f"Password reset email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        return False 