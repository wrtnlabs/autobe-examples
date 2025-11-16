# Customer Requirements for E-commerce Shopping Mall Platform

## 1. Customer Account Management

### 1.1 Registration and Account Creation

WHEN a guest user navigates to the registration page, THE system SHALL present a form requesting email address, password, full name, and phone number.

WHEN a user submits the registration form with valid information, THE system SHALL create a new customer account and send a verification email to the provided email address within 2 seconds.

WHEN a user clicks the verification link in the email, THE system SHALL mark their email address as verified and activate their account for full platform access.

IF a user attempts to register with an email address already associated with an existing account, THEN THE system SHALL display an error message and prevent account creation.

THE system SHALL enforce password requirements including minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number.

WHEN a user leaves the registration form without completing it for more than 30 minutes, THE system SHALL clear their session and require them to restart the registration process.

THE system SHALL require email verification before customers can place orders, but SHALL allow them to browse products and add items to cart without verification.

### 1.2 Login and Authentication

WHEN a customer enters their email and password on the login page, THE system SHALL validate credentials within 2 seconds.

IF the provided credentials are valid, THE system SHALL generate a JWT token and allow access to the customer's account.

IF the provided credentials are invalid, THE system SHALL return an error message without revealing whether the email exists in the system.

WHEN a customer logs in successfully, THE system SHALL remember their login and keep their session active for 30 days unless they explicitly log out.

WHEN a customer logs out, THE system SHALL immediately invalidate their session token and clear stored credentials.

THE system SHALL support "Remember Me" functionality, allowing customers to stay logged in for extended periods while maintaining security.

WHEN a customer attempts to log in from a new device or location, THE system SHALL require email verification for the first login from that device.

### 1.3 Profile Management and Preferences

WHEN a customer accesses their profile page, THE system SHALL display their account information including email, full name, phone number, and account creation date.

THE customer SHALL be able to update their full name, phone number, and profile information at any time.

THE customer SHALL be able to change their password by verifying their current password first.

THE system SHALL allow customers to set notification preferences for email, SMS, and push notifications.

WHEN a customer updates their notification preferences, THE system SHALL apply changes immediately and confirm the update.

THE system SHALL allow customers to view their account activity history including login timestamps and password change dates.

### 1.4 Address Management

THE system SHALL allow customers to add and maintain multiple delivery addresses in their account.

WHEN a customer adds an address, THE system SHALL require street address, city, postal code, country, and phone number.

WHEN a customer adds an address, THE system SHALL validate the address format and display a confirmation message.

THE customer SHALL be able to set one primary or default address for order delivery.

THE system SHALL allow customers to edit existing addresses in their account.

THE system SHALL allow customers to delete addresses, except when an address is associated with an active order that has not yet been delivered.

WHEN a customer proceeds to checkout, THE system SHALL display all saved addresses and allow them to select one for delivery.

THE system SHALL allow customers to enter a new temporary address during checkout without permanently saving it to their profile.

### 1.5 Payment Method Management

WHEN a customer adds a payment method, THE system SHALL support credit cards, debit cards, and digital wallet options.

WHEN a customer enters payment card details, THE system SHALL validate the card format and securely store only the last 4 digits and expiration date.

THE customer SHALL be able to save multiple payment methods in their account.

THE system SHALL allow customers to set a default payment method for faster checkout.

THE customer SHALL be able to delete payment methods from their saved list at any time.

WHEN a customer deletes a payment method, THE system SHALL remove it from their account and prevent future charges to that card.

THE system SHALL display all saved payment methods during checkout with the default method pre-selected.

THE system SHALL support adding new payment methods during checkout without saving them permanently.

### 1.6 Account Security

THE system SHALL require re-authentication when customers attempt to change email address, delete account, or modify security settings.

WHEN a customer forgets their password, THE system SHALL allow them to request a password reset via email.

WHEN a customer clicks the password reset link, THE system SHALL present a form to create a new password and require verification.

