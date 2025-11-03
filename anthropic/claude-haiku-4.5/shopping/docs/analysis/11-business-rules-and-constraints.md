# Business Rules and Constraints

This document defines the core business rules, validation constraints, policies, and operational guidelines that govern all platform behavior and user interactions. These rules ensure data consistency, prevent business logic violations, and maintain platform integrity across all modules.

---

## 1. Overview of Business Rules Framework

### Purpose and Scope

The business rules framework establishes mandatory constraints that apply to all user interactions, transactions, and system operations. These rules are organized by functional area and include:
- Data validation and format requirements
- Pricing and discount policies
- Seller and product management policies
- Customer service standards
- Transaction processing rules
- Inventory management constraints
- Review and rating governance
- Error handling and recovery procedures

### Governance Layers

Business rules operate at multiple levels:
- **User Input Level**: Validation rules that prevent invalid data from entering the system
- **Business Logic Level**: Constraints that enforce policies during transaction processing
- **Transaction Level**: Rules that maintain consistency during concurrent operations
- **Recovery Level**: Rules that define error handling and state recovery

### Cross-Functional Impact

These rules affect multiple user actors (customers, sellers, admins) and must be consistently applied across all system modules. Violations must be caught and reported to appropriate actors with clear error messages.

---

## 2. Data Validation Rules

### 2.1 User Registration and Profile Validation

WHEN a user attempts to register with email and password, THE system SHALL validate that:
- THE email address is in valid format (RFC 5322 standard) and is unique across all users
- THE email contains only lowercase letters and must not already exist in the system
- THE password meets minimum complexity requirements: at least 8 characters, containing uppercase letters, lowercase letters, numbers, and special characters
- THE first name and last name each contain between 1-100 characters with no leading/trailing spaces
- THE phone number (if provided) is in valid international format or local format matching the customer's country

IF a registration validation fails, THEN THE system SHALL return specific error code indicating which field failed validation.

WHEN a user updates their profile information, THE system SHALL revalidate all modified fields using the same rules as registration.

### 2.2 Address Validation and Management

WHEN a customer adds or updates an address, THE system SHALL validate that:
- THE street address is between 5-200 characters and contains no special characters except hyphens, slashes, and periods
- THE city name is between 2-100 characters containing only letters and spaces
- THE state/province code is valid for the selected country (if applicable)
- THE postal code format matches the country's postal system requirements
- THE country code is a valid ISO 3166-1 alpha-2 country code
- THE recipient name is between 2-100 characters

THE customer SHALL be allowed to save multiple addresses and designate one as the default shipping address and one as the default billing address.

IF a customer has no addresses saved, THEN THE system SHALL require address entry during checkout.

### 2.3 Product Data Validation

WHEN a seller creates or updates a product, THE system SHALL validate that:
- THE product name is between 5-200 characters with no leading/trailing spaces
- THE product description is between 20-5000 characters
- THE product SKU (Stock Keeping Unit) is unique within the seller's catalog (not globally unique)
- THE category ID exists in the system's category structure
- THE product images count is between 1-20 images per product
- THE base price is greater than 0 and less than 999,999,999
- THE weight (if applicable) is a positive number in kilograms
- THE dimensions (if applicable) follow valid format specifications

### 2.4 Product Variant Validation

WHEN a seller creates a product variant (SKU), THE system SHALL validate that:
- THE variant specifies at least one attribute (color, size, material, etc.)
- THE variant SKU is unique within the product catalog and seller's store
- THE variant price is greater than or equal to the base product price (or explicitly lower with business justification)
- THE variant stock quantity is a non-negative integer
- THE variant attributes are from predefined options in the system's attribute catalog

IF a product has variants defined, THEN THE system SHALL require that all variants have complete information before the product can be published.

### 2.5 Payment Information Validation

WHEN a customer enters payment information, THE system SHALL validate that:
- THE credit card number passes Luhn algorithm validation for format correctness
- THE card expiration date is not in the past or within 1 month of expiration
- THE CVV is a 3-4 digit number
- THE billing address matches one of the customer's saved addresses
- THE payment amount matches the calculated order total (no discrepancies)

THE system SHALL NEVER store complete credit card numbers; only tokenized payment references are retained.

### 2.6 Order Data Validation

WHEN a customer places an order, THE system SHALL validate that:
- THE order contains at least one product item
- THE ordered quantity for each item is positive and does not exceed available inventory
- THE shipping address is a valid customer address (from saved addresses or newly created)
- THE total order amount matches the sum of item prices minus applicable discounts plus shipping and taxes
- THE order placement time is not before the user's session start time (prevents replay attacks)

