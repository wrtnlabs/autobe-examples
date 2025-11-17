## Seller Persona - Small Business Owner

A seller on the shopping mall platform is an independent business owner or small enterprise seeking to reach customers through a dedicated e-commerce storefront. Sellers operate independently but benefit from the platform's infrastructure, customer base, payment processing, logistics coordination, and visibility tools. Unlike customers, sellers have administrative control over their inventory, pricing, product listings, order fulfillment, and customer communication—subject to platform-wide policies.

Sellers are not employees of the platform but third-party vendors who agree to terms of service specifying product quality, shipping timelines, customer service standards, and compliance with advertising and safety regulations. The platform acts as a marketplace facilitator, not a retailer, and each seller maintains autonomy over their business practices while adhering to platform rules designed to protect buyers and maintain trust.

The seller journey is defined by four critical phases: onboarding, product and inventory management, order and customer fulfillment, and ongoing optimization. Each phase must be seamless, intuitive, and reliable to reduce friction for non-technical business owners.

## Onboarding Flow (Account Registration and Business Verification)

WHEN a new business owner visits the shopping mall website and selects "Become a Seller," THE system SHALL present a registration form requiring their email address, password, business name, and tax identification number (TIN).

WHEN the seller submits the registration form, THE system SHALL create an unverified seller account with limited permissions and send a verification email with a 24-hour expiration link.

WHEN the seller clicks the verification link, THE system SHALL unlock the next step: submitting documentary proof of business legitimacy.

WHEN the seller uploads supporting documents (government-issued business license, utility bill for business address, and bank account statement), THE system SHALL validate the documents for clarity, completeness, and match with provided business name and TIN.

IF the documents are invalid, unclear, or mismatched, THEN THE system SHALL reject the application and send an email detailing the specific failure reasons, with options to re-upload corrected documents.

IF the documents are accepted, THEN THE system SHALL assign the seller to a "Pending Approval" status and notify the admin team for manual review within 72 business hours.

WHILE the seller account is in "Pending Approval" status, THE system SHALL allow the seller to view their profile dashboard but SHALL NOT allow product listing, order access, or payment configuration.

WHEN the admin team approves the seller application, THE system SHALL change the seller status to "Active" and send a welcome email including instructions for setting up bank details, configuring shipping profiles, and accessing seller-specific tools.

THE seller SHALL NOT be permitted to list their first product until their bank account details have been submitted and verified.

## Product Listing Flow (Category Selection, Variant Creation, SKU Management)

WHEN a seller logs in and selects "Add New Product," THE system SHALL present a multi-step form starting with category selection from a predefined taxonomy.

THE system SHALL display category-dependent attributes (e.g., for clothing: size, color; for electronics: warranty period, wattage) as mandatory fields.

WHEN the seller selects a category that supports variants, THE system SHALL enable a "Product Variants" section allowing creation of SKUs.

THE system SHALL require each SKU to have a unique product code (SKU ID), a retail price, a base stock quantity, and at least one attribute combination (e.g., "Size: Large, Color: Red").

WHEN a seller adds a variant, THE system SHALL validate that no existing SKU has identical attribute values within the same product.

THE system SHALL prevent duplicate attributes (e.g., two "Color: Red" variants without differing sizes).

WHEN the seller submits the product, THE system SHALL validate that all required fields are filled, all prices are greater than zero, and all SKU stock quantities are non-negative integers.

IF the product contains unsupported image formats (e.g., .PSD, .AVI), THEN THE system SHALL reject the upload and list the invalid file types with guidance on acceptable formats (JPG, PNG, WEBP only).

IF the product title contains prohibited terms (e.g., "miracle cure," "FDA approved," "100% guaranteed" without certification), THEN THE system SHALL flag the listing for manual review by admin and notify the seller with recommendation to revise wording.

THE system SHALL not allow product publication until at least one valid SKU with positive inventory has been created.

WHEN the product is published, THE system SHALL immediately assign a unique product ID, generate a product URL (/products/[slug]), and make it visible to customers in search and category results.

## Inventory Management Flow (Stock Updates, Low Stock Alerts)

WHEN a customer purchases one or more SKUs in an order, THE system SHALL automatically reduce the available stock of each corresponding SKU by the purchased quantity.

WHOLE while a SKU's stock quantity falls below a configurable threshold (default: 5 units), THE system SHALL highlight the product in the seller dashboard with a "Low Stock" badge and send an alert email to the seller.

WHEN a seller manually updates the stock quantity of a SKU through the inventory dashboard, THE system SHALL validate that the new quantity is a non-negative integer and records the change as a system event with timestamp and user ID.

THE system SHALL prohibit negative stock adjustments unless explicitly authorized by admin for reconciliation purposes.

WHEN a seller receives physical inventory and wishes to add stock, THE system SHALL provide a "Receive Inventory" action that requires the seller to enter the number of units received, batch number (optional), and, if applicable, expiration date for perishable goods.

THE system SHALL prevent stock increases greater than 100 units in a single adjustment without triggering a warning requiring admin confirmation.

WHEN a seller marks a SKU as "Discontinued," THE system SHALL immediately hide the product from customer search and category views but retain historical data for order fulfillment and reporting purposes.

WHEN a discontinued SKU receives a new order (e.g., from a pre-order or incomplete transaction), THE system SHALL fulfill the order but prevent future purchases.

WHEN a product is fully out of stock (0 units), THE system SHALL maintain its visibility on the storefront with a "Sold Out" badge but SHALL NOT permit addition to cart.