THE password reset link SHALL expire after 24 hours and become invalid if used once.

THE system SHALL track failed login attempts and temporarily lock an account after 5 consecutive failed attempts for 15 minutes.

WHEN a customer's account is locked due to failed attempts, THE system SHALL send an email notification.

THE system SHALL allow customers to view their login history including timestamp, device, and IP address.

### 1.7 Account Deactivation and Deletion

WHEN a customer requests to deactivate their account, THE system SHALL allow them to pause their account without deleting data.

WHEN a customer requests account deletion, THE system SHALL require written confirmation and explain what data will be deleted.

THE system SHALL maintain order history and transaction records for 7 years for compliance, even after account deletion.

WHEN an account is deleted, THE system SHALL remove personal information such as name, email, phone, and saved addresses.

---

## 2. Product Discovery and Search

### 2.1 Product Browsing and Category Navigation

WHEN a customer visits the platform homepage, THE system SHALL display featured products and allow navigation to product categories.

THE system SHALL organize products into logical categories and subcategories for easy navigation.

THE customer SHALL be able to view all products in a category and see product counts for each subcategory.

THE system SHALL display products in a grid or list view with the ability to switch between views.

WHEN a customer views a category, THE system SHALL display pagination controls allowing them to view 20, 50, or 100 products per page.

### 2.2 Product Search Functionality

WHEN a customer enters a search query, THE system SHALL return matching products within 1 second.

THE system SHALL match search queries to product names, descriptions, and product attributes like color and size.

WHEN a customer searches without results, THE system SHALL display a message and suggest related categories.

THE system SHALL support searching by product name, SKU code, seller name, or specific product attributes.

THE system SHALL provide search suggestions as the customer types, offering autocomplete functionality.

WHEN a customer searches, THE system SHALL remember their search history for quick access in future sessions.

### 2.3 Filtering and Sorting

THE system SHALL allow customers to filter products by:
- Price range (minimum and maximum price)
- Rating (4-5 stars, 3-5 stars, etc.)
- Seller store name
- Product availability (in stock vs out of stock)
- Product attributes like color, size, and brand

WHEN a customer applies filters, THE system SHALL update results instantly and show the number of matching products.

THE system SHALL allow customers to sort products by:
- Newest first
- Price (low to high, high to low)
- Highest rating
- Most reviews
- Best sellers

WHEN a customer applies multiple filters, THE system SHALL show "Active Filters" with ability to clear individual filters or all filters at once.

### 2.4 Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:
- Product name and description
- Product images (gallery with main image and thumbnails)
- Current price and original price (if on sale)
- Product rating and review count
- Seller store name with seller rating
- Product availability and stock status
- Available variants (colors, sizes, options)
- Product specifications and attributes
- Shipping information

THE system SHALL display product images clearly and allow customers to zoom in on images and view multiple angles.

THE system SHALL show delivery timeline estimates based on the customer's location and shipping method.

THE system SHALL allow customers to add items to cart or wishlist directly from the product detail page.

---

## 3. Shopping Cart Operations

### 3.1 Add Items to Cart

WHEN a customer views a product, THE system SHALL display an "Add to Cart" button.

WHEN a customer clicks "Add to Cart" without selecting variant options, THE system SHALL display an error message if variants are required.

WHEN a customer selects a variant (size, color, option) and clicks "Add to Cart", THE system SHALL add the specific SKU to their cart.

WHEN a customer adds an item to cart, THE system SHALL validate that the item is in stock for the requested quantity.

IF the requested quantity exceeds available inventory, THEN THE system SHALL show the maximum available quantity and allow the customer to adjust their request.

WHEN an item is successfully added to cart, THE system SHALL display a confirmation message and update the cart count in the navigation.

THE system SHALL allow customers to add the same product with different variants (colors/sizes) as separate cart items.

### 3.2 View and Manage Cart

