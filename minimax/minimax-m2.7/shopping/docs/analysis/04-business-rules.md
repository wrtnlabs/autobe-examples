**ecommerceMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with a valid email address and a password to access any platform features. The email address must be unique across the platform and serve as the primary identifier for login. Passwords must meet minimum security requirements established by the platform. Customers log in using their registered email and password combination. Customers have the ability to change their password after authenticating successfully. When a customer initiates account deletion, the system removes all profile information while preserving order history and reviews. Deleted customer accounts cannot be recovered, and the email address becomes available for new registration after a defined period. Banned customers are prevented from logging into the platform.

### Customer Registration and Authentication Rules

### Customer Registration Requirements

THE system SHALL require all customers to complete registration before accessing any platform features.

WHEN a customer attempts to register, THE system SHALL verify that a valid email address is provided.

THE system SHALL reject registration requests that do not include an email address.

### Email Address Constraints

THE system SHALL ensure each email address is unique across the entire platform.

WHEN a customer attempts to register with an email address already in use, THE system SHALL reject the registration and display an appropriate error message.

THE system SHALL use the email address as the primary identifier for customer authentication.

### Password Requirements

THE system SHALL require customers to provide a password during registration.

Passwords MUST meet minimum security requirements established by the platform.

THE system SHALL reject registration requests when the provided password does not meet the security requirements.

### Authentication Process

THE system SHALL authenticate customers using their registered email address and password combination.

WHEN a customer provides incorrect credentials, THE system SHALL reject the login attempt and display an appropriate error message.

### Password Change Operations

Authenticated customers SHALL be permitted to change their password.

WHEN a customer requests a password change, THE system SHALL require the customer to provide the current password for verification.

THE system SHALL reject password change requests when the current password is incorrect.

THE system SHALL verify that the new password meets the same security requirements as initial registration.

### Account Deletion Consequences

WHEN a customer deletes their account, THE system SHALL permanently remove all profile information associated with that customer.

WHEN a customer deletes their account, THE system SHALL preserve all order history for record-keeping and legal compliance purposes.

WHEN a customer deletes their account, THE system SHALL preserve all reviews submitted by that customer.

Reviews created by deleted customers SHALL be displayed with an indication that the author has been deleted, without exposing any personal information.

THE system SHALL permanently prevent recovery of deleted customer accounts.

### Customer Ban Status

THE system SHALL maintain a ban status for each customer account.

Banned customers SHALL be prevented from logging into the platform.

WHEN a banned customer attempts to log in, THE system SHALL reject the attempt and display an appropriate error message.

### Login Restriction Enforcement

THE system SHALL verify customer ban status before completing any login request.

IF a customer account is marked as banned, THE system SHALL deny all authentication attempts regardless of the correctness of provided credentials.

### Credential Validation Rules

### Email Address Uniqueness Enforcement

THE system SHALL validate that no two customers share the same email address.

WHEN processing a new customer registration, THE system SHALL check the email address against all existing customer accounts.

IF the provided email address matches an existing customer account, THE system SHALL reject the registration with a descriptive error message indicating the email is already in use.

THE system SHALL allow the same email address to be used by both customer and seller accounts, as they represent distinct actor types.

### Registration Validation

BEFORE creating a new customer account, THE system SHALL validate all required fields are present and correctly formatted.

IF any required information is missing or invalid, THE system SHALL reject the registration and inform the customer of the specific issues.

### Login Credential Validation

THE system SHALL validate login credentials before establishing an authenticated session.

IF the provided email address does not correspond to any customer account, THE system SHALL reject the login attempt without revealing whether the email exists.

IF the provided password does not match the stored password for the given email, THE system SHALL reject the login attempt.

### Session Establishment

THE system SHALL only establish an authenticated session after successful credential validation and ban status verification.

IF any validation step fails, THE system SHALL deny the login request without creating a session.

## CustomerProfile Rules

Each customer profile must contain a display name that identifies the customer on the platform. The display name is visible to other users in certain contexts such as reviews. Phone number is optional but must be in a valid format when provided. Customers can update their display name and phone number at any time through profile editing. The display name has a maximum length to ensure consistent display across the platform. Phone numbers are stored in international format to support customers from different countries.

### Display Name Requirements

The display name field is mandatory when creating or updating a customer profile. A display name must be present for the profile to be considered valid.

The display name must not exceed 100 characters in length. Any attempt to set a display name longer than this limit must be rejected.

The display name must not be empty or consist only of whitespace characters. If the provided display name is empty or contains only whitespace, the operation must be rejected.

### Display Name Visibility

The display name is visible to other users in certain contexts such as product reviews. When a customer writes a review, their display name appears alongside the rating and text content.

The display name is also visible to sellers when fulfilling orders, allowing sellers to identify customers by their chosen identifier.

### Phone Number Validation

The phone number field is optional in a customer profile. Customers are not required to provide a phone number.

When a phone number is provided, it must contain between 10 and 20 characters. This range accommodates international phone numbers with country codes.

The phone number may include digits, plus signs, spaces, and hyphens. Any phone number containing invalid characters or falling outside the acceptable length range must be rejected.

### Profile Update Operations

Customers can update their display name at any time after account creation. The new display name must satisfy all validation requirements.

Customers can update their phone number at any time. If removing the phone number entirely, the field may be set to empty.

All profile updates must be performed while the customer is authenticated and logged into their account.

### Validation Error Handling

If the display name is not provided when creating or updating a profile, the operation must be rejected with an appropriate error message.

If the display name exceeds 100 characters, the operation must be rejected with a message indicating the maximum allowed length.

If the phone number is provided but contains invalid characters or is shorter than 10 characters or longer than 20 characters, the operation must be rejected with a message indicating the valid format requirements.

If the customer is not authenticated when attempting to update their profile, the operation must be rejected.

## ShippingAddress Rules

Shipping addresses must include a recipient name that identifies who should receive the package. Each address requires a phone number for delivery contact purposes. The street address field must contain sufficient detail for successful delivery. City, state or province, postal code, and country are all required components of a complete address. Customers can maintain multiple shipping addresses for different delivery locations. One address can be designated as the default shipping address for faster checkout. Address fields have maximum lengths to ensure consistent data storage and display.

### Recipient Name Requirement

Every shipping address must include a recipient name. The recipient name identifies who should receive the package during delivery. The recipient name field cannot be left empty when saving an address.

### Delivery Phone Number Requirement

Every shipping address must include a phone number for delivery contact purposes. The phone number enables delivery personnel or postal services to contact the recipient when needed. The phone number field cannot be left empty when saving an address.

### Street Address Completeness

The street address field must contain sufficient detail for successful delivery. Street address must include the building number, street name, and any additional details such as apartment number, floor, or suite number. The street address field cannot be left empty when saving an address.

### Address City Requirement

Every shipping address must include a city name. The city identifies the locality within a state or province where delivery will occur. The city field cannot be left empty when saving an address.

### State or Province Requirement

Every shipping address must include a state or province. The state or province identifies the region within a country where delivery will occur. The state or province field cannot be left empty when saving an address.

### Postal Code Requirement

Every shipping address must include a postal code. The postal code enables proper sorting and routing of deliveries by postal and courier services. The postal code field cannot be left empty when saving an address.

### Country Requirement

Every shipping address must include a country name or country identifier. The country specifies the nation where delivery will occur and determines applicable shipping rules and customs requirements. The country field cannot be left empty when saving an address.

### Multiple Address Storage

Customers can add multiple shipping addresses to their account for different delivery locations. There is no maximum limit on the number of addresses a customer can store. Each address is stored as a separate record and can be independently edited or deleted.

### Default Address Designation

Customers can designate one of their shipping addresses as the default shipping address. The default address is pre-selected during checkout for faster order processing. Only one address can be the default at any given time. When a new default is set, any previously designated default address loses its default status.

### Address Field Length Constraints

Address fields have maximum lengths to ensure consistent data storage and display. The recipient name has a maximum length of one hundred characters. The phone number has a maximum length of twenty characters. The street address has a maximum length of five hundred characters. The city has a maximum length of one hundred characters. The state or province has a maximum length of one hundred characters. Addresses exceeding these maximum lengths cannot be saved.

## Seller Rules

Sellers must register with a unique email address and password before they can operate on the platform. The email address serves as the primary login identifier and must not be already registered. Sellers cannot start selling until their account has been approved by an administrator. The approval status progresses through pending, approved, and rejected states. Rejected sellers receive a reason for rejection and may submit a new registration request. Sellers can change their password after authenticating with their current credentials. Sellers with pending or shipped order items cannot delete their accounts. Sellers with pending cancellation or refund requests cannot delete their accounts. When a seller deletes their account, all their products are removed from listings.

### Seller Registration Requirements

Sellers must register with a valid email address and a password before they can operate on the platform.

The email address serves as the primary login identifier for sellers.

Each seller email address must be unique across the platform. The system rejects registration attempts using an email that is already registered.

Sellers cannot start selling or performing selling operations until their account has been approved by an administrator.

### Approval Status Progression

The approval status of a seller account follows a progression through defined states.

**Initial State**: When a seller first registers, the approval status is set to pending.

**Awaiting Review**: The seller account remains in pending status until an administrator reviews and acts on the registration request.

**Approved State**: When an administrator approves the registration, the seller account status changes to approved. Approved sellers can list products, manage inventory, and process orders.

**Rejected State**: When an administrator rejects the registration, the seller account status changes to rejected. Rejected sellers receive a reason explaining why their registration was denied.

Rejected sellers may submit a new registration request at a later time after addressing the concerns raised in the rejection reason.

### Rejection Reason Visibility

When a seller registration is rejected, the administrator must provide a reason for the rejection.

Sellers whose registration has been rejected can view the rejection reason in their account status.

The rejection reason helps rejected sellers understand what corrections or improvements are needed before submitting a new registration request.

### Resubmission After Rejection

Sellers who have been rejected may submit a new registration request.

Each new registration request starts fresh with a pending approval status.

The new request is reviewed by an administrator following the standard approval workflow.

### Seller Password Change

Authenticated sellers can change their password.

To change the password, sellers must provide their current password for verification before setting a new password.

The new password must meet the platform's password requirements for security.

### Account Deletion Order Restriction

Sellers cannot delete their account if they have orders in progress.

Specifically, a seller account cannot be deleted when any order item for the seller's products has a status of paid or shipped.

This restriction ensures that ongoing customer transactions can be completed before the seller leaves the platform.

Sellers with pending or shipped order items must wait until all such items reach a completed, cancelled, or refunded status before they can delete their account.

### Account Deletion Refund Restriction

Sellers cannot delete their account if they have pending cancellation or refund requests.

Specifically, a seller account cannot be deleted when there are cancellation requests or refund requests in pending status for any of the seller's order items.

This restriction ensures that all customer disputes and requests are resolved before the seller leaves the platform.

Sellers with pending requests must wait until all cancellation and refund requests are approved or rejected before they can delete their account.

### Product Removal on Account Deletion

When a seller deletes their account, all their products are removed from product listings.

Deleted products no longer appear in search results or category listings.

This removal applies to all products created by the seller, regardless of their status.

The purpose is to prevent customers from purchasing from sellers who are no longer active on the platform.

## SellerProfile Rules

Seller profiles must include a shop name that identifies the seller's business to customers. The shop name appears on product listings and must be descriptive enough for customers to recognize the store. An optional shop description allows sellers to provide more information about their business. An optional logo image helps customers identify the seller's brand. Every time a seller edits their shop name, description, or logo, a snapshot is automatically created to preserve the previous state. The shop name has a maximum length to ensure consistent display. The shop description has a maximum length to prevent excessively long content.

### Shop Name Requirement

