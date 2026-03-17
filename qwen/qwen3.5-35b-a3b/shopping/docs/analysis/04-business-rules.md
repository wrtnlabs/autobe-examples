**ecommerceMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

All customers must register with an email address and password before accessing any platform features. Email addresses must be unique across all registered customers. Customers can change their password at any time through their account settings. Customer accounts can be deleted by the account holder, but this does not delete order history or reviews. When an account is deleted, profile information is removed but orders remain visible to sellers for legal and record-keeping purposes. Deleted user reviews are preserved but displayed with the label deleted user. Registration and login require both email and password credentials.

### Customer Registration

All customers must register with an email address and password before accessing any platform features. Guest browsing is not permitted on this platform. During registration, the customer must provide both an email address and a password. Both fields are required for account creation. The email address must be in a valid email format (contains @ and domain). The password must be entered twice during registration to confirm accuracy. Registration cannot proceed if either field is empty or invalid.

### Email Validation Rules

Email addresses must be unique across all registered customers. When a customer attempts to register with an email address that is already in use, the registration request is rejected with an error message indicating the email is already registered. Email addresses are case-insensitive for uniqueness validation (customer@example.com and CUSTOMER@EXAMPLE.com are considered the same). The system must verify email uniqueness before creating the account. Duplicate registration attempts are rejected regardless of the password provided. Once an email address is associated with a customer account, it cannot be reused for another account.

### Password Management

Customers can change their password at any time through their account settings. When changing a password, the customer must enter both the current password and the new password. The current password must be correct to proceed with the password change. The new password must be confirmed by entering it a second time. Password changes take effect immediately upon successful submission. The system must validate the new password format requirements (minimum length, character types) before allowing the change. If the current password is incorrect, the password change request is rejected with an error message. If the new password confirmations do not match, the request is rejected. Password changes do not affect existing active sessions unless explicitly configured.

### Account Deletion Rules

Customer accounts can be deleted by the account holder through their account settings. Before deletion, the system must verify the customer's identity by requiring their current password. Account deletion is a permanent action and cannot be undone once completed. When a customer account is deleted, their profile information is immediately removed from the system. This includes display name, phone number, and all saved shipping addresses. The account deletion does not delete order history or reviews. Deleted customer accounts cannot be reactivated or recovered. The email address associated with the deleted account cannot be reused for a new registration for a specified retention period. Customer must have no pending disputes before account deletion can proceed.

### Order History and Review Preservation

When a customer account is deleted, all order history is preserved and remains visible to sellers for legal and record-keeping purposes. Order records include order number, date, items purchased, prices, and shipping information. Customer names on historical orders are replaced with a generic label indicating the account was deleted. Reviews written by deleted customers are preserved but displayed with the label deleted user instead of the customer's display name. The review content and ratings remain visible to maintain product review integrity. Deleted customers' reviews cannot be edited or deleted after account deletion. Administrators can still view the full order history including original customer information for compliance purposes. The system must ensure all legal and regulatory requirements for order record retention are met.

### Login Requirements

All customers must log in with their email address and password to access any platform features. The email and password are the only required credentials for authentication. Login attempts must include both fields; partial authentication is not permitted. Incorrect email addresses are rejected with a generic error message that does not confirm whether the email exists or not (to protect user privacy). Incorrect passwords are rejected with a generic error message that does not reveal whether the account exists. Multiple failed login attempts may trigger additional security measures such as temporary account lockout. Active login sessions remain valid until the customer logs out or the session expires. The system must verify both email existence and password correctness before granting access to any features. Customers cannot access their orders, wishlist, or cart without being authenticated.

## CustomerProfile Rules

Each customer has a profile containing a display name and phone number that can be viewed and edited. Customers can update their display name and phone number at any time through profile settings. The profile information is used to identify the customer on the platform and appears in order history and seller records. Both display name and phone number are editable fields that customers can modify as needed. Profile information remains accessible even after account deletion for order-related purposes.

### Display Name Editing Rules

Customers can set and modify their display name at any time through profile settings. The display name must contain at least one character and cannot be empty. The display name is visible to other users when viewing product reviews, order history, and seller records. The display name can be updated as many times as needed without restriction. An empty display name request is rejected with an error message indicating that a display name is required.

### Phone Number Modification Rules

Customers can set and modify their phone number at any time through profile settings. The phone number field is optional and can be left blank. When a phone number is provided, it must follow a valid phone number format recognized in the customer's country. The phone number is visible to sellers on order-related documents for shipping and contact purposes. Phone number updates are saved immediately and reflected across the platform.

### Profile Information Visibility

Customers can view their own profile information at all times. Sellers can view customer display name and phone number when the customer has placed an order. Other customers can view the display name in product reviews and order history comments. Phone numbers are never visible to other customers or sellers without an order relationship. Profile information is redacted after account deletion for non-order-related purposes, but remains visible in order history for legal and business record purposes.

### Editable Profile Fields

The editable profile fields are display name and phone number. Both fields can be modified independently without requiring changes to the other field. Profile information updates take effect immediately across all platform views. There is no limit to the number of times profile information can be updated. Profile changes are not subject to approval workflows or administrator review. Customers must be authenticated to make profile updates.

### Profile Data Preservation After Account Deletion

When a customer deletes their account, the display name and phone number are removed from the active profile and cannot be accessed. However, the profile information is preserved in order history records and seller order documents. The original display name used at the time of each order is retained in that order's record. The original phone number used at the time of each order is retained in that order's record. Preserved profile information remains read-only and cannot be modified after account deletion. Profile information preservation is required for legal record-keeping and dispute resolution purposes.

## Address Rules

Customers can maintain multiple shipping addresses for different delivery needs. Each address must include recipient name, phone number, street address, city, state or province, postal code, and country information. Customers can add new addresses, edit existing ones, or remove addresses they no longer need. One address can be designated as the default shipping address for checkout convenience. Default address selection is important for streamlining the checkout process when placing orders.

### Multiple Shipping Address Management

Customers can maintain multiple shipping addresses for different delivery needs, such as home, work, or other locations.

There is no limit to the number of shipping addresses a customer can store.

Each address is associated with the customer who created it and cannot be shared between customers.

Addresses can be viewed and managed from the customer's account settings page.

### Required Address Fields

Each shipping address must include the following fields:

- Recipient name: The name of the person who will receive the package
- Phone number: A contact number for the recipient
- Street address: The complete street address including building number and street name
- City: The city or municipality
- State or province: The state, province, or region
- Postal code: The postal or zip code for the delivery area
- Country: The country where the delivery will take place

All required fields must be provided when creating or editing an address. If any required field is missing, the address cannot be saved.

The recipient name and phone number are particularly important for delivery coordination and contact purposes.

### Address Editing Capabilities

Customers can edit any of their saved shipping addresses to update recipient information, street address, or other details.

All fields in an address can be modified after the address is created.

Changes to an address take effect immediately and apply to all future orders.

Existing orders are not affected by address changes; they retain the shipping address that was selected at the time of order placement.

If an address is edited, the changes are saved instantly and become the new default for that address entry.

### Address Deletion Options

Customers can delete shipping addresses that they no longer need.

Any address can be deleted by the customer who created it.

A customer cannot delete addresses that are currently in use as the shipping address for a pending or active order.

When an address is deleted, it is permanently removed and cannot be recovered.

If a deleted address was set as the default shipping address, the system will not automatically select a new default; the customer must manually select another address as default.

Customers must have at least one valid shipping address available in their account.

### Default Shipping Address Selection

Customers can designate one shipping address as their default for checkout convenience.

Only one address can be the default at any given time.

The default address is automatically pre-selected when the customer proceeds to checkout.

Customers can change which address is the default at any time from their address management page.

If the default address is deleted or becomes unavailable, the customer must manually select a new default address before checkout can be completed.

A customer without a default address is prompted to select one during checkout.

### Recipient Information Requirements

Each shipping address must include complete recipient information to ensure successful delivery.

The recipient name must be provided and cannot be empty.

The phone number must be provided in a valid format with at least 5 digits.

Both recipient name and phone number are required for delivery coordination and carrier contact.

If the recipient name or phone number is invalid or missing, the address cannot be saved or used for checkout.

The system validates that both recipient name and phone number are present before allowing the address to be used in an order.

## Seller Rules

Sellers must register with an email and password similar to customers, but their accounts require administrator approval before they can sell products. Seller accounts go through a pending, approved, or rejected status during registration review. Rejected sellers can view the specific reason for rejection and submit a new registration request. Sellers can only delete their accounts if they have no pending orders in paid or shipped status and no pending cancellation or refund requests. When deleted, seller products are removed from listings while order history and shop names in past orders remain preserved for records.

### Seller Registration Approval

Sellers must register with an email and password before they can access the seller features.
A seller account remains in pending status until an administrator approves the registration.
Pending sellers cannot list products, create orders, or access seller dashboard features.
Administrators review all pending seller registration requests and approve or reject them.
Sellers with pending status cannot process orders or receive payments from customers.
The system rejects registration if the email is already registered as another seller or customer.

### Pending Approval Status Viewing

Sellers can view their current registration status at any time from their account dashboard.
The status displays as pending, approved, or rejected.
Pending sellers cannot add products to the platform while awaiting approval.
Approved sellers immediately gain access to all seller features upon status change.

### Rejection Reason Access

When a seller registration is rejected, the system provides the specific reason for rejection.
Rejected sellers can view the administrator's rejection reason in their account dashboard.
The rejection reason is displayed in plain text for clarity.
Sellers cannot appeal rejected applications through the system; they must submit a new registration request.

### New Registration After Rejection

Rejected sellers can submit a new seller registration request after reviewing the rejection reason.
A previously rejected seller cannot immediately register again while the previous request is still pending.
The new registration request resets the approval workflow and is queued for administrator review.
Sellers with approved status cannot submit duplicate registration requests.

### Account Deletion Conditions

Sellers can delete their seller account only if they have no orders in paid status.
Sellers can delete their seller account only if they have no orders in shipped status.
Sellers can delete their seller account only if they have no pending cancellation requests for their products.
Sellers can delete their seller account only if they have no pending refund requests for their products.
If any pending order or request exists, the system prevents account deletion and displays the blocking conditions.
Sellers must resolve all pending orders and requests before account deletion is allowed.

### Order History Preservation

When a seller account is deleted, all order history remains accessible in the platform.
Products sold by deleted sellers remain visible in order history for customers.
The shop name from the deleted seller's profile is preserved in past order records.
Order items retain the product details and seller information as they existed at the time of purchase.
Deleted seller products are removed from search and category listings immediately.

## SellerProfile Rules

Each seller maintains a profile containing shop name, shop description, and a logo image that customers can view. Sellers can edit their shop name, description, and logo image through their seller dashboard. Every edit to the shop profile creates a snapshot that preserves the previous state of the profile information. This snapshot history allows tracking of shop changes over time for dispute resolution and transparency. Customers viewing a product can access the seller's current profile information from the product detail page.

### Shop Name Editing Rules

Sellers can edit their shop name through the seller dashboard.

The shop name must be between 3 and 50 characters long.
If the shop name is shorter than 3 characters, the request is rejected.
If the shop name exceeds 50 characters, the request is rejected.

The shop name must be unique across all sellers on the platform.
If another seller already has the requested shop name, the request is rejected.

The shop name cannot be changed if the seller account is suspended.
A suspended seller must contact an administrator to resolve their account status before updating their shop name.