## Order Fulfillment Flow (Order Processing, Shipping Updates)

WHEN an order is placed by a customer and payment is confirmed, THE system SHALL notify the relevant seller in real time via dashboard alert and email.

THE system SHALL group orders by seller—each seller sees only orders for products they listed.

WHEN a seller accesses their "Pending Orders" section, THE system SHALL display order details including customer name, shipping address, items with SKU IDs, total amount, payment method, and timestamp.

WHEN the seller clicks "Prepare Order," THE system SHALL lock the order for fulfillment and reduce inventory quantities by the ordered amount.

THE system SHALL require the seller to select or enter a shipping carrier and provide a tracking number before marking an order as "Shipped."

WHEN the seller enters a tracking number, THE system SHALL validate it against supported carrier formats (e.g., USPS, FedEx, DHL) and immediately notify the customer with an updated status.

WHEN the order status is changed to "Shipped," THE system SHALL automatically begin a 48-hour countdown for customer notification of delivery expectation.

WHEN the seller marks an order as "Cancelled" before dispatch, THE system SHALL restore the inventory of all SKUs involved and notify the customer that the order was cancelled.

IF the seller attempts to cancel an order that has already been shipped, THEN THE system SHALL prevent the action and display a warning: "Order has been dispatched. Contact customer and initiate refund through Returns Portal."

WHEN a seller confirms shipment, THE system SHALL populate the order tracking page with carrier name, tracking number, and estimated delivery window.

THE system SHALL allow sellers to generate printable packing slips and shipping labels directly from the order details screen.

## Review Response Flow

WHEN a customer submits a product review with a rating (1-5 stars), THE system SHALL display the review on the product page after a 48-hour moderation window for flagging inappropriate content.

THE system SHALL notify the seller via email and dashboard when a new review is posted.

WHEN the seller responds to a review, THE system SHALL allow one public reply per customer review, limited to 500 characters.

THE system SHALL prevent sellers from replying to their own reviews using alternate accounts or fake customer identities.

WHILE a review is flagged for violation (e.g., contains profanity, fake content, or promotional links), THE system SHALL hide the review from public view and notify the seller that the review is under review.

IF the review is determined to be valid by admin, THE system SHALL restore public visibility and notify the seller that the review remains active.

IF the review is determined to be a violation, THE system SHALL delete the review and notify the seller with reason, including customer warnings and possible suspension of review privileges.

THE system SHALL maintain an audit log for all seller replies to reviews with timestamps and author attribution.

## Sales Reporting Flow

WHEN a seller accesses the "Sales Reports" section, THE system SHALL generate a dynamic dashboard showing daily, weekly, and monthly revenue by product, reordered by highest grossing SKU.

THE system SHALL display gross revenue, net revenue (after platform fee), number of units sold, and average order value.

THE system SHALL allow the seller to filter reports by date range, product category, shipping method, or payment status (paid, refunded, pending).

THE system SHALL provide export options to download sales data as CSV or PDF, including product names, SKU IDs, customer count, and transaction history.

WHEN the seller selects "Year-to-Date" report, THE system SHALL display cumulative sales compared to previous year, growth percentage, and top 10 performing products.

THE system SHALL calculate seller commission payouts using the formula: (Net Revenue) × (1 - Platform Fee Rate) where the rate is standardized at 12% of gross revenue.

WHEN a seller requests a payout, THE system SHALL verify their bank account is verified and that the payout minimum ($25 USD) has been reached.

IF the payout request meets all criteria, THEN THE system SHALL submit a batch transfer request to the payment processor and display an estimated arrival date (3–5 business days).

IF the payout request is below minimum balance, THEN THE system SHALL return an error message: "Payouts require a minimum balance of $25. You currently have $[x] available."

THE system SHALL retain full transaction history for 7 years for tax and dispute resolution purposes.

## Account Settings Flow (Bank Details, Store Profile Updates)

WHEN a seller navigates to "Account Settings," THE system SHALL provide tabs for Profile, Bank Details, Notifications, and Security.

THE system SHALL require sellers to provide exact legal name, business legal name, and business address to match official documentation for tax compliance.

WHEN the seller updates their store logo, THE system SHALL enforce image size limits (max 5MB) and aspect ratio (1:1 recommended) and preview the upload in real time.

WHEN the seller changes their store description, THE system SHALL limit the text to 1000 characters and validate for prohibited terms (e.g., "#1" without certification, "best",""guaranteed").

WHEN the seller updates their bank account information, THE system SHALL validate the account number and routing number using checksum algorithms before storing.

THE system SHALL require re-authentication with 2-factor authentication (2FA) before any bank details or primary contact information are modified.

WHEN the seller enables or disables email notifications for order alerts, THE system SHALL store preferences and immediately apply them without requiring restart.

THE system SHALL allow sellers to opt out of promotional newsletters but SHALL NOT allow disabling of operational emails (order confirmations, shipping updates, compliance notices).

WHEN a seller requests account deletion, THE system SHALL require automated confirmation and render all products as "Discontinued" before initiating a 14-day waiting period.

DURING the 14-day waiting period, THE system SHALL hide the seller’s products from customers but allow existing orders to be fulfilled.

AFTER 14 days, THE system SHALL permanently delete all personally identifiable data of the seller while retaining aggregated sales data and order history for financial reporting.

THE system SHALL send a final notice to the seller confirming deletion and providing a download link for their sales history archive.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.