---

## 3. Pricing and Discount Policies

### 3.1 Base Pricing Rules

THE base price of a product represents the standard selling price before any discounts or promotions.

WHEN a seller updates product pricing, THE system SHALL:
- Allow price changes at any time before an order is placed
- Record price change history for audit purposes
- NOT apply new prices retroactively to existing orders (already placed orders retain their original price)

THE seller SHALL be prohibited from setting prices below the product cost (if cost is tracked in the system).

WHEN calculating the final order price, THE system SHALL apply amounts in this sequence:
1. Base product price × quantity
2. Apply variant-specific pricing adjustments (if applicable)
3. Apply seller-level discounts (if applicable)
4. Apply platform-wide promotions (if applicable)
5. Apply customer-specific discounts (loyalty, referral, etc., if applicable)
6. Apply cart-level discounts (bundle discounts, volume discounts)
7. Add shipping cost
8. Add taxes based on destination and applicable jurisdictions

### 3.2 Discount and Promotion Policies

WHEN a seller creates a promotion, THE seller SHALL specify:
- THE discount type (percentage or fixed amount)
- THE minimum order value required to qualify (if applicable)
- THE maximum discount cap (if percentage-based)
- THE start and end dates for the promotion
- THE maximum number of times a customer can use the promotion
- THE applicable products or categories

IF a promotion has a start date in the future, THEN THE system SHALL not apply it until the start time is reached.

IF a promotion has an end date in the past, THEN THE system SHALL not apply it to new orders.

THE system SHALL automatically deactivate expired promotions.

THE customer SHALL be able to see all applicable discounts before checkout and understand the discount breakdown in the order summary.

### 3.3 Price Change and Consistency Rules

WHEN a customer has items in their shopping cart, THE system SHALL:
- Preserve the displayed prices from when items were added to the cart
- Recalculate prices only when the customer requests to update the cart (refreshes the cart page or changes quantities)
- Notify the customer if prices have changed since items were added

WHEN the system recalculates cart prices, THE system SHALL apply the most current prices, promotions, and taxes at that moment.

IF the recalculated total differs significantly (more than 5%) from the displayed total, THEN THE system SHALL highlight the changes and require the customer to confirm before proceeding to checkout.

### 3.4 Currency and Tax Handling

THE platform SHALL support displaying prices in the customer's local currency based on their location or preference.

WHEN calculating taxes, THE system SHALL:
- Determine the tax jurisdiction based on the shipping address
- Apply applicable tax rates (VAT, sales tax, etc.) based on the destination location and product type
- Include tax amounts in the order total
- Display tax amounts separately in the order summary

THE system SHALL store the tax amount applied at order placement and not recalculate taxes for historical orders, even if tax rates change.

### 3.5 Minimum and Maximum Pricing Constraints

THE minimum product price the system SHALL allow is 0.01 in the platform's base currency.

THE maximum product price the system SHALL allow is 999,999,999.

IF a seller attempts to set a price outside this range, THEN THE system SHALL reject the operation with an appropriate error message.

THE minimum order total (excluding taxes and shipping) SHALL be 0.01.

THE maximum order total (including all fees) SHALL be 999,999,999.

---

## 4. Seller and Product Policies

### 4.1 Seller Account Requirements

WHEN a user applies to become a seller, THE system SHALL require:
- THE applicant has been a registered customer for at least 7 days
- THE applicant provides a business name between 2-100 characters
- THE applicant provides valid business registration documents (document type depends on jurisdiction)
- THE applicant provides a valid business address matching documentation
- THE applicant has a verified email address
- THE applicant has at least one verified phone number
- THE applicant's customer account has no active disputes or excessive returns

WHEN a seller account is approved, THE system SHALL:
- Create a seller profile
- Enable product upload capabilities
- Set the seller status to "Active"
- Send confirmation notification to the seller

IF a seller account is rejected, THEN THE system SHALL provide detailed reasons for rejection and allow reapplication after 30 days.

### 4.2 Seller Restrictions and Performance Standards

THE seller SHALL be prohibited from:
- Listing products in categories not matching the product description
- Using misleading product titles or descriptions
- Setting prices that are clearly unrealistic (flagged automatically for review)
- Listing duplicate products with trivial variations
- Requesting customers to communicate outside the platform to circumvent order processing
- Offering prices lower than the platform's minimum thresholds for any product category