The shop name is displayed to customers on all product listings and order confirmations.
Sellers can view their current shop name in their profile settings.

If a shop name is changed, the new name is immediately visible to customers in search results and category listings.
Past orders continue to display the shop name that was active at the time of purchase.

### Shop Description Management

Sellers can edit their shop description through the seller dashboard.

The shop description is optional and can be empty.
If a shop description is provided, it must be between 10 and 500 characters long.
If the description is shorter than 10 characters, the request is rejected.
If the description exceeds 500 characters, the request is rejected.

The shop description cannot contain profanity or inappropriate language.
If inappropriate language is detected, the request is rejected and the seller is notified.

The shop description cannot be changed if the seller account is suspended.
A suspended seller must contact an administrator to resolve their account status before updating their shop description.

The shop description is displayed to customers on the seller profile page and product detail pages.
Customers can view the shop description when browsing products or viewing seller information.

If a shop description is changed, the updated description is immediately visible to customers.
Past orders continue to display the shop description snapshot taken at the time of purchase.

### Logo Image Upload Rules

Sellers can upload a logo image for their shop through the seller dashboard.

The logo image must be in one of the following formats: JPEG, PNG, or WebP.
If the image is in an unsupported format, the upload is rejected.

The logo image file size must not exceed 5 megabytes.
If the file exceeds 5 megabytes, the upload is rejected.

Each seller can have only one logo image at a time.
If a seller uploads a new logo, the previous logo is replaced.

The logo image cannot be changed if the seller account is suspended.
A suspended seller must contact an administrator to resolve their account status before updating their logo.

The logo image is displayed to customers on the seller profile page and product detail pages.
Customers can view the shop logo when browsing products or viewing seller information.

If a logo image is removed by the seller, the seller profile shows no logo instead.
Products and orders that already exist retain the logo that was displayed at the time of purchase.

### Profile Snapshot Requirements

Every edit to a seller profile creates a snapshot that preserves the previous state.

When a seller changes their shop name, a snapshot is created showing the old name, new name, and timestamp of the change.
When a seller changes their shop description, a snapshot is created showing the old description, new description, and timestamp of the change.
When a seller changes their logo image, a snapshot is created showing the old logo URL, new logo URL, and timestamp of the change.

All snapshots are immutable and cannot be deleted or modified.
Snapshots are stored indefinitely for dispute resolution purposes.

Snapshots can be viewed by the seller who owns the profile.
Snapshots can be viewed by administrators for oversight and dispute resolution.

Each snapshot records: what field was changed, the previous value, the new value, and when the change occurred.
Snapshots cannot be removed even if the seller deletes their account.

Order items include a snapshot of the seller profile at the time of purchase.
This snapshot preserves the shop name, description, and logo that were active when the customer made their purchase.
Order snapshots cannot be modified after the order is placed.

### Seller Profile Customer Visibility Rules

All customers can view the current seller profile information.
Customers can access seller profiles from the product detail page and from their order history.

On the product detail page, customers can see:
- The current shop name
- The current shop description (if provided)
- The current logo image (if provided)
- A link to view the full seller profile page

Customers can view seller profile information for products they have not purchased.
Customers can view seller profile information for products they have already purchased.

The seller profile is visible to customers even if the seller is suspended.
However, suspended sellers cannot be browsed or purchased from.

When a seller account is banned, the seller profile is no longer accessible to customers.
Past orders in customer order history continue to display the seller profile snapshot from the time of purchase.

If a seller deletes their account, their shop name is shown as 'Deleted Shop' in past orders.
The shop name, description, and logo snapshots are preserved for order history records.

### Shop Information History Tracking

Sellers can view the complete history of changes to their shop profile.

The history shows all previous shop names, with dates and timestamps.
The history shows all previous shop descriptions, with dates and timestamps.
The history shows all previous logo image URLs, with dates and timestamps.

Administrators can view the complete change history of any seller profile on the platform.
Administrators can view change history for dispute resolution and compliance purposes.

Change history is used for resolving disputes between customers and sellers.
Change history is used for investigating policy violations.
Change history is used for auditing seller account activities.

Shop information history is preserved for at least 7 years from the date of each change.
History records cannot be deleted by any user, including administrators.

Customers can view shop information that was active at the time of their purchase.
This information is shown in the order details and includes the snapshot taken when the order was placed.

Shop information snapshots are included in cancellation and refund request records.
This provides a complete audit trail for dispute resolution.

## Category Rules

Products are organized into categories that can have one level of subcategory nesting. Each category requires a name and description to identify the product grouping. Only administrators can create, edit, or delete categories on the platform. Customers can browse all available categories and view products within each category. When a category is deleted, products previously in that category become uncategorized and may no longer appear in searches or listings.

### Category Structure and Nesting

Categories can be organized with one level of subcategory nesting only.
A category can have a parent category, but subcategories cannot have their own children.
The hierarchy must always be: main category → subcategory → no further nesting.
Each category must have a unique name within its parent category.
Every category must have a description that explains the product grouping it represents.
A category without a parent is considered a main category.
A category with a parent is considered a subcategory.
Categories cannot be removed from their parent once created.
Subcategories inherit the parent category's position in the product browsing structure.

### Category Name and Description Requirements

Every category requires a name that uniquely identifies the category within its parent.
Every category requires a description that explains the type of products in that category.
The category name must be provided when creating or editing a category.
The category description must be provided when creating or editing a category.
Both name and description are required fields for all categories.
Category names cannot be empty.
Category descriptions cannot be empty.
A category cannot be created with missing name or description.
Existing categories can have their name or description updated.

### Administrator Category Management

Only administrators can create new categories on the platform.
Only administrators can edit existing categories.
Only administrators can delete categories.
Administrators can assign a parent category when creating a subcategory.
Administrators cannot create a subcategory without specifying a parent main category.
Administrators can edit category names and descriptions.
Administrators can delete categories from the system.
Super administrators have the same category management capabilities as regular administrators.
Regular administrators cannot promote or demote other administrators.
Only super administrators can promote regular administrators to super administrator.

### Customer Category Browsing

All customers can view the complete list of categories on the platform.
Customers can browse categories without logging in to see what categories exist.
Customers can view the products within any category.
Customers can view the products within any subcategory.
Customers can navigate from a main category to its subcategories.
Customers can see the category name and description when browsing.
Customers can see the number of products in each category.
Categories that contain no products are still visible to customers.
Categories cannot be hidden from customer browsing.

### Category Deletion and Product Impact

When a category is deleted, all products previously in that category become uncategorized.
Products that become uncategorized no longer appear in category listings.
Uncategorized products may not appear in search results.
Administrators can reassign deleted category products to other categories.
When a main category is deleted, all its subcategories also become inaccessible.
Products in deleted subcategories are affected by the subcategory deletion.
A deleted category cannot be restored to its previous state.
Product deletion does not affect category structure.
Category deletion is permanent and cannot be undone.
Customers cannot view products in deleted categories.

### Category-Based Product Filtering

Customers can filter search results by selecting a specific category.
Customers can filter search results by selecting a specific subcategory.
Category filtering includes products from the selected category and its subcategories.
Customers can apply category filters together with other filters.
Category filter selection is required when filtering by category.
A selected category filter must have a valid existing category.
Filtering by category only shows products that belong to the selected category.
Products in deleted categories are not included in category filter results.
Category filter results can be combined with price range filters.
Category filter results can be combined with in-stock-only filters.

## Product Rules

Sellers can create products that must include a name, description, category, and base price, all of which are required fields. Each product belongs to the seller who created it and only that seller can edit or delete their products. Every product edit creates a snapshot preserving the previous state of all product fields. Products can only be deleted if there are no pending order items in paid or shipped status and no pending cancellation or refund requests. Deleting a product removes it from search results and category listings but preserves snapshots for records. Deleted products no longer appear in customer searches or category browsings.

### Required Product Fields

Sellers can create products with the following required fields: product name, product description, product category, and base price. All four fields must be provided for product creation to succeed. If the product name is missing, the creation request is rejected. If the product description is missing, the creation request is rejected. If the product category is not selected, the creation request is rejected. If the base price is not provided, the creation request is rejected. The product name cannot be empty or contain only whitespace. The product description cannot be empty or contain only whitespace. The base price must be a positive number greater than zero. A subcategory may be selected instead of a parent category, but the category field must still be populated.

### Product Ownership Rules

Each product belongs exclusively to the seller who created it. Only the owning seller can edit their own products. Only the owning seller can delete their own products. Other sellers cannot edit or delete products they do not own. Administrators can edit or delete any product on the platform regardless of ownership. When a seller edits a product, the system validates that the seller is the owner before applying changes. When a seller deletes a product, the system validates that the seller is the owner before removing it. Products cannot be transferred from one seller to another.

### Product Edit Snapshots

Every time a seller edits any field of their product, a snapshot is automatically created. The snapshot records the time of the change, the seller who made it, and the previous values of all edited fields. All product fields are included in the snapshot: product name, product description, product category, and base price. When a product is edited, the snapshot captures the complete state of the product at that moment. If the product has images, the image configuration at the time of edit is included in the snapshot. If the product has variants, all variant information at the time of edit is included in the snapshot. Product snapshots are immutable and cannot be modified or deleted. Sellers can view the history of all snapshots for their products. Administrators can view snapshots for any product on the platform.

### Product Deletion Conditions

A product can only be deleted by its owner if there are no pending order items for any variant of that product. An order item is considered pending if its status is paid or shipped. If any variant of the product has order items in paid or shipped status, the deletion request is rejected. A product can only be deleted if there are no pending cancellation requests for any variant of that product. A product can only be deleted if there are no pending refund requests for any variant of that product. If a pending cancellation request exists for any variant, the deletion request is rejected. If a pending refund request exists for any variant, the deletion request is rejected. Sellers can view which variants have pending orders or requests that prevent deletion. Administrators can delete products regardless of pending orders or requests. When an administrator deletes a product, they may provide a policy violation reason for the deletion.

### Product Removal from Listings

When a product is deleted, it is immediately removed from all search results. When a product is deleted, it is removed from all category listings. When a product is deleted, it is removed from all search filtering results. Deleted products no longer appear in new searches by customers. Deleted products no longer appear in category browsings by customers. Deleted products no longer appear in product recommendation displays. The product page for a deleted product returns an unavailable status. Deleted products cannot be added to shopping carts. Deleted products cannot be added to wishlists. Product deletion does not affect existing order items, which retain snapshots of the product data.

### Product Snapshot Preservation

All product snapshots are preserved even after the product is deleted. Snapshot records contain the complete product state at the time of each edit. Snapshots of deleted products remain accessible to the product owner. Snapshots of deleted products remain accessible to administrators. Snapshots cannot be deleted by any user, including the product owner or administrators. Product snapshots serve as immutable records for dispute resolution. Product snapshots can be viewed by the product owner for their own products. Product snapshots can be viewed by administrators for any product. Snapshots preserve the product name, product description, product category, and base price at the time of each edit.

### Unavailable Product Display

Products with no variants are visible in search results but shown as unavailable for purchase. Products with no variants cannot be added to shopping carts. Products with no variants display a message indicating they are unavailable. A product must have at least one variant to be purchasable. Variants with zero stock quantity are shown as out of stock. Out of stock variants cannot be added to shopping carts. Out of stock variants display a message indicating insufficient stock. A product with some variants in stock and others out of stock shows the stock status per variant. Out of stock variants are excluded from search results when the in-stock-only filter is applied. Unavailable products continue to appear in category listings for browsing purposes.