THE system SHALL display the shopping cart with all items, quantities, prices, and total cost.

WHEN a customer views their cart, THE system SHALL display:
- Product image and name for each item
- Selected variant (color, size, options)
- Unit price and line total for each item
- Subtotal, shipping estimate, and grand total
- Stock status for each item
- Seller information for each item

THE system SHALL allow customers to see their cart at any time during their shopping session.

### 3.3 Modify Cart Items

WHEN a customer changes the quantity of a cart item, THE system SHALL update the subtotal instantly.

WHEN a customer reduces quantity to zero, THE system SHALL remove the item from the cart.

WHEN a customer clicks "Remove", THE system SHALL permanently delete that item from their cart and confirm the deletion.

THE system SHALL validate inventory availability when a customer increases item quantity.

IF inventory is insufficient for the requested quantity increase, THEN THE system SHALL show the maximum available quantity and allow adjustment.

WHEN a customer increases quantity and inventory is insufficient, THE system SHALL not prevent adding to cart but SHALL show a warning.

### 3.4 Cart Persistence

THE system SHALL save the customer's cart after every modification so they can return and continue shopping.

WHEN a customer logs out and logs back in, THE system SHALL restore their previous cart contents exactly as they left it.

WHEN a customer clears their cart, THE system SHALL ask for confirmation before permanently removing all items.

THE system SHALL support cart abandonment recovery by sending a reminder email 24 hours after cart abandonment if the cart remains unpurchased.

### 3.5 Pre-Checkout Validation

WHEN a customer initiates checkout, THE system SHALL validate cart contents and re-check inventory availability for all items.

IF any item is no longer in stock for the requested quantity, THEN THE system SHALL notify the customer and allow them to adjust quantities.

IF any item has been removed from the catalog by the seller, THEN THE system SHALL remove it from the cart and notify the customer.

THE system SHALL prevent checkout if the cart is empty.

THE system SHALL prevent checkout if the customer has not verified their email address.

---

## 4. Wishlist Management

### 4.1 Create and Manage Wishlists

WHEN a customer clicks "Add to Wishlist" on a product page, THE system SHALL add that product to their wishlist.

THE system SHALL allow customers to view their wishlist at any time from their dashboard.

WHEN a customer views their wishlist, THE system SHALL display all saved items with product details and current prices.

THE customer SHALL be able to create multiple wishlists (e.g., "Summer Clothes", "Gifts for Mom").

THE system SHALL allow customers to name their wishlists and set them as public or private.

THE system SHALL allow customers to rename wishlists at any time.

### 4.2 Wishlist Operations

WHEN a customer removes an item from their wishlist, THE system SHALL delete it and confirm the removal.

WHEN a customer moves an item from wishlist to cart, THE system SHALL add it to the cart and give them the option to keep it in wishlist or remove it.

THE system SHALL allow customers to delete entire wishlists if they no longer need them.

THE system SHALL show the count of items in each wishlist on the dashboard.

### 4.3 Wishlist Sharing

WHEN a customer shares a public wishlist, THE system SHALL generate a shareable link that other users can access.

WHEN another user accesses a shared public wishlist, THE system SHALL display the items but not allow modifications.

WHEN a customer sets a wishlist to private, THE system SHALL disable the share link and prevent public access.

### 4.4 Wishlist Notifications

WHEN an item in the customer's wishlist goes on sale or price drops significantly, THE system SHALL send a notification.

THE system SHALL allow customers to enable or disable price drop notifications for their wishlists.

---

## 5. Order Placement and Processing

### 5.1 Checkout Process

WHEN a customer initiates checkout, THE system SHALL display the checkout flow in clear steps:
1. Review cart items
2. Select shipping address
3. Select shipping method
4. Review order summary
5. Select payment method
6. Confirm and place order

WHEN a customer is at the address selection step, THE system SHALL display all saved addresses and allow selecting one.

THE system SHALL allow customers to add a new address during checkout without saving it to their profile.

