# Printer System - Verification Checklist

Use this checklist to verify that all printer functionality is working correctly.

## Pre-Implementation Verification

- [ ] Printer is physically connected to the computer
- [ ] Printer power is ON
- [ ] Printer drivers are installed (check Device Manager on Windows)
- [ ] Printer appears in Windows Settings → Devices → Printers & scanners
- [ ] At least one printer is set as default (recommended)

## Post-Implementation Verification

### Part 1: Component Installation
- [ ] File `src/components/PrinterSettings.jsx` exists
- [ ] File `src/utils/receiptTemplates.js` exists  
- [ ] File `PRINTER_SETUP_GUIDE.md` exists
- [ ] File `PRINTER_IMPLEMENTATION.md` exists
- [ ] `src/AdminPanel.jsx` imports PrinterSettings
- [ ] `electron/main.cjs` has enhanced print handler
- [ ] No TypeScript/JSX syntax errors in IDE

### Part 2: Accessing Printer Settings
- [ ] Open the application
- [ ] Login as admin user
- [ ] Click "Settings" button in admin panel
- [ ] You see two panels: "Printer Configuration" (left) and "Global Shop Settings" (right)
- [ ] "Printer Configuration" shows:
  - Printer dropdown
  - Paper size selector
  - Auto-print checkbox
  - Number of copies input
  - Shop information fields
  - Test print button
  - Save settings button

### Part 3: Printer Selection
- [ ] Printer dropdown shows available printers
- [ ] Your printer name appears in the dropdown
- [ ] "(System Default)" indicator shows if applicable
- [ ] Can select "-- Use Default / PDF Fallback --" option
- [ ] Message shows "✓ X printer(s) available" or "⚠️ No printers found"

### Part 4: Paper Size Configuration
- [ ] Can select "58mm - Compact Thermal"
- [ ] Can select "80mm - Standard Thermal"
- [ ] Paper size description displays when hovering/selecting
- [ ] Selection is saved (persists after refresh)

### Part 5: Auto-Print Settings
- [ ] Checkbox "Auto-Print Receipt After Payment" exists
- [ ] Can check/uncheck the option
- [ ] When checked: receipts auto-print after payment
- [ ] When unchecked: receipts save as PDF instead
- [ ] Setting persists after app restart

### Part 6: Multiple Copies
- [ ] "Number of Copies" input field exists
- [ ] Accepts numbers 1-10
- [ ] Rejects values outside range (0, 11+)
- [ ] Default value is 1
- [ ] Setting persists after app restart

### Part 7: Shop Information
- [ ] Shop Name input field works
- [ ] Shop Address input field works
- [ ] Shop Phone input field works
- [ ] Shop Email input field works
- [ ] Receipt Footer textarea works
- [ ] All fields accept and save text
- [ ] Settings persist after app restart

### Part 8: Test Print Functionality
- [ ] "🖨️ Print Test Receipt" button is clickable
- [ ] Clicking button shows "🖨️ Printing..." state
- [ ] Button is disabled while printing
- [ ] Receipt prints to configured printer (or PDF if no printer)
- [ ] Test receipt shows:
  - Shop name
  - Address
  - Phone
  - Paper size being tested
  - Sample item and total
  - Footer message
  - Receipt footer text

### Part 9: Settings Persistence
- [ ] Change printer selection
- [ ] Click "✓ Save Settings"
- [ ] See "Printer settings saved successfully!" toast
- [ ] Restart the application
- [ ] Admin Panel → Settings
- [ ] Printer selection is still the same
- [ ] All other settings are preserved

### Part 10: Database Verification
- [ ] All settings saved to SQLite database
- [ ] Settings table exists in pos.db
- [ ] Can verify with SQLite browser (optional)
- [ ] Settings survive app crashes/restarts

### Part 11: Receipt Generation
- [ ] Complete a product sale
- [ ] Verify receipt generates with shop details
- [ ] Receipt shows configured footer message
- [ ] Test with 58mm and 80mm paper sizes
- [ ] Verify receipt format adapts correctly

### Part 12: Auto-Print with Sales
- [ ] Enable auto-print in settings
- [ ] Complete a sale
- [ ] Verify receipt auto-prints to printer
- [ ] No print dialog appears
- [ ] Disable auto-print in settings
- [ ] Complete another sale
- [ ] Verify receipt saves as PDF instead
- [ ] PDF opens in default viewer (if configured)

