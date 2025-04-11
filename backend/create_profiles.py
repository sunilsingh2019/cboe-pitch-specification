from django.contrib.auth.models import User
from users.models import UserProfile

# Create profiles for all users that don't have one
for user in User.objects.all():
    profile, created = UserProfile.objects.get_or_create(user=user)
    if created:
        print(f"Created profile for {user.username}")
    else:
        print(f"Profile already exists for {user.username}")
        
    # Make sure it's marked as verified (for existing users)
    if not profile.is_email_verified:
        profile.is_email_verified = True
        profile.save()
        print(f"Marked {user.username}'s email as verified") 