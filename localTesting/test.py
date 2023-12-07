import base64

def get_command(x, y):
    offset = (x * 1000 + y) * 4
    
    print(f"BITFIELD board GET u4 {offset}")
    
def process_board(file_path='response'):
    with open(file_path, 'r') as file:
        # Read the single line and decode from Base64
        encoded_data = file.readline().strip()
        decoded_data = base64.b64decode(encoded_data)

        # Iterate over each byte (8 bits) in the decoded data
        i = 0
        for byte in decoded_data:
            # Extract two 4-bit values from each byte
            upper_half = byte >> 4
            lower_half = byte & 0x0F

            # Print the 4-bit values (as they represent tiles on the board)
            print(f"{i}: {upper_half}")
            print(f"{i+1}: {lower_half}")
            i += 2

# Call the function with the path to your file
process_board('response')


if __name__ == '__main__':
    get_command(100, 213)
    