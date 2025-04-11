from rest_framework import serializers
from .models import (
    PitchFile, MessageType, Symbol, AddOrderMessage, ModifyOrderMessage,
    CancelOrderMessage, DeleteOrderMessage, TradeMessage, TradeBreakMessage, 
    AuctionMessage, SystemEventMessage
)

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    
class MessageCountSerializer(serializers.Serializer):
    message_counts = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Count of each message type"
    )

class SymbolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symbol
        fields = ['symbol']

class MessageTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageType
        fields = ['message_type', 'count']

class PitchFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PitchFile
        fields = [
            'id', 'file_name', 'uploaded_at', 'file_size', 
            'total_lines', 'unique_symbols_count', 
            'unique_order_ids_count', 'unique_execution_ids_count',
            'uploaded_by'
        ]

class PitchFileDetailSerializer(serializers.ModelSerializer):
    message_counts = serializers.SerializerMethodField()
    symbols = serializers.SerializerMethodField()
    
    class Meta:
        model = PitchFile
        fields = [
            'id', 'file_name', 'uploaded_at', 'file_size', 
            'total_lines', 'unique_symbols_count', 
            'unique_order_ids_count', 'unique_execution_ids_count',
            'uploaded_by', 'message_counts', 'symbols'
        ]
    
    def get_message_counts(self, obj):
        message_types = obj.message_types.all()
        return {mt.message_type: mt.count for mt in message_types}
    
    def get_symbols(self, obj):
        symbols = obj.symbols.all()[:100]  # Limit to 100 symbols
        return [symbol.symbol for symbol in symbols]

# Message-specific serializers
class AddOrderMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddOrderMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'side'
        ]

class ModifyOrderMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModifyOrderMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'modified_shares'
        ]

class CancelOrderMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CancelOrderMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'canceled_shares'
        ]

class DeleteOrderMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeleteOrderMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity'
        ]

class TradeMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'trade_id', 'executed_shares'
        ]

class TradeBreakMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeBreakMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'trade_id'
        ]

class AuctionMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuctionMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'auction_type', 'reference_price'
        ]

class SystemEventMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemEventMessage
        fields = [
            'id', 'message_type', 'timestamp', 'order_id', 'symbol',
            'price', 'quantity', 'event_code'
        ] 