The shop name is a required field for seller profiles. Every seller must provide a shop name when creating their profile. The shop name must be between 1 and 100 characters in length. The shop name uniquely identifies the seller's business to customers and appears prominently on product listings, search results, and the seller profile page. Sellers choose their own shop name, but the system may reject names that are offensive, misleading, or already in use by another seller.

### Shop Name Display

The shop name is displayed in multiple locations throughout the platform to help customers identify the source of products. These locations include product listing cards, product detail pages, order confirmation pages, and the seller profile page. When a product is purchased, the shop name at the time of purchase is preserved in the order item snapshot, ensuring customers can always identify where they made their purchase even if the shop name changes later.

### Shop Description Optional

The shop description is an optional field that allows sellers to provide additional information about their business. Sellers may use this field to describe their products, their business history, their shipping policies, or any other relevant information. The shop description has a maximum length of 2000 characters to prevent excessively long content that could affect page layout. Sellers can leave the shop description blank if they prefer not to provide additional information.

### Logo Image Optional

The logo image is an optional field that allows sellers to upload an image representing their brand. The logo helps customers quickly identify the seller's shop across the platform. Sellers can upload a logo image at any time and can replace it with a different image later. If a seller does not upload a logo, the platform may display a default placeholder image instead.

### Automatic Snapshot on Edit

Every time a seller edits their shop name, shop description, or logo image, the system automatically creates a snapshot to preserve the previous state. This snapshot records what was changed, when the change was made, and the complete values before and after the edit. Snapshots are immutable and cannot be deleted or modified after creation. Sellers can view the history of changes to their profile through these snapshots.

### Shop Name Length Constraint

The shop name must not exceed 100 characters. This constraint ensures consistent display across all pages of the platform, including narrow layouts on mobile devices and compact displays in search results. If a seller attempts to enter a shop name longer than 100 characters, the system rejects the input and prompts the seller to shorten the name.

### Shop Description Length Constraint

The shop description must not exceed 2000 characters. This constraint prevents excessively long content that could negatively affect page loading times, responsive design layouts, or user experience when browsing seller profiles. If a seller attempts to enter a shop description longer than 2000 characters, the system rejects the input and prompts the seller to shorten the description.

### Profile Edit Tracking

All edits to the seller profile are tracked through an automatic snapshot mechanism. When a seller modifies any profile field, the system captures the previous state before applying the new values. This creates an immutable audit trail that records the complete profile state at each point in time. Sellers can view their complete edit history, including timestamps and previous values, which is useful for resolving disputes or understanding how their shop information has evolved over time.

## Category Rules

Categories must have a name that identifies the type of products within them. Each category can have an optional description explaining what types of products belong in the category. Categories support one level of nesting through parent category references, allowing for subcategories. Subcategories must reference their parent category, while top-level categories have no parent. Only administrators have permission to create, edit, and delete categories. Customers can view all categories but cannot modify them. Category names must be unique within their parent scope to prevent confusion.

### Category Name Requirements

Every category must have a name. The name identifies the type of products that belong within the category. Category names must be descriptive and meaningful to help customers understand what products they will find when browsing that category. A category without a name cannot be created or saved in the system.

### Category Description

Categories may have a description that explains what types of products belong in the category. The description is optional and can be left blank. When provided, the description should help customers understand the scope of products included in the category.

### Category Hierarchy Structure

Categories support one level of nesting, meaning categories can have subcategories but subcategories cannot have their own subcategories. This creates a two-level structure consisting of parent categories and their child subcategories. Each subcategory can only belong to one parent category, and this parent-child relationship is established when the subcategory is created.

### Parent Category Reference

Subcategories must reference their parent category to establish the hierarchy. When creating a subcategory, the parent category must be specified. Top-level categories have no parent and exist at the root level of the category structure. The parent category reference determines where the subcategory appears in the browsing hierarchy.

### Category Name Uniqueness

Category names must be unique within their parent scope. This means two categories with the same parent cannot have the same name. However, a parent category and its subcategory can share the same name since they exist at different levels. A category at the root level can have the same name as a subcategory under a different parent. When attempting to create or rename a category, the system must verify that no other category with the same parent already uses that name.

### Category Creation Permissions

Only administrators can create new categories. Regular customers and sellers cannot create categories. When creating a category, administrators must provide the category name and may optionally provide a description. For subcategories, administrators must also specify the parent category. Customers can view the list of all categories and browse products within any category.

### Category Editing Permissions

Only administrators can edit existing categories. This includes modifying the category name, description, and parent category assignment. When changing a subcategory's parent, the system must ensure the new parent is not a descendant of the subcategory itself to prevent circular references. Regular customers and sellers cannot modify any category information.

### Category Deletion Permissions

Only administrators can delete categories. When a category is deleted, products that were assigned to that category become uncategorized rather than being deleted. Subcategories under a deleted parent category are also deleted along with their parent. Customers lose access to the deleted category in browsing views but can still find products through search.

## Product Rules

Products must have a name that clearly identifies what is being sold. The product description provides detailed information about the product to help customers make purchasing decisions. Every product must be assigned to a category, including subcategories. Products must have a base price set by the seller. Only the seller who created a product can edit or delete it. When a product is edited, all previous data is preserved in a snapshot including all product fields and variant data. Products with no variants are visible in search but marked as unavailable. Products with deleted status no longer appear in search results or category listings.

### Product Name Requirement

Every product listed on the platform must have a name that clearly identifies what is being sold. The product name is a required field and cannot be left blank during creation or editing. The name should provide enough information for customers to understand what the product is without needing to read the full description. When a product name is missing, the system must reject the creation or update request and display an appropriate error message to the seller.

### Product Description Requirement

Each product must have a description that provides detailed information to help customers make purchasing decisions. The product description is a required field and cannot be left blank. The description should contain relevant details about the product such as features, specifications, materials, usage instructions, or any other information that would be useful to potential buyers. When a product description is missing, the system must reject the creation or update request.

### Category Assignment Requirement

Every product must be assigned to exactly one category when it is created. The category assignment is a required field. Sellers can select either a top-level category or a subcategory (a category that has a parent category). Products without a category assignment cannot be saved or published. The category determines where the product appears in browse listings and helps customers find products when browsing by category.

### Base Price Requirement

Each product must have a base price set by the seller. The base price is a required field and must be a positive decimal value. The base price represents the default price for the product unless individual variants specify their own price overrides. When a base price is missing or invalid, the system must reject the creation or update request.

### Seller Ownership Constraint

A product can only be edited or deleted by the seller who originally created it. Sellers have full control over their own products including updating product details, managing variants, changing images, and removing products from the platform. Other sellers cannot modify or delete products they did not create. Customers and other users also cannot modify or delete product listings. This ownership constraint ensures accountability and prevents unauthorized changes to product data.

### Snapshot Creation on Edit

Whenever a product is edited, the system must create an immutable snapshot that preserves the complete state of the product before the changes are applied. The snapshot must include all product fields including the name, description, category, base price, and all associated images. The snapshot must also include the state of all product variants at that moment, capturing each variant's SKU code, option values, and price. These snapshots serve as a historical record and are used for dispute resolution, order fulfillment verification, and audit purposes. Snapshots cannot be modified or deleted once created.

### Unavailable Status Without Variants

Products that have no variants defined are visible in search results and category listings but must be clearly marked as unavailable. This means customers can find the product when searching or browsing, but they cannot add it to their cart or proceed to checkout. The product detail page should indicate that the product is currently unavailable due to no variants being defined. Sellers are encouraged to add at least one variant to make their products purchasable.

### Deletion Removes from Listings

When a product is deleted by the seller, it is marked with a deleted status and immediately no longer appears in search results or category browse listings. Customers will not be able to find deleted products through normal browsing or search functionality. However, the product record and all associated snapshots are preserved in the system for historical records and order fulfillment purposes. Deleted products that have been purchased will still be visible within historical order records.

## ProductImage Rules

Product images are uploaded and associated with a specific product listing. Multiple images can be attached to a single product to show different angles or variations. Each image has a display order that determines the sequence in which images appear. The first image in display order serves as the main thumbnail shown in search results and listings. Sellers can reorder images to change which image appears as the thumbnail. Sellers can remove images from products, and the remaining images maintain their relative ordering. Image changes are included when product snapshots are created.

### ProductImage Upload and Storage

### Multiple Image Upload

THE system SHALL allow sellers to upload multiple images for each product.

THE system SHALL store each uploaded image with a reference to its parent product.

WHEN a seller uploads images, THE system SHALL accept images without a predefined limit on quantity.

WHEN a seller attempts to upload an image with an unsupported format, THE system SHALL reject the upload and display an error message.

### Image Display Order

THE system SHALL assign a display order value to each image upon upload.

THE system SHALL automatically set the first uploaded image as display order 1.

THE system SHALL increment the display order for subsequently uploaded images.

### Main Thumbnail Image

THE system SHALL designate the image with the lowest display order value as the main thumbnail image.

WHEN a product appears in search results or category listings, THE system SHALL display the main thumbnail image.

IF a product has no images, THE system SHALL display a placeholder image in listings.

### Image Reordering

THE system SHALL allow sellers to change the display order of images for their products.

WHEN a seller moves an image to a new position, THE system SHALL reassign display order values to maintain sequential ordering without gaps.

IF a seller moves an image to display as first, THE system SHALL update that image to be the main thumbnail.

### Image Deletion by Seller

THE system SHALL allow sellers to delete images from their own products.

WHEN a seller deletes an image, THE system SHALL remove the image reference from the product.

WHEN the main thumbnail image is deleted, THE system SHALL automatically designate the next available image with the lowest display order as the new main thumbnail.

IF only one image remains after deletion, THE system SHALL ensure that image is designated as the main thumbnail.

### Image Inclusion in Product Snapshots

THE system SHALL include all product images in the product snapshot when a snapshot is created.

THE snapshot SHALL capture the complete list of images including image references and their display order values at the time of snapshot creation.

WHEN an image is added, deleted, or reordered, THE system SHALL include the updated image state in subsequent product snapshots.

THE system SHALL preserve image snapshot data even after the original image is removed from the product.

### ProductImage Validation and Constraints

### Image Validation Rules

THE system SHALL validate uploaded images meet minimum dimension requirements.

THE system SHALL validate uploaded images meet maximum file size requirements.

IF an uploaded image fails validation, THE system SHALL reject the upload and return an error describing the validation failure.

### Image Reordering Constraints

THE system SHALL only allow the product owner to reorder images.

IF the seller is not the owner of the product, THE system SHALL reject the reordering request.

THE system SHALL validate that the requested display order values are within the valid range for the product's image set.

### Image Deletion Constraints

THE system SHALL only allow the product owner to delete images.

IF the seller is not the owner of the product, THE system SHALL reject the deletion request.

### Image Snapshot Constraints

THE system SHALL create an immutable snapshot of all images whenever a product edit occurs.

THE image snapshot SHALL be included within the product snapshot structure.

WHEN capturing images for a snapshot, THE system SHALL record the complete image data state including all image references, display order values, and timestamps.

## ProductVariant Rules

Product variants represent specific combinations of options such as size and color. Each variant must have a unique SKU code that identifies it within the product. Variants must include their option values specifying exactly what combination they represent. Variants have their own price that can override the product base price, or use the base price if no override is set. Each variant must have a stock quantity, initialized at zero for new variants. The SKU code must be unique across all products on the platform to prevent inventory conflicts. A product becomes purchasable only when it has at least one variant with stock greater than zero.

### SKU Code Uniqueness

The SKU code assigned to a product variant must be unique across the entire platform. No two variants, even from different sellers or different products, may share the same SKU code.

A SKU code is required when creating a variant. The system must reject any attempt to create a variant without a SKU code.

When attempting to create a variant with a SKU code that already exists in the system, the request must be rejected with an appropriate error message.

