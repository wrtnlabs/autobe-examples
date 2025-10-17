# Business Rules and Constraints

## 1. Introduction and Purpose

THE Business Rules and Constraints document defines the comprehensive set of operational policies, validation requirements, and business logic that govern all transactions, interactions, and data management within the shopping mall e-commerce platform. These rules ensure data integrity, prevent fraud, maintain consistent business operations, provide fair treatment across all user types, and deliver a secure and reliable experience for customers, sellers, and administrators.

**WHEN any transaction or user action occurs on the platform, THE system SHALL enforce all applicable business rules consistently across all operations and modules.**

All rules documented in this document MUST be implemented in application logic, database constraints, and API validations. Rules are binding across all development teams and modules. For detailed information about user roles and permissions, refer to the [User Roles and Authentication Guide](./02-user-roles-authentication.md). For specific module implementations, refer to respective feature documentation.

---

## 2. Data Validation Rules

### 2.1 Product Information Validation

#### Product Name Validation

**WHEN a seller creates a product, THE system SHALL validate that product name contains between 3 and 255 characters inclusive.**

**WHEN a seller provides product name, THE system SHALL reject product names containing only special characters, numbers, or whitespace.**

**IF a product name contains multiple languages or UTF-8 characters, THEN THE system SHALL accept names in UTF-8 format and validate for potential injection attacks.**

**WHEN a seller submits product name containing HTML tags or scripts, THE system SHALL sanitize the input and remove any executable content before validation.**

**Error Message**: If product name fails validation, THE system SHALL display: "Product name must be 3-255 characters and contain at least one letter."

#### Product Description Validation

**WHEN a seller provides product description, THE system SHALL enforce maximum length of 5,000 characters.**

**WHEN a seller includes formatting in description, THE system SHALL allow basic text formatting (bold, italic, underlined) but reject HTML tags, JavaScript, or executable content.**

**IF a product description contains malicious code, SQL injection patterns, or cross-site scripting attempts, THEN THE system SHALL reject the submission with message: "Description contains invalid content".**

**WHEN a seller provides description with links or email addresses, THE system SHALL sanitize URLs to prevent phishing and display warning: "External links are not allowed in product descriptions".**

**Error Handling**: IF all validation fails, THE system SHALL preserve seller's input and return specific validation error allowing edit without data loss.

#### Product SKU (Stock Keeping Unit) Validation

**WHEN a seller creates a product variant SKU, THE system SHALL validate that SKU contains only alphanumeric characters (A-Z, a-z, 0-9), hyphens, and underscores.**

**WHEN a seller attempts to create SKU with special characters or spaces, THE system SHALL reject with message: "SKU must contain only letters, numbers, hyphens, and underscores".**

**THE system SHALL enforce that each SKU created by a seller is unique within that specific product (no duplicate SKUs within single product).**

**THE system SHALL enforce globally that no two sellers can create identical SKUs across the entire platform (SKU uniqueness enforced at platform level).**

**WHEN a SKU is successfully created, THE system SHALL NOT allow modification of the SKU value after creation - SKU values are immutable for audit and order tracking purposes.**

**IF a seller attempts to change SKU value after initial creation, THEN THE system SHALL deny the modification with message: "SKU cannot be modified after creation for data integrity".**

**Error Message**: If SKU validation fails, THE system SHALL display: "SKU must be 1-50 characters containing only letters, numbers, hyphens, and underscores. This SKU is already in use."

#### Product Category Assignment

**WHEN a seller creates a product, THE system SHALL require assignment to at least one primary category from the platform's category taxonomy.**

**WHEN a seller assigns secondary categories, THE system SHALL allow assignment to up to 5 additional categories total.**

**WHEN a seller selects categories, THE system SHALL validate that all selected categories exist and are active (not archived) in the system's category hierarchy.**

**IF a seller attempts to assign product to inactive or deleted category, THEN THE system SHALL reject the assignment with message: "Selected category is no longer available".**

**WHEN a category is deleted by admin, THE system SHALL reassign all products in that category to parent category and notify sellers of reassignment.**

#### Product Status Validation

**WHEN a seller publishes product for first time, THE system SHALL require product to be in DRAFT status before moving to ACTIVE.**

**WHEN a product changes from DRAFT to ACTIVE status, THE system SHALL validate: (1) all required fields are complete, (2) at least one image provided, (3) pricing set for all variants, (4) inventory allocated for all SKUs.**

**IF any required field is missing, THEN THE system SHALL reject status change and display specific list of missing information: "Complete these required fields before publishing: [field list]".**

**WHEN an ACTIVE product is changed to INACTIVE status, THE system SHALL: (1) immediately hide from search results, (2) prevent new orders, (3) preserve all existing data, (4) allow reactivation without data loss.**

### 2.2 User Data Validation

#### Email Address Validation

**WHEN a user registers for an account, THE system SHALL validate email format using standard email validation RFC 5322 specification.**

**WHEN validating email format, THE system SHALL verify: (1) presence of @ symbol, (2) valid domain with at least one dot, (3) valid top-level domain (2+ characters), (4) no spaces or invalid characters.**

**Example valid emails**: john.doe@example.com, user+tag@subdomain.example.co.uk
**Example invalid emails**: john@, user@domain, user@.com, user name@domain.com

**WHEN a user attempts registration, THE system SHALL enforce that email address is globally unique across all platform users (customers and sellers).**

**WHEN validating email uniqueness, THE system SHALL treat email comparison as case-insensitive (john@example.com and JOHN@EXAMPLE.COM reference same address).**

**WHEN a user attempts to register with an email already in use, THE system SHALL reject registration with error message: "Email address already registered. Please log in or use a different email".**

**WHEN a user requests account recovery, THE system SHALL send verification link to email address on file, requiring email verification before password reset is allowed.**

#### Password Security Requirements

**WHEN a user creates a new password during registration or password change, THE system SHALL enforce the following composition requirements:**

**Requirement 1 - Minimum Length**: Password must contain minimum 8 characters.
**Requirement 2 - Uppercase Letters**: Password must contain at least 1 uppercase letter (A-Z).
**Requirement 3 - Lowercase Letters**: Password must contain at least 1 lowercase letter (a-z).
**Requirement 4 - Numeric Characters**: Password must contain at least 1 digit (0-9).
**Requirement 5 - Special Characters**: Password must contain at least 1 special character from set: !@#$%^&*()_+-=[]{}|;:,.<>?

**Error Message**: IF any requirement fails, THE system SHALL display: "Password must be 8+ characters with uppercase, lowercase, numbers, and special characters (e.g., P@ssw0rd)"

**WHEN a user sets password, THE system SHALL validate that password is NOT identical to username or email address (case-insensitive comparison).**