IF a seller's order cancellation rate exceeds 10% in a 30-day period, THEN THE system SHALL flag the seller account for review.

IF a seller's return rate exceeds 15% in a 30-day period, THEN THE system SHALL send a warning notification.

IF a seller's ratings drop below 3.0 stars (on a 5-star scale) based on at least 10 reviews, THEN THE seller's products SHALL be de-ranked in search results and recommended product lists.

### 4.3 Product Listing Requirements

WHEN a seller uploads a product, THE seller SHALL provide:
- THE product name (5-200 characters)
- THE product description (20-5000 characters) with accurate information
- At least 1 product image (minimum resolution 400×400 pixels)
- THE product category selection
- THE base price
- For products with variants: complete information for all variants including SKU, attributes, and inventory

WHEN a seller creates a product listing with variants, THE system SHALL ensure all variants have:
- UNIQUE SKU within the seller's catalog
- COMPLETE attribute specifications (no missing required attributes)
- INVENTORY quantity (must be non-negative integer)
- PRICING information (may inherit from base product or specify variant-specific pricing)

IF any variant information is incomplete, THEN THE system SHALL prevent the product from being published and notify the seller of missing information.

### 4.4 Product Publishing and Moderation

WHEN a seller publishes a product, THE system SHALL:
- Automatically scan product images for inappropriate content
- Scan product title and description for prohibited keywords or misleading claims
- Verify product category assignment is appropriate
- Check for duplicate listings from the same seller

IF the automated scan flags content issues, THEN THE system SHALL:
- Hold the product in "pending review" status
- Notify the seller of the flagged content
- Assign the product to a human moderator for manual review within 24 hours

IF moderation approves the product, THEN THE product status becomes "Active" and is visible to customers.

IF moderation rejects the product, THEN THE system SHALL:
- Notify the seller with specific reasons for rejection
- Allow the seller to revise and resubmit the product
- Store rejection history for pattern detection

THE seller SHALL be prohibited from republishing the exact same product immediately after rejection; at least 2 hours must pass before resubmission.

### 4.5 Prohibited Products and Categories

THE following product types are prohibited on the platform:
- Weapons, explosives, or dangerous items
- Counterfeit or intellectual property-infringing products
- Hazardous materials (without special licensing/compliance)
- Used electronics without explicit "Used" designation in listing
- Prescription medications and controlled substances
- Items violating local laws in any supported jurisdiction
- Adult or explicit content (unless in restricted categories with age verification)

IF a product is identified as prohibited, THEN THE system SHALL:
- Immediately delist the product
- Notify the seller with reason for delisting
- Deduct compliance violation points from the seller's account
- If violations reach 5 points in 90 days, suspend the seller account for 7 days

---

## 5. Customer Service Standards and Policies

### 5.1 Cancellation Policies

WHEN a customer requests order cancellation, THE system SHALL verify:
- THE order status is "Pending" or "Processing" (not yet shipped)
- THE order was placed within the last 24 hours
- THE payment has been successfully processed or is still pending

WHEN an order is in "Pending" status (payment confirmed but not yet picked by seller), THE customer MAY cancel the order and THE system SHALL:
- Immediately cancel the order
- Initiate a full refund to the original payment method
- Process the refund within 3-5 business days
- Release the reserved inventory back to available stock

WHEN an order is in "Processing" status (seller has picked items but not shipped), THE customer SHALL submit a cancellation request and THE system SHALL:
- Notify the seller of the cancellation request
- Give the seller 2 hours to respond (accept or reject the cancellation)
- If seller accepts: cancel the order and initiate full refund as described above
- If seller rejects: inform the customer that cancellation is no longer possible due to processing stage

THE customer SHALL NOT be able to cancel an order once it enters "Shipped" status.

IF the customer cancels an order that had promotional discounts applied, THE refund SHALL be for the discounted amount (not the original undiscounted price).

### 5.2 Return Eligibility and Policies

THE customer MAY request a return for physical products within 30 days of order delivery.

THE customer SHALL NOT be able to request a return if:
- THE return window has expired (more than 30 days since delivery)
- THE product shows signs of use or damage beyond normal handling
- THE product is in the "Clearance" or "Final Sale" category
- THE product is custom-made or personalized per customer specification

THE customer MAY return digital products (e-books, software, etc.) only if:
- THE product was not downloaded or accessed
- THE return is requested within 7 days of purchase