THE system SHALL validate the selected address for format and accuracy.

### 5.2 Shipping Method Selection

WHEN a customer selects a shipping address, THE system SHALL display available shipping methods with delivery timelines.

THE system SHALL show shipping costs for each method, calculated based on weight, dimensions, and destination.

THE system SHALL offer multiple shipping speed options (e.g., Standard, Express, Overnight) with different costs and delivery dates.

THE system SHALL display estimated delivery date for the selected shipping method.

WHEN a customer selects a shipping method, THE system SHALL update the order total and display the new amount.

THE system SHALL allow customers to select different shipping methods for different items if they have multiple sellers.

### 5.3 Order Summary Review

WHEN a customer reviews their order summary before payment, THE system SHALL display:
- All items with quantities, prices, and variants
- Subtotal of merchandise
- Shipping costs broken down by seller if applicable
- Tax calculations
- Applied discounts or promotional codes
- Grand total amount due

WHEN a customer reviews their order, THE system SHALL show the delivery address and estimated delivery date.

THE system SHALL allow customers to go back and modify their cart, address, or shipping method before final payment.

### 5.4 Order Confirmation

WHEN a customer successfully completes payment, THE system SHALL generate a unique order number and display it immediately.

WHEN an order is successfully placed, THE system SHALL send a confirmation email within 30 seconds containing:
- Order number and order date
- Itemized list of products and quantities
- Shipping address and estimated delivery date
- Order total and payment method used
- Link to track the order

THE system SHALL display an order confirmation page with all order details and next steps.

THE system SHALL allow customers to print or save the order confirmation.

WHEN an order is placed, THE system SHALL update inventory levels immediately and allocate stock to the order.

### 5.5 Taxes and Discounts

THE system SHALL calculate applicable sales tax based on shipping destination and product type.

THE system SHALL display tax calculations in the order summary before payment.

THE system SHALL allow customers to apply promotional codes or discount vouchers during checkout.

WHEN a customer enters a promotional code, THE system SHALL validate it and display the discount amount instantly.

IF a promotional code is invalid or expired, THEN THE system SHALL display an error message.

WHEN a discount is applied, THE system SHALL recalculate the order total and display the savings.

---

## 6. Payment Processing Requirements

### 6.1 Payment Method Selection

WHEN a customer reaches the payment step, THE system SHALL display all saved payment methods.

THE system SHALL show the default payment method as pre-selected.

THE system SHALL allow customers to select a different saved payment method for this order.

THE system SHALL allow customers to add a new payment method during checkout.

THE system SHALL support the following payment methods:
- Credit cards (Visa, Mastercard, American Express)
- Debit cards
- Digital wallets (Apple Pay, Google Pay)
- Buy now, pay later services (if available)

### 6.2 Payment Authorization

WHEN a customer submits their order with payment details, THE system SHALL process the payment within 5 seconds.

WHEN payment is successful, THE system SHALL display a confirmation message and create the order.

IF payment fails, THEN THE system SHALL display a specific error message indicating the reason (e.g., "Insufficient funds", "Card expired").

WHEN payment fails, THE system SHALL allow the customer to try again with the same or different payment method.

THE system SHALL never charge the customer for a failed payment attempt.

WHEN payment is declined repeatedly, THE system SHALL temporarily lock the account and require customer support contact.

### 6.3 Payment Confirmation

WHEN payment is processed successfully, THE system SHALL send a payment confirmation email with receipt details.

THE system SHALL display the payment confirmation on the order confirmation page.

WHEN a customer accesses their order history, THE system SHALL show the payment method used (masked) and payment status.

THE system SHALL allow customers to download payment receipts from their order history.

### 6.4 Multiple Seller Orders

WHEN a customer's cart contains items from multiple sellers, THE system SHALL group items by seller for presentation.

THE system SHALL process a single payment for the entire order, but allocate items to their respective sellers.

