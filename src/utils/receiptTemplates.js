/**
 * Receipt Template Utilities
 * Generates HTML receipts with proper formatting for different paper sizes
 */

export function getPaperWidth(paperSize) {
    return paperSize === '80mm' ? '360px' : '260px';
}

export function getReceiptStyles(paperSize) {
    const width = getPaperWidth(paperSize);
    return `
        @page { margin: 0; }
        body {
            font-family: 'Courier New', monospace;
            padding: 10px;
            text-align: center;
            width: ${width};
            margin: auto;
            font-size: 12px;
        }
        .header-info {
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
        }
        h2 {
            margin: 5px 0;
            text-transform: uppercase;
            font-size: 16px;
            font-weight: 900;
        }
        .info-text {
            font-size: 10px;
            color: #000;
            line-height: 1.2;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        th {
            border-bottom: 1px solid #000;
            text-align: left;
            padding: 4px 0;
            font-size: 10px;
        }
        td {
            padding: 4px 0;
            text-align: left;
            vertical-align: top;
        }
        .right {
            text-align: right;
        }
        .total-section {
            border-top: 1px double #000;
            margin-top: 5px;
            padding-top: 5px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
        }
        .pmt-info {
            text-align: left;
            margin: 10px 0;
            font-size: 10px;
            border-top: 1px dashed #aaa;
            padding-top: 5px;
        }
        .footer {
            margin-top: 20px;
            font-size: 9px;
            font-style: italic;
            border-top: 1px solid #000;
            padding-top: 8px;
        }
        .meta {
            font-size: 8px;
            margin-top: 5px;
            opacity: 0.7;
        }
        .label-badge {
            font-size: 10px;
            font-weight: bold;
            margin: 10px 0;
            display: block;
            background: #000;
            color: #fff;
            padding: 2px;
            text-transform: uppercase;
        }
        .details {
            text-align: left;
            font-size: 11px;
            margin-bottom: 10px;
        }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
    `;
}