WHEN a customer initiates a return, THE system SHALL:
- Record the return request with timestamp
- Display a pre-paid return shipping label (if applicable)
- Assign the return a tracking ID
- Set return status to "Return Requested"

THE seller SHALL respond to return requests within 48 hours (accept or reject).

### 5.3 Refund Processing Rules

WHEN a return is approved by the seller, THE system SHALL:
- Update return status to "Return Approved"
- Provide the customer with return shipping instructions
- Expect return shipment within 14 days (from approval date)
- Initiate refund immediately upon carrier confirmation of package receipt

IF the seller rejects a return without valid reason (product matches description, customer at fault), THE customer MAY escalate to the platform admin.

WHEN the platform receives and inspects the returned item, THE system SHALL:
- Verify the item condition
- Confirm the item matches the order (SKU, color, size, etc.)
- Process the refund if item condition is acceptable

IF the returned item is damaged or missing beyond normal return wear, THE system SHALL:
- Deduct a restocking fee (10-20% of purchase price, determined by product category)
- Process partial refund for the reduced amount
- Notify the customer of the deduction with itemized explanation

THE refund SHALL be processed to the original payment method within 3-5 business days after item inspection.

THE customer SHALL receive notification of refund processing and expected arrival timeline.

### 5.4 Dispute Resolution Process

WHEN a customer and seller cannot agree on a return (customer requests refund, seller refuses return), THE system SHALL:
- Allow customer to escalate to platform arbitration
- Notify both parties that a dispute has been opened
- Assign a platform moderator to review the case
- Request evidence from both parties (messages, photos, shipping proof)

THE platform moderator SHALL review the dispute within 48 hours and make a binding decision based on:
- Product description accuracy
- Communication between parties
- Evidence provided
- Platform policies

IF the moderator rules in favor of the customer, THEN THE system SHALL:
- Force the return to proceed
- Process the full refund
- If seller refuses to cooperate, hold the seller's next payments to cover the refund amount

IF the moderator rules in favor of the seller, THEN THE system SHALL:
- Close the dispute
- Inform the customer the return is denied
- NOT process any refund

THE maximum dispute resolution time is 10 business days from dispute opening.

### 5.5 Payment Failure Handling

WHEN a customer's payment is declined, THE system SHALL:
- Immediately notify the customer with the failure reason
- Hold the order in "Payment Failed" status for 6 hours
- Allow the customer to retry payment with the same or different payment method
- Preserve the cart contents and pricing

IF the customer does not retry payment within 6 hours, THEN THE system SHALL:
- Release all reserved inventory back to available stock
- Cancel the order automatically
- Send the customer a reminder about the abandoned order

IF the customer retries payment successfully, THEN THE system SHALL:
- Resume order processing from where it was paused
- Verify inventory is still available at the same quantities
- If inventory changed, notify customer and request confirmation to proceed with different quantities

---

## 6. Transaction and Payment Rules

### 6.1 Order Creation Validation

WHEN a customer submits an order for payment, THE system SHALL:
- Verify the cart contains at least one item with positive quantity
- Verify the customer's shipping address exists and is valid
- Verify the billing address exists and is valid (may be same as shipping address)
- Verify total order amount matches calculated sum (items, discounts, shipping, taxes)
- Lock inventory for all items to prevent overselling (inventory reservation)

IF all validation passes, THE system SHALL create the order with status "Pending" and proceed to payment.

IF any validation fails, THE system SHALL reject order creation and provide specific error message to customer.

### 6.2 Inventory Reservation and Deallocation

WHEN an order is created with status "Pending", THE system SHALL:
- Reserve (hold) the ordered quantity for each product variant
- Decrement the "available for sale" inventory count
- Record the reservation timestamp and order ID
- Prevent other customers from purchasing the reserved inventory

WHEN payment is successfully processed, THE system SHALL:
- Convert the reservation to actual inventory deduction (committed sale)
- Update inventory status to "Sold"
- Notify the seller that order requires fulfillment

IF payment fails and customer does not retry within 6 hours, THE system SHALL:
- Release the reserved inventory back to available stock
- Restore the "available for sale" count
- Cancel the order

IF the customer requests cancellation during "Pending" or "Processing" stages, THE system SHALL:
- Release reserved inventory back to available stock
- Update the inventory count
- Record the cancellation reason

### 6.3 Concurrent Transaction Handling