WHEN an order from multiple sellers is placed, THE system SHALL create separate fulfillment orders for each seller.

THE system SHALL show all sellers involved in the order and track fulfillment separately for each seller.

---

## 7. Order Tracking and Shipping

### 7.1 Order Status Visibility

WHEN a customer views their order, THE system SHALL display the current order status in real-time.

THE system SHALL display all possible order statuses in a clear, customer-friendly progression:
- Order Confirmed
- Payment Processed
- Seller Processing
- Ready to Ship
- In Transit
- Out for Delivery
- Delivered
- Completed

WHEN an order status changes, THE system SHALL send a notification email to the customer within 5 minutes.

### 7.2 Tracking Information

WHEN an order is shipped, THE system SHALL display tracking number(s) for the shipment(s).

THE system SHALL provide a link to the shipping carrier's website to track the package in real-time.

WHEN a customer views their order, THE system SHALL display:
- Current location of the package (if available)
- Estimated delivery date and time window
- Carrier name and tracking number
- Full shipping timeline with timestamps

THE system SHALL update tracking information every time the carrier updates their system (multiple times daily during transit).

### 7.3 Delivery Notifications

WHEN a package is out for delivery, THE system SHALL send a notification to the customer on the morning of delivery.

WHEN a package is delivered, THE system SHALL send a delivery confirmation notification within 1 hour.

WHEN a customer enables SMS notifications, THE system SHALL send tracking updates via text message in addition to email.

THE system SHALL allow customers to customize notification frequency (e.g., all updates, only major milestones, delivery only).

### 7.4 Delivery Issues and Exceptions

IF delivery is delayed, THEN THE system SHALL notify the customer and update the estimated delivery date.

IF a package is marked as lost or damaged, THEN THE system SHALL notify the customer immediately and provide instructions for next steps.

WHEN a customer reports a delivery issue, THE system SHALL allow them to initiate a support case with detailed description.

THE system SHALL allow customers to request package hold or redelivery through the order tracking page.

---

## 8. Order History and Cancellation

### 8.1 Order History

WHEN a customer accesses their order history, THE system SHALL display all past orders in reverse chronological order (newest first).

WHEN a customer views their order history, THE system SHALL display:
- Order number and order date
- Items purchased with quantities and current prices
- Order total amount
- Current order status
- Seller information for each item

THE system SHALL allow customers to filter their order history by:
- Date range
- Order status
- Seller name
- Price range

THE system SHALL allow customers to search their order history by order number or product name.

### 8.2 Order Detail Access

WHEN a customer clicks on an order, THE system SHALL display complete order details including:
- All items with prices, quantities, and selected variants
- Shipping address and delivery date
- Tracking information and current status
- Payment method used (masked) and amount paid
- Seller details and seller rating
- Ability to reorder the same items

THE system SHALL allow customers to download order invoices as PDF.

THE system SHALL allow customers to view seller communication and order messages.

### 8.3 Cancellation Requests

WHEN a customer requests to cancel an order, THE system SHALL check if cancellation is allowed based on order status.

THE system SHALL allow order cancellation only if the order is still in "Order Confirmed" or "Seller Processing" status (before shipment).

WHEN a cancellation request is submitted, THE system SHALL require the customer to select a reason for cancellation.

WHEN cancellation is approved, THE system SHALL initiate a refund to the original payment method.

THE system SHALL display a message confirming cancellation and refund status.

### 8.4 Refund Processing

WHEN a refund is initiated, THE system SHALL process it to the original payment method within 3-5 business days.

WHEN a refund is processed, THE system SHALL send a confirmation email with refund details and expected arrival date.

THE system SHALL display refund status in the order history, showing:
- Refund amount
- Refund date initiated
- Expected refund completion date
- Refund status (Processing, Completed)

IF a refund fails (e.g., card was closed), THEN THE system SHALL contact the customer and offer alternative refund methods.

THE system SHALL maintain refund transaction history for accounting and dispute resolution.

