# Shopping Mall Platform Requirements Specification

## Platform Overview

The Shopping Mall platform is a comprehensive e-commerce solution designed to connect customers with sellers in a seamless digital marketplace. This platform enables individuals and businesses to participate in a dynamic commercial ecosystem where buyers can discover, purchase, and review products while sellers can manage their inventory, process orders, and build brand loyalty.

The platform delivers a unified experience that bridges the gap between traditional brick-and-mortar shopping malls and modern digital commerce, offering customers the convenience of online browsing combined with the variety and discovery of physical retail environments. With integrated customer, seller, and administrative functionality, the platform creates a self-sustaining marketplace ecosystem that generates value for all participants.

## Business Objectives

### Why This Service Exists

The Shopping Mall platform addresses a critical gap in the e-commerce landscape by providing an accessible, scalable marketplace infrastructure for small and medium-sized sellers who lack the resources to build and maintain their own e-commerce websites. Traditional e-commerce platforms require significant technical expertise, marketing investment, and operational overhead, creating barriers for independent sellers. This platform eliminates those barriers by offering:

- **Low-barrier seller onboarding**: Any business can register and start selling with minimal technical knowledge
- **Built-in customer base**: Sellers gain immediate exposure to millions of potential buyers without marketing costs
- **Integrated payment and logistics**: End-to-end transaction handling from cart to delivery without seller infrastructure
- **Trust infrastructure**: Reviews, ratings, and secure payments build buyer confidence

The platform captures value through transaction fees and premium seller services, creating an economically sustainable model that aligns incentives between the platform operator and marketplace participants.

### Revenue Strategy

The Shopping Mall platform follows a multi-faceted revenue model designed to be sustainable and scalable:

- Primary revenue stream: Commission fees (5-15%) on all completed transactions between customers and sellers
- Secondary revenue stream: Premium seller subscriptions offering enhanced visibility, analytics, and advertising tools
- Ancillary revenue: Value-added services for sellers including shipping label discounts, inventory management tools, and promotional campaigns
- Future expansion: Data analytics services for sellers, marketplace insights reports, and affiliate partnerships

Revenue is generated when transactions occur, aligning the platform's success directly with marketplace activity and growth.

### Growth Plan

The platform's growth strategy focuses on three key pillars:

1. **Seller Acquisition**: Target small and medium-sized businesses with niche products through targeted outreach, trade shows, and e-commerce education partnerships
2. **Customer Acquisition**: Utilize digital marketing, referral programs, and performance advertising to attract shoppers seeking unique, non-commodity products
3. **Platform Ecosystem Expansion**: Develop integrations with shipping providers, payment processors, and business tools to increase seller retention and value

A key growth metric is increasing the number of active sellers per customer, creating network effects where more sellers attract more customers, which in turn attracts more sellers.

### Success Metrics

The platform's success will be measured by the following key performance indicators:

- **Monthly Active Users (MAU)**: Total unique customers engaging with the platform monthly
- **Monthly Active Sellers (MAS)**: Total unique sellers listing products monthly
- **Gross Merchandise Volume (GMV)**: Total value of goods sold on the platform monthly
- **Transaction Conversion Rate**: Percentage of product views that result in purchases
- **Seller Retention Rate**: Percentage of sellers who continue operating after their first month
- **Customer Retention Rate**: Percentage of customers who make repeat purchases
- **Average Order Value (AOV)**: Median value of completed transactions
- **Customer Acquisition Cost (CAC)**: Cost to acquire each new customer
- **Customer Lifetime Value (CLTV)**: Predicted revenue from a customer over their relationship with the platform

## Target User Segments

### Customer

Customers represent the primary buyers on the platform. They are individuals seeking to purchase products across a wide variety of categories with convenience, variety, and trust.

Key characteristics of customers:
- Browse and search for products using categories and search functionality
- Add items to shopping cart and wishlist
- Store and manage multiple shipping addresses
- Place orders with various payment methods
- Track order status and shipping updates
- Write reviews and ratings for purchased products
- View order history and request cancellations/refunds
- Maintain privacy and account security

Customers expect a seamless, intuitive experience that mirrors the convenience of major retail platforms while offering discovery of unique and specialized products.

### Seller

Sellers represent the product providers on the platform. These include small businesses, individual artisans, specialty retailers, and independent brands who want to reach customers without building their own e-commerce infrastructure.

Key characteristics of sellers:
- Register and verify their business identity
- Create product listings with variants (SKU) and pricing
- Manage inventory levels for each product variant
- View sales analytics and performance metrics
- Process and fulfill customer orders
- Manage customer communications and reviews
- Update product information, pricing, and availability
- Access administrative tools for business management

Sellers prioritize tools that simplify operations, provide actionable insights, and help grow their business with minimal overhead.

### Admin