The uniqueness constraint applies regardless of whether the existing variant with the same SKU code is active or deleted. A deleted variant's SKU code remains reserved and cannot be reused.

### Variant Option Values

Each product variant must include option values that describe exactly what combination of product options it represents.

Option values are required and must clearly specify each dimension of variation for the product. For example, a shirt product might have variants with option values like "color: red, size: large" or "color: blue, size: small."

The option values must be provided as a structured set of name-value pairs. Each variant within the same product must have a distinct combination of option values.

When editing a variant, the option values can be updated to reflect changes in the product options available.

### Price Override Configuration

A product variant can have its own price that overrides the product's base price. This allows sellers to price variants differently based on cost, demand, or other factors.

When a variant has a price override set, that override price is used for the variant in all calculations and displays.

When a variant does not have a price override, the system's calculations fall back to the product's base price.

The price override is optional. Sellers may leave it blank if they want the variant to always use the base price.

### Stock Quantity Initialization

When a new product variant is created, its stock quantity must be initialized. New variants start with a stock quantity of zero.

A variant with zero stock is considered out of stock and cannot be added to a customer's shopping cart.

Sellers must explicitly add inventory to a variant before it can fulfill orders.

The stock quantity can be increased or decreased through inventory management operations.

### Variant Availability Rule

A product variant is considered available for purchase when it has stock quantity greater than zero and is not marked as deleted.

A variant with zero stock is shown as out of stock on product listings and detail pages. Customers cannot add out of stock variants to their cart.

When a variant's stock quantity changes to zero, it immediately becomes unavailable for new orders.

When a variant is deleted, it is no longer available regardless of its previous stock quantity.

### Product Purchasability Requirement

A product becomes purchasable only when it meets specific inventory requirements. The product must have at least one variant that is available.

A product with no variants at all is visible in search results and category listings but is displayed as unavailable. Customers cannot add such products to their cart.

A product with only deleted variants is treated the same as a product with no variants for purchasability purposes.

A product with variants but none having stock greater than zero is also displayed as unavailable.

## InventoryRecord Rules

Inventory records track all changes to a variant's stock quantity over time. Each inventory record must include a quantity change value, which is positive for restocking and negative for orders or adjustments. Every inventory record requires a reason explaining why the quantity changed, such as restock, sale, adjustment, or return. The timestamp records when the inventory change occurred. Current stock is calculated by summing all inventory records for a variant, not stored as a single value. Inventory records are not snapshots and can be created, updated, or deleted. When stock reaches zero or falls below zero, the variant is considered out of stock.

### Quantity Change Tracking

### Quantity Change Tracking

THE system SHALL record every change to a product variant's stock quantity as an inventory record.

Each inventory record MUST contain the quantity change value, which indicates how much stock was added or removed.

Inventory records serve as the complete audit trail for all stock movements.

THE system SHALL support inventory records for the following scenarios: restocking from suppliers, customer order fulfillment, inventory adjustments for damaged or lost items, order cancellations, and refund processing.

### Restocking Operations

WHEN a seller adds inventory to a product variant, THE system SHALL create an inventory record with a positive quantity change value.

Positive quantity change values represent additions to the current stock level.

THE system SHALL require the seller to specify the quantity being added and a reason for the restock.

### Order and Deduction Operations

WHEN a customer places an order for a product variant, THE system SHALL automatically create an inventory record with a negative quantity change value equal to the ordered quantity.

Negative quantity change values represent removals from the current stock level.

WHEN a seller processes an inventory adjustment for damaged or lost items, THE system SHALL create an inventory record with a negative quantity change value and a reason explaining the adjustment.

### Reason Documentation Requirements

THE system SHALL require a reason for every inventory record creation.

Valid reasons include but are not limited to: restock from supplier, sale, inventory adjustment for damage, inventory adjustment for loss, order cancellation, refund processed, and manual correction.

THE reason MUST be a non-empty text field that explains why the quantity change occurred.

If the reason is missing or empty, THE system SHALL reject the inventory record creation.

### Timestamp Recording

THE system SHALL automatically record the timestamp when an inventory change occurs.

The timestamp MUST reflect the exact date and time when the inventory record was created.

Timestamps are used to calculate current stock levels and maintain chronological inventory history.

### Stock Calculation Method

THE system SHALL calculate the current stock quantity for a product variant by summing all inventory records for that variant.

The current stock equals the sum of all positive quantity changes minus the sum of all negative quantity changes.

Current stock is NOT stored as a single value but rather derived from the complete inventory record history.

### Inventory Record Mutability

UNLIKE snapshots, inventory records CAN be created, updated, and deleted.

Sellers MAY correct erroneous inventory records by updating the quantity change value or reason.

Sellers MAY delete inventory records if they were created in error, subject to business constraints.

However, deleting an inventory record that corresponds to a completed order or shipment may not be permitted.

### Out of Stock Detection

THE system SHALL mark a product variant as "out of stock" when the calculated current stock quantity reaches zero or falls below zero.

A variant with zero or negative calculated stock SHALL NOT be addable to customer shopping carts.

THE system SHALL display an "out of stock" indicator on product detail pages and in search results for variants with zero or negative stock.

Sellers MAY create inventory records with negative stock values only when processing adjustments for lost or damaged inventory that has already been accounted for in sales records.

## Review Rules

Reviews must include a rating between one and five stars, with one being the lowest and five being the highest. Reviews can optionally include text content to provide additional feedback. Only customers who have purchased and received a product can write a review for that product. One review is allowed per product per order, preventing multiple reviews for the same purchase. Reviews can be edited by the customer who wrote them, creating a snapshot of the previous state. Reviews can be deleted by the customer who wrote them, but the deletion is soft and snapshots are preserved. Deleted reviews still exist in the database but are marked as deleted and hidden from display. The product's average rating is calculated from all non-deleted reviews.

### Review Rating Range

Every review must include a rating value. The rating represents a star rating from one to five stars. A rating of one star indicates the lowest satisfaction level, while five stars indicates the highest satisfaction level. Ratings must fall within this range and cannot be zero, negative, or greater than five. Reviews without a rating are not accepted by the system. The rating field is mandatory and cannot be omitted when submitting a review.

### Review Text Content

Reviews may optionally include text content to provide additional feedback beyond the star rating. When text content is provided, it allows customers to describe their experience, explain the reasoning behind their rating, or provide details that help other customers make informed decisions. Text content is not required for a review to be valid. Customers can choose to leave only a rating without any written text. The text content field accepts free-form text input and does not have a minimum length requirement when provided.

### Review Purchase Eligibility

A customer can only write a review for a product if they have actually purchased and received that product. Specifically, the customer must have at least one order item for that product with a status of "delivered". This requirement prevents fraudulent or uninformed reviews. Customers cannot review products they have not purchased, products they have only ordered but not received, or products purchased by other customers. The system validates that the customer has a delivered order item for the product before allowing a review to be submitted.

### Review Uniqueness Per Order

Each customer is limited to writing one review per product for each order. If a customer purchases the same product across multiple different orders, they can write one review per order, resulting in multiple reviews for the same product across different purchases. However, within a single order, the customer cannot submit multiple reviews for the same product, even if they purchased multiple quantities of that item. One order containing three units of a product results in one eligible review for that product, not three separate reviews.

### Review Editing Capability

Customers can edit reviews they have previously written. When a customer edits their review, the system preserves a snapshot of the previous review state before applying the changes. The customer can modify the rating value and the text content. The edited review replaces the current version while the previous version is stored as an immutable snapshot for record-keeping and dispute resolution purposes. Only the customer who originally wrote a review can edit that review. Other customers, sellers, or administrators cannot modify reviews written by others.

### Review Deletion and Soft Delete

Customers can delete reviews they have written. When a review is deleted, the system performs a soft delete, which means the review record remains in the database but is marked as deleted. The review is hidden from public display on the product detail page and is excluded from calculations such as average ratings. However, the review data itself is preserved along with any associated snapshots. Soft-deleted reviews can be retrieved by administrators for dispute resolution or audit purposes. Only the customer who wrote a review can delete that review.

### Average Rating Calculation

The average rating displayed on a product is calculated from all non-deleted reviews for that product. When calculating the average, the system sums the rating values from all valid reviews and divides by the count of those reviews. Reviews that have been soft-deleted are excluded from this calculation. If all reviews for a product are deleted, the average rating displays as zero or no rating. The average rating updates automatically whenever a new review is added, an existing review is edited, or a review is deleted. This ensures the displayed rating always reflects the current state of genuine customer feedback.

## Wishlist Rules

The wishlist belongs to a single customer and tracks products the customer is interested in purchasing later. Customers can add products to their wishlist directly without selecting a specific variant. The wishlist records when each product was added for sorting and display purposes. Products that are deleted by sellers are automatically removed from all customer wishlists. Customers can view their complete wishlist with pagination for large collections.

### Wishlist Ownership

Each customer has exactly one wishlist associated with their account. The wishlist is automatically created when the customer registers and persists for the lifetime of the customer account. Customers cannot create additional wishlists or delete their single wishlist. The wishlist tracks products the customer is interested in purchasing at a later time.

THE system SHALL enforce that wishlist ownership is exclusive to the customer who owns it. A customer can only view, modify, or remove items from their own wishlist. Other customers cannot access or modify another customer's wishlist.

### Product Wishlist Tracking

Products are added to the wishlist at the product level, not the variant level. When a customer adds a product to their wishlist, the system records only the product reference, not any specific variant selection. This allows the customer to decide on specific variant options (such as size or color) at the time of actual purchase.

A product can appear only once in a customer's wishlist regardless of how many times the customer attempts to add it. If a customer attempts to add a product that already exists in their wishlist, the system SHALL reject the duplicate addition and notify the customer that the product is already in their wishlist.

### Add to Wishlist Timing

Customers can add a product to their wishlist at any time, regardless of the product's current availability or stock status. Products can be added to the wishlist whether they are in stock, out of stock, or have variants with varying availability levels.

The addition to wishlist is not time-restricted and does not require any preconditions other than an active customer account. Customers may add products before placing an order or during browsing without purchasing.

### Automatic Removal on Product Deletion

When a seller deletes a product from the platform, the system SHALL automatically remove that product from all customer wishlists where it appears. This removal happens as part of the product deletion process and does not require any action from the customer.

Deleted products do not appear in search results or category listings. If a customer navigates to their wishlist, products that have been deleted by sellers are not displayed. Customers are not notified when products are removed from their wishlist due to deletion by sellers.

### Wishlist Pagination

When viewing their wishlist, customers see a paginated list of products they have added. The system SHALL return a fixed number of products per page to prevent performance issues with large wishlists.

The wishlist displays products in reverse chronological order based on when each product was added, with the most recently added products appearing first. Customers can navigate through multiple pages to view their complete wishlist if it exceeds a single page.

### Wishlist Timestamp Recording

When a customer adds a product to their wishlist, the system SHALL record the exact timestamp of when the addition occurred. This timestamp is stored with the wishlist item and is used for sorting purposes, showing when each product was added relative to others.

The timestamp is displayed alongside each wishlist item to help customers remember when they added particular products. Customers can use this information to identify products they may have been interested in for a long time versus recently added items.

## WishlistItem Rules

Wishlist items represent individual products added to a customer's wishlist. Each wishlist item records when the product was added for chronological display. A product can only appear once in a customer's wishlist, preventing duplicate entries. When a product is deleted by its seller, the system automatically removes related wishlist items across all customers.

### Product Reference Requirement

Each wishlist item must reference exactly one product. The product reference is required and cannot be null when adding an item to a wishlist. The referenced product determines what information is displayed to the customer when viewing their wishlist. A wishlist item cannot exist without an associated product.

### Added Timestamp

