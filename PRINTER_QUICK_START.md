# 🖨️ Printer System - Quick Start Guide

## 5-Minute Setup

### Step 1: Open Printer Settings (1 min)
1. Log in to POS as admin
2. Click **Settings** button in admin panel header
3. You'll see **Printer Configuration** panel on the left

### Step 2: Select Your Printer (1 min)
1. In "Select Printer" dropdown, choose your printer
   - If you see your printer name → Select it
   - If no printers → Connect printer and check driver installation
   - If unsure → Leave blank (will use PDF)

### Step 3: Set Paper Size (1 min)
1. Choose **58mm** or **80mm** based on your printer
   - 58mm = Standard thermal receipt printer (most common)
   - 80mm = Wider format
2. If unsure, check your printer manual or labels

### Step 4: Configure Print Behavior (1 min)
1. ✓ Check "Auto-Print Receipt After Payment" 
   - When checked: Receipts print automatically
   - When unchecked: Receipts save as PDF to review
   
2. Set "Number of Copies" 
   - Default = 1 (one receipt per transaction)
   - Can set 1-10 copies

### Step 5: Add Shop Details (1 min)
1. Enter **Shop Name** (e.g., "Eunika Collection")
2. Enter **Shop Phone** (e.g., "+254712345678")
3. Enter **Receipt Footer** (e.g., "Thank you! Visit again!")
4. (Optional) Enter Address and Email

### Step 6: Test & Save (Final!)
1. Click **🖨️ Print Test Receipt**
   - If prints → Success! ✓
   - If fails → Check printer connection
2. Click **✓ Save Settings**
3. Done! 🎉

---

## Using Printer in Daily Operations

### When You Sell Something
1. Add items to cart
2. Complete payment
3. Receipt automatically prints (if auto-print enabled)
4. No action needed! ✓

### When Receipt Doesn't Print
1. Check printer is powered on
2. Check paper is loaded
3. Check printer queue on Windows
4. Try printing test receipt again

### When You Need PDF Instead
1. Go to Settings
2. Uncheck "Auto-Print Receipt After Payment"
3. Now receipts save to Documents/receipts/ instead
4. You can review before customer takes receipt

### To Print Multiple Copies
1. Go to Settings
2. Set "Number of Copies" to desired number (2-10)
3. Save settings
4. Next receipt will print that many copies automatically

---

## Troubleshooting: 3 Most Common Issues

### ❌ "Printer not showing in dropdown"
```
✅ Solution:
1. Check printer is powered on
2. Check USB or network connection
3. Restart POS application
4. Check Windows Device Manager for printer
```

### ❌ "Receipts printing but look wrong"
```
✅ Solution:
1. Make sure paper size (58mm/80mm) matches your printer
2. Check you have thermal receipt paper (not regular paper)
3. Try printing test receipt to verify
```

### ❌ "Settings don't save"
```
✅ Solution:
1. Click "✓ Save Settings" button (don't forget!)
2. Wait for "Settings saved successfully!" message
3. Restart the application
4. Check again that settings persisted
```

---

## Documentation Reference

For more detailed information, see:
- **Full Setup Guide** → `PRINTER_SETUP_GUIDE.md`
- **Technical Details** → `PRINTER_IMPLEMENTATION.md`
- **Verification** → `PRINTER_VERIFICATION_CHECKLIST.md`

---

## Key Features at a Glance

| Feature | Supported |
|---------|-----------|
| Thermal Printers (58mm/80mm) | ✓ Yes |
| Network Printers | ✓ Yes |
| USB Printers | ✓ Yes |
| Auto-Print After Payment | ✓ Yes |
| Multiple Copies (1-10) | ✓ Yes |
| PDF Fallback | ✓ Yes |
| Custom Footer | ✓ Yes |
| Receipt Logo | ✓ Yes |
| Service Receipts | ✓ Yes |
| Tailoring Receipts | ✓ Yes |

---

## Tips for Best Results

1. **Use thermal receipt paper** - Regular paper doesn't work well
2. **58mm is standard** - Most POS thermal printers use this
3. **Keep printer online** - Check status in Windows settings
4. **Clean printer regularly** - Improves print quality
5. **Update drivers** - Latest printer drivers = best compatibility
6. **Test first** - Use "Print Test Receipt" before going live

---

## Default Settings

If you just installed, defaults are:
- **Printer**: None (PDF mode)
- **Paper Size**: 58mm
- **Auto-Print**: Disabled
- **Copies**: 1
- **Footer**: "Thank you for your business!"

You can change any of these in Settings anytime.

---

## Success! You're Ready 🎉

Your printer is now configured and ready to use with your POS system.

- ✅ Settings are saved to database
- ✅ Receipts will auto-print on sales
- ✅ Multiple copies work automatically  
- ✅ PDF fallback if printer is unavailable
- ✅ Shop details appear on all receipts

**Happy selling! 📟**

---

*For support or questions, check PRINTER_SETUP_GUIDE.md or PRINTER_IMPLEMENTATION.md*
