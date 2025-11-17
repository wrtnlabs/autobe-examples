## Business Rules for ShoppingMall Platform

This document defines the core business rules and validation logic that govern all transactions, access controls, and system behaviors across the ShoppingMall platform. These rules are enforceable, non-technical, and written in natural language to guide backend development without prescribing implementation. All rules must be validated at the service layer and enforced for every actor type: customer, seller, and admin.

### Authentication and Session Rules

- WHEN a user attempts to log in, THE system SHALL validate that the provided email is registered in the system and the password matches the stored hash.
- IF the user provides incorrect credentials, THEN THE system SHALL return a generic error message: "Invalid email or password" and increment the failed login counter for that email.
- IF a user account has more than 5 failed login attempts in 15 minutes, THEN THE system SHALL temporarily lock the account for 30 minutes and notify the user via email.
- WHEN a user successfully logs in, THE system SHALL issue a JWT access token with a 20-minute expiry and a refresh token with a 30-day expiry.
- WHILE a user session is active, THE system SHALL require a valid, unexpired JWT access token for every protected endpoint.
- WHEN a user’s access token expires, THE system SHALL allow the refresh token to be used once to obtain a new access token.
- IF the refresh token is expired, revoked, or invalid, THEN THE system SHALL require the user to log in again.
- WHEN a user logs out, THE system SHALL blacklist the current access token and invalidate the refresh token by marking it as revoked in the database.
- WHEN a user changes their password, THE system SHALL invalidate all active sessions for that user and require reauthentication on all devices.
- WHEN a user requests a password reset, THE system SHALL generate a time-limited (15-minute), single-use token and send it via email. If the token is used or expires, THE system SHALL not allow another reset request for 1 hour.

### Product Listing Rules

- WHEN a seller attempts to list a new product, THE system SHALL require the product name to be at least 3 characters and not exceed 200 characters.
- WHEN a seller attempts to list a new product, THE system SHALL require the product description to be at least 10 characters and not exceed 5,000 characters.
- WHEN a seller attempts to list a new product, THE system SHALL require at least one category to be selected from the approved product taxonomy.
- IF a product name contains profanity or marketing claims forbidden by policy (e.g., "best", "#1", "guaranteed"), THEN THE system SHALL reject the listing and return a specific error: "Product name contains prohibited terms."
- IF a product description includes contact information (phone, email, social media handles, URLs), THEN THE system SHALL reject the listing and return a specific error: "Product description cannot contain contact details."
- WHEN a product is created, THE system SHALL automatically set its status to "draft" and make it invisible to customers until approved by an admin.
- WHEN a seller edits an existing draft product, THE system SHALL allow changes at any time before submission.
- WHEN a seller submits a draft product for review, THE system SHALL change its status to "pending_review" and notify an admin.
- IF an admin rejects a product listing, THEN THE system SHALL set its status to "rejected" and notify the seller with the rejection reason.
- IF a product is marked as "rejected", THEN THE seller SHALL not be able to relist the exact same product within 7 days.
- WHEN a product is approved by an admin, THE system SHALL set its status to "active" and make it visible to customers.
- WHEN a product is marked as "inactive" by an admin or seller, THE system SHALL immediately remove it from all customer search results and category listings.
- WHEN a product is archived (deleted), THE system SHALL preserve its record for compliance purposes but make all related data (images, variants) inaccessible to all users.

### SKU Variant Rules

- WHEN a seller creates a new product variant, THE system SHALL require at least one attribute (e.g., color, size, material) to be defined.
- WHEN a seller defines a variant attribute, THE system SHALL ensure each attribute name is unique within the product (e.g., "size" cannot appear twice).
- WHEN a seller defines variant options, THE system SHALL require each option to be between 1 and 50 characters and not contain special symbols like @, #, $, %.
- WHEN a seller assigns a price to a variant, THE system SHALL require the price to be greater than 0.01 and not exceed $9,999.99.
- WHEN a seller assigns a SKU code to a variant, THE system SHALL auto-generate a unique SKU if left blank, or validate that a manually entered SKU is unique across all products in the platform.
- IF a variant’s SKU already exists in the system, THEN THE system SHALL reject the creation with error: "SKU already in use. Each variant must have a unique identifier."
- WHEN a variant is created, THE system SHALL automatically create an inventory record with zero stock.
- WHEN a customer adds a variant to their cart, THE system SHALL lock that variant’s stock for the duration of the cart session (30 minutes).
- IF a variant’s price is changed after customer orders exist, THEN THE system SHALL preserve the original price used in those orders and only apply the new price to future orders.
- WHEN a product has no active variants, THE system SHALL automatically mark the product as "out_of_stock" and prevent it from being added to any cart.

### Cart and Checkout Rules

