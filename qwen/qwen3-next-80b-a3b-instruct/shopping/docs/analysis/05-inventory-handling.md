# E-Commerce Shopping Mall Platform Requirements

## Customer Account

WHEN a new user registers for the platform, THE system SHALL require an email address and password as mandatory fields.

WHEN a user attempts to register with an email address already in use, THE system SHALL reject the registration with the error message: "This email address is already registered. Please use a different email or log in."

WHEN a user logs in with valid credentials, THE system SHALL authenticate the user and establish a secure session with JWT token issuance.

WHEN a user attempts to log in with invalid credentials, THE system SHALL return an authentication error with the message: "Invalid email or password. Please try again."

WHEN a user requests to change their password, THE system SHALL require the current password and two matching new passwords.

WHEN a user submits a password change request with mismatched new passwords, THE system SHALL reject the request and display: "New passwords do not match. Please try again."

WHEN a user submits a password change request with the same password as the current password, THE system SHALL reject the request and display: "New password cannot be the same as the current password."

WHEN a user successfully changes their password, THE system SHALL invalidate all existing sessions and require re-authentication on all devices.

WHEN a user requests to delete their account, THE system SHALL require confirmation through a two-step verification process.

WHEN a user confirms account deletion, THE system SHALL:
- Immediately deactivate the user's login credentials
- Remove all personal profile data including display name and phone number
- Preserve all order history and order items for seller records and legal compliance
- Preserve all reviews but change the display name to "Deleted User" with no link to account
- Delete the user's wishlist items
- Remove the user from all mailing lists
- Maintain audit log of deletion event with timestamp and IP address

## Customer Profile

WHEN a customer accesses their profile page, THE system SHALL display: display name and phone number.

WHEN a customer attempts to update their display name, THE system SHALL enforce a maximum length of 50 characters and disallow special characters except spaces, hyphens, and underscores.

WHEN a customer attempts to update their phone number, THE system SHALL validate against E.164 international format.

WHEN a customer submits a profile update, THE system SHALL immediately persist the changes and refresh the displayed profile information.

WHEN a customer's display name is updated, THE system SHALL NOT update previously created reviews, order items, or cart items with the old name.

WHEN a customer's phone number is updated, THE system SHALL NOT update previously recorded shipping addresses with the old number.

## Address Management

WHEN a customer adds a new shipping address, THE system SHALL require: recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer attempts to add an address with a duplicate street address and recipient name to an existing address, THE system SHALL allow it but display a warning: "This address closely matches an existing address. Are you sure you want to add it?"

WHEN a customer edits an existing address, THE system SHALL preserve the original address ID and update only the modified fields.

WHEN a customer deletes an address, THE system SHALL:
- Remove the address from the user's address book
- Ensure no active shopping cart contains this address
- Preserve the address in order history with its original values
- Allow deletion only if the address is not set as default

WHEN a customer sets an address as default, THE system SHALL:
- Mark the selected address as default
- Remove default status from all other addresses belonging to the same user
- Automatically select this address for future checkouts

WHEN a customer attempts to delete their only address, THE system SHALL prohibit deletion and display: "You must have at least one shipping address. Please add another address before deleting this one."

## Seller Account

WHEN a new seller registers, THE system SHALL require: email address, password, and a business verification request.

WHEN a seller attempts to register with an email address already used by a customer, THE system SHALL return: "This email is already registered as a customer account. If this is your business email, please contact support."

WHEN a seller submits a registration request, THE system SHALL set their status to "pending" and send notification to administrators.

WHEN a seller requests to change their password, THE system SHALL follow the same process as for customer password changes, with session invalidation.

WHEN a seller attempts to view their account status, THE system SHALL display one of: "Pending Review", "Approved", or "Rejected".

WHEN a seller's registration is rejected, THE system SHALL:
- Show rejection reason provided by administrator
- Allow the seller to re-submit a new registration request with updated information
- Allow the seller to change their password and contact details while pending
- Preserve the original registration attempt history

WHEN a seller attempts to delete their account, THE system SHALL verify:
- No order items with status 'paid' or 'shipped' exist
- No pending cancellation or refund requests exist
- All products are either deleted or have zero quantities