## ProductVariant Rules

Products can have multiple variants representing different option combinations like color or size. Each variant requires a unique SKU code, option values, and stock quantity, with price being optional to override the base price. A product must have at least one variant to be purchasable by customers. Sellers can edit variant SKU codes, option values, and prices, with each edit creating a snapshot. Variants can only be deleted if there are no pending order items in paid or shipped status for that specific variant and no pending cancellation or refund requests. Variants with zero stock are shown as out of stock and cannot be added to the shopping cart.

### Variant SKU Code Uniqueness

Each product variant requires a unique SKU code within the product to identify specific option combinations.

The SKU code must be unique across all variants of the same product.

Sellers cannot assign the same SKU code to multiple variants within a product.

When creating a variant, the system validates that the SKU code is available for that product.

If a seller attempts to create a variant with an existing SKU code for that product, the variant creation is rejected.

The system displays an error message indicating that the SKU code is already in use.

Sellers can view their current SKU codes to ensure uniqueness before creating variants.

### Option Value Combinations

Each product variant represents a specific combination of product options such as color, size, or material.

Option values must be meaningful combinations that customers can understand (e.g., "Red / Large", "Blue / Small").

The system allows sellers to define multiple options for each product variant.

Each option has a name (such as "Color" or "Size") and a value (such as "Red" or "Large").

Option combinations are stored as structured data that can be displayed to customers.

The same option value combination cannot be duplicated within a single product.

If a seller attempts to create a variant with duplicate option values, the system rejects the variant creation.

Sellers can view all option combinations for their products to ensure clarity and avoid confusion.

### Variant Price Override

Each product variant has an optional price that can override the product's base price.

If a variant does not specify a custom price, the product's base price is used.

Sellers can set a different price for specific variants to reflect different value propositions (e.g., premium colors cost more).

The variant price is stored independently from the base price.

When viewing product details, customers see the actual price of each selected variant.

Sellers can update variant prices at any time, subject to deletion conditions.

Price changes are reflected immediately in the product listing and detail pages.

### Variant Stock Quantity Requirements

Each product variant requires a stock quantity that represents available inventory.

The stock quantity must be a non-negative integer (zero or greater).

Sellers cannot create a variant without specifying a stock quantity.

The system initializes new variants with the stock quantity specified by the seller.

Variants with stock quantity greater than zero can be added to the shopping cart.

Variants with stock quantity of zero are shown as out of stock and cannot be purchased.

Stock quantity is managed through inventory records that track all changes over time.

The current available stock is calculated by summing all inventory record changes for the variant.

### Product Must Have At Least One Variant

Every product must have at least one variant to be purchasable by customers.

Products without any variants are visible in search and category listings but are marked as unavailable for purchase.

The system prevents the deletion of a product if it would result in zero variants remaining.

Sellers cannot mark a product as purchasable without creating at least one variant.

When viewing a product without variants, customers see a message indicating that the product is unavailable.

Sellers are notified if they attempt to create a product without variants and are guided to add variants before publishing.

### Variant Deletion Conditions

Sellers can delete their own product variants only if certain conditions are met.

A variant cannot be deleted if it has any pending order items with paid or shipped status.

A variant cannot be deleted if it has any pending cancellation requests.

A variant cannot be deleted if it has any pending refund requests.

The system validates these conditions before allowing variant deletion.

If any condition is not met, the deletion request is rejected with an explanation.

Sellers can view which variants have pending orders or requests before attempting deletion.

Pending order items, cancellation requests, and refund requests must be resolved before the variant can be deleted.

### Out of Stock Variant Restrictions

Variants with stock quantity of zero are automatically shown as out of stock.

Out of stock variants cannot be added to the shopping cart by customers.

The system prevents adding variants to cart when the requested quantity exceeds available stock.

If a customer attempts to add an out of stock variant, the system displays a warning message.

Variants with stock quantity less than the requested cart quantity also trigger a warning.

Out of stock variants remain visible in product listings but are clearly marked as unavailable.

Once stock is replenished, the variant becomes available for purchase immediately.

Stock levels are checked in real-time when customers attempt to add variants to cart.

### Variant Edit Snapshot Creation

Every modification to a product variant creates a snapshot to preserve the previous state.

Snapshots include all edited fields: SKU code, option values, price, and stock quantity.

The snapshot records the timestamp of the change and the values before and after modification.

Sellers can view the snapshot history of their own variants for auditing purposes.

Administrators can view snapshots of any variant across the platform.

Snapshots are immutable and cannot be deleted or modified.

Snapshot creation occurs immediately upon saving variant changes.

Customers cannot view variant edit snapshots; snapshots are available only to owners and administrators.

## ProductImage Rules

Sellers can upload multiple images for each product they create. Images can be reordered by sellers with the first image serving as the main or thumbnail image for listings. Sellers can delete images from their products when they no longer wish to display them. All image changes including additions, deletions, and reordering are included in product snapshots. This ensures that the visual presentation of a product is preserved in its historical state for dispute resolution.

### Multiple Product Images

Sellers can upload multiple images for each product they create. There is no limit to the number of images that can be uploaded for a single product. Each image is stored with the product and is accessible to customers viewing the product detail page. All images uploaded for a product are considered equal until reordering is performed.

### Image Reordering

Sellers can reorder the sequence of images for their products. The order of images determines which image appears first in product listings and the product detail page. Sellers can change the display order of images at any time before the product is published or while it is listed. Reordering affects the visual presentation of the product to customers but does not affect the product content, price, or variant information.

### Main Thumbnail Image Selection

The first image in the image sequence serves as the main image for the product. This main image is displayed as the thumbnail in product listings, category pages, and search results. The main image provides customers with the primary visual representation of the product before they click to view the full product detail page. Sellers control which image serves as the main image through the reordering functionality.

### Image Deletion

Sellers can delete images from their products when they no longer wish to display them. Deleted images are permanently removed from the product and are no longer visible to customers. When an image is deleted, the remaining images maintain their relative order, with the next image becoming the new first image if the deleted image was the main image. Deletion does not affect the product itself, only the visual assets associated with it.

### Snapshot and Change Tracking

All image changes are included in product snapshots, including additions, deletions, and reordering operations. When a product snapshot is created, it captures the complete state of all images for that product at that moment in time. This includes the image URLs, their display order, and which image is designated as the main image. Snapshots of product images are preserved even if the product is deleted. This ensures that the visual presentation of a product can be reviewed for dispute resolution and that historical product listings can be accurately represented.

## InventoryRecord Rules

Each product variant tracks its stock quantity through a history of inventory records. Every inventory record must include a quantity change value, reason for the change, and timestamp. Stock quantity is calculated by summing all inventory records for a variant. Sellers can add inventory through restocking or subtract inventory through adjustments or recording losses, each requiring a reason. When customers place orders, inventory records are automatically created with negative quantities. Order cancellations and refunds automatically create positive inventory records to restore stock. When stock reaches zero, variants are marked as out of stock and cannot be added to carts.

### Inventory Quantity Tracking

Each product variant maintains its current stock quantity by tracking a history of inventory records.

The current stock quantity is calculated as the sum of all quantity changes across all inventory records for that variant. Positive values increase stock, negative values decrease stock.

The system calculates current stock by summing all inventory records in real time; there is no separate stock quantity field stored independently.

### Inventory Record Creation Requirements

Every inventory record must include the following information:

- Quantity change: A positive or negative integer value indicating how much stock increased or decreased
- Reason: A text description explaining why the quantity changed (e.g., "restock", "order placed", "adjustment", "damage loss")
- Timestamp: The exact date and time when the inventory change occurred

All inventory records are immutable once created and cannot be modified or deleted.

### Positive Restock Records

Sellers can add inventory to a product variant through restocking.

When a seller restocks a variant, the system creates an inventory record with a positive quantity change value.

Every restock operation requires a reason explaining the restock (e.g., "warehouse replenishment", "returned items processed", "new shipment received").

Restocking increases the current stock quantity for that variant, allowing customers to purchase it again if it was previously out of stock.

### Negative Order Records

When a customer successfully places an order for a variant, the system automatically creates negative inventory records for each variant in the order.

The quantity change equals the negative of the quantity purchased in the order item.

This automatic negative inventory record is created at the same time as order creation, immediately after payment is confirmed.

The negative inventory record ensures stock quantities reflect actual available inventory after orders are placed.

### Inventory Adjustment with Reason

Sellers can manually adjust inventory quantities to account for situations such as damaged goods, loss, theft, or other discrepancies.

When a seller subtracts inventory through adjustment, the system creates an inventory record with a negative quantity change.

Every inventory adjustment requires a reason explaining the adjustment (e.g., "damaged during storage", "inventory discrepancy", "damaged returns processed", "lost in warehouse").

Adjustments are only available for seller accounts and require a valid reason to be recorded.

### Automatic Inventory on Orders

Inventory records are automatically created when orders are placed successfully.

For each variant in the order, a negative inventory record is created with quantity equal to the negative of the purchased quantity.

This automatic inventory adjustment occurs at the moment the order is created and payment is confirmed.

The automatic inventory deduction ensures customers see accurate stock levels immediately after placing an order.

### Out of Stock Blocking Cart Additions

When a variant's stock quantity reaches zero, the variant is marked as "out of stock".

Customers cannot add out-of-stock variants to their shopping cart.

If a customer attempts to add an out-of-stock variant to the cart, the request is rejected.

Variants that are out of stock remain visible in product listings but are marked as unavailable and cannot be selected during checkout.

### Inventory History Viewing

Sellers can view the complete inventory history for each of their product variants.

The inventory history displays all inventory records for a variant, including quantity change values, reasons, and timestamps.

The history shows the chronological sequence of all stock changes since the variant was created.

Administrators can also view inventory history for all variants on the platform for oversight purposes.

### Inventory Restore on Cancellation

When a cancellation request is approved for an order item, the system automatically creates a positive inventory record for that variant.

The quantity change equals the quantity of the cancelled item, effectively restoring the stock.

This automatic inventory restoration occurs at the moment the cancellation is approved by the seller.

The restored stock becomes available for customers to purchase again.

### Inventory Restore on Refund

When a refund request is approved for an order item, the system automatically creates a positive inventory record for that variant.

The quantity change equals the quantity of the refunded item, restoring the stock to available inventory.

This automatic inventory restoration occurs at the moment the refund is approved by the seller.

Refunded items restore stock regardless of the item's condition; customers return items but the system treats them as available inventory.

## Order Rules

Orders contain one or more order items and are created when payment succeeds after checkout. Each order item represents a purchased variant with its own individual status separate from the overall order. The overall order status is derived from all its items, meaning mixed item statuses result in partially completed order status. If all items are paid, the order status becomes paid. If any item is shipped but none delivered, the order is marked as shipped. When all items are delivered, the order reaches delivered status. If all items are cancelled or refunded, the order reaches those respective statuses.

### Order Status Derivation from Items

The overall status of an order is derived from the statuses of all order items within that order. The system evaluates each item's status to determine the order's current state.

If all order items in an order have the status paid, the order status is set to paid.

If any order item in an order has the status shipped but no items have the status delivered, the order status is set to shipped.

If all order items in an order have the status delivered, the order status is set to delivered.

If all order items in an order have the status cancelled, the order status is set to cancelled.

If all order items in an order have the status refunded, the order status is set to refunded.