Administrators possess full control over the platform and act as stewards ensuring its integrity, security, and operational excellence.

Key characteristics of admins:
- Manage all user accounts (customers, sellers, and other admins)
- Approve or reject seller registrations and product listings
- Monitor and moderate product content for compliance
- Investigate and resolve disputes between customers and sellers
- Manage payment processing configurations
- Maintain inventory compliance and fraud prevention systems
- Configure platform-wide settings including pricing, categories, and policies
- Audit system activity and maintain compliance records
- Implement platform upgrades and maintenance

Admins require comprehensive visibility and control tools to maintain trust, security, and regulatory compliance across the entire marketplace.

## Functional Requirements

### Customer Registration and Management

WHEN a new user visits the platform, THE system SHALL provide an option to create a customer account. 

WHEN a user selects to create an account, THE system SHALL collect:
- Full name
- Email address (must be unique and valid)
- Phone number (optional)
- Password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)

WHEN the user submits registration details, THE system SHALL:
- Send a verification email to the provided address
- Store the user record with status "unverified"
- Lock password attempts after 5 consecutive failures

WHEN the user clicks the verification link in their email, THE system SHALL:
- Change the user status to "active"
- Create a default "Home" shipping address with empty fields
- Log the verification event in the audit trail

WHEN a registered user attempts to log in, THE system SHALL:
- Verify email and password against stored credentials
- Generate a secure JWT token with 7-day expiration
- Record login timestamp and IP address
- Return token in HTTP response header

WHEN a user forgets their password, THE system SHALL:
- Allow password reset request using registered email
- Generate a one-time reset token with 1-hour expiration
- Send email with reset link containing the token
- Allow password update only when valid token is provided
- Invalidate token after successful password change

WHEN a user successfully logs in, THE system SHALL:
- Store session information in authenticated state
- Enable access to personal dashboard, order history, and profile management
- Maintain persistent cart items across sessions

WHEN a user changes their profile information, THE system SHALL:
- Allow update of name, phone number, and notification preferences
- Prevent email address changes without re-verification
- Log all profile modification events

WHEN a user deletes their account, THE system SHALL:
- Set account status to "archived"
- Anonymize personal identifiable information
- Retain order history and review data for business and compliance purposes
- Send confirmation email of account deletion

### Address Management

WHEN a customer views their profile, THE system SHALL display:
- Current default shipping address
- List of all saved addresses
- "Add New Address" button

WHEN a customer adds a new address, THE system SHALL:
- Require: full name, street address, city, state/province, postal code, country, phone number
- Validate: postal code format per country
- Validate: phone number format per country
- Allow labeling of addresses (e.g., "Home", "Work", "Vacation")
- Set newly added address as default if no other address exists

WHEN a customer edits an existing address, THE system SHALL:
- Allow modification of all fields except the creation timestamp
- Maintain version history of address changes
- Update the address across all pending orders

WHEN a customer sets an address as default, THE system SHALL:
- Remove default status from all other addresses
- Mark selected address as "default"
- Apply this address to all future checkout workflows

WHEN a customer removes an address, THE system SHALL:
- Prevent deletion of the default address if it's the only one
- Prompt for confirmation if address has been used in past orders
- Archive the address record instead of permanent deletion
- Maintain association of archived addresses with historical orders

### Product Catalog

WHEN a customer browses products, THE system SHALL:
- Display products organized by hierarchical categories (max 3 levels deep)
- Show product name, primary image, price range (if variant), average rating (0-5 stars), and "In Stock" indicator
- Allow browsing of categories through interactive navigation tree

WHEN a customer searches for products, THE system SHALL:
- Return results matching product name, description, or category keywords
- Support fuzzy matching (e.g., "smart phne" finds "smartphone")
- Prioritize exact matches over partial matches
- Show results in order of relevance (name match > description match > category match)
- Display total count of matching products
- Allow pagination with 24 products per page

WHEN a customer applies filters, THE system SHALL:
- Filter products based on selected category, price range, brand, and availability status
- Dynamically update available filter options based on current selection (e.g., if "Red" is selected, show only colors available in selected price range)
- Support multiple selection in category, brand, and price range filters
- Reset all filters when "Clear All" is clicked

WHEN a customer sorts products, THE system SHALL:
- Offer sorting by: price (low to high), price (high to low), name (A-Z), name (Z-A), top rated, newest first
- Display active sort option with visual indicator
- Maintain current filters and search query when changing sort

WHEN a product is out of stock, THE system SHALL:
- Display "Out of Stock" banner on product card
- Disable "Add to Cart" button
- Show "Notify When Available" option for registered users
- Maintain product visibility in search and category results

WHEN a product has multiple variants, THE system SHALL:
- Display "Available Options" badge
- Show price range (e.g., "From $19.99 - $49.99")
- Allow variant selection from product detail page

