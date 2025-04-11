from django.contrib import admin
from .models import PitchFile, MessageType, Symbol

class MessageTypeInline(admin.TabularInline):
    model = MessageType
    extra = 0

class SymbolInline(admin.TabularInline):
    model = Symbol
    extra = 0
    max_num = 20  # Limit the number of symbols displayed for performance

@admin.register(PitchFile)
class PitchFileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'uploaded_by', 'uploaded_at', 'file_size', 'total_lines')
    list_filter = ('uploaded_at', 'uploaded_by')
    search_fields = ('file_name',)
    inlines = [MessageTypeInline, SymbolInline]
    
@admin.register(MessageType)
class MessageTypeAdmin(admin.ModelAdmin):
    list_display = ('message_type', 'count', 'pitch_file')
    list_filter = ('message_type',)
    search_fields = ('message_type',)

@admin.register(Symbol)
class SymbolAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'pitch_file')
    list_filter = ('symbol',)
    search_fields = ('symbol',) 