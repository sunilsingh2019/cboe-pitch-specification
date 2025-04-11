from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, UserDetailView, 
    ChangePasswordView, EmailVerificationView, ResendVerificationEmailView,
    TokenCheckView, PasswordResetRequestView, PasswordResetConfirmView,
    RegenerateVerificationTokenView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('verify-email/<str:token>/', EmailVerificationView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification'),
    path('regenerate-verification/<str:email>/', RegenerateVerificationTokenView.as_view(), name='regenerate-verification'),
    path('check-token/<str:token>/', TokenCheckView.as_view(), name='check-token'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
] 