### Individual Order Item Statuses

Each order item has its own independent status that is separate from the overall order status. The status of one item does not directly change the status of other items in the same order, except when calculating the overall order status.

The possible statuses for an order item are: paid, shipped, delivered, cancelled, and refunded.

An order item starts with the status paid after successful payment processing.

An order item transitions to shipped when the seller creates a shipment containing that item and provides tracking information.

An order item transitions to delivered when the customer confirms delivery of the shipment, or automatically after 14 days from the shipping date.

An order item transitions to cancelled when a cancellation request is approved by the seller for an item with status paid.

An order item transitions to refunded when a refund request is approved by the seller for an item with status delivered.

### Partially Completed Order States

When an order contains items with mixed statuses, the order is considered partially completed.

An order is marked as partially completed when it contains items in different states, such as some items delivered and some refunded, or some items shipped and some cancelled.

The system evaluates the status of all items in the order to determine if the order is partially completed.

Partially completed orders continue to exist in the system with their mixed status states.

Customers can view the status of individual items within a partially completed order.

Customers can view the order history with all items listed separately with their respective statuses.

Shipment tracking and delivery confirmation continue to apply to individual shipments within the order, regardless of other items' statuses.

### Order Status Progression Rules

An order item with status paid cannot be cancelled after it transitions to shipped status. Cancellation requests are only accepted for items with status paid.

An order item with status shipped can be cancelled only if the cancellation request is submitted before the item is delivered.

An order item with status delivered can be refunded, but only if the refund request is submitted within 7 days from the delivery date.

An order item with status cancelled or refunded cannot be cancelled or refunded again.

An order item that transitions to delivered automatically changes after 14 days from shipping if the customer has not manually confirmed delivery.

When a shipment is created containing multiple items, all items in that shipment transition to shipped status simultaneously.

### All Items Cancelled or Refunded Orders

When all order items in an order have been cancelled, the entire order status is set to cancelled.

When a cancellation request for an item is approved, that item is cancelled and the stock quantity is restored for that item's variant.

When all order items in an order have been refunded, the entire order status is set to refunded.

When a refund request for an item is approved, that item is refunded and the stock quantity is restored for that item's variant.

The cancellation or refund of individual items does not affect the processing of remaining items in the same order, unless all items are cancelled or refunded.

Once an order status becomes cancelled or refunded, no further cancellation or refund requests can be submitted for that order.

## OrderItem Rules

Each order item represents a purchased product variant with a quantity purchased and its own status. Order items can be individually cancelled or refunded, separate from other items in the same order. Items from different sellers can appear in the same customer order but are processed separately by each seller. The item status can be paid, shipped, delivered, cancelled, or refunded depending on the order progression. Cancellation can only be requested for items with paid status before they are shipped. Refunds can only be requested for items with delivered status within 7 days of delivery confirmation.

### Individual Item Cancellation

Customers can request cancellation for individual order items with status "paid" (not yet shipped).

A cancellation request must include a reason (text field) explaining why the customer wants to cancel.

Only the customer who placed the order can request cancellation for that order's items.

The seller of the specific item must approve or reject the cancellation request.

When the seller responds to the cancellation request, a snapshot of the request state is created (recording when the seller approved or rejected).

If the cancellation is approved:
- The item status changes to "cancelled"
- The stock quantities for the variant are restored via inventory record
- The refund is processed for that item only
- The remaining items in the order continue processing normally

If the cancellation is rejected:
- The item remains in "paid" status
- The order continues processing normally for that item

The customer can view the status of their cancellation requests (pending, approved, rejected).

If all items in an order are cancelled, the entire order status becomes "cancelled".

Cancellation cannot be requested for items with status other than "paid" (already shipped, delivered, cancelled, or refunded items cannot be cancelled).

The seller can cancel an item directly if the customer cancels via their dashboard.

### Individual Item Refund

Customers can request a refund for individual order items with status "delivered".

A refund request must include a reason (text field) explaining why the customer wants a refund.

Refunds are processed on a per-item basis, not per entire order.

Only items with status "delivered" are eligible for refund requests.

Refunds can only be requested within 7 days from the date that item's delivery confirmation date.

If more than 7 days have passed since delivery, the refund request is rejected.

The seller of the specific item must approve or reject the refund request.

When the seller responds to the refund request, a snapshot of the request state is created (recording when the seller approved or rejected).

If the refund is approved:
- The item status changes to "refunded"
- The stock quantities for the variant are restored via inventory record
- The refund is processed for that item only
- The remaining items in the order are unaffected

If the refund is rejected:
- The item remains in "delivered" status
- The order continues normally for that item

The customer can view the status of their refund requests (pending, approved, rejected).

If all items in an order are refunded, the entire order status becomes "refunded".

Refund cannot be requested for items with status other than "delivered" (paid, shipped, cancelled items are not eligible for refund requests).

### Seller-Specific Item Processing

Each order item is associated with a specific seller based on which seller created the product.

Sellers can only view and process order items for products they created.

Sellers cannot view or modify order items for products created by other sellers, even if those items are in the same customer order.

When a customer places an order containing items from multiple sellers, each seller receives notification only for their own items.

Each seller manages their items independently:
- A seller can ship their items while other sellers' items in the same order remain in "paid" status
- A seller can approve cancellation for their items while other sellers' items continue normally
- A seller can approve refund for their items while other sellers' items continue normally

Shipment is created separately for each seller:
- Each shipment contains only items from that seller
- Different sellers always have different shipments (never mixed in one shipment)
- Each seller manages their own shipments independently

Order status is derived from all items in the order, regardless of which seller created them:
- The overall order status may reflect mixed states from different sellers' items
- This allows one seller to ship while another seller's items are still processing

### Item Status Progression

Each order item has its own status independent of other items in the same order.

Item statuses are: "paid", "shipped", "delivered", "cancelled", "refunded".

**Default Status**:
- When an order is placed successfully, all items are created with status "paid"

**Status Transitions**:

1. **Paid to Shipped**:
   - When the seller creates a shipment and adds the item to it, the item status changes to "shipped"
   - The item can only transition from "paid" to "shipped" (no backward transition)
   - The seller must provide tracking information (carrier name, tracking number) when creating the shipment

2. **Shipped to Delivered**:
   - The customer can confirm delivery for the shipment containing the item
   - When the customer confirms delivery, the item status changes to "delivered"
   - If the customer does not confirm, the item automatically changes to "delivered" after 14 days from the shipment's shipping date
   - Once delivered, the item cannot change back to shipped or paid

3. **Paid to Cancelled**:
   - Customer can request cancellation for paid items
   - Seller must approve the cancellation
   - Once cancelled, the item cannot change back to paid

4. **Delivered to Refunded**:
   - Customer can request refund for delivered items (within 7 days of delivery)
   - Seller must approve the refund
   - Once refunded, the item cannot change back to delivered

5. **Status Rejection**:
   - If a customer requests cancellation for an item that is not "paid", the request is rejected
   - If a customer requests refund for an item that is not "delivered", the request is rejected
   - If a customer requests refund after the 7-day window has expired, the request is rejected

### Mixed Order Item Statuses

Orders can contain items with different statuses (mixed states).

**Mixed State Examples**:
- Some items: delivered, other items: shipped
- Some items: cancelled, other items: paid
- Some items: refunded, other items: delivered

**Order Status Determination for Mixed States**:

When order items have mixed statuses, the overall order status is determined as follows:
- If all items are paid → order status is "paid"
- If any item is shipped (and none delivered yet) → order status is "shipped"
- If all items are delivered → order status is "delivered"
- If all items are cancelled → order status is "cancelled"
- If all items are refunded → order status is "refunded"
- If items have mixed states (not all same) → order status is "partially completed"

**Example Scenarios**:

1. An order has 5 items:
   - 3 items are delivered
   - 2 items are shipped
   - Order status: "shipped" (because any item shipped and none delivered)

2. An order has 4 items:
   - 2 items are delivered
   - 2 items are cancelled
   - Order status: "partially completed" (mixed states)

3. An order has 6 items:
   - 4 items are refunded
   - 2 items are delivered
   - Order status: "partially completed" (mixed states)

Customers can view the status of each individual item in their order list.

Each item's status is shown separately in the order details.

The overall order status provides a summary but does not hide individual item statuses.

Cancellation or refund of individual items does not affect the status of other items in the same order.

### Paid to Shipped Transition

The transition from "paid" to "shipped" status is triggered when the seller creates a shipment.

Sellers can view order items for their products that have status "paid" and need shipping.

When creating a shipment, the seller can:
- Select one or more of their paid items to include in the shipment
- Enter tracking information (carrier name, tracking number)
- Create the shipment

**Shipment Behavior**:
- All items in the same shipment share the same tracking information
- When the shipment is created, all items in it change to status "shipped" immediately
- Items from different sellers cannot be in the same shipment

**Shipment Options**:
- Sellers can ship items individually (one item per shipment)
- Sellers can bundle multiple items into one shipment (multiple items, one tracking number)
- The seller chooses how to bundle items based on inventory and logistics

**Transition Rules**:
- Items can only transition from "paid" to "shipped" once (no re-shipping)
- Once shipped, the item cannot return to "paid" status
- The tracking information remains associated with the shipment and all items in it
- Customers can view tracking information for each shipment in their order

If a shipment is cancelled or voided by the seller (before any item is marked as shipped), the item status returns to "paid".

The item cannot be cancelled by the customer once it has status "shipped" (must wait for delivery and then request refund).

## Shipment Rules

A shipment is a package sent by a seller and can contain one or more order items from that same seller. Different sellers always create separate shipments even when selling in the same customer order. Sellers can choose to ship items individually or bundle multiple items into one shipment. All items in the same shipment share the same tracking information including carrier name and tracking number. When a shipment is created, all included items change to shipped status. Customers confirm delivery per shipment, and when confirmed, all items in that shipment become delivered. If no confirmation is given, items automatically become delivered after 14 days from shipping.

### Seller-Specific Shipment Separation

Each shipment contains order items from exactly one seller. When a customer order includes products from multiple sellers, each seller creates their own separate shipment for their items. Different sellers cannot share tracking information or combine items from different sellers into a single shipment. Sellers can only ship their own order items that belong to their products.

### Shipment Bundling Options

Sellers can choose to ship individual items separately or bundle multiple items together into one shipment. A single shipment can contain multiple order items from the same seller. The seller decides whether to ship all their items for a customer order together or in multiple separate shipments. Each shipment is independent and has its own tracking information.

### Shared Tracking Information Within Shipment

All order items included in the same shipment share the same tracking information. When a seller creates a shipment, they enter a carrier name and tracking number that applies to all items in that shipment. Customers can view the same tracking number for all items within a single shipment. Each item in the shipment inherits the shipment's tracking carrier and tracking number.

### Shipment Status to Shipped Transition

When a shipment is created, all order items included in that shipment change to shipped status immediately. The shipped status applies to every item in the shipment at the same time. Items cannot have different statuses if they are in the same shipment. Once shipped, items cannot be cancelled by customers or sellers.

### Delivery Confirmation Per Shipment

Customers confirm delivery per shipment, not per individual item. When a customer confirms delivery for a shipment, all order items in that shipment change to delivered status. A single confirmation action applies to all items in the shipment. Customers cannot confirm delivery for some items in a shipment while leaving others unconfirmed.

### Automatic Delivery After Fourteen Days

