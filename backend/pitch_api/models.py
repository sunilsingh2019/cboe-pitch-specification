from django.db import models
from django.conf import settings

class PitchFile(models.Model):
    """Model for storing uploaded PITCH files"""
    file_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_size = models.IntegerField()  # Size in bytes
    total_lines = models.IntegerField()
    unique_symbols_count = models.IntegerField()
    unique_order_ids_count = models.IntegerField()
    unique_execution_ids_count = models.IntegerField()
    
    def __str__(self):
        return f"{self.file_name} ({self.uploaded_at.strftime('%Y-%m-%d %H:%M')})"

class MessageType(models.Model):
    """Model for storing message types and their counts"""
    pitch_file = models.ForeignKey(PitchFile, on_delete=models.CASCADE, related_name='message_types')
    message_type = models.CharField(max_length=50)
    count = models.IntegerField()
    
    def __str__(self):
        return f"{self.message_type}: {self.count}"
        
class Symbol(models.Model):
    """Model for storing symbols found in PITCH files"""
    pitch_file = models.ForeignKey(PitchFile, on_delete=models.CASCADE, related_name='symbols')
    symbol = models.CharField(max_length=16)
    
    def __str__(self):
        return self.symbol

# New message-specific models

class MessageBase(models.Model):
    """Base abstract model for common fields in all message types"""
    pitch_file = models.ForeignKey(PitchFile, on_delete=models.CASCADE, related_name='%(class)s_messages')
    message_type = models.CharField(max_length=50, default='')
    timestamp = models.BigIntegerField(default=0, help_text="Time the message was generated (nanoseconds)")
    order_id = models.CharField(max_length=50, null=True, blank=True, help_text="Unique ID for orders (if applicable)")
    symbol = models.CharField(max_length=16, null=True, blank=True, help_text="Stock symbol (if applicable)")
    price = models.DecimalField(max_digits=19, decimal_places=8, null=True, blank=True, help_text="Price of the order or trade")
    quantity = models.IntegerField(null=True, blank=True, help_text="Number of shares in the order/trade")
    participant_id = models.CharField(max_length=16, null=True, blank=True, help_text="Market participant identifier (if applicable)")
    
    class Meta:
        abstract = True

class AddOrderMessage(MessageBase):
    """Model for Add Order message type"""
    side = models.CharField(max_length=1, choices=[('B', 'Buy'), ('S', 'Sell')], default='B', help_text="'B' = Buy, 'S' = Sell")
    
    def __str__(self):
        return f"Add Order: {self.order_id} - {self.symbol} - {self.side} - {self.quantity} @ {self.price}"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'order_id']),
            models.Index(fields=['pitch_file', 'symbol']),
        ]

class ModifyOrderMessage(MessageBase):
    """Model for Modify Order message type"""
    modified_shares = models.IntegerField(default=0, help_text="Updated number of shares")
    
    def __str__(self):
        return f"Modify Order: {self.order_id} - {self.symbol} - Modified to {self.modified_shares} shares"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'order_id']),
        ]

class CancelOrderMessage(MessageBase):
    """Model for Cancel Order message type"""
    canceled_shares = models.IntegerField(default=0, help_text="Number of shares canceled")
    
    def __str__(self):
        return f"Cancel Order: {self.order_id} - {self.symbol} - Canceled {self.canceled_shares} shares"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'order_id']),
        ]

class DeleteOrderMessage(MessageBase):
    """Model for Delete Order message type (complete order removal)"""
    
    def __str__(self):
        return f"Delete Order: {self.order_id} - {self.symbol}"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'order_id']),
        ]

class TradeMessage(MessageBase):
    """Model for Trade message type"""
    trade_id = models.CharField(max_length=50, default='', help_text="Unique trade ID")
    executed_shares = models.IntegerField(default=0, help_text="Number of shares traded")
    
    def __str__(self):
        return f"Trade: {self.trade_id} - {self.symbol} - {self.executed_shares} @ {self.price}"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'trade_id']),
            models.Index(fields=['pitch_file', 'order_id']),
        ]

class TradeBreakMessage(MessageBase):
    """Model for Trade Break message type"""
    trade_id = models.CharField(max_length=50, default='', help_text="ID of the trade being broken")
    
    def __str__(self):
        return f"Trade Break: {self.trade_id} - {self.symbol}"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'trade_id']),
        ]

class AuctionMessage(MessageBase):
    """Model for Auction message type"""
    auction_type = models.CharField(max_length=1, default='O', help_text="Type of auction")
    reference_price = models.DecimalField(max_digits=19, decimal_places=8, default=0.0, help_text="Reference price of the auction")
    
    def __str__(self):
        return f"Auction: {self.symbol} - Type: {self.auction_type} - Ref Price: {self.reference_price}"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'symbol']),
        ]

class SystemEventMessage(MessageBase):
    """Model for System Event message type"""
    event_code = models.CharField(max_length=1, default='S', help_text="Code indicating the type of system event")
    
    def __str__(self):
        return f"System Event: {self.event_code} at {self.timestamp}"
    
    class Meta:
        indexes = [
            models.Index(fields=['pitch_file', 'event_code']),
        ] 