### 8.5 Returns and Exchanges

WHEN a customer initiates a return request, THE system SHALL require them to specify the reason (e.g., damaged, defective, wrong item, size issue).

WHEN a return is approved, THE system SHALL provide:
- Return shipping label (prepaid or to be paid by customer depending on reason)
- Return address
- Return window deadline (typically 30 days from delivery)
- Instructions for packing and shipping

THE system SHALL track the return shipment status and notify the customer when the item is received.

WHEN a return is received and inspected, THE system SHALL determine if it's in returnable condition.

IF the returned item meets return requirements, THEN THE system SHALL issue a refund or exchange as requested.

IF the returned item does not meet return requirements, THEN THE system SHALL contact the customer with explanation and return options.

---

## 9. Product Reviews and Ratings

### 9.1 Review Submission

WHEN a customer has received and confirmed delivery of an order, THE system SHALL allow them to leave product reviews.

WHEN a customer clicks "Write a Review" on a product, THE system SHALL present a review form requesting:
- Star rating (1-5 stars)
- Review title
- Review content/description
- Product images (optional - photos of the product in use or with issues)

THE system SHALL enforce minimum review length of 20 characters and maximum of 5000 characters.

WHEN a customer submits a review, THE system SHALL validate that they actually purchased that specific product.

THE system SHALL prevent customers from submitting multiple reviews for the same product SKU.

WHEN a review is submitted, THE system SHALL moderate it before publication and display within 24 hours if approved.

### 9.2 Review Moderation

THE system SHALL automatically filter reviews for:
- Spam and promotional content
- Abusive or inappropriate language
- Contact information (phone numbers, emails)
- Competitor references

THE system SHALL review flagged reviews for compliance before publication.

IF a review violates guidelines, THEN THE system SHALL reject it and notify the customer with explanation.

THE system SHALL allow customers to edit or delete their own reviews anytime.

WHEN a customer edits a review, THE system SHALL require it to pass moderation again.

### 9.3 Rating Aggregation and Display

WHEN a customer views a product, THE system SHALL display:
- Overall product rating (1-5 stars with decimal precision like 4.2)
- Number of reviews received
- Rating distribution (how many 5-star, 4-star, etc. reviews)

THE system SHALL calculate product ratings from all verified purchases only.

THE system SHALL display reviews sorted by:
- Most recent first (default)
- Highest rating first
- Lowest rating first
- Most helpful first
- Verified purchases first

THE system SHALL allow customers to filter reviews by star rating (show only 5-star reviews, etc.).

### 9.4 Review Authenticity and Helpfulness

WHEN a customer reads a review, THE system SHALL display a "Verified Purchase" badge if the reviewer bought that product.

THE system SHALL allow other customers to mark reviews as "Helpful" or "Not Helpful".

THE system SHALL track helpful votes and sort reviews by helpfulness when that sorting option is selected.

THE system SHALL flag suspicious review patterns (e.g., multiple reviews from same account in short time) for manual review.

WHEN a seller suspects fraudulent reviews, THE system SHALL allow them to report reviews to admin for investigation.

### 9.5 Seller Ratings

THE system SHALL calculate a separate seller rating based on order fulfillment, customer service, and product quality.

WHEN a customer views a seller's store, THE system SHALL display:
- Seller rating (1-5 stars)
- Number of ratings
- Response time to customer inquiries
- Product quality rating
- Shipping speed rating
- Return rate and customer satisfaction metrics

THE system SHALL link seller ratings to their respective product reviews so customers understand seller performance.

---

## 10. Customer Dashboard Features

### 10.1 Dashboard Overview

WHEN a customer logs into their account, THE system SHALL display a personalized dashboard showing:
- Quick summary of recent orders and their status
- Number of items in cart and wishlist
- Saved addresses and payment methods
- Account balance (if using platform credit or wallet feature)
- Notifications and messages from sellers

