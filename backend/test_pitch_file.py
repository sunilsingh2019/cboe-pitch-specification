#!/usr/bin/env python
"""
Test script to process a PITCH data file directly without using the API.
This helps debug file processing issues.
"""

import sys
import os

# Sample data if no file is provided
SAMPLE_DATA = """
SA0000123456ABC
SD0000987654DEF
SE0000111111GHI
SA0000222222JKL
SB0000333333MNO
SC0000444444PQR
SA0000555555STU
SA0000666666VWX
SD0000777777YZA
SB0000888888BCD
"""


def process_pitch_file(file_path=None):
    """Process a PITCH data file and count message types."""
    message_counts = {}
    
    if file_path:
        # Process a file
        print(f"Processing file: {file_path}")
        try:
            with open(file_path, 'r') as file:
                lines = file.readlines()
        except Exception as e:
            print(f"Error reading file: {e}")
            return None
    else:
        # Use sample data
        print("Using sample data")
        lines = SAMPLE_DATA.strip().split('\n')
    
    # Count message types
    for line in lines:
        # Skip empty lines
        line = line.strip()
        if not line:
            continue
        
        print(f"Processing line: {line[:20]}...")
        
        # Ignore the first character ('S') in each line
        if line.startswith('S') and len(line) > 1:
            # Extract the message type (first character after 'S')
            message_type = line[1]
            
            # Update the count for this message type
            if message_type in message_counts:
                message_counts[message_type] += 1
            else:
                message_counts[message_type] = 1
        else:
            print(f"Skipping invalid line: {line[:20]}...")
    
    return message_counts


if __name__ == "__main__":
    file_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    message_counts = process_pitch_file(file_path)
    
    if message_counts:
        print("\nMessage type counts:")
        for message_type, count in sorted(message_counts.items()):
            print(f"  {message_type}: {count}")
        
        total = sum(message_counts.values())
        print(f"\nTotal messages: {total}")
    else:
        print("Failed to process file") 