### Product Variants

WHEN a seller creates a new product, THE system SHALL:
- Require base product information: name, description, main image, category
- Allow optional base price and inventory level
- Provide "Add Variant" button to create multiple product SKUs

WHEN a product variant is created, THE system SHALL:
- Generate unique SKU using pattern: SKU-{categoryCode}-{timestamp}-{serial}
- Record: color, size, material, weight, dimensions, and other applicable attributes
- Allow independent pricing for each variant
- Allow independent inventory level for each variant
- Allow independent images for each variant if needed

WHEN a variant has specific attributes, THE system SHALL:
- Store attribute values in structured JSON format
- Support custom attribute names defined per product category (e.g., "Screen Size" for electronics, "Fit" for clothing)
- Validate attribute combinations for consistency (e.g., "Color: Red" and "Size: XL" must be available in same inventory)

WHEN inventory is updated, THE system SHALL:
- Update inventory count for the specific variant only
- Calculate total product inventory as sum of all variant inventories
- Automatically disable variant when inventory reaches zero
- Automatically re-enable variant when inventory is restocked

WHEN a customer views a product with variants, THE system SHALL:
- Display each available variant as a selectable option in UI
- Show price change dynamically when variant selection changes
- Show real-time availability status for each variant
- Enable "Add to Cart" only when variant has inventory > 0

WHEN a customer adds a variant to cart, THE system SHALL:
- Store variant SKU and selected attributes in cart item
- Calculate and store final price at time of addition
- Check inventory lock against other concurrent purchases

WHEN an order is placed containing variants, THE system SHALL:
- Lock inventory for all variants in cart at time of checkout
- Update inventory levels upon successful payment
- Send order confirmation with exact variant details (color, size, etc.)
- Maintain variant-specific information for return/refund purposes

### Shopping Cart

WHEN a customer adds a product to cart, THE system SHALL:
- Store cart item with: product ID, variant SKU, quantity, unit price at time of addition, total price
- Allow quantity adjustment from 1-10 (max 10 per item)
- Show notification "Added to cart" with "Go to Cart" button
- Maintain cart state across browser sessions (using encrypted localStorage)

WHEN a customer views their cart, THE system SHALL:
- Display each item with: product image, name, variant details, quantity selector, unit price, total price
- Show subtotal, estimated tax, shipping (if applicable), and grand total
- Highlight items with low inventory (less than 5 available)
- Allow removal of items individually
- Show "Continue Shopping" and "Proceed to Checkout" buttons

WHEN a customer changes quantity of an item in cart, THE system SHALL:
- Validate that requested quantity ≤ available inventory of variant
- Recalculate total price dynamically on frontend
- Save updated quantity to cart storage

WHEN a customer removes an item from cart, THE system SHALL:
- Remove the cart item immediately
- Recalculate all totals
- Update cart count in navigation bar

WHEN a customer adds a product that is out of stock, THE system SHALL:
- Prevent selection of out-of-stock variants
- Display "Out of Stock" message
- Show alternative available variants if any

WHEN a customer's cart contains items with insufficient inventory at checkout, THE system SHALL:
- Show warning message: "Some items in your cart have limited stock available. Please review before proceeding."
- Disable checkout button until items are removed or quantity reduced
- Allow user to continue shopping or remove low-stock items

WHEN a customer leaves the site with an active cart, THE system SHALL:
- Preserve cart contents for 14 days
- Restore cart when user returns and re-authenticates
- Clear cart after 14 days of inactivity

WHEN a registered user logs in with cart items from previous session, THE system SHALL:
- Merge items in current cart with items in database cart
- Resolve conflicts by keeping the higher quantity
- Flag items in database cart that are no longer available
- Remove unavailable items and notify user

WHEN a guest user adds items to cart and then registers, THE system SHALL:
- Automatically transfer cart items to new account
- Associate cart items with newly created user ID
- Clear guest cart and display confirmation message

### Wishlist

WHEN a customer views a product, THE system SHALL:
- Display heart icon for "Add to Wishlist"
- Show "Added to Wishlist" confirmation when clicked

WHEN a customer clicks "Add to Wishlist", THE system SHALL:
- Save product ID and variant SKU to wishlist database
- Update heart icon to filled state
- Increase wishlist count in navigation bar

WHEN a customer views their wishlist, THE system SHALL:
- Display all saved items with: product name, image, availability status, price
- Show same product variant details as catalog
- Allow filtering by availability: "All", "In Stock Only", "Out of Stock Only"
- Allow removal of individual items
- Allow "Move to Cart" operation for items in stock
- Allow "Delete All" operation with confirmation

WHEN a product in wishlist becomes out of stock, THE system SHALL:
- Display "Out of Stock" badge on wishlist item
- Disable "Move to Cart" button
- Send email notification to user 24 hours after stock depletion