**IF user attempts password matching their name/email, THEN THE system SHALL reject with message: "Password cannot contain your username or email address".**

**WHEN a user creates password, THE system SHALL cross-reference against dictionary of commonly known weak passwords (password123, qwerty123, letmein, etc.) and reject weak passwords with message: "This password is too common. Please choose a stronger password".**

**WHEN a user changes existing password, THE system SHALL require entry of current password for verification before allowing new password to be set.**

**IF user enters incorrect current password during change attempt, THEN THE system SHALL reject the change and display: "Current password is incorrect".**

**WHEN a user fails password entry 5 consecutive times, THE system SHALL temporarily lock the account for 15 minutes and send email notification: "Multiple incorrect password attempts on your account. Account temporarily locked for security".**

**WHEN account lockout occurs, THE system SHALL allow unlock through: (1) email verification link, (2) security questions, or (3) admin assistance.**

#### User Name Validation

**WHEN a user registers, THE system SHALL require entry of first name containing 1-50 characters.**

**WHEN a user registers, THE system SHALL require entry of last name containing 1-50 characters.**

**WHEN a user provides name, THE system SHALL accept characters from any language/script including: standard Latin letters, accented characters (é, ñ, ü), CJK characters (Chinese, Japanese, Korean), Arabic, Cyrillic, and other Unicode-supported scripts.**

**WHEN a user provides name, THE system SHALL accept special name characters: spaces, hyphens, apostrophes (e.g., "Mary-Jane", "O'Brien", "Jean-Claude").**

**WHEN a user submits name with only special characters or numbers, THE system SHALL reject with message: "Name must contain at least one letter".**

**Example valid names**: "Juan García López", "李 明", "محمد علي", "O'Connor", "Jean-Pierre", "Maria José"
**Example invalid names**: "123456", "!!!***", " - - ", "A", "123-456-7890"

### 2.3 Address Validation

#### Address Components and Format

**WHEN a customer enters delivery address, THE system SHALL require the following minimum components:**
- Street address (1-255 characters) - required
- City/town name (2-100 characters) - required  
- State/Province/Region (2-100 characters) - required for applicable countries
- Postal code (2-20 characters, format varies by country) - required
- Country (from supported countries list) - required

**WHEN a seller provides business address, THE system SHALL require same components as customer delivery address.**

**WHEN a customer provides street address, THE system SHALL accept both street number format (123 Main St) and PO Box format (PO Box 456).**

**WHEN validating postal code format, THE system SHALL enforce country-specific formats:**
- United States: 5 digits or 5+4 format (XXXXX or XXXXX-XXXX)
- Canada: Postal code format A1A 1A1
- United Kingdom: Valid postcode formats (e.g., SW1A 1AA)
- Germany: 5-digit postal code
- Other countries: Country-specific validation rules applied

**Error Message**: IF postal code format fails country validation, THE system SHALL display: "Postal code format invalid for [Country]. Expected format: [example]"

**WHEN a customer provides address with fewer than minimum required components, THE system SHALL display error listing each missing field: "Complete these required address fields: [field list]".**

#### Address Verification

**WHEN a customer provides delivery address during checkout, THE system SHALL validate address format for valid characters and structure.**

**WHEN address validation detects potential issues (PO Box for package delivery, international characters in ZIP code), THE system SHALL provide suggested corrections or ask for confirmation: "Did you mean: [corrected address]?"**

**WHEN a seller updates their business address, THE system SHALL require admin verification of the address change before new address takes effect in order fulfillment.**

**IF seller changes address while having pending orders, THEN THE system SHALL notify seller: "Address change will apply to new orders only. Pending orders will use previously registered address".**

### 2.4 Payment Information Validation

#### Credit Card Data Validation

**WHEN a customer submits credit card payment, THE system SHALL validate card number using Luhn algorithm to verify format validity and detect invalid card numbers.**

**Luhn Algorithm**: Sum all digits with every second digit from right doubled. If sum mod 10 = 0, card number is potentially valid format.

**WHEN a customer provides card number, THE system SHALL accept 13-19 digit card numbers (standard for major card networks).**

**IF card number fails Luhn validation, THEN THE system SHALL reject with message: "Card number is invalid".**

**WHEN a customer provides card expiration date, THE system SHALL validate format as MM/YY (e.g., 03/25 for March 2025).**

**WHEN validating expiration date, THE system SHALL verify: (1) month is 01-12, (2) year is current or future, (3) card has not passed expiration date.**

**IF card expiration date is in the past, THEN THE system SHALL reject with message: "Card has expired. Please use a valid card".**

**IF card expiration date is invalid format, THEN THE system SHALL reject with message: "Expiration date must be MM/YY format (e.g., 03/25)".**

**WHEN a customer provides CVV security code, THE system SHALL validate as 3-4 digit numeric-only code:**
- American Express: 4 digits on front
- Visa/Mastercard/Discover: 3 digits on back

**IF CVV validation fails, THEN THE system SHALL reject with message: "CVV must be 3-4 digit code on back of card".**

**WHEN payment is processed, THE system SHALL NOT store full credit card numbers, expiration dates, or CVV codes in system database for PCI compliance.**

**THE system SHALL store only: (1) Card token provided by payment gateway, (2) Last 4 digits for customer reference, (3) Card brand/type (Visa, Mastercard, etc.), (4) Cardholder name.**

#### Payment Amount Validation

**WHEN a payment is submitted for an order, THE system SHALL validate that payment amount exactly matches calculated order total (within currency precision - 2 decimal places).**

**IF payment amount is $99.98 but order total is $99.99, THEN THE system SHALL reject payment with message: "Payment amount ($99.98) does not match order total ($99.99)".**

**WHEN a customer attempts to overpay (payment > order total), THE system SHALL reject payment with message: "Payment amount ($150.00) exceeds order total ($99.99)".**

**WHEN a customer attempts to underpay (payment < order total), THE system SHALL reject payment with message: "Payment amount ($50.00) is insufficient. Order total is ($99.99)".**

**THE system SHALL enforce minimum order value of $0.01 (one cent) - orders below this minimum are not processable.**

**THE system SHALL enforce maximum order value of $999,999.99 to prevent accidental large transactions or attempted system exploitation.**

**IF order total would exceed maximum, THEN THE system SHALL display: "Order total exceeds maximum allowed ($999,999.99). Please reduce order size".**

**Example**: Order with 10,000 units of $100 items = $1,000,000 (exceeds maximum) → system rejects checkout

#### Payment Currency Validation

**WHEN a payment is submitted, THE system SHALL validate that payment currency matches the order currency specified at order creation.**