WHEN a seller confirms deletion of their account, THE system SHALL:
- Deactivate login credentials immediately
- Remove shop name, description, and logo from seller profile
- Delete all products and product variations created by the seller
- Preserve all order history, order item snapshots, and transaction records
- Preserve seller profile snapshots from past orders
- Update past order items to indicate "Seller account deleted"
- Delete the seller's inventory history records
- Maintain audit log of deletion event

## Seller Profile

WHEN a seller accesses their profile, THE system SHALL display: shop name, shop description, and logo image.

WHEN a seller edits their shop name, THE system SHALL enforce a maximum length of 100 characters and disallow special characters except spaces, hyphens, underscores, and periods.

WHEN a seller edits their shop description, THE system SHALL allow up to 500 characters.

WHEN a seller uploads or updates their logo, THE system SHALL:
- Accept only image formats: JPEG, PNG, GIF
- Limit file size to 5MB
- Automatically resize and optimize the image for display
- Store the image with a unique filename
- Preserve the original image in the system archive

WHEN any seller profile field is modified, THE system SHALL automatically create a snapshot record with:
- Timestamp of change
- Old value of all fields
- New value of all fields
- Seller ID
- Admin ID who approved the change (if applicable)

WHEN a customer views a seller's profile, THE system SHALL display the current profile information and provide access to all historical snapshots.

WHEN a customer views a seller profile snapshot, THE system SHALL display:
- Shop name at time of snapshot
- Description at time of snapshot
- Logo image from the snapshot
- Date the snapshot was taken

## Categories

WHEN an administrator creates a new category, THE system SHALL require: category name and description.

WHEN an administrator creates a subcategory, THE system SHALL require selecting one parent category.

WHEN an administrator edits a category name or description, THE system SHALL preserve the original category name and description in a snapshot.

WHEN an administrator deletes a category, THE system SHALL:
- Remove the category from the category tree
- Mark all products in that category as "uncategorized" and keep them visible
- Preserve the category's historical data and usage records
- Maintain the category's full history for audit purposes

WHEN a customer views categories, THE system SHALL display:
- All top-level categories with their descriptions
- Subcategories nested under each parent category
- The full category hierarchy with indented display

WHEN a customer selects a category, THE system SHALL display all products in that category and all its subcategories.

WHEN a product is assigned to a category, THE system SHALL establish a permanent association with the category ID at time of assignment.

WHEN a category's name is changed, THE system SHALL NOT update the category association on previously assigned products.

## Snapshot Principle

WHEN any editable data item is modified, THE system SHALL automatically create a snapshot record.

WHEN a snapshot is created, THE system SHALL record:
- The timestamp of the change in Asia/Seoul timezone
- The user ID who made the change
- The action performed (e.g., "edited", "deleted", "created")
- The identifier of the modified entity
- The before-and-after values of all changed fields
- The context of the change (e.g., "seller edited", "admin approved")

WHEN a snapshot is created, THE system SHALL make it immutable:
- No deletion allowed under any circumstances
- No modification allowed under any circumstances
- No access control changes permitted
- Only read-only access granted to relevant parties

WHEN a product is edited (name, description, category, base price, or image list), THE system SHALL create a product snapshot that includes:
- All product fields (id, name, description, category_id, base_price, created_at, updated_at)
- All images in the order they were presented (with URLs and order indexes)
- A nested snapshot of every active variant of that product at the time

WHEN a product variant is edited (SKU, option values, price), THE system SHALL create a product-snapshot-SKU record that is linked to the parent product snapshot.

WHEN a seller profile is edited (shop name, description, logo), THE system SHALL create a seller-profile-snapshot record.

WHEN an order is placed, THE system SHALL create an order-item-snapshot for each item that includes:
- Product name at time of purchase
- Product description at time of purchase
- Category name at time of purchase
- Base price at time of purchase
- Variant options and SKU at time of purchase
- Variant price at time of purchase (if overridden)
- Seller shop name at time of purchase
- Seller logo at time of purchase

WHEN a review is created or edited, THE system SHALL create a review-snapshot record.

WHEN a cancellation request is submitted or updated, THE system SHALL create a cancellation-request-snapshot record.

WHEN a refund request is submitted or updated, THE system SHALL create a refund-request-snapshot record.

WHEN a snapshot is viewed, THE system SHALL display the following information:
- Timestamp of snapshot
- User who made the change
- Changes made (before/after)
- Reason for change if provided
- Link to the original entity

