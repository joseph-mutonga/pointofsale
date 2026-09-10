# Printer Communication & Receipt Configuration Guide

## Overview
Your POS system now has full printer communication capabilities with customizable receipt templates, paper sizes, and auto-printing features.

## Features

### ✅ Printer Selection
- Select from any available networked or local USB printers
- Fallback to PDF if printer is unavailable
- Support for Windows network printers

### ✅ Paper Size Support
- **58mm Thermal** - Compact format (standard POS thermal)
- **80mm Thermal** - Wider format with more content space
- Receipts automatically format based on selected paper size

### ✅ Auto-Print Functionality
- Enable/disable automatic printing after payment
- When disabled, receipts go to PDF for preview
- Configurable from Settings panel

### ✅ Multiple Copies
- Print 1-10 copies per transaction
- Automatic delay between copies (500ms)
- Useful for duplicate receipts (customer + shop copies)

### ✅ Receipt Customization
- Shop name, address, phone
- Custom footer message on every receipt
- Support for service receipts, tailoring orders, fittings
- Base64 logo integration for thermal printer compatibility

## Configuration Steps

### Step 1: Access Printer Settings
1. Open Admin Panel → **Settings**
2. You'll see **Printer Configuration** panel on the left
3. And **Global Shop Settings** on the right

### Step 2: Configure Printer
1. **Select Printer**: Choose your printer from the dropdown
   - Will show available printers on your system
   - If no printer is available, system uses PDF mode
   - Can select "Use Default / PDF Fallback"

2. **Paper Size**: Select 58mm or 80mm thermal paper
   - 58mm: Compact, standard POS thermal format
   - 80mm: Wider format, better for detailed receipts

3. **Auto-Print Receipt**: Check/uncheck
   - ✓ Checked: Automatic silent printing after payment
   - ☐ Unchecked: Generates PDF for preview

4. **Number of Copies**: Set 1-10
   - Default: 1
   - Useful for duplicate receipts

### Step 3: Customize Receipt
1. **Shop Name**: Enter your business name
2. **Shop Address**: Enter physical location
3. **Shop Phone**: Enter contact number
4. **Receipt Footer**: Custom message (e.g., "Thank you!" or return policy)

### Step 4: Test the Setup
1. Click **🖨️ Print Test Receipt**
2. Check your printer for output
3. If successful, settings are configured correctly
4. If failed, check:
   - Printer is connected and powered on
   - Printer drivers are installed
   - Printer is set as default (Windows)

### Step 5: Save Settings
1. Click **✓ Save Settings**
2. All printer configuration is now persistent
3. Settings apply to all future receipts

## Receipt Types & Printing

The system automatically prints different receipt formats based on transaction type:

### Sales Receipt
- **For**: Product sales, material purchases
- **Contents**: Items, quantities, prices, payment mode
- **Automatic**: Yes (if auto-print enabled)

### Service Receipt
- **For**: Service orders, custom work
- **Contents**: Service description, amounts paid, balance due
- **Automatic**: Yes (if auto-print enabled)

### Tailoring Receipt
- **For**: Tailoring orders, deposits
- **Contents**: Customer info, style, material, deadline, pricing
- **Automatic**: Yes (if auto-print enabled)

### Fitting/Deposit Receipt
- **For**: Fitting deposits, installment plans
- **Contents**: Product, variation, amounts, balance
- **Automatic**: Yes (if auto-print enabled)

## Troubleshooting

### Problem: Printer not appearing in dropdown
**Solution:**
- Make sure printer is connected
- Install latest printer drivers
- Restart the application
- Check Windows Device Manager for printer status

### Problem: Printing fails silently
**Solution:**
- System automatically falls back to PDF
- PDFs are saved in: `Documents/receipts/`
- Check that you have write permissions to Documents
- Ensure printer driver is compatible

### Problem: Receipt format looks wrong
**Solution:**
- Check paper size matches your printer
- For thermal printers: Usually 58mm
- For regular paper: Use 80mm setting
- Test print to confirm format

### Problem: Auto-print not working
**Solution:**
- Verify "Auto-Print Receipt After Payment" is checked in Settings
- Ensure printer is connected and online
- Check printer queue (may be paused)
- Try printing test receipt first

### Problem: Multiple copies not printing
**Solution:**
- Verify "Number of Copies" is set correctly (1-10)
- Check printer queue for errors
- Try printing fewer copies (test with 1 copy)
- Allow 1-2 seconds delay between transactions

## Advanced Settings

### PDF Storage
- Path: `C:\Users\[YourUsername]\Documents\receipts\`
- Naming: `receipt_[timestamp].pdf`
- All PDFs are automatically saved for record-keeping

### Database Settings
All settings are stored in SQLite database:
- `default_printer`: Selected printer name
- `paper_size`: '58mm' or '80mm'
- `auto_print_receipt`: 'true' or 'false'
- `print_copies`: '1' to '10'
- `shop_name`, `shop_address`, `shop_phone`: Business details
- `receipt_footer`: Custom message

### System-Level Integration
- Printer communication via the browser print dialog
- Silent printing to thermal printers (no dialogs)
- SILENTMODE: true for POS operation
- Automatic fallback to PDF if printer unavailable

## Testing Checklist

Before going live:
- [ ] Printer is connected and powered on
- [ ] Printer appears in dropdown
- [ ] Test receipt prints correctly
- [ ] Paper size matches printer (58mm or 80mm)
- [ ] Logo appears in receipt
- [ ] Shop details are correct
- [ ] Auto-print is working (if enabled)
- [ ] Multiple copies print correctly
- [ ] Receipt footer displays properly
- [ ] Backup PDFs are saved to Documents

## Support Notes

- Thermal printers are recommended for POS (fast, reliable, compact)
- 58mm is standard for retail/restaurant POS
- 80mm is better for detailed items or multiple items
- Test in quiet hours before peak business
- Keep printer driver up to date
- Regularly check receipt output quality
- Backup important transactions with PDF receipts

## Technical Details

### Receipt Generation
- HTML-based templates (CSS styled for thermal paper)
- Responsive to paper size (260px for 58mm, 360px for 80mm)
- Base64 logo encoded for printer compatibility
- Monospace font for alignment

### Printer Communication
- Uses browser print flow
- Non-blocking (async) printing
- Automatic retry mechanism
- PDF fallback on failure

### Performance
- Each print job: ~500ms-2s
- Multiple copies: 500ms delay between prints
- No impact on main application
- Background printing support

---

**For questions or issues, contact your system administrator.**