WHEN a product in wishlist returns to stock, THE system SHALL:
- Remove "Out of Stock" badge
- Enable "Move to Cart" button
- Send email notification to all users who have it in wishlist

WHEN a product is deleted by seller, THE system SHALL:
- Remove product from all wishlists
- Notify affected users via email
- Display "Product no longer available" message in wishlist

WHEN a customer moves an item from wishlist to cart, THE system SHALL:
- Add item to cart with default quantity of 1
- Validate that variant has sufficient inventory
- If not in stock, prevent movement and display error
- Remove item from wishlist
- Show "Added to Cart" notification

### Order Placement

WHEN a customer clicks "Proceed to Checkout", THE system SHALL:
- Require user to be logged in
- If not logged in, redirect to login and preserve checkout state
- Load billing and shipping addresses from user profile
- Show default shipping method (standard shipping)
- Show payment methods on file
- Show cart summary with tax and total

WHEN a customer selects a shipping address, THE system SHALL:
- Use selected address for both billing and shipping if "Same as shipping" is checked
- Allow different billing address independently
- Validate address for completeness and format
- Calculate shipping costs based on destination and weight

WHEN a customer selects a shipping method, THE system SHALL:
- Show available options: Standard (3-5 business days), Expedited (1-2 business days), Overnight
- Display estimated delivery date for each option
- Calculate and display cost for each option
- Show free shipping promotion if eligible
- Update order total dynamically when shipping method changes

WHEN a customer selects a payment method, THE system SHALL:
- Show options: Credit/Debit Card, Digital Wallets (Apple Pay, Google Pay), PayPal, Store Credit
- Allow use of saved cards
- Allow addition of new card with PCI-compliant secure entry
- Validate card number with Luhn algorithm
- Validate CVV (3-4 digits)
- Validate expiration date (must be in future)

WHEN a customer enters a discount code, THE system SHALL:
- Validate code format (alphanumeric, 8-16 characters)
- Check if code is active and hasn't expired
- Check if code applies to all items in cart (or specific products)
- Apply discount percentage or fixed amount
- Show original subtotal, discount amount, and final total
- Prevent stacking of discount codes

WHEN a customer reviews order summary, THE system SHALL:
- Show all items with quantity, variant details, price
- Show subtotal, promotional discounts, shipping cost, tax, grand total
- Show estimated delivery date
- Show return and refund policy link
- Show terms and conditions checkbox

WHEN a customer submits order, THE system SHALL:
- Validate all required fields are complete
- Validate inventory availability for all cart items at time of submission
- Validate payment method validity
- Reserve inventory for order
- Create pending order record with unique order ID
- Charge payment immediately (capture funds)
- Send order confirmation email with tracking link
- Clear cart after successful submission
- Redirect to order confirmation page

WHEN a customer's payment fails, THE system SHALL:
- Show appropriate error message based on error type (insufficient funds, invalid card, declined)
- Allow retry with different payment method
- Maintain cart state and order details
- Prevent order creation until payment succeeds
- Log payment failure in audit trail

WHEN a customer has insufficient inventory on order submission, THE system SHALL:
- Show warning: "Some items in your cart are no longer available in the requested quantity. Please adjust your order or remove items."
- Highlight items with insufficient inventory
- Allow user to reduce quantity or remove items
- Disable order submission until all items have sufficient inventory

WHEN an order is successfully placed, THE system SHALL:
- Generate a permanent order record in database
- Assign order status: "Payment Confirmed"
- Create order tracking number
- Send confirmation email to customer
- Send order notification to seller responsible for each product
- Deduct inventory from seller's stock
- Trigger payment processing to vendor settlement
- Update customer's order history

### Payment Processing

WHEN a payment request is initiated, THE system SHALL:
- Accept all major credit cards (Visa, Mastercard, American Express, Discover)
- Accept major digital wallets (Apple Pay, Google Pay, PayPal)
- Accept store credit and gift cards
- Validate card number format with Luhn algorithm
- Validate CVV format (3-4 digits)
- Validate expiration date isn't past
- Validate billing address matches card issuer

WHEN a credit card payment is processed, THE system SHALL:
- Send request to payment gateway with encrypted card data
- Handle authorization and capture phases
- Store payment token for future purchases (if customer consents)
- Record transaction ID, amount, currency, status, and timestamp
- Log gateway response code and error message

WHEN a digital wallet payment is processed, THE system SHALL:
- Use wallet SDK to initiate secure payment flow
- Receive payment token from wallet provider
- Send token to payment processor for settlement
- Store transaction metadata with wallet provider reference

WHEN a payment is authorized but not captured, THE system SHALL:
- Place temporary hold on funds
- Notify customer of pending payment
- Allow automatic capture within 30 minutes of order placement
- Cancel authorization if capture fails or exceeds timeout
- Release hold on funds if authorization expires