If a customer does not explicitly confirm delivery, order items automatically change to delivered status after fourteen days from the shipment date. The fourteen-day period starts when the shipment is created and marked as shipped. Items cannot be cancelled or refunded after the automatic delivery date. The automatic delivery occurs without any customer action required.

### Tracking Information Requirements

Sellers must provide both a carrier name and a tracking number when creating a shipment. A shipment cannot be created without complete tracking information. The carrier name must be provided as text, and the tracking number must be a non-empty string. If either the carrier name or tracking number is missing, the shipment creation request is rejected.

## WishlistItem Rules

Customers can add products to their wishlist to save items for later consideration. The wishlist operates at the product level rather than the variant level, meaning specific variants are not saved. Customers can view their wishlist with paginated results and remove products when they no longer want them. If a seller deletes a product from the platform, it is automatically removed from all customer wishlists. The wishlist is specific to each customer and cannot be shared across users. Customers manage their own wishlist items without seller or administrator intervention.

### Wishlist Item Addition

Customers can add products to their wishlist to save items for later purchase consideration. The wishlist operates at the product level, meaning only the product itself is saved, not any specific variant selection. When a customer adds a product to their wishlist, the system records which customer owns the wishlist item and which product is being saved. Customers can only add products that are currently available on the platform. Once added, the product appears in the customer's personal wishlist.

### Variant Information Not Saved

Wishlist items store product references only, without any variant-specific information. Customers do not select or save specific variants when adding a product to their wishlist. The wishlist does not record option values, SKU codes, or variant pricing. When viewing a wishlist item, customers see the product's base information but cannot determine which variant they originally intended to purchase. This product-level storage allows the wishlist to remain valid even when variants change or become unavailable.

### Wishlist Pagination

When customers view their wishlist, results are displayed in paginated format to manage large collections efficiently. The system shows a limited number of wishlist items per page, with navigation controls to access additional pages. Each page displays product information including the main image thumbnail, product name, base price, and seller shop name. Customers can navigate through their wishlist using page controls.

### Manual Wishlist Item Removal

Customers can remove products from their wishlist at any time when they no longer wish to save the item. When a customer removes a product from their wishlist, the wishlist item is permanently deleted from their list. The product itself remains available on the platform and can still be purchased. The customer can add the product back to their wishlist later if they change their mind.

### Automatic Removal on Product Deletion

If a seller deletes a product from the platform, that product is automatically removed from all customer wishlists that contain it. This automatic removal ensures that deleted products do not appear in wishlists as unavailable items. When a product is deleted, the system identifies all wishlist items referencing that product and removes them. Customers browsing their wishlists will no longer see products that have been deleted by sellers.

### Customer-Specific Ownership

Each customer's wishlist is private and specific to that individual customer only. Wishlist items are not shared across customers and cannot be viewed by other users. Customers can only view and manage their own wishlist items. Sellers cannot access customer wishlists, and administrators do not have access to individual customer wishlist contents. The wishlist is a personal customer feature that remains separate from public product listings.

## Review Rules

Customers can write reviews for products they have purchased only after the item status is delivered. Each customer can write one review per product per order. Reviews require a rating between one and five stars, while text content is optional. Reviews are displayed on product detail pages sorted by newest first. Customers can edit their own reviews at any time, with every edit creating a snapshot of the previous state. Customers can delete their own reviews while snapshots are preserved for dispute resolution. Product average ratings are calculated from all non-deleted reviews on the product.

### Review Eligibility After Delivery

Customers can write a review for a product only after the order item containing that product has status "delivered". An order item reaches delivered status when either the customer confirms delivery for the shipment, or fourteen days have elapsed since the shipment was created without customer confirmation. Before the item status is delivered, review submission is rejected.

### One Review Per Product Per Order

Each customer may write exactly one review per product per order. If a customer purchases the same product multiple times across different orders, they may write a separate review for each order. Attempting to write a second review for the same product in the same order is rejected. The system validates that no existing review from the customer for that product in that order is already active.

### Star Rating Validation

Every review must include a rating between one and five stars, inclusive. Ratings outside this range are rejected. Text content is optional; reviews may be submitted with only a rating and no text. The rating must be an integer value from one to five; decimal values such as 3.5 or 4.7 are not accepted.

### Review Edit Snapshot

Customers may edit their own reviews at any time. Each edit creates an immutable snapshot recording the previous rating and text content, the timestamp of the change, and the new values. The snapshot is preserved even after the review is deleted. When a review is edited, the new content replaces the existing content for display purposes.

### Review Deletion with Snapshot

Customers may delete their own reviews. When deleted, the review is no longer displayed on the product page or included in average rating calculations. However, a snapshot of the deleted review is preserved, including the rating, text content, deletion timestamp, and previous edit history. Only the owner or an administrator may delete a review.

### Average Rating Calculation

A product's average rating is calculated from all non-deleted reviews for that product. Deleted reviews are excluded from the calculation. The average is computed by summing all star ratings and dividing by the count of non-deleted reviews. If a product has no non-deleted reviews, no average rating is displayed.

### Newest Review Sorting

Reviews displayed on product detail pages are sorted by newest first, ordered by the creation timestamp. The newest review appears at the top of the list. This ordering applies to all views: product detail page, seller dashboard, and administrator oversight pages. Pagination may apply when displaying large numbers of reviews.

## Snapshot Rules

Snapshots are created whenever editable data is modified to preserve the previous state for records and dispute resolution. Snapshots record when a change was made, what was changed, and the values before and after the modification. Snapshots are immutable and cannot be deleted once created by the system. Snapshots are visible to relevant parties including owners and administrators for transparency and dispute resolution. Snapshots are created for product edits, variant edits, seller profile changes, order items, reviews, and cancellation and refund requests. Product snapshots include all product fields and snapshots of all variants at the time of change. Even after products are deleted, their snapshots are preserved for historical reference.

### Snapshot Creation on Edits

A snapshot is automatically created whenever a seller edits their product information, including the product name, description, category selection, or base price.

A snapshot is automatically created whenever a seller edits a product variant, including the SKU code, option values, price override, or stock quantity.

A snapshot is automatically created whenever a seller edits their shop profile, including the shop name, shop description, or logo image.

A snapshot is automatically created whenever a customer edits their review, including the star rating or text content.

A snapshot is automatically created whenever a seller responds to a cancellation request, including the approval or rejection decision.

A snapshot is automatically created whenever a seller responds to a refund request, including the approval or rejection decision.

The snapshot records the timestamp when the change was made, the type of change (created, updated, or deleted), and both the previous values and the new values.

The snapshot records which user made the change, allowing traceability for dispute resolution.

A snapshot is created even when the edit results in no actual value change, ensuring complete audit of all edit attempts.

For product edits, the snapshot includes the complete state of all variants at the time of the edit, not just the main product fields.

For variant edits, the snapshot captures the complete variant state including SKU code, option values, price, and stock quantity at that moment.

The snapshot creation is automatic and cannot be skipped or delayed by any user action.

### Snapshot Immutability and Protection

Once a snapshot is created by the system, it cannot be modified in any way by any user or administrator.

A snapshot cannot be deleted by the original owner who created the edit.

A snapshot cannot be deleted by the seller who owns the product or profile.

A snapshot cannot be deleted by any administrator, including super administrators.

A snapshot cannot be deleted by any other user or actor in the system.

The only exception to snapshot immutability is the system itself, which can remove snapshots during data restoration procedures with super administrator approval.

Deleted products and deleted variants are preserved in snapshot form but are not accessible through normal user operations.

A snapshot becomes a permanent record in the system that persists even after the associated data is deleted.

The immutability of snapshots is enforced at the system level and cannot be overridden by any business rule or user permission.

When a snapshot is retrieved for display, it shows the values exactly as they were at the time of the change, with no modifications to historical data.

The snapshot system treats all snapshots as audit records that must be preserved according to legal and business requirements.

Any attempt to modify a snapshot through the user interface or any other means will be rejected by the system.

### Snapshot Visibility for Owners

A seller can view snapshots of their own products in the seller dashboard.

A seller can view snapshots of their own product variants in the variant management interface.

A seller can view snapshots of their own shop profile changes in the shop management interface.

A seller can view snapshots of their own reviews in the review management interface.

An owner can view the reason text from the snapshot of why a cancellation or refund request was approved or rejected.

An owner can view the complete change history for their products by reviewing all snapshots chronologically.

An owner can compare their current product data with historical snapshot data to see what changed over time.

An owner cannot view snapshots of products or reviews owned by other sellers or customers.

An owner can view the timestamp of when each snapshot was created to understand the timing of changes.

An owner can view both the old values and new values in each snapshot to understand exactly what was modified.

An owner can access snapshots for dispute resolution purposes, such as proving what was sold to a customer.

An owner can view snapshots in read-only mode and cannot edit or restore from snapshots through the user interface.

An owner's access to their own snapshots is available only while their account remains active and not banned.

### Snapshot Visibility for Administrators

An administrator can view snapshots of any product on the platform, regardless of which seller owns it.

An administrator can view snapshots of any seller's shop profile, regardless of which seller owns it.

An administrator can view snapshots of any product variant, including those from any seller.

An administrator can view snapshots of any review on the platform, regardless of which customer wrote it.

A super administrator can view snapshots for all entities including orders and shipments in addition to standard administrator access.

An administrator can view snapshots for dispute resolution investigations involving any seller or customer.

An administrator can view snapshots for fraud investigations involving any user in the system.

An administrator cannot edit or delete snapshots they view in the investigation interface.

An administrator can export snapshot data for compliance and legal purposes through the administrator interface.

An administrator can search snapshots by entity type, entity ID, date range, or change type for investigation purposes.

An administrator can view the complete change history of any product by viewing all associated snapshots.

An administrator can view snapshots even after the associated entity has been deleted by any user.

An administrator's access to all snapshots is available only while their administrator status remains active and not revoked.

### Product Snapshot Structure

A product snapshot includes the product name as it existed at the time of the edit.

A product snapshot includes the product description as it existed at the time of the edit.

A product snapshot includes the category selection and subcategory as it existed at the time of the edit.

A product snapshot includes the base price as it existed at the time of the edit.

A product snapshot includes all product images with their URLs and display order as they existed at the time of the edit.

A product snapshot includes the main image that was displayed as the thumbnail at the time of the edit.

A product snapshot includes nested snapshots of all variants that were associated with the product at the time of the edit.

Each nested variant snapshot includes the SKU code, option values, price override, and stock quantity at that moment.

A product snapshot does not include current live product data, only the historical state at change time.

A product snapshot does not include the product ID, only the product name and seller identifier.

A product snapshot is created when a seller adds variants to an existing product, capturing the variant snapshot structure.

A product snapshot is created when a seller reorders product images, capturing the new image display order.

A product snapshot captures the seller shop name at the time of the product edit, preserving the shop identity for that product version.

A complete product snapshot can be used to reconstruct exactly what the product looked like to customers at any point in history.

### Variant Snapshot Structure

A variant snapshot includes the SKU code as it existed at the time of the edit.

A variant snapshot includes all option values associated with the variant, such as color, size, or other selected options.

A variant snapshot includes the price as it existed at the time of the edit, including any override from the base price.

A variant snapshot includes the stock quantity as it existed at the time of the edit.

A variant snapshot includes the product ID to which the variant belongs, allowing variant identification within the product context.

A variant snapshot does not include inventory records, only the snapshot of the variant itself at change time.

