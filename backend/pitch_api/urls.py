from django.urls import path
from .views import PitchFileUploadView, PitchFileListView, PitchFileDetailView
from .message_views import (
    MessageBaseView, AddOrderMessageView, TradeMessageView, CancelOrderMessageView,
    AuctionMessageView, SystemEventMessageView
)

urlpatterns = [
    path('upload/', PitchFileUploadView.as_view(), name='pitch-file-upload'),
    path('files/', PitchFileListView.as_view(), name='pitch-file-list'),
    path('files/<int:file_id>/', PitchFileDetailView.as_view(), name='pitch-file-detail'),
    
    # Message-specific endpoints
    path('files/<int:file_id>/add-orders/', AddOrderMessageView.as_view(), name='add-order-messages'),
    path('files/<int:file_id>/trades/', TradeMessageView.as_view(), name='trade-messages'),
    path('files/<int:file_id>/cancel-orders/', CancelOrderMessageView.as_view(), name='cancel-order-messages'),
    path('files/<int:file_id>/auctions/', AuctionMessageView.as_view(), name='auction-messages'),
    path('files/<int:file_id>/system-events/', SystemEventMessageView.as_view(), name='system-event-messages'),
] 