WHEN a payment is declined, THE system SHALL:
- Show clear message: "Payment declined: {reason}"
- Display common reasons: insufficient funds, invalid card, security block
- Allow customer to try again with different card or payment method
- Limit retry attempts to 3 within 15 minutes
- Log all decline reasons with merchant-specific details

WHEN a payment is successful, THE system SHALL:
- Immediately capture funds from customer account
- Update order status to "Payment Confirmed"
- Generate payment receipt with transaction ID
- Send email receipt to customer
- Trigger fulfillment workflow
- Update merchant balance for commission calculation

WHEN a partial refund is requested, THE system SHALL:
- Allow refund of up to 100% of original payment amount
- Calculate refund amount based on returned items
- Initiate refund through original payment channel
- Show status: "Refund Initiated" → "Refunded" → "Failed"
- Update order status and inventory when refund completes
- Send refund confirmation email

WHEN a full refund is requested, THE system SHALL:
- Process immediate refund of entire payment amount
- Return inventory to seller stock
- Set order status to "Refunded"
- Send complete refund confirmation
- Update accounting records

WHEN a refund cannot be processed through original channel, THE system SHALL:
- Offer store credit as alternative
- Create store credit voucher with expiry date (2 years)
- Notify customer of alternative refund method
- Record credit amount and issue details

WHEN a chargeback is initiated by the customer's bank, THE system SHALL:
- Immediately freeze seller payout for associated order
- Notify seller and admin of chargeback request
- Initiate dispute process with payment processor
- Provide documentation (order details, delivery proof, communication)
- Adjust final payout if chargeback is upheld
- Apply fee for chargeback if applicable

WHEN a refund is processed by seller instead of platform, THE system SHALL:
- Record refund as "seller-initiated"
- Update order status to "Refunded (Seller)"
- Adjust seller payout accordingly
- Reconcile with platform commission
- Notify customer of seller-initiated refund

### Order Tracking

WHEN an order is placed, THE system SHALL:
- Assign unique order ID in format: ORD-{YYYYMMDD}-{5-digit-sequence}
- Set initial status: "Payment Confirmed"
- Generate tracking number: tracking-{orderID}
- Email customer with order details and tracking link

WHEN an order status changes, THE system SHALL:
- Transition through approved statuses:
  - "Payment Confirmed" → "Processing" → "Preparing for Shipment" → "Shipped" → "Out for Delivery" → "Delivered" → "Completed"
  - OR "Payment Confirmed" → "Processing" → "Cancelled" → "Refunded" 
- Update status only by system processes or authorized admin
- Record timestamp and responsible agent for each transition
- Notify customer via email and push notification on status change

WHEN an order enters "Processing" status, THE system SHALL:
- Assign order to responsible seller
- Verify product availability
- Calculate weight for shipping
- Generate packing slip for warehouse
- Notify seller of new order

WHEN an order enters "Preparing for Shipment" status, THE system SHALL:
- Confirm item selection and packaging
- Verify correct variant and quantity
- Apply custom packaging (gift wrap, etc.) if ordered
- Print shipping label with tracking number
- Confirm packaging is complete in system

WHEN an order enters "Shipped" status, THE system SHALL:
- Send shipment data to carrier (FedEx, UPS, DHL, local courier)
- Receive tracking update from carrier
- Confirm package has been scanned by carrier
- Update estimated delivery date
- Notify customer that package is in transit

WHEN an order enters "Out for Delivery" status, THE system SHALL:
- Display delivery window if provided by carrier
- Show real-time tracking map if carrier supports it
- Send SMS/email with delivery notification
- Notify customer of delay if applicable

WHEN an order enters "Delivered" status, THE system SHALL:
- Record timestamp and delivery location
- Confirm with delivery photo or signature data
- Remove order from warehouse queue
- Set delivery confirmation status
- Notify customer that order has been delivered
- Enable review submission

WHEN an order enters "Completed" status, THE system SHALL:
- Release seller payout (after 7-day review period)
- Calculate and apply commission
- Enable customer to request return/refund
- Archive order for long-term storage

WHEN an order is cancelled before shipment, THE system SHALL:
- Set status to "Cancelled"
- Refund payment immediately
- Return inventory to seller stock
- Notify customer of cancellation
- Notify seller of cancelled order

WHEN an order is cancelled after shipment, THE system SHALL:
- Set status to "Cancelled after Shipment"
- Initiate return process
- Provide return shipping label
- Refund after item is received and inspected
- Update seller balance after return

WHEN a customer requests order tracking, THE system SHALL:
- Show interactive tracking timeline
- Display current status with timestamp
- Show recent location updates from carrier
- Show estimated delivery date
- Show delivery confirmation information (if available)
- Allow download of shipping invoice
- Allow customer to contact seller for order questions
- Allow customer to file claim if delivery fails

