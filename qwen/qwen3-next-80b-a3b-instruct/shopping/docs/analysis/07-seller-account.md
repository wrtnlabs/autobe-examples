# Seller Account Management Requirements

### Seller Registration

WHEN a business entity wishes to become a seller on the shopping mall platform, THE system SHALL require the following information to be submitted:

- Legal business name
- Primary business contact name
- Business contact email address
- Business contact phone number
- Business registration number or tax identification number
- Business operating address
- Bank account details for payout (account number, routing number, bank name)
- Business category classification (e.g., electronics, clothing, home goods)

IF the submitted business name matches an existing seller account, THEN THE system SHALL reject the registration with error code SELLER_NAME_EXISTS.

IF any required field is missing or malformed, THEN THE system SHALL reject the registration with error code SELLER_REGISTRATION_INVALID_DATA.

WHEN registration is successfully submitted, THE system SHALL assign a unique seller ID and mark the account as "PENDING_VERIFICATION".

WHILE the seller account is in "PENDING_VERIFICATION" state, THE system SHALL restrict all product listing and order processing activities.

### Business Verification

WHEN a seller submits registration information, THE system SHALL initiate a manual verification process by an admin or verification specialist.

THE system SHALL enable the verification team to:

- Review submitted documents (business license, tax ID, proof of address)
- Contact the business via provided phone and email during business hours
- Verify business existence through public business registries
- Confirm the legitimacy of bank account ownership

IF the verification team determines the business is legitimate, THEN THE system SHALL transition the seller account to "APPROVED" state and notify the seller via email and in-app notification.

IF the verification team determines the business is fraudulent or lacks compliance documentation, THEN THE system SHALL transition the seller account to "REJECTED" state, notify the seller with specific rejection reasons, and log the rejection with audit trail.

WHEN a seller account is rejected, THE system SHALL prevent the same business entity from reapplying using identical information for 90 days.

IF a seller attempts to re-register after rejection with substantially identical information, THEN THE system SHALL automatically reject the application and flag it for fraud investigation.

### Product Listing

WHEN a seller creates or updates a product listing, THE system SHALL require the following information for every product:

- Product name (minimum 3 characters, maximum 200 characters)
- Product description (minimum 20 characters, maximum 5000 characters)
- Primary product category from approved category hierarchy
- Product brand name
- Images (minimum of 2, maximum of 8; formats: JPG, PNG; maximum file size: 5MB each)
- Base price (minimum $0.01, maximum $10,000; must be positive number with exactly 2 decimal places)
- Quality assurance certification (optional: CE, FDA, RoHS, etc.)

WHERE a product has variants (SKUs), THE system SHALL require at least one variant to be defined.

WHEN a seller attempts to add a product variant, THE system SHALL require:

- SKU (unique alphanumeric code, minimum 6 characters, maximum 20 characters)
- Variant name (e.g., "Red", "Large", "Wireless")
- Inventory quantity (integer, minimum 0, maximum 10000)
- Price adjustment (numeric, can be positive, negative, or zero; must be ±$9999.99 maximum difference from base price)

IF the requested SKU already exists for another seller's product, THEN THE system SHALL reject the variant creation with error code SKU_ALREADY_EXISTS.

IF the product category is prohibited for seller listing (e.g., weapons, tobacco, counterfeit goods), THEN THE system SHALL reject the product creation with error code CATEGORY_PROHIBITED.

WHEN a seller saves a product listing, THE system SHALL validate all required fields before submission.

THE system SHALL NOT allow sellers to list items that require special licensing without providing valid certification.

### Inventory Management

WHEN a seller views their product catalog, THE system SHALL display current inventory counts for every SKU.

WHEN a seller updates inventory levels, THE system SHALL allow real-time adjustment using one of two methods:

- Manual adjustment (enter new stock quantity, with reason field required)
- Import from CSV with SKU, quantity, and adjustment reason columns

WHEN inventory is manually adjusted, THE system SHALL require:

- The new quantity
- Adjustment reason (from predefined list: Stock Count, Damaged, Lost, Supplier Return, Theft, Calibration, Other)
- Optional notes (maximum 500 characters)

IF the inventory adjustment would result in negative stock for a product variant, THEN THE system SHALL prevent the adjustment.

IF a product's inventory falls below 5 units, THE system SHALL send an automated alert to the seller via email and push notification.

WHEN multiple customers attempt to purchase the last available unit of a product, THE system SHALL implement transactional locking to ensure only one purchase succeeds.

WHERE a product is out-of-stock, THE system SHALL display "Out of Stock" on the product page and disable the "Add to Cart" button for that variant.

THE system SHALL reserve inventory for items in a customer's cart for 15 minutes from the time the item was added.

