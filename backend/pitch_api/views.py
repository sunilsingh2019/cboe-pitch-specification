from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.pagination import PageNumberPagination
from .serializers import (
    FileUploadSerializer, MessageCountSerializer, 
    PitchFileSerializer, PitchFileDetailSerializer
)
from .models import (
    PitchFile, MessageType, Symbol, AddOrderMessage, ModifyOrderMessage, 
    CancelOrderMessage, DeleteOrderMessage, TradeMessage, TradeBreakMessage, 
    AuctionMessage, SystemEventMessage
)
import re
from django.shortcuts import get_object_or_404

# Pagination class for message data
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'limit'
    max_page_size = 1000

class PitchFileUploadView(APIView):
    """
    API endpoint for uploading and processing PITCH data files.
    """
    permission_classes = [IsAuthenticated]  # Require authentication for file uploads
    
    @swagger_auto_schema(
        operation_description="Upload and process a PITCH data file",
        request_body=FileUploadSerializer,
        responses={
            200: openapi.Response(
                description="Message types counted successfully",
                schema=MessageCountSerializer
            ),
            400: "Bad request",
            500: "Internal server error"
        },
        tags=['PITCH Processing']
    )
    def post(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        
        try:
            # Process the file and count message types
            message_counts = {}
            line_count = 0
            
            # Define CBOE PITCH message types based on the specification
            message_types = {
                'A': 'Add Order (short)',
                'd': 'Add Order (long)',
                '1': 'Add Order (extended)',
                'E': 'Order Executed',
                'X': 'Order Cancel',
                'P': 'Trade (short)',
                'r': 'Trade (long)',
                '2': 'Trade (extended)',
                'B': 'Trade Break',
                'H': 'Trading Status',
                'I': 'Auction Update',
                '3': 'Auction Update (extended)',
                'J': 'Auction Summary',
                '4': 'Auction Summary (extended)',
                'R': 'Retail Price Improvement',
                's': 'Symbol Clear'
            }
            
            # Track additional data
            symbols_seen = set()
            order_ids = set()
            execution_ids = set()
            
            # Create the PitchFile record first so we can reference it
            pitch_file = PitchFile.objects.create(
                file_name=uploaded_file.name,
                uploaded_by=request.user,  # Always assign to the authenticated user
                file_size=uploaded_file.size,
                total_lines=0,  # Will update at the end
                unique_symbols_count=0,  # Will update at the end
                unique_order_ids_count=0,  # Will update at the end
                unique_execution_ids_count=0  # Will update at the end
            )
            
            # Lists to store message objects for bulk create
            add_order_messages = []
            modify_order_messages = []
            cancel_order_messages = []
            delete_order_messages = []
            trade_messages = []
            trade_break_messages = []
            auction_messages = []
            system_event_messages = []
            
            # Read the file line by line
            for line in uploaded_file:
                line_count += 1
                
                # Decode the line if it's in bytes
                try:
                    if isinstance(line, bytes):
                        line = line.decode('utf-8', errors='replace').strip()
                    elif isinstance(line, str):
                        line = line.strip()
                    else:
                        line = str(line).strip()
                except Exception as e:
                    print(f"Error decoding line {line_count}: {e}")
                    continue
                
                # Skip empty lines
                if not line:
                    continue
                
                # Debug info
                print(f"Processing line {line_count}: {line[:40]}...")
                
                # Extract timestamp and message type
                if len(line) > 8:
                    try:
                        timestamp_str = line[:8].strip()
                        # Handle both hexadecimal and alphanumeric timestamp strings
                        try:
                            timestamp = int(timestamp_str, 16) if timestamp_str else 0  # Convert hex to int
                        except ValueError:
                            # If timestamp can't be converted to hex, store it as a string representation
                            # This prevents the ValueError for invalid literal for int() with base 16
                            timestamp = 0  # Default to 0 for timestamp when conversion fails
                            print(f"Non-hex timestamp encountered: {timestamp_str}, using 0 instead")
                        
                        # Extract message type - ensure we're looking at the right position
                        # For non-hex timestamps, we need to be more flexible with the format
                        if len(line) > 8:
                            message_type = line[8:9]
                        else:
                            # If line is too short, use a default message type
                            message_type = 'U'  # U for unknown
                        
                        # Count message types
                        type_name = message_types.get(message_type, f"Uncategorized ({message_type})")
                        if type_name in message_counts:
                            message_counts[type_name] += 1
                        else:
                            message_counts[type_name] = 1
                        
                        # Process based on PITCH message type
                        if message_type in ['A', 'd', '1']:  # Add Order messages
                            # Extract fields
                            order_id = line[9:21].strip() if len(line) > 21 else ''
                            
                            # Add a fallback extraction to find order IDs in non-standard formats
                            if not order_id or order_id == '':
                                # Try to find patterns that look like order IDs
                                # Order IDs are often numeric or alphanumeric sequences
                                import re
                                # Look for numeric or alphanumeric sequences of 6+ characters
                                order_id_patterns = re.findall(r'[A-Z0-9]{6,12}', line) 
                                if order_id_patterns:
                                    # Use the first match as the order ID
                                    order_id = order_id_patterns[0]
                                    print(f"Found order ID using pattern matching: {order_id}")
                            
                            # Different formats have different field positions
                            if message_type == 'A':  # short format
                                side = line[21:22] if len(line) > 22 else 'B'
                                symbol = line[28:34].strip() if len(line) > 34 else ''
                                price_str = line[34:44].strip() if len(line) > 44 else '0'
                                quantity_str = line[44:54].strip() if len(line) > 54 else '0'
                            else:  # long and extended formats
                                side = line[21:22] if len(line) > 22 else 'B'
                                symbol = line[28:36].strip() if len(line) > 36 else ''
                                price_str = line[36:50].strip() if len(line) > 50 else '0'
                                quantity_str = line[50:60].strip() if len(line) > 60 else '0'
                            
                            # Add a fallback extraction to find symbols in non-standard formats
                            if not symbol and len(line) > 30:
                                # Try to find alphanumeric patterns that look like symbols
                                # Many symbols are 3-8 characters long and contain upper case letters and numbers
                                import re
                                symbol_patterns = re.findall(r'[A-Z0-9]{3,8}', line[21:])
                                if symbol_patterns:
                                    symbol = symbol_patterns[0]
                                    print(f"Found symbol using pattern matching: {symbol}")
                            
                            try:
                                price = float(price_str) / 10000.0 if price_str else 0.0
                                quantity = int(quantity_str) if quantity_str else 0
                            except (ValueError, TypeError):
                                price = 0.0
                                quantity = 0
                            
                            # Create AddOrderMessage object
                            add_order_messages.append(AddOrderMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                order_id=order_id,
                                symbol=symbol,
                                price=price,
                                quantity=quantity,
                                side=side if side in ['B', 'S'] else 'B'
                            ))
                            
                            # Update tracking
                            if order_id:
                                order_ids.add(order_id)
                            if symbol:
                                symbols_seen.add(symbol)
                        
                        elif message_type in ['E']:  # Order Executed
                            # Extract fields
                            order_id = line[9:21].strip() if len(line) > 21 else ''
                            executed_shares_str = line[21:27].strip() if len(line) > 27 else '0'
                            execution_id = line[27:39].strip() if len(line) > 39 else ''
                            
                            try:
                                executed_shares = int(executed_shares_str) if executed_shares_str else 0
                            except (ValueError, TypeError):
                                executed_shares = 0
                            
                            # This is actually a type of trade
                            trade_messages.append(TradeMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                order_id=order_id,
                                trade_id=execution_id,
                                executed_shares=executed_shares
                            ))
                            
                            # Update tracking
                            if order_id:
                                order_ids.add(order_id)
                            if execution_id:
                                execution_ids.add(execution_id)
                        
                        elif message_type in ['X']:  # Order Cancel
                            # Extract fields
                            order_id = line[9:21].strip() if len(line) > 21 else ''
                            canceled_shares_str = line[21:27].strip() if len(line) > 27 else '0'
                            
                            try:
                                canceled_shares = int(canceled_shares_str) if canceled_shares_str else 0
                            except (ValueError, TypeError):
                                canceled_shares = 0
                            
                            # Create CancelOrderMessage object
                            cancel_order_messages.append(CancelOrderMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                order_id=order_id,
                                canceled_shares=canceled_shares
                            ))
                            
                            # Update tracking
                            if order_id:
                                order_ids.add(order_id)
                        
                        elif message_type in ['P', 'r', '2']:  # Trade messages
                            # Extract fields - fields vary by message subtype
                            order_id = line[9:21].strip() if len(line) > 21 else ''
                            
                            if message_type == 'P':  # short format
                                side = line[21:22] if len(line) > 22 else 'B'
                                quantity_str = line[22:28].strip() if len(line) > 28 else '0'
                                symbol = line[28:34].strip() if len(line) > 34 else ''
                                price_str = line[34:44].strip() if len(line) > 44 else '0'
                                execution_id = line[44:56].strip() if len(line) > 56 else ''
                            else:  # long and extended formats
                                side = line[21:22] if len(line) > 22 else 'B'
                                quantity_str = line[22:28].strip() if len(line) > 28 else '0'
                                symbol = line[28:36].strip() if len(line) > 36 else ''
                                price_str = line[36:50].strip() if len(line) > 50 else '0'
                                execution_id = line[50:62].strip() if len(line) > 62 else ''
                            
                            try:
                                price = float(price_str) / 10000.0 if price_str else 0.0
                                quantity = int(quantity_str) if quantity_str else 0
                            except (ValueError, TypeError):
                                price = 0.0
                                quantity = 0
                            
                            # Create TradeMessage object
                            trade_messages.append(TradeMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                order_id=order_id,
                                symbol=symbol,
                                price=price,
                                quantity=quantity,
                                trade_id=execution_id,
                                executed_shares=quantity
                            ))
                            
                            # Update tracking
                            if order_id:
                                order_ids.add(order_id)
                            if execution_id:
                                execution_ids.add(execution_id)
                            if symbol:
                                symbols_seen.add(symbol)
                        
                        elif message_type in ['B']:  # Trade Break
                            # Extract fields
                            execution_id = line[9:21].strip() if len(line) > 21 else ''
                            
                            # Create TradeBreakMessage object
                            trade_break_messages.append(TradeBreakMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                trade_id=execution_id
                            ))
                            
                            # Update tracking
                            if execution_id:
                                execution_ids.add(execution_id)
                        
                        elif message_type in ['I', '3', 'J', '4']:  # Auction messages
                            # Extract fields
                            symbol = line[9:17].strip() if len(line) > 17 else ''
                            auction_type = line[17:18] if len(line) > 18 else 'O'
                            
                            # Reference price is available in some formats
                            reference_price_str = '0'
                            if message_type in ['I', '3'] and len(line) > 60:
                                reference_price_str = line[50:60].strip()
                            elif message_type in ['J', '4'] and len(line) > 40:
                                reference_price_str = line[30:40].strip()
                            
                            try:
                                reference_price = float(reference_price_str) / 10000.0 if reference_price_str else 0.0
                            except (ValueError, TypeError):
                                reference_price = 0.0
                            
                            # Create AuctionMessage object
                            auction_messages.append(AuctionMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                symbol=symbol,
                                auction_type=auction_type,
                                reference_price=reference_price
                            ))
                            
                            # Update tracking
                            if symbol:
                                symbols_seen.add(symbol)
                        
                        elif message_type in ['H', 'R', 's']:  # System event messages
                            # Extract fields
                            symbol = line[9:17].strip() if len(line) > 17 else ''
                            event_code = line[17:18] if len(line) > 18 else 'S'
                            
                            # Create SystemEventMessage object
                            system_event_messages.append(SystemEventMessage(
                                pitch_file=pitch_file,
                                message_type=type_name,
                                timestamp=timestamp,
                                symbol=symbol,
                                event_code=event_code
                            ))
                            
                            # Update tracking
                            if symbol:
                                symbols_seen.add(symbol)
                    
                    except Exception as e:
                        import traceback
                        print(f"Error processing line {line_count}: {str(e)}")
                        print(traceback.format_exc())
                        
                        # Even if we couldn't fully parse the line, try to extract any symbols 
                        # that might be present using pattern matching
                        try:
                            import re
                            # Look for potential symbols in the line
                            symbol_patterns = re.findall(r'[A-Z0-9]{3,8}', line)
                            for potential_symbol in symbol_patterns:
                                # Skip obvious non-symbols like timestamps
                                if not potential_symbol.isdigit() and len(potential_symbol) >= 3:
                                    symbols_seen.add(potential_symbol)
                                    print(f"Extracted potential symbol from error line: {potential_symbol}")
                        except Exception as symbol_ex:
                            print(f"Error extracting symbols from error line: {str(symbol_ex)}")
                        
                        # Continue processing other lines even if this one failed
                
                else:
                    # Handle lines that don't fit PITCH format
                    if "Uncategorized Format" in message_counts:
                        message_counts["Uncategorized Format"] += 1
                    else:
                        message_counts["Uncategorized Format"] = 1
            
            # Bulk create message objects (in batches for better performance)
            batch_size = 1000
            
            if add_order_messages:
                for i in range(0, len(add_order_messages), batch_size):
                    AddOrderMessage.objects.bulk_create(add_order_messages[i:i+batch_size])
            
            if modify_order_messages:
                for i in range(0, len(modify_order_messages), batch_size):
                    ModifyOrderMessage.objects.bulk_create(modify_order_messages[i:i+batch_size])
            
            if cancel_order_messages:
                for i in range(0, len(cancel_order_messages), batch_size):
                    CancelOrderMessage.objects.bulk_create(cancel_order_messages[i:i+batch_size])
            
            if delete_order_messages:
                for i in range(0, len(delete_order_messages), batch_size):
                    DeleteOrderMessage.objects.bulk_create(delete_order_messages[i:i+batch_size])
            
            if trade_messages:
                for i in range(0, len(trade_messages), batch_size):
                    TradeMessage.objects.bulk_create(trade_messages[i:i+batch_size])
            
            if trade_break_messages:
                for i in range(0, len(trade_break_messages), batch_size):
                    TradeBreakMessage.objects.bulk_create(trade_break_messages[i:i+batch_size])
            
            if auction_messages:
                for i in range(0, len(auction_messages), batch_size):
                    AuctionMessage.objects.bulk_create(auction_messages[i:i+batch_size])
            
            if system_event_messages:
                for i in range(0, len(system_event_messages), batch_size):
                    SystemEventMessage.objects.bulk_create(system_event_messages[i:i+batch_size])
            
            # Add summary information
            summary = {
                "total_lines": line_count,
                "unique_symbols": len(symbols_seen),
                "unique_order_ids": len(order_ids),
                "unique_execution_ids": len(execution_ids)
            }
            
            # If no messages were processed, add at least one category
            if not message_counts:
                message_counts["No PITCH Messages Found"] = 1
            
            # Debug info
            print(f"Total lines processed: {line_count}")
            print(f"Message counts: {message_counts}")
            print(f"Summary: {summary}")
            print(f"Detected order IDs: {len(order_ids)}")
            print(f"Detected symbols: {len(symbols_seen)}")
            
            # If we have order IDs but they weren't properly detected during processing,
            # make a special attempt to extract them
            if len(order_ids) == 0 and line_count > 0:
                print("No order IDs detected, attempting to extract from raw data...")
                try:
                    # Go through the file again looking specifically for order IDs
                    uploaded_file.seek(0)  # Go back to beginning of file
                    import re
                    for line in uploaded_file:
                        # Decode the line if it's in bytes
                        if isinstance(line, bytes):
                            line = line.decode('utf-8', errors='replace').strip()
                        elif isinstance(line, str):
                            line = line.strip()
                        else:
                            line = str(line).strip()
                            
                        # Skip empty lines
                        if not line:
                            continue
                            
                        # Look for patterns that might be order IDs (alphanumeric strings)
                        # usually order IDs have a specific format and length (often 9-12 chars)
                        potential_ids = re.findall(r'[A-Z0-9]{6,12}', line)
                        for potential_id in potential_ids:
                            # Add it if it looks reasonable
                            if potential_id.isalnum() and not potential_id.isalpha():
                                order_ids.add(potential_id)
                    
                    print(f"After additional extraction: found {len(order_ids)} potential order IDs")
                except Exception as e:
                    print(f"Error during additional order ID extraction: {str(e)}")
            
            # Update the PitchFile record with final counts
            pitch_file.total_lines = line_count
            pitch_file.unique_symbols_count = len(symbols_seen)
            pitch_file.unique_order_ids_count = len(order_ids)
            pitch_file.unique_execution_ids_count = len(execution_ids)
            pitch_file.save()
            
            # Save message types and counts
            for message_type, count in message_counts.items():
                MessageType.objects.create(
                    pitch_file=pitch_file,
                    message_type=message_type,
                    count=count
                )
            
            # Save symbols (limit to first 1000 for performance)
            for symbol in list(symbols_seen)[:1000]:
                Symbol.objects.create(
                    pitch_file=pitch_file,
                    symbol=symbol
                )
            
            # Combine message counts and summary
            result = {
                'message_counts': message_counts,
                'summary': summary,
                'symbols': list(symbols_seen)[:100]  # Include up to 100 symbols
            }
            
            # Return the results
            return Response(result, status=status.HTTP_200_OK)
                
        except Exception as e:
            import traceback
            print(f"Error processing file: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Error processing file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 

class PitchFileListView(APIView):
    """
    API endpoint for listing previously uploaded PITCH files.
    """
    permission_classes = [IsAuthenticated]  # Change to IsAuthenticated to ensure only logged-in users can access
    
    @swagger_auto_schema(
        operation_description="List all uploaded PITCH files for the current user",
        responses={
            200: PitchFileSerializer(many=True),
            500: "Internal server error"
        },
        tags=['PITCH Files']
    )
    def get(self, request, *args, **kwargs):
        try:
            # Get files belonging to the current user only, most recent first
            files = PitchFile.objects.filter(uploaded_by=request.user).order_by('-uploaded_at')
            
            serializer = PitchFileSerializer(files, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error retrieving files: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PitchFileDetailView(APIView):
    """
    API endpoint for retrieving details of a specific PITCH file.
    """
    permission_classes = [IsAuthenticated]  # Change to IsAuthenticated to ensure only logged-in users can access
    
    @swagger_auto_schema(
        operation_description="Get details of a specific PITCH file owned by the current user",
        responses={
            200: PitchFileDetailSerializer(),
            403: "Permission denied",
            404: "File not found",
            500: "Internal server error"
        },
        tags=['PITCH Files']
    )
    def get(self, request, file_id, *args, **kwargs):
        try:
            # Get the file by ID and filter by the current user
            pitch_file = get_object_or_404(PitchFile, id=file_id, uploaded_by=request.user)
            
            serializer = PitchFileDetailSerializer(pitch_file)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            if isinstance(e, PitchFile.DoesNotExist):
                return Response(
                    {'error': f'File not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {'error': f'Error retrieving file details: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_description="Delete a specific PITCH file owned by the current user",
        responses={
            204: "File deleted successfully",
            403: "Permission denied",
            404: "File not found",
            500: "Internal server error"
        },
        tags=['PITCH Files']
    )
    def delete(self, request, file_id, *args, **kwargs):
        try:
            # Get the file by ID and filter by the current user
            pitch_file = get_object_or_404(PitchFile, id=file_id, uploaded_by=request.user)
            
            # Delete all related data
            MessageType.objects.filter(pitch_file=pitch_file).delete()
            Symbol.objects.filter(pitch_file=pitch_file).delete()
            
            # Delete message-specific data
            AddOrderMessage.objects.filter(pitch_file=pitch_file).delete()
            ModifyOrderMessage.objects.filter(pitch_file=pitch_file).delete()
            CancelOrderMessage.objects.filter(pitch_file=pitch_file).delete()
            DeleteOrderMessage.objects.filter(pitch_file=pitch_file).delete()
            TradeMessage.objects.filter(pitch_file=pitch_file).delete()
            TradeBreakMessage.objects.filter(pitch_file=pitch_file).delete()
            AuctionMessage.objects.filter(pitch_file=pitch_file).delete()
            SystemEventMessage.objects.filter(pitch_file=pitch_file).delete()
            
            # Delete the file itself
            pitch_file.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            if isinstance(e, PitchFile.DoesNotExist):
                return Response(
                    {'error': f'File not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {'error': f'Error deleting file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 