WHEN multiple customers attempt to purchase the last item of a product simultaneously, THE system SHALL:
- Use database-level locking to ensure only one transaction succeeds
- Process the first transaction to reach the database commit point successfully
- For remaining transactions: reject order creation with message indicating item is out of stock
- Ensure no inventory count drops below zero under any circumstances

THE system SHALL NOT use optimistic locking or retry mechanisms for inventory operations; pessimistic locking SHALL be enforced.

### 6.4 Payment Processing and Recording

WHEN a customer initiates payment, THE system SHALL:
- Send payment data to the payment processor via secure encrypted channel
- Never store complete credit card information in the system database
- Record the payment attempt with timestamp, amount, and status
- Receive authorization response from the payment processor

WHEN payment is authorized (successful), THE system SHALL:
- Record the payment with transaction ID, authorization code, and timestamp
- Update order status to "Payment Confirmed"
- Initiate order fulfillment workflow

WHEN payment is declined (failed), THE system SHALL:
- Record the decline reason in the system
- Notify the customer of the specific reason (insufficient funds, expired card, etc.)
- Allow retry immediately

THE system SHALL record all payment transactions in an immutable audit log for compliance purposes.

### 6.5 Duplicate Order Prevention

WHEN a customer places an order, THE system SHALL:
- Record the order creation timestamp and amount
- Use a unique idempotency key to prevent duplicate order creation if the payment request is retried

IF the customer refreshes the payment page or submits the payment request twice within 30 seconds, THE system SHALL:
- Recognize this as a single order attempt (based on idempotency key)
- Process only one payment
- Return the same order confirmation to both requests

IF the customer successfully completes payment and then immediately places another order for the same items, THE system SHALL:
- Allow the second order to proceed (not a duplicate)
- Create two separate orders
- Customer is responsible for managing duplicate purchases if made in error

---

## 7. Review and Rating Policies

### 7.1 Review Eligibility Requirements

THE customer MAY submit a review and rating for a product ONLY IF:
- THE customer has a confirmed purchase of that product
- THE product has been delivered (order status is "Delivered")
- THE review window is open (between 1 day and 365 days after delivery)
- THE customer has not previously submitted a review for this exact product and seller combination

THE system SHALL NOT allow:
- Multiple reviews of the same product by the same customer (only one review per customer per product)
- Reviews before the product is delivered
- Reviews after 365 days from delivery

THE customer MAY update their review within 30 days of submission, but the system SHALL record the update history.

### 7.2 Rating Constraints and Calculations

THE rating system uses a 1-5 star scale where:
- 1 star = Poor / Very Dissatisfied
- 2 stars = Fair / Dissatisfied
- 3 stars = Average / Neutral
- 4 stars = Good / Satisfied
- 5 stars = Excellent / Very Satisfied

THE customer MUST select a rating (cannot submit a rating-less text-only review).

WHEN calculating average product rating, THE system SHALL:
- Include only reviews from verified purchases (customer has actually bought the product)
- Weight recent reviews (from the last 30 days) slightly higher than older reviews to reflect current product quality
- Recalculate average rating whenever a new review is added or updated
- Display the average rating to 1 decimal place (e.g., 4.3 stars)

THE product rating SHALL be displayed prominently on the product detail page and in search results.

### 7.3 Review Moderation Rules

WHEN a customer submits a review, THE system SHALL:
- Automatically scan the review text for prohibited content (abusive language, external links, contact information)
- Automatically detect spam patterns (repeated identical reviews, overly promotional language)
- Assign quality score based on review length, specificity, and helpfulness signals

IF the automated scan flags the review, THEN THE system SHALL:
- Place review in "Pending Moderation" status
- Assign to human moderator for review within 24 hours
- Display the review only after approval

IF moderation approves the review, THEN the review becomes visible to all users.

IF moderation rejects the review, THEN:
- The review is not displayed to other users
- The customer is notified of rejection reason
- The customer may edit and resubmit the review

THE system SHALL track multiple review rejections from the same customer (if pattern emerges, customer may be flagged for system review).

### 7.4 Fraudulent Review Prevention

THE system SHALL detect and prevent:
- A single customer posting many positive reviews for the seller's products in a short time period
- Multiple accounts posting similar reviews with identical text
- Negative reviews from customers who have not made legitimate purchases
- Reviews posted during suspicious time windows (e.g., all positive reviews on day of launch)

IF suspicious review patterns are detected, THE system SHALL:
- Flag the seller account for investigation
- Tag suspicious reviews with a "Verified Purchase" badge distinction
- Potentially suspend review posting privileges temporarily while investigation occurs