A variant snapshot is created when a seller modifies the SKU code to preserve the old SKU value for record-keeping.

A variant snapshot is created when a seller changes the option values, capturing the old option combination.

A variant snapshot is created when a seller changes the price override, capturing the old price value.

A variant snapshot is created when a seller changes the stock quantity through inventory adjustment, capturing the old stock value.

A variant snapshot includes the timestamp when the variant change occurred for chronological tracking.

A variant snapshot includes the seller identifier to identify which seller owns the variant at the time of change.

A complete variant snapshot can be used to reconstruct exactly what that specific product variant looked like at any point in history.

A variant snapshot is preserved in the product snapshot even when the product is deleted, allowing variant reconstruction for orders.

### Snapshot Preservation After Deletion

When a seller deletes a product, all snapshots of that product are preserved in the system indefinitely.

When a seller deletes a product, snapshots of all variants of that product are preserved even after the variants are deleted.

When a seller deletes a product, the product no longer appears in search results, category listings, or product detail pages.

When a seller deletes a product, snapshots of that product remain accessible to administrators for oversight purposes.

When a seller deletes a product, snapshots of that product remain accessible to customers who had that product in their wishlist.

When a seller deletes a product, snapshots of that product remain accessible for order item reconstruction in existing customer orders.

When a customer deletes their review, the review snapshot is preserved even though the review is no longer visible on the product detail page.

When a customer deletes their review, the review snapshot remains accessible to the customer who wrote it for personal records.

When a customer deletes their review, the review snapshot remains accessible to administrators for investigation purposes.

When a product is deleted, the snapshot preserves the product name so it can be shown in order history even though the product is gone.

When a product is deleted, the snapshot preserves the seller shop name so it can be shown in order history.

When a product is deleted, the snapshot preserves the product price and variant prices so order totals can be recalculated correctly.

Deleted products and their snapshots cannot be restored or undeleted through any user interface or administrator operation.

Deleted products and their snapshots are kept for legal compliance and dispute resolution requirements.

### Snapshot Usage in Dispute Resolution

Snapshots are primarily used for dispute resolution between customers and sellers regarding what was sold and purchased.

A customer can reference snapshot data when claiming a seller changed product information after purchase.

A seller can reference snapshot data when proving what variant was offered to a customer at the time of purchase.

An administrator can review snapshot data when mediating disputes between sellers and customers.

A super administrator can review snapshot data when investigating fraud or policy violations involving any user.

Snapshots provide evidence for cancellation request disputes regarding whether a seller made changes after payment.

Snapshots provide evidence for refund request disputes regarding whether a product description matched the purchased item.

Snapshots are used to calculate refunds based on the price at the time of purchase, not the current price.

Snapshots are used to verify that the correct product and variant were delivered to the customer.

Snapshots help determine liability in disputes by showing when and who made changes to product information.

Snapshots are reviewed to verify that sellers did not change prices or descriptions to the detriment of customers after purchase.

Snapshots are used to reconstruct the complete order state at the time of purchase for legal and tax purposes.

All snapshot data created for dispute resolution is preserved according to legal retention requirements.

When a dispute is resolved, both parties can access relevant snapshot data as evidence for their claims.

## CancellationRequest Rules

Customers can request cancellation for individual order items that are in paid status but not yet shipped. Cancellation requests must include a reason describing why the customer wants the item cancelled. The seller of the specific item can approve or reject the cancellation request. When the seller responds, a snapshot of the cancellation request state is created. If approved, the item is cancelled and a refund is processed for that specific item only. Cancelled items have their stock quantities restored through inventory records. If all items in an order are cancelled, the entire order status becomes cancelled. The remaining items in the order continue processing normally after individual cancellations.

### Cancellation Eligibility

Customers can request cancellation only for order items that have status paid. Cancellation requests cannot be made for items with status shipped, delivered, cancelled, or refunded. An item with status paid is waiting for the seller to ship and has not yet entered the shipping process. Items that have been shipped or delivered cannot be cancelled through the cancellation request system and must use the refund request process instead.

### Cancellation Request Submission

When submitting a cancellation request, customers must provide a reason describing why they want the item cancelled. The reason is required text that explains the customer's motivation for cancellation. The request is associated with the specific order item, not the entire order. A single order can have multiple cancellation requests if it contains multiple items in paid status.

### Seller Cancellation Approval Process

The seller who provided the item can review and approve or reject cancellation requests. When a seller approves a cancellation request, the item status changes to cancelled and the order item is marked as cancelled. The remaining items in the same order continue processing normally and are unaffected by the cancellation approval. The seller must respond to the cancellation request within their dashboard.

### Seller Cancellation Rejection

The seller can reject a cancellation request if they determine the request does not meet their cancellation policy or reasons. When a seller rejects a cancellation request, the request is marked as rejected and the item remains in its current status. The customer can view the rejection decision but cannot submit a new cancellation request for the same order item after rejection. The seller provides no required reason for rejection.

### Cancellation Request Snapshots

When a seller responds to a cancellation request by approving or rejecting, a snapshot of the cancellation request state is created. The snapshot records when the response was made, who made the response, and the decision made. Snapshots are immutable and cannot be deleted. Both the customer and seller can view the snapshots for dispute resolution purposes. Administrators can also view snapshots of any cancellation request.

### Refund Processing on Cancellation

When a cancellation request is approved, a refund is processed for that specific item only. The refund amount equals the price paid for the item at the time of purchase. The refund is processed through the payment system and credited to the customer's payment method. Only the cancelled item is refunded; other items in the same order continue normal processing and are not refunded. The refund is created at the moment the seller approves the request.

### Stock Restoration on Cancellation

When a cancellation request is approved, stock quantities are restored for the cancelled item's variant through inventory records. A positive inventory record is created to reflect the quantity being added back to stock. The reason for the inventory record is recorded as 'cancellation'. This restores the variant's available stock for future purchases. The stock is available immediately after cancellation approval.

### Individual Item Cancellation Impact

Cancellation is handled per order item, not per entire order. If all items in an order are cancelled, the entire order status becomes cancelled. If only some items are cancelled, the order status reflects a partially completed or partially cancelled state. The remaining items continue processing normally and the order continues toward delivery. Each order item maintains its own cancellation request history independently.

## RefundRequest Rules

Customers can request refunds for individual order items that have been delivered. Refund requests must include a reason describing why the customer wants a refund. Refunds can only be requested within 7 days of the item being delivered. The seller of the item can approve or reject the refund request. When the seller responds, a snapshot of the refund request state is created. If approved, the item is refunded and stock quantities are restored through inventory records. The remaining items in the order are unaffected by individual refunds. If all items in an order are refunded, the entire order status becomes refunded.

### Refund Eligibility

Customers can request a refund for individual order items that have been delivered. Only items with delivered status are eligible for refund requests. Items with other statuses (paid, shipped, cancelled, or refunded) cannot have refund requests submitted.

### Seven Day Refund Window

Refund requests must be submitted within seven days from the date the item was delivered. Requests submitted after the seven-day window are rejected. The system calculates the deadline based on the delivery confirmation date or automatic delivery date.

### Refund Request Reason

Every refund request must include a reason describing why the customer is requesting the refund. The reason is entered as text and is required to submit the request. If no reason is provided, the request is rejected.

### Seller Refund Approval

The seller who sold the item can approve or reject refund requests for their order items. When the seller approves a refund request, the item is refunded and the order item status becomes refunded. A snapshot of the refund request state is created at the time of approval.

### Seller Refund Rejection

The seller who sold the item can approve or reject refund requests for their order items. When the seller rejects a refund request, the request is marked as rejected and no refund is processed. A snapshot of the refund request state is created at the time of rejection.

### Refund Request Snapshot

When a seller responds to a refund request (either approval or rejection), a snapshot of the request state is created. The snapshot records when the change was made, what was changed, and the values before and after. Snapshots are immutable and cannot be deleted. Both the customer and the seller can view the snapshots.

### Stock Restoration on Refund

When a refund request is approved, stock quantities are restored for the refunded variant through inventory records. The system creates a positive inventory record with the quantity and reason. The restored stock becomes available for future orders. This applies to each refunded item individually.

### Individual Item Refund Scope

Refunds are processed on an individual item basis, not on the entire order. Refunding one item does not affect the status or processing of other items in the same order. If all items in an order are refunded, the entire order status becomes refunded. Otherwise, remaining items continue processing normally.

## SellerApprovalRequest Rules

Seller registration requires administrator approval before sellers can begin selling products on the platform. Administrators can view all pending seller approval requests and approve or reject them. When rejecting a seller registration, administrators must provide a specific reason for the rejection. Rejected sellers can view the rejection reason and submit a new registration request. The seller account remains in pending status while the approval request is under review. Approved sellers can immediately start selling products after their request is approved. The approval status can be viewed by the seller at any time during the process.

### Seller Registration Approval Requirement

Seller accounts require administrator approval before sellers can begin selling products on the platform.

A seller cannot list any products for sale until their registration request is approved by an administrator.

The seller account remains in pending status while the approval request is under review. While in pending status, the seller can complete their shop profile but cannot create or publish products.

Once a seller's approval request is approved, they can immediately start selling products without any additional waiting period.

### Pending Seller Approval Status

When a seller submits a registration request, their account status is set to pending until an administrator takes action.

Sellers with pending status cannot access the seller dashboard features for product management.

Sellers with pending status can view their shop profile information and edit their shop name, description, and logo.

Sellers with pending status cannot create product listings or modify product inventory.

The platform notifies sellers when their approval request status changes from pending to approved or rejected.

### Administrator Approval Authority

Only administrators have the authority to approve or reject seller registration requests.

Administrators can view the complete list of all pending seller approval requests on the platform.

Administrators can approve individual seller registration requests or reject them at their discretion.

Approved sellers gain full selling privileges immediately after their request is approved.

The administrator's approval action is recorded with a timestamp for audit purposes.

### Administrator Rejection with Reason

When an administrator rejects a seller registration request, they must provide a specific reason for the rejection.

The rejection reason is mandatory and must be entered by the administrator before the rejection is confirmed.

Rejection reasons are stored as text and can describe any valid grounds for rejection.

Rejected seller accounts remain in rejected status and cannot be reactivated without a new registration request.

The rejection reason is preserved and cannot be modified once submitted.

### Rejection Reason Visibility to Seller

Rejected sellers can view the complete rejection reason provided by the administrator.

The rejection reason is displayed to the seller in their account status view.

Sellers can view their rejection reason at any time after being rejected.

The rejection reason provides feedback to sellers about what needs to be addressed.

Rejected sellers can use the rejection reason information to improve their future registration requests.

### New Registration After Rejection

Sellers who have been rejected can submit a new registration request after viewing the rejection reason.

The new registration request requires the seller to complete the registration process again.

A previously rejected seller's new registration request is treated as a new pending request.

The seller's history of rejection does not prevent them from submitting a new registration.

The administrator reviews each new registration request independently.

### Seller Approval Status Viewing

Sellers can view their current approval status (pending, approved, or rejected) at any time in their account settings.

The approval status is displayed prominently in the seller's account dashboard.

Sellers can view their approval status even after being rejected, to understand why they were rejected.

The approval status view shows the date when the approval request was submitted.

The approval status view shows the date when the approval request was resolved (approved or rejected).

## Administrator Rules