### Part 13: Multiple Copies
- [ ] Set number of copies to 2
- [ ] Save settings
- [ ] Complete a sale
- [ ] Verify 2 receipts print (or 2 PDFs generated)
- [ ] Test with 3 copies
- [ ] Verify 3 receipts print sequentially
- [ ] Verify ~500ms delay between prints
- [ ] Test with 1 copy
- [ ] Verify single receipt prints

### Part 14: Fallback to PDF
- [ ] Select a printer that doesn't exist (for testing)
- [ ] Try to print a receipt
- [ ] System falls back to PDF mode
- [ ] Toast message shows success
- [ ] PDF is saved to Documents/receipts/
- [ ] Filename format: receipt_[timestamp].pdf

### Part 15: Error Handling
- [ ] Disconnect printer power (while printing)
- [ ] System handles error gracefully
- [ ] Toast message shows error
- [ ] App remains responsive
- [ ] Can retry printing

### Part 16: Service & Tailoring Receipts
- [ ] Add a service order
- [ ] Verify service receipt auto-prints (if enabled)
- [ ] Verify service receipt format looks correct
- [ ] Add a tailoring order
- [ ] Verify tailoring receipt auto-prints
- [ ] Verify tailoring receipt shows order details

### Part 17: Receipt Content Accuracy
- [ ] Verify shop name appears on receipts
- [ ] Verify address appears on receipts
- [ ] Verify phone number appears on receipts
- [ ] Verify footer message appears on receipts
- [ ] Verify logo appears on receipts (base64 encoded)
- [ ] Verify all items and prices are correct
- [ ] Verify payment mode is shown
- [ ] Verify M-Pesa code (if applicable)
- [ ] Verify date/time is correct
- [ ] Verify cashier name is correct

### Part 18: Performance
- [ ] Single receipt prints in < 3 seconds
- [ ] Multiple copies (5x) print in < 5 seconds
- [ ] App remains responsive during printing
- [ ] Can continue selling while printing
- [ ] No lag in UI during print operations

### Part 19: Thermal Printer Specific (if applicable)
- [ ] 58mm thermal paper prints correctly
- [ ] 80mm thermal paper prints correctly
- [ ] No excessive white space on receipts
- [ ] Logo displays clearly on thermal paper
- [ ] Font sizes are readable
- [ ] Layout looks professional

### Part 20: Admin Panel Integration
- [ ] Settings view shows both panels
- [ ] Printer panel (left) and Shop panel (right)
- [ ] Both panels save independently
- [ ] Settings button highlights in header when active
- [ ] Can navigate between views without losing data

## Final Verification Summary

### ✅ All Checks Pass?
- [ ] Yes, ready for production
- [ ] Some failures (note below)
- [ ] Major issues (contact support)

### Notes & Issues:
```
[Write any issues or notes here]
_________________________________
_________________________________
_________________________________
```

## Troubleshooting Guide

### Issue: Printer dropdown is empty
**Action:**
1. Check printer is powered on and connected
2. Open Windows Settings → Devices → Printers & scanners
3. Verify printer appears there
4. Restart the POS application
5. Try adding printer through Windows first

### Issue: Test print button is grayed out
**Action:**
1. Make sure you have a printer selected
2. Check printer is online/ready
3. Verify printer queue is not paused
4. Close and reopen settings

### Issue: Settings don't save
**Action:**
1. Check browser console for errors (F12)
2. Verify database file is not locked
3. Restart the application
4. Check file permissions in app data directory

### Issue: Receipts print but look wrong
**Action:**
1. Verify paper size matches printer (58mm vs 80mm)
2. Check printer settings in Windows
3. Reinstall printer drivers
4. Test with different paper/ribbon

### Issue: Auto-print not working
**Action:**
1. Verify "Auto-Print Receipt After Payment" is checked
2. Test with "Print Test Receipt" button first
3. Ensure printer is set as default
4. Check printer is not in error state
5. Verify printer queue has no stuck jobs

## Performance Benchmarks

Expected performance metrics:
- Printer detection: < 1 second
- Settings load: < 100ms
- Single receipt print: 500ms - 2s
- PDF generation: 1 - 2s
- Multiple copies (5x): 3 - 5s
- Settings save: < 500ms

## Sign-Off

**Verified By:** __________________ **Date:** __________________

**System Status:** ☐ Ready ☐ Needs Work ☐ Hold

**Next Steps:** __________________________________________________________

---

Thank you for using the POS Printer System! 
For support, refer to PRINTER_SETUP_GUIDE.md