THE admin team SHALL regularly review flagged reviews and take action against review fraud.

### 7.5 Review Display and Aggregation

THE product detail page SHALL display:
- Average rating (e.g., 4.3 stars out of 5)
- Total number of verified reviews
- Rating distribution histogram (e.g., "50% rated 5 stars, 20% rated 4 stars", etc.)
- Most helpful positive reviews
- Most helpful critical reviews (if applicable)

THE reviews SHALL be sortable by:
- Most recent (newest first)
- Most helpful (customer votes on "helpful" or "not helpful")
- Highest rating first
- Lowest rating first

THE seller SHALL NOT be able to delete or suppress negative reviews; all approved reviews must remain visible.

THE seller MAY respond to reviews (public response visible to all), but cannot delete or hide the review itself.

---

## 8. Inventory Management Rules

### 8.1 Stock Reservation Logic

WHEN a customer adds a product to their shopping cart, THE system SHALL:
- NOT immediately reserve inventory (cart state does not reserve stock)
- Display the current available inventory count to the customer
- Update the displayed count in real-time as other customers purchase

WHEN a customer proceeds to checkout and creates an order, THE system SHALL:
- Reserve inventory ONLY at order creation time
- Decrement the "available for sale" count immediately
- Reserve for the specific product variant (SKU)
- Record reservation timestamp and order ID for tracking

THE reserved inventory SHALL NOT be available for other customers to purchase.

### 8.2 Overselling Prevention

THE system SHALL NEVER allow actual inventory to go negative.

IF the current available inventory for a product is 5 units and two customers try to simultaneously purchase 4 units each, THE system SHALL:
- Process the first request that reaches the database
- Reduce available inventory from 5 to 1
- Reject the second request with "Out of Stock" error message

THE system SHALL verify inventory availability again at order confirmation time (after all validations pass but before payment).

IF inventory changed between cart view and checkout, THE system SHALL:
- If still sufficient: proceed with order
- If insufficient: notify customer of reduced availability and request confirmation with available quantity

### 8.3 Inventory Synchronization

WHEN inventory changes occur (new stock received, damaged items, returns processed), THE system SHALL:
- Update the inventory count immediately in the database
- Update the "available for sale" figure in real-time
- Notify customers with items in their carts if the item becomes unavailable
- Update the product detail page display within seconds

WHEN a seller uploads products with inventory quantities, THE system SHALL:
- Record the initial inventory as provided by the seller
- Timestamp the inventory entry
- Prevent negative inventory values

THE system SHALL support bulk inventory updates via CSV import, with validation for each row.

### 8.4 Low Stock Warnings

THE seller SHOULD set a "low stock threshold" for each product (optional, defaults to 10 units).

WHEN inventory for a product falls below the threshold, THE system SHALL:
- Send notification to the seller
- Display a "Limited Stock Available" badge on the product listing (visible to customers)
- Not restrict customer purchases (customers may continue ordering)

WHEN inventory reaches zero, THE system SHALL:
- Update product status to "Out of Stock"
- Display "Out of Stock" badge to customers
- Prevent customers from adding to cart (button becomes disabled)
- Remove from search results and recommendations temporarily

WHEN inventory is restocked, THE system SHALL:
- Update product status to "In Stock"
- Display the product in search results again
- Send notifications to customers who wishlist-added the product

### 8.5 Stock Deallocation Scenarios

THE system SHALL deallocate (release) reserved inventory in these scenarios:

**Scenario 1: Order Cancellation**
- WHEN customer cancels "Pending" or "Processing" order → release inventory immediately
- Inventory becomes available for other customers

**Scenario 2: Payment Failure**
- WHEN customer does not retry payment within 6-hour window → release inventory automatically
- Inventory is freed for sale to other customers

**Scenario 3: Return Accepted**
- WHEN customer's return is accepted and the item is received and inspected → add back to seller's inventory
- Item may be relisted as new (if condition permits) or marked as "used/open box"

**Scenario 4: System-Level Stock Correction**
- WHEN inventory count discrepancy is discovered (due to system error, physical audit) → admin may adjust stock
- Adjustment recorded in audit log with reason and admin name

**Scenario 5: Seller Account Closure or Suspension**
- WHEN seller account is closed or suspended → do not deallocate existing inventory
- Products remain in system but visibility may be restricted
- Existing reserved orders proceed normally

---

## 9. Error Handling and Edge Cases

### 9.1 Concurrent Operation Handling