Every wishlist item records the exact date and time when it was added to the wishlist. This timestamp is automatically set by the system when the item is created and cannot be modified afterward. The timestamp is used to display items in chronological order, showing the most recently added items first or allowing customers to sort by when they saved items.

### No Duplicate Products

A product can only appear once in a customer's wishlist. When a customer attempts to add a product that already exists in their wishlist, the system rejects the request. This prevents duplicate entries and ensures a clean wishlist experience. The uniqueness constraint applies per customer, meaning the same product can exist in different customers' wishlists. When checking for duplicates, the system compares the customer identifier and the product identifier.

### Automatic Removal on Product Deletion

When a seller deletes a product from the platform, the system automatically removes all wishlist items associated with that product across all customers. This automatic cleanup ensures that wishlist references remain valid and customers are not presented with unavailable products. The removal happens immediately when a product is deleted. Customers are not notified of this removal, and the wishlist continues to display any remaining items.

## Cart Rules

Each customer has one shopping cart that accumulates items they intend to purchase. The cart is created when the customer first adds an item and persists for future sessions. The cart tracks when it was created and maintains a record of all items currently in it. Cart contents are specific to each customer and are not shared between accounts.

### Single Cart Per Customer

The system SHALL ensure that each customer has exactly one shopping cart. A customer cannot have multiple carts simultaneously. When a customer registers, no cart is created until they add their first item. The cart relationship is one-to-one between customer and cart.

THE system SHALL enforce that no customer can access, view, or modify another customer's cart.

### Cart Creation on First Item

THE system SHALL create a shopping cart automatically when a customer adds their first item to the cart. The cart creation timestamp SHALL be recorded at the time of first item addition.

THE system SHALL NOT create an empty cart for customers who have not added any items.

### Cart Persistence

THE system SHALL persist the shopping cart indefinitely after creation. The cart SHALL remain associated with the customer across all subsequent sessions until the customer deletes their account or the items are purchased.

THE system SHALL restore the customer's cart contents when the customer logs in, regardless of how much time has passed since their last session.

### Cart Timestamp Tracking

THE system SHALL record the cart creation timestamp when the cart is first created.

THE system SHALL associate this timestamp with the cart for record-keeping purposes.

THE system SHALL NOT modify the cart creation timestamp once it has been set.

### Customer Cart Isolation

THE system SHALL maintain strict isolation between customer carts. Each customer's cart data SHALL be accessible only to that customer.

THE system SHALL prevent any cross-customer cart access, including but not limited to viewing another customer's cart contents, modifying another customer's cart items, or transferring items between carts.

THE system SHALL enforce cart isolation at the data access layer.

## CartItem Rules

Cart items represent specific product variants that customers add to their cart. Each cart item must reference a specific variant, not just the parent product. The quantity for each cart item must be at least one and within a reasonable maximum to prevent abuse. When adding a variant that already exists in the cart, the quantities are combined rather than creating a duplicate entry. Cart items record when they were added for tracking purposes. If a variant becomes unavailable or out of stock, the cart item is marked accordingly. If the variant is deleted by the seller, the cart item cannot be processed for checkout.

### Specific Variant Requirement

### Specific Variant Requirement

Cart items must reference a specific product variant, not merely the parent product. Customers cannot add a product without selecting a particular combination of options such as color and size. The system shall reject any attempt to add a product directly to the cart without a variant selection.

Each cart item links to exactly one product variant. This ensures that when customers proceed to checkout, they are purchasing precisely what they selected rather than leaving variant selection to ambiguity.

### Quantity Constraints

### Quantity Constraints

#### Minimum Quantity

The quantity for any cart item must be at least one. The system shall reject attempts to add a variant with a quantity of zero or negative values. A cart item represents a commitment to purchase, and zero-quantity items have no meaning in the checkout process.

#### Maximum Quantity

The quantity for any cart item must not exceed ninety-nine. The system shall reject attempts to add or update a cart item quantity beyond this maximum. This constraint prevents potential abuse and ensures fair access to inventory for all customers.

### Duplicate Variant Handling

### Duplicate Variant Handling

#### Quantity Combination Rule

When a customer attempts to add a variant that already exists in their cart, the quantities shall be combined rather than creating a separate cart entry. The combined quantity must still respect the maximum quantity constraint of ninety-nine. If the combined quantity would exceed the maximum, the system shall reject the addition and notify the customer of the constraint.

#### Single Line Item per Variant

Each product variant shall appear at most once in a customer's cart. The system shall never display multiple line items for the same variant. This maintains a clean cart view and simplifies checkout review.

### Timestamp Tracking

### Timestamp Tracking

#### Added Timestamp Recording

Every cart item records the timestamp when it was added to the cart. This timestamp is set automatically by the system at the moment the item enters the cart and cannot be modified by users. The timestamp serves as a reference for cart management and helps customers understand when they added items.

### Unavailable Variant Handling

### Unavailable Variant Handling

#### Out-of-Stock Marking

When a cart item's variant has zero stock quantity, the cart item shall be marked as unavailable. The unavailable item remains visible in the cart but cannot be included in checkout. The cart shall display a warning indicating insufficient stock for unavailable items.

#### Stock Warning Threshold

If a variant's current stock quantity is less than the quantity specified in the cart, the cart item shall display a warning to the customer. The warning indicates that only a smaller quantity is currently available. The customer may adjust the quantity before proceeding to checkout.

#### Checkout Exclusion

The checkout process shall automatically exclude all unavailable items. The system shall only allow customers to complete payment for available items with sufficient stock. Customers must resolve unavailable items before proceeding.

### Deleted Variant Handling

### Deleted Variant Handling

#### Deleted Variant Detection

When a product variant has been deleted by the seller, cart items referencing that variant shall be marked as unavailable. Deleted variants cannot be recovered or reordered. The cart shall indicate that the item is no longer available and prompt the customer to remove it.

#### Checkout Prevention

Deleted variants cannot be included in checkout under any circumstances. The system shall block checkout attempts that include deleted cart items. The customer must remove deleted items from the cart before completing a purchase.

#### Automatic Cart Cleanup Consideration

While deleted items remain visible with an unavailable status, customers are responsible for removing them from their cart. The system does not automatically delete cart items referencing deleted variants; instead, it maintains visibility so customers can manage their cart contents deliberately.

## Order Rules

Orders must have a unique order number generated at the time of creation for identification and tracking. Every order must be associated with a valid shipping address where items will be delivered. The total price is calculated from all order items and represents the amount the customer paid. Orders contain multiple items, which may come from different sellers. Once an order is placed, the shipping address cannot be changed. Order items are created from cart items at the time of purchase, with snapshots of product and seller data.

### Order Number Generation

Every order must have a unique order number assigned at the time of creation.

THE system SHALL generate an order number that is unique across all orders in the platform.

THE order number SHALL be used for customer identification and tracking of orders.

Order numbers must remain unchanged throughout the order lifecycle.

No two orders may share the same order number at any point in time.

If the order number generation mechanism produces a collision, THE system SHALL regenerate until a unique number is obtained.

### Shipping Address Association

Every order must be associated with exactly one valid shipping address.

THE system SHALL require a shipping address to be selected before order placement can proceed.

When an order is created, THE system SHALL store a reference to the selected shipping address.

The selected shipping address must belong to the customer placing the order.

If the referenced shipping address is later deleted by the customer, THE system SHALL preserve the address data with the order for delivery and record-keeping purposes.

An order cannot be created without a shipping address.

### Total Price Calculation

The total price of an order represents the sum of all order items.

THE system SHALL calculate the total price by summing the unit price multiplied by quantity for each order item.

The total price SHALL reflect the exact amount the customer paid at the time of purchase.

Individual item prices are locked at the time of order creation and do not change if the product price changes later.

The total price SHALL be stored with the order and displayed to the customer.

When refunds are processed, the refund amount is calculated per item based on the locked unit price, not the current product price.

### Multiple Seller Support

Orders may contain items from multiple different sellers.

THE system SHALL allow a single order to include products from any number of sellers.

Each order item within an order is associated with its respective seller.

Items from different sellers may have different fulfillment timelines.

Order items from different sellers are shipped separately as individual shipments by their respective sellers.

The order aggregates all items regardless of seller for customer convenience.

### Shipping Address Immutability

Once an order is placed, the shipping address cannot be changed.

THE system SHALL prevent any modification to the shipping address after order creation.

This rule applies regardless of order status, including paid, shipped, or delivered orders.

If the customer needs a different shipping address, they must cancel the existing order and place a new one with the correct address.

The immutability of the shipping address ensures order integrity and prevents delivery to incorrect addresses.

### Snapshot at Order Creation

At the time of order creation, THE system SHALL capture snapshots of product and seller data for each order item.

THE system SHALL create a product snapshot containing all product fields including name, description, category, base price, and images.

THE system SHALL create a variant snapshot containing the SKU code, option values, and price at the time of purchase.

THE system SHALL create a seller profile snapshot containing the shop name, description, and logo at the time of purchase.

These snapshots SHALL be stored with the order item and used for display in order history.

Snapshots ensure that order history shows the exact state of products and sellers at the time of purchase, even if they change later.

Product snapshots preserve the complete state of the product and all its variants at the moment of purchase.

Seller profile snapshots preserve the shop name and logo that were visible to the customer when they made the purchase.

## OrderItem Rules

Order items represent specific product variants purchased within an order. Each order item has a quantity indicating how many units were purchased. The unit price is locked at the time of purchase from the product snapshot. Each order item has its own status independent of other items in the same order. Order items can only be cancelled if their status is paid and they have not yet shipped. Order items can only be refunded if their status is delivered and within seven days of delivery. Order items maintain snapshots of the product and seller profile at the time of purchase.

### Order Item Quantity

### Order Item Quantity

WHEN a customer places an order, EACH order item MUST specify a quantity between one and ninety-nine units.

THE system SHALL require that the quantity does not exceed the available stock of the product variant at the time of order placement.

THE system SHALL store the quantity as a locked value that cannot be modified after the order is created.

### Locked Unit Price at Purchase

WHEN an order is successfully created, THE system SHALL capture and lock the unit price for each order item from the product variant at that moment.

THE locked unit price SHALL be stored as part of the order item record and SHALL remain unchanged even if the seller later modifies the product variant price.

THE locked unit price SHALL be used for all subsequent calculations including refunds.

### Independent Item Status

THE system SHALL treat each order item status as independent from other order items within the same order.

WHILE an order contains multiple order items, THE system SHALL allow individual order items to have different statuses (paid, shipped, delivered, cancelled, refunded) without affecting the status of other items.

THE overall order status SHALL be derived from the statuses of its items according to the following rules:
- If all items are paid, the order status is "paid"
- If any item is shipped and none are delivered yet, the order status is "shipped"
- If all items are delivered, the order status is "delivered"
- If all items are cancelled, the order status is "cancelled"
- If all items are refunded, the order status is "refunded"
- If items have mixed statuses such as some delivered and some refunded, the order status is "partially completed"

### Cancellation Eligibility Rule

WHEN a customer requests cancellation of an order item, THE system SHALL verify that the order item status is "paid" before accepting the request.

IF the order item status is not "paid", THE system SHALL reject the cancellation request and inform the customer that the item cannot be cancelled because it has already been shipped or processed.

IF the order item status is "paid", THE system SHALL allow the customer to submit a cancellation request with a reason.

### Refund Eligibility Rule

WHEN a customer requests a refund for an order item, THE system SHALL verify that the order item status is "delivered" before accepting the request.

IF the order item status is not "delivered", THE system SHALL reject the refund request and inform the customer that the item must be delivered before a refund can be requested.

IF the order item status is "delivered", THE system SHALL verify that the refund request is submitted within seven days of the delivery timestamp.

IF seven days have passed since delivery, THE system SHALL reject the refund request and inform the customer that the refund window has expired.