**WHEN an order is created, THE system SHALL specify currency (e.g., USD, EUR, GBP) based on customer's country/region selection.**

**IF payment is submitted in different currency than order currency, THEN THE system SHALL reject payment with message: "Payment currency (EUR) does not match order currency (USD)".**

**WHEN displaying prices to customers, THE system SHALL always display currency symbol and code (e.g., "$99.99 USD" not just "$99.99").**

### 2.5 Review and Rating Validation

#### Rating Value Validation

**WHEN a customer submits a product rating, THE system SHALL enforce rating value between 1 and 5 inclusive (whole numbers only).**

**Valid ratings**: 1 (Terrible), 2 (Poor), 3 (Average), 4 (Good), 5 (Excellent)
**Invalid ratings**: 0, 1.5, 3.7, 6, -1, NULL

**IF customer attempts to submit decimal rating like 3.5, THEN THE system SHALL reject with message: "Rating must be whole number (1-5 stars)".**

**WHEN a customer provides rating without text review, THE system SHALL allow rating-only submission.**

**WHEN a customer attempts to submit rating without selecting star value, THE system SHALL require selection with message: "Please select a star rating (1-5)".**

#### Review Content Validation

**WHEN a customer submits review text, THE system SHALL enforce minimum length of 10 characters (prevents "Good!" or "Great product" type reviews).**

**WHEN a customer submits review text, THE system SHALL enforce maximum length of 2,000 characters (approximately 300-400 words).**

**IF review is below 10 characters, THEN THE system SHALL display: "Review must be at least 10 characters".**

**IF review exceeds 2,000 characters, THEN THE system SHALL display: "Review cannot exceed 2,000 characters. Currently: [current count]".**

**WHEN a customer provides review title, THE system SHALL enforce minimum 5 characters and maximum 100 characters.**

**Example valid titles**: "Great product, highly recommend", "Quality issues within 2 months", "Worth the price"
**Example invalid titles**: "Good", "OK", "" (empty)

**WHEN a customer submits review text, THE system SHALL scan for excessive profanity (more than 2 profane words), hate speech, or abusive language directed at seller or product.**

**IF review contains flagged offensive content, THEN THE system SHALL hold review in "Pending Moderation" status and notify admin for review before publication.**

**WHEN a customer includes external URLs, email addresses (containing @), or phone numbers in review, THE system SHALL reject with message: "Reviews cannot contain contact information or external links".**

**Example violations**: "Email me at john@example.com", "Call 555-123-4567", "Buy cheaper at competitor.com"

**WHEN a customer attempts to include HTML or markup code in review, THE system SHALL sanitize the input and remove all tags before validation.**

---

## 3. Inventory Rules

### 3.1 SKU-Level Inventory Tracking

#### Stock Quantity Management

**WHEN a product variant (SKU) is created, THE system SHALL initialize stock quantity to zero - seller must explicitly set inventory.**

**WHEN a seller updates inventory for a SKU, THE system SHALL require non-negative integer value (whole units only, no fractional units like 5.5).**

**Valid inventory values**: 0, 1, 5, 100, 1000
**Invalid inventory values**: -5, 2.5, "ten", NULL, "ABC"

**THE system SHALL maintain inventory count at SKU (variant) level rather than at product level - each color/size combination has independent stock.**

**Example**: T-shirt product has: Blue-Small: 10 units, Blue-Medium: 8 units, Red-Small: 12 units (three separate SKU inventories)

**WHEN inventory is updated, THE system SHALL create immutable audit log entry recording:**
- Previous quantity
- New quantity  
- Quantity change amount
- Adjustment reason (e.g., "manual adjustment", "order fulfillment", "return received", "damaged goods")
- Timestamp of update
- Admin or seller ID who made adjustment
- IP address of requester

**WHEN a seller adjusts inventory and provides reason, THE system SHALL validate reason from predefined list: "Restock", "Damage/Loss", "Physical Count Correction", "Return Received", "System Error Correction", "Other".**

#### Stock Availability Checks

**WHEN a customer adds item to shopping cart, THE system SHALL verify that requested quantity is available in current stock (without placing hold).**

**IF requested quantity exceeds available stock, THEN THE system SHALL display current available quantity: "Only [X] units available. Please adjust quantity".**

**WHEN a customer proceeds to checkout from cart, THE system SHALL re-validate inventory availability immediately before payment processing (prevents stale cart data).**

**IF inventory has decreased since item was added to cart, THE system SHALL alert customer: "[Product] inventory reduced to [X] units. Adjust quantity or remove item".**

**WHEN checkout cannot proceed due to insufficient inventory, THE system SHALL provide options: (1) Reduce quantity to available amount, (2) Remove item from order, (3) Keep item in cart and shop more.**

### 3.2 Overselling Prevention

#### Atomic Inventory Reduction

**WHEN an order is successfully paid and confirmed, THE system SHALL atomically reduce inventory for each SKU in the order in single database transaction.**

**Atomic transaction requirement**: Either all SKU reductions complete successfully OR entire transaction rolls back - no partial inventory reductions.

**WHEN inventory reduction occurs, THE system SHALL use database-level row-level locking to prevent race conditions during concurrent orders.**

**IF inventory reduction would result in negative stock (e.g., reducing 10 units when only 5 available), THEN THE system SHALL reject the entire order and restore any inventory already reserved.**

**WHEN order rejection occurs due to inventory unavailability, THE system SHALL:**
1. Immediately cancel payment authorization
2. Restore any inventory reservations from this order
3. Notify customer with specific message: "[Product] is no longer in stock. Your payment has been cancelled"
4. Preserve shopping cart contents for customer to modify

#### Concurrent Order Safety

**WHILE multiple customers are attempting to purchase the same SKU simultaneously, THE system SHALL use database-level locking mechanisms to prevent double-selling.**

**WHEN two customers simultaneously purchase the last unit of a product:**
- Customer A's payment processes: 1 second earlier → order confirmed, inventory reduced to 0
- Customer B's payment processes: 1 second later → order rejected, customer notified "Out of stock"

**THE system SHALL use timestamp-based ordering (first payment cleared = first order confirmed) to determine winner in concurrent purchase scenario.**

**Example concurrent scenario**:
```
Time 0:00 - Customer A and B both view: "Blue T-Shirt - 1 in stock"
Time 0:05 - Both customers click checkout simultaneously  
Time 0:10 - A's payment processes successfully first
Time 0:11 - B's payment processes, but inventory check shows 0 available
Time 0:12 - B receives: "This item sold out. Order cancelled. Full refund processed"
```

### 3.3 Low Stock Warnings

#### Seller Notifications

**WHEN SKU inventory falls to or below 10 units (default threshold), THE system SHALL trigger low stock alert notification to seller.**