- WHEN a customer adds a product variant to their cart, THE system SHALL verify that the variant is active and has available stock.
- IF the selected variant is out of stock, THEN THE system SHALL block addition to cart and show: "This item is currently unavailable."
- IF a variant’s price has changed since it was added to the cart, THEN THE system SHALL display a warning: "Price changed. Final price will be confirmed at checkout."
- WHEN a customer removes an item from their cart, THE system SHALL immediately release the locked inventory.
- WHEN a customer proceeds to checkout, THE system SHALL verify that the cart contains at least one valid item with a price greater than zero.
- IF the cart is empty or all items are out of stock, THEN THE system SHALL prevent checkout and show: "Your cart is empty. Add items to continue."
- WHEN a customer selects a shipping address, THE system SHALL verify that the address belongs to that customer’s account.
- WHEN a customer enters a promo code, THE system SHALL validate it against active promotions and apply the discount if eligible.
- IF a promo code is expired, invalid, or has reached its usage limit, THEN THE system SHALL reject it and show: "This promo code is no longer valid."
- WHEN a customer submits payment, THE system SHALL lock all items in the cart for 15 minutes.
- IF payment is not completed within 15 minutes, THEN THE system SHALL release all locked inventory and cancel the order.
- WHEN an order is created, THE system SHALL clear the cart and reset cart totals.

### Order Fulfillment Rules

- WHEN an order is placed successfully, THE system SHALL assign the order status as "pending_payment".
- IF payment processing succeeds, THEN THE system SHALL update the order status to "confirmed".
- IF payment processing fails, THEN THE system SHALL update the order status to "payment_failed" and notify the customer.
- WHEN an order status is "confirmed", THE system SHALL reserve the products from the seller’s inventory immediately.
- WHEN a seller receives a "confirmed" order, THE system SHALL notify the seller and give them 48 hours to mark the order as "shipped".
- IF a seller does not mark an order as "shipped" within 48 hours, THEN THE system SHALL auto-cancel the order and issue a full refund.
- WHEN a seller marks an order as "shipped", THE system SHALL require a valid tracking number and carrier name.
- IF a tracking number is invalid (non-alphanumeric, too short, or malformed), THEN THE system SHALL reject the update and require correction before proceeding.
- WHEN an order is marked as "shipped", THE system SHALL send a shipping confirmation email to the customer and update the order tracking page.
- WHILE an order status is "shipped", THE system SHALL allow only the customer or admin to update the status to "delivered".
- WHEN a customer confirms delivery (via app notification or button click), THE system SHALL set the status to "delivered" and allow reviews to be submitted.
- IF 14 days pass without delivery confirmation, THEN THE system SHALL auto-update the status to "delivered" and notify the seller.
- WHEN an order status is "delivered", THE system SHALL unlock lock on inventory reservation and make inventory available again if a cancellation is later requested.

### Review and Rating Rules

- WHEN a customer attempts to submit a review, THE system SHALL require that the customer has completed delivery of the order for that product.
- IF the customer has not received the item (order status is not "delivered"), THEN THE system SHALL prevent review submission with message: "You may only review items after delivery."
- WHEN a customer submits a review, THE system SHALL require a rating between 1 and 5 stars.
- WHEN a customer submits a review, THE system SHALL require the review text to be at least 5 characters and no more than 1,000 characters.
- IF a review contains prohibited content (profanity, personal information, spam links, price comparisons), THEN THE system SHALL block submission and show: "Review contains inappropriate content."
- WHEN a seller responds to a review, THE system SHALL allow only one response per review.
- WHEN a seller responds to a review, THE system SHALL require the response text to be less than 500 characters.
- IF a seller responds with promotional content, contact info, or threats, THEN THE system SHALL reject the reply and notify an admin.
- WHEN a review is submitted, THE system SHALL assign it a status of "pending_moderation".
- WHEN an admin reviews a submission, THE system SHALL allow the admin to approve, reject, or hide the review.
- IF a review is hidden by an admin, THE system SHALL remove it from public view but preserve it for auditing.
- WHEN a review is approved, THE system SHALL update the product’s average rating and display the review publicly.
- WHEN a reviewer edits their own review, THE system SHALL allow edits within 7 days of submission.
- IF a review has received a seller response, THEN THE system SHALL prohibit edits from the reviewer.
- IF a customer submits multiple reviews for the same product, THE system SHALL allow only the most recent review to be counted in the average rating.

### Inventory and Stock Rules

- WHEN an order is confirmed, THE system SHALL reduce the SKU’s available inventory by the quantity ordered.
- WHEN an order is canceled or fails payment, THE system SHALL restore the inventory to its previous state.
- WHEN an order is returned, THE system SHALL restore the inventory if the item is received in sellable condition.
- WHEN inventory for a SKU reaches zero, THE system SHALL set the product variant status to "out_of_stock".
- WHEN inventory for a SKU increases (via seller restock), THE system SHALL update the variant status to "in_stock" if previously out of stock.
- WHEN a seller manually adjusts inventory, THE system SHALL require them to specify whether the change is "restock" (positive) or "loss" (negative).
- IF a seller attempts to decrease inventory below zero, THEN THE system SHALL prevent the adjustment and show: "Inventory cannot go below zero."
- WHEN inventory is adjusted, THE system SHALL log the change with user ID, timestamp, and reason.
- WHEN a product variant’s inventory falls below a configurable threshold (e.g., 5 units), THE system SHALL notify the seller: "Low stock alert: Only X units remaining."
- WHEN system-wide inventory discrepancies are detected (e.g., ordered quantity exceeds stock), THE system SHALL flag the order for admin review.
- IF seller inventory and system inventory are out of sync by 10% or more for 48 hours, THE system SHALL freeze the seller’s ability to create new listings until reconciliation is performed.