Administrators are responsible for managing seller approvals, categories, products, orders, and user accounts on the platform. Super administrators can promote regular administrators to super administrator and demote other super administrators but cannot demote themselves. Administrators can view all seller accounts and ban or suspend seller accounts as needed. Banned sellers cannot log in to the platform while existing orders remain. Suspended sellers can still process existing orders but cannot create or edit products. Administrators can ban customers which prevents them from logging in to the platform. Administrators can view and force-cancel or force-refund individual items or entire orders. Administrator level is determined by whether the user is a regular administrator or super administrator.

### Administrator Seller Management

Administrators can view the list of all seller accounts on the platform.

Administrators can view the list of pending seller approval requests.

Administrators can approve or reject seller registration requests.

When rejecting a seller registration, administrators must provide a rejection reason.

Rejection reasons are visible to the rejected seller.

Rejected sellers can submit a new registration request.

Once approved, sellers can begin selling on the platform.

Rejected sellers cannot view products created before their account was rejected.

Administrators can view seller profiles for all seller accounts.

Administrators can view seller approval status for any seller account.

Administrators can view pending cancellation requests for any seller's products.

Administrators can view pending refund requests for any seller's products.

### Super Administrator Promotion

Regular administrators can submit a request to become super administrators.

The request must include a reason (text) for the promotion.

Super administrators can approve or reject promotion requests for regular administrators.

When a regular administrator is approved, they gain super administrator privileges.

Super administrator privileges include:
- Promoting other regular administrators to super administrator
- Demoting other super administrators to regular administrator
- Viewing and acting on all administrator actions

Super administrators cannot promote themselves.

Promotion requests are logged and cannot be deleted.

The promotion takes effect immediately upon approval.

A promoted super administrator retains all previous administrator capabilities.

Promotion history is recorded and visible to super administrators.

### Administrator Demotion Rules

Super administrators can demote other super administrators to regular administrators.

Super administrators cannot demote themselves.

When a super administrator is demoted, they retain all regular administrator privileges.

Demoted administrators lose the ability to promote other administrators.

Demoted administrators lose the ability to demote other super administrators.

Demotion takes effect immediately upon execution.

Demotion does not affect the administrator's ability to manage sellers, categories, products, or orders.

Demotion does not affect the administrator's ability to ban users.

Demotion does not remove the administrator from the platform.

Demotion is logged and cannot be deleted.

The demoted administrator retains their account and all previous permissions except super administrator privileges.

### Seller Account Suspension

Administrators can suspend seller accounts on the platform.

When a seller is suspended:
- Their products are hidden from search results
- Their products are hidden from category listings
- Their products cannot be purchased

Suspended sellers can still log in to the platform.

Suspended sellers can still process existing orders:
- Ship items to customers
- Approve or reject cancellation requests
- Approve or reject refund requests

Suspended sellers cannot create new products.

Suspended sellers cannot edit existing products.

Suspended sellers can view their shop dashboard.

Suspension does not affect existing order history.

Suspension does not affect existing shipments.

Suspension does not affect existing cancellation or refund requests.

Administrators can unsuspend seller accounts.

When unsuspended, seller products become visible in search and category listings again.

Unsuspended sellers can create and edit products again.

### Seller Account Ban

Administrators can ban seller accounts on the platform.

When a seller is banned, they cannot log in to the platform.

Banned sellers lose access to their shop dashboard.

Banned sellers cannot view pending orders.

Banned sellers cannot view their product listings.

Existing orders for banned sellers remain active.

Existing shipments for banned sellers remain valid.

Administrators can handle existing orders on behalf of banned sellers if needed.

Existing cancellation requests for banned sellers remain actionable.

Existing refund requests for banned sellers remain actionable.

Banned sellers cannot submit new registration requests.

Banning a seller does not delete their order history.

Banning a seller does not delete their products (they are hidden).

Banning a seller does not delete their profile (it is hidden).

Administrators can unban seller accounts.

When unbanned, sellers regain login access to the platform.

Unbanned sellers regain access to their dashboard and existing orders.

### Customer Ban Capability

Administrators can ban customer accounts on the platform.

When a customer is banned, they cannot log in to the platform.

Banned customers lose access to their account.

Banned customers cannot view their order history.

Banned customers cannot view their wishlist.

Banned customers cannot add items to their cart.

Banned customers cannot place new orders.

Banned customers cannot write new reviews.

Existing orders for banned customers remain valid.

Existing shipments for banned customers remain valid.

Existing reviews by banned customers are preserved.

Existing reviews by banned customers are shown as "deleted user".

Banning a customer does not delete their order history.

Banning a customer does not delete their wishlist.

Banning a customer does not delete their reviews.

Administrators can unban customer accounts.

When unbanned, customers regain login access to the platform.

Unbanned customers regain access to their account and order history.

### Force Cancellation by Administrator

Administrators can force-cancel individual order items.

Administrators can force-cancel entire orders.

Force cancellation refunds the customer for the cancelled items or order.

Force cancellation restores stock quantities for the cancelled variants.

Force cancellation creates an inventory record with positive quantity change.

Force cancellation is logged and cannot be deleted.

Force cancellation can be performed on items with any status.

Force cancellation can be performed on items with any order status.

Force cancellation does not require seller approval.

Force cancellation does not require customer approval.

Force cancellation is typically used for policy violations or platform errors.

Force cancellation preserves order history for audit purposes.

Force cancellation does not delete the order from the system.

Force cancellation marks the item or order as cancelled.

### Force Refund by Administrator

Administrators can force-refund individual order items.

Administrators can force-refund entire orders.

Force refund processes a refund to the customer for the refunded items or order.

Force refund restores stock quantities for the refunded variants.

Force refund creates an inventory record with positive quantity change.

Force refund is logged and cannot be deleted.

Force refund can be performed on items with any status.

Force refund can be performed on items with any order status.

Force refund does not require seller approval.

Force refund does not require customer approval.

Force refund is typically used for policy violations or platform errors.

Force refund preserves order history for audit purposes.

Force refund does not delete the order from the system.

Force refund marks the item or order as refunded.

## Payment Rules

Payment is processed through an external payment gateway after the customer confirms and places the order. Payment can succeed or fail, and this determines whether the order is actually created. If payment fails, the order is not created and the customer can retry the payment process. If payment succeeds, the order is created and stock quantities are decreased for purchased variants. Failed payment does not create an order record, allowing the customer to correct payment issues without affecting inventory.

### Payment Gateway Processing

When a customer confirms and places an order, the system processes payment through an external payment gateway. The payment gateway handles the actual transaction with the customer's payment method. The system waits for the payment gateway to respond with success or failure. If the payment gateway cannot be reached or times out, the payment is treated as failed and the customer can retry. The order is not created until payment confirmation is received from the gateway. The system does not store or handle payment card details; all sensitive payment information is handled by the external payment gateway.

### Payment Success - Order Creation

When the payment gateway returns a successful response, the system creates an order record with all order items from the customer's cart. The order is assigned a unique order number. The order status is set to paid. All items in the order are set to paid status. The system removes all order items from the customer's shopping cart. The order becomes visible in the customer's order history. The seller of each item in the order can view the new order items in their dashboard. The order is not accessible until payment succeeds; incomplete or abandoned carts do not create orders.

### Payment Failure - No Order Creation

When the payment gateway returns a failure response, the system does not create an order record. No order number is generated. No order items are created. The customer's cart remains unchanged and all items stay in the cart. The customer is shown an error message indicating the payment failed. The customer can review the cart and retry payment. Failed payments do not consume stock quantities. Failed payments do not generate any order records in the system. The customer can retry payment multiple times with the same cart contents. The system does not hold or reserve stock items when payment fails.

### Retry Payment After Failure

When payment fails, the customer can retry the payment process without recreating the cart. The customer can update payment information if needed before retrying. The system allows multiple retry attempts for the same cart contents. There is no limit on the number of payment retry attempts. The cart contents remain unchanged during payment retries. Failed payment attempts do not expire the cart contents. The customer can modify cart items between retry attempts. The customer can proceed to checkout and retry payment as many times as needed until successful.

### Stock Deduction on Payment Success

When payment succeeds and the order is created, stock quantities are decreased for each purchased variant in the order. The quantity deducted equals the quantity specified in each order item. Stock is deducted immediately upon payment confirmation. If multiple items are purchased, stock is deducted for all variants in a single transaction. The stock deduction is permanent; returned items do not automatically restore stock (requires a refund request process). Out of stock variants cannot be successfully paid for. If stock reaches zero during payment processing, the variant is shown as unavailable.

### Order Creation on Successful Payment

An order record is created immediately upon payment success confirmation from the gateway. The order record includes all order items with their variants and quantities. Each order item includes a snapshot of the product details at the time of purchase. Each order item includes a snapshot of the product variant details at the time of purchase. Each order item includes a snapshot of the seller profile at the time of purchase. The order creation is atomic; either all items are created successfully or none are created. The order creation cannot be partially completed; all or nothing. Once the order is created, it cannot be modified. The order status is derived from the individual item statuses. Customer can view the order immediately after creation.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search Filtering

Customers can search products by name across all sellers on the platform.

When viewing search results, customers can filter by the following criteria:

Category: Customers can filter products by selecting a specific category or subcategory. Products must belong to the selected category to appear in filtered results.

Price Range: Customers can filter by minimum and maximum price. Results will only include products whose variants fall within the specified price range. The base price is used for filtering when variants have the same price; when variants have different prices, the price range applies to any variant of the product.

In-Stock Only: When enabled, search results will only include products that have at least one variant with stock quantity greater than zero.

If no filter criteria are specified, all products are shown.

Filter combinations are applied together, and results are limited to products matching all active filters.

When a filter is applied, the system shows a count of matching results. If no products match the filter criteria, a message is displayed indicating no results were found.

Filter selections persist while the customer navigates to product detail pages and returns to the search results.

### Product Search Sorting

Customers can sort search results using the following order:

Newest First: Products are ordered by creation date, with the most recently created products appearing first.

Price Low to High: Products are ordered by variant price in ascending order. When a product has variants with different prices, the lowest variant price is used for sorting.

Price High to Low: Products are ordered by variant price in descending order. When a product has variants with different prices, the lowest variant price is used for sorting.

Sorting applies to all currently filtered results.

If no sorting criteria are specified, products are displayed in the order they were retrieved from the database (typically newest first by default).

Customers can change the sorting criteria at any time while viewing search results.

Sorting does not affect the filter criteria—only the order in which matching products are displayed.

### List Pagination

All searchable product lists are paginated to manage result size.

Search Results: Product search results display a fixed number of products per page. Customers can navigate through pages using page numbers or next/previous controls.

Category Browsing: Products within a category are displayed with the same pagination as search results. When viewing a category, customers can navigate through all pages of products in that category.

Wishlist: Customer wishlists are paginated. Customers can view their wishlisted products across multiple pages using page navigation controls.

Order History: Customer order lists are paginated, with orders sorted by newest first. Customers can navigate through their order history across multiple pages.

Seller Order Items: Sellers can view order items for their products across multiple pages using pagination controls.

Pagination does not affect sorting or filtering—only the display range of results.

Customers can see the total number of results and their current position within the total (e.g., "Showing 1-20 of 150 results").

When viewing product detail pages, customers can return to the previous list view (search, category, or wishlist) with filters and sorting preserved.

### Category Browsing Rules

Customers can browse the list of all categories available on the platform.

Categories are displayed in a hierarchical structure, showing parent categories and their subcategories (one level of nesting only).

When a customer clicks on a category, they view all products within that category (including subcategory products).