WHEN two update operations attempt to modify the same entity simultaneously (e.g., two price updates, two inventory changes), THE system SHALL:
- Use database-level optimistic or pessimistic locking mechanisms
- Ensure only one operation succeeds
- Return error to the other request indicating conflict
- NOT lose data from either operation

THE system SHALL handle concurrent cart updates:
- WHEN customer A modifies cart on device 1 and device 2 simultaneously → last-write-wins strategy
- OR implement conflict detection and ask customer to resolve manually
- NEVER silently merge or lose cart modifications

### 9.2 Partial Payment Failures

WHEN payment is partially successful (e.g., first payment attempt fails, second succeeds), THE system SHALL:
- Create only ONE order (not two)
- Cancel any additional partial transactions
- Apply successful payment only once
- Refund any duplicate charge if it occurred

WHEN customer's session expires during payment, THE system SHALL:
- NOT charge the customer
- Release reserved inventory
- Allow customer to log back in and retry the order

### 9.3 Inventory Conflict Resolution

WHEN inventory conflicts are detected (e.g., seller changed inventory, system shows different count), THE system SHALL:
- Query the inventory database for current truth
- Use the database value as authoritative
- Log the discrepancy for investigation
- If discrepancy is large (>10% difference), alert admin

WHEN seller manually adjusts inventory and orders are affected, THE system SHALL:
- For future-dated price/inventory changes: apply as scheduled
- For immediate changes: apply to new orders going forward, NOT retroactively to pending orders

### 9.4 Duplicate Order Prevention Edge Cases

IF customer submits order form, payment processes, then customer clicks "Place Order" button again while payment is being processed, THE system SHALL:
- Recognize based on idempotency key that this is the same order attempt
- NOT create duplicate order
- Return the same confirmation to both submissions

IF customer manually places two orders within 1 minute for identical items, THE system SHALL:
- Create two separate orders (customer may do this intentionally for bulk purchase)
- NOT treat as fraud or duplicate unless customer specifically requests reversal
- Flag in admin system for potential review if this pattern repeats

### 9.5 State Consistency Maintenance

THE system SHALL maintain consistency across these state transitions:

**Order Status Consistency:**
- "Pending" → "Payment Confirmed" → "Processing" → "Shipped" → "Delivered"
- NO backward state transitions allowed (order cannot go from "Shipped" back to "Processing")
- System SHALL prevent status transitions that violate business logic

**Payment Status Consistency:**
- "Pending" → "Processing" → "Authorized" → "Captured" → "Settled"
- IF payment authorization expires (typically 24 hours), system SHALL attempt automatic capture or cancel order
- IF capture fails, order SHALL be cancelled and inventory released

**Inventory Consistency:**
- Available Inventory = Total Inventory - Reserved Inventory - Committed Sales
- These three counts MUST always balance
- System SHALL verify balance on every inventory operation

### 9.6 Reconciliation and Recovery

WHEN system detects data inconsistencies during recovery or after incidents:

**Inventory Reconciliation:**
- IF reserved inventory exceeds available inventory → release oldest reservations first
- IF sold inventory exceeds total → investigate for system error (potential data corruption)
- IF discrepancy > 5%: log alert for admin investigation

**Payment Reconciliation:**
- IF order status is "Payment Confirmed" but payment database shows failed → investigate payment processor
- IF payment processor shows charge but order is cancelled → process refund immediately
- IF refund promised but not processed → flag for accounting team

**Order Reconciliation:**
- IF order has no payment record → notify customer immediately, request retry
- IF payment received but order not created → create order retroactively to match payment
- IF order status is stuck (e.g., "Processing" for > 7 days without shipping) → notify seller and admin

---

## 10. System-Wide Constraints

### 10.1 Data Consistency Requirements

THE system SHALL maintain these invariants at all times:

**User Data Invariant:**
- EACH user has exactly one primary email address
- EACH email is unique across all users (no duplicate emails)
- EACH user has at least one phone number or verified email (contact method required)

**Order Data Invariant:**
- EACH order belongs to exactly one customer
- EACH order contains one or more line items
- EACH order total matches the sum of line items, discounts, and fees
- EACH order has a timestamp in valid format

**Product Data Invariant:**
- EACH product belongs to exactly one seller (at any given time)
- EACH product variant (SKU) is unique within a product
- EACH product has at least one image

**Inventory Invariant:**
- Available Inventory >= 0 (never negative)
- Total Inventory >= 0 (never negative)
- Reserved Inventory >= 0 (never negative)
- Available + Reserved + Sold = Total (balance must always be maintained)