### Product Reviews and Ratings

WHEN a customer purchases a product, THE system SHALL:
- Automatically enable review submission after 5 days
- Allow review submission for each variant purchased
- Prevent review submission for products not owned

WHEN a customer submits a review, THE system SHALL:
- Require rating from 1 to 5 stars
- Accept optional title and detailed comment (min 10 characters, max 1000 characters)
- Allow photo uploads (max 5 images, each ≤ 5MB)
- Verify customer owns the product (order history check)
- Store reviewer identity as "Verified Buyer"

WHEN a review is submitted, THE system SHALL:
- Set status to "Pending Moderation"
- Send notification to admin for review
- Record submission timestamp
- Prevent duplicate reviews by same user for same variant

WHEN an admin moderates a review, THE system SHALL:
- Approve review if it contains no explicit content, hate speech, or inappropriate references
- Reject review if it contains: profanity, personal information, promotion of other brands, false claims
- Allow admin to edit review (remove inappropriate words)
- Notify customer of approval/rejection via email
- Record moderation decision and admin ID

WHEN a review is approved, THE system SHALL:
- Set status to "Published"
- Calculate weighted average rating for product variant
- Update product review count and star rating
- Display review publicly on product page
- Send notification to seller

WHEN a review is rejected, THE system SHALL:
- Set status to "Rejected"
- Hide review from public display
- Notify customer with reason for rejection
- Record reason code for analysis
- Log rejected review for compliance audit

WHEN a customer edits their review, THE system SHALL:
- Allow edit only within 30 days of submission
- Preserve original submission timestamp
- Create new version with "Edited" tag
- Store edit history for moderation purposes
- Show edit count to readers

WHEN a customer reports a review, THE system SHALL:
- Allow reporting for: offensive content, false information, spam, impersonation
- Show reason selection: "Spam", "Inappropriate", "False Claim", "Other"
- Allow optional comment explaining report
- Set review status to "Under Review"
- Notify admin of report
- Notify reporter of report status

WHEN a report is processed, THE system SHALL:
- Review report and original review
- Take action: approve, reject, edit
- Notify reporter of outcome
- Record outcome in audit log
- Apply negative reputation penalty if abuse is confirmed

WHEN a seller responds to a review, THE system SHALL:
- Allow response up to 500 characters
- Mark response as "Seller Reply"
- Display response below original review
- Show responder as verified seller
- Notify customer of reply via email
- Allow only one response per review

WHEN a review receives a response, THE system SHALL:
- Show "Has Seller Response" badge
- Display response text directly beneath review
- Update last modified timestamp
- Prevent further edits by reviewer after response
- Count response as part of overall review quality

WHEN product receives minimum 5 approved reviews, THE system SHALL:
- Display star rating on product cards in catalog
- Include review count in search results
- Show "Rated by X customers" badge

WHEN a product has no reviews, THE system SHALL:
- Display "Be the first to review" prompt
- Allow customer to add review after purchase
- Show review submission section after 5-day waiting period

### Seller Management

WHEN a business wants to become a seller, THE system SHALL:
- Allow application through "Become a Seller" button on homepage
- Require: business name, legal business registration details, tax ID, business email, business phone
- Require: business address for verification
- Require: bank account information for payouts

WHEN a seller submits registration, THE system SHALL:
- Set status to "Pending Verification"
- Send automated verification request to government database for business registration
- Send email to seller with verification status link
- Assign admin for manual review if automated verification fails
- Record IP address and device fingerprint for fraud detection

WHEN admin approves seller registration, THE system SHALL:
- Set seller status to "Approved"
- Create seller dashboard with limited access
- Send welcome email with onboarding guide
- Enable product listing capability
- Set initial payment payout settings

WHEN admin rejects seller registration, THE system SHALL:
- Set status to "Rejected"
- Send email with reason for rejection
- Allow seller to reapply after 7 days
- Log rejection reason in audit trail

WHEN a seller logs in, THE system SHALL:
- Access seller-specific dashboard
- Manage product listings
- View sales analytics
- Process customer orders
- Manage inventory
- Respond to reviews
- View financial summary
- Access support tools

WHEN a seller creates a product listing, THE system SHALL:
- Require product name, description, category
- Require primary image
- Allow multiple product images
- Require base category selection
- Require product condition (New, Refurbished, Used)
- Allow optional keywords and tags
- Allow specification of return policy
- Allow specification of shipping options
- Allow specification of packaging details

WHEN a seller adds product variants, THE system SHALL:
- Use same interface as customer-facing variant creation
- Generate unique SKU automatically
- Set independent pricing per variant
- Set independent inventory per variant
- Upload variant-specific images if needed
- Mark variant as active/inactive