### Refund and Cancellation Rules

- WHEN a customer requests a cancellation before order shipment, THE system SHALL allow immediate cancellation and issue a full refund.
- WHILE an order status is "pending_payment", THE system SHALL allow cancellation without penalty.
- WHEN a customer requests cancellation after the order is "shipped", THE system SHALL require the return of items and initiate a return shipping label.
- IF the item is returned and confirmed received in resellable condition, THEN THE system SHALL issue a full refund including original shipping.
- IF the item is returned but damaged or missing components, THEN THE system SHALL issue a partial refund based on condition (via admin override).
- WHEN a refund is processed, THE system SHALL update the order status to "refunded" and notify the customer.
- WHEN a refund is issued, THE system SHALL restore the inventory to the seller's stock.
- IF a refund request is made more than 30 days after delivery, THEN THE system SHALL deny the request and show: "Returns and refunds are only accepted within 30 days of delivery."
- WHEN an order is cancelled due to seller inactivity (no shipment within 48 hours), THE system SHALL issue an automatic refund.
- WHEN an admin initiates a refund, THE system SHALL require an approval reason to be logged.
- WHEN a refund is made via third-party payment processor, THE system SHALL wait for confirmation from the processor before marking refund as complete.
- IF a refund fails to process with the payment gateway, THE system SHALL update the order status to "refund_failed" and notify the seller and customer.
- WHEN a refund is successfully processed, THE system SHALL earn a service fee of 3% of the refund amount, retained by the platform.

### Seller Account Rules

- WHEN a user applies to become a seller, THE system SHALL require submission of legal business name, tax ID, and bank account details.
- IF a seller application is submitted with invalid tax ID or bank information, THEN THE system SHALL reject it and request correction.
- WHILE a seller application is under review, THE system SHALL prevent the user from listing products or viewing sales.
- IF an admin approves a seller application, THE system SHALL change the user’s role from "customer" to "seller" and grant access to seller dashboard.
- IF an admin rejects a seller application, THE system SHALL notify the user with the reason and allow resubmission after 14 days.
- WHEN a seller’s account is suspended by an admin, THE system SHALL immediately remove their products from catalog and disable all selling functions.
- WHEN a seller’s account is terminated, THE system SHALL archive all related products, revoke all API keys, and preserve records for 7 years.
- WHEN a seller changes their bank account details, THE system SHALL require verification of the new account via micro-deposit (two small deposits within 72 hours).
- WHEN a seller changes their store name, THE system SHALL require approval by an admin if the name contains trademarked words or misleading qualifiers (e.g., "Official", "Certified").
- WHEN a seller exceeds 100 sales in a month, THE system SHALL prompt them to upgrade to a "Premium Seller" plan.
- IF a seller receives 5 or more returned items in a 30-day period, THE system SHALL flag their account for review and may require a quality inspection.

### Admin Access Rules

- WHEN an admin performs a deletion or modification of a customer/seller account, THE system SHALL require a mandatory justification field of at least 10 characters.
- WHEN an admin bans a user from the platform, THE system SHALL send an automated email with the reason and reset all their tokens and sessions.
- WHEN an admin approves a product, THE system SHALL validate that the seller has no active sanctions or suspensions.
- WHEN an admin edits a product’s category, price, or description directly, THE system SHALL log the edit with admin ID, old value, new value, and timestamp.
- WHEN an admin overrides an inventory adjustment, THE system SHALL require a confirmation code that is randomly generated and expires in 5 minutes.
- WHEN an admin processes a refund greater than $1,000, THE system SHALL require a second admin’s email verification.
- WHEN an admin changes a user’s role (e.g., customer to seller), THE system SHALL require proof of identity verification (name, email match) against government records if flagged by automated system.
- WHEN an admin accesses another user’s private data (order history, emails, addresses), THE system SHALL log every access and notify the user via email within 24 hours.
- IF any admin action is performed on another admin account, THE system SHALL deny the request and escalate it to platform owner.
- WHEN an admin logs out, THE system SHALL require re-verification of credentials before allowing any further access for 5 minutes.
- WHEN a new admin is added to the system, THE system SHALL require biometric or 2FA verification from a senior admin.
- WHEN an admin role is changed (e.g., from 'moderator' to 'super_admin'), THE system SHALL require 72-hour waiting period before privileges take effect.
- WHEN any admin performs an action that modifies financial data (refund, commission adjustment), THE system SHALL require audit trail to be archived and blocked from modification for 10 years.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.