### Seven Day Refund Window

THE system SHALL calculate the seven day refund window starting from the moment the customer confirms delivery or from the automatic delivery timestamp (fourteen days after shipping if the customer does not confirm delivery).

THE system SHALL reject any refund request submitted after the seven day window has elapsed.

THE system SHALL display the remaining refund window time to the customer when viewing eligible order items.

### Product Snapshot at Purchase

WHEN an order is successfully placed, THE system SHALL create a product snapshot capturing all product fields including name, description, category, base price, and all images at that moment.

THE product snapshot SHALL be stored in association with the order item and SHALL be immutable.

THE product snapshot SHALL also include snapshots of all product variants at the time of purchase, capturing each variant's SKU code, option values, and price.

THE system SHALL display the product snapshot information when the customer views their order history, even if the product has since been modified or deleted.

### Seller Snapshot at Purchase

WHEN an order is successfully placed, THE system SHALL create a seller profile snapshot capturing the shop name, shop description, and logo image of the seller at that moment.

THE seller profile snapshot SHALL be stored in association with each order item and SHALL be immutable.

THE system SHALL display the seller snapshot information when the customer views their order history, showing the shop name and logo as they appeared at the time of purchase even if the seller has since modified their profile.

## Shipment Rules

Shipments are created by sellers to send ordered items to customers. Each shipment must include a carrier name identifying the shipping service used. Each shipment must include a tracking number for customers to monitor delivery progress. The shipment records when items were shipped for delivery date calculations. Items within the same shipment share the same tracking information. Shipments can contain one or more order items from the same seller. When a shipment is created, all items within it change to shipped status.

### Carrier Name Requirement

THE system SHALL require that a carrier name be provided when creating a shipment.

THE carrier name SHALL identify the shipping service or logistics provider used for delivery.

WHEN a carrier name is not provided during shipment creation, THEN the system SHALL reject the request.

THE system SHALL store the carrier name as part of the shipment record for customer reference.

### Tracking Number Requirement

THE system SHALL require that a tracking number be provided when creating a shipment.

THE tracking number SHALL uniquely identify the package within the carrier's tracking system.

WHEN a tracking number is not provided during shipment creation, THEN the system SHALL reject the request.

THE system SHALL store the tracking number as part of the shipment record for delivery monitoring.

WHEN a customer views their order details, THEN the system SHALL display the tracking number associated with each shipment.

### Shipped Timestamp Recording

THE system SHALL automatically record the date and time when a shipment is created.

THE shipped timestamp SHALL be stored as part of the shipment record.

WHEN a seller creates a shipment, THEN the system SHALL capture the current date and time as the shipped timestamp.

THE shipped timestamp SHALL be used to calculate the automatic delivery confirmation window.

IF a customer does not confirm delivery within 14 days from the shipped timestamp, THEN the system SHALL automatically update the status of items in that shipment to delivered.

### Shared Tracking Per Shipment

THE system SHALL associate all items within a single shipment with the same tracking information.

WHEN a shipment is created with a carrier name and tracking number, THEN all included order items SHALL share those tracking details.

THE system SHALL ensure that customers can view the complete tracking information for any shipment.

WHEN displaying shipment details to customers, THEN the system SHALL show the carrier name, tracking number, and shipped date together.

### Single Seller Per Shipment Constraint

THE system SHALL allow only order items from a single seller to be included in a shipment.

WHEN a seller attempts to include order items from another seller in a shipment, THEN the system SHALL reject the request.

THE system SHALL verify that all selected order items belong to the same seller before creating the shipment.

IF a seller has multiple order items for the same product or different products, THEN those items MAY be bundled into a single shipment by that seller.

IF order items belong to different sellers, THEN each seller SHALL create a separate shipment for their items.

### Status Change On Shipment Creation

WHEN a seller successfully creates a shipment, THEN the system SHALL automatically update the status of all order items included in that shipment to shipped.

THE system SHALL change the status of each affected order item from paid to shipped.

IF any order item in the shipment fails to update its status, THEN the system SHALL not create the shipment and SHALL report the error.

THE status change SHALL be recorded with the shipped timestamp from the shipment.

IF an order contains items from multiple sellers, THEN only the items in the newly created shipment SHALL have their status changed; other items SHALL remain unchanged until their respective sellers create their shipments.

## CancellationRequest Rules

Cancellation requests allow customers to stop an order item before it ships. The request must include a reason explaining why the customer wants to cancel. Cancellation requests can only be submitted for items with paid status that have not yet shipped. The request status progresses through pending, approved, and rejected states. A snapshot is created when the seller responds to the request, recording the final state. Once approved, the order item status changes to cancelled and stock is restored. Rejected requests allow the order item to continue processing normally.

### Cancellation Reason Requirement

Every cancellation request submitted by a customer MUST include a written reason explaining why the cancellation is requested.

THE system SHALL require the reason field to be non-empty before accepting a cancellation request.

THE system SHALL reject cancellation requests that do not include a reason.

The reason field serves as documentation for the seller to evaluate the request and for dispute resolution purposes.

When a cancellation request is rejected by the seller, the recorded reason is preserved as part of the request history.

### Order Item Eligibility for Cancellation

Cancellation requests can only be submitted for order items that have a status of "paid".

THE system SHALL prevent customers from requesting cancellation for order items with any other status.

An order item with status "paid" indicates that payment has been completed but the item has not yet been shipped.

Once an order item has been shipped, delivered, cancelled, or refunded, it is no longer eligible for cancellation requests.

The system SHALL verify the order item status at the time of submission and reject requests for ineligible items.

A customer can submit multiple cancellation requests for different order items within the same order.

### Cancellation Request Status Lifecycle

A cancellation request transitions through a defined status lifecycle: pending, approved, and rejected.

THE system SHALL set the initial status of a new cancellation request to "pending".

When a seller approves a pending cancellation request, THE system SHALL change the request status to "approved".

When a seller rejects a pending cancellation request, THE system SHALL change the request status to "rejected".

Once a cancellation request reaches "approved" or "rejected" status, THE system SHALL NOT allow further status changes.

The request status is independent of the order item status until the seller responds to the request.

### Snapshot Creation on Seller Response

When a seller responds to a cancellation request by approving or rejecting it, THE system SHALL automatically create a snapshot to preserve the final state of the request.

THE snapshot SHALL include the original cancellation reason submitted by the customer.

THE snapshot SHALL include the final status of the request (approved or rejected).

THE snapshot SHALL include the timestamp when the seller responded.

THE snapshot SHALL include any additional context relevant to the response decision.

The snapshot is immutable and can be viewed by the customer, seller, and administrators for dispute resolution.

### Effects of Approved Cancellation

When a cancellation request is approved by the seller, THE system SHALL change the associated order item status to "cancelled".

When an order item is cancelled, THE system SHALL restore the stock quantity for the corresponding product variant.

Stock restoration is achieved by creating an inventory record with a positive quantity equal to the cancelled item quantity.

The inventory record reason SHALL indicate that the restoration resulted from a cancellation.

The refund process is initiated for the cancelled item, returning the payment to the customer.

The cancelled order item can no longer be shipped or processed by the seller.

### Effects of Rejected Cancellation

When a seller rejects a cancellation request, THE system SHALL allow the associated order item to continue through the normal order processing workflow.

THE system SHALL NOT change the order item status when a cancellation request is rejected.

THE system SHALL NOT restore stock or initiate refunds when a cancellation request is rejected.

The order item retains its current status of "paid" and remains eligible for shipping by the seller.

The customer is notified of the rejection and can proceed with the order normally.

A rejected cancellation request does not prevent the customer from requesting a refund after the item is delivered, subject to the refund eligibility rules.

## RefundRequest Rules

Refund requests allow customers to request money back for delivered items. The request must include a reason explaining why the customer wants a refund. Refund requests can only be submitted for items with delivered status within seven days of delivery. The request status progresses through pending, approved, and rejected states. A snapshot is created when the seller responds to the request, recording the final state. Once approved, the order item status changes to refunded and stock may be restored based on item condition.

### Refund Reason Requirement

THE system SHALL require customers to provide a reason when submitting a refund request.

THE system SHALL reject any refund request that does not include a reason.

THE refund reason SHALL be a text field with content length between 1 and 1000 characters.

THE refund reason SHALL be visible to the seller reviewing the request and to administrators overseeing the transaction.

### Delivered Status Requirement

THE system SHALL only allow refund requests for order items with status "delivered".

THE system SHALL reject refund requests for order items that have not been delivered.

THE system SHALL reject refund requests for order items that have already been cancelled or refunded.

THE system SHALL verify the current status of the order item before accepting a refund request submission.

### Seven Day Refund Window

THE system SHALL only accept refund requests within seven days of the order item being marked as delivered.

THE system SHALL calculate the refund window based on the delivery confirmation timestamp recorded in the shipment.

THE system SHALL reject refund requests submitted after the seven day window has expired.

THE system SHALL display the remaining time available to request a refund when a customer views a delivered item.

### Pending Approval State

THE system SHALL assign a status of "pending" to newly submitted refund requests.

THE system SHALL notify the relevant seller when a refund request is submitted for their product.

THE system SHALL allow sellers to view all pending refund requests for their products.

THE system SHALL allow sellers to approve or reject pending refund requests.

THE system SHALL change the refund request status to "approved" or "rejected" when the seller responds.

### Snapshot on Seller Response

THE system SHALL create a snapshot when a seller responds to a refund request.

THE snapshot SHALL be created regardless of whether the seller approves or rejects the request.

THE snapshot SHALL capture the complete state of the refund request at the time of seller response, including the request reason, the original request timestamp, the seller response timestamp, and the outcome.

THE snapshot SHALL be immutable and preserved for dispute resolution purposes.

THE snapshot SHALL be accessible to administrators for oversight purposes.

### Stock Restoration Consideration

WHEN a refund request is approved, THE system SHALL restore the stock quantity for the affected product variant.

THE stock restoration SHALL be recorded as a positive inventory record with a reason indicating refund completion.

THE restored quantity SHALL equal the quantity that was purchased in the original order item.

THE system SHALL NOT restore stock when a refund request is rejected.

THE system SHALL verify successful stock restoration before finalizing the refund approval.

### Rejection Maintains Delivered Status

WHEN a seller rejects a refund request, THE system SHALL keep the order item status as "delivered".

THE system SHALL NOT modify the order item status when a refund request is rejected.

THE rejected order item SHALL remain accessible for potential future refund requests within the original seven day window.

THE system SHALL notify the customer when their refund request has been rejected, including the rejection outcome and the unchanged delivery status.

## Snapshot Rules

Snapshots preserve the complete state of data at a specific point in time for audit and dispute resolution. Each snapshot records what type of content it represents, such as product, seller profile, review, or request. Each snapshot references the specific record it captures through the content identifier. The snapshot stores the complete data values that existed before the modification. Snapshots are immutable once created and cannot be modified or deleted. Snapshots include a timestamp indicating when the change occurred. Only authorized parties such as owners and administrators can view snapshots.

### Snapshot Immutability

Snapshots are immutable records that preserve historical data at the moment of creation. Once a snapshot is created, its content cannot be modified or altered by any user, including administrators.

Every time editable data is modified, a new snapshot is created to capture the previous state. The system preserves this historical record even if the original data is subsequently updated or deleted. There is no mechanism to edit, overwrite, or roll back a snapshot to a different state. Each snapshot captures exactly one moment in time and serves as a permanent audit trail for dispute resolution.

### Content Type Identification

Every snapshot must clearly identify what type of content it represents. The system recognizes the following content types that can be snapshotted:

- Products, including all product fields and associated images
- Product variants, including SKU code, option values, and pricing
- Seller profiles, including shop name, description, and logo
- Reviews, including rating and text content
- Cancellation requests, including reason and status changes
- Refund requests, including reason and status changes