THE customer dashboard SHALL load within 3 seconds.

### 10.2 Quick Order Status

WHEN a customer views their dashboard, THE system SHALL display their most recent orders with:
- Order number and date
- Current status with visual indicator
- Expected delivery date
- Tracking link if order is in transit
- Quick action button to view full details

THE system SHALL limit the dashboard view to show the 5 most recent orders, with link to full order history.

### 10.3 Saved Items Management

WHEN a customer views their dashboard, THE system SHALL display:
- Count of wishlisted items
- Most recently added wishlist items (3-5 items)
- Link to view all wishlists
- Option to quickly add wishlist items to cart

THE system SHALL allow customers to manage wishlists directly from the dashboard.

### 10.4 Account Preferences

WHEN a customer accesses account settings from the dashboard, THE system SHALL provide quick access to:
- Personal profile information
- Saved addresses
- Saved payment methods
- Notification preferences
- Email and communication settings
- Privacy and security settings

THE system SHALL allow quick edits to frequently changed settings without leaving the dashboard.

### 10.5 Notification Center

WHEN a customer accesses their notification center, THE system SHALL display:
- All notifications organized by date (newest first)
- Order status updates
- Wishlist price drop alerts
- Seller messages and responses
- System announcements

THE system SHALL allow customers to mark notifications as read, archive them, or delete them.

THE system SHALL provide notification filtering by type (orders, wishlist, seller messages, etc.).

### 10.6 Customer Support Access

WHEN a customer needs help, THE system SHALL provide easy access to:
- FAQs and help articles organized by topic
- Live chat with customer support (during business hours)
- Ability to submit support tickets
- Email support option
- Phone support contact information
- Previous support ticket history

THE system SHALL allow customers to search support articles using the same search bar as product search.

THE system SHALL allow customers to rate the helpfulness of support articles.

---

## 11. Business Rules and Constraints

### Account and Authentication Rules

- Email addresses must be unique across the platform
- Customers cannot share accounts; each person requires their own account
- Customer accounts must be verified via email before placing orders
- Password reset tokens are valid for exactly 24 hours
- Accounts are locked after 5 failed login attempts for 15 minutes
- Session tokens (JWT) expire after 30 days of inactivity

### Shopping Cart Rules

- Cart items are held for 7 days before being released back to inventory
- If a customer adds an item that's the last in stock and someone else buys it, the customer is notified and item is removed from cart
- Cart quantities are automatically reduced if seller reduces inventory between cart abandonment and checkout
- Items can be saved in cart while customer is logged out (persistent cart)
- Cart survives browser refresh and device changes

### Order Rules

- Orders are final once payment is processed and cannot be modified
- Order cancellation is only allowed within 2 hours of order placement or before seller starts processing
- Refunds for cancellations are processed to original payment method within 3-5 business days
- Order numbers are permanent, unique identifiers used for tracking across the platform
- Customers can only refund/cancel their own orders; admins can refund/cancel on behalf of customers for customer service

### Inventory Rules

- Inventory is checked and reserved at checkout, not when items are added to cart
- If inventory is insufficient at checkout, the customer must reduce quantity before proceeding
- Inventory is restored immediately if an order is cancelled
- Customers cannot purchase more than 100 units of the same SKU per order (to prevent bulk buying abuse)
- Sellers can set minimum and maximum purchase quantities per SKU

### Review and Rating Rules

- Only verified purchasers (customers who actually bought the product) can review products
- Customers can only submit one review per product variant (SKU)
- Reviews are published within 24 hours after moderation approval
- Customers can edit or delete their own reviews anytime (after review is published)
- Reviews with harmful or abusive content are removed by admin
- Average product rating is calculated from published reviews only
- Reviews older than 90 days have diminished weight in rating calculations (still counted but older reviews influence ratings less)

### Payment Rules

