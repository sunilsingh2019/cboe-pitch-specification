from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from .models import (
    PitchFile, AddOrderMessage, TradeMessage, CancelOrderMessage,
    AuctionMessage, SystemEventMessage
)
from .serializers import (
    AddOrderMessageSerializer, TradeMessageSerializer, CancelOrderMessageSerializer,
    AuctionMessageSerializer, SystemEventMessageSerializer
)

# Pagination class for message data
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'limit'
    max_page_size = 1000

# Base view for message-specific endpoints
class MessageBaseView(APIView):
    """
    Base view for message-specific endpoints.
    This should be subclassed for each message type, not used directly.
    """
    permission_classes = [AllowAny]
    pagination_class = StandardResultsSetPagination
    
    def get_paginated_response(self, data):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(data, self.request)
        serialized_data = self.get_serializer(page, many=True).data
        return paginator.get_paginated_response(serialized_data)
    
    def get(self, request, file_id, *args, **kwargs):
        try:
            # Get the PitchFile instance
            pitch_file = get_object_or_404(PitchFile, id=file_id)
            
            # Check if user has access to this file
            if request.user.is_authenticated and pitch_file.uploaded_by != request.user:
                if not request.user.is_staff:  # Staff can see all files
                    return Response(
                        {'error': 'You do not have permission to view this data'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get messages for this file - to be implemented by subclasses
            messages = self.get_messages(pitch_file)
            
            # Paginate the results
            return self.get_paginated_response(messages)
            
        except Exception as e:
            return Response(
                {'error': f'Error retrieving message data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_messages(self, pitch_file):
        """
        This method should be overridden by subclasses to return the appropriate messages.
        """
        raise NotImplementedError("Subclasses must implement get_messages")
    
    def get_serializer(self, *args, **kwargs):
        """
        This method should be overridden by subclasses to return the appropriate serializer.
        """
        raise NotImplementedError("Subclasses must implement get_serializer")

# Message-specific view classes
class AddOrderMessageView(MessageBaseView):
    """
    API endpoint for retrieving Add Order messages for a specific PITCH file.
    """
    def get_messages(self, pitch_file):
        return AddOrderMessage.objects.filter(pitch_file=pitch_file).order_by('-timestamp')
    
    def get_serializer(self, *args, **kwargs):
        return AddOrderMessageSerializer(*args, **kwargs)

class TradeMessageView(MessageBaseView):
    """
    API endpoint for retrieving Trade messages for a specific PITCH file.
    """
    def get_messages(self, pitch_file):
        return TradeMessage.objects.filter(pitch_file=pitch_file).order_by('-timestamp')
    
    def get_serializer(self, *args, **kwargs):
        return TradeMessageSerializer(*args, **kwargs)

class CancelOrderMessageView(MessageBaseView):
    """
    API endpoint for retrieving Cancel Order messages for a specific PITCH file.
    """
    def get_messages(self, pitch_file):
        return CancelOrderMessage.objects.filter(pitch_file=pitch_file).order_by('-timestamp')
    
    def get_serializer(self, *args, **kwargs):
        return CancelOrderMessageSerializer(*args, **kwargs)

class AuctionMessageView(MessageBaseView):
    """
    API endpoint for retrieving Auction messages for a specific PITCH file.
    """
    def get_messages(self, pitch_file):
        return AuctionMessage.objects.filter(pitch_file=pitch_file).order_by('-timestamp')
    
    def get_serializer(self, *args, **kwargs):
        return AuctionMessageSerializer(*args, **kwargs)

class SystemEventMessageView(MessageBaseView):
    """
    API endpoint for retrieving System Event messages for a specific PITCH file.
    """
    def get_messages(self, pitch_file):
        return SystemEventMessage.objects.filter(pitch_file=pitch_file).order_by('-timestamp')
    
    def get_serializer(self, *args, **kwargs):
        return SystemEventMessageSerializer(*args, **kwargs) 