When a snapshot is created, the system records the content type to categorize the data being preserved. This identification allows authorized viewers to quickly understand the nature of each snapshot and retrieve relevant historical records when needed.

### Content Reference Tracking

Each snapshot must reference the specific record it captures using a content identifier. This identifier links the snapshot to the exact source record at the time of capture.

For product snapshots, the reference includes a complete representation of all product fields such as name, description, category, base price, and images. Additionally, product snapshots include snapshots of all associated variants at that moment, preserving the complete state of a product and its variants together. This comprehensive reference ensures that even if related records change, the snapshot maintains the full context of what existed when the snapshot was created.

For order-related snapshots, the content reference captures the state of products, variants, and seller profiles at the time of purchase, ensuring that what customers saw and agreed to purchase is preserved regardless of future changes.

### Previous State Preservation

When any editable data is modified, the system preserves the complete previous state before applying changes. The snapshot records both the values that existed before the modification and the new values that replaced them.

This dual-state preservation enables authorized parties to trace exactly what changed, when it changed, and what the value was before the change. For products, this means capturing the entire product state including all images and variant data. For seller profiles, this means capturing shop name, description, and logo. For reviews, this means capturing the rating and text content at the time of the edit.

The preservation mechanism ensures that no historical information is lost during normal system operation, supporting transparency and accountability in all data modifications.

### Timestamp Recording

Every snapshot must record the exact date and time when the change occurred. This timestamp indicates when the modification was made and serves as the authoritative record of when the snapshot was created.

The timestamp is automatically generated by the system at the moment of snapshot creation and cannot be modified or backdated. This provides a precise chronological record of all changes made across the platform.

Timestamp information is included in all snapshots regardless of content type, allowing authorized viewers to reconstruct the timeline of changes for any snapshotted record. This temporal tracking is essential for dispute resolution and audit purposes.

### Authorized Viewer Access

Snapshots can only be viewed by parties who have legitimate access to the information. The following access rules govern snapshot visibility:

Sellers can view snapshots of their own products, product variants, and seller profile. This allows sellers to track changes made to their listings over time.

Customers can view snapshots associated with their own orders, including product snapshots, variant snapshots, and seller profile snapshots that were captured at the time of purchase. This ensures customers have evidence of what they ordered.

Administrators can view snapshots of any product, product variant, seller profile, review, cancellation request, or refund request on the platform. This oversight capability supports policy enforcement and dispute resolution.

Unauthorized users cannot view snapshots that do not relate to their accounts or products. The system validates viewer authorization before displaying snapshot data.

### Non-Deletable Records

Snapshots cannot be deleted under any circumstances, including administrative actions. This non-deletable property ensures that the audit trail remains intact for legal compliance and dispute resolution.

When a product is deleted by a seller, all snapshots of that product and its variants remain in the system. When a seller deletes their account, snapshots of their profile that were captured for orders remain preserved. When a customer deletes their account, snapshots of their reviews remain preserved and display as "deleted user."

The only exception to deletion rules involves the original source records themselves, which may be deleted according to their respective policies. However, the snapshots that captured those records before deletion remain permanently stored. This ensures that historical records necessary for order fulfillment, dispute resolution, and legal compliance are never lost, even when source records are removed from active use.

## ProductSnapshot Rules

Product snapshots capture the complete state of a product and all its variants at a specific moment. The snapshot includes all product fields such as name, description, category, and base price. The snapshot also includes the state of every variant at that moment, preserving SKU codes, option values, and prices. Product snapshots are created automatically whenever a seller edits their product. Product snapshots are created at the time of order placement to lock in the product details. Administrators can view snapshots of any product on the platform.

### ProductSnapshot State Capture

Every product snapshot SHALL capture the complete state of a product at a specific moment in time.

THE system SHALL preserve all product fields within a snapshot, including the product name, product description, assigned category, base price, and all associated images.

THE system SHALL include the state of every variant belonging to the product within the snapshot, capturing each variant's SKU code, option values, price override, and stock quantity.

THE product snapshot SHALL be structured as a single atomic record that contains both the product data and all variant data together, ensuring they represent the same moment in time.

THE snapshot SHALL NOT include inventory history records, as inventory changes are tracked separately through inventory records.

### ProductSnapshot Creation Triggers

THE system SHALL automatically create a product snapshot when a seller edits their product.

THE system SHALL automatically create a product snapshot when an order is placed, capturing the state of all purchased products and their variants at the moment of purchase.

WHEN a product is edited, THE system SHALL create the snapshot before applying the new values, preserving the previous state.

WHEN an order is placed, THE system SHALL create a product snapshot for each unique product included in the order, linking it to the corresponding order item.

Product snapshots created during order placement SHALL be associated with the specific order item and SHALL NOT be modified or deleted.

### ProductSnapshot Viewing Access

Sellers SHALL be permitted to view snapshots of their own products for dispute resolution purposes.

Administrators SHALL be permitted to view snapshots of any product on the platform.

THE system SHALL display the timestamp of when each snapshot was created, indicating when the product state was recorded.

Customers SHALL NOT have direct access to view product snapshots, but they SHALL benefit from snapshots indirectly through order item records that preserve the product details at the time of their purchase.

### ProductSnapshot Immutability

Product snapshots SHALL be immutable once created and SHALL NOT be modified or deleted.

THE system SHALL prevent any user, including administrators, from altering snapshot content after creation.

WHEN a product is deleted by a seller, all previously created snapshots SHALL remain accessible for historical reference and dispute resolution.

The snapshot content SHALL include both the previous state and the new state, enabling reconstruction of changes over time.

## SellerProfileSnapshot Rules

Seller profile snapshots capture the state of a seller's profile at a specific moment. The snapshot includes the shop name, shop description, and logo image URL. These snapshots are created whenever the seller edits their profile information. Seller profile snapshots are created at the time of order placement to preserve how the shop appeared when the customer purchased. This ensures customers always see the seller's information as it was at the time of their order.

### Shop Name Snapshot Preservation

WHEN a seller profile snapshot is created, THE system SHALL preserve the shop name exactly as it appears at the moment of snapshot creation.

THE system SHALL NOT modify or update the preserved shop name after the snapshot is created.

IF the shop name is empty at the time of snapshot creation, THE system SHALL preserve the empty value in the snapshot.

THE preserved shop name in a snapshot SHALL be used when displaying seller information for historical orders.

### Shop Description Snapshot Preservation

WHEN a seller profile snapshot is created, THE system SHALL preserve the shop description exactly as it appears at the moment of snapshot creation.

THE system SHALL preserve shop descriptions even when they are empty.

IF a shop description exceeds any character limits, THE system SHALL preserve the full content in the snapshot without truncation.

Historical shop descriptions preserved in snapshots SHALL remain accessible for dispute resolution purposes.

### Logo Image Snapshot Preservation

WHEN a seller profile snapshot is created, THE system SHALL preserve the logo image URL exactly as it appears at the moment of snapshot creation.

IF the seller has no logo image at the time of snapshot creation, THE system SHALL preserve a reference indicating no logo was present.

THE preserved logo image URL SHALL remain unchanged in the snapshot regardless of subsequent logo changes by the seller.

Historical logo images from snapshots SHALL be displayed when customers view their order history.

### Automatic Creation on Profile Edit

WHEN a seller updates their shop name, THE system SHALL automatically create a seller profile snapshot capturing the previous state before applying the changes.

WHEN a seller updates their shop description, THE system SHALL automatically create a seller profile snapshot capturing the previous state.

WHEN a seller updates their logo image, THE system SHALL automatically create a seller profile snapshot capturing the previous state.

IF multiple profile fields are updated in a single edit operation, THE system SHALL create one snapshot that captures the complete state before the edit.

Snapshots created from profile edits SHALL include a timestamp indicating when the change was made.

Snapshots created from profile edits SHALL identify the seller who made the change.

### Creation at Order Time

WHEN a customer places an order containing items from a seller, THE system SHALL create a seller profile snapshot for that seller at the moment of order creation.

THE snapshot created at order time SHALL capture the seller's current shop name, shop description, and logo image URL.

THE snapshot created at order time SHALL be associated with every order item from that seller in the order.

IF an order contains items from multiple sellers, THE system SHALL create separate seller profile snapshots for each seller.

THE snapshot created at order time SHALL be immutable and SHALL preserve how the shop appeared when the customer made the purchase.

This ensures customers always see the seller's information exactly as it was at the time of their order, even if the seller later changes their profile.

### Historical Shop State Preservation

THE system SHALL preserve seller profile snapshots indefinitely and SHALL NOT allow deletion of any snapshot.

WHEN a seller deletes their account, THE system SHALL preserve all historical seller profile snapshots that were created for past orders.

Preserved snapshots SHALL be viewable by relevant parties including customers who placed orders and administrators.

IF a dispute arises regarding an order, THE system SHALL provide access to the seller profile snapshot that was current at the time of that order.

THE historical shop state preservation SHALL enable verification of what a seller's shop looked like at any point in time.

Customers viewing their order history SHALL see the seller's profile information as it appeared when they placed the order, not the current profile information.

## AdminRequest Rules

Admin requests allow users to request administrator privileges on the platform. The request must include a reason explaining why the user wants to become an administrator. The request must specify the desired administrator grade, either regular or super administrator. Pending requests are reviewed by existing super administrators who can approve or reject them. When approved, the user gains administrator privileges on the platform. Super administrators have additional capabilities including managing other administrators and handling platform-wide oversight.

### Admin Request Reason Requirement

Every admin request must include a reason explaining why the user wants to become an administrator on the platform. The reason must be a non-empty text field describing the user's qualifications, experience, or motivation for the role. Requests submitted without a reason must be rejected. The reason is stored with the request and visible to super administrators during review.

### Grade Specification Requirement

Every admin request must specify the desired administrator grade at the time of submission. The available grades are regular administrator and super administrator. A user requesting super administrator status must provide sufficient justification in the reason field. Regular administrator requests are the default option for new applicants. The requested grade cannot be changed after submission; a new request must be submitted if the user wants a different grade.

### Pending Request State

When a user submits an admin request, the request enters a pending state and awaits review by super administrators. Pending requests are visible in the list of requests for review. While a request is pending, the requesting user cannot submit another admin request. The pending state persists until a super administrator approves or rejects the request. If rejected, the user may submit a new request after addressing the rejection feedback.

### Super Administrator Approval Required

Only super administrators can approve or reject admin requests. Regular administrators do not have the authority to review or act on admin requests. When a super administrator approves a request, the requesting user immediately gains administrator privileges on the platform. When a super administrator rejects a request, the requesting user remains without administrator privileges and may submit a new request at a later time.

### Privilege Grant on Approval

When an admin request is approved, the requesting user is granted administrator privileges corresponding to the approved grade. For regular administrator approval, the user gains access to standard administrator features including category management, product oversight, order oversight, and user management. For super administrator approval, the user gains all regular administrator capabilities plus the ability to manage other administrators and handle platform-wide oversight. The privilege grant takes effect immediately upon approval.

### Super Administrator Additional Capabilities

Super administrators possess capabilities beyond regular administrators including the ability to view all pending admin requests, approve or reject admin requests for any grade, promote regular administrators to super administrator status, demote other super administrators to regular administrator status, and prevent self-demotion. These additional capabilities enable super administrators to maintain proper distribution of administrative authority across the platform.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

When customers browse or search products, they can apply filters to narrow down results.

### Category Filter
Customers can filter search results by selecting a specific category. When a category is selected, only products belonging to that category or its subcategories appear in results.

### Price Range Filter
Customers can specify a minimum price and a maximum price to filter products. Products with base prices falling within the specified range are shown. If only a minimum is provided, results show products at or above that price. If only a maximum is provided, results show products at or below that price.