**WHEN low stock alert triggers, THE system SHALL send email notification containing:**
- Product name and SKU identifier
- Current inventory quantity
- Low stock threshold
- Link to restock/update inventory
- Estimated days until stockout (based on recent sales velocity)

**WHEN SKU inventory reaches exactly zero, THE system SHALL automatically mark product as "Out of Stock" and hide from search results within 2 seconds.**

**WHEN a seller manually sets inventory to zero (marking product discontinu), THE system SHALL display "Out of Stock" status but preserve all product data for reactivation.**

**WHEN inventory for previously out-of-stock item is replenished (increased from 0 to positive value), THE system SHALL:**
1. Update product status to "In Stock"
2. Make product visible in search results
3. Notify any customers who previously requested stock notification
4. Notify seller of successful restocking

#### Customer Visibility

**WHEN customer views product with low stock (fewer than 5 units in inventory), THE system SHALL display "Limited Stock Available" message with actual count: "Only 2 left in stock - order soon".**

**WHEN a product is out of stock (0 units), THE system SHALL display "Out of Stock" status, disable add-to-cart button, and offer notification signup: "Notify me when available".**

**WHEN customer signs up for stock notification and inventory is replenished, THE system SHALL send notification: "[Product] is back in stock and available for purchase".**

### 3.4 Inventory Updates During Transactions

#### Order Placement

**WHEN order is placed, payment approved, and order status transitions to "Confirmed", THE system SHALL immediately reduce inventory quantities for all SKUs in the order atomically.**

**WHERE order contains multiple different SKUs (2 units of Blue-Small, 1 unit of Red-Medium), THE system SHALL reduce each SKU independently:**
- Blue-Small: quantity -= 2
- Red-Medium: quantity -= 1
- All reductions happen in same database transaction

**WHEN inventory reduction completes successfully, THE system SHALL:**
1. Update product availability status (if now out of stock)
2. Create audit log entry with all details
3. Update search index to reflect new stock levels
4. Proceed with order confirmation and notifications

#### Order Cancellation

**WHEN an order is cancelled by customer within 1 hour of placement (before seller begins fulfillment), THE system SHALL restore inventory for all SKUs back to original quantities.**

**WHEN cancellation occurs and inventory is restored, THE system SHALL:**
1. Add quantity back to each SKU atomically
2. Update product status (e.g., if was out of stock, may now be in stock)
3. Create audit log: "Inventory restored due to order cancellation [Order ID]"
4. Update search index to reflect restored inventory

**WHEN a customer requests return after delivery, THE system SHALL NOT automatically restore inventory - manual seller approval required:**
1. Seller receives return request
2. Seller inspects returned product
3. Seller confirms return acceptable
4. Seller (or system) manually restores inventory with reason "Return received"

#### Stock Adjustment

**WHEN a seller manually adjusts SKU inventory (adding or removing stock), THE system SHALL log adjustment with:**
- Previous inventory quantity
- New inventory quantity  
- Quantity change (delta)
- Adjustment reason from dropdown
- Timestamp
- Seller ID

**WHERE seller attempts to add inventory to SKU, THE system SHALL validate:**
- New quantity is non-negative
- Quantity is reasonable (not exceeding 1,000,000+ which would suggest data entry error)
- Seller has permission to manage this product

**WHERE seller reports inventory discrepancy (e.g., physical count shows 50 but system shows 75), THEN admin MUST review and approve inventory adjustment before it takes effect.**

---

## 4. Pricing and Discount Rules

### 4.1 Product Pricing

#### Base Price Requirements

**WHEN a seller creates a product, THE system SHALL require base price in currency format with exactly 2 decimal places.**

**Valid prices**: $19.99, $0.01, $5,000.00
**Invalid prices**: $19.9 (missing second decimal), $20 (missing decimals), $20.999 (too many decimals), $-5.00 (negative), $1,000,000.00 (exceeds maximum)

**THE system SHALL enforce minimum price of $0.01 (one cent - minimum purchasable amount).**

**THE system SHALL enforce maximum price of $999,999.99 to prevent system exploitation or accidental large listings.**

**WHEN a seller enters price exceeding maximum, THE system SHALL reject with message: "Price cannot exceed $999,999.99".**

#### Variant Pricing

**WHEN a seller adds SKU variants (different colors, sizes), THE system SHALL require explicit price for each SKU variant.**

**WHERE variant has no custom price explicitly set, THE system SHALL use base product price as default for that variant.**

**WHEN variant price differs from base price (e.g., larger size costs $5 more), THE system SHALL display both base and variant prices to customer:**
- Base price: $19.99
- Your size (Large) price: $24.99 (+$5.00)

**WHEN customer adds variant to cart, THE system SHALL use the variant-specific price at time of addition.**

#### Price Change Rules

**WHEN a seller updates product price, THE system SHALL apply new price only to future orders placed after price change.**

**Pricing example**:
- Product listed at $10.00
- Customer A places order at $10.00 (charged $10.00)
- Seller changes price to $15.00
- Customer B places order at $15.00 (charged $15.00)

**WHEN a seller updates SKU price, THE system SHALL apply change immediately to product display and catalog.**

**THE system SHALL maintain complete price history for audit purposes:**
- Old price: $19.99
- New price: $24.99  
- Change effective: 2024-10-16 14:30 UTC
- Changed by: seller_id_123
- IP address: 192.168.1.1

**WHEN admin queries price history, THE system SHALL display all historical prices with timestamps and justification for each change.**

### 4.2 Tax Calculation

#### Tax Computation

**WHEN an order is placed, THE system SHALL calculate tax based on customer's delivery address state/region.**

**WHEN calculating tax, THE system SHALL:**
1. Identify customer delivery state from address
2. Look up applicable state tax rate
3. Apply tax rate to order subtotal (excluding shipping)
4. Include calculated tax in order total
5. Display itemized tax on receipt and order confirmation

**Example tax calculation**:
```
Item 1: $50.00
Item 2: $30.00
Subtotal: $80.00
Tax (8.5% for CA): $6.80
Shipping: $5.00
Order Total: $91.80
```

**WHEN tax rate varies by product type (e.g., clothing exempt from tax in some states), THE system SHALL apply product-specific tax rules per state regulations.**

### 4.3 Seller Commission and Payment

#### Commission Calculation

**THE system SHALL deduct standard commission of 10% from seller's order revenue - this is baseline rate applied to all sellers.**

**WHEN order total is $100.00:**
- Seller revenue before commission: $100.00
- Commission deducted (10%): $10.00
- Seller net revenue: $90.00