- Customers must be authenticated to checkout and purchase
- Payment must be successfully authorized before order is created
- No order is created if payment fails or is declined
- Refunds can only be issued to the original payment method used for purchase
- Payment information is never logged or stored in plain text (PCI compliance)
- Customers cannot modify payment method after order is placed; refund and repurchase required

### Cancellation and Refund Rules

- Cancellations are only allowed in first 2 hours or before seller starts processing
- Returns have a 30-day window from delivery date
- Return shipping is free for defective/wrong items; paid by customer for change of mind
- Refunds are issued within 3-5 business days after return is approved
- Partial refunds can be issued for damaged items at admin discretion
- No refunds for lost packages during return shipping if customer didn't purchase insurance

### Privacy and Security Rules

- Customer personal information is encrypted in the database
- Payment card information is never stored by the platform (uses payment gateway tokenization)
- Customer can request data export of all their information
- Customer can request deletion of their account; personal data is removed after 90 days
- All account changes (password, email, payment method) require verification
- Customers can see login history and active sessions, and revoke access from specific devices

### Cross-seller Rules

- A single order can contain items from multiple sellers
- Each seller's items are fulfilled independently but customer receives single combined confirmation
- Shipping is coordinated across sellers but may arrive in separate packages
- If any item is from a seller with average rating below 3 stars, system shows warning
- Customers can leave separate reviews for each seller's products in the same order

---

## 12. Success Criteria for Customer Experience

The customer requirements for this e-commerce platform are successful when:

1. **Conversion**: New customers complete registration and purchase within 10 minutes of first product discovery
2. **Retention**: Customers return to the platform at least once per month and have positive order experiences
3. **Satisfaction**: Average product rating across the platform remains above 4.2 stars (out of 5)
4. **Efficiency**: Customers can complete checkout in less than 3 minutes from cart to confirmation
5. **Trust**: 95%+ of orders are delivered as promised with accurate tracking information
6. **Support**: Customer support inquiries are resolved within 24 hours with first-contact resolution over 70%
7. **Reviews**: At least 20% of customers who receive orders submit product reviews or ratings
8. **Returns**: Return/cancellation rate stays below 5% (indicating good product quality and accurate descriptions)
9. **Wishlist Adoption**: At least 40% of active customers use wishlist feature for future purchases
10. **Repeat Orders**: At least 40% of orders in any month are from repeat customers (not first-time buyers)

---

## 13. Integration with Related Systems

The customer experience relies on seamless integration with several backend systems:

- **Authentication System** (see [User Authentication and Actors](./02-user-actors-and-authentication.md)): Manages customer login, JWT tokens, and permission verification
- **Product Catalog** (see [Product Catalog System](./06-product-catalog-system.md)): Provides product information, variants, pricing, and availability
- **Inventory Management** (see [Inventory Management](./09-inventory-management.md)): Tracks real-time stock levels and reservations
- **Order Processing** (see [Order and Fulfillment](./08-order-and-fulfillment.md)): Handles order creation, payment, and fulfillment workflows
- **Reviews and Ratings** (see [Reviews and Ratings System](./10-reviews-and-ratings.md)): Manages review submission, moderation, and rating calculations
- **Payment Gateway**: Processes payments securely (detailed in [Platform Integration](./11-platform-integration-and-operations.md))
- **Shipping Providers**: Manages tracking and delivery updates (detailed in [Platform Integration](./11-platform-integration-and-operations.md))

---

## Summary

The customer requirements for the e-commerce shopping mall platform define a complete user journey from account creation through purchase, delivery, and post-purchase engagement. These requirements ensure that customers have a seamless, secure, and satisfying experience while shopping on the platform. Each requirement is specific, measurable, and actionable, providing clear guidance for development teams to implement the customer-facing features of the backend system.

The customer experience is central to the platform's success, as it directly impacts conversion rates, customer retention, and word-of-mouth marketing. By meeting these requirements, the platform will provide customers with the tools and confidence they need to shop effectively and complete their purchases with ease.