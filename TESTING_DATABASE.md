# Testing Custom Tailoring Orders - Database Verification

## Steps to Test

1. **Restart the Electron App**
   - Close all Electron windows
   - Run: `npm run electron`
   - Watch the terminal console for logs

2. **Create a Test Order**
   - Login to the app
   - Go to Hub → Custom Tailoring
   - Fill in the form:
     - Customer Name: "Test Customer"
     - Phone: "0712345678"
     - Reference Style: Leave as "-- No Reference --" (tests NULL)
     - Material: Leave as "-- Customer Provided --" (tests NULL)
     - Measurements: Fill in any values
     - Total Price: 5000
     - Deposit: 1000
     - Deadline: Any future date
     - Payment Mode: Cash
   - Click "Submit Custom Order"

3. **Check Console Output**
   You should see in the terminal:
   ```
   === Creating Tailoring Order ===
   Order Code: ORD-XXXXXX
   Customer: Test Customer 0712345678
   Style ID: null ( Custom Design )
   Material ID: null ( Customer Provided )
   Measurements: { chest: 'XX', waist: 'XX', ... }
   Price: 5000 | Deposit: 1000 | Deadline: 2026-XX-XX
   ✅ Tailoring order saved to database
   ✅ Payment recorded in sales (Sale ID: XX )
   ✅ Transaction committed successfully
   ```

4. **Verify Order Appears in List**
   - The order should immediately appear in the "Active Bespoke Orders" table
   - Check console for:
   ```
   === Retrieving Tailoring Orders ===
   ✅ Retrieved X tailoring orders from database
   ```

5. **Test with Gallery Reference**
   - First, add a style to the gallery (Style Gallery module)
   - Create another order, this time SELECT a style
   - Material can still be "Customer Provided"
   - Check console - Style ID should show a number

6. **Test with Material Selection**
   - Go to Admin Panel → Resources
   - Add materials (e.g., "Cotton", "Silk")
   - Create another order, SELECT a material
   - Check console - Material ID should show a number

## What the Logs Prove

✅ **Data is SAVED to database** when you see:
   - "Tailoring order saved to database"
   - "Payment recorded in sales"
   - "Transaction committed successfully"

✅ **Data is RETRIEVED from database** when you see:
   - "Retrieved X tailoring orders from database"
   - Order appears in the table immediately

✅ **NULL values work correctly** when:
   - Style ID shows "null (Custom Design)"
   - Material ID shows "null (Customer Provided)"
   - No foreign key errors occur

## Database Location

The database file is: `pos.db` in your project root folder.
All data persists between app restarts.

## Troubleshooting

If you see "❌ Error creating tailoring order:" in the console:
- Read the error message carefully
- It will tell you exactly what went wrong
- Most likely: Missing required fields or database lock

If orders don't appear in the list:
- Check the retrieve logs
- Refresh the page or go back to hub and return
- The loadData() function should be called automatically
