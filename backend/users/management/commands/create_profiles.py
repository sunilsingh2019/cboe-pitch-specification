from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile

class Command(BaseCommand):
    help = 'Create UserProfile for all existing users and mark them as verified'

    def handle(self, *args, **options):
        users = User.objects.all()
        self.stdout.write(self.style.SUCCESS(f'Found {users.count()} users'))
        
        for user in users:
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created profile for {user.username}'))
            else:
                self.stdout.write(f'Profile already exists for {user.username}')
            
            # Mark as verified for existing users
            if not profile.is_email_verified:
                profile.is_email_verified = True
                profile.save()
                self.stdout.write(self.style.SUCCESS(f'Marked {user.username}\'s email as verified')) 