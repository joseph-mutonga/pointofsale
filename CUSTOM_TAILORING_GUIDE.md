# Custom Tailoring Order System - User Guide

## Overview
The **Custom Tailoring** module allows customers to order custom-made clothing with full measurement recording, material selection, style gallery reference, payment tracking, and receipt printing.

## Accessing the Feature
1. Log in to the system
2. From the **Hub Dashboard**, click on **"Custom Tailoring"** (✂ icon)

## Features Available

### 1. Creating a New Custom Order
The system allows you to record:

#### Customer Information
- Customer Name
- Phone Number

#### Design & Material Selection
- **Reference Style**: Select from gallery images (Style Gallery)
- **Material**: Choose from available materials OR mark as "Customer Provided"

#### Measurements Recording (in inches)
- Chest
- Waist
- Hips
- Shoulder
- Length
- Additional notes (free text area for special instructions)

#### Pricing & Payment
- **Total Price**: Full cost of the custom garment
- **Deposit Amount**: Initial payment required
- **Payment Mode**: Cash or M-Pesa
  - If M-Pesa: Requires confirmation code

#### Deadline
- Completion deadline date

### 2. Order Management
Once created, orders are tracked with:
- **Unique Order Code**: e.g., ORD-ABC123
- **Customer Details**: Name and phone
- **Bespoke Details**: Style reference and fabric
- **Deadline**: Color-coded (red if overdue)
- **Payment Status**: Shows paid/total and balance
- **Action Buttons**:
  - "Pay Balance" - Accept additional payments
  - "Mark Collected" - When customer collects the finished item

### 3. Receipt Printing
Two types of receipts are automatically printed:

#### Initial Deposit Receipt
- Printed when order is created
- Shows order code, customer details, style, material, deadline
- Details total price, deposit paid, and balance remaining

#### Balance Payment Receipt
- Printed when customer makes additional payments
- Shows amount paid this time, total paid so far, and remaining balance

### 4. Payment Tracking
The system tracks:
- Initial deposit
- Subsequent payments
- Full payment completion
- Collection status

### 5. Search & Filter
- Search by customer name, phone, or order code
- Easy to find active orders

## Database Tables Used
The system uses the following database structure:

### `tailoring_orders` Table
```sql
- id: Order ID
- order_code: Unique order reference (ORD-XXXXXX)
- customer_name: Customer's name
- customer_phone: Contact number
- style_id: Reference to gallery image
- material_id: Reference to selected material
- measurements: JSON string containing all measurements
- total_price: Full order cost
- paid_amount: Amount paid so far
- deadline: Completion deadline date
- status: pending, in_progress, ready, or collected
- created_at: Order creation timestamp
- updated_at: Last modification timestamp
```

### `gallery` Table
Stores style reference images:
```sql
- id: Gallery item ID
- title: Design/style name
- description: Brief description
- image_data: Base64 encoded image
- created_at: Upload timestamp
```

### `materials` Table
Available fabric materials:
```sql
- id: Material ID
- name: Material name (e.g., Silk, Cotton, Wool)
- created_at: Creation timestamp
```

## Integration with Sales System
All payments (deposits and balance payments) are automatically recorded in the sales system:
- Creates sale record with type = 'tailoring'
- Generates sale items for reporting
- Tracks payment mode (Cash/M-Pesa)
- Links to cashier for accountability

## Example Workflow

1. **Customer Visits Shop**
   - Browses **Style Gallery** for design inspiration
   - Selects desired style

2. **Order Creation**
   - Staff opens **Custom Tailoring** module
   - Enters customer details
   - Selects reference style from gallery
   - Chooses material (or marks as customer-provided)
   - Records all measurements
   - Sets total price and collects deposit
   - Defines completion deadline
   - System generates order code and prints deposit receipt

3. **Production**
   - Order appears in "Active Bespoke Orders" list
   - Staff can track progress
   - Deadline monitoring (turns red if overdue)

4. **Customer Returns**
   - When garment is ready, customer is notified
   - Customer comes to collect
   - Staff accepts balance payment (if any)
   - System prints balance receipt
   - Marks order as "Collected"

## Tips for Use
- Use the **Style Gallery** module to build a reference collection
- Add materials in the **Resources** section (Admin Panel)
- Always record accurate measurements
- Set realistic deadlines
- Ensure payment mode is correctly selected (especially for M-Pesa tracking)

## Already Implemented Features ✅
- ✅ Material selection from database
- ✅ Style selection from gallery images
- ✅ Complete measurement recording system
- ✅ Payment acceptance with deposit support
- ✅ Deadline tracking
- ✅ Receipt generation (deposit + balance)
- ✅ Full payment collection on item collection
- ✅ Order status tracking
- ✅ Search functionality
- ✅ Sales integration for reporting