**WHERE seller has achieved "Top Seller" status (100+ successful orders in 30 days with 4.5+ average rating), THE system SHALL apply reduced commission rate of 7%.**

**WHEN seller achieves top seller status:**
- Seller revenue: $100.00
- Commission deducted (7%): $7.00  
- Seller net revenue: $93.00

**THE system SHALL calculate commission before processing seller payment and display commission details in seller's earnings report:**
- Order total
- Commission percentage applied
- Commission amount deducted
- Net amount to seller

#### Commission Deduction Timing

**WHEN an order is confirmed and payment successfully processes, THE system SHALL calculate seller commission immediately.**

**WHEN order is cancelled or refund is processed, THE system SHALL reverse previously deducted commission:**
- If seller already received payment with commission deducted, THE system SHALL subtract refund amount from next payout
- Commission on refunded order is not charged to seller

**THE system SHALL process seller payments weekly every Monday morning (UTC) for all commissions accumulated in previous Monday-Sunday week.**

**Example payment schedule**:
```
Week of Oct 7-13: $1,500 in sales, $150 in commissions deducted
Week of Oct 14-20: $2,000 in sales, $200 in commissions deducted  
Payment issued: Monday Oct 21 for $3,350 (total after $350 commission)
```

---

## 5. Order Rules

### 5.1 Order Creation and Validation

#### Minimum Order Requirements

**WHEN a customer creates an order, THE system SHALL require at least one product in the order (cannot place empty order).**

**WHEN customer attempts to checkout with empty cart, THE system SHALL display: "Your cart is empty. Add items before checkout".**

**WHEN a customer proceeds to checkout, THE system SHALL validate that all items in order are still in stock - this is the final inventory check before payment processing.**

**IF any item becomes out of stock between adding to cart and checkout, THE system SHALL display which items are no longer available and ask customer to modify order.**

**THE system SHALL reject order submissions containing zero items or negative quantities.**

#### Order Item Constraints

**WHEN a customer adds item to order, THE system SHALL enforce maximum quantity of 999 units per SKU per order.**

**IF customer attempts to add 1000+ units of single SKU, THE system SHALL restrict to 999 maximum with message: "Maximum 999 units per item. Please reduce quantity".**

**WHEN order total would exceed $999,999.99 (system maximum order value), THE system SHALL reject order and display: "Order total exceeds maximum allowed ($999,999.99). Please reduce order".**

**WHEN order is created, THE system SHALL validate that all SKUs in order still belong to available sellers (not suspended or deactivated).**

**IF any seller in multi-seller order is suspended, THE system SHALL prevent checkout and notify customer: "Some items are no longer available from their sellers. Please modify order".**

#### Order Amount Validation

**WHEN an order is created, THE system SHALL calculate order subtotal by summing (price × quantity) for all items.**

**WHEN order amount is calculated, THE system SHALL:**
1. Calculate subtotal: Sum of (unit_price × quantity) for each item
2. Calculate taxes: Apply applicable state/region tax rate
3. Calculate shipping: Based on destination and shipping method selected
4. Calculate discounts: Apply any valid promotional codes
5. Calculate total: subtotal + tax + shipping - discounts

**WHEN order is finalized, THE system SHALL validate that order total matches sum of individual line items + tax + shipping (preventing calculation errors in payment processing).**

**Example order calculation validation**:
```
Item 1: $50.00 × 1 = $50.00
Item 2: $25.00 × 2 = $50.00
Subtotal: $100.00
Tax (8%): $8.00
Shipping: $5.00
Discount: -$5.00
Calculated Total: $108.00

If payment submitted for $107.99 → Mismatch detected → Reject payment
If payment submitted for $108.00 → Validation passes → Process payment
```

### 5.2 Order Status Lifecycle

#### Valid Order Status Definitions and Transitions

**THE system SHALL define the following order statuses and transitions:**

| Status | Definition | Entry Condition | Valid Next States | Final? |
|--------|-----------|-----------------|------------------|--------|
| **PENDING** | Order created, awaiting payment | Customer completes checkout | CONFIRMED, CANCELLED | No |
| **CONFIRMED** | Payment received, ready for seller | Payment gateway approves payment | PROCESSING, CANCELLED | No |
| **PROCESSING** | Seller preparing shipment | Seller marks order as in progress | SHIPPED, CANCELLED | No |
| **SHIPPED** | Items handed to carrier | Seller provides tracking number | DELIVERED, EXCEPTION | No |
| **DELIVERED** | Items received by customer | Carrier confirms delivery | COMPLETED, RETURNED | No |
| **COMPLETED** | Order finalized, return window closed | 7 days after delivery | RETURNED | No |
| **CANCELLED** | Order cancelled by customer/system | Customer or system initiates | None | Yes |
| **RETURNED** | Customer initiated return processed | Return approved and processed | None | Yes |

**WHEN order is created and payment is awaiting, THE system SHALL set order status to "PENDING".**

**WHEN payment is successfully processed through payment gateway, THE system SHALL transition order to "CONFIRMED" status within 1 second of payment confirmation.**

**WHEN seller marks order items as prepared/packed, THE system SHALL transition order to "PROCESSING" status.**

**WHEN seller provides tracking number and shipping confirmation, THE system SHALL transition order to "SHIPPED" status and notify customer with tracking details.**

**WHEN carrier confirms delivery, THE system SHALL transition order to "DELIVERED" status and notify customer with delivery confirmation.**

#### Status Transition Restrictions

**WHEN order is in "DELIVERED" status, THE system SHALL NOT allow transition back to "PENDING", "CONFIRMED", "PROCESSING", or "SHIPPED" statuses (status is non-reversible).**

**WHEN order is in "CANCELLED" status, THE system SHALL NOT allow any status change (final immutable state).**

**WHERE order is in "PROCESSING" status, THE system SHALL NOT allow cancellation through normal customer request - only seller can cancel or customer can request return after shipment.**

**WHEN customer attempts to cancel order in "PROCESSING" status, THE system SHALL display: "This order is being prepared for shipment. Contact customer support to cancel".**

### 5.3 Order Information Tracking

#### Order Data Requirements

**WHEN an order is created, THE system SHALL record and store:**
- Customer ID (unique identifier)
- Order date and time (ISO 8601 format)
- Shipping address (complete address with all fields)
- Billing address (complete address with all fields)
- Complete list of ordered items with:
  - Product ID and name
  - SKU identifier
  - Variant attributes (color, size, etc.)
  - Unit price at time of order (price snapshot)
  - Quantity ordered
  - Line total (unit price × quantity)

**WHEN an order is confirmed, THE system SHALL create immutable order record containing:**
- All items, quantities, and prices (these become locked - cannot be edited)
- Applied taxes (calculated and locked)
- Shipping cost (locked)
- Promotional discounts applied (if any)
- Order total (locked)
- Payment method and transaction ID