### In-Stock Filter
Customers can enable an in-stock filter to show only products that have at least one variant with available stock. Products with all variants out of stock are excluded from results when this filter is active.

### Combined Filters
Filters can be applied together. When multiple filters are active, results must satisfy all filter conditions simultaneously.

### Filter Persistence
Active filters are preserved while browsing through pages of results.

### Sorting Rules

When customers browse or search products, they can choose how results are ordered.

### Sort Options
The available sort options for product lists are:
- Newest first: Products are ordered by their creation date, with the most recently created products appearing first
- Price (low to high): Products are ordered from the lowest base price to the highest
- Price (high to low): Products are ordered from the highest base price to the lowest

### Default Sort Order
When no sort preference is specified, the default sort order is Newest first.

### Sort Persistence
The selected sort order is preserved while browsing through pages of results.

### Sort Applicability
Sorting applies to the entire filtered result set, not just the current page.

### Pagination Rules

Lists of items throughout the platform are displayed in pages to manage display volume and loading performance.

### Page Size
Each page of results displays a fixed number of items. The system determines an appropriate page size that balances readability and performance.

### Page Navigation
Customers can navigate between pages using previous and next controls. They can also jump directly to specific pages when available.

### Result Counting
Customers can see the total number of results available and their current position within the overall set.

### Page State Preservation
When navigating between pages, the current filter and sort selections remain active.

### Pagination Scenarios
Pagination applies to the following lists:
- Search results showing products from all sellers
- Products within a category
- Customer wishlist items
- Customer order history
- Seller order items

### Empty Page Handling
If a customer navigates to a page that contains no results (such as after applying restrictive filters), the system displays a message indicating no items match the current criteria.

### List Display Format

When products are displayed in a list format, each item presents key information to help customers make purchasing decisions.

### Product List Item Information
Each product shown in a list displays:
- Main image (thumbnail) as the primary visual
- Product name
- Base price displayed as a single value or as a price range when variants have different prices
- Seller shop name associated with the product
- Average rating calculated from customer reviews, shown when reviews exist

### Information Display Priority
The product image appears first as the thumbnail. Product name follows as the primary text identifier. Price information appears next to the name. Seller name and rating appear below to provide context about the seller and product quality.

### Missing Information Handling
If a product has no reviews, the average rating is not displayed. If a product has no variants, the price range shows a single base price. If a product has no main image, a placeholder image is shown.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Errors

When a customer attempts to log in with an email that does not exist in the system, the login request is rejected and the customer is informed that the email or password is incorrect.

When a customer attempts to log in with a correct email but an incorrect password, the login request is rejected and the customer is informed that the email or password is incorrect.

When a seller attempts to log in with credentials that do not match any registered seller account, the login request is rejected with the same message shown to customers (email or password is incorrect).

When a banned customer attempts to log in, the login request is rejected and the customer is informed that their account has been suspended.

When a banned seller attempts to log in, the login request is rejected and the seller is informed that their account has been suspended.

When a seller whose account has not yet been approved attempts to log in, the login succeeds but the seller is shown their pending approval status and cannot access selling features until approved.

When a rejected seller attempts to log in, the login succeeds but the seller is shown their rejected status and the rejection reason. They may submit a new registration request or update their existing one.

### Validation Errors

When a customer registers with an email that is already in use by another customer or seller, the registration request is rejected and the customer is informed that the email address is already registered.

When a customer attempts to create a todo with a title that exceeds the maximum length, the request is rejected and the customer is informed of the maximum allowed length.

When a customer attempts to change their password using an incorrect current password, the request is rejected and the customer is informed that the current password is incorrect.

When a customer attempts to set a due date that is earlier than the start date on a todo, the request is rejected and the customer is informed that the due date cannot be before the start date.

When a seller attempts to create a product without providing a required field such as name, description, category, or base price, the request is rejected and the seller is informed which required fields are missing.

When a seller attempts to add a variant with a SKU code that is already used by another variant of the same product, the request is rejected and the seller is informed that the SKU code must be unique within the product.

When a customer attempts to write a review with a rating outside the range of one to five stars, the request is rejected and the customer is informed of the valid rating range.

When a customer attempts to add a quantity greater than the maximum allowed to their cart, the request is rejected and the customer is informed of the maximum quantity per item.

When a seller attempts to add inventory with a negative quantity for restocking, the request is rejected and the seller is informed that restock quantities must be positive.

When a customer attempts to add a negative quantity to their cart, the request is rejected.

### Resource Not Found Errors

When a customer attempts to view, edit, or delete a todo that does not exist, the request is rejected and the customer is informed that the requested item was not found.

When a customer attempts to view or edit a shipping address that does not exist in their address list, the request is rejected and the customer is informed that the address was not found.

When a customer attempts to add a product to their wishlist that does not exist, the request is rejected and the customer is informed that the product was not found.

When a customer attempts to add a product variant to their cart that does not exist, the request is rejected and the customer is informed that the requested variant was not found.

When a seller attempts to view, edit, or delete a product that does not exist or does not belong to their shop, the request is rejected and the seller is informed that the product was not found.

When a customer attempts to view an order that does not exist in their order history, the request is rejected and the customer is informed that the order was not found.

When a customer attempts to view a seller profile that does not exist, the request is rejected and the customer is informed that the shop was not found.

When a seller attempts to view inventory records for a variant that does not exist in their product catalog, the request is rejected and the seller is informed that the variant was not found.

### State Transition Errors

When a customer attempts to request cancellation for an order item that is not in paid status, the request is rejected and the customer is informed that cancellation can only be requested for items that have not yet been shipped.

When a customer attempts to request a refund for an order item that is not in delivered status, the request is rejected and the customer is informed that refunds can only be requested for delivered items.

When a customer attempts to request a refund more than seven days after the item was delivered, the request is rejected and the customer is informed that the refund window has expired.

When a seller attempts to ship an order item that is not in paid status, the request is rejected and the seller is informed that only paid items can be shipped.

When a customer attempts to write a review for a product before the item has been delivered, the request is rejected and the customer is informed that reviews can only be written for delivered purchases.

When a customer attempts to write a second review for the same product in the same order, the request is rejected and the customer is informed that they have already reviewed this product in this order.

When a seller attempts to approve a cancellation request that is not in pending status, the request is rejected and the seller is informed that the request has already been processed.

When a seller attempts to approve a refund request that is not in pending status, the request is rejected and the seller is informed that the request has already been processed.

When a customer attempts to checkout with an unavailable item in their cart, the request is rejected and the customer is informed that unavailable items cannot be purchased.

When a seller attempts to delete a product that has pending order items, the request is rejected and the seller is informed that the product cannot be deleted while there are pending orders.

### Ownership and Permission Errors

When a customer attempts to edit or delete a todo that belongs to another customer, the request is rejected and the customer is informed that they do not have permission to modify this item.

When a customer attempts to edit or delete a shipping address that belongs to another customer, the request is rejected and the customer is informed that they do not have permission to modify this address.

When a customer attempts to edit or delete a review written by another customer, the request is rejected and the customer is informed that they do not have permission to modify this review.

When a seller attempts to edit or delete a product that belongs to another seller, the request is rejected and the seller is informed that they do not have permission to modify this product.

When a seller attempts to edit or delete a product variant that belongs to another seller, the request is rejected and the seller is informed that they do not have permission to modify this variant.

When a seller attempts to view or manage order items belonging to another seller, the request is rejected and the seller is informed that they do not have permission to access these items.

When a customer attempts to access administrator features, the request is rejected and the customer is informed that they do not have administrative privileges.

When a regular administrator attempts to access super administrator features such as promoting other administrators, the request is rejected and the regular administrator is informed that super administrator privileges are required.

When an administrator attempts to approve their own administrator request, the request is rejected and the administrator is informed that they cannot approve their own request.

### Conflict Errors

When a seller attempts to create a category with a name that already exists, the request is rejected and the seller is informed that a category with this name already exists.

When a customer attempts to add a product to their wishlist that is already in their wishlist, the request is rejected and the customer is informed that the product is already in their wishlist.

When a seller attempts to delete an address while it is set as the default shipping address, the deletion proceeds but no default address is set afterward. If the deleted address was the only address, the customer will need to set a new default when adding addresses.

When a seller attempts to create a product variant with a SKU code that is already used by a deleted variant, the request is rejected and the seller is informed that the SKU code is already in use.

When two customers attempt to purchase the last available quantity of a variant simultaneously and both payment attempts succeed, one order is confirmed and the other customer receives an error that the requested quantity is no longer available.

When an administrator attempts to suspend a seller who is already suspended, the request is rejected and the administrator is informed that the seller is already suspended.

When an administrator attempts to ban a customer who is already banned, the request is rejected and the administrator is informed that the customer is already banned.

### Payment Errors

When a customer attempts to place an order but the payment processing fails due to an invalid payment method, the order is not created and the customer is informed that the payment could not be processed. The customer is encouraged to try again with a different payment method.

When a customer attempts to place an order but the payment processing fails due to insufficient funds, the order is not created and the customer is informed that there were insufficient funds. The customer is encouraged to try again with a different payment method.

When a customer attempts to place an order but the payment gateway is unavailable, the order is not created and the customer is informed that payment services are temporarily unavailable. The customer is encouraged to try again later.

When a cancellation request is approved but the refund processing fails, the cancellation request remains in approved status and the customer is informed that the refund could not be processed automatically. The refund is queued for manual processing.

When a refund request is approved but the refund processing fails, the refund request remains in approved status and the customer is informed that the refund could not be processed automatically. The refund is queued for manual processing.

### Inventory and Stock Errors

When a customer attempts to add a variant to their cart with a quantity greater than the available stock, a warning is shown to the customer that the requested quantity exceeds available stock. The customer can proceed with a lower quantity or proceed with the warning acknowledged.

When a customer attempts to checkout with items where the stock has decreased below their cart quantity since adding to cart, the checkout is blocked and the customer is informed of the updated availability. The customer must adjust quantities before proceeding.

When a seller attempts to delete a variant that has pending order items, the request is rejected and the seller is informed that the variant cannot be deleted while there are pending orders.

When a seller attempts to reduce inventory to a negative value, the request is rejected and the seller is informed that the adjustment would result in negative stock.

When a customer adds an out-of-stock variant to their cart, the variant is marked as unavailable in the cart and cannot be checked out until stock is restored.

When a variant is deleted by the seller, all cart items containing that variant are marked as unavailable in all customers' carts.

### Account Status Errors

When a suspended seller attempts to create a new product, the request is rejected and the seller is informed that their account is suspended and new products cannot be created until the suspension is lifted.

When a suspended seller attempts to edit an existing product, the request is rejected and the seller is informed that their account is suspended and products cannot be edited until the suspension is lifted.

When a customer attempts to add an item to their cart from a product belonging to a suspended seller, the addition succeeds but the product is marked as unavailable during checkout.

When a suspended seller attempts to process shipping for pending order items, the request is accepted and the seller can complete the shipment. Existing order processing is not affected by suspension.

When a suspended seller attempts to respond to cancellation or refund requests, the request is accepted and the seller can complete the response. Existing order dispute handling is not affected by suspension.

When a banned customer attempts to perform any action requiring authentication, the request is rejected and the customer is informed that their account has been banned.

### Approval and Rejection Errors

When a seller registration is rejected by an administrator, the seller is notified of the rejection and can view the rejection reason. The seller may then submit a new registration request with corrected information.

When an administrator request is rejected by a super administrator, the requesting user is notified of the rejection and can view the rejection reason if provided.

When a customer attempts to proceed to checkout without selecting a shipping address and without having a default address set, the checkout is blocked and the customer is informed that a shipping address must be selected or set as default.