IF a reserved item remains un-purchased after 15 minutes, THE system SHALL release the reservation and return the inventory to available stock.

### Sales Analytics

WHEN a seller views their dashboard, THE system SHALL display the following sales metrics:

- Total revenue for the last 7 days (USD)
- Total revenue for the last 30 days (USD)
- Total units sold for the last 7 days
- Total units sold for the last 30 days
- Total number of active listings
- Number of pending orders
- Number of shipped orders
- Average order value (last 30 days)
- Conversion rate (sessions to purchases, last 30 days)

THE system SHALL generate weekly revenue reports that include:

- Revenue by product category
- Revenue by product variant (SKU)
- Orders by day of week
- Top 10 best-selling products
- Top 5 countries/cities of customer origin
- Average review rating of products

THE system SHALL allow sellers to export reports in CSV format for each period.

WHEN a seller views product performance, THE system SHALL display:

- Number of page views for each product
- Number of clicks to "Add to Cart"
- Number of completed purchases
- Customer review rating count and average
- Customer review count per star level
- Cancellation rate per product

### Payout Setup

WHEN a seller account is approved, THE system SHALL require confirmation of payout preferences.

THE system SHALL support payout to:

- Bank account (ACH transfer)
- PayPal account

IF a seller selects bank account payout, THE system SHALL validate:

- Account number (minimum 6 digits)
- Routing number (9 digits)
- Bank name
- Account holder name matching business registration

IF a seller selects PayPal payout, THE system SHALL validate:

- PayPal email address (must be verified)
- Account owner name matching business registration

WHEN a payout method is confirmed, THE system SHALL store it encrypted and mark it as "active".

WHEN payout conditions are met (minimum $10.00 in pending balance, no pending disputes), THE system SHALL initiate payout every 7 days.

IF a payout fails due to invalid account information, THE system SHALL flag the account for review, notify the seller, and suspend payouts until corrected.

### Performance Metrics

WHEN a seller's performance is evaluated, THE system SHALL track:

- Order fulfillment rate (orders shipped within 48 hours of payment)
- Average response time to customer inquiries (within 24 hours)
- Customer satisfaction rating (average product review score)
- Return rate (percentage of orders returned)
- Fraud rate (percentage of orders flagged for review)

IF a seller has fulfillment rate below 90% for 3 consecutive weeks, THEN THE system SHALL send a warning notice and provide performance improvement resources.

IF a seller has return rate above 25% for 2 consecutive weeks, THEN THE system SHALL enable an audit review of their product listings, descriptions, and images.

IF a seller has customer satisfaction rating below 3.5 stars for 1 month, THEN THE system SHALL notify the seller and recommend product improvements or price adjustments.

IF a seller has fraud rate above 5%, THEN THE system SHALL suspend their ability to list new products pending investigation.

### Account Suspension

IF a seller violates the platform's terms of service, THE system SHALL initiate account suspension based on the following triggers:

- Listing prohibited items (weapons, drugs, counterfeit goods)
- Selling stolen or illegally obtained goods
- Posting fake reviews or manipulating ratings
- Attempting to defraud customers (e.g., non-shipment after payment, bait-and-switch)
- Repeated violations of inventory management rules
- Multiple customer complaints about non-delivery or counterfeit products
- Sell out with no intention to deliver (cancellation rate > 80% over 7 days)

WHEN suspension is triggered, THE system SHALL:

- Immediately suspend ability to list or update products
- Freeze all payouts
- Disable access to seller dashboard
- Notify the seller with specific violation details and evidence
- Preserve all order and transaction history for dispute resolution
- Assign a case ID for appeals process

WHILE suspended, THE system SHALL allow the seller to submit an appeal via dedicated portal with supporting documentation.

IF the appeal is approved by review team, THE system SHALL reactivate the seller account with full access.

IF the appeal is denied, THE system SHALL permanently terminate the account and prohibit re-registration under the same business credentials.

THE system SHALL maintain a permanent record of terminated accounts and associated business identifiers to prevent re-registration.

The seller account suspension and termination process SHALL include a formal review by at least two independent team members from fraud and compliance departments.

WHEN a seller account is permanently terminated, THE system SHALL:

- Notify the platform's legal team for record-keeping
- Archive all seller data for minimum 7 years
- Ensure all customer orders can still be fulfilled or refunded
- Prevent the business from using any affiliated accounts or identities
- Update customer-facing policy documentation to reflect account status

WHEN customer reviews are linked to a suspended or terminated seller, THE system SHALL preserve review visibility as part of the product's historical record.

WHEN a suspended seller's products are purchased, THE system SHALL ensure fulfillment obligations are still met by the platform (allocating inventory from other sellers if necessary) or refunds are processed automatically.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*