WHEN a seller updates product information, THE system SHALL:
- Allow modification of name, description, images, keywords
- Allow modification of return policy, shipping options
- Allow deactivation of entire product
- Allow price change
- Allow inventory adjustment
- Record change history with timestamp and admin audit
- Send notification if changes affect active orders

WHEN a seller manages inventory, THE system SHALL:
- Update inventory levels per SKU
- Set low stock alert (trigger when < 5 units)
- Set out of stock flag (when = 0 units)
- View inventory history by date
- Import bulk inventory update via CSV
- See forecasted stock based on sales velocity

WHEN a seller processes customer orders, THE system SHALL:
- View new order notifications on dashboard
- View order details including customer info, products, shipping address
- Mark order as "Packed" when ready for shipment
- Generate shipping label
- Enter tracking number
- Confirm shipment
- View order history

WHEN a seller responds to customer reviews, THE system SHALL:
- Access reviews from sales analytics dashboard
- Read review and customer rating
- Submit response up to 500 characters
- Mark response as "Official Seller Response"
- Notify customer of response

WHEN a seller views sales analytics, THE system SHALL:
- View total sales by day/week/month
- View sales by product category
- View sales by product variant
- View average order value
- View repeat customer rate
- View customer geographic distribution
- View conversion rate from product views to sales
- Export data as CSV

WHEN a seller requests payout, THE system SHALL:
- View available balance (after platform commission deduction)
- View payout history
- Request payout when balance > $50
- Select payout method: bank transfer, PayPal
- Submit request
- Allow cancellation of pending payout if under 2 hours
- Send confirmation email on submission

### Inventory Management per SKU

WHEN inventory is modified, THE system SHALL:
- Update inventory count for specific SKU only
- Recalculate total product inventory (sum of all variants)
- Trigger low-stock alert if inventory ≤ 5 units for any SKU
- Trigger out-of-stock flag if inventory = 0 for any SKU
- Prevent over-allocation (inventory cannot be negative)

WHEN an order is placed containing SKUs, THE system SHALL:
- Lock inventory for specific SKUs at time of checkout
- Reduce inventory by quantity ordered
- If inventory drops to zero, automatically disable variant in catalog
- Allow inventory adjustment by seller even during order processing (with conflict detection)

WHEN inventory is restocked, THE system SHALL:
- Increase inventory count for specific SKU
- Remove out-of-stock flag if inventory > 0
- Re-enable variant in product catalog if previously disabled
- Send automatic notification: "Stock updated: {SKU} now available"
- Send notification to customers who had this SKU in wishlist

WHEN a return is processed, THE system SHALL:
- Increase inventory for returned SKU
- Validate returned item matches requested SKU
- Check item condition for restocking eligibility
- Update restock status: "Restocked" or "Not Restockable" with reason
- Notify seller of return and restock confirmation

WHEN inventory is imported in bulk, THE system SHALL:
- Accept CSV upload with columns: SKU, new_inventory_count
- Validate that all SKUs exist in system
- Validate inventory count is non-negative integer
- Allow preview before apply
- Update inventory with confirmation email
- Log all bulk changes for audit

WHEN a seller tries to set negative inventory, THE system SHALL:
- Prevent submission with error message
- Show current inventory level
- Allow only non-negative values

WHEN inventory reconciliation is performed (monthly audit), THE system SHALL:
- Compare system inventory with physical count
- Flag discrepancies > 5% difference
- Generate reconciliation report
- Allow adjustment of system inventory based on physical audit
- Notify admin and seller of discrepancies

### Order History and Refunds

WHEN a customer views order history, THE system SHALL:
- Display all past orders sorted by date (newest first)
- Show order ID, date, subtotal, shipping, total, status
- Show product count and estimated delivery date
- Show "View Details" button for each order

WHEN a customer views order details, THE system SHALL:
- Display full order summary with products, prices, variants
- Show shipping address and contact information
- Show billing address and payment method
- Show order status timeline with timestamps
- Show tracking information and carrier logistics
- Show all communications with seller
- Show return/refund status and history
- Show review submission status for each product
- Allow download of invoice as PDF

WHEN a customer requests cancellation, THE system SHALL:
- Allow cancellation only if order status is "Processing" or "Preparing for Shipment"
- Require reason for cancellation (dropdown: "Changed mind", "Found better price", "Wrong item", "Other")
- Show cancellation confirmation with estimated refund timing
- Process cancellation if eligible
- Set order status to "Cancelled"
- Initiate full refund immediately
- Return inventory to seller stock
- Notify seller of cancellation

WHEN a customer requests refund after delivery, THE system SHALL:
- Allow refund request only if order status is "Delivered" or "Completed"
- Show reason selection: "Wrong item", "Damaged", "Defective", "Not as described", "Changed mind"
- Allow upload of photo evidence for damaged/defective products
- Set order status to "Refund Requested"
- Notify seller and admin of refund request
- Allow seller to approve/reject refund request
  - If approved: generate return shipping label
  - If rejected: send explanation email to customer