IF any invariant is violated, THE system SHALL:
- Immediately log alert with full context
- Notify admin team
- Prevent further operations on affected data until resolved
- Initiate recovery procedures

### 10.2 Rate Limiting and Abuse Prevention

THE system SHALL implement rate limiting to prevent abuse:

**API Rate Limits:**
- Unauthenticated API requests: 60 requests per minute per IP address
- Authenticated customer requests: 300 requests per minute per user
- Authenticated seller requests: 100 requests per minute per seller account

**Business Operation Limits:**
- WHEN customer adds items to cart: no limit (natural behavior)
- WHEN customer places orders: max 20 orders per day per customer (if exceeded, flag for fraud review)
- WHEN customer submits reviews: max 5 reviews per day (prevents review spam)
- WHEN seller updates prices: max 100 price changes per day (prevents automation abuse)
- WHEN seller uploads products: max 50 new products per day (prevents bulk spam)

IF rate limits are exceeded, THE system SHALL:
- Return HTTP 429 error code
- Include retry-after header indicating wait time
- Temporarily block further requests from that source
- Log the violation for fraud detection analysis

### 10.3 Session Management Rules

WHEN a customer logs in, THE system SHALL:
- Create a session with JWT token
- Set session expiration to 30 days (remember-me option available)
- OR Set session expiration to 15 minutes (default without remember-me)
- Store session start timestamp

WHEN customer is idle for the session timeout period, THE system SHALL:
- Automatically expire the session
- Clear client-side tokens
- Require customer to log in again for next action

WHEN customer explicitly logs out, THE system SHALL:
- Immediately invalidate the session
- Clear all tokens on client
- Preserve cart contents (non-authenticated users can view carts via cookie/local storage)

THE system SHALL allow customer to maintain multiple concurrent sessions (different browsers/devices) up to a maximum of 5 active sessions.

IF customer attempts to log in from an unusual location or device, THE system MAY:
- Send verification email to customer
- Require email confirmation before allowing access
- OR Require security question answers
- Store the new device/location for future reference

### 10.4 Business Hours and Maintenance Policies

THE platform SHALL maintain 99.5% uptime during business hours (measured monthly).

WHEN the system undergoes planned maintenance, THE platform SHALL:
- Schedule maintenance during low-traffic periods (e.g., 02:00-04:00 local time)
- Notify all active users 7 days in advance
- Prevent new orders 1 hour before maintenance
- Queue checkout requests and process after maintenance
- Ensure all user sessions remain intact after restart

DURING emergency maintenance (unplanned outage), THE system SHALL:
- Prioritize payment integrity and inventory consistency
- Complete any in-flight transactions before taking system down
- Maintain audit logs throughout maintenance period
- Notify admins and affected users when outage is resolved

THE system SHALL NOT delete or lose order data, customer data, or inventory records during any maintenance event.

### 10.5 Platform-Wide Enforcement Mechanisms

**Automated Enforcement:**
- THE system SHALL automatically prevent overselling through database constraints
- THE system SHALL automatically expire old reservations (6-hour limit)
- THE system SHALL automatically deactivate expired promotions
- THE system SHALL automatically process refunds at designated times (daily batch)

**Manual Enforcement (Admin-Driven):**
- Admin SHALL be able to suspend seller accounts and delist all their products
- Admin SHALL be able to refund orders outside normal policies with recorded reason
- Admin SHALL be able to modify inventory counts with audit trail
- Admin SHALL be able to escalate disputes to override system decisions

**Audit and Compliance:**
- THE system SHALL maintain immutable audit log of all significant business operations
- THE system SHALL track who made changes, what changed, when, and why
- THE system SHALL retain audit logs for minimum 7 years
- THE system SHALL support audit log export for compliance reporting

---

## Summary

These business rules and constraints form the foundational governance for the e-commerce shopping mall platform. They ensure:

- **Data Integrity**: Validation rules prevent invalid data from entering the system
- **Business Policy Compliance**: Pricing, discounts, and policies are consistently applied
- **Fair Transactions**: Rules protect both customers and sellers from fraud or abuse
- **Operational Consistency**: State management and concurrent operations maintain system reliability
- **Auditability**: All significant operations are tracked and logged for compliance

All actors (customers, sellers, admins) must operate within these constraints. Developers implementing the platform should use these rules as the business logic foundation for all modules and features.