**THE system SHALL assign unique order ID (format: ORD-YYYYMMDD-XXXXXX where XXXXXX is sequence) at creation time.**

**Example order ID**: ORD-20241016-000543

**THE system SHALL store and maintain complete order timeline:**
- Creation timestamp: When order was first created (PENDING status)
- Confirmation timestamp: When payment was successfully processed
- Fulfillment started timestamp: When seller marked as PROCESSING
- Shipped timestamp: When tracking number provided
- Delivery timestamp: When carrier confirms delivery
- Completion timestamp: When order finalized (7 days after delivery)
- Cancellation timestamp (if applicable): When order was cancelled

---

## 6. Payment Rules

### 6.1 Payment Amount Validation

#### Exact Amount Matching

**WHEN payment is submitted, THE system SHALL validate that payment amount exactly matches calculated order total with no variance beyond 2 decimal places.**

**WHEN validating payment amount, THE system SHALL ensure:**
- Payment amount = Order total (exactly)
- Variance not exceeding $0.01 due to rounding

**IF payment amount is less than order total by any amount, THEN THE system SHALL reject payment with error: "Insufficient payment amount. Required: $[total], Submitted: $[amount]".**

**IF payment amount exceeds order total (overpayment), THEN THE system SHALL reject payment with error: "Payment amount exceeds order total by $[difference]. Please correct payment amount".**

**Example scenarios**:
```
Scenario 1: Order total $99.99, Payment $99.98 → Rejected (underpayment $0.01)
Scenario 2: Order total $99.99, Payment $99.99 → Accepted
Scenario 3: Order total $99.99, Payment $100.00 → Rejected (overpayment $0.01)
```

#### Currency Consistency

**WHEN order total is calculated, THE system SHALL specify and lock currency (USD, EUR, GBP, etc.) for that order.**

**WHEN payment is submitted, THE system SHALL validate that payment currency matches order currency.**

**IF payment currency differs from order currency, THEN THE system SHALL reject payment with message: "Payment currency ([currency]) does not match order currency ([expected currency]). Please correct".**

### 6.2 Payment Status Lifecycle

#### Payment Status Progression

**WHEN payment is initiated by customer, THE system SHALL set payment status to "PENDING" indicating payment is being processed.**

**WHEN payment gateway confirms successful authorization and charge, THE system SHALL update payment status to "COMPLETED".**

**WHEN payment gateway declines payment or returns error, THE system SHALL update payment status to "FAILED".**

**WHERE payment attempt fails (e.g., network timeout) but can be retried, THE system SHALL maintain "FAILED" status allowing customer manual retry.**

**WHERE payment attempt fails permanently (e.g., card reported stolen), THE system SHALL maintain "FAILED" status with explanation preventing further attempts with same card.**

#### Timeout Rules

**WHEN customer initiates checkout and payment screen displayed, THE system SHALL enforce 15-minute session timeout for payment completion.**

**WHEN 15 minutes elapse without payment submission or completion, THE system SHALL:**
1. Expire the payment session
2. Free up any reserved inventory
3. Clear temporary order hold
4. Display message: "Payment session expired. Please return to cart to retry"

**WHEN payment session expires, THE system SHALL preserve shopping cart with all items intact for customer to complete purchase later.**

### 6.3 Payment Failure Handling

#### Automatic Retry Logic

**WHEN payment fails due to transient error (network timeout, temporary gateway unavailability), THE system SHALL attempt automatic retry after 30 seconds.**

**THE system SHALL perform exactly one automatic retry - only one automatic attempt after initial failure.**

**WHERE automatic retry is successful, THE system SHALL proceed with order confirmation normally.**

**WHERE automatic retry also fails, THE system SHALL require customer manual retry - NO further automatic attempts.**

**Error message after automatic retry failure**: "Payment processing failed. Please try again or use different payment method. Error: [reason]"

#### Customer Communication

**WHEN payment fails immediately, THE system SHALL display error message to customer within 2 seconds.**

**WHEN displaying error, THE system SHALL indicate whether failure is temporary (can retry) or permanent (contact support):**

| Error Type | Message | Actionable? |
|-----------|---------|------------|
| Insufficient Funds | "Insufficient funds. Please use different card or contact your bank" | Retry with different card |
| Card Expired | "This card has expired. Please use valid card" | Retry with different card |
| Card Declined | "Payment declined. Contact your bank or try different method" | Retry or support |
| Network Error | "Connection lost. Please try again" | Immediate retry likely to succeed |
| CVV Invalid | "Security code (CVV) incorrect. Please verify" | Retry with correct code |

**WHERE payment is declined for security reasons (fraud detection), THE system SHALL display: "Payment declined for security. Contact support or try different method".**

**WHERE payment fails due to insufficient funds, THE system SHALL display specific message: "Card declined - insufficient funds. Please use different payment method".**

---

## 7. Refund and Cancellation Rules

### 7.1 Order Cancellation Eligibility

#### Cancellation Windows

**WHEN customer requests cancellation within 1 hour of order confirmation, THE system SHALL allow cancellation without requiring seller approval.**

**WHEN cancellation request is made within 1-hour window, THE system SHALL immediately process cancellation:**
1. Cancel the order
2. Release inventory holds
3. Void payment authorization (if not already captured)
4. Process full refund

**WHERE order has been marked "SHIPPED" by seller, THE system SHALL NOT allow customer-initiated cancellation through cancellation system - refund request process applies instead.**

**WHERE order is in "DELIVERED" status, THE system SHALL NOT allow cancellation - return process applies instead.**

**WHEN customer attempts to cancel shipped/delivered order, THE system SHALL display: "This order has shipped. To return items, use the refund request process".**

#### Cancellation Restrictions by Seller

**WHERE seller has not shipped order within 48 hours of order confirmation (order still in PROCESSING status), THE system SHALL allow customer to request cancellation.**

**WHEN customer requests cancellation after seller has begun preparation (marked PROCESSING), THE system SHALL require seller approval.**

**WHEN seller cancellation approval request is sent, THE system SHALL provide seller with 4-hour window to respond with approval or denial.**

**IF seller does not respond within 4 hours, THE system SHALL automatically approve the cancellation and proceed with refund.**

### 7.2 Refund Amount Calculation

#### Full Refund

**WHEN order is cancelled within 1 hour of confirmation, THE system SHALL refund full order amount (100%) including all taxes and shipping costs.**