WHEN a seller or customer views a past order, THE system SHALL display the order-item-snapshots for all items in that order.

WHEN an administrator investigates a dispute, THE system SHALL allow access to all snapshots of relevant entities for a period of 7 years.

WHEN a product is deleted, ALL associated product snapshots SHALL be preserved indefinitely.

WHEN a seller account is deleted, ALL associated seller profile snapshots SHALL be preserved indefinitely.

## Products

WHEN a seller creates a new product, THE system SHALL require: name (mandatory, max 200 characters), description (mandatory, min 50 characters), category (mandatory), and base price (mandatory, must be >= 0.01).

WHEN a seller creates a product, THE system SHALL assign the product to the seller's account and set initial status to "active".

WHEN a seller edits a product, THE system SHALL create a product snapshot and update the current product record.

WHEN a seller attempts to delete a product, THE system SHALL verify:
- No order items exist with status 'paid' or 'shipped' for any variant of this product
- No pending cancellation or refund requests exist for any variant of this product

WHEN a seller attempts to delete a product with existing order items, THE system SHALL block deletion and display: "This product cannot be deleted because it has order items in 'paid' or 'shipped' status. Complete all orders before deleting."

WHEN a seller successfully deletes a product, THE system SHALL:
- Mark the product as "deleted" in the main inventory table
- Remove the product from all search results and category listings
- Delete all product variants and associated inventory records
- Preserve all product snapshots
- Preserve all order items that reference this product
- Maintain audit log of deletion

WHEN a product is archived, THE system SHALL hide it from public listings but maintain visibility to the seller and administrators.

WHEN a customer views a product page, THE system SHALL display only products with active status and at least one variant.

WHEN a seller views their products, THE system SHALL display products with status: "active", "archived", and "deleted" (with visual indicators).

WHEN an administrator views all products, THE system SHALL display products from all sellers with full access to editing and deletion controls.

WHEN a seller views product snapshots, THE system SHALL be able to compare snapshots side-by-side with diff highlighting.

WHEN an administrator views product snapshots, THE system SHALL have full access to all historical versions of any product.

## Product Images

WHEN a seller uploads images for a product, THE system SHALL:
- Accept only: JPEG, PNG, GIF formats
- Limit total images to 10 per product
- Limit per file size to 5MB
- Resize images to maintain aspect ratio and optimize for web display
- Generate thumbnail version for listing views
- Store original images with unique filenames

WHEN a seller reorders product images, THE system SHALL:
- Update the image order index for each image
- Set the first image as the primary thumbnail
- Create a product snapshot containing the new image order

WHEN a seller deletes an image from a product, THE system SHALL:
- Remove the image from the product
- Update the primary image if the deleted image was the primary one (set next in order as primary)
- Create a product snapshot with the new image set
- Preserve deleted images in archive

WHEN a customer views a product, THE system SHALL display all available images in the order maintained by the seller.

WHEN a customer views a product snapshot, THE system SHALL display the exact image set and order as it was at the time of the snapshot.

## Product Variants (SKU)

WHEN a seller creates a product, THE system SHALL require at least one variant.

WHEN a seller adds a new variant to a product, THE system SHALL require:
- SKU code (unique, alphanumeric, 6-20 characters)
- Option values (at least one, e.g., color: "Red", size: "Large")
- Stock quantity (integer, >= 0)

WHEN a seller attempts to create a variant with a duplicate SKU, THE system SHALL reject the request with: "This SKU code is already in use for another variant of this product."

WHEN a seller edits a product variant, THE system SHALL create a product-snapshot-SKU record.

WHEN a seller attempts to delete a product variant, THE system SHALL verify:
- No order items with status 'paid' or 'shipped' exist for this variant
- No pending cancellation or refund requests exist for this variant

WHEN a seller attempts to delete a variant with active order items, THE system SHALL block deletion and display: "This variant cannot be deleted because it has order items in 'paid' or 'shipped' status. Complete all orders before deleting."

WHEN a seller successfully deletes a variant, THE system SHALL:
- Remove the variant from the product
- Deactivate any cart items containing this variant
- Preserve all product-snapshot-SKU records
- Preserve all order items referencing this variant
- Maintain audit log of deletion