export function createSalesReceipt({
    ref,
    cartItems,
    total,
    paymentMode,
    mpesaCode,
    shopName,
    shopAddress,
    shopPhone,
    receiptFooter,
    base64Logo,
    cashierName,
    paperSize = '58mm'
}) {
    const styles = getReceiptStyles(paperSize);
    
    return `
        <html>
            <head><style>${styles}</style></head>
            <body>
                <div class="header-info">
                    <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
                    <h2>${shopName || 'Shop Name'}</h2>
                    <div class="info-text">
                        ${shopAddress || ''}<br/>
                        TEL: ${shopPhone || ''}<br/>
                        REF: ${ref}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="right">Qty</th>
                            <th class="right">Price</th>
                            <th class="right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cartItems.map(c => `
                            <tr>
                                <td colspan="4" style="font-weight: bold;">${c.item_name || c.name}</td>
                            </tr>
                            <tr>
                                <td style="font-size: 9px; padding-left: 5px;">${c.code || ''} ${c.material ? `// ${c.material}` : ''}</td>
                                <td class="right">${c.qty}</td>
                                <td class="right">${c.price.toFixed(2)}</td>
                                <td class="right">${(c.price * c.qty).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-row">
                        <span>GRAND TOTAL</span>
                        <span>Ksh ${total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="pmt-info">
                    <div>MODE: ${paymentMode}</div>
                    ${mpesaCode ? `<div>MPESA: ${mpesaCode}</div>` : ''}
                    <div>DATE: ${new Date().toLocaleString()}</div>
                    <div>CASHIER: ${cashierName}</div>
                </div>

                <div class="footer">${receiptFooter || 'Thank you for your business!'}</div>
                <div class="meta">Software by Whose Folt</div>
            </body>
        </html>
    `;
}

export function createServiceReceipt({
    service,
    paidAmountThisTime,
    shopName,
    shopAddress,
    shopPhone,
    receiptFooter,
    base64Logo,
    cashierName,
    paperSize = '58mm'
}) {
    const styles = getReceiptStyles(paperSize);
    
    return `
        <html>
            <head><style>${styles}</style></head>
            <body>
                <div class="header-info">
                    <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
                    <h2>${shopName || 'Shop Name'}</h2>
                    <div class="info-text">
                        ${shopAddress || ''}<br/>
                        TEL: ${shopPhone || ''}<br/>
                    </div>
                    <div class="label-badge">SERVICE RECEIPT</div>
                    <div style="font-size: 14px; font-weight: bold;">TICKET: ${service.service_code}</div>
                </div>

                <div class="details">
                    <div class="row"><span>Customer:</span><span>${service.customer_name}</span></div>
                    <div class="row"><span>Item:</span><span>${service.item_description}</span></div>
                    <div style="margin: 5px 0; border: 1px dashed #eee; padding: 5px; font-size: 10px; font-style: italic;">
                        SERVICE: ${service.service_required}
                    </div>
                </div>

                <div class="details">
                    <div class="row"><span>Service Total:</span><span>Ksh ${Number(service.total_amount).toFixed(2)}</span></div>
                    <div class="row" style="font-weight: bold;"><span>PAID NOW:</span><span>Ksh ${Number(paidAmountThisTime).toFixed(2)}</span></div>
                    <div class="row"><span>Cumulative Paid:</span><span>Ksh ${Number(service.paid_amount).toFixed(2)}</span></div>
                </div>

                <div class="total-section">
                    <div class="row" style="font-size: 15px; font-weight: bold;">
                        <span>BALANCE DUE:</span>
                        <span>Ksh ${(Number(service.total_amount) - Number(service.paid_amount)).toFixed(2)}</span>
                    </div>
                </div>

                <div class="pmt-info" style="text-align: left; font-size: 9px; margin-top: 10px;">
                    <div>DATE: ${new Date().toLocaleString()}</div>
                    <div>CASHIER: ${cashierName}</div>
                </div>
                
                <div class="footer">Please retain this ticket for collection. ${receiptFooter || ''}</div>
                <div class="meta">Software by Whose Folt</div>
            </body>
        </html>
    `;
}

export function createTailoringReceipt({
    order,
    paidAmountThisTime,
    shopName,
    shopAddress,
    shopPhone,
    receiptFooter,
    base64Logo,
    cashierName,
    paperSize = '58mm'
}) {
    const styles = getReceiptStyles(paperSize);
    
    return `
        <html>
            <head><style>${styles}</style></head>
            <body>
                <div class="header-info">
                    <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
                    <h2>${shopName || 'Shop Name'}</h2>
                    <div class="info-text">
                        ${shopAddress || ''}<br/>
                        TEL: ${shopPhone || ''}<br/>
                    </div>
                    <div class="label-badge">TAILORING ORDER</div>
                    <div style="font-size: 14px; font-weight: bold;">ORDER: ${order.order_code}</div>
                </div>

                <div class="details">
                    <div class="row"><span>Customer:</span><span>${order.customer_name}</span></div>
                    <div class="row"><span>Style:</span><span>${order.style_name || 'Custom'}</span></div>
                    <div class="row"><span>Material:</span><span>${order.material_name || 'TBD'}</span></div>
                </div>

                <div class="details">
                    <div class="row"><span>Total Price:</span><span>Ksh ${Number(order.total_price).toFixed(2)}</span></div>
                    <div class="row" style="font-weight: bold;"><span>DEPOSIT:</span><span>Ksh ${Number(paidAmountThisTime).toFixed(2)}</span></div>
                    <div class="row"><span>Cumulative Paid:</span><span>Ksh ${Number(order.paid_amount).toFixed(2)}</span></div>
                </div>

                <div class="total-section">
                    <div class="row" style="font-size: 15px; font-weight: bold;">
                        <span>BALANCE:</span>
                        <span>Ksh ${(Number(order.total_price) - Number(order.paid_amount)).toFixed(2)}</span>
                    </div>
                </div>

                <div style="text-align: left; font-size: 9px; margin-top: 10px;">
                    <div>Deadline: ${order.deadline || 'TBD'}</div>
                    <div>DATE: ${new Date().toLocaleString()}</div>
                    <div>CASHIER: ${cashierName}</div>
                </div>

                <div class="footer">${receiptFooter || 'Thank you for your business!'}</div>
                <div class="meta">Software by Whose Folt</div>
            </body>
        </html>
    `;
}