**WHEN order is cancelled due to seller non-fulfillment (seller hasn't shipped within 48 hours), THE system SHALL refund full amount without any deductions.**

**Full refund calculation**:
```
Order Total: $120.50
Full Refund: $120.50 (100%)
```

#### Partial Refund

**WHERE customer returns only portion of items received (e.g., returned 1 of 3 items), THE system SHALL calculate refund as proportional amount:**

Refund Amount = (Returned Item Price / Total Order Subtotal) × Total Amount Paid

**WHEN calculating partial refund with tax and shipping, THE system SHALL:**
1. Calculate proportion: Returned price / Subtotal
2. Apply same proportion to tax: Tax × proportion
3. Apply proportion to shipping: Shipping × proportion  
4. Calculate refund: Returned item + proportional tax + proportional shipping

**Example partial refund calculation**:
```
Item A: $50.00
Item B: $30.00
Item C: $20.00
Subtotal: $100.00
Tax (8%): $8.00
Shipping: $10.00
Order Total: $118.00

Customer returns Item C ($20):
Proportion: $20/$100 = 20%
Refund: $20.00 + ($8.00 × 20%) + ($10.00 × 20%)
Refund: $20.00 + $1.60 + $2.00 = $23.60
```

### 7.3 Refund Processing

#### Refund Timing

**WHEN refund is approved and processed, THE system SHALL initiate refund to original payment method within 24 hours of approval.**

**WHEN refund is submitted to payment processor, THE system SHALL display to customer expected completion timeframe:**
- Credit/Debit Cards: 3-7 business days
- Digital Wallets: 1-3 business days  
- Bank Transfers: 3-5 business days

**WHEN refund is processed, THE system SHALL create refund transaction record with:**
- Refund transaction ID (unique identifier)
- Original order ID
- Refund amount
- Refund timestamp
- Refund confirmation number for customer tracking
- Estimated completion date

**THE customer SHALL receive email containing refund confirmation with transaction ID and estimated arrival date.**

#### Return Condition Requirements

**WHEN customer requests return, THE system SHALL require customer to indicate product condition:**
- Option 1: "Unopened/Original packaging intact" → Full refund
- Option 2: "Used/Item shows wear" → May incur restocking fee
- Option 3: "Damaged/Defective" → Full refund plus replacement option

**WHERE item is unopened and original packaging intact, THE system SHALL process full refund of product price, tax, and shipping.**

**WHERE item shows signs of customer use but is functional, THE system SHALL allow seller to approve with possible 15% restocking fee deduction if disclosed at purchase.**

**WHERE item is damaged due to customer mishandling (not defect), THE system SHALL allow 25% deduction from refund amount.**

**WHERE item is damaged due to shipping/seller fault, THE system SHALL process full refund with no deductions.**

### 7.4 Inventory Restoration on Cancellation/Return

#### Return Inventory Updates

**WHEN return is approved and processed, THE system SHALL restore inventory for returned SKUs immediately (within 1 second).**

**WHEN partial return is processed (customer returns 2 of 3 items), THE system SHALL restore inventory only for returned items - retained items do not affect inventory.**

**THE system SHALL create audit log for inventory restoration:**
- Previous inventory quantity
- New inventory quantity (after restoration)
- Reason: "Return approved [Return ID]" or "Order cancelled [Order ID]"
- Timestamp of restoration
- Affected seller

**Example inventory restoration**:
```
Before return: Blue-Large SKU has 15 units in stock
Customer returns 2 Blue-Large items
After restoration: Blue-Large SKU has 17 units in stock
```

---

## 8. Review and Rating Rules

### 8.1 Review Eligibility

#### Purchase Requirement

**WHEN customer attempts to submit review, THE system SHALL verify that customer purchased this specific product and the order has been delivered.**

**THE system SHALL check:**
1. Customer has completed order containing this product
2. Order status is "DELIVERED"  
3. Delivery confirmation is recorded

**WHERE customer has not purchased product or order not yet delivered, THE system SHALL display: "You must purchase and receive this product to leave a review".**

**WHEN an order is in "PROCESSING" or "SHIPPED" status, THE system SHALL display message: "Review available after delivery".**

#### One Review Per Customer Per Product

**WHEN customer submits review for product, THE system SHALL check if customer has already reviewed this exact product.**

**WHERE customer previously reviewed product, THE system SHALL:**
- Allow edit of existing review (replace with new content)
- Allow deletion of existing review
- NOT create new separate review (one review per customer per product enforced)

**WHEN customer updates existing review, THE system SHALL display: "You have already reviewed this product. Edit your review or delete and create new review".**

#### Review Window

**WHEN order is delivered, THE system SHALL mark that date as review eligibility start date.**

**WHEN an order is delivered, THE system SHALL allow customer to submit review for 365 days (1 year) from delivery date.**

**AFTER 365 days have passed since delivery, THE system SHALL NOT allow new reviews to be created for that order (existing reviews remain visible).**

**Example review window**:
```
Order delivered: 2024-01-01
Review window: 2024-01-01 to 2024-12-31
On 2025-01-02: Review submission blocked - window closed
```

### 8.2 Review Moderation

#### Content Moderation

**WHEN review is submitted, THE system SHALL automatically scan for profanity, hate speech, and abusive language.**

**WHEN flagged content is detected:**
- High confidence violations (severe profanity, hate speech): Hold review in "PENDING_MODERATION" status
- Medium confidence violations: Queue for admin review before publication
- Low confidence violations: Approve and display with flag for potential human review

**THE system SHALL require admin approval before offensive review becomes publicly visible.**

**WHEN admin reviews flagged review:**
- Option 1: Approve - Review published publicly
- Option 2: Reject - Review deleted, customer notified with reason
- Option 3: Edit - Admin removes offensive portion, publishes edited version

#### Spam Prevention

**WHERE review text is identical or >90% similar to another customer's review for same product, THE system SHALL flag as potential spam/abuse.**

**WHERE customer submits more than 10 reviews within single 24-hour period, THE system SHALL flag account for review and hold reviews pending human verification.**

**THE system SHALL reject reviews containing external URLs, email addresses (containing @), or phone numbers with message: "Reviews cannot contain contact information or external links".**

**Example spam detection**:
```
Spam 1: Review text identical to another review → Flag
Spam 2: URL in review: "Buy at competitor.com" → Reject  
Spam 3: Email in review: "Contact me at john@email.com" → Reject
Spam 4: Phone: "Call 555-1234 for discount" → Reject
```

### 8.3 Rating Calculation

#### Average Rating Computation

**THE system SHALL calculate product average rating as arithmetic mean of all approved individual ratings:**

Average Rating = Sum of all ratings / Number of approved reviews

**WHERE product has 5 approved reviews with ratings [5, 5, 4, 3, 5]:**
- Sum: 5+5+4+3+5 = 22
- Average: 22/5 = 4.4 stars

**WHEN new review is added, THE system SHALL recalculate average rating immediately and update product display within 2 seconds.**

**WHEN review is rejected during moderation, THE system SHALL NOT include that rating in average calculation.**

#### Rating Distribution

**THE system SHALL display rating breakdown showing:**
- Count of 5-star reviews (and percentage of total)
- Count of 4-star reviews (and percentage of total)
- Count of 3-star reviews (and percentage of total)
- Count of 2-star reviews (and percentage of total)
- Count of 1-star reviews (and percentage of total)
- Total review count

**Example rating distribution**:
```
5 Stars: 245 reviews (48%)
4 Stars: 156 reviews (31%)
3 Stars: 68 reviews (13%)
2 Stars: 22 reviews (4%)
1 Star: 15 reviews (3%)
Total: 506 reviews | Average: 4.24 stars
```

### 8.4 Seller Response Management

#### Seller Response Capability

**WHEN customer submits review for seller's product, THE system SHALL notify seller and allow response within 30 days of review submission.**

**WHERE seller provides response to review, THE system SHALL display seller response alongside review visible to all customers.**

**WHEN seller response is submitted, THE system SHALL:**
1. Mark response as "Seller Response" with seller name/store
2. Display response timestamp
3. Notify customer that seller has responded
4. Place response immediately after original review

**THE seller response SHALL be editable by seller anytime after initial submission, allowing corrections or updates.**

**Example review with seller response**:
```
Customer Review (Posted Jan 15):
"Product arrived defective. Display doesn't work. Very disappointed."
Rating: 1 star

Seller Response (Posted Jan 16):
"We're sorry to hear about your experience. This is unusual for our products. 
Please contact us directly for immediate replacement. We will make this right."
- Blue Electronics Store
```

---

## 9. Seller Commission and Policy Rules

### 9.1 Commission Structure

#### Commission Calculation Methodology

**WHEN order is successfully completed and payment cleared, THE system SHALL calculate seller commission as 10% of order subtotal (excluding taxes and shipping).**

**Commission calculation formula**:
```
Commission = Order Subtotal × 0.10
Order Subtotal = Sum of (product_price × quantity) for all items
```

**Example commission calculation**:
```
Item 1: $50.00 × 2 = $100.00
Item 2: $25.00 × 1 = $25.00
Order Subtotal: $125.00
Tax (8%): $10.00
Shipping: $5.00
Order Total: $140.00

Commission (10% of subtotal): $125.00 × 0.10 = $12.50
Seller Net: $125.00 - $12.50 = $112.50
```

**WHERE order includes multiple products from different sellers, THE system SHALL calculate commission per seller based on each seller's portion of order.**

**Multi-seller example**:
```
Order contains:
- Seller A: Item worth $50 (commission: $5)
- Seller B: Item worth $75 (commission: $7.50)
Total commission collected: $12.50
Seller A receives: $45.00 (net)
Seller B receives: $67.50 (net)
```

**WHEN seller achieves "Top Seller" status (100+ successful orders in 30 days with 4.5+ average rating), THE system SHALL apply reduced commission rate of 7% instead of standard 10%.**

**Top Seller commission example**:
```
Seller qualifies for Top Seller status on Oct 20
Commission changes effective Oct 20 onwards
Order placed Oct 19: 10% commission applied
Order placed Oct 21: 7% commission applied
```

#### Commission Deduction Timing

**WHEN order is confirmed and payment is successfully received, THE system SHALL immediately calculate and deduct commission from seller payout.**

**WHEN seller's commission is deducted, THE system SHALL display in seller dashboard:**
- Order amount
- Commission percentage applied
- Commission amount deducted
- Net amount credited to seller

**WHEN an order is cancelled or refund is processed, THE system SHALL reverse previously deducted commission:**
- If seller payment already issued with commission deducted: Deduct refund from next week's payout
- Commission on refunded order is NOT charged to seller

**THE system SHALL process seller payments weekly on Mondays (UTC) for all commissions accumulated in previous Monday-Sunday week.**

**Example seller payment schedule**:
```
Week 1 (Oct 7-13): Sales $1,500 → Commission $150 → Seller net $1,350
Week 2 (Oct 14-20): Sales $2,000 → Commission $200 → Seller net $1,800
Payment issued Monday Oct 21: $3,150 total (both weeks combined)
```

---

## 10. Compliance and Governance

### 10.1 Audit and Data Retention

**WHEN an order is completed, THE system SHALL retain complete order data (including customer and payment information) for minimum of 7 years for compliance, audit, and legal purposes.**

**THE system SHALL NOT delete order records except through explicit legal request (e.g., GDPR right to be forgotten with proper authorization and approval).**

**WHEN customer requests account deletion, THE system SHALL anonymize customer personal data (email, name, address) after 90 days while retaining anonymized order records indefinitely for analytics.**

### 10.2 Security Compliance

**WHEN processing card payments, THE system SHALL NOT store full credit card numbers, expiration dates, or CVV codes anywhere in application databases (PCI-DSS requirement).**

**WHEN processing card payments, THE system SHALL use PCI-compliant payment gateway for card tokenization and secure storage.**

**THE system SHALL store only: Card token from payment gateway, Last 4 digits of card for customer reference, Card brand/type (Visa, Mastercard, etc.).**

### 10.3 Fraud Detection and Prevention

**WHEN customer places order with billing address differing significantly from delivery address, THE system SHALL flag order for review before processing.**

**WHERE customer completes 5+ orders within 1 hour using different payment methods, THE system SHALL flag as potential fraud and hold orders pending review - not process automatically.**

**THE system SHALL monitor for velocity fraud patterns (same card or payment method used to create multiple seller accounts rapidly).**

**WHEN high-value order detected (exceeds $1,000), THE system SHALL require manual admin approval before payment is processed and order proceeds.**

**WHEN new customer (0 previous orders) places order exceeding $500, THE system SHALL require admin verification before fulfillment begins.**

---

## 11. Summary and Integration

These business rules and constraints form the operational foundation of the platform. All development team members must implement these rules consistently across all modules, APIs, and databases. Rule violations must result in clear error messages to users and comprehensive logging for administrators.

This document integrates with:
- [Product Catalog Management](./04-product-catalog-management.md)
- [Payment Processing](./07-payment-processing.md)  
- [Order Processing](./08-order-processing.md)
- [Inventory Management](./05-inventory-management.md)
- [Order Cancellation and Refunds](./11-order-management-cancellation.md)

> *Developer Note: This document defines business requirements and operational rules only. All technical implementations (database design, API architecture, caching strategies, security architecture, etc.) are at the discretion of the development team.*"