WHEN a product has no variants, THE system SHALL:
- Display the product as "Unavailable" in product listings
- Allow the product to be shown in search results
- Display message: "This product is currently unavailable. No variants exist."
- Allow the seller to add variants at any time

WHEN a product has exactly one variant, THE system SHALL display the variant without requiring selection.

WHEN a product has multiple variants, THE system SHALL require the customer to select variant options before adding to cart.

WHEN a customer selects a variant option that is incompatible with other selected options, THE system SHALL disable that option and display: "This combination is not available. Please select another option."

WHEN a seller uploads a new variant, THE system SHALL automatically set the stock quantity to 0 unless otherwise specified.

## Inventory Management

WHEN a seller adds inventory to a product variant, THE system SHALL create a new inventory history record with:
- Positive quantity change
- Seller-provided reason
- Timestamp
- Variant identifier
- Seller identifier

WHEN a seller subtracts inventory from a product variant, THE system SHALL create a new inventory history record with:
- Negative quantity change
- Seller-provided reason
- Timestamp
- Variant identifier
- Seller identifier

WHEN an order is successfully placed, THE system SHALL create a negative inventory history record for each variant with quantity purchased and reason: "order purchase".

WHEN a cancellation request for an order item is approved, THE system SHALL create a positive inventory history record for that variant with reason: "cancellation refund".

WHEN a refund request for an order item is approved, THE system SHALL create a positive inventory history record for that variant with reason: "refund release".

WHEN a seller adjusts inventory manually, THE system SHALL calculate the difference from current stock and create one inventory record representing that change.

WHEN a product variant's stock is recalculated, THE system SHALL sum all inventory history records associated with that variant.

WHEN a product variant's calculated stock reaches 0, THE system SHALL set status to "out of stock".

WHEN a product variant's calculated stock increases from 0 to any positive value, THE system SHALL set status to "in stock".

WHEN a customer attempts to add a variant to cart with 0 stock, THE system SHALL display: "This item is currently out of stock. Please check back later." and prevent addition.

WHEN a customer has a variant in cart that becomes out of stock, THE system SHALL:
- Mark the cart item as "unavailable"
- Display message: "This item is no longer in stock. It has been removed from your cart."
- Automatically remove the item after 24 hours

WHEN a seller views inventory history for a variant, THE system SHALL display:
- All records chronologically, newest first
- Quantity change
- Date and time
- Reason
- Order ID (if applicable)

WHEN an administrator views inventory history for any variant, THE system SHALL have the same permissions as the seller.

WHEN a variant is deleted, THE system SHALL preserve all associated inventory history records.

WHEN a seller account is deleted, THE system SHALL preserve all inventory history records related to their products.

WHEN inventory history is retrieved, THE system SHALL calculate and display running total with each entry.

WHEN a seller attempts to restock with negative quantity, THE system SHALL reject with: "Restock quantity must be a positive number."

WHEN a seller attempts to adjust inventory for a variant they don't own, THE system SHALL reject with: "You cannot modify inventory for products you do not own."

WHEN inventory history is exported, THE system SHALL provide CSV format with columns: Date, Change Type, Quantity, Reason, Order ID.

WHEN inventory records are processed, THE system SHALL ensure atomic transaction handling for each update.

## Product Search

WHEN a customer performs a product search, THE system SHALL search products by name across all sellers.

WHEN a customer searches, THE system SHALL return results with pagination (minimum 10 per page).

WHEN a customer applies category filter, THE system SHALL return products in that category and all subcategories.

WHEN a customer applies price range filter, THE system SHALL:
- Match products with base price or variant price within range
- Include products with any variant matching the price range

WHEN a customer selects "in-stock only", THE system SHALL return only products with at least one variant that has stock > 0.

WHEN a customer sorts by "newest first", THE system SHALL order results by product creation date descending.

WHEN a customer sorts by "price (low to high)", THE system SHALL order results by the lowest variant price ascending.

WHEN a customer sorts by "price (high to low)", THE system SHALL order results by the highest variant price descending.

WHEN a product has no variants, THE system SHALL not be returned in search results if "in-stock only" is selected.

WHEN a product has variants, THE system SHALL use the lowest variant price for sorting and display in listing.

WHEN search results are displayed, THE system SHALL indicate if any results are "out of stock".

## Product Listing