Products in deleted categories are shown as uncategorized and can still be browsed, but they do not appear in any category listing.

Categories are managed by administrators only. Customers can only view categories, not create or modify them.

When a product is deleted, it is immediately removed from category listings.

When a product's category is changed by the seller, it no longer appears in the old category's product list and appears in the new category's product list.

The category list is displayed consistently across the platform, including on search results and product detail pages.

### Product Listing Display Rules

When viewing a list of products (search results, category page, or wishlist), each product displays the following information:

Main Image: The first product image serves as the thumbnail, displayed in list view. Images can be reordered by the seller to change which image appears first.

Name: The product name is displayed.

Price: The base price is displayed. When variants have different prices, a price range is shown (e.g., "$10 - $20").

Seller Shop Name: The shop name of the seller who created the product is displayed.

Average Rating: If the product has reviews, the average rating is displayed (e.g., "4.5 out of 5 stars"). Products without reviews do not display a rating.

Stock Status: When viewing product details, variants show their stock status (in stock, low stock, out of stock). In list views, out-of-stock products may be indicated visually but can still be browsed.

Products with no variants are visible in search results but are marked as "unavailable" for purchase.

### Error Conditions for Browsing

When no products match search or filter criteria, the system displays a message indicating no results were found.

When a customer attempts to view a deleted category, the system shows an appropriate message (categories are preserved for administrative purposes but are not browsable).

When a product detail page is accessed for a deleted product, the system shows that the product is no longer available and cannot be purchased.

When a customer attempts to access a deleted product from their wishlist, the product is automatically removed from the wishlist.

When a customer attempts to add an out-of-stock variant to the cart, the system shows a warning that the variant is out of stock and cannot be added.

When a variant in the cart becomes unavailable (deleted or out of stock), the item is marked as unavailable and cannot proceed to checkout.

When a customer's wishlisted product is deleted by the seller, the product is automatically removed from all customers' wishlists without notification.

When a seller deletes a product, all references to that product are removed from search and category listings, but order history preserves the product data as it existed at purchase time.

When browsing seller-specific lists, if a seller account is suspended, their products are hidden from search and category listings but remain accessible via direct links (though they cannot be purchased).

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Registration and Account Creation Failures

When a customer attempts to register, the system rejects the request if the email address is already associated with an existing account.

When a customer attempts to register, the system rejects the request if the email address does not follow a valid email format.

When a seller attempts to register, the system rejects the request if the email address is already associated with an existing seller account.

When a seller attempts to register, the system rejects the request if the email address is already associated with a customer account.

If a seller's registration is rejected by an administrator, the seller receives the rejection reason and may submit a new registration request.

### Account Deletion Restrictions

A customer may delete their account only if they have no restrictions.

When a customer deletes their account, their profile information is removed from the system.

When a customer deletes their account, their order history is preserved for record-keeping purposes.

When a customer deletes their account, their reviews are retained but displayed as from a deleted user.

A seller may delete their account only if they have no pending orders with paid or shipped status.

A seller may delete their account only if they have no pending cancellation requests for any of their order items.

A seller may delete their account only if they have no pending refund requests for any of their order items.

When a seller deletes their account, all their products are removed from active listings.

When a seller deletes their account, their order history and order snapshots are preserved.

When a seller deletes their account, their shop name is retained in historical order records.

### Product Creation and Validation Errors

The system rejects a product creation request if the product name is not provided.

The system rejects a product creation request if the product description is not provided.

The system rejects a product creation request if no category is selected.

The system rejects a product creation request if no base price is provided.

The system rejects a product creation request if the product has no variants associated with it.

A product without variants is visible in search results but displays as unavailable for purchase.

The system rejects a variant creation request if the SKU code is already in use by another variant.

### Product and Variant Deletion Failures

A seller may delete a product only if no variant of that product has order items with paid or shipped status.

A seller may delete a product only if no variant of that product has pending cancellation requests.

A seller may delete a product only if no variant of that product has pending refund requests.

When a product is deleted, all its variants and their inventory records are removed from active listings.

A seller may delete a variant only if that variant has no order items with paid or shipped status.

A seller may delete a variant only if that variant has no pending cancellation requests.

A seller may delete a variant only if that variant has no pending refund requests.

Deleted products and variants no longer appear in search results or category listings.

Product snapshots are preserved even after the product is deleted.

### Inventory and Stock Validation Failures

The system rejects adding a variant to the shopping cart if the variant's stock quantity is zero.

When a variant's stock quantity falls below the quantity in the cart, a warning is displayed to the customer.

If a variant becomes out of stock after items are added to the cart, the variant is marked as unavailable in the cart.

If a variant is deleted by the seller after being added to a customer's cart, the variant is marked as unavailable in the cart.

Order placement automatically reduces the stock quantity for each purchased variant.

### Checkout and Payment Failures

The system rejects checkout if any cart items are unavailable due to deleted products or out-of-stock variants.

The system rejects checkout if the customer has not selected a shipping address.

When a customer proceeds to checkout, they must review and confirm their order before placement.

If payment fails during order placement, no order is created and the customer may retry payment.

If payment fails during order placement, cart items are not removed and remain available for retry.

When an order is successfully created, the purchased items are removed from the customer's cart.

When an order is successfully created, stock quantities are immediately decreased for all purchased variants.

After an order is placed, the selected shipping address cannot be modified.

### Order Item Status and Transition Rules

An order item with status paid cannot be cancelled by the seller if the status is already shipped.

An order item with status shipped cannot be cancelled by the customer.

An order item with status delivered cannot be cancelled by the customer.

An order item with status cancelled or refunded cannot have further cancellation or refund requests submitted.

An order's overall status is derived from its items' individual statuses.

If all items in an order are paid, the order status is paid.

If any item in an order is shipped and none are delivered, the order status is shipped.

If all items in an order are delivered, the order status is delivered.

If all items in an order are cancelled, the order status is cancelled.

If all items in an order are refunded, the order status is refunded.

If an order has mixed item statuses (e.g., some delivered, some refunded), the order status is partially completed.

### Shipping and Delivery Timeouts

A seller may ship only order items that they created and have status paid.

When a shipment is created, all items in that shipment change to shipped status.

Different sellers always ship their items in separate shipments.

All items within a single shipment share the same tracking information.

A customer may confirm delivery for a shipment on behalf of all items in that shipment.

If a customer does not confirm delivery for a shipment, the items in that shipment automatically change to delivered status after 14 days from the shipment date.

### Cancellation Request Validation

A customer may request cancellation only for order items with status paid.

A customer may request cancellation only for order items that have not been shipped.

A cancellation request must include a reason provided by the customer.

The seller of an order item may approve or reject a cancellation request for that item.

When a seller responds to a cancellation request (approve or reject), a snapshot of the request is created.

When a cancellation request is approved, only that specific item is cancelled.

When a cancellation request is approved, the item's stock quantity is restored via an inventory record.

When a cancellation request is rejected, the item continues processing normally.

If all items in an order are cancelled, the entire order status becomes cancelled.

### Refund Request Validation

A customer may request a refund only for order items with status delivered.

A customer may request a refund only within seven days from the item's delivery date.

A refund request must include a reason provided by the customer.

The seller of an order item may approve or reject a refund request for that item.

When a seller responds to a refund request (approve or reject), a snapshot of the request is created.

When a refund request is approved, only that specific item is refunded.

When a refund request is approved, the item's stock quantity is restored via an inventory record.

When a refund request is rejected, the item remains in delivered status.

If all items in an order are refunded, the entire order status becomes refunded.

### Review Creation and Modification Failures

A customer may create a review only for an order item with status delivered.

A customer may write only one review per product per order.

The system rejects a review creation request if the rating is not provided.

The rating must be an integer value from one to five stars.

The system rejects a review creation request if the customer has not purchased the product in an order with delivered status.

A customer may edit only their own reviews.

When a customer edits a review, a snapshot of the review state is created.

A customer may delete only their own reviews.

When a customer deletes a review, a snapshot of the deleted review is preserved.

A product's average rating is calculated from all non-deleted reviews.

### Wishlist Synchronization Failures

When a product is deleted by its seller, all references to that product are removed from customer wishlists.

The system automatically removes a product from a wishlist when the product is no longer available for purchase.

### Category and Product Oversight Failures

When a category is deleted by an administrator, products in that category become uncategorized.

Uncategorized products remain visible in product listings.

When a seller account is suspended by an administrator, their products are hidden from search results and category listings.

When a seller account is suspended by an administrator, their products cannot be purchased.

When a seller account is suspended by an administrator, they may still process existing orders (ship items, respond to cancellation and refund requests).

When a seller account is suspended by an administrator, they cannot create new products or edit existing products.

When a banned customer attempts to log in, access is denied.

When a banned seller attempts to log in, access is denied.

When a banned seller attempts to log in, existing orders for that seller remain processable.

### Snapshot Immutability Failures

The system does not permit deletion of any snapshot record.

Snapshots are immutable and cannot be modified after creation.

Snapshots created on edits record the previous values before the change.

Snapshots created on deletions record the values before the deletion.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Retry Policy

Customers may retry payment if the payment gateway fails to process their payment during checkout.
Each retry attempt creates a new payment request to the gateway.
Customers can retry payment an unlimited number of times.
Successful payment creates an order; failed payment does not create an order.
Payment retry is only available for the checkout process, not for post-order payment recovery.

### Payment Gateway Failure Handling

When the payment gateway returns an error, the checkout process is not completed.
No order record is created when payment fails.
The customer receives a clear error message describing the failure reason.
The customer can retry the payment with the same cart contents.
Cart contents are preserved during payment retry attempts.

### Integration Error Recovery

If an external service integration fails during checkout, the system does not create an order.
The cart remains intact for customer retry.
The customer can resume checkout from the review stage.
System administrators are notified of integration failures for monitoring.
Failed integration attempts do not affect existing orders or inventory records.

### Fallback for Integration Failures

When an integration service becomes unavailable, checkout operations are halted to prevent data corruption.
Customers receive an error message indicating the temporary unavailability.
Customers may retry checkout after the system restores integration connectivity.
No partial orders or inventory reservations are created during integration failure.
Administrators must restore integration before customers can complete new orders.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation

Sellers can upload images for products and their seller profile logo.
Uploaded image files must meet the following validation requirements before acceptance.
File size is validated to ensure reasonable upload sizes for performance.
File dimensions are validated to ensure images display correctly on the platform.
Invalid file uploads are rejected with an appropriate error message.
The uploading seller receives notification when their image upload fails validation.

### Virus Scan

All uploaded images are scanned for malicious content before being accepted.
Images that fail the virus scan are rejected and not stored in the system.
Sellers are notified when their uploaded image contains malicious content.
Rejected images from virus scans are not saved and cannot be accessed.
The virus scan is performed automatically as part of the upload process.

### Content Type

Only image files are accepted for product images and seller profile logos.
Supported image formats are specified by the platform.
Non-image files are rejected during the upload process.
The system validates the content type of uploaded files against allowed types.
Attempts to upload files with unsupported content types are rejected with an error.

### Retention Policies

Product images are retained for the lifetime of the product.
When a product is deleted, its images are also deleted from the system.
Seller profile logos are retained while the seller account is active.
When a seller account is deleted or suspended, their profile logo is removed from listings.
Images from deleted products are removed from all customer wishlists.
Archived or deleted images may be retained for administrative dispute resolution purposes.