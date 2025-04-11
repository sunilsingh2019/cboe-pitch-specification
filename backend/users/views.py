from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import logging
import sys
from datetime import datetime, timedelta
from django.utils import timezone
import uuid
from django.conf import settings

from .serializers import RegisterSerializer, UserSerializer, LoginSerializer, ChangePasswordSerializer
from .email_service import send_verification_email, is_verification_token_valid, send_password_reset_email
from .models import UserProfile

# Configure logging
logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
    
    @swagger_auto_schema(
        operation_description="Register a new user",
        request_body=RegisterSerializer,
        responses={
            201: UserSerializer,
            400: "Bad request"
        },
        tags=['Authentication']
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Send verification email
        verification_token = user.profile.email_verification_token
        email_sent = send_verification_email(user)
        
        # Debug logging
        logger.info(f"User {user.username} registered with email {user.email}")
        logger.info(f"Verification token: {verification_token}")
        
        # Return user info and verification status
        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "message": "User created successfully. Please check your email to verify your account.",
            "verification_email_sent": email_sent,
            "requires_verification": True
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = (AllowAny,)
    
    @swagger_auto_schema(
        operation_description="Login a user and get tokens",
        request_body=LoginSerializer,
        responses={
            200: openapi.Response(
                description="Login successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='Refresh token'),
                        'access': openapi.Schema(type=openapi.TYPE_STRING, description='Access token'),
                        'user': openapi.Schema(type=openapi.TYPE_OBJECT, description='User details')
                    }
                )
            ),
            401: "Invalid credentials"
        },
        tags=['Authentication']
    )
    def post(self, request):
        print(f"Login attempt with data: {request.data}", file=sys.stderr)
        
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            print(f"Attempting to authenticate user: {username}", file=sys.stderr)
            
            # First try direct authentication with username
            user = authenticate(username=username, password=password)
            
            # If authentication fails, check if it's an email login attempt
            if user is None:
                # Check if a user with this email exists
                try:
                    user_obj = User.objects.get(email=username)
                    print(f"Found user with email {username}: {user_obj.username}", file=sys.stderr)
                    # Try to authenticate with the username
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    user = None
            
            print(f"Authentication result: {user is not None}", file=sys.stderr)
            
            if user:
                print(f"User authenticated successfully", file=sys.stderr)
                
                # Check if email is verified
                if not user.profile.is_email_verified:
                    return Response(
                        {
                            "detail": "Email not verified. Please check your email for the verification link.",
                            "requires_verification": True
                        }, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                login(request, user)
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                })
            
            print(f"Failed login attempt", file=sys.stderr)
            return Response(
                {"detail": "Invalid credentials"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        print(f"Invalid login data: {serializer.errors}", file=sys.stderr)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmailVerificationView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = [] # Explicitly disable authentication for this view
    
    @swagger_auto_schema(
        operation_description="Verify a user's email address",
        manual_parameters=[
            openapi.Parameter(
                name='token',
                in_=openapi.IN_PATH,
                description='Email verification token',
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ],
        responses={
            200: "Email verified successfully",
            400: "Invalid or expired token",
            404: "Token not found"
        },
        tags=['Authentication']
    )
    def get(self, request, token):
        try:
            # Clean and validate token format
            token = token.strip()
            logger.info(f"Email verification attempt with token: {token}")
            
            # Check if token is a valid UUID format
            try:
                # Try to convert to UUID to validate format
                uuid_token = uuid.UUID(token)
                logger.info(f"Valid UUID token format: {uuid_token}")
            except ValueError:
                logger.warning(f"Invalid UUID format for token: {token}")
                return Response(
                    {
                        "detail": "Invalid token format. Please check your verification link.",
                        "token_format_error": True
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # First check if this token exists in any profile
            try:
                # Try with original token first
                profile = UserProfile.objects.get(email_verification_token=token)
                logger.info(f"Found profile for token (exact match): {profile.user.username}")
            except UserProfile.DoesNotExist:
                try:
                    # Try with UUID object in case of format differences
                    profile = UserProfile.objects.get(email_verification_token=uuid_token)
                    logger.info(f"Found profile for token (UUID conversion): {profile.user.username}")
                except UserProfile.DoesNotExist:
                    logger.warning(f"Verification attempt with non-existent token: {token}")
                    return Response(
                        {"detail": "Invalid verification token. This link may have been used already or doesn't exist."}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Log additional info to help debug
            logger.info(f"Profile verification status: {profile.user.username} (verified: {profile.is_email_verified})")
            logger.info(f"Stored token in DB: {profile.email_verification_token}")
            logger.info(f"Token from request: {token}")
            
            # Check if already verified - return informative response with user data
            if profile.is_email_verified:
                logger.info(f"Repeated verification attempt for already verified user: {profile.user.username}")
                # Generate tokens to allow auto-login if desired
                refresh = RefreshToken.for_user(profile.user)
                
                return Response(
                    {
                        "detail": f"Email {profile.user.email} is already verified. Please login.",
                        "already_verified": True,
                        "user": {
                            "email": profile.user.email,
                            "username": profile.user.username
                        },
                        "refresh": str(refresh),
                        "access": str(refresh.access_token)
                    }, 
                    status=status.HTTP_200_OK
                )
                
            # Check if token is expired
            if profile.email_verification_sent_at:
                expiration_time = profile.email_verification_sent_at + timedelta(hours=24)
                if timezone.now() > expiration_time:
                    logger.warning(f"Expired verification token used: {token}")
                    return Response(
                        {
                            "detail": "Verification link has expired. Please request a new one.",
                            "expired": True,
                            "user": {
                                "email": profile.user.email,
                                "username": profile.user.username
                            }
                        }, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Valid token, mark email as verified
            profile.is_email_verified = True
            profile.save(update_fields=['is_email_verified'])
            
            logger.info(f"Email successfully verified for user: {profile.user.username}")
            
            # Generate JWT tokens for auto-login
            refresh = RefreshToken.for_user(profile.user)
            
            return Response({
                "detail": "Email verified successfully",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(profile.user).data
            })
        except Exception as e:
            logger.error(f"Error during email verification: {str(e)}")
            # Try to extract user from token if possible even if verification failed
            try:
                # See if we can find a profile with this token
                try:
                    profile = UserProfile.objects.get(email_verification_token=token)
                    user_data = {
                        "email": profile.user.email,
                        "username": profile.user.username
                    }
                    logger.info(f"Found user {profile.user.username} despite verification error")
                    
                    return Response(
                        {
                            "detail": f"Error during verification process: {str(e)}",
                            "error_type": "process_error",
                            "user": user_data
                        }, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                except UserProfile.DoesNotExist:
                    # No user found with this token
                    pass
            except Exception as inner_e:
                logger.error(f"Error attempting to recover user data: {str(inner_e)}")
            
            # Return generic error if we couldn't recover user data
            return Response(
                {"detail": f"An error occurred during verification: {str(e)}. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ResendVerificationEmailView(APIView):
    permission_classes = (AllowAny,)
    
    @swagger_auto_schema(
        operation_description="Resend verification email",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['email'],
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, description='User email')
            }
        ),
        responses={
            200: "Verification email sent",
            400: "Bad request",
            404: "User not found"
        },
        tags=['Authentication']
    )
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"detail": "Email is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Check if already verified
            if user.profile.is_email_verified:
                return Response(
                    {"detail": "Email is already verified. Please login."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Send verification email
            email_sent = send_verification_email(user)
            
            if email_sent:
                return Response({"detail": "Verification email sent"})
            else:
                return Response(
                    {"detail": "Failed to send verification email. Please try again later."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except User.DoesNotExist:
            return Response(
                {"detail": "User with this email does not exist"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class TokenCheckView(APIView):
    """
    API view to check token validity without verifying the email
    This is used for debugging purposes when verification fails
    """
    permission_classes = (AllowAny,)
    authentication_classes = [] # Explicitly disable authentication
    
    @swagger_auto_schema(
        operation_description="Check if a token exists and get user info",
        manual_parameters=[
            openapi.Parameter(
                name='token',
                in_=openapi.IN_PATH,
                description='Email verification token',
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ],
        responses={
            200: "Token exists and user info returned",
            404: "Token not found"
        },
        tags=['Authentication']
    )
    def get(self, request, token):
        try:
            # Clean the token
            token = token.strip()
            logger.info(f"Token check for: {token}")
            
            # Check token format
            valid_uuid_format = True
            uuid_token = None
            try:
                uuid_token = uuid.UUID(token)
                logger.info(f"Token is valid UUID format: {uuid_token}")
            except ValueError:
                valid_uuid_format = False
                logger.warning(f"Token is not a valid UUID format: {token}")
            
            # First try to find the profile with the exact token
            try:
                profile = UserProfile.objects.get(email_verification_token=token)
                logger.info(f"Found profile for token (exact match): {profile.user.username}")
                
                return Response({
                    "token_valid": True,
                    "is_verified": profile.is_email_verified,
                    "token_format": "exact_match",
                    "user": {
                        "username": profile.user.username,
                        "email": profile.user.email
                    }
                })
            except UserProfile.DoesNotExist:
                logger.info(f"No profile found with exact token match: {token}")
                
                # If valid UUID format, try with the UUID object
                if valid_uuid_format:
                    try:
                        profile = UserProfile.objects.get(email_verification_token=uuid_token)
                        logger.info(f"Found profile for token (UUID conversion): {profile.user.username}")
                        
                        return Response({
                            "token_valid": True,
                            "is_verified": profile.is_email_verified,
                            "token_format": "uuid_conversion",
                            "user": {
                                "username": profile.user.username,
                                "email": profile.user.email
                            }
                        })
                    except UserProfile.DoesNotExist:
                        logger.warning(f"No profile found with UUID token: {uuid_token}")
                
                # No profile found with this token
                return Response(
                    {
                        "detail": "Token not found", 
                        "token_valid": False,
                        "token_format_valid": valid_uuid_format
                    }, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            logger.error(f"Error checking token: {str(e)}")
            return Response(
                {
                    "detail": f"Error checking token: {str(e)}",
                    "token_valid": False
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_description="Logout a user",
        responses={
            200: "Logout successful"
        },
        tags=['Authentication']
    )
    def post(self, request):
        try:
            logout(request)
            return Response({"detail": "Successfully logged out."})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user
        
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error retrieving user details: {str(e)}")
            return Response(
                {"detail": "User not found", "code": "user_not_found", "error": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_description="Change user password",
        request_body=ChangePasswordSerializer,
        responses={
            200: "Password changed successfully",
            400: "Bad request",
            401: "Unauthorized"
        },
        tags=['User Profile']
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            old_password = serializer.validated_data['old_password']
            new_password = serializer.validated_data['new_password']
            
            # Check if old password is correct
            if not user.check_password(old_password):
                return Response(
                    {"old_password": "Old password is incorrect"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Update JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'detail': "Password changed successfully",
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    """
    API endpoint for requesting a password reset.
    Sends an email with a reset token.
    """
    permission_classes = (AllowAny,)
    
    @swagger_auto_schema(
        operation_description="Request password reset email",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['email'],
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, description='User email')
            }
        ),
        responses={
            200: "Password reset email sent",
            400: "Bad request",
            404: "User not found"
        },
        tags=['Authentication']
    )
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"detail": "Email is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Generate reset token for the user
            if not hasattr(user, 'profile'):
                # Create profile if it doesn't exist
                UserProfile.objects.create(user=user)
                
            # Generate a new token
            reset_token = user.profile.generate_verification_token()
            
            # Send reset email
            email_sent = send_password_reset_email(user, reset_token)
            
            if email_sent:
                return Response({"detail": "Password reset email sent"})
            else:
                logger.error(f"Failed to send password reset email to {email}")
                return Response(
                    {"detail": "Failed to send password reset email. Please try again later."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except User.DoesNotExist:
            # Don't reveal that the user doesn't exist for security reasons
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return Response({"detail": "Password reset email sent if the email exists in our system"})


class PasswordResetConfirmView(APIView):
    """
    API endpoint for confirming a password reset.
    Verifies the token and sets the new password.
    """
    permission_classes = (AllowAny,)
    authentication_classes = []  # Explicitly disable authentication
    
    @swagger_auto_schema(
        operation_description="Reset password with token",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['token', 'new_password', 'confirm_password'],
            properties={
                'token': openapi.Schema(type=openapi.TYPE_STRING, description='Password reset token'),
                'new_password': openapi.Schema(type=openapi.TYPE_STRING, description='New password'),
                'confirm_password': openapi.Schema(type=openapi.TYPE_STRING, description='Confirm new password')
            }
        ),
        responses={
            200: "Password reset successful",
            400: "Bad request or passwords don't match",
            404: "Invalid or expired token"
        },
        tags=['Authentication']
    )
    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Validate input data
        if not token:
            return Response(
                {"detail": "Reset token is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not new_password:
            return Response(
                {"detail": "New password is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if new_password != confirm_password:
            return Response(
                {"detail": "Passwords do not match"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find user profile with this token
            try:
                profile = UserProfile.objects.get(email_verification_token=token)
                user = profile.user
                logger.info(f"Processing password reset for user: {user.username}")
            except UserProfile.DoesNotExist:
                logger.warning(f"Password reset attempt with non-existent token: {token}")
                return Response(
                    {"detail": "Invalid reset token. The link may have expired or been used already."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if token is expired (assuming tokens are valid for 24 hours)
            if profile.email_verification_sent_at:
                expiration_time = profile.email_verification_sent_at + timedelta(hours=24)
                if timezone.now() > expiration_time:
                    logger.warning(f"Expired password reset token used: {token}")
                    return Response(
                        {"detail": "Reset link has expired. Please request a new one."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Generate a new token to invalidate the reset link
            profile.generate_verification_token()
            
            # Generate JWT tokens for auto-login
            refresh = RefreshToken.for_user(user)
            
            return Response({
                "detail": "Password has been reset successfully",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data
            })
            
        except Exception as e:
            logger.error(f"Error during password reset: {str(e)}")
            return Response(
                {"detail": f"An error occurred during password reset: {str(e)}. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RegenerateVerificationTokenView(APIView):
    """
    API view to regenerate a verification token for a user
    This will create a new token and send a verification email
    """
    permission_classes = (AllowAny,)
    
    @swagger_auto_schema(
        operation_description="Regenerate verification token and send email",
        manual_parameters=[
            openapi.Parameter(
                name='email',
                in_=openapi.IN_PATH,
                description='User email',
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ],
        responses={
            200: "Token regenerated and email sent",
            404: "User not found"
        },
        tags=['Authentication']
    )
    def get(self, request, email):
        try:
            # Find the user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {"detail": "No user found with this email address."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Check if already verified
            if user.profile.is_email_verified:
                return Response(
                    {
                        "detail": "Email is already verified. Please login.",
                        "already_verified": True,
                        "user": {
                            "email": user.email,
                            "username": user.username
                        }
                    }, 
                    status=status.HTTP_200_OK
                )
                
            # Generate a new token
            old_token = user.profile.email_verification_token
            new_token = user.profile.generate_verification_token()
            
            logger.info(f"Regenerated token for {user.username}. Old: {old_token}, New: {new_token}")
            
            # Send verification email
            email_sent = send_verification_email(user)
            
            # Return the new token and verification URL for debugging
            frontend_url = settings.FRONTEND_URL
            if frontend_url.endswith('/'):
                frontend_url = frontend_url[:-1]
                
            verification_url = f"{frontend_url}/verify-email/{new_token}"
            
            return Response({
                "detail": "Verification token regenerated and email sent.",
                "verification_email_sent": email_sent,
                "new_token": str(new_token),
                "verification_url": verification_url
            })
            
        except Exception as e:
            logger.error(f"Error regenerating verification token: {str(e)}")
            return Response(
                {"detail": f"An error occurred: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 