WHEN a list of products is displayed (search results or category view), THE system SHALL show for each product:
- Primary image (thumbnail)
- Product name
- Base price or price range (if multiple variants exist)
- Seller shop name (clickable link)
- Average rating (if reviews exist) and review count

WHEN a product has multiple variants with different prices, THE system SHALL display price range: "$10 - $25".

WHEN a product has only one variant, THE system SHALL display the single price.

WHEN a product has no variants, THE system SHALL display: "Unavailable".

WHEN a product has low stock (<= 3), THE system SHALL add badge: "Limited Stock".

WHEN a product has no reviews, THE system SHALL display "No reviews yet."

WHEN a product has reviews, THE system SHALL display the average rating with 5-star visual and review count.

WHEN a seller shop name is displayed, THE system SHALL hyperlink it to the seller profile page.

## Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:
- All images in the order specified by the seller (primary image first)
- Product name
- Product description
- Category name
- Seller shop name (clickable link)
- All available variants with their options (color, size, etc.), prices, and stock status
- Average rating and total review count
- All reviews

WHEN a variant is out of stock, THE system SHALL display: "Out of stock" with button labeled: "Notify Me When Available".

WHEN a variant is in stock, THE system SHALL display a "Add to Cart" button.

WHEN a customer selects variant options, THE system SHALL:
- Update displayed price
- Update displayed stock status
- Enable "Add to Cart" button when all options are selected

WHEN a customer views a product image gallery, THE system SHALL allow zooming, swiping, and image ordering.

WHEN a customer clicks on seller shop name, THE system SHALL navigate to the seller's profile page.

WHEN a customer scrolls to reviews, THE system SHALL display reviews sorted by newest first.

WHEN a customer requests to write a review, THE system SHALL ensure they have purchased at least one item from this product with status "delivered".

## Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Record the product ID
- Record the timestamp
- Store only the product ID (not variant)
- Limit to 200 products per customer

WHEN a customer views their wishlist, THE system SHALL display:
- Product thumbnail
- Product name
- Current price range or price
- Seller shop name
- Average rating
- "Remove from Wishlist" button

WHEN a customer removes a product from their wishlist, THE system SHALL remove it immediately.

WHEN a product is deleted by the seller, THE system SHALL automatically remove it from all wishlists.

WHEN a product becomes out of stock, THE system SHALL not remove it from wishlist but display "Out of Stock" on the listing.

WHEN a wishlist is viewed, THE system SHALL sort products by most recently added first.

WHEN a wishlist has more than 10 items, THE system SHALL paginate results with 10 per page.

WHEN a customer has no items in their wishlist, THE system SHALL display: "Your wishlist is empty. Start adding products!"

## Shopping Cart

WHEN a customer adds a variant to cart, THE system SHALL:
- Require selection of specific variant options
- Require selection of quantity (minimum 1, maximum 10 per variant)
- Verify the variant's stock meets or exceeds the requested quantity

WHEN the same variant is already in cart with quantity 2 and customer adds 3 more, THE system SHALL combine into one item with quantity 5.

WHEN a customer views their cart, THE system SHALL display each item with:
- Product name
- Variant options
- Unit price
- Quantity
- Subtotal (unit price × quantity)

WHEN a customer changes the quantity of a cart item, THE system SHALL:
- Validate the new quantity doesn't exceed available stock
- Update subtotal accordingly
- Update cart total immediately

WHEN a customer removes an item from cart, THE system SHALL remove it immediately.

WHEN a cart item's variant becomes out of stock, THE system SHALL:
- Mark item as "Unavailable"
- Display message: "This item is no longer in stock. It has been removed from your cart."
- Allow customer to continue checkout with remaining items

WHEN a product variant is deleted, THE system SHALL mark any cart items referencing it as "Unavailable" and automatically remove after 24 hours.

WHEN a customer attempts to checkout with unavailable items in cart, THE system SHALL display warning: "Some items in your cart are unavailable. Please remove them or adjust quantities before checkout."

WHEN cart subtotal changes, THE system SHALL recalculate tax and shipping estimate immediately.

WHEN cart total exceeds $10,000, THE system SHALL display warning: "Large order detected. Contact seller for bulk pricing options."

WHEN a customer views the cart summary, THE system SHALL display:
- Item count
- Subtotal
- Estimated shipping
- Estimated tax
- Total