When a customer attempts to create a cancellation request without providing a reason, the request is rejected and the customer is informed that a reason is required.

When a customer attempts to create a refund request without providing a reason, the request is rejected and the customer is informed that a reason is required.

When an administrator rejects a seller registration without providing a reason, the system prompts the administrator to provide a reason before the rejection can be submitted.

### Seller Deletion Errors

When a seller attempts to delete their account but has pending orders with paid or shipped status, the deletion request is rejected and the seller is informed that their account cannot be deleted until all pending orders have been completed or cancelled.

When a seller attempts to delete their account but has pending cancellation requests, the deletion request is rejected and the seller is informed that their account cannot be deleted until all pending cancellation requests have been resolved.

When a seller attempts to delete their account but has pending refund requests, the deletion request is rejected and the seller is informed that their account cannot be deleted until all pending refund requests have been resolved.

When a seller meets all requirements for account deletion, the deletion proceeds. Their products are removed from listings, order history and snapshots are preserved, and their shop name is preserved in past orders.

### Product Deletion Errors

When a seller attempts to delete a product that has pending order items with paid or shipped status, the deletion request is rejected and the seller is informed that the product cannot be deleted while there are pending orders. The seller must wait for all items to be delivered, cancelled, or refunded before deleting the product.

When a seller attempts to delete a product that has pending cancellation requests, the deletion request is rejected and the seller is informed that the product cannot be deleted while there are pending cancellation requests.

When a seller attempts to delete a product that has pending refund requests, the deletion request is rejected and the seller is informed that the product cannot be deleted while there are pending refund requests.

When a product is successfully deleted, all variants and inventory records for that product are deleted along with it. The product no longer appears in search results or category listings.

### System Error Responses

When the system encounters an unexpected error during any operation, the operation fails and the user is informed that an unexpected error occurred. The user is encouraged to try again or contact support if the problem persists.

When a user session expires during an operation, the operation fails and the user is informed that their session has expired. The user is prompted to log in again.

When a user attempts to access a resource through an expired or invalid session, the request is rejected and the user is informed that their session is invalid. The user is prompted to log in again.

When an administrator attempts to perform a bulk operation that would affect too many records at once, the operation may be rejected with a message that the operation exceeds the allowed scope. The administrator should perform the operation in smaller batches.

When a snapshot cannot be created due to a system error during a data modification, the modification itself proceeds but the snapshot creation is logged as failed. Administrators are notified of snapshot creation failures for manual review and recovery.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Retry Mechanism for Integration Failures

When an external integration call fails, the system shall attempt to retry the request.

### Retry Trigger Conditions

The system shall retry an integration call when:
- The external service returns a temporary error response (such as service unavailable or timeout)
- The connection fails due to network issues that may be transient
- The external service indicates it is experiencing high load

### Retry Strategy

Each integration call shall be retried up to a maximum number of times before considering the operation failed.

When retrying:
- Each subsequent retry shall occur after a waiting period that is longer than the previous attempt
- The waiting period between retries shall follow an increasing delay pattern
- If the external service returns a permanent failure response (such as invalid credentials or unsupported operation), retries shall stop immediately

### Retry Logging

Each retry attempt shall be logged with the timestamp, the reason for failure, and the attempt number. These logs shall be available for dispute resolution and audit purposes.

### User-Facing Behavior During Retries

The customer shall be informed that their request is being processed while retries are occurring. The system shall not display error messages to the customer until all retry attempts have been exhausted or a permanent failure is identified.

### Timeout Handling

If an integration call does not receive a response within a reasonable time, the system shall treat this as a failure and initiate retry procedures. The original request shall not be considered complete until a definitive success or failure response is received or all retries are exhausted.

### Circuit Breaker Policy

The system shall implement a circuit breaker pattern to prevent cascading failures when an external integration service is experiencing prolonged issues.

### Circuit Breaker States

The circuit breaker shall operate in three states:

**Closed State**: The circuit breaker allows requests to pass through to the external service. Normal operation continues. If failures occur, the failure count increments.

**Open State**: When the failure threshold is reached, the circuit breaker opens and blocks all requests to the external service. Requests fail immediately without attempting to contact the external service. This prevents the system from wasting resources on calls that will likely fail.

**Half-Open State**: After a waiting period in the open state, the circuit breaker allows a limited number of test requests to pass through. If these test requests succeed, the circuit breaker closes and normal operation resumes. If they fail, the circuit breaker opens again.

### Failure Threshold

The circuit breaker shall open after a defined number of consecutive or accumulated failures within a time window. Once open, the circuit breaker prevents all integration calls from proceeding.

### Recovery Behavior

When the circuit breaker opens:
- The system shall immediately reject new integration requests without attempting the external call
- The customer shall be informed that the service is temporarily unavailable
- Existing pending requests shall be handled according to the fallback policy

### Automatic Recovery

The circuit breaker shall periodically test the external service by allowing a small number of requests through. If these requests succeed, the circuit breaker assumes the service has recovered and closes. If they fail, the circuit breaker remains open.

### State Visibility

Administrators shall be able to view the current state of the circuit breaker and the recent failure history. This information shall be used for monitoring the health of external integrations.

### Fallback Behavior for Integration Failures

When an external integration fails and cannot be completed, the system shall follow defined fallback procedures to handle the situation gracefully.

### Fallback Scenarios

The system shall implement fallback behavior for the following scenarios:

**Payment Gateway Unavailable**: If the payment gateway cannot be reached or returns errors after all retries:
- The customer shall be informed that payment cannot be processed at this time
- The order shall not be created
- The customer shall be offered the option to retry payment later
- The customer cart and selected items shall remain unchanged
- No inventory shall be reserved or decremented

**Payment Processing Failure**: If the payment is declined or fails during processing:
- The customer shall be informed of the specific failure reason if provided by the payment gateway
- The order shall not be created
- The customer shall be prompted to use a different payment method or retry

### Graceful Degradation

The system shall continue to operate core functions even when external integrations are unavailable. Product browsing, search, wishlist, and cart management shall remain functional during integration outages.

### Notification to Relevant Parties

When a fallback situation occurs:
- The customer shall receive clear information about the failure and what actions they can take
- Relevant sellers shall be notified if the fallback affects their orders
- Administrators shall receive alerts about extended integration failures

### Fallback Data Handling

When using fallback procedures, the system shall:
- Preserve all customer input and cart state
- Log the fallback event with complete context for audit purposes
- Not commit partial transactions or create incomplete order records
- Ensure data consistency by rolling back any preliminary changes made before the integration call failed

### Integration Error Classification

The system shall classify integration errors into categories to determine the appropriate response and recovery actions.

### Error Categories

**Transient Errors**: Errors that may resolve on their own with time or retry. These include:
- Network timeouts
- Service temporarily overloaded
- Connection drops
- Rate limiting responses

**Permanent Errors**: Errors that will not resolve by retrying. These include:
- Invalid credentials or API keys
- Malformed request data
- Unsupported operation requests
- Account suspended or deactivated

**Ambiguous Errors**: Errors where the outcome is unknown. These include:
- Connection timeout without response
- Service returning error without confirmation of processing
- Network failure during data transmission

### Classification Response

For each error category, the system shall respond as follows:

**Transient Errors**:
- Retry using the retry mechanism
- Monitor failure count for circuit breaker
- Log for monitoring and alerting

**Permanent Errors**:
- Stop retry immediately
- Return clear error message to customer
- Do not attempt fallback procedures
- Log as permanent failure

**Ambiguous Errors**:
- Retry using the retry mechanism
- If all retries exhausted, treat as failure and notify customer
- Create audit log entry for manual review
- Administrators shall be alerted for manual resolution

### Error Message Handling

The system shall:
- Present customer-friendly error messages that do not reveal internal technical details
- Log detailed technical error information for debugging and support
- Mask sensitive data in error logs (such as partial card numbers or full credentials)
- Provide reference codes for customers to use when contacting support

### Error Rate Monitoring

The system shall track the rate of integration errors over time. If the error rate exceeds normal thresholds, administrators shall be alerted. Sustained elevated error rates may indicate systemic issues requiring intervention.

### Integration Error Escalation

The system shall implement escalation procedures for integration errors that cannot be resolved through automatic retry and fallback mechanisms.

### Escalation Triggers

Escalation shall occur when:
- All automatic retry attempts have been exhausted
- The circuit breaker has been open for an extended period
- A significant number of customers are affected by integration failures
- An ambiguous error requires manual verification

### Escalation Levels

**Level 1 - Automatic Alert**: System automatically notifies administrators about the issue through monitoring systems. No manual action required yet.

**Level 2 - Administrator Notification**: Designated administrators receive direct notification about the integration failure. Administrators investigate and determine if vendor support contact is required.

**Level 3 - Vendor Engagement**: If the issue is with an external service provider, support channels with the vendor shall be engaged. The system shall provide administrators with all relevant error logs and diagnostic information to share with the vendor.

**Level 4 - Executive Notification**: For prolonged or severe integration failures affecting business operations, senior personnel shall be notified for awareness and potential resource allocation decisions.

### Customer Communication During Escalation

During escalation procedures:
- Customers shall receive honest communication about service delays or issues
- Estimated resolution times shall be provided when available
- Customers shall be assured that their transaction will be processed once the issue is resolved
- Alternative solutions or workarounds shall be offered when available

### Resolution Documentation

All escalated issues shall be documented with:
- Timeline of events
- Actions taken during resolution
- Root cause identification
- Steps taken to prevent recurrence
- Customer impact assessment

This documentation shall be used for continuous improvement of integration error handling procedures.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Restrictions

The system accepts image files for product listings and seller logos only.

The system rejects files that are not image files, including documents, executable files, archives, and other non-image formats.

Accepted image formats are limited to common web-safe image types.

If a customer attempts to upload a file with an unsupported format, the upload is rejected and the user receives an error message indicating the file type is not supported.

If a seller attempts to upload a non-image file as a product image or logo, the upload is rejected with a message explaining that only image files are accepted.

### File Size Limits

Each uploaded image file must not exceed the maximum file size limit for that file type.

Product images have a file size limit that ensures reasonable storage usage and fast page loading.

Seller logo images have a file size limit appropriate for logo display.

If an uploaded file exceeds the size limit, the upload is rejected and the user receives an error message indicating the file is too large.

The user is informed of the maximum allowed file size when the upload is rejected.

### Virus and Malware Scanning

All uploaded files undergo virus and malware scanning before being stored and made available.

Files are scanned using an approved antivirus scanning service.

If a file is found to contain a virus, malware, or any malicious content, the upload is rejected and the file is not stored.

The user who attempted the upload receives an error message indicating the file could not be processed.

Files that fail scanning are flagged and logged for administrator review.

The system does not serve or display any file that has not passed the scanning process.

### Content Validation

Uploaded images must be valid image files that can be opened and displayed.

Corrupted image files or files with invalid image headers are rejected.

The system validates that uploaded files have valid image dimensions and are not empty.

If an image cannot be read or displayed, the upload is rejected with a message indicating the file is invalid or corrupted.

Image metadata is validated to ensure the file is a recognized image format.

### File Storage and Retention

Uploaded images are retained as long as the associated product or seller profile exists.

When a product is deleted, all associated product images are removed from storage.

When a seller deletes their account, their logo image is removed from storage.

Deleted images cannot be recovered once the associated product or profile is deleted.

The system preserves image URLs in order item snapshots at the time of purchase for historical order records.

Images referenced in snapshots are retained according to the snapshot retention policy.

### Image Processing Rules

Product images are processed to generate appropriate display sizes for thumbnails and detail views.

The first uploaded image becomes the primary product image by default.

Sellers can change the display order of their product images.

Logo images are processed to appropriate dimensions for shop profile display.

If image processing fails, the original image is preserved and the user is notified.