- If approved: customer ships product back using label
- After return received and inspected: refund processed

WHEN a refund is approved, THE system SHALL:
- Generate prepaid return shipping label
- Send label to customer via email
- Set status to "Return Label Sent"
- Notify seller to expect return

WHEN return is received, THE system SHALL:
- Inspect item for condition, authenticity, completeness
- Update return status: "Returned and Approved" or "Returned and Rejected"
- If approved: initiate refund
- If rejected: notify customer with reason and offer replacement
- Update inventory if item is restockable
- Adjust seller earnings if chargeback occurs

WHEN a refund is processed, THE system SHALL:
- Refund full amount to original payment method
- Update order status to "Refunded"
- Send refund confirmation email
- Update seller payout to reflect refund amount
- Log refund transaction with reason and timestamp
- Allow customer to request partial refund instead of full refund

WHEN a partial refund is requested, THE system SHALL:
- Allow refund of specific items in order
- Calculate refund amount based on item price and return reason
- Apply to original payment method
- Update inventory for returned items
- Set status to "Partial Refund Processed"
- Notify customer of partial refund amount

WHEN a customer disputes a refund rejection, THE system SHALL:
- Allow escalation to platform customer support
- Assign support case with reference ID
- Review customer evidence and seller response
- Make final decision: approve refund or uphold rejection
- Notify both parties of outcome
- Adjust seller payout if refund is granted

### Admin Dashboard

WHEN admin accesses dashboard, THE system SHALL:
- Display overview: total users, active sellers, GMV, orders today
- Show alerts: pending seller applications, high-priority disputes, system errors
- Access full user management tools
- Access full seller management tools
- Access order supervision tools
- Access inventory oversight tools
- Access system configuration
- Access audit logs
- Access reporting tools

WHEN admin manages users, THE system SHALL:
- View all customer and seller accounts
- Filter by status: active, pending, suspended, banned
- View user details: registration date, login history, device info
- Edit user info: name, email, phone, notes
- Suspend user account (prevent login)
- Ban user account (permanently terminate)
- Reset user password
- Force email verification
- Transfer ownership of seller account
- Export user list as CSV

WHEN admin manages sellers, THE system SHALL:
- View all seller applications (pending approval)
- Approve seller registration
- Reject seller registration with reason
- View approved sellers by performance
- Suspend seller account (prevent new listings and sales)
- Terminate seller account
- Edit seller info: business name, contact, banking info
- Manually adjust commission rates for specific sellers
- View seller transaction history
- Export seller list as CSV

WHEN admin manages orders, THE system SHALL:
- View all orders with filtering: order ID, customer, seller, date, status
- Search orders by: customer name, email, product name, order ID
- Change order status manually if system error occurs
- Override inventory locks if order cannot be fulfilled
- Initiate refund for orders
- Manually process cancellations
- Send communication to customer or seller
- Export order data as CSV
- View fraud indicators for high-risk orders

WHEN admin manages inventory, THE system SHALL:
- View inventory levels across all products
- Search by SKU, product name, category
- View low stock alerts
- View out-of-stock products
- Manually adjust inventory for any SKU
- Add new inventory records
- Reset inventory count across multiple SKUs
- Import bulk inventory updates via CSV
- Generate inventory imbalance reports
- Notify sellers of inventory discrepancies

WHEN admin configures system settings, THE system SHALL:
- Edit commission rates (5-15% range)
- Edit payment processing fees
- Edit refund policy terms
- Edit return policy terms
- Edit shipping cost algorithms
- Edit category hierarchy
- Edit review moderation rules
- Edit automated notification templates
- Edit email service provider credentials
- Edit SEO metadata for public pages
- Save and deploy configuration

WHEN admin runs audit reports, THE system SHALL:
- Generate: daily sales report, seller performance report, customer behavior report
- Generate: inventory discrepancy report, fraud detection report
- Generate: compliance audit log
- Export reports to PDF or CSV
- Schedule automated report delivery
- View historical report archives

WHEN admin handles disputes, THE system SHALL:
- Review customer-seller disputes
- Review abuse reports
- Review fraudulent activity reports
- Review false review reports
- Review chargeback cases
- Determine resolution: side customer, side seller, compromise
- Notify both parties of decision
- Adjust seller payouts if appropriate
- Apply penalties for confirmed abuse
- Record decision in public dispute log

WHEN admin monitors system health, THE system SHALL:
- View server uptime, API response times
- View database performance metrics
- View payment gateway status
- View shipping carrier integration status
- View email delivery success rates
- View storage usage
- View error logs
- Receive alert when threshold exceeded
- Initiate maintenance mode when needed
- Schedule system updates
- Restart services when needed

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*