WHEN a customer clears the cart, THE system SHALL remove all items and display: "Your cart is now empty."

## Checkout

WHEN a customer proceeds to checkout, THE system SHALL:
- Verify cart is not empty
- Verify all items have sufficient stock
- Verify the customer has at least one saved shipping address

WHEN a customer selects a shipping address during checkout, THE system SHALL:
- Use the selected address for this order
- Allow selection of any of their saved addresses
- Allow creation of a new address (if none saved)

WHEN a customer reviews order summary before placing order, THE system SHALL display:
- List of items with product names, variant options, quantities, prices, and subtotal
- Shipping address
- Estimated delivery date
- Total price
- Payment method
- Terms and conditions checkbox

WHEN a customer places an order, THE system SHALL:
- Lock shipping address to prevent changes
- Prevent any further modifications to cart
- Begin order creation process

WHEN an order cannot be placed due to payment gateway error, THE system SHALL retain cart items and display error: "Payment failed. Please try again or select a different payment method."

## Payment

WHEN a customer confirms order placement, THE system SHALL redirect to the payment gateway.

WHEN payment success is received from gateway, THE system SHALL:
- Create order record
- Decrease inventory for each variant
- Remove cart items
- Send confirmation email to customer
- Notify seller of new order

WHEN payment fails (declined, expired card, etc.), THE system SHALL:
- Do not create order
- Preserve cart contents
- Display message: "Payment failed. Please check your payment details and try again."
- Allow customer to retry payment with same or different method
- Log payment failure for fraud monitoring

WHEN payment gateway is unreachable, THE system SHALL:
- Display: "Payment system is temporarily unavailable. Please try again in a few minutes."
- Preserve cart
- Retry connection automatically 3 times

## Order Creation

WHEN an order is placed successfully, THE system SHALL:
- Create a new order record with unique order number
- Decrease stock for each purchased variant in atomic transaction
- Remove item from customer's cart
- Create order item for each variant with status: "paid"
- Create snapshots for:
  - Each product
  - Each variant
  - Seller profile at time of purchase
  - Customer's shipping address

WHEN an order item is created, THE system SHALL store:
- Product ID
- Product name from snapshot
- Product description from snapshot
- Category from snapshot
- Base price from snapshot
- Selected variant options from snapshot
- Variant SKU from snapshot
- Variant price from snapshot
- Quantity
- Seller ID
- Seller shop name from snapshot
- Seller logo from snapshot
- Created timestamp in Asia/Seoul timezone

WHEN a customer receives order confirmation, THE system SHALL email with:
- Order number
- Items purchased
- Shipping address
- Total payment
- Expected delivery window
- Contact information for support

WHEN seller receives new order notification, THE system SHALL display:
- Order number
- Customer name
- Items purchased
- Shipping address
- Total amount
- Date and time received

## Order Structure

WHEN an order contains multiple items from same product variant, THE system SHALL group them into one order item with summed quantity.

WHEN an order contains items from multiple sellers, THE system SHALL treat them as separate orders for fulfillment purposes.

WHEN an order contains multiple order items, THE system SHALL assign each item an independent status lifecycle.

WHEN an order has multiple items, THE system SHALL calculate overall status based on individual item statuses.

WHEN an item is added to an order, THE system SHALL timestamp its creation.

WHEN an item is canceled or refunded, THE system SHALL update its status independently.

WHEN an item is shipped, THE system SHALL update its status to "shipped".

WHEN an item is delivered, THE system SHALL update its status to "delivered".

WHEN an order contains both paid and canceled items, THE system SHALL assign overall status: "partially completed".

## Order History

WHEN a customer views their order history, THE system SHALL display:
- Paginated list (10 orders per page)
- Sorted by newest first
- Each order shows: order number, order date, total price, status

WHEN a customer clicks on an order in history, THE system SHALL display full details:
- List of order items with product name, variant options, quantity, price, and status
- Shipping address
- Payment method
- Order total
- List of shipments with tracking information and delivery status
- Date and time of order creation

WHEN an order item has been refunded or cancelled, THE system SHALL display status in red.

WHEN a shipment is pending, THE system SHALL display: "Awaiting shipment from seller".

WHEN a shipment is delivered, THE system SHALL display: "Delivered