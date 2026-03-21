**ecommerceMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Customer Operations

Customers must register with a valid email address and password before accessing any platform features. The registration process creates a customer account and associated customer profile. Customers log in using their email and password credentials, and the system authenticates them before granting access to protected features. Customers can change their password by providing their current password and a new password. Customers can delete their account, which permanently removes their profile information including display name and phone number while preserving all order history and past reviews for seller records and legal compliance. When a customer's account is deleted, their existing reviews remain visible but display as written by a "deleted user" rather than showing personal information.

### Customer Account Lifecycle

## Customer Registration

The system SHALL allow customers to create an account by providing a valid email address and a password.

### Registration Prerequisites

- The system SHALL require all users to register before accessing any platform features.
- Guest browsing SHALL NOT be supported; all features require authentication.

### Registration Input Requirements

- The customer SHALL provide an email address, which MUST be unique across the platform.
- The customer SHALL provide a password that meets the system's security requirements.
- Upon successful registration, the system SHALL automatically create a customer profile associated with the new account.

### Registration Processing

- When a customer registers, the system SHALL create both a customer account and an associated customer profile in a single operation.
- The system SHALL verify that the provided email address is not already registered.
- The customer profile SHALL be initialized with empty display name and phone number fields.

## Customer Login Authentication

### Login Credentials

- The system SHALL authenticate customers using their email address and password.
- Customers SHALL access protected features only after successful authentication.
- Failed authentication attempts SHALL be recorded for security purposes.

### Session Management

- Upon successful login, the system SHALL establish an authenticated session for the customer.
- The session SHALL enable the customer to access protected features without re-authenticating for each action.
- The session SHALL expire after a period of inactivity or explicit logout.

## Password Change Operation

### Password Change Requirements

- Authenticated customers SHALL be able to change their password.
- The system SHALL require the customer to provide their current password for verification.
- The system SHALL require the customer to provide a new password that meets security requirements.
- The new password SHALL replace the current password upon successful verification.

### Password Change Security

- The system SHALL verify the current password matches the stored password before accepting a new password.
- If the current password is incorrect, the system SHALL reject the password change request.
- The system SHALL invalidate any existing sessions after a successful password change.

## Account Deletion

### Deletion Request Processing

- Customers SHALL be able to permanently delete their account.
- Account deletion SHALL be initiated by an authenticated customer through their account settings.
- The system SHALL require confirmation before executing the deletion.

### Profile Information Removal

- When a customer deletes their account, the system SHALL permanently remove their profile information.
- The display name associated with the customer SHALL be deleted.
- The phone number associated with the customer SHALL be deleted.
- All shipping addresses associated with the customer SHALL be deleted.
- The customer's wishlist SHALL be deleted.
- The customer's shopping cart SHALL be deleted.

### Order History Preservation

- When a customer deletes their account, the system SHALL preserve all order history for seller records and legal compliance.
- Order records SHALL remain accessible to administrators and relevant sellers.
- Order items SHALL retain customer information necessary for fulfillment and records.

### Review Display After Deletion

- When a customer deletes their account, the system SHALL preserve all reviews written by that customer.
- Deleted customer reviews SHALL be displayed on product pages.
- Deleted customer reviews SHALL show "deleted user" as the author instead of the customer's display name.
- Deleted customer reviews SHALL NOT display any personal information of the deleted customer.
- The rating and text content of deleted customer reviews SHALL remain visible.

## Account Access After Deletion

### Post-Deletion Behavior

- After account deletion, the customer SHALL no longer be able to log in with their original credentials.
- The email address associated with a deleted account SHALL become available for registration by new customers after a waiting period.
- Deleted customers SHALL lose access to all platform features immediately upon deletion.

## CustomerProfile Operations

Each customer has a profile containing a display name and phone number for identification and contact purposes. The display name is shown to other users in certain contexts, while the phone number is used for shipping and delivery communications. Customers can update their display name and phone number at any time through profile editing. The customer profile is created automatically when a customer registers and is deleted when the customer deletes their account. The system validates that display names are provided and fall within acceptable length limits. Phone numbers are optional but must be in a valid format when provided.

### Profile Creation on Registration

The system creates a customer profile automatically when a customer successfully registers an account. The profile is initialized with empty display name and phone number fields. The profile is linked to the customer's account and remains associated throughout the customer's lifetime on the platform.

### Display Name Management

Customers can set and update their display name at any time after registration. The display name is used to identify the customer in certain contexts such as reviews and order-related communications. When a review is written by a deleted customer, the display name is shown as "deleted user" instead of the original name.

### Phone Number Storage and Editing

Customers can add and update their phone number in their profile. The phone number is optional during registration but can be provided to facilitate shipping and delivery communications. The phone number is stored in the customer profile and can be edited whenever the customer wishes to update their contact information.

### Profile Update Operations

Customers can edit their profile information including display name and phone number. The system validates that the display name is provided and meets length requirements before accepting the update. Phone numbers, when provided, must follow a valid format. All successful profile updates are recorded with a timestamp.

### Profile Deletion on Account Removal

When a customer deletes their account, their profile information is permanently removed from the system. This includes the display name and phone number. The customer account itself is deleted, but any orders, order history, and reviews created by the customer are preserved. Deleted reviews display "deleted user" in place of the customer's name.

### Contact Information Validation

The system validates contact information provided in the customer profile. Display names must be within acceptable length limits and are required when saving. Phone numbers, while optional, must conform to a valid phone number format when provided. Invalid or improperly formatted contact information is rejected and the customer is notified to correct their input.

## ShippingAddress Operations

Customers can add multiple shipping addresses to their account for use during checkout. Each address contains recipient name, phone number, street address, city, state or province, postal code, and country information. Customers can edit any of their existing addresses to update details. Customers can delete addresses they no longer need. Customers can designate one address as their default shipping address, which is automatically selected during checkout. The system ensures all address fields contain valid information before saving. Customers can maintain a list of their addresses and change the default at any time.

### Multiple Shipping Address Storage

Customers can maintain multiple shipping addresses in their account for use during checkout and order delivery. There is no limit on the number of addresses a customer can store, allowing customers to manage addresses for home, work, or other locations.

Each shipping address contains the following information:
- Recipient name (who should receive the package)
- Phone number (for delivery coordination)
- Street address (including building number, street name, apartment or unit number if applicable)
- City name
- State or province name
- Postal code
- Country name

All address fields are required when creating or editing an address.

### Address Creation with Required Fields

When adding a new shipping address, customers must provide all required fields including recipient name, phone number, street address, city, state or province, postal code, and country. The system validates that no required fields are empty before saving the address.

Phone numbers must contain only valid numeric characters. Recipient name and street address must each contain at least one character.

Once validated, the address is stored and associated with the customer's account. The newly created address is not automatically set as the default.

### Address Editing Capabilities

Customers can edit any of their existing shipping addresses at any time. When editing, customers can modify any field within the address including recipient name, phone number, street address, city, state or province, postal code, and country.

All fields continue to be validated during the edit operation. If any required field is empty or invalid, the edit is rejected.

Editing an address does not affect orders that have already been placed using that address. Past orders retain the address information as it appeared at the time of ordering.

### Address Deletion Operation

Customers can delete any shipping address they have stored. When an address is deleted, it is removed from the customer's account and will no longer appear in their address list.

If the customer attempts to delete their default shipping address, the deletion proceeds but no address will be designated as default afterward. The customer can then select a different address as default or add a new address.

Deleting an address does not affect orders that were already placed using that address. Past orders retain historical address information.

### Default Shipping Address Selection

Customers can designate one of their shipping addresses as the default shipping address. The default address is automatically selected during checkout to streamline the purchasing process.

Customers can change their default address at any time by selecting a different address from their stored addresses. When a new default is selected, the previous default loses its default status but remains stored in the customer's address list.

If a customer deletes their current default address, no automatic replacement default is assigned. The customer must manually select a new default from their remaining addresses.

Only one address can be designated as default at any given time.

### Address Field Validation

All address fields undergo validation before the system accepts the address. The system rejects addresses with missing required fields.

The recipient name field must contain between 1 and 100 characters. The phone number field must contain between 10 and 20 numeric characters. The street address field must contain between 1 and 500 characters. The city field must contain between 1 and 100 characters. The state or province field must contain between 1 and 100 characters.

If any validation fails, the system informs the customer which field or fields require correction before the address can be saved.

## Seller Operations

Sellers register using email and password, creating an account in pending approval status. Sellers log in with their credentials to access their seller dashboard and management features. Sellers can change their password through account settings. New seller accounts require administrator approval before the seller can list products or process orders. Sellers can view their current approval status, which shows as pending, approved, or rejected. When rejected, sellers can view the rejection reason provided by the administrator. Rejected sellers may submit a new registration request to attempt approval again. Sellers can delete their account only when they have no pending orders with paid or shipped status and no pending cancellation or refund requests. Account deletion removes their products from listings while preserving order history and preserving their shop name in past order records.

### Seller Registration

Sellers register for an account using their email address and a password they choose. The email address must be unique across all seller accounts on the platform. The password must meet any minimum requirements established by the platform for security. Upon registration, the system creates a seller account in a pending approval status. The seller cannot list products, manage inventory, or process orders until their account has been approved by an administrator. The registration captures the email address and stores it securely along with the password credentials.

### Seller Login Authentication

Sellers log in to the platform using their registered email address and password. The system verifies the credentials match the stored information. Upon successful authentication, the seller gains access to their seller dashboard and all management features available to approved sellers. Failed login attempts result in an error message indicating invalid credentials. Sellers who have been suspended cannot log in even with correct credentials.

### Password Change

Authenticated sellers can change their password through their account settings. The system requires the seller to provide their current password before setting a new one. The new password must meet the platform's security requirements. Upon successful password change, the seller remains logged in and can continue using the platform with the updated credentials.

### Administrator Approval Workflow

New seller accounts require administrator approval before the seller can access full platform functionality. When a seller registers, their account status is set to pending. Administrators review pending seller registrations and can approve or reject each request. When an administrator approves a seller, the seller's account status changes to approved and the seller gains the ability to create products, manage inventory, and process orders. When an administrator rejects a seller, the account status changes to rejected and the seller must address any issues before attempting to register again.

### Approval Status Viewing

Sellers can view their current approval status at any time through their account or dashboard. The status displays one of three values: pending, approved, or rejected. Pending status indicates the account is awaiting administrator review. Approved status indicates the seller has full access to platform features. Rejected status indicates the previous registration request was denied.

### Rejection Reason Display

When a seller's registration has been rejected, the system makes the rejection reason available to that seller. The rejection reason explains why the administrator denied the request. Sellers can view this reason through their account interface. The rejection reason helps sellers understand what issues need to be addressed before submitting a new registration request.

### New Registration After Rejection

Sellers whose registration has been rejected can submit a new registration request. The new request allows the seller to provide updated information or address the reasons for the previous rejection. Each new submission starts a fresh review process with administrator approval required again. The system tracks the history of registration attempts.

### Seller Deletion with Conditions

Sellers can delete their account, but only when specific conditions are met. A seller account can only be deleted when there are no pending order items with paid or shipped status associated with the seller's products, and there are no pending cancellation or refund requests related to the seller's products. If these conditions are not met, the deletion request is rejected and the seller must wait until all pending items and requests have been resolved. Account deletion removes the seller's ability to log in and access the platform.

### Product Removal on Seller Deletion

When a seller deletes their account, all of their products are removed from the platform listings. Products no longer appear in search results or category pages. Product variants and associated inventory records are also removed. This ensures customers cannot purchase from a seller who no longer exists on the platform.

### Shop Name Preservation in Orders

When a seller deletes their account, the historical record of their shop name is preserved in past orders. Customers who placed orders from this seller continue to see the shop name as it appeared at the time of their purchase. This preserves the accuracy of order history and ensures customers can identify the source of their purchases even after the seller account is deleted.

## SellerProfile Operations

Each seller has a profile displaying their shop name, description, and logo image. Sellers can edit their shop name, description, and logo to update their public-facing storefront. Every edit to a seller profile creates a snapshot that preserves the previous state for historical reference. Customers can view seller profiles to learn about the shops before making purchases. The shop name appears on product listings and in order records. Seller profile snapshots are immutable records that cannot be deleted and serve as evidence in disputes. Sellers can view all snapshots of their own profile changes.

### Seller Profile Overview

Sellers can create and maintain a public-facing seller profile. The profile displays essential information about the seller's shop to help customers make informed purchasing decisions. Each seller profile contains the shop name, shop description, and a logo image. The shop name appears on product listings, in order records, and throughout the platform wherever the seller is referenced.

### Shop Name Editing

Sellers can edit their shop name at any time. The shop name is a required field and must be between 1 and 100 characters. The shop name appears prominently on the seller's public profile page, on all products they list, and in customer order records. When a seller changes their shop name, the previous name is preserved in a snapshot so that historical orders continue to show the shop name as it was at the time of purchase.

### Shop Description Editing

Sellers can edit their shop description at any time to provide more details about their business, products, or services. The shop description is optional and has a maximum length of 2000 characters. The description appears on the seller's public profile page below the shop name and logo. When updated, a snapshot preserves the previous description for historical reference.

### Logo Image Management

Sellers can upload a logo image to represent their shop. The logo appears on the seller's public profile page and alongside their products in listings. Sellers can replace the logo with a different image at any time. When the logo is changed, a snapshot preserves the previous logo image URL and timestamp for historical reference. If a seller has not uploaded a logo, the profile displays without a logo image.

### Profile Edit Snapshot Creation

Every time a seller edits any field in their profile, the system creates an immutable snapshot that preserves the previous state. The snapshot includes the shop name, shop description, logo image URL, and timestamp of the change. These snapshots cannot be modified or deleted after creation. Profile snapshots are created automatically whenever the seller saves changes to any profile field.

### Customer Viewing of Seller Profiles

Customers can view any seller's public profile by clicking on the seller's name from a product listing, order record, or search result. The public profile displays the shop name, shop description, and logo image. Customers can use this information to learn more about the seller before making a purchase decision.

### Immutable Snapshot Records

Once a snapshot is created from a profile edit, it becomes an immutable record that cannot be modified, deleted, or overwritten. The snapshot content is permanently preserved and serves as a historical record of the seller's profile state at a specific point in time. This immutability ensures data integrity for dispute resolution and historical accuracy.

### Seller Profile History Viewing

Sellers can view the complete history of changes made to their profile. The history displays each snapshot with the shop name, description, logo, and timestamp of when the change occurred. Sellers can review when their profile was updated and what the profile looked like at any previous point in time. This allows sellers to track their profile changes over time and provides transparency into their storefront evolution.

## Category Operations

Products are organized into a category hierarchy for browsing and filtering. Categories can have one level of subcategories, allowing products to be grouped under parent categories with specific child categories. Each category has a name and optional description. Only administrators can create, edit, or delete categories. Customers can browse the complete list of all categories and view products within any category. Subcategories inherit from their parent category structure. When a category is deleted, products in that category become uncategorized rather than being deleted.

### Category Creation

Administrators can create a new category by providing a name and an optional description.

When creating a category, the administrator must specify a unique name for the category.

The system records when the category was created.

If the category name is missing or empty, the request is rejected.

### Category Editing

Administrators can edit an existing category to change its name or description.

When a category name is changed, the new name must still be unique across all categories.

If the new name conflicts with an existing category name, the request is rejected.

### Category Deletion

Administrators can delete a category.

When a category is deleted, products that were assigned to that category become uncategorized.

Uncategorized products remain visible but no longer appear under any category in category browsing.

Subcategories of a deleted category are also deleted, and their products become uncategorized.

Deleted categories no longer appear in the category list for customers.

### Subcategory Creation

Administrators can create a subcategory by specifying a name, optional description, and assigning it to a parent category.

Subcategories support only one level of nesting. A subcategory cannot have its own subcategories.

When viewing the category hierarchy, customers see parent categories with their child subcategories displayed underneath.

A subcategory inherits the parent structure for browsing and filtering purposes.

### Subcategory Nesting Limit

The system enforces that subcategories can only be created one level deep.

An attempt to create a subcategory under another subcategory is rejected.

This ensures a flat category structure with parent categories and their direct children only.

### Category Name and Description

Each category has a name that is visible to customers when browsing categories.

The category name must be unique across all categories and subcategories.

Categories may optionally have a description that provides additional information about the types of products in that category.

Both the name and description are displayed when customers view category details.

### Administrator-Only Category Operations

Only administrators have the ability to create new categories.

Only administrators have the ability to edit existing categories.

Only administrators have the ability to delete categories.

Customers and sellers cannot create, edit, or delete categories through any interface.

### Customer Category Browsing

Customers can browse the complete list of all categories.

The list displays each category with its name and description.

Parent categories show their subcategories grouped underneath them.

Customers can select any category to view the products within it.

### Viewing Products in a Category

When a customer selects a category, the system displays all products assigned to that category.

Products in subcategories are included when viewing the parent category.

Products in a subcategory are also included when viewing that specific subcategory.

The product list shows the main image, name, base price, seller shop name, and average rating for each product.

### Handling Products When Category Is Deleted

When a category is deleted, products in that category are not deleted from the system.

Instead, these products become uncategorized.

Uncategorized products remain in the system with all their data intact including variants, images, and inventory.

Uncategorized products do not appear in category browsing but may still be found through search.

## Product Operations

Sellers create products with required fields including name, description, category, and base price. Products belong to the seller who created them and appear in search and category listings. Sellers can edit their own products, and every edit creates a snapshot preserving the complete product state including all fields and images. Sellers can delete their own products only when there are no pending order items for any variant and no pending cancellation or refund requests. Deleting a product also deletes all its variants and associated inventory records. Deleted products no longer appear in search results or category listings. Sellers can view snapshots of their products, and administrators can view snapshots of any product. Product snapshots are preserved even after product deletion.

### Product Creation

### Product Creation

WHEN a seller creates a new product, THE system SHALL require the seller to provide a product name, a product description, a category selection, and a base price.

THE system SHALL automatically associate the new product with the seller who created it.

THE system SHALL initialize the product with an empty image collection and no variants.

THE system SHALL mark newly created products as available for listing and search.

### Product Editing

WHEN a seller edits their own product, THE system SHALL allow the seller to modify the product name, description, category, and base price.

WHEN a seller modifies any editable field of a product, THE system SHALL create a snapshot of the product including all current fields and images.

WHEN a seller edits a product, THE system SHALL include all current variant information in the snapshot.

THE system SHALL preserve the original snapshot content immutably after creation.

### Product Deletion

WHEN a seller requests to delete their own product, THE system SHALL verify that no order items for any variant of the product have a status of paid or shipped.

WHEN a seller requests to delete their own product, THE system SHALL verify that no pending cancellation requests or refund requests exist for any variant of the product.

IF any pending order items or requests exist, THEN THE system SHALL reject the deletion request.

IF the product passes all deletion checks, THEN THE system SHALL delete all variants associated with the product.

IF the product passes all deletion checks, THEN THE system SHALL delete all inventory records associated with each variant.

WHEN a product is deleted, THE system SHALL mark the product as deleted so it no longer appears in search results or category listings.

### Product Visibility

THE system SHALL display products that are not deleted in search results.

THE system SHALL display products that are not deleted in category listings.

THE system SHALL show products with no variants as unavailable.

THE system SHALL show products with at least one in-stock variant as available.

### Product Snapshot Viewing

THE system SHALL allow sellers to view snapshots of their own products.

THE system SHALL allow administrators to view snapshots of any product on the platform.

WHEN viewing a snapshot, THE system SHALL display all product fields as they existed at the time the snapshot was created.

WHEN viewing a snapshot, THE system SHALL display all variant information including option values, SKU codes, and prices as they existed at snapshot time.

### Snapshot Preservation After Deletion

THE system SHALL preserve all product snapshots even after the product has been deleted.

WHEN an administrator reviews deleted products, THE system SHALL allow access to the historical snapshots for dispute resolution purposes.

THE system SHALL NOT allow modification or deletion of any preserved snapshot.

### Product Editing and Snapshot Creation

### Snapshot Creation Triggers

WHEN any editable field of a product is modified, THE system SHALL automatically create a new product snapshot.

THE system SHALL create snapshots that capture the complete state of the product including name, description, category, base price, and all images.

THE system SHALL include in each product snapshot a copy of all variant data current at the time of the snapshot, including SKU codes, option values, price overrides, and stock quantities.

### Snapshot Content Structure

EACH product snapshot SHALL contain the product name at the time of creation.

EACH product snapshot SHALL contain the product description at the time of creation.

EACH product snapshot SHALL contain the category reference at the time of creation.

EACH product snapshot SHALL contain the base price at the time of creation.

EACH product snapshot SHALL contain all product images at the time of creation.

EACH product snapshot SHALL contain the complete variant list with all variant fields.

### Snapshot Immutability

THE system SHALL prevent any user from modifying a snapshot after it has been created.

THE system SHALL prevent any user from deleting a snapshot.

THE system SHALL record the timestamp of when each snapshot was created.

THE system SHALL record the user who initiated the change that created each snapshot.

### Snapshot Usage

THE system SHALL use the most recent snapshot when displaying historical product information in order items.

THE system SHALL provide snapshot viewing capability for dispute resolution between sellers and customers.

THE system SHALL link each order item to the product snapshot that was current at the time of purchase.

### Product Deletion and Cascade Effects

### Deletion Eligibility Verification

WHEN a seller requests to delete a product, THE system SHALL examine all order items associated with all variants of that product.

IF any order item for any variant has a status of paid or shipped, THEN THE system SHALL reject the deletion and inform the seller.

IF any cancellation request for any variant has a status of pending, THEN THE system SHALL reject the deletion and inform the seller.

IF any refund request for any variant has a status of pending, THEN THE system SHALL reject the deletion and inform the seller.

### Cascade Deletion of Variants

WHEN a product is successfully deleted, THE system SHALL delete all variants associated with that product.

WHEN a variant is deleted as part of product deletion, THE system SHALL delete all inventory records for that variant.

WHEN a variant is deleted as part of product deletion, THE system SHALL remove all cart items referencing that variant.

### Visibility After Deletion

THE system SHALL remove deleted products from all search results.

THE system SHALL remove deleted products from all category listings.

THE system SHALL mark deleted products as unavailable for new orders.

THE system SHALL preserve existing order item records that reference deleted products.

### Automatic Cleanup

THE system SHALL automatically remove deleted products from all customer wishlists.

THE system SHALL update any pending checkout operations that contain deleted products.

### Product Search and Listing

### Product Listing Display

WHEN displaying a list of products, THE system SHALL show each product with its main image as the thumbnail.

WHEN displaying a list of products, THE system SHALL show the product name.

WHEN displaying a list of products with variants having different prices, THE system SHALL show a price range.

WHEN displaying a list of products, THE system SHALL show the shop name of the seller who created the product.

WHEN displaying a list of products that have reviews, THE system SHALL show the average rating.

### Search and Filter Operations

THE system SHALL allow customers to search for products by entering a product name.

THE system SHALL return products from all sellers that match the search criteria.

THE system SHALL allow customers to filter search results by category.

THE system SHALL allow customers to filter search results by minimum and maximum price range.

THE system SHALL allow customers to filter search results to show only products that are in stock.

### Sort Options

THE system SHALL allow customers to sort search results by newest first.

THE system SHALL allow customers to sort search results by price from low to high.

THE system SHALL allow customers to sort search results by price from high to low.

### Pagination

THE system SHALL paginate search results to manage the number of products displayed at once.

THE system SHALL provide navigation controls to move between pages of search results.

### Product Snapshot Viewing

### Snapshot Access for Sellers

THE system SHALL allow sellers to view all snapshots of their own products.

WHEN a seller views a product snapshot, THE system SHALL display the product name as it existed.

WHEN a seller views a product snapshot, THE system SHALL display the description as it existed.

WHEN a seller views a product snapshot, THE system SHALL display the category as it existed.

WHEN a seller views a product snapshot, THE system SHALL display the base price as it existed.

WHEN a seller views a product snapshot, THE system SHALL display all images as they existed.

WHEN a seller views a product snapshot, THE system SHALL display all variant data including SKU codes, option values, and prices.

### Snapshot Access for Administrators

THE system SHALL allow administrators to view all snapshots of any product on the platform.

WHEN an administrator views a product snapshot, THE system SHALL display the complete snapshot content.

### Snapshot Timeline

THE system SHALL display snapshots in chronological order from oldest to newest.

THE system SHALL show the timestamp when each snapshot was created.

THE system SHALL show which user initiated the change that created each snapshot.

### Dispute Resolution Support

THE system SHALL provide administrators access to product snapshots for resolving disputes between customers and sellers.

THE system SHALL preserve snapshot information indefinitely to support historical disputes.

## ProductImage Operations

Sellers can upload multiple images for each product to showcase different views and angles. Images are displayed in a specific order, with the first image serving as the main thumbnail in product listings. Sellers can reorder images to change which image appears as the thumbnail. Sellers can delete images from their products when they are no longer relevant. All image changes are captured in the product snapshot when edits occur, preserving the image state at that moment.

### Multiple Image Upload per Product

Sellers can upload multiple images for each of their products. Each product can have any number of images to showcase different views, angles, and details of the product. When uploading, each image is assigned an image URL that points to the stored file. The upload operation returns confirmation of successful storage.

When a seller uploads images for a product that has no existing images, the first uploaded image is automatically designated as the main thumbnail image. When uploading additional images to a product that already has images, the new images are added after the existing ones and do not automatically become the main thumbnail.

### Image Ordering and Reordering

Sellers can view the current order of images for any of their products. The images are displayed in their display order, with the first image shown as the primary or main thumbnail.

Sellers can change the display order of images by specifying which image should move to which position. When reordering occurs, the system updates the display order for all affected images accordingly. The image that moves to the first position becomes the new main thumbnail and will appear in product listings and search results.

Reordering is immediate and does not require additional confirmation. The system preserves the image URLs while only updating their display sequence.

### Main Thumbnail Image Selection

The first image in the display order is automatically designated as the main thumbnail image. This thumbnail appears in all product listings, search results, and anywhere the product is referenced without showing full details.

Sellers can change the main thumbnail by reordering images to place a different image in the first position. No separate action is required to designate a main thumbnail; the system automatically treats whichever image occupies the first position as the main thumbnail.

When displaying product listings, only the main thumbnail is shown. The full set of images is displayed when viewing the complete product details.

### Image Deletion from Product

Sellers can delete images from their products. When deleting an image, the seller selects which specific image to remove from the product.

If the seller deletes the main thumbnail image (the first image in display order), the system automatically promotes the next image in the display order to become the new main thumbnail. If the deleted image was the only image on the product, the product will have no images and will display as having no image available.

Deleted images are immediately removed from the product listing and are no longer visible to customers viewing that product.

### Image State in Product Snapshots

When a seller edits a product, a product snapshot is automatically created. This snapshot includes the complete state of the product at that moment, including all current image URLs and their display order.

The snapshot preserves which image was the main thumbnail, the URLs of all images, and the sequence in which images were displayed. This ensures that historical records accurately reflect what customers saw when the product was purchased.

Order items that include snapshots preserve the image state that was active at the time of purchase, even if the seller subsequently changes product images. This ensures customers and sellers can reference exactly which product images were shown during a transaction.

## ProductVariant Operations

Products can have multiple variants representing specific combinations of options such as color and size. Each variant has a unique SKU code for identification, option values specifying the combination, an optional price override, and a required stock quantity starting at zero. Sellers add variants to their products to offer different options to customers. Sellers can edit variant details including SKU code, option values, and price, with every edit creating a snapshot. Variants can be deleted only when there are no pending order items and no pending cancellation or refund requests for that variant. A product must have at least one variant to be purchasable; products without variants appear as unavailable.

### Product Variant Creation

### Product Variant Creation

Sellers can add variants to their products to offer different options to customers. Each variant must be associated with exactly one product that the seller owns.

When creating a variant, the seller must provide:
- A unique SKU code that identifies the variant across the platform
- Option values that specify the combination (such as color and size)
- A stock quantity, which starts at zero by default

The system validates that the SKU code is unique across all variants in the platform. If a duplicate SKU code is provided, the creation is rejected.

A variant belongs to the product for which it was created and inherits the product's seller association.

### Variant Option Values Combination

### Variant Option Values Combination

Each variant represents a specific combination of options that customers can select when purchasing. The option values are stored as key-value pairs, such as color being "Red" and size being "Large".

Sellers define the option values when creating or editing a variant. The combination of option values must be unique within the parent product; a product cannot have two variants with the exact same option values.

Option values are displayed to customers on the product detail page, showing each variant's specific combination and its corresponding price and availability.

### Price Override Per Variant

### Price Override Per Variant

Each variant can optionally override the product's base price. When a variant has a price override, that price is used for that specific variant instead of the base price.

Sellers set the price override when creating or editing a variant. If no price override is specified, the variant inherits the product's base price.

This allows sellers to offer different priced options within the same product, such as a larger size at a higher price.

### Stock Quantity Initialization

### Stock Quantity Initialization

When a variant is created, its stock quantity is set to zero by default. The stock quantity represents the number of units available for purchase.

Sellers must add inventory to their variants before customers can purchase them. Inventory management is handled through inventory records that track quantity changes over time.

A variant with zero stock is displayed as "out of stock" to customers and cannot be added to their cart.

### Variant Editing with Snapshot

### Variant Editing with Snapshot

Sellers can edit the details of their own variants, including the SKU code, option values, and price override. When any of these fields are modified, a snapshot is automatically created to preserve the previous state of the variant.

The snapshot captures what was changed and the values before and after the edit. This creates an immutable record that cannot be deleted or modified.

Sellers can view the history of snapshots for their own variants. Administrators can view snapshots for any variant on the platform.

Edits to variant details do not affect existing orders that have already been placed; those orders retain their own snapshots of the product and variant at the time of purchase.

### Variant Deletion Conditions

### Variant Deletion Conditions

Sellers can delete variants from their products, but only when specific conditions are met to protect pending transactions.

A variant cannot be deleted if:
- There are any order items with status "paid" or "shipped" for that variant
- There are any pending cancellation or refund requests for that variant

When a variant is deleted, it is marked as deleted in the system and no longer appears in product listings or search results. However, any snapshots created for that variant are preserved for historical records.

Deleting the last variant of a product affects the product's purchasability.

### Product Availability with Variants

### Product Availability with Variants

A product must have at least one non-deleted variant to be considered purchasable. Products with at least one variant are displayed with their available options and can be added to customer carts.

When a product has multiple variants, customers can view all available options on the product detail page. Each variant shows its specific combination of options, price, and stock status.

Variants that are out of stock are marked as unavailable but do not prevent the product from being visible. Only variants with available stock can be added to the cart.

### Unavailable Product Without Variants

### Unavailable Product Without Variants

If a product has no variants, it is shown as "unavailable" in search results and category listings. Customers can still view the product detail page, but they cannot add it to their cart.

This ensures customers are not misled about a product's availability. Sellers must add at least one variant with stock before customers can purchase the product.

Products without variants remain visible in search and browsing, allowing customers to see the product details and sellers to understand they need to add variants.

## InventoryRecord Operations

Each product variant has its own stock quantity managed through inventory history records. Inventory records track quantity changes with positive values for restocking and negative values for orders or adjustments. Each record includes a reason explaining why the inventory changed. Current stock is calculated by summing all inventory records for a variant. Sellers can add inventory by recording a restock with quantity and reason. Sellers can subtract inventory by recording an adjustment or loss. Order placement automatically creates negative inventory records, and order cancellation or refund automatically creates positive records. Sellers can view the complete inventory history of each variant including all past changes and reasons.

### Inventory Record Creation and Tracking

### Inventory Record Creation

Inventory records are automatically created by the system when certain business events occur. Each inventory record captures a quantity change, a reason explaining the change, and the timestamp when the change occurred.

THE system SHALL create an inventory record when a customer places an order, recording a negative quantity change equal to the quantity purchased.

THE system SHALL create an inventory record when a seller approves a cancellation request, recording a positive quantity change equal to the cancelled quantity.

THE system SHALL create an inventory record when a seller approves a refund request, recording a positive quantity change equal to the refunded quantity.

### Restocking Operations

Sellers can add inventory to their product variants by performing restock operations. Restocking increases the available stock quantity for a specific variant.

WHEN a seller initiates a restock operation, THE system SHALL prompt the seller to specify the variant to restock.

WHEN a seller initiates a restock operation, THE system SHALL require the seller to enter a quantity greater than zero.

WHEN a seller initiates a restock operation, THE system SHALL require the seller to provide a reason for the restock.

THE system SHALL create an inventory record with a positive quantity change equal to the restock quantity when a restock operation is completed.

THE system SHALL update the current stock quantity of the variant by adding the restock quantity.

### Inventory Adjustment and Loss

Sellers can subtract inventory from their product variants through adjustment operations. These operations handle scenarios such as damaged goods, expired products, or inventory corrections.

WHEN a seller initiates an inventory adjustment, THE system SHALL prompt the seller to specify the variant to adjust.

WHEN a seller initiates an inventory adjustment, THE system SHALL require the seller to enter a quantity greater than zero to subtract.

WHEN a seller initiates an inventory adjustment, THE system SHALL verify that the adjustment quantity does not result in negative stock.

THE system SHALL create an inventory record with a negative quantity change equal to the adjustment quantity when an adjustment operation is completed.

THE system SHALL reject an adjustment operation if the requested quantity exceeds the current available stock.

### Automatic Inventory Deduction on Order

When a customer successfully completes a purchase, the system automatically reduces the stock quantity for each purchased variant.

WHEN an order is successfully placed and payment is confirmed, THE system SHALL create an inventory record for each purchased variant with a negative quantity change equal to the ordered quantity.

THE system SHALL calculate the new stock quantity as the previous stock minus the ordered quantity.

THE system SHALL display the updated stock quantity on the product detail page immediately after the order is placed.

### Automatic Inventory Restoration on Cancellation

When a cancellation request is approved, the system automatically restores the stock quantity for the cancelled variant.

WHEN a seller approves a cancellation request, THE system SHALL create an inventory record with a positive quantity change equal to the cancelled quantity.

THE system SHALL calculate the new stock quantity as the previous stock plus the cancelled quantity.

THE system SHALL make the restored inventory available for future purchases immediately after the cancellation is approved.

### Automatic Inventory Restoration on Refund

When a refund request is approved, the system automatically restores the stock quantity for the refunded variant.

WHEN a seller approves a refund request, THE system SHALL create an inventory record with a positive quantity change equal to the refunded quantity.

THE system SHALL calculate the new stock quantity as the previous stock plus the refunded quantity.

THE system SHALL make the restored inventory available for future purchases immediately after the refund is approved.

### Inventory History Viewing

Sellers can view the complete history of all inventory changes for each of their product variants.

WHEN a seller requests to view inventory history for a variant, THE system SHALL display all inventory records for that variant.

THE inventory history SHALL be sorted by timestamp, showing the most recent changes first.

EACH inventory history record SHALL display the quantity change, the reason for the change, and the timestamp when the change occurred.

WHEN a seller requests to view inventory history, THE system SHALL calculate and display the current stock quantity by summing all inventory records.

THE system SHALL display only inventory records belonging to variants owned by the requesting seller.

### Stock Status Display

The system determines and displays the stock status of variants based on their current inventory quantity.

WHEN a variant has a stock quantity greater than zero, THE system SHALL display the variant as "in stock".

WHEN a variant has a stock quantity of zero, THE system SHALL display the variant as "out of stock".

THE system SHALL prevent customers from adding out of stock variants to their cart.

WHEN calculating the available stock for display or cart validation, THE system SHALL use the current stock quantity derived from the sum of all inventory records.

### Stock Status and Availability

### Current Stock Calculation

The current stock quantity for each product variant is determined by summing all inventory records associated with that variant.

THE system SHALL calculate the current stock quantity as the sum of all quantity changes recorded in inventory records for that variant.

THE system SHALL update the displayed stock quantity whenever a new inventory record is created for the variant.

WHEN a seller views a product variant, THE system SHALL display the calculated current stock quantity.

### Out of Stock Determination

The system determines when a variant becomes unavailable based on its current stock quantity.

THE system SHALL mark a variant as out of stock when its current stock quantity equals zero.

THE system SHALL prevent out of stock variants from being added to customer shopping carts.

WHEN a customer attempts to add an out of stock variant to their cart, THE system SHALL display a message indicating the variant is unavailable.

### Stock Warnings in Cart

The system provides warnings when the quantity of items in a customer's cart exceeds the available stock.

WHEN a customer views their cart, THE system SHALL compare the quantity of each cart item against the current stock quantity of that variant.

IF the cart quantity exceeds the available stock, THE system SHALL display a warning message for that item.

IF the cart quantity exceeds the available stock, THE system SHALL prevent checkout until the customer adjusts the quantity or removes the item.

### Unavailable Item Handling in Cart

The system handles scenarios where cart items become unavailable due to stock depletion or product deletion.

WHEN a variant in the cart has zero stock, THE system SHALL mark that cart item as unavailable.

WHEN a variant in the cart is deleted by the seller, THE system SHALL mark that cart item as unavailable.

WHEN a customer views their cart containing unavailable items, THE system SHALL display a message indicating those items cannot be checked out.

THE system SHALL allow customers to remove unavailable items from their cart or proceed with checkout excluding those items.

### Inventory Record Integrity

### Inventory Record Immutability

Once created, inventory records cannot be modified or deleted. This ensures a complete and accurate history of all stock changes.

THE system SHALL prevent any user, including administrators, from editing existing inventory records.

THE system SHALL prevent any user, including administrators, from deleting inventory records.

THE system SHALL preserve all inventory records even when a product variant is deleted.

### Inventory Record Audit Trail

Inventory records serve as an audit trail for dispute resolution and financial reconciliation.

EACH inventory record SHALL contain the quantity change value, the reason for the change, and the exact timestamp of the change.

INVENTORY records SHALL be viewable by the seller who owns the variant and by platform administrators.

THE system SHALL provide a chronological listing of all inventory changes for each variant for audit purposes.

## Review Operations

Customers can write reviews for products they have purchased, limited to one review per product per order. Reviews can only be submitted after the item status becomes delivered. Each review consists of a required rating from one to five stars and optional text content. Customers can edit their own reviews, with every edit creating a snapshot preserving the previous state. Customers can delete their own reviews, though the snapshots remain preserved. Reviews appear on the product detail page sorted by newest first. Deleted reviews are preserved in snapshot form but marked as deleted for display purposes.

### Review Creation Eligibility

Customers can write reviews for products they have purchased. A review can only be submitted after the order item status becomes "delivered". If the order item status is not delivered, the system must reject the review creation request. Customers can only write reviews for products where they have a delivered order item.

### Rating Submission

When creating a review, the customer must provide a rating from one to five stars. The rating is a required field. The system must reject reviews with ratings outside this range.

### Review Text Content

Customers may optionally include text content with their review. The text content allows customers to describe their experience with the product in more detail. Text content is not required for review submission.

### One Review Per Product Per Order

The system must allow only one review per product per order. If a customer has purchased the same product across multiple orders, they may write a separate review for each order. The system must prevent duplicate reviews for the same product and order combination.

### Review Editing with Snapshot

Customers can edit their own reviews at any time. When a review is edited, the system must create a snapshot that preserves the previous state of the review including the rating and text content. The snapshot captures what was changed and the values before and after the edit.

### Review Deletion with Snapshot Preservation

Customers can delete their own reviews. When a review is deleted, the review itself is marked as deleted but the snapshot records remain preserved. Deleted reviews no longer contribute to the product's average rating calculation.

### Review Display on Product Page

Reviews are displayed on the product detail page. The display includes the rating stars and any text content provided by the customer. Reviews are sorted by newest first, showing the most recent reviews at the top of the list.

### Deleted Review Display

Reviews are associated with the customer who wrote them. When a customer deletes their account, their reviews are preserved but displayed as "deleted user" instead of the customer's name. The rating and text content of deleted reviews remain visible to other users.

## Wishlist Operations

Customers maintain a wishlist of products they are interested in purchasing. The wishlist stores products at the product level rather than specific variants. Customers can add products to their wishlist to save them for later. Customers can view their complete wishlist with pagination support. Products that are deleted by the seller are automatically removed from all customer wishlists to prevent referencing unavailable items.

### Wishlist Viewing

### Wishlist Viewing

WHEN a customer requests to view their wishlist, THE system SHALL display a paginated list of products the customer has added.

THE system SHALL show each wishlisted product with its main image, product name, base price, and seller shop name.

THE system SHALL display products in reverse chronological order based on when they were added to the wishlist (newest first).

THE system SHALL paginate the wishlist with a configurable number of items per page and provide navigation controls for additional pages.

THE system SHALL indicate if a wishlisted product is currently unavailable, out of stock, or has been deleted.

### Adding Products to Wishlist

WHEN a customer selects a product to add to their wishlist, THE system SHALL add that product to the customer's wishlist.

THE system SHALL record the timestamp when the product was added to the wishlist.

IF the customer has already added the same product to their wishlist, THE system SHALL not create a duplicate entry but SHALL update the timestamp to reflect the most recent add action.

THE system SHALL store products at the product level, not at the variant level, meaning adding a product adds the entire product to the wishlist regardless of which variant the customer was viewing.

IF the product does not exist or has been deleted, THE system SHALL reject the request with an appropriate error message.

### Removing Products from Wishlist

WHEN a customer requests to remove a product from their wishlist, THE system SHALL remove that specific product from the customer's wishlist.

IF the wishlist item does not exist or belongs to another customer, THE system SHALL reject the request with an appropriate error message.

### Automatic Wishlist Cleanup

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

THE system SHALL perform this cleanup silently without notifying affected customers, as the product is no longer available for purchase.

THE system SHALL preserve all other wishlist entries when removing a deleted product.

### Adding and Removing Products

### Adding Products to Wishlist

WHEN a customer selects a product to add to their wishlist, THE system SHALL add that product to the customer's wishlist.

THE system SHALL record the timestamp when the product was added to the wishlist.

IF the customer has already added the same product to their wishlist, THE system SHALL not create a duplicate entry but SHALL update the timestamp to reflect the most recent add action.

THE system SHALL store products at the product level, not at the variant level, meaning adding a product adds the entire product to the wishlist regardless of which variant the customer was viewing.

IF the product does not exist or has been deleted, THE system SHALL reject the request with an appropriate error message.

### Wishlist Item Removal

WHEN a customer requests to remove a product from their wishlist, THE system SHALL remove that specific product from the customer's wishlist.

IF the wishlist item does not exist or belongs to another customer, THE system SHALL reject the request with an appropriate error message.

### Automatic Product Deletion Cleanup

WHEN a product is deleted by its seller, THE system SHALL automatically remove that product from all customer wishlists.

THE system SHALL perform this cleanup silently without notifying affected customers, as the product is no longer available for purchase.

THE system SHALL preserve all other wishlist entries when removing a deleted product.

### Wishlist Display and Cleanup

### Wishlist Display

WHEN a customer views their wishlist, THE system SHALL display all products the customer has added, sorted by addition date with newest entries first.

THE system SHALL show each wishlisted product with its main image thumbnail, product name, base price, and the seller's shop name.

THE system SHALL indicate the availability status of each product, showing whether it is available, out of stock, or no longer available.

### Wishlist Pagination

THE system SHALL paginate the wishlist to prevent excessive loading times.

WHEN the customer reaches the end of a page, THE system SHALL provide controls to navigate to the next page of results.

THE system SHALL display the total count of items in the wishlist.

### Wishlist Product Removal

WHEN a customer removes a product from their wishlist, THE system SHALL delete the wishlist entry for that product.

IF the customer attempts to remove a product that is not in their wishlist, THE system SHALL reject the request.

### Automatic Cleanup on Product Deletion

WHEN a seller deletes a product, THE system SHALL automatically remove that product from every customer's wishlist who had added it.

THE system SHALL complete this removal immediately when the product is deleted, ensuring no references to deleted products remain in any wishlist.

Deleted products shall not trigger notifications to affected customers.

## WishlistItem Operations

Each wishlist item links a customer to a product they have saved. Wishlist items record when they were added for sorting and display purposes. Customers can remove individual items from their wishlist when they no longer want to save the product. When a product is deleted by the seller, the system automatically removes all wishlist items referencing that product across all customers.

### Adding Product to Wishlist

### Adding Product to Wishlist

When a customer adds a product to their wishlist, the system creates a wishlist item linking the customer to that product.

THE system SHALL create a wishlist item when a customer adds a product to their wishlist.

THE wishlist item SHALL reference the product being added.

THE system SHALL associate the wishlist item with the customer's wishlist.

THE system SHALL reject the request if the product does not exist.

THE system SHALL reject the request if the product has been deleted by the seller.

THE system SHALL reject the request if the product is already in the customer's wishlist.

THE system SHALL reject the request if the customer is not logged in.

### Wishlist Item Timestamp Recording

When a wishlist item is created, the system SHALL record the date and time when the product was added to the wishlist.

THE timestamp SHALL be stored with the wishlist item and used for sorting and display purposes.

THE system SHALL display the newest wishlist items first when viewing the wishlist.

### Removing Product from Wishlist

A customer can remove a product from their wishlist at any time.

THE customer SHALL be able to remove a specific wishlist item from their wishlist.

THE system SHALL remove the wishlist item from the customer's wishlist when the customer requests removal.

THE system SHALL reject the request if the wishlist item does not exist.

THE system SHALL reject the request if the wishlist item belongs to another customer.

THE system SHALL reject the request if the customer is not logged in.

### Automatic Wishlist Cleanup on Product Deletion

When a seller deletes a product, the system SHALL automatically remove all wishlist items referencing that product.

THE system SHALL remove the product from the wishlists of all customers who have added it.

THE system SHALL perform this cleanup immediately when a product is deleted.

THE customer SHALL NOT receive a notification when their wishlist item is automatically removed.

THE deleted product SHALL no longer appear in the customer's wishlist after cleanup.

### Viewing Wishlist Items

### Wishlist Item Display

When a customer views their wishlist, the system SHALL display the wishlist items sorted by the date they were added, with the most recently added items appearing first.

EACH wishlist item SHALL display the product name.

EACH wishlist item SHALL display the product main image.

EACH wishlist item SHALL display the product base price.

EACH wishlist item SHALL display the seller shop name.

EACH wishlist item SHALL display the product average rating if reviews exist.

EACH wishlist item SHALL display the date when the product was added to the wishlist.

### Wishlist Pagination

When a customer views their wishlist, the system SHALL return a paginated list of wishlist items.

THE system SHALL display a reasonable number of wishlist items per page.

THE system SHALL provide navigation to view additional pages of wishlist items.

THE pagination state SHALL be maintained when navigating between pages.

### Wishlist Item Validation and Cleanup Conditions

### Wishlist Item Validation

Before processing a wishlist operation, the system SHALL verify that the referenced product still exists.

THE system SHALL mark wishlist items as unavailable if the associated product has been deleted.

THE system SHALL prevent customers from adding a deleted product back to their wishlist.

### Wishlist Item Cleanup Conditions

The automatic wishlist cleanup SHALL occur ONLY when a product is deleted by its seller.

THE system SHALL NOT remove wishlist items when a product is temporarily out of stock.

THE system SHALL NOT remove wishlist items when a product is suspended by an administrator.

## Cart Operations

Customers have a shopping cart associated with their account for collecting items before purchase. The cart aggregates all items the customer intends to buy. Customers can view their cart at any time to see all selected items and the total price. The cart shows the overall total cost of all items before checkout. The system validates cart contents when displaying to ensure items are still available.

### Cart Creation

The system shall automatically create a shopping cart for each customer upon successful registration.

Each customer has exactly one shopping cart associated with their account.

The cart persists across customer sessions and is accessible whenever the customer is logged in.

The cart is identified by the customer's unique identifier and is created only once during the registration process.

A newly created cart contains no items initially.

### Cart Viewing with Items

Customers can view their shopping cart at any time when logged in.

When viewing the cart, the customer sees all items they have added, with the following information displayed for each item:

- The name of the product
- The specific options selected for the variant (such as color and size)
- The price of the variant at the time of addition
- The quantity the customer has selected
- The subtotal for that line item (quantity multiplied by price)

The cart also displays the total price of all items combined.

The system retrieves the current state of the cart including all cart items associated with the customer's account.

If a variant has been deleted or is no longer available, the system marks that item as unavailable in the cart display.

If a variant's available stock is less than the quantity in the cart, the system displays a warning next to that item indicating the stock limitation.

### Cart Total Price Calculation

The system shall calculate and display the total price of all items in the customer's cart.

The cart total is calculated by summing the subtotals of all cart items.

The subtotal for each cart item is the variant price multiplied by the quantity selected.

If the same variant exists multiple times in the cart (due to quantity), they are combined into a single line item showing the total quantity.

The displayed total price reflects the current prices of the variants.

The cart total does not include shipping costs, as shipping is calculated during checkout based on the selected items and shipping address.

The total price is recalculated each time the cart is viewed or when quantities are modified.

### Cart Validation for Availability

The system validates cart contents whenever the cart is viewed or when the customer proceeds to checkout.

During validation, the system checks the availability of each item in the cart.

An item is considered unavailable if:

- The associated product variant has been deleted by the seller
- The variant has no stock available (stock quantity is zero)

Unavailable items are displayed with a visual indicator showing they cannot be purchased.

The system prevents customers from proceeding to checkout if any item in the cart is unavailable.

If a variant's stock has been reduced below the quantity in the cart since the item was added, the system displays a warning showing the current maximum available quantity.

The system allows customers to proceed with checkout for available items even if some items are unavailable, by removing or addressing the unavailable items first.

The validation does not reserve or lock stock for cart items; stock is only reserved when an order is successfully placed.

## CartItem Operations

Customers add specific product variants to their cart with a selected quantity. When adding a variant already in the cart, the quantities combine into a single line rather than creating duplicates. Customers can view cart items showing product name, variant options, price, quantity, and subtotal for each line. Customers can change the quantity of items in their cart within allowed limits. Customers can remove items from their cart entirely. The system warns if a variant's available stock is less than the cart quantity. Deleted or out-of-stock variants appear as unavailable in the cart and cannot proceed to checkout.

### Adding Items to Cart

## Adding Items to Cart

WHEN a customer adds a variant to their cart, THE system SHALL record the selected variant, the quantity requested, and the current unit price.

WHEN a customer adds a variant that is already present in their cart, THE system SHALL combine the quantities into a single cart line rather than creating a duplicate entry.

WHEN a customer attempts to add a variant to their cart, IF the variant is out of stock, THE system SHALL reject the addition and display a message indicating the item is unavailable.

WHEN a customer adds a variant to their cart, THE system SHALL record the timestamp of when the item was added.

WHEN a customer adds a variant to their cart with a quantity exceeding 99, THE system SHALL reject the request.

WHEN a customer adds a variant to their cart with a quantity less than 1, THE system SHALL reject the request.

---

## Viewing Cart Items

WHEN a customer views their cart, THE system SHALL display each cart item showing the product name, variant option values (such as color and size), the unit price, the quantity selected, and the line subtotal (unit price multiplied by quantity).

WHEN a customer views their cart, THE system SHALL calculate and display the total price of all items in the cart.

WHEN a cart item's variant has been deleted from the platform, THE system SHALL display the item as unavailable and indicate that it can be removed but cannot be purchased.

WHEN a cart item's variant is out of stock, THE system SHALL display the item with an out-of-stock warning showing the current available stock quantity.

---

## Modifying Cart Item Quantity

WHEN a customer changes the quantity of a cart item, THE system SHALL update the line subtotal to reflect the new quantity multiplied by the unit price.

WHEN a customer attempts to change a cart item quantity to more than 99, THE system SHALL reject the request.

WHEN a customer attempts to change a cart item quantity to less than 1, THE system SHALL treat this as a request to remove the item.

WHEN a customer modifies a cart item quantity, THE system SHALL recalculate the cart total.

---

## Removing Cart Items

WHEN a customer removes an item from their cart, THE system SHALL delete the cart line and recalculate the cart total.

WHEN a customer removes an unavailable item from their cart, THE system SHALL delete the cart line.

WHEN all items are removed from a cart, THE system SHALL display an empty cart message.

---

## Out of Stock and Availability Warnings

WHEN a customer views their cart, IF any item's available stock quantity is less than the cart quantity, THE system SHALL display a warning indicating the stock shortage.

WHEN a customer views their cart, IF any item's variant has been deleted, THE system SHALL mark that item as unavailable and prevent it from being included in checkout.

WHEN a customer attempts to proceed to checkout with unavailable items in their cart, THE system SHALL require the customer to remove unavailable items before continuing.

WHEN a customer's cart is viewed after a variant goes out of stock, THE system SHALL update the display to show the out-of-stock warning for that item.

### Variant Quantity Combination

## Variant and Quantity Combination Rules

WHEN a customer adds a variant to their cart that already exists in the cart, THE system SHALL preserve the existing cart line and add the new quantity to the current quantity.

WHEN calculating the combined quantity, THE system SHALL ensure the total does not exceed 99. If the combined total would exceed 99, THE system SHALL reject the addition and inform the customer of the maximum allowed quantity.

WHEN combining quantities, THE system SHALL maintain the unit price that was recorded when the item was first added to the cart.

---

## Cart Item Identification

WHEN determining if a variant already exists in the cart for combination purposes, THE system SHALL match by the specific variant (identified by its unique SKU code), not by the parent product.

IF the same product has multiple different variants (such as different colors or sizes), THE system SHALL treat each variant as a separate cart line.

---

## Display of Combined Items

WHEN a customer views a cart with combined quantities, THE system SHALL display the single cart line showing the total quantity, the unit price, and the combined subtotal.

WHEN a customer modifies the quantity of a combined cart line, THE system SHALL update the quantity for that variant across the entire cart.

### Cart Item Display

## Cart Item Information Display

WHEN displaying a cart item, THE system SHALL show the product name of the variant being purchased.

WHEN displaying a cart item, THE system SHALL show the option values for that variant, such as color, size, and any other configurable attributes.

WHEN displaying a cart item, THE system SHALL show the unit price for that variant at the time it was added to the cart.

WHEN displaying a cart item, THE system SHALL show the quantity the customer selected.

WHEN displaying a cart item, THE system SHALL calculate and show the line subtotal by multiplying the unit price by the quantity.

---

## Price Display Rules

IF a variant has a price override set by the seller, THE system SHALL display the override price instead of the product's base price.

IF a variant does not have a price override, THE system SHALL display the product's base price.

---

## Cart Total Display

WHEN displaying the cart, THE system SHALL calculate the sum of all line subtotals and display this as the cart total.

THE cart total SHALL update automatically when items are added, removed, or quantities are modified.

### Cart Quantity Modification

## Quantity Modification Operations

WHEN a customer modifies the quantity of a cart item, THE system SHALL validate the new quantity is between 1 and 99 inclusive.

WHEN a customer modifies a cart item quantity to zero, THE system SHALL remove the item from the cart.

WHEN a customer modifies a cart item quantity to a negative number, THE system SHALL reject the request.

---

## Quantity Modification Effects

WHEN a cart item quantity is modified, THE system SHALL recalculate the line subtotal for that item.

WHEN a cart item quantity is modified, THE system SHALL recalculate the cart total.

---

## Stock Validation on Quantity Change

WHEN a customer attempts to modify a cart item quantity to a value higher than the available stock, THE system SHALL display a warning showing the current available stock quantity.

WHEN a customer confirms a quantity modification despite the stock warning, THE system SHALL accept the new quantity even if it exceeds available stock.

---

## Concurrent Quantity Modifications

WHEN multiple quantity modifications are submitted simultaneously for the same cart item, THE system SHALL process the requests in the order they are received and prevent race conditions.

IF a variant becomes unavailable after a customer has added it to their cart, THE system SHALL mark that cart item as unavailable when the customer views or modifies the cart.

### Cart Item Removal

## Removing Individual Cart Items

WHEN a customer removes an available cart item, THE system SHALL delete the cart line and preserve the rest of the cart.

WHEN a customer removes an unavailable cart item, THE system SHALL delete the cart line.

WHEN the last item is removed from the cart, THE system SHALL display an empty cart state.

---

## Clear Cart Operation

WHEN a customer clears their entire cart, THE system SHALL remove all cart items and display an empty cart.

WHEN an order is successfully placed, THE system SHALL automatically remove all items from the customer's cart.

---

## Automatic Cart Item Removal

WHEN a variant is deleted by the seller, THE system SHALL mark the corresponding cart items as unavailable rather than immediately removing them, allowing the customer to see what happened.

WHEN the platform removes unavailable items from a customer's cart, THE system SHALL notify the customer that the items were removed because they are no longer available.

---

## Removal Confirmation

WHEN a customer removes a cart item, THE system SHALL immediately update the cart total.

THE system SHALL NOT require confirmation for removing individual cart items.

### Out of Stock Warning

## Out of Stock Detection

WHEN a customer views their cart, THE system SHALL compare each item's cart quantity against the current available stock quantity for that variant.

IF the available stock quantity is less than the cart quantity, THE system SHALL display a warning next to that item indicating the stock shortage.

---

## Stock Warning Display

WHEN displaying an out-of-stock warning, THE system SHALL show how many units are currently available.

WHEN displaying an out-of-stock warning, THE system SHALL indicate that proceeding with checkout may result in partial fulfillment.

---

## Out of Stock Item Restrictions

WHEN a variant has zero stock, THE system SHALL mark the cart item as unavailable and prevent it from being included in checkout.

WHEN a variant is out of stock and a customer attempts to add it to their cart, THE system SHALL reject the addition and inform the customer the item is out of stock.

---

## Real-Time Stock Updates

WHEN stock is restored to a variant (through restocking or cancellation), THE system SHALL update any cart items showing that variant to remove the out-of-stock warning if sufficient stock becomes available.

WHEN stock is reduced for a variant in a customer's cart (through other customers' purchases), THE system SHALL update the stock warning to reflect the new availability.

### Unavailable Item Handling

## Unavailable Item Identification

WHEN a cart item's variant has been deleted from the platform, THE system SHALL mark that item as unavailable.

WHEN a cart item's variant is out of stock, THE system SHALL mark that item as unavailable for checkout purposes.

---

## Displaying Unavailable Items

WHEN a customer views their cart containing unavailable items, THE system SHALL clearly indicate which items are unavailable.

WHEN displaying an unavailable item, THE system SHALL show the product name but indicate that the specific variant is no longer available.

WHEN displaying an unavailable item, THE system SHALL allow the customer to remove it from the cart.

---

## Checkout Restrictions

WHEN a customer attempts to proceed to checkout, THE system SHALL exclude unavailable items from the order.

WHEN a customer attempts to proceed to checkout with only unavailable items, THE system SHALL block the checkout and require the customer to add available items.

---

## Unavailable Item Messaging

WHEN a customer views an item marked unavailable due to deletion, THE system SHALL display a message indicating the product is no longer sold.

WHEN a customer views an item marked unavailable due to stock depletion, THE system SHALL display a message indicating the item is currently out of stock.

---

## Automatic Cleanup

WHEN a product is deleted by the seller, THE system SHALL remove all corresponding wishlist entries for that product automatically.

FOR cart items, THE system SHALL mark them as unavailable rather than automatically removing them, so customers are aware of what happened to their selections.

## Order Operations

Orders are created when customers successfully complete the checkout and payment process. Each order has a unique order number for identification and reference. Orders contain one or more order items representing purchased product variants with quantities. Order items can be from different sellers within the same order. Orders include the shipping address selected at checkout, which cannot be changed after placement. The total price is calculated from all order items. Customers can view their order history sorted by newest first with pagination. Order details show all items with their statuses, shipping address, and shipment tracking information.

### Order Creation on Payment Success

WHEN a customer completes checkout and the payment is confirmed successful, THEN the system SHALL create an order record.

WHEN an order is created, the system SHALL capture the following information:
- A unique order number for customer reference
- The selected shipping address at the time of checkout
- All items from the customer's cart as order items
- The calculated total price for all items
- The timestamp of order creation

WHEN an order is created, the system SHALL perform the following automatic operations:
- Decrease stock quantities for each purchased variant based on the quantities ordered
- Create inventory records with negative quantities for each purchased variant
- Remove all purchased items from the customer's cart
- Create snapshots of each purchased product and variant and store them with the corresponding order items
- Create snapshots of each seller's profile and store them with the corresponding order items

WHEN payment fails, THEN the system SHALL NOT create an order and SHALL return the customer to checkout to retry payment.

### Order Number Generation

THE system SHALL generate a unique order number for every created order.

THE order number SHALL be used by customers to identify and reference their orders.

THE order number SHALL be included in all order-related communications and displays.

Customers SHALL be able to search for orders using their order number.

### Multiple Seller Items in Single Order

THE system SHALL allow customers to purchase items from multiple sellers within a single order.

WHEN an order contains items from different sellers, each item SHALL be associated with its respective seller.

The system SHALL create a snapshot of each seller's profile at the time of purchase and store it with the order items belonging to that seller.

Each seller SHALL be able to view and manage only the order items that belong to their shop.

The system SHALL track each seller's items independently within the same order.

### Shipping Address Association

WHEN an order is placed, the system SHALL store the shipping address that was selected at checkout.

THE stored address SHALL include all address fields: recipient name, phone number, street address, city, state or province, postal code, and country.

THE shipping address in an order SHALL be immutable after order creation — it cannot be changed.

IF the customer's default address was selected, that specific address information SHALL be captured and stored separately from the default address setting.

IF the customer had edited the address during checkout, the edited version SHALL be stored, not the original saved address.

### Order Total Price Calculation

THE system SHALL calculate the order total by summing the subtotals of all order items.

EACH order item subtotal SHALL be calculated as the unit price multiplied by the quantity ordered.

THE unit price for each order item SHALL be captured from the variant price at the time of purchase.

IF a variant has a price override, that override SHALL be used as the unit price; otherwise, the product base price SHALL be used.

THE calculated total price SHALL be stored with the order and SHALL NOT change even if prices change later.

The order total SHALL be displayed to the customer during checkout review and on the order confirmation.

### Order History Viewing

THE system SHALL allow customers to view a list of all their past orders.

THE order history list SHALL be sorted by order date, with the newest orders appearing first.

THE order history list SHALL be paginated to display a manageable number of orders per page.

EACH order in the history list SHALL display:
- The order number
- The date the order was placed
- The total price of the order
- The current overall status of the order

THE system SHALL allow customers to view the full details of any order from their history.

Customers SHALL only be able to view their own order history; they SHALL NOT have access to other customers' orders.

### Order Details Display

WHEN a customer views the details of an order, THE system SHALL display the following information:

**Order Information:**
- Order number
- Order date and time
- Order status (paid, shipped, delivered, cancelled, refunded, or partially completed)
- Total price paid

**Order Items:**
For each item in the order, the system SHALL display:
- Product name (as it was at the time of purchase)
- Variant options (such as color and size)
- Quantity ordered
- Unit price at the time of purchase
- Item status (paid, shipped, delivered, cancelled, or refunded)
- Seller shop name (as it was at the time of purchase)

**Shipping Address:**
- The complete shipping address used for the order

**Shipment Information:**
For each shipment associated with the order, the system SHALL display:
- Which items are included in the shipment
- The carrier name
- The tracking number
- The shipping date
- The delivery status

IF the order has items from multiple sellers, the shipments SHALL be grouped by seller, with each seller having separate shipment information.

## OrderItem Operations

Each order contains individual order items representing purchased product variants. Order items have their own status independent of other items: paid, shipped, delivered, cancelled, or refunded. Order items preserve snapshots of the product and variant at purchase time, including product name, description, variant options, and price. Order items also preserve a snapshot of the seller profile at purchase time with shop name and logo. Sellers can view order items for their products and update item status as orders progress. Each order item can be individually cancelled or refunded based on its current status.

### Order Item Status Tracking

### Order Item Status Types

Each order item has an independent status that tracks its progression through the order lifecycle.

The system SHALL track the following order item statuses:

- **Paid**: Payment has been completed and the seller has not yet shipped the item.
- **Shipped**: The seller has shipped the item and tracking information is available.
- **Delivered**: The item has been delivered to the customer.
- **Cancelled**: The item has been cancelled before shipping.
- **Refunded**: The item has been refunded after delivery.

### Order Item Status Derivation

The status of an order item is determined by the sequence of events that occur:

- An order item starts with status "paid" when the customer's payment is successfully processed.
- An order item changes to "shipped" when the seller creates a shipment containing that item.
- An order item changes to "delivered" when the customer confirms delivery of the shipment containing that item, or automatically after 14 days from the shipping date.
- An order item changes to "cancelled" when a cancellation request is approved by the seller.
- An order item changes to "refunded" when a refund request is approved by the seller.

### Status Independence

Each order item maintains its own status independent of other items in the same order. A customer can have some items delivered while others are still pending, and each item follows its own status progression.

### Order Item Status Transitions

### Status Transition Rules

The system SHALL enforce the following status transition rules:

#### Paid Status Transitions

WHEN an order item has status "paid", THEN the system SHALL allow:
- Transition to "shipped" when the seller creates a shipment containing the item.
- Transition to "cancelled" when the seller approves a cancellation request for the item.

WHEN an order item has status "paid", THEN the system SHALL prevent:
- Direct transition to "delivered" without shipping.
- Direct transition to "refunded" (refunds require delivery first).

#### Shipped Status Transitions

WHEN an order item has status "shipped", THEN the system SHALL allow:
- Transition to "delivered" when the customer confirms delivery or after 14 days from shipping.
- Transition to "cancelled" is NOT allowed (item has already been shipped).
- Transition to "refunded" is NOT allowed (must be delivered first).

#### Delivered Status Transitions

WHEN an order item has status "delivered", THEN the system SHALL allow:
- Transition to "refunded" when the seller approves a refund request within 7 days of delivery.
- Transition to "cancelled" is NOT allowed (item has already been delivered).

WHEN a refund request for an order item is rejected, THEN the system SHALL keep the order item status as "delivered".

#### Cancelled Status Transitions

WHEN an order item has status "cancelled", THEN the system SHALL NOT allow any further status transitions.

#### Refunded Status Transitions

WHEN an order item has status "refunded", THEN the system SHALL NOT allow any further status transitions.

### Product Snapshot Preservation

### Product Snapshot Creation on Order Placement

WHEN an order is successfully placed and payment is confirmed, THEN the system SHALL create a product snapshot for each order item.

The product snapshot SHALL include:
- The product name at the time of purchase.
- The product description at the time of purchase.
- The product category at the time of purchase.
- The base price at the time of purchase.
- All product images at the time of purchase.
- All variant information including SKU code, option values, and price at the time of purchase.

### Variant Snapshot Inclusion

The product snapshot SHALL also include snapshots of all variants associated with the product at the moment of purchase.

Each variant snapshot SHALL include:
- The variant SKU code.
- The variant option values (such as color and size combinations).
- The variant price override or base price if no override exists.
- The stock quantity at the time of purchase.

### Snapshot Immutability

Product snapshots stored with order items are immutable and cannot be modified after creation. The system SHALL preserve the exact state of the product and its variants as they existed at the time of purchase.

### Snapshot Accessibility

Customers can view the product snapshot information when viewing their order details. The snapshot shows what the product looked like when they purchased it, including any price or option changes that may have occurred since.

Sellers can view the product snapshots of their products to understand what customers purchased.

Administrators can view product snapshots of any order item for dispute resolution purposes.

### Seller Profile Snapshot in Order Items

### Seller Profile Snapshot Creation on Order Placement

WHEN an order is successfully placed and payment is confirmed, THEN the system SHALL create a seller profile snapshot for each order item.

The seller profile snapshot SHALL include:
- The shop name at the time of purchase.
- The shop description at the time of purchase.
- The shop logo image URL at the time of purchase.

### Snapshot Immutability

Seller profile snapshots stored with order items are immutable and cannot be modified after creation. The system SHALL preserve the exact state of the seller profile as it existed at the time of purchase.

### Historical Information Preservation

The seller profile snapshot ensures that order history accurately reflects the seller information visible to the customer at the time of purchase. This is important for:
- Maintaining accurate order records.
- Resolving disputes about what seller information was presented.
- Preserving historical shop names even if the seller later changes their shop name or deletes their account.

### Snapshot Display

When customers view their order details, the system SHALL display the seller profile snapshot information showing:
- The shop name as it appeared at the time of purchase.
- The shop logo as it appeared at the time of purchase.

This allows customers to identify which seller fulfilled their order even if the seller has since changed their shop name.

### Seller Order Item Management

### Viewing Order Items for Seller Products

Sellers can view a list of all order items that contain their products. The system SHALL display:
- The order item details including product name, variant options, and quantity.
- The current status of each order item.
- The customer shipping address (without personal details beyond what is needed for shipping).
- The order date and order number.

### Filtering Order Items by Status

Sellers can filter their order item list by status. The system SHALL support filtering by:
- Paid items (awaiting shipment).
- Shipped items (in transit).
- Delivered items (completed).
- Cancelled items.
- Refunded items.

### Order Item Actions Based on Status

#### Paid Order Items

WHEN a seller views a paid order item, THEN the system SHALL allow the seller to:
- Create a shipment with tracking information to change the item status to "shipped".
- View any pending cancellation requests for the item.

#### Shipped Order Items

WHEN a seller views a shipped order item, THEN the system SHALL allow the seller to:
- View the tracking information and delivery status.
- View any delivery confirmation from the customer.

#### Delivered Order Items

WHEN a seller views a delivered order item, THEN the system SHALL allow the seller to:
- View the refund window (7 days from delivery).
- View any pending refund requests for the item.

#### Cancelled and Refunded Order Items

WHEN a seller views a cancelled or refunded order item, THEN the system SHALL display:
- The reason for cancellation or refund.
- The date the request was approved.
- Any snapshots of the request at the time of response.

## Shipment Operations

Shipments represent packages sent by a seller containing one or more order items. Items in a shipment must all be from the same seller. Sellers create shipments by selecting their order items and entering carrier name and tracking number. All items in a shipment share the same tracking information and change to shipped status together. Customers can view tracking information for each shipment in their order. Customers confirm delivery per shipment, which changes all items in that shipment to delivered status. Items automatically become delivered if not confirmed within fourteen days of shipping.

### Shipment Creation

Sellers can create shipments for their order items that have paid status.\n\nWHEN a seller selects one or more of their order items to ship, THE system SHALL create a shipment containing those items.\n\nWHEN a seller selects items from different orders, THE system SHALL create separate shipments for each order.\n\nWHEN a seller creates a shipment, THE system SHALL require the seller to enter the carrier name and tracking number for that shipment.

### Multiple Items per Shipment

Sellers can include multiple order items in a single shipment.\n\nWHEN a seller ships multiple items, THE system SHALL allow the seller to bundle those items into one shipment.\n\nAll items within a single shipment MUST belong to the same seller.\n\nWHEN a seller ships items from different sellers, THE system SHALL require separate shipments for each seller.\n\nSellers can choose to ship each item individually or combine multiple items into one shipment based on their packaging preferences.

### Tracking Information Entry

Sellers must provide tracking information when creating a shipment.\n\nWHEN a seller creates a shipment, THE system SHALL require the carrier name and tracking number.\n\nThe carrier name identifies the shipping company delivering the package.\n\nThe tracking number allows the customer and seller to monitor the shipment's progress.\n\nAll items included in a shipment share the same carrier name and tracking number.

### Shipment Status Transition to Shipped

WHEN a shipment is created, THE system SHALL change the status of all items included in that shipment from paid to shipped.\n\nThe shipped status indicates the seller has handed the package to the carrier for delivery.\n\nWHEN all items in an order have shipped, THE system SHALL update the overall order status to shipped.\n\nItems that have shipped cannot be cancelled through the cancellation request process.

### Customer Tracking Information Viewing

Customers can view the tracking information for each shipment in their order.\n\nWHEN a customer views their order details, THE system SHALL display all shipments associated with that order.\n\nFor each shipment, THE system SHALL show the carrier name, tracking number, and shipping date.\n\nThe tracking information allows customers to monitor the delivery progress through the carrier's website or system.

### Delivery Confirmation per Shipment

Customers can confirm delivery for each shipment individually.\n\nWHEN a customer confirms delivery of a shipment, THE system SHALL change the status of all items in that shipment from shipped to delivered.\n\nA shipment confirmation affects only the items within that specific shipment, not items in other shipments.\n\nWHEN a customer views their order, THE system SHALL provide a delivery confirmation option for each shipped shipment.

### Automatic Delivery After Fourteen Days

Items automatically change to delivered status if the customer has not confirmed delivery within fourteen days of shipping.\n\nWHEN fourteen days have passed since a shipment was shipped and the customer has not confirmed delivery, THE system SHALL automatically change all items in that shipment to delivered status.\n\nThe fourteen-day countdown begins from the shipping date recorded when the shipment was created.\n\nWHEN items become automatically delivered, THE system SHALL allow customers to request refunds for those items within seven days of automatic delivery.

## CancellationRequest Operations

Customers can request cancellation of individual order items with paid status that have not yet shipped. Cancellation requests include a written reason explaining why the customer wants to cancel. The seller of that item reviews the request and can approve or reject it. When a seller responds, a snapshot of the cancellation request state is created. If approved, the item is cancelled, stock is restored via inventory records, and a refund is processed for that item only. The remaining items in the order continue processing normally. Sellers view pending cancellation requests in their dashboard.

### Cancellation Request Creation

#### Partial Order Cancellation Handling

A cancellation request applies to a single order item, not the entire order.

When one or more items in an order are cancelled, the remaining items continue processing normally.

The overall order status updates based on the remaining items:

- If all remaining items are still paid, the order status remains paid
- If any remaining item is shipped, the order status becomes shipped
- If all remaining items are delivered, the order status becomes delivered

The customer can still view the complete order history including both cancelled and non-cancelled items.

Each order item maintains its own status independently of other items in the same order.

If the customer cancels every item in an order, the overall order status becomes cancelled.

## RefundRequest Operations

Customers can request refunds for individual order items that have been delivered. Refund requests include a written reason and must be submitted within seven days of delivery. The seller reviews the refund request and can approve or reject it. When a seller responds, a snapshot of the refund request state is created. If approved, the item is refunded and stock is restored via inventory records. The remaining items in the order are unaffected by the refund. Sellers view pending refund requests in their dashboard.

### Refund Request Creation

### Refund Request Creation

THE system SHALL allow customers to request a refund for individual order items.

WHEN a customer requests a refund, THE system SHALL require the customer to provide a written reason explaining why the refund is requested.

WHEN a customer submits a refund request, THE system SHALL associate the request with the specific order item being refunded.

THE system SHALL only allow refund requests for order items with a status of "delivered".

THE system SHALL reject refund requests for order items that have not been delivered.

### Refund Window Enforcement

WHEN a customer attempts to request a refund, THE system SHALL verify that the order item was delivered within the past seven days.

THE system SHALL reject refund requests if more than seven days have passed since the item was marked as delivered.

THE system SHALL display the remaining days available for requesting a refund on the order history page.

### Seller Review of Refund Requests

THE system SHALL notify sellers when a refund request is submitted for one of their products.

THE system SHALL display all pending refund requests in the seller's dashboard.

THE system SHALL allow sellers to view the refund reason provided by the customer.

THE system SHALL allow sellers to approve refund requests.

THE system SHALL allow sellers to reject refund requests.

WHEN a seller rejects a refund request, THE system SHALL require the seller to provide a reason for the rejection.

### Refund Request Snapshot

WHEN a seller responds to a refund request (either approving or rejecting), THE system SHALL create a snapshot recording the state of the refund request at that moment.

THE snapshot SHALL include the refund reason provided by the customer.

THE snapshot SHALL include the response decision made by the seller.

THE snapshot SHALL include the rejection reason if the seller rejected the request.

THE snapshot SHALL include the timestamp of the seller's response.

THE snapshot SHALL be immutable and SHALL be preserved even if the refund request is later modified.

### Stock Restoration on Refund Approval

WHEN a seller approves a refund request, THE system SHALL mark the order item status as "refunded".

WHEN a seller approves a refund request, THE system SHALL restore the stock quantity of the refunded variant by adding inventory records.

THE system SHALL create an inventory record with a positive quantity change equal to the refunded item quantity.

THE inventory record SHALL include a reason indicating the refund.

### Partial Order Refund Handling

THE system SHALL handle refunds on a per-item basis within an order.

WHEN a single item in an order is refunded, THE system SHALL preserve the status of all other items in the order.

THE system SHALL calculate the overall order status based on the statuses of all items.

IF some items are refunded while others remain delivered or in other statuses, THE system SHALL set the order status to reflect this mixed state.

WHEN all items in an order are refunded, THE system SHALL set the order status to "refunded".

### Refund Request Status Tracking

THE system SHALL track the status of each refund request as pending, approved, or rejected.

THE system SHALL record the timestamp when the refund request was submitted.

THE system SHALL record the timestamp when the seller responded to the refund request.

THE system SHALL allow customers to view the current status of their refund requests.

THE system SHALL allow customers to view the seller's response and reason for rejection if the request was rejected.

## Snapshot Operations

The platform creates snapshots to preserve the state of editable data before modifications occur. Snapshots record what content type was changed, which record was affected, and the complete previous state before the edit. Snapshots are immutable once created and cannot be deleted or modified. Relevant parties including owners and administrators can view snapshots for dispute resolution. Snapshots serve as the authoritative historical record of data changes on the platform.

### Snapshot Creation on Data Modification

WHEN any editable data on the platform is modified, THEN the system SHALL create a snapshot to preserve the previous state before the modification is applied.

The system SHALL create snapshots for the following data types:
- Products and their variants
- Seller profiles
- Reviews
- Cancellation requests
- Refund requests

WHEN a user initiates an edit operation on any snapshot-eligible data, THEN the system SHALL capture a complete record of the current state before saving the new values.

The snapshot SHALL be created as an atomic operation, ensuring that if the modification fails, no partial snapshot is created.

WHEN a snapshot is created, THEN the system SHALL record the identity of the user who initiated the change.

The system SHALL create snapshots regardless of whether the new values differ from the old values, to maintain a complete audit trail.

### Snapshot Content Type and Identifier

EACH snapshot SHALL contain the following information:
- The type of content that was modified (such as product, seller profile, review, cancellation request, or refund request)
- The unique identifier of the record that was modified
- The complete previous state of all editable fields before the modification
- The complete new state of all editable fields after the modification
- The date and time when the change was made
- The user who made the change

WHEN a snapshot is associated with a product, THEN it SHALL include all product fields and all variants with their complete state at the time of the snapshot.

WHEN a snapshot is associated with a seller profile, THEN it SHALL include the shop name, description, and logo image URL.

The system SHALL store the content type as a text value that identifies the category of the modified record.

The system SHALL store the content identifier as the unique reference number of the specific record that was modified.

### Immutable Snapshot Records

Snapshots SHALL be immutable once created.

THE system SHALL prevent any user, including administrators, from modifying or deleting a snapshot record.

IF a user attempts to delete a snapshot, THEN the system SHALL reject the request and return an error.

IF a user attempts to modify snapshot content, THEN the system SHALL reject the request and return an error.

Snapshots SHALL persist even when the associated source record is deleted, ensuring historical data remains available.

WHEN a product is deleted, THEN all related snapshots SHALL be preserved for dispute resolution purposes.

WHEN a seller account is deleted, THEN all related snapshots SHALL be preserved, with the seller name preserved in past order records.

The immutability guarantee ensures that snapshot records can serve as reliable evidence in any dispute.

### Snapshot Viewing by Owners and Administrators

Owners of a record SHALL be able to view all snapshots associated with their own data.

WHEN a seller views their product history, THEN the system SHALL display all snapshots showing previous versions of that product.

WHEN a seller views their profile history, THEN the system SHALL display all snapshots showing previous versions of their shop information.

WHEN a customer views the history of a review they wrote, THEN the system SHALL display all snapshots showing previous versions of that review.

Administrators SHALL be able to view snapshots for any record on the platform.

WHEN an administrator views a product, THEN the system SHALL provide access to all snapshots of that product regardless of which seller owns it.

WHEN an administrator investigates a dispute, THEN the system SHALL provide access to all relevant snapshots across the platform.

The system SHALL display snapshots in chronological order, with the most recent snapshot appearing last.

Each snapshot view SHALL show what was changed, when the change occurred, and who made the change.

### Snapshot for Dispute Resolution

THE system SHALL preserve snapshots to support dispute resolution between buyers and sellers.

WHEN a customer disputes a product they purchased, THEN administrators SHALL be able to view the product snapshot that was active at the time of purchase.

The product snapshot SHALL show the exact product name, description, images, variants, and prices as they existed when the order was placed.

WHEN a customer disputes what they received versus what was advertised, THEN the snapshot SHALL serve as authoritative evidence of the advertised state.

WHEN a seller disputes a return or refund request, THEN administrators SHALL be able to view the order item snapshot showing the product and seller profile at the time of sale.

WHEN a cancellation or refund request is processed, THEN the snapshot SHALL capture the complete state of the request including its status changes.

Snapshots SHALL be retrievable by administrators for any time period to investigate historical disputes.

THE system SHALL make snapshot data available in a format that can be presented as evidence during dispute resolution proceedings.

## ProductSnapshot Operations

Product snapshots capture the complete state of a product and all its variants at a specific moment in time. The snapshot includes all product fields such as name, description, category, and base price. The snapshot also includes snapshots of every variant with their SKU codes, option values, and prices. This preserves exactly what customers saw and ordered at the time. Product snapshots are created automatically whenever a product or variant is edited. Sellers can view snapshots of their own products, and administrators can view any product snapshot.

### Product Snapshot Creation on Product Edit

WHEN a seller edits a product, THE system SHALL automatically create a product snapshot.

THE product snapshot SHALL include all product fields at the time of edit, including: product name, product description, product category assignment, and base price.

THE product snapshot SHALL also include the current state of every variant associated with the product.

THE snapshot SHALL capture product images in their current order, with the main image identified.

THE system SHALL preserve the complete product state so that any point in time can be reconstructed exactly.

### Product Snapshot Creation on Variant Edit

WHEN a seller edits a variant of a product, THE system SHALL create a product snapshot that includes the updated variant state.

THE variant snapshot SHALL include: the SKU code, all option values, and the current price.

WHEN a variant is edited, THE system SHALL include snapshots of all other variants at their current state, not just the edited one.

THE snapshot SHALL reflect the complete product and variant landscape at that moment.

### Product Snapshot Structure

THE product snapshot SHALL contain the following product-level information:

- Product name at the time of snapshot
- Product description at the time of snapshot
- Category assignment at the time of snapshot
- Base price at the time of snapshot
- All product images with their URLs and display order

THE product snapshot SHALL contain variant-level snapshots for each variant, including:

- SKU code
- Option values combination
- Price at the time of snapshot
- Stock quantity at the time of snapshot

### Seller Viewing Own Product Snapshots

SELLERS can view a list of all snapshots for their own products.

THE list SHALL show the date and time each snapshot was created and indicate whether it was created from a product edit or a variant edit.

SELLERS can select a specific snapshot to view the complete product state at that point in time.

THE view SHALL display all product fields and all variants with their fields as they existed when the snapshot was created.

SELLERS can use snapshots for dispute resolution with customers regarding what was advertised at the time of purchase.

### Administrator Viewing Any Product Snapshot

ADMINISTRATORS can view snapshots of any product on the platform.

THE list SHALL show snapshots from all sellers, with the ability to filter by seller if needed.

ADMINISTRATORS can select any snapshot to view the complete product state including all variants.

THE view SHALL display all product fields, images, and variant details as they existed when the snapshot was created.

ADMINISTRATORS can use snapshots to verify product descriptions or prices at specific points in time for policy enforcement.

### Product Snapshot Preservation After Deletion

WHEN a product is deleted, THE system SHALL preserve all associated product snapshots.

THE product snapshots SHALL remain accessible to the seller who created them and to administrators.

THE preserved snapshots SHALL allow reconstruction of the product state at any previous point in time.

THE variant snapshots within preserved product snapshots SHALL remain intact and viewable.

## SellerProfileSnapshot Operations

Seller profile snapshots preserve the state of a seller's shop information at a specific moment. The snapshot includes shop name, description, and logo image URL. These snapshots are stored with order items to show what the seller profile looked like at the time of purchase. This ensures order records remain accurate even if the seller changes their shop name or logo later.

### SellerProfileSnapshot Creation

When a seller edits their shop name, description, or logo, the system creates a snapshot to preserve the previous state before applying the change.

The snapshot records the shop name as it appeared before the edit, the shop description as it appeared before the edit, and the logo image URL as it appeared before the edit. The snapshot also records the timestamp of when the change was made and identifies which seller profile was changed.

Each profile edit by a seller creates exactly one snapshot, regardless of how many fields were changed in that edit.

### SellerProfileSnapshot Fields

A seller profile snapshot contains the following information:

- Shop name at the time of the snapshot
- Shop description at the time of the snapshot  
- Shop logo image URL at the time of the snapshot
- Timestamp indicating when the snapshot was created
- Identifier linking to the seller whose profile was captured

These fields together represent the complete state of a seller's public profile information at a specific moment in time.

### SellerProfileSnapshot Storage with Order Items

When a customer places an order containing items from a seller, the system stores a snapshot of that seller's profile with each relevant order item.

The snapshot captured at order time preserves the shop name, shop description, and logo as they appeared when the customer made the purchase. This snapshot remains permanently attached to the order item and is never updated even if the seller changes their profile later.

This storage mechanism ensures that order records maintain accurate historical information about the seller, regardless of any future profile changes.

### Historical Seller Information Preservation

The system preserves the historical state of seller profiles to maintain accurate order records.

When customers view their past orders, the order details display the seller's shop name and logo as they appeared at the time of purchase, not their current values. This allows customers to recognize sellers from their purchase history even if the seller has since changed their shop name.

When sellers view their sales records, the order items display the profile information that was current at the time of each sale.

This historical preservation protects both customers and sellers in case of disputes regarding what was purchased and from whom.

### SellerProfileSnapshot Immutability and Retention

Seller profile snapshots are immutable records that cannot be modified or deleted once created.

The snapshot records are preserved indefinitely, including cases where the seller deletes their account. Even when a seller account is removed, the snapshots stored with existing order items remain intact, ensuring customers can always view the seller information associated with their purchase history.

The system does not allow any user or administrator to alter, remove, or overwrite a seller profile snapshot after it has been created.

### SellerProfileSnapshot Access Control

Sellers can view snapshots of their own profile history to track changes to their shop information over time.

Administrators can view snapshots of any seller's profile for dispute resolution and oversight purposes.

Customers can view the seller profile snapshots attached to their own order items when viewing order history.

General users who are not associated with a snapshot do not have access to view its contents.

## AdminRequest Operations

Any platform user can submit a request to become an administrator by providing a reason. Super administrators review pending requests and can approve or reject them. When approved, the user becomes a regular administrator. Super administrators can promote regular administrators to super administrator status or demote other super administrators to regular. Super administrators cannot demote themselves. The system tracks the grade of each administrator request and its approval status.

### Admin Request Submission

Any platform user can submit a request to become an administrator.

WHEN a user submits an administrator request, THE system SHALL record the requesting user, the requested grade, and the reason provided by the user.

The submitted reason must be preserved in the request record and made available for review by super administrators.

Users who are already administrators cannot submit additional administrator requests.

Each user can only have one pending administrator request at any time.

WHEN the request is submitted, THE system SHALL set the request status to pending and the grade to regular.

The requesting user can view the status of their own administrator request at any time.

### Pending Request Viewing

Super administrators can view a list of all pending administrator requests.

WHEN a super administrator requests the list of pending requests, THE system SHALL display each request showing the requesting user's information, the submitted reason, and the date of submission.

Super administrators can filter the pending requests to view only those at a specific grade level.

Regular administrators cannot view the list of pending administrator requests.

### Request Approval

Super administrators can approve pending administrator requests.

WHEN a super administrator approves a request, THE system SHALL change the request status to approved and record the response timestamp.

WHEN the request is approved, THE system SHALL grant the user administrator privileges at the requested grade level.

Approved requests cannot be reversed through the request record.

The requesting user receives the administrator privileges immediately upon approval.

Super administrators cannot approve their own administrator requests.

### Request Rejection

Super administrators can reject pending administrator requests.

WHEN a super administrator rejects a request, THE system SHALL change the request status to rejected and record the response timestamp.

The rejecting super administrator may provide a reason for the rejection, which must be stored with the request.

The rejected user can view the rejection reason if one was provided.

A rejected user may submit a new administrator request at a later time.

### Administrator Promotion

Super administrators can promote regular administrators to super administrator status.

WHEN a super administrator promotes a regular administrator, THE system SHALL change that user's administrator grade to super administrator.

Promotion creates an administrative record documenting the change in grade.

The promoted administrator immediately gains all super administrator privileges upon promotion.

Super administrators cannot promote other super administrators.

### Administrator Demotion

Super administrators can demote other super administrators to regular administrator status.

WHEN a super administrator demotes another super administrator, THE system SHALL change that user's administrator grade to regular.

Demotion creates an administrative record documenting the change in grade.

The demoted administrator immediately loses super administrator privileges upon demotion.

Regular administrators cannot be demoted below regular administrator status.

### Self Demotion Prevention

Super administrators cannot demote themselves.

IF a super administrator attempts to demote their own account, THEN the system SHALL reject the request and display an error message.

This restriction ensures that at least one super administrator always remains in the system.

Self demotion prevention applies regardless of any other administrative actions taken by the account.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Customer Error Scenarios

Customers must register before accessing any platform features; attempts to access protected areas without authentication return an error. Registration requires a valid email address and password meeting platform requirements, and duplicate email addresses are rejected. Login fails when the email or password does not match stored credentials, and the system does not reveal which field is incorrect. Password change requires the current password for verification; incorrect current passwords result in failure. Account deletion preserves orders and reviews for legal compliance, but attempts to delete accounts with incomplete deletion processes may fail. Banned customers cannot log in and receive an access denied message upon attempted login. When a customer deletes their account, their profile information is permanently removed while order history remains accessible to sellers and administrators. Reviews from deleted customers display as from a "deleted user" rather than showing the original name.

### Registration Without Account

Customers must register before accessing any platform features. If a customer attempts to access protected areas of the platform without being authenticated, the system shall reject the request and return an error message indicating that authentication is required. The customer shall be redirected to the login or registration page. Guest browsing is not supported; only registered customers can view products, place orders, or use any platform functionality.

### Duplicate Email Rejection

When a customer attempts to register with an email address that already exists in the system, the registration shall be rejected. The system shall display a clear error message indicating that the email address is already in use. The customer shall be prompted to either log in with the existing account or use a different email address for registration. The system shall not reveal whether an account exists for security purposes beyond the email conflict notification.

### Login Credential Mismatch

When a customer attempts to log in with an email address or password that does not match the stored credentials, the login shall fail. The system shall display a generic error message stating that the email or password is incorrect. The system shall not indicate specifically which field (email or password) is incorrect. Failed login attempts shall not be counted or limited for regular customers.

### Password Verification Failure

When a customer attempts to change their password, the system shall require verification using the current password. If the current password entered does not match the stored password, the password change request shall be rejected. The customer shall be informed that the current password is incorrect. The new password shall not be accepted without successful verification of the current password.

### Banned Customer Access Denial

When a banned customer attempts to log in, the system shall deny the login request. The customer shall receive an error message indicating that access has been denied. The error message shall not reveal the reason for the ban. The customer cannot access any platform features while banned. Administrators can unban customers to restore their access.

### Account Deletion Data Preservation

When a customer deletes their account, certain data shall be preserved while other data is permanently removed. The customer's profile information including display name and phone number shall be permanently deleted. The customer's orders and order history shall be preserved for seller records and legal compliance purposes. The customer's shipping addresses shall be permanently deleted. The customer account itself cannot be recovered after deletion.

### Deleted User Review Display

When a customer account is deleted, all reviews written by that customer shall be preserved but displayed differently. Deleted customer reviews shall show the author as "deleted user" instead of the original display name. The rating and text content of the review shall remain visible. The timestamp of the review shall be preserved. This ensures review integrity while protecting the deleted customer's privacy.

### Incomplete Deletion Handling

When a customer initiates account deletion, the system shall complete all data removal or preservation processes atomically. If any part of the deletion process fails, the system shall roll back any completed operations and notify the customer of the failure. The customer shall be able to attempt deletion again. The system shall not leave data in an inconsistent state. Pending operations or transactions shall be resolved before account deletion proceeds.

### Authentication Requirements

All platform features require successful authentication. Customers must be logged in with valid credentials to access any functionality including viewing products, managing their profile, adding items to wishlists or carts, placing orders, or viewing order history. Sessions shall be validated on each request. Expired or invalid sessions shall prompt the customer to log in again. The system shall maintain session security without exposing sensitive authentication details.

## CustomerProfile Error Scenarios

Customer profiles require a display name between 1 and 100 characters; empty or excessively long names are rejected. Phone numbers must fall within a valid length range of 10 to 20 characters, and invalid formats may trigger warnings. When editing profile information, the system validates that required fields remain populated after changes. Concurrent profile edits from multiple sessions result in the most recent submission overwriting previous changes. If a customer account is banned or deleted, profile edits become unavailable and return appropriate error messages.

### Display Name Validation Errors

WHEN a customer attempts to update their display name, THEN the system SHALL validate that the name contains between 1 and 100 characters.

IF the display name is empty or contains only whitespace, THEN the system SHALL reject the update and return an error message indicating that a display name is required.

IF the display name exceeds 100 characters, THEN the system SHALL reject the update and return an error message indicating the maximum allowed length.

WHEN a customer attempts to register without providing a display name, THEN the system SHALL reject the registration and prompt for the required field.

### Phone Number Validation Errors

WHEN a customer attempts to update their phone number, THEN the system SHALL validate that the phone number contains between 10 and 20 characters.

IF the phone number is empty, THEN the system SHALL reject the update and return an error message indicating that the phone number is required.

IF the phone number is fewer than 10 characters, THEN the system SHALL reject the update and return an error message indicating insufficient digits.

IF the phone number exceeds 20 characters, THEN the system SHALL reject the update and return an error message indicating the maximum allowed length.

IF the phone number contains invalid characters (non-numeric or unsupported symbols), THEN the system SHALL return a warning that the format may be incorrect but MAY accept the value if it falls within the allowed length range.

### Empty Field Rejection

WHEN a customer submits a profile update with an empty display name field, THEN the system SHALL reject the entire update operation.

WHEN a customer submits a profile update with an empty phone number field, THEN the system SHALL reject the entire update operation.

IF the display name field is submitted as null or blank, THEN the system SHALL return an error indicating that the display name cannot be empty.

IF the phone number field is submitted as null or blank, THEN the system SHALL return an error indicating that the phone number cannot be empty.

The system SHALL preserve the current valid values when rejecting updates due to empty required fields.

### Required Field Preservation

WHEN a customer updates only the phone number, THEN the system SHALL preserve the existing display name value.

WHEN a customer updates only the display name, THEN the system SHALL preserve the existing phone number value.

IF the profile update request omits a field, THEN the system SHALL treat the omission as intentional preservation of the current value, not as a request to clear the field.

WHEN validating a profile update, IF the result would leave both required fields empty, THEN the system SHALL reject the update and require at least one valid value to be present.

The system SHALL validate that required fields remain populated after any partial update operation.

### Concurrent Edit Handling

WHEN a customer has multiple active sessions and submits profile updates from more than one session simultaneously, THEN the system SHALL process the most recently received update.

IF two updates arrive within the same processing window, THEN the system SHALL process one complete update before processing the other, ensuring data integrity.

WHEN a customer views their profile while simultaneously editing from another session, THEN the system SHALL display the most recently saved version.

The system SHALL NOT merge concurrent updates; the last submitted change overwrites previous changes entirely.

IF a customer experiences a conflict from concurrent edits, THEN they may resubmit their intended changes after viewing the current profile state.

### Profile Edit After Account Status Change

IF a customer's account has been banned by an administrator, THEN the system SHALL deny any attempt to edit the profile and return an error message indicating that the account is suspended.

IF a customer attempts to edit their profile after initiating account deletion, THEN the system SHALL deny the edit operation and inform the customer that their account is pending deletion.

IF a customer attempts to edit their profile after account deletion is complete, THEN the system SHALL return an error indicating the account does not exist.

WHEN a banned customer's ban is lifted by an administrator, THEN the system SHALL restore full profile editing capabilities.

IF an administrator edits a suspended seller's profile, THEN the system SHALL allow the edit and create a snapshot as normal.

### Profile Update Failures

IF a profile update fails due to a system error, THEN the system SHALL return a generic error message without exposing internal details.

IF a profile update fails due to a database connection issue, THEN the system SHALL allow the customer to retry the operation without data loss.

IF a profile update fails mid-operation, THEN the system SHALL NOT partially apply the changes; the profile SHALL remain in its previous state.

WHEN a profile update fails, THEN the system SHALL log the error details for administrator review while presenting a user-friendly message to the customer.

IF a customer repeatedly experiences profile update failures, THEN the system SHALL suggest contacting support after three consecutive failures.

## ShippingAddress Error Scenarios

Customers can have multiple shipping addresses, but each address must contain all required fields including recipient name, phone number, street address, city, state or province, postal code, and country. Attempting to delete an address that is currently set as the default does not automatically reassign the default; customers must explicitly set a new default. When setting a new default address, the system clears any previous default designation. Addresses with missing or invalid information are rejected during creation or editing. If a customer has no addresses defined, checkout cannot proceed without adding a shipping address. Deleting all addresses removes any default designation.

### Address Field Validation

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the recipient name is missing or empty.

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the phone number is missing or empty.

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the street address is missing or empty.

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the city is missing or empty.

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the state or province is missing or empty.

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the postal code is missing or empty.

WHEN a customer attempts to create a new shipping address, THE system SHALL reject the request if the country is missing or empty.

WHEN a customer attempts to edit an existing shipping address, THE system SHALL apply the same field validation rules as for address creation.

### Default Address Deletion Handling

WHEN a customer deletes a shipping address that is currently set as the default, THE system SHALL remove the default designation without automatically assigning a new default address.

WHEN a customer deletes the only remaining shipping address, THE system SHALL complete the deletion and clear any default designation.

WHEN a customer deletes a non-default shipping address, THE system SHALL complete the deletion without affecting the current default address.

WHEN a customer deletes a shipping address, THE system SHALL NOT automatically promote another address to become the new default.

### Default Address Reassignment Logic

WHEN a customer explicitly sets a new shipping address as the default, THE system SHALL clear the default designation from any previously designated default address.

WHEN a customer sets an address as the default for the first time, THE system SHALL mark that address as the default shipping address.

WHEN a customer attempts to set a deleted address as the default, THE system SHALL reject the request and notify the customer that the address no longer exists.

WHEN a customer has no shipping addresses and sets a new address as the default during creation, THE system SHALL mark that address as the default shipping address.

### Multiple Address Management

WHEN a customer adds a new shipping address, THE system SHALL allow the customer to optionally designate it as the default at the time of creation.

WHEN a customer has multiple shipping addresses and views them in a list, THE system SHALL clearly indicate which address is currently designated as the default.

WHEN a customer attempts to create an address with identical details to an existing address, THE system SHALL allow the creation but may display a warning about potential duplication.

WHEN a customer edits a shipping address, THE system SHALL preserve the default status if that address was the default.

WHEN a customer views their shipping addresses during checkout, THE system SHALL highlight the currently selected address and show the default address option.

### Checkout Address Requirements

WHEN a customer attempts to proceed to checkout without any shipping addresses defined, THE system SHALL prevent checkout and redirect the customer to add a shipping address first.

WHEN a customer has addresses but none selected for the current checkout, THE system SHALL require the customer to select a shipping address before proceeding.

WHEN a customer selects a shipping address during checkout, THE system SHALL display the full address details for confirmation.

WHEN a customer has a default address set and views the checkout page, THE system SHALL pre-select the default address.

WHEN the system detects that the selected address has been deleted, THE system SHALL clear the selection and require the customer to choose a valid address.

### Empty Address List Scenario

WHEN a customer views their shipping addresses and has none defined, THE system SHALL display an empty state message encouraging the customer to add their first address.

WHEN a customer attempts to edit or delete an address that no longer exists, THE system SHALL reject the request and notify the customer that the address was not found.

WHEN a customer has deleted all their addresses, THE system SHALL allow them to add a new address without requiring any special recovery process.

WHEN an administrator or the system needs to retrieve a customer's default address but none exists, THE system SHALL return an indication that no default address is available.

### Address Validation Error Responses

WHEN a customer submits an address with invalid field values, THE system SHALL identify and report each invalid field separately.

WHEN a customer submits an address with missing required fields, THE system SHALL reject the entire request and specify which fields are required.

WHEN a customer submits an address with field values that exceed length limits, THE system SHALL reject the request and indicate the maximum allowed length for each affected field.

WHEN a customer receives an address validation error, THE system SHALL allow the customer to correct the errors and resubmit without re-entering all fields.

## Seller Error Scenarios

Seller registration requires administrator approval before the account can sell products; attempts to list products before approval result in restriction messages. Sellers with "pending" status cannot access selling features until approved. When registration is rejected, the seller receives the rejection reason and can submit a new registration request. Sellers cannot delete their account if they have pending orders in "paid" or "shipped" status, or if pending cancellation or refund requests exist. If a seller is suspended by an administrator, they cannot create new products or edit existing ones, though existing order processing continues. Banned sellers cannot log in and receive an access denied notification.

### Seller Approval Requirement

### Seller Approval Requirement

When a seller submits a registration request, the system SHALL record the request with status "pending" until an administrator reviews and approves the account.

WHENEVER a seller with pending approval status attempts to create a product, edit a product, or perform any selling action, THE system SHALL display a message indicating that administrator approval is required before selling can begin.

WHEN a seller with pending status attempts to access product management features, THE system SHALL restrict access and show the current approval status.

IF a seller with pending status attempts to list products for sale, THEN the system SHALL reject the action and inform the seller that their account requires administrator approval.

### Rejection Reason Viewing

WHEN an administrator rejects a seller registration request, THE system SHALL record the rejection reason provided by the administrator.

WHEN a rejected seller next logs in or views their account status, THE system SHALL display the rejection reason so the seller understands why their application was denied.

IF no rejection reason was provided by the administrator, THE system SHALL display a generic message indicating the application was not approved without specific details.

### New Registration After Rejection

WHEN a rejected seller submits a new registration request, THE system SHALL create a fresh request with status "pending" for administrator review.

IF a rejected seller has previously submitted multiple registration requests, THE system SHALL allow the seller to submit a new request regardless of past rejections.

WHEN a rejected seller resubmits a registration request, THE system SHALL preserve the history of previous rejections for administrator reference.

### Deletion with Pending Orders Prevention

WHEN a seller attempts to delete their account, THE system SHALL check for any orders containing the seller's products with status "paid" or "shipped".

IF pending orders exist for the seller, THE system SHALL reject the deletion request and display a message indicating that pending orders must be completed or cancelled first.

THE system SHALL prevent account deletion until all order items belonging to the seller have reached a final status of "delivered", "cancelled", or "refunded".

### Pending Cancellation and Refund Check

WHEN a seller attempts to delete their account, THE system SHALL also check for any pending cancellation requests or pending refund requests related to the seller's products.

IF any cancellation requests or refund requests are in pending status, THE system SHALL reject the deletion request and inform the seller that pending requests must be resolved first.

THE system SHALL allow account deletion only when no pending cancellation requests and no pending refund requests exist for the seller's products.

### Suspension Feature Restrictions

WHEN an administrator suspends a seller account, THE system SHALL immediately hide all products belonging to that seller from search results and category listings.

IF a suspended seller attempts to create a new product, THE system SHALL reject the action and display a message indicating the account is suspended.

IF a suspended seller attempts to edit an existing product, THE system SHALL reject the action and display a message indicating the account is suspended.

IF a suspended seller attempts to access product management features, THE system SHALL restrict access and indicate the suspension status.

WHEN a seller account is suspended, THE system SHALL continue to allow the seller to process existing orders, including shipping items, viewing order details, and responding to cancellation or refund requests.

### Banned Seller Login Denial

WHEN a banned seller attempts to log in with their credentials, THE system SHALL reject the login attempt.

IF a banned seller attempts to log in, THE system SHALL display an access denied message without revealing whether the account exists.

WHEN an administrator bans a seller, THE system SHALL immediately terminate any active sessions for that seller account.

IF a banned seller attempts to access any protected features using stored session data, THE system SHALL deny access and require re-authentication.

### Account Status Transitions

THE system SHALL maintain clear status states for seller accounts: pending (awaiting approval), approved (can sell), rejected (approval denied), suspended (selling paused), and banned (access denied).

WHEN a seller account changes status, THE system SHALL record the transition for administrative purposes.

IF a suspended seller is unsuspended by an administrator, THE system SHALL immediately restore full selling privileges and make products visible again.

## SellerProfile Error Scenarios

Seller profile edits require all mandatory fields including shop name between 1 and 100 characters and optional shop description up to 2000 characters. Every shop profile edit creates an immutable snapshot recording the previous state. The shop logo is optional, but if provided, the system must handle invalid image formats or broken image links gracefully. Editing a suspended seller's profile is allowed since it does not affect product visibility. When a seller is deleted, their profile snapshots remain preserved for order record integrity.

### Shop Name Validation Errors

THE system SHALL reject shop name input that exceeds 100 characters.
THE system SHALL reject shop name input that is empty or contains only whitespace.
THE system SHALL reject shop name input that is fewer than 1 character.
WHEN a seller enters a shop name that exceeds the maximum length, THE system SHALL return an error indicating the allowed character limit.
WHEN a seller enters an empty shop name, THE system SHALL return an error requiring a valid shop name.

### Shop Description Validation Errors

THE system SHALL accept shop descriptions up to 2000 characters.
THE system SHALL reject shop description input that exceeds 2000 characters.
WHEN a seller enters a shop description that exceeds the maximum length, THE system SHALL return an error indicating the allowed character limit.
Empty shop descriptions are valid and SHALL be accepted by the system.

### Logo Image Error Handling

WHEN a seller uploads a logo image with an unsupported file format, THE system SHALL reject the upload and return an error message specifying accepted image formats.
WHEN a seller uploads a logo image that cannot be accessed or returns a broken link, THE system SHALL display a placeholder image instead.
WHEN a seller provides no logo image, THE system SHALL allow the profile to be saved without a logo.
WHEN a seller attempts to upload a logo image that is corrupt or unreadable, THE system SHALL return an error indicating the image could not be processed.

### Profile Edit Snapshot Creation

WHEN a seller successfully edits their shop profile, THE system SHALL create an immutable snapshot of the previous state.
THE snapshot SHALL include the shop name, shop description, and logo image URL before the edit.
THE system SHALL record the timestamp of when the snapshot was created.
The snapshot SHALL be stored permanently and SHALL NOT be modifiable or deletable.
WHEN a seller edits their profile multiple times, THE system SHALL create a separate snapshot for each edit.

### Suspended Seller Profile Editing

WHEN a seller account is in suspended status, THE seller SHALL still be permitted to edit their shop profile.
Editing a suspended seller's profile SHALL NOT change the suspended status of the account.
WHEN a suspended seller edits their profile, THE system SHALL still create a snapshot of the previous state.
Suspended sellers SHALL NOT be able to create new products or edit existing products, but profile edits remain allowed.

### Seller Deletion and Snapshot Preservation

WHEN a seller account is deleted, THE system SHALL preserve all profile snapshots for order record integrity.
The preserved snapshots SHALL remain accessible to administrators for dispute resolution.
WHEN an administrator or relevant party requests the seller's historical profile information, THE system SHALL return the preserved snapshot data.
Deleted seller profiles SHALL no longer be visible to customers, but their shop name as it appeared in past orders SHALL be preserved through order item snapshots.
The snapshot preservation SHALL apply regardless of whether the deletion was initiated by the seller or by an administrator.

## Category Error Scenarios

Categories must have a name between 1 and 100 characters and an optional description up to 500 characters. Subcategories can only be nested one level deep; attempts to create subcategories under subcategories are rejected. Deleting a category causes products in that category to become uncategorized rather than deleted. Categories with products assigned cannot be accidentally deleted without understanding the uncategorization consequence. Category names must be unique at their level; duplicate names within the same parent category are rejected.

### Category Name Uniqueness

THE system SHALL reject category creation when the submitted name matches an existing category at the same level under the same parent category.

WHEN a customer attempts to browse or view a category with a duplicate name at the same level, THE system SHALL display the existing category correctly without ambiguity.

IF a seller or administrator attempts to create a subcategory with the same name as an existing subcategory under the same parent, THEN the system SHALL reject the request and return an error indicating the name is already in use.

WHEN an administrator edits a category name to match an existing category name at the same level, THE system SHALL reject the update and require a unique name.

Category name uniqueness is enforced within the same parent scope only; categories with the same name may exist under different parent categories or at different hierarchy levels.

### Subcategory Nesting Limit

THE system SHALL reject any attempt to create a subcategory under a subcategory, enforcing a maximum of one level of nesting.

WHEN a user attempts to set a subcategory as the parent of a new category, THE system SHALL reject the request and return an error indicating that subcategories cannot have children.

IF an administrator attempts to edit an existing subcategory to become a parent of another subcategory, THE system SHALL reject the operation.

Categories at the top level may have subcategories; subcategories may not have further subcategories.

WHEN a category that has subcategories is deleted, THE system SHALL first delete all its subcategories before deleting the parent category.

### Category Deletion Product Impact

WHEN an administrator deletes a category that contains products, THE system SHALL NOT delete those products but instead move them to an uncategorized state.

THE system SHALL preserve all product data including name, description, base price, images, variants, and inventory when a category is deleted.

IF a product is moved to uncategorized status, THE system SHALL ensure it remains searchable by name but no longer appears in category browsing listings.

Products in uncategorized status retain their seller association and can be reassigned to a valid category by the seller at any time.

WHEN a category with subcategories is deleted, THE system SHALL move all products from both the parent category and all its subcategories to uncategorized status.

### Uncategorized Product Handling

THE system SHALL display products without a category assignment in the uncategorized section of the seller's product management area.

Products without a category SHALL appear in search results when the search query matches the product name.

THE system SHALL prevent customers from filtering by category when viewing uncategorized products in search results.

Sellers can edit their uncategorized products to assign a valid category and make them visible in category listings again.

IF an uncategorized product has variants, THE system SHALL preserve all variant data including stock quantities and inventory history.

Products remain purchasable even without a category assignment; lack of category only affects browse and filter functionality.

### Duplicate Category Name Rejection

IF a seller or administrator submits a category creation request with a name identical to an existing category at the same hierarchy level, THE system SHALL reject the request.

THE error response SHALL clearly indicate that the category name already exists and suggest choosing a different name.

WHEN editing an existing category, IF the new name conflicts with a sibling category name, THE system SHALL reject the update.

The duplicate name check SHALL be case-insensitive to prevent confusion; "Electronics" and "electronics" are considered duplicates.

Whitespace-only variations of existing names SHALL also be rejected as duplicates.

### Description Length Validation

THE system SHALL reject category descriptions that exceed 500 characters in length.

WHEN an administrator submits a category creation or edit request with a description longer than 500 characters, THE system SHALL reject the request and return an error indicating the maximum allowed length.

Category descriptions are optional; an empty description or null description SHALL be accepted and stored as no description.

The description field SHALL accept all printable characters including letters, numbers, symbols, and whitespace.

Special characters and formatting in descriptions SHALL be preserved exactly as submitted without interpretation or sanitization that alters meaning.

### Category Name Required

THE system SHALL require a non-empty category name for both creation and editing operations.

IF an administrator submits a category creation request without a name, THE system SHALL reject the request and return an error indicating that the name is required.

IF an administrator submits a category edit request with an empty name, THE system SHALL reject the request and require a valid name.

Whitespace-only names SHALL be treated as empty and rejected; the name must contain at least one non-whitespace character.

THE system SHALL reject category names consisting solely of spaces, tabs, or other whitespace characters.

## Product Error Scenarios

Products require a name between 1 and 200 characters, a description, a selected category, and a base price; missing any required field prevents product creation. Sellers can only edit or delete their own products; attempts to modify another seller's products result in permission errors. Product deletion fails if any variant has pending order items in "paid" or "shipped" status, or if pending cancellation or refund requests exist for any variant. Deleted products no longer appear in search results or category listings but their snapshots remain for historical records. Products without variants are displayed as "unavailable" in listings.

### Product Required Field Validation

### Product Required Field Validation

WHEN a seller attempts to create a product, THE system SHALL verify that the name field is present and contains between 1 and 200 characters.

WHEN a seller attempts to create a product, THE system SHALL verify that the description field is present.

WHEN a seller attempts to create a product, THE system SHALL verify that a category has been selected.

WHEN a seller attempts to create a product, THE system SHALL verify that the base price field is present and contains a valid positive number.

IF any required field is missing or invalid during product creation, THE system SHALL reject the request and inform the seller which fields are missing or invalid.

### Product Field Update Validation

WHEN a seller attempts to update a product, THE system SHALL verify that the name remains between 1 and 200 characters if provided.

WHEN a seller attempts to update a product, THE system SHALL verify that the base price remains a valid positive number if provided.

### SKU Code Validation

WHEN a seller attempts to create a product variant, THE system SHALL verify that the SKU code field is present and contains between 1 and 50 characters.

IF the SKU code is missing or exceeds the maximum length, THE system SHALL reject the variant creation request.

IF the SKU code matches an existing variant from any seller, THE system SHALL reject the variant creation request and inform the seller that the SKU code is already in use.

### Product Ownership Verification

### Ownership Check on Product Operations

WHEN a seller attempts to edit a product, THE system SHALL verify that the product belongs to that seller.

IF the product does not belong to the requesting seller, THE system SHALL reject the request and return a permission denied error.

WHEN a seller attempts to delete a product, THE system SHALL verify that the product belongs to that seller.

IF the product does not belong to the requesting seller, THE system SHALL reject the deletion request.

WHEN a seller attempts to add a variant to a product, THE system SHALL verify that the product belongs to that seller.

IF the product does not belong to the requesting seller, THE system SHALL reject the variant creation request.

### Cross-Seller Edit Prevention

WHEN a seller attempts to modify product images, THE system SHALL verify product ownership before allowing any image operations.

IF the product belongs to another seller, THE system SHALL reject the image modification request.

WHEN a seller attempts to modify inventory for a product variant, THE system SHALL verify that the parent product belongs to that seller.

IF the parent product belongs to another seller, THE system SHALL reject the inventory modification request.

### Product Deletion with Pending Orders

### Deletion Eligibility Check

WHEN a seller attempts to delete a product, THE system SHALL examine all variants associated with that product.

IF any variant has order items in "paid" status, THE system SHALL reject the deletion request and inform the seller that pending orders prevent deletion.

IF any variant has order items in "shipped" status, THE system SHALL reject the deletion request and inform the seller that pending orders prevent deletion.

IF any variant has pending cancellation requests, THE system SHALL reject the deletion request and inform the seller that pending cancellation requests prevent deletion.

IF any variant has pending refund requests, THE system SHALL reject the deletion request and inform the seller that pending refund requests prevent deletion.

### Successful Deletion Conditions

WHEN a seller attempts to delete a product, THE system SHALL allow deletion only when all of the following conditions are met:
- No variant has order items in "paid" status
- No variant has order items in "shipped" status
- No variant has pending cancellation requests
- No variant has pending refund requests

IF all conditions are met, THE system SHALL mark the product as deleted and remove it from listings.

### Variant Dependency Deletion

### Variant Deletion with Pending Orders

WHEN a seller attempts to delete a specific variant of a product, THE system SHALL check whether that variant has order items in "paid" status.

IF the variant has order items in "paid" status, THE system SHALL reject the deletion request.

IF the variant has order items in "shipped" status, THE system SHALL reject the deletion request.

IF the variant has pending cancellation requests, THE system SHALL reject the deletion request.

IF the variant has pending refund requests, THE system SHALL reject the deletion request.

### Variant Deletion Cascade

WHEN a product is deleted, THE system SHALL mark all associated variants as deleted.

WHEN a product is deleted, THE system SHALL mark all associated inventory records as inactive but preserve them for historical tracking.

WHEN a product is deleted, THE system SHALL automatically remove all associated wishlist items from customer wishlists.

WHEN a variant is deleted, THE system SHALL automatically remove any cart items containing that variant.

### Unavailable Product Display

### Product Without Variants

WHEN a product has no variants, THE system SHALL display the product in search results and category listings.

WHEN displaying a product without variants in any listing, THE system SHALL indicate that the product is "unavailable".

### Out of Stock Variant Display

WHEN all variants of a product are out of stock, THE system SHALL indicate in the product listing that the product is "out of stock".

WHEN a customer views a product detail page with out-of-stock variants, THE system SHALL clearly display the stock status for each variant.

WHEN a customer attempts to add an out-of-stock variant to the cart, THE system SHALL reject the request and inform the customer that the variant is out of stock.

### Suspended Seller Product Display

WHEN a seller is suspended, THE system SHALL remove all products belonging to that seller from search results and category listings.

WHEN a customer attempts to access a product from a suspended seller via direct link, THE system SHALL display a message indicating the product is currently unavailable.

### Deleted Product Visibility

### Search Result Exclusion

WHEN a customer searches for products by name, THE system SHALL exclude products that are marked as deleted from the search results.

WHEN an administrator searches for products, THE system MAY include deleted products in the results for oversight purposes.

### Category Listing Exclusion

WHEN a customer browses a category, THE system SHALL exclude products that are marked as deleted from the category listing.

### Product Detail Page Access

WHEN a customer attempts to view the detail page of a deleted product via direct link, THE system SHALL display a message indicating the product is no longer available.

WHEN a seller attempts to view the detail page of their own deleted product, THE system SHALL display the product information in read-only mode with a "deleted" status indicator.

### Wishlist Cleanup

WHEN a product is deleted, THE system SHALL automatically remove all wishlist items associated with that product from customer wishlists.

WHEN a customer views their wishlist after a product has been deleted, THE system SHALL display the remaining wishlist items without showing the deleted product.

### Snapshot Preservation After Deletion

### Product Snapshot Retention

WHEN a product is deleted, THE system SHALL preserve all product snapshots that were created during the product's lifetime.

WHEN an order contains an item from a deleted product, THE system SHALL preserve the product snapshot associated with that order item.

WHEN a seller views their product snapshots, THE system SHALL display snapshots even for products that have been deleted.

WHEN an administrator reviews a dispute involving a deleted product, THE system SHALL allow access to all associated snapshots.

### Variant Snapshot Preservation

WHEN a product variant is deleted, THE system SHALL preserve all snapshots that included that variant.

WHEN a seller views variant snapshots from the product history, THE system SHALL display the variant data as it existed at the time each snapshot was created.

### Immutable Snapshot Records

WHEN a snapshot is created, THE system SHALL make it immutable and prevent any modification or deletion.

WHEN a snapshot is created, THE system SHALL record who created it, what type of entity it relates to, and when it was created.

WHEN a dispute involves snapshot evidence, THE system SHALL provide the complete snapshot content showing both the previous state and the new state.

### Cross-Seller Modification Prevention

### Edit Permission Boundary

WHEN any seller attempts to edit product details for a product they do not own, THE system SHALL reject the request.

WHEN any seller attempts to add new variants to a product they do not own, THE system SHALL reject the request.

WHEN any seller attempts to modify inventory for a variant belonging to another seller's product, THE system SHALL reject the request.

### Image Modification Restriction

WHEN any seller attempts to upload images for a product they do not own, THE system SHALL reject the request.

WHEN any seller attempts to delete images from a product they do not own, THE system SHALL reject the request.

WHEN any seller attempts to reorder images on a product they do not own, THE system SHALL reject the request.

### Snapshot Access Control

WHEN a seller attempts to view product snapshots, THE system SHALL only display snapshots for products owned by that seller.

WHEN an administrator attempts to view product snapshots, THE system SHALL allow access to snapshots for any product on the platform.

IF a seller attempts to access snapshots for another seller's product, THE system SHALL reject the request and return an authorization error.

## ProductImage Error Scenarios

Product images must have a valid URL and display order number; invalid URLs or missing display order cause upload failures. When deleting the main thumbnail image, the system automatically promotes the next image in the display order to become the new main image. If all images are deleted, the product displays with a placeholder image. Image reordering fails if the requested display order conflicts with existing orders or contains invalid values. Maximum image count limits may apply to prevent excessive uploads per product.

### Image URL Validation

Product images must have a valid image URL. The system validates that the URL is present and accessible before accepting the image for upload.

When an image upload request contains an invalid or missing URL, the system rejects the request and returns an error indicating that a valid image URL is required.

Sellers cannot save products with images that have broken or inaccessible URLs. If an image URL becomes inaccessible after upload, the system marks the image as unavailable and displays a placeholder instead.

The system verifies URL format including proper protocol (http or https). URLs without a valid protocol are rejected during upload.

### Display Order Requirement

Every product image must have a display order number that determines its position in the product image gallery.

When a seller uploads an image without specifying a display order, the system automatically assigns the next available order number (incremented from the highest existing order).

Display order numbers must be unique within a product. If two images have the same display order value, the system rejects the conflicting upload.

The image with the lowest display order number (or first position if using sequential numbering) is designated as the main or thumbnail image for the product listing.

### Image Count Limits

Each product can have a maximum number of images to prevent excessive uploads. When a seller attempts to add images beyond this limit, the system rejects the additional upload and informs the seller of the maximum allowed.

Sellers can still delete existing images and add new ones as long as the total count does not exceed the limit at any point during the operation.

The system counts all non-deleted images when evaluating the limit. Deleted images do not count toward the maximum.

### Main Image Deletion Handling

When a seller deletes the main image (the thumbnail image with the lowest display order), the system automatically promotes the image with the next lowest display order to become the new main image.

If the deleted main image was the only image, the product will have no images afterward and the placeholder image fallback applies.

The promotion of the new main image occurs immediately and atomically as part of the deletion operation. The seller does not need to manually reassign the main image.

### All Images Deleted Scenario

When a seller deletes the last remaining image from a product, the product enters a state with zero images.

Products without any images are still visible in search results and category listings, but their thumbnail shows a placeholder image instead of a product photo.

The product detail page displays the placeholder image in the image gallery section when no images are available.

Sellers can upload new images to a product at any time, even if it currently has zero images.

### Placeholder Image Fallback

The system displays a placeholder image for products that have no uploaded images. The placeholder image is a generic product image that does not belong to any seller.

The placeholder image appears in the following locations: product listing thumbnails, category browse results, search results, wishlist entries, and the product detail page when all images have been deleted.

The placeholder image is read-only and cannot be edited, deleted, or reordered by sellers. It serves only as a fallback when no product images exist.

### Image Reorder Conflicts

When a seller attempts to reorder images, the system validates that the new display order does not conflict with existing orders.

If a reorder request would result in duplicate display order numbers, the system rejects the request and informs the seller that the requested order is invalid.

Sellers can reorder images by specifying a target position or by swapping the order of two existing images. Both operations are validated for conflicts.

If a seller attempts to assign a display order value that is negative or non-numeric, the system rejects the request and requires a valid positive integer.

Reorder operations that affect the main image trigger the same main image promotion logic as direct deletion of the former main image.

## ProductVariant Error Scenarios

Product variants require a unique SKU code between 1 and 50 characters; duplicate SKU codes within the platform are rejected. Each variant must have option values, a price override that is optional, and a stock quantity that starts at zero. Variant deletion fails if the variant has pending order items in "paid" or "shipped" status, or if pending cancellation or refund requests exist. A product must retain at least one variant to remain purchasable; attempting to delete the last variant is prevented. Variant price overrides that are empty default to the product's base price during display.

### SKU Code Uniqueness

### SKU Code Validation

Every product variant must have a SKU code that uniquely identifies it within the platform. The SKU code is a required field that helps sellers track inventory and helps customers identify specific product options.

The SKU code must be between 1 and 50 characters in length. If a seller attempts to create or update a variant with an empty SKU code, the request is rejected. If the SKU code exceeds 50 characters, the request is rejected.

### Duplicate SKU Code Rejection

Each SKU code must be unique across the entire platform. When a seller attempts to create a new variant or update an existing variant's SKU code, the system checks whether that SKU code is already in use by any other variant on the platform.

If a duplicate SKU code is detected, the request is rejected and the seller is informed that the SKU code is already in use. The seller must choose a different SKU code to proceed.

This uniqueness requirement ensures that every variant can be unambiguously identified in orders, inventory records, and reports.

### Variant Deletion Conditions

### Variant Deletion with Pending Orders

A seller cannot delete a product variant if that variant has order items in "paid" or "shipped" status. These status values indicate that the customer has already paid for the item or the seller has already shipped it, so the transaction must be completed before the variant can be removed.

When a seller attempts to delete such a variant, the request is rejected. The seller must wait until all related order items have reached a terminal status (such as "delivered", "cancelled", or "refunded") before the variant can be deleted.

### Variant Deletion with Pending Cancellation Requests

A seller cannot delete a product variant if there are pending cancellation requests associated with that variant. Pending cancellation requests indicate that a customer has requested to cancel an order item and the seller has not yet responded to that request.

When a seller attempts to delete a variant with pending cancellation requests, the request is rejected. The seller must respond to all pending cancellation requests (either approving or rejecting them) before the variant can be deleted.

### Variant Deletion with Pending Refund Requests

A seller cannot delete a product variant if there are pending refund requests associated with that variant. Pending refund requests indicate that a customer has requested a refund for an order item and the seller has not yet responded.

When a seller attempts to delete a variant with pending refund requests, the request is rejected. The seller must respond to all pending refund requests before the variant can be deleted.

### Last Variant Deletion Prevention

A product must always have at least one variant to remain purchasable. When a seller attempts to delete a variant, the system checks whether that variant is the only remaining variant for the product.

If the variant is the last one, the deletion request is rejected. The seller must create a new variant before deleting the existing one, or delete the entire product instead of deleting individual variants.

### Stock and Pricing Behavior

### Stock Quantity Initialization

When a new product variant is created, its stock quantity starts at zero. A variant with zero stock is shown as "out of stock" and cannot be added to customer carts.

Sellers must explicitly restock variants by adding inventory records with positive quantity changes before customers can purchase them.

### Price Override Default Behavior

Each product has a base price defined at the product level. When creating or editing a variant, sellers have the option to specify a price override that is specific to that variant.

If a seller leaves the price override empty or unspecified, the variant inherits the product's base price. When displaying the variant to customers, the system uses the price override if it exists, or falls back to the base price if no override is set.

### Variant Ownership and Access Control

### Variant Ownership Verification

Only the seller who owns a product can manage that product's variants. When a seller attempts to create, edit, or delete a variant, the system verifies that the product containing the variant belongs to the requesting seller.

If the product does not belong to the seller, the request is rejected. Sellers cannot modify variants belonging to other sellers' products.

### Access Control for Variant Operations

The ownership verification applies to all variant operations including creating new variants, updating variant details such as SKU code and option values, modifying variant prices, and deleting variants.

In all cases, the system confirms that the variant's parent product is owned by the seller making the request before allowing the operation to proceed.

## InventoryRecord Error Scenarios

Inventory records require a quantity change value and a reason between 1 and 500 characters; negative adjustments without sufficient stock are handled according to business rules. Stock quantity cannot go below zero through manual adjustments; the system prevents such operations. Current stock is calculated by summing all inventory records, so manual adjustments must be carefully validated. When order placement fails after payment, the system must reverse the inventory deduction. Restocking operations require a positive quantity and a reason explaining why inventory is being added.

### Negative Stock Prevention

THE system SHALL prevent stock quantity from becoming negative through any operation.

When a seller attempts to adjust inventory that would result in a negative stock quantity, THE system SHALL reject the adjustment and return an error message indicating that the requested adjustment exceeds available stock.

If the current stock quantity is zero, THE system SHALL reject any adjustment that specifies a negative quantity change, because the result would be negative.

THE system SHALL validate stock quantity before processing any inventory adjustment and SHALL reject the operation if the resulting quantity would be less than zero.

Example: If current stock is 5 and seller attempts to subtract 10, THE system SHALL reject the request and notify the seller that the adjustment is not allowed because it would result in negative stock.

### Insufficient Stock Adjustment Handling

When a seller attempts to subtract more stock than is currently available, THE system SHALL reject the adjustment.

THE system SHALL compare the requested quantity change against the current calculated stock quantity before processing the adjustment.

If the requested subtraction exceeds available stock, THE system SHALL return an error specifying the maximum quantity that can be subtracted.

Sellers SHALL be able to view the current calculated stock quantity before attempting any adjustment.

THE system SHALL allow sellers to subtract inventory only up to the current available quantity.

### Inventory Sum Calculation Errors

THE system SHALL calculate current stock quantity by summing all inventory records for a given variant.

When displaying stock quantity to sellers or customers, THE system SHALL display the calculated sum of all inventory records, not a stored quantity field.

If any inventory record has corrupted or invalid data, THE system SHALL handle the error gracefully and exclude the invalid record from the calculation.

When inventory records are deleted (which should only occur in administrative correction scenarios), THE system SHALL recalculate the current stock based on remaining records.

Sellers SHALL be able to view the full history of inventory records to understand how the current stock quantity was determined.

### Order Failure Inventory Reversal

WHEN an order placement fails after payment has been processed, THE system SHALL reverse the inventory deduction.

If payment fails during checkout, THE system SHALL not create any inventory records because no order was created.

WHEN a payment gateway returns a failure status after deducting inventory, THE system SHALL automatically create a positive inventory record to restore the previously deducted stock.

The reversal inventory record SHALL include a reason indicating that it is a payment failure reversal.

THE system SHALL ensure that stock quantities remain accurate even when external payment systems experience failures.

If automatic reversal fails, THE system SHALL flag the order for administrative review and alert administrators to manually resolve the inventory discrepancy.

### Restock Quantity Validation

Restocking operations MUST specify a positive quantity value.

THE system SHALL reject any restock request that specifies zero or negative quantity as the quantity to add.

THE system SHALL validate that the quantity change field contains a positive integer before processing restock operations.

When validating restock quantity, THE system SHALL ensure the value is greater than zero.

Sellers SHALL receive clear error messages when their restock quantity does not meet the positive value requirement.

### Inventory Reason Requirement

Every inventory record MUST include a reason explaining why the inventory change occurred.

THE system SHALL require the reason field to contain between 1 and 500 characters.

THE system SHALL reject any inventory operation that does not include a reason or has a reason outside the valid length range.

Common valid reasons include but are not limited to: initial stock, restocking from supplier, customer return, inventory correction, damaged goods write-off, and theft.

The reason field SHALL be preserved with each inventory record for audit and dispute resolution purposes.

THE system SHALL display the reason alongside quantity changes in the inventory history view.

### Stock Quantity Boundary Errors

Stock quantity MUST always be zero or greater; negative stock is not permitted in the system.

THE system SHALL enforce a boundary check ensuring that stock quantity never goes below zero.

When displaying stock status, THE system SHALL indicate "in stock" for quantities greater than zero and "out of stock" for zero quantity.

If an administrative correction is required to set stock below zero, such corrections MUST go through a special administrative process with proper authorization.

THE system SHALL prevent any standard seller or customer operation from creating negative stock quantities.

When stock quantity reaches exactly zero, THE system SHALL automatically mark the variant as unavailable for purchase.

### Adjustment Validation Errors

THE system SHALL validate all inventory adjustment requests before processing them.

Validation errors include but are not limited to: missing quantity change, invalid quantity format, negative quantity for restock, quantity exceeding available stock for subtraction, missing reason, and reason length violations.

WHEN a validation error occurs, THE system SHALL reject the request and return a descriptive error message specifying exactly what validation failed.

If the variant does not exist, THE system SHALL return an error indicating that the specified product variant could not be found.

If the seller does not own the product containing the variant, THE system SHALL reject the adjustment and indicate permission denied.

THE system SHALL not partially process inventory adjustments; either the entire operation succeeds or fails with a clear error message.

After any validation failure, THE system SHALL leave stock quantities unchanged.

## Review Error Scenarios

Reviews can only be written for products that have been purchased and delivered, preventing premature or fraudulent reviews. Each customer can write only one review per product per order, preventing duplicate submissions. Review ratings must be between 1 and 5 stars, and ratings outside this range are rejected. Text content is optional but has a maximum length of 2000 characters if provided. Reviews can be edited by the original author, creating a new snapshot; deleted reviews are preserved as deleted rather than permanently removed. Attempting to review a product before the item status becomes "delivered" results in a validation error.

### Review Error Scenarios

### Review Eligibility Requirement

THE system SHALL only allow customers to write a review when the related order item has a status of "delivered".

THE system SHALL reject any attempt to write a review for an order item that has not been delivered, regardless of payment or shipping status.

### Delivered Status Requirement

THE system SHALL verify that the order item status is "delivered" before accepting a review submission.

WHEN a customer attempts to submit a review for an order item with status "paid" or "shipped", THE system SHALL reject the request and display an error message indicating that reviews can only be written after delivery.

### Duplicate Review Prevention

THE system SHALL allow only one review per product per order for each customer.

WHEN a customer attempts to write a second review for the same product within the same order, THE system SHALL reject the request and display an error message indicating that a review already exists for this product in this order.

WHEN a customer attempts to write a review for a product they have not purchased in a delivered order, THE system SHALL reject the request.

### Rating Range Validation

THE system SHALL only accept ratings between 1 and 5 stars.

WHEN a customer submits a rating below 1 or above 5, THE system SHALL reject the request and display an error message requiring a valid rating between 1 and 5.

### Review Text Length Limit

THE system SHALL accept optional text content with a maximum length of 2000 characters.

WHEN a customer submits text content exceeding 2000 characters, THE system SHALL reject the request and display an error message indicating the maximum allowed length.

WHEN a customer submits text content within the valid range, THE system SHALL accept the review.

### Self-Review Edit Restriction

THE system SHALL only allow the original author of a review to edit that review.

WHEN any other customer, seller, or administrator attempts to edit a review they did not create, THE system SHALL reject the request and display an error message indicating insufficient permissions.

### Deleted Review Display

THE system SHALL preserve reviews that have been deleted by the customer rather than removing them entirely.

WHEN a customer deletes their own review, THE system SHALL mark the review as deleted but retain the rating value and text content.

WHEN displaying product reviews to other users, THE system SHALL show deleted reviews as belonging to a "deleted user" with the rating preserved but text content hidden.

THE system SHALL exclude deleted reviews from the product's average rating calculation.

### Review Timing Validation

THE system SHALL only accept review edits from the original author.

WHEN a customer edits an existing review, THE system SHALL verify that the customer is the original author of that review.

WHEN a customer edits their own review, THE system SHALL create a snapshot of the previous review state before applying the edit.

### Review Edit Snapshot Creation

THE system SHALL create an immutable snapshot when a review is edited.

THE snapshot SHALL record the rating and text content before the edit, the rating and text content after the edit, and the timestamp of the change.

THE snapshot SHALL be accessible to the original review author and administrators for dispute resolution purposes.

### Review Access Control Error Scenarios

### Reviewable Item Identification

THE system SHALL identify which products are eligible for review based on delivered order items.

THE system SHALL present only products with delivered status order items as eligible for review in the customer's order history.

### Review Submission Error Handling

WHEN a review submission fails validation, THE system SHALL return clear error messages describing which requirement was not met.

WHEN a technical error occurs during review submission, THE system SHALL notify the customer and allow them to retry the operation.

### Review Display Ordering

THE system SHALL display reviews on the product detail page sorted by newest first.

THE system SHALL display the average rating and total review count prominently on the product detail page.

### Review Edit Access Control

THE system SHALL allow customers to edit their own reviews at any time after creation.

THE system SHALL prevent customers from editing reviews belonging to other users.

THE system SHALL prevent sellers from editing any reviews of their products.

### Review Deletion Access Control

THE system SHALL allow customers to delete their own reviews.

THE system SHALL prevent customers from deleting reviews belonging to other users.

WHEN a review is deleted, THE system SHALL mark it as deleted rather than permanently removing it, preserving the data for snapshot and audit purposes.

### Review Modification and Calculation Scenarios

### Concurrent Review Submission Prevention

THE system SHALL prevent duplicate review submissions by validating review existence before creating a new review.

WHEN a customer rapidly submits multiple review requests for the same product and order, THE system SHALL accept only the first valid submission and reject subsequent duplicate submissions.

### Review Rating Modification

THE system SHALL allow customers to change the rating value when editing their review.

THE system SHALL validate the new rating value is within the acceptable range of 1 to 5 stars.

### Review Text Content Modification

THE system SHALL allow customers to add, modify, or remove the optional text content when editing their review.

THE system SHALL validate the text content length does not exceed 2000 characters.

### Product Average Rating Calculation

THE system SHALL calculate the product's average rating by averaging all non-deleted review ratings.

THE system SHALL update the average rating immediately after a review is created, edited, or deleted.

THE system SHALL display "No reviews yet" when a product has no reviews.

### Review Integration with Orders and Products

### Unavailable Product Review Handling

THE system SHALL allow reviews to remain visible on the product detail page even after the product is deleted by the seller.

THE system SHALL display deleted products with their existing reviews showing the product name as it appeared at the time of the review.

### Suspended Seller Product Reviews

THE system SHALL maintain reviews for products belonging to suspended sellers.

THE system SHALL display suspended seller information on reviews with a notice that the seller is currently unavailable.

### Order Item Status and Review Eligibility

THE system SHALL link each review to its originating order and order item.

THE system SHALL verify that an order item has reached "delivered" status before allowing the associated review to be created.

THE system SHALL prevent reviews from being created for order items with status "paid", "shipped", "cancelled", or "refunded".

### Multi-Item Order Review Scenarios

WHEN a customer orders the same product in multiple separate order items, THE system SHALL allow one review per order item for that product.

WHEN a customer orders multiple quantities of the same product variant in a single order item, THE system SHALL treat it as one order item eligible for one review.

## Wishlist Error Scenarios

The wishlist is paginated, and if a product is deleted by the seller, it is automatically removed from all customer wishlists. When viewing the wishlist, products that no longer exist are skipped or marked as unavailable. Customers cannot add the same product multiple times to their wishlist; attempts to re-add an existing wishlist item are handled gracefully. An empty wishlist displays appropriately without errors.

### Deleted Product Automatic Removal

## Deleted Product Removal

WHEN a seller deletes a product from the platform, THE system SHALL automatically remove that product from all customer wishlists that contain it.

WHEN a customer views their wishlist and a previously added product no longer exists in the system, THE system SHALL skip the unavailable product and continue displaying the remaining wishlist items without errors.

IF a wishlist contains only products that have been deleted, THE system SHALL display an empty wishlist state.

### Wishlist Pagination Handling

## Wishlist Pagination

WHEN a customer requests to view their wishlist, THE system SHALL return results in paginated format.

IF the wishlist contains more items than the page size, THE system SHALL return only the first page of results.

THE system SHALL provide pagination controls allowing the customer to navigate to subsequent pages.

IF the customer requests a page number that exceeds the total number of pages, THE system SHALL return an empty result set without error.

### Empty Wishlist State

## Empty Wishlist Display

WHEN a customer has no items in their wishlist, THE system SHALL display an appropriate empty state message indicating the wishlist is empty.

IF a customer attempts to remove an item from an empty wishlist, THE system SHALL return a friendly message indicating there are no items to remove.

THE empty wishlist state SHALL NOT display any error messages or technical errors.

### Duplicate Product Prevention

## Duplicate Product Prevention

WHEN a customer attempts to add a product to their wishlist that already exists in their wishlist, THE system SHALL NOT create a duplicate wishlist entry.

IF the product already exists in the wishlist, THE system SHALL return a success response indicating the product is already in the wishlist.

THE system SHALL track wishlist items at the product level, not the variant level, ensuring each product appears only once regardless of how many variants the product has.

### Unavailable Product Handling

## Unavailable Product Handling

WHEN a customer views their wishlist and a product exists but is unavailable (such as a product with no variants or all variants out of stock), THE system SHALL mark that wishlist item as unavailable.

IF a wishlist item is marked as unavailable, THE system SHALL allow the customer to still remove it from the wishlist.

IF a customer attempts to add an out-of-stock product to their cart from the wishlist, THE system SHALL display a warning message indicating the product is currently out of stock.

THE system SHALL calculate and display the average rating even if the product is currently unavailable.

### Wishlist Item Existence Verification

## Wishlist Item Existence Check

BEFORE removing an item from a customer's wishlist, THE system SHALL verify that a wishlist item for that product actually exists for that customer.

IF the wishlist item does not exist, THE system SHALL return an error message indicating the item was not found in the wishlist.

IF the product has been deleted, THE system SHALL still allow the customer to view their wishlist and remove the reference, handling the cleanup gracefully without displaying errors.

WHEN a customer adds a product to their wishlist, THE system SHALL first verify the product exists and is available before creating the wishlist entry.

## WishlistItem Error Scenarios

Wishlist items represent products rather than specific variants, preventing duplicate variant-level entries. When a product is deleted by the seller, all associated wishlist items are automatically removed from customer wishlists. The wishlist item maintains a timestamp of when it was added, which is preserved even after product deletion. Customers can remove items from their wishlist at any time, and removing a non-existent item returns an appropriate error.

### Adding Products to Wishlist

When a customer attempts to add a product to their wishlist, the system must associate the product with the wishlist rather than a specific product variant. This ensures that wishlist entries represent the product generally, not individual SKU combinations.

If a product is already present in a customer's wishlist, the system must reject any attempt to add the same product again. The system must return an error indicating the product already exists in the wishlist rather than creating a duplicate entry.

The system must prevent customers from adding products to wishlists when the product does not exist. If the product identifier provided is invalid or the product has been deleted, the system must reject the request and return an appropriate error message.

### Deleted Product Automatic Removal

When a product is deleted by its seller, the system must automatically remove all wishlist items associated with that product across all customers' wishlists. This product deletion cascade ensures customers do not retain references to unavailable products.

The removal process must occur as part of the product deletion workflow. The system must query all wishlist entries referencing the deleted product and remove them in a single operation to maintain data consistency.

After automatic removal, the system must not display error messages to other customers whose wishlists contained the deleted product, since this is an expected cleanup operation. Customers who view their wishlist after such removal must simply see the product is no longer present.

If a customer attempts to access a wishlist item that was removed due to product deletion, the system must indicate the item no longer exists.

### Wishlist Item Timestamp Preservation

When a wishlist item is created, the system must record the timestamp indicating when the product was added to the wishlist. This add timestamp must be preserved even if the associated product is later deleted by the seller.

The preserved timestamp must be accessible when viewing historical wishlist data or for dispute resolution purposes. Customers can view when they added items to their wishlist before those products were removed.

The timestamp must not be modifiable after creation. Once recorded, the add timestamp remains immutable to maintain accurate historical records.

### Removing Wishlist Item Validation

When a customer attempts to remove a product from their wishlist, the system must verify the wishlist item exists and belongs to that customer before processing the removal.

If the specified product is not in the customer's wishlist, the system must return an error indicating the wishlist item does not exist. The error message must be appropriate for the customer to understand the operation failed because the item was not found.

The system must validate that the customer requesting removal owns the wishlist containing the item. Customers cannot remove items from other customers' wishlists.

If the wishlist containing the item has been deleted along with the customer account, the system must handle this gracefully and return an appropriate error.

### Wishlist Item Existence Check

When any operation references a specific wishlist item, the system must first verify the wishlist item exists in the database. This includes viewing wishlist item details, removing items, or any modification operations.

If the wishlist item identifier provided does not correspond to an existing wishlist item, the system must reject the request and return an error indicating the wishlist item was not found.

The system must handle the case where a wishlist item exists but references a deleted product. In this scenario, the system must treat the wishlist item as effectively non-existent for customer-facing operations while maintaining internal consistency.

For wishlist item existence checks involving ownership verification, if the wishlist item exists but belongs to a different customer, the system must reject the request as if the item does not exist, preventing information leakage about other customers' wishlists.

### Product Deletion Cascade Integrity

The product deletion cascade to wishlist items must execute reliably when a product is deleted. The system must ensure all wishlist entries referencing the deleted product are removed before the product deletion is considered complete.

If the product deletion operation fails after removing some wishlist items, the system must roll back the wishlist changes to maintain consistency between products and wishlist entries.

The cascade removal must be atomic. Either all wishlist items for a deleted product are removed successfully, or none are removed if any part of the operation fails.

The system must maintain an audit trail of which wishlist items were removed due to product deletion for potential dispute resolution or customer notification purposes.

## Cart Error Scenarios

The shopping cart is customer-specific and cannot contain items from multiple customers. If a variant in the cart becomes out of stock or deleted, it is marked as unavailable and cannot be checked out. When cart quantity exceeds available stock, a warning is displayed but the item remains in the cart. The cart calculates a total price, which may be incorrect if prices have changed since items were added. Empty carts display appropriately when customers have no items.

### Cart Customer Isolation

Each customer has exactly one shopping cart associated with their account. A customer cannot access, view, or modify another customer's cart under any circumstances. The system enforces strict customer isolation for all cart operations, ensuring that cart data is never shared between customers. When a customer views their cart, the system returns only the items belonging to that specific customer.

### Out of Stock Cart Item Handling

When a product variant in the customer's cart becomes out of stock, the system marks that cart item as unavailable. Unavailable items remain visible in the cart display but cannot be selected for checkout. The system clearly indicates the out-of-stock status on the affected cart item. A customer cannot proceed to checkout with unavailable items in their cart. If all items in a cart become unavailable, the checkout button is disabled.

### Deleted Variant Cart Handling

When a product variant is deleted by the seller, the system automatically marks that cart item as unavailable in all customer carts containing that variant. Deleted variant items remain visible in the cart display with a visual indication that the item is no longer available. Such items cannot be included in checkout. The system does not automatically remove deleted variant items from carts, allowing customers to be aware of what happened to their selections.

### Cart Quantity Stock Warning

When a customer attempts to add a quantity to their cart that exceeds the available stock of a variant, the system displays a warning message to the customer. The warning indicates how many units are currently available versus the requested quantity. Despite the warning, the item is not automatically removed from the cart. The customer may adjust the quantity to match available stock or proceed with a quantity that may result in partial fulfillment issues later. The warning appears during both quantity modification and checkout review.

### Price Change Detection and Display

The system calculates the cart total based on the prices stored with each item at the time it was added. When a product or variant price changes after being added to the cart, the cart total may not reflect the current price. The system does not automatically update prices in the cart. Customers see the price they added items at, not the current price. Before completing checkout, customers see the prices recorded in their cart and the resulting total. If prices have changed, customers may remove outdated items and re-add them at current prices.

### Empty Cart Display

When a customer views their cart and has no items, the system displays an empty cart state. The empty cart display includes an appropriate message indicating that the customer has no items in their cart. The system provides a way for the customer to browse products to add items. The empty cart does not show any pricing or totals. Checkout is not accessible from an empty cart.

### Cart Total Calculation

The system calculates the cart total by summing the subtotal of each cart item. Each cart item subtotal is calculated by multiplying the item quantity by the unit price recorded for that variant. The cart total is displayed to the customer before checkout. The total is calculated in real-time as items are added, removed, or quantities are modified. The cart total may include multiple items from the same or different sellers.

## CartItem Error Scenarios

Cart items require a quantity between 1 and 99; quantities outside this range are rejected. When adding a variant that already exists in the cart, quantities are combined rather than creating a new line item. If a variant's stock is less than the requested cart quantity, a warning appears but the item can still be added. Attempting to add a deleted or out-of-stock variant to the cart results in an error. Removing items from the cart is always allowed regardless of stock status. Cart item prices reflect the price at the time of addition, not necessarily the current price.

### Cart Item Quantity Limits

When a customer attempts to add a variant to their cart or modify an existing cart item, the quantity must be between 1 and 99 inclusive. If the quantity is zero or negative, the system rejects the request and displays an error message indicating that quantity must be at least one. If the quantity exceeds 99, the system rejects the request and displays an error message indicating that quantity cannot exceed 99.

### Duplicate Variant Quantity Combining

When a customer adds a variant to their cart and that specific variant already exists in their cart, the system combines the quantities rather than creating a separate line item. The combined quantity must still fall within the valid range of 1 to 99. If the combined quantity would exceed 99, the system rejects the addition and displays a message indicating that the maximum quantity of 99 would be exceeded.

### Stock Shortage Warning

When a customer adds a variant to their cart or views their cart, the system compares the requested quantity against the current stock quantity for that variant. If the stock quantity is less than the requested quantity but greater than zero, the system displays a warning message indicating that only the available stock quantity can be fulfilled. The customer can still proceed to add the item with the available quantity or choose a different quantity. This warning is displayed during cart viewing and checkout.

### Out of Stock and Deleted Variant Addition Prevention

When a customer attempts to add an out-of-stock variant to their cart, the system rejects the request and displays an error message indicating that the variant is out of stock and cannot be added to the cart. The customer must select a different variant or wait until stock becomes available. When a customer attempts to add a deleted variant to their cart, the system rejects the request and displays an error message indicating that the variant is no longer available.

### Cart Item Removal Flexibility

Customers can remove items from their cart at any time regardless of the current stock status of the variant. The removal operation succeeds even if the variant is out of stock, deleted, or has insufficient stock. There are no restrictions on removing cart items, ensuring customers have full control over their cart contents.

### Cart Price Preservation at Addition Time

The price displayed for each cart item reflects the price that was in effect at the time the item was added to the cart or when the quantity was last modified. If the seller changes the product or variant price after the item was added to the cart, the cart continues to show the original price. The cart total is calculated based on these preserved prices. Customers are informed that prices shown are locked at the time of addition.

### Invalid Variant Handling

When a customer attempts to add an invalid variant to their cart, the system validates that the variant exists, belongs to an active product, and is not deleted. If validation fails for any reason, the system rejects the request with an appropriate error message. Error messages distinguish between variant not found, product no longer available, and variant discontinued scenarios.

## Order Error Scenarios

Orders cannot be created without a valid shipping address selected; customers must choose an address or use their default. Unavailable items in the cart cannot proceed to checkout. Once an order is placed, the shipping address cannot be changed. Payment processing can succeed or fail; failed payments do not create orders and allow customers to retry. If payment succeeds, stock is decremented and items are removed from the cart. Order numbers must be unique; the system handles any potential conflicts in order number generation.

### Order Error Scenarios

### Shipping Address Requirement

The system must verify that a valid shipping address is associated with the order before processing payment. If no shipping address is selected and no default address exists for the customer, the checkout process cannot proceed. The customer must choose an existing address or designate a new one as the shipping destination before the order can be placed.

### Unavailable Item Checkout Prevention

The system must validate all items in the shopping cart before allowing checkout. Items that are unavailable—including out-of-stock variants, deleted variants, or products with no purchasable variants—cannot be included in an order. The customer must remove unavailable items from the cart or wait until they become available before proceeding. The checkout button remains disabled or displays an error message until all cart items are verified as available.

### Address Change After Order Prevention

Once an order has been successfully placed and payment has been confirmed, the shipping address associated with that order becomes locked. The system must prevent any modification to the shipping address of a completed order. Customers cannot change the delivery destination after purchase; if they need the item sent elsewhere, they must cancel the order and place a new one with the correct address.

### Payment Failure Handling

When payment processing fails—whether due to insufficient funds, card decline, network errors, or any other payment gateway issue—the system must not create an order record. The customer remains on the checkout page and receives clear notification that the payment was unsuccessful. Stock quantities remain unchanged and items remain in the cart. The customer may attempt payment again with corrected information. No partial orders or incomplete order records are created on payment failure.

### Payment Success Order Creation

When payment processing succeeds, the system must atomically create the order record and associated order items. The order captures the shipping address snapshot, the total price at time of purchase, and individual item details including quantity and unit price. Each order item receives a product snapshot and seller profile snapshot preserving the state of those records at the time of purchase. The system records the exact timestamp of order creation and assigns a unique order number for tracking purposes.

### Stock Decrement Atomicity

The system must decrease stock quantities for all purchased variants as part of the same atomic transaction that creates the order. If any stock decrement operation fails—such as attempting to purchase more quantity than available—the entire order creation must be rolled back and the payment must be refunded or voided. The customer receives notification that the item is no longer available in the requested quantity. No order is created with inconsistent stock levels. Each inventory record is created with a negative quantity change representing the order deduction.

### Order Number Uniqueness

The system must generate order numbers that are unique across all orders in the platform. If a generated order number already exists in the system, the system must regenerate until a unique number is produced. Order numbers are assigned only after successful payment confirmation. No two orders can share the same order number regardless of customer, seller, or time period. The uniqueness mechanism must handle high-volume concurrent order creation without producing duplicates.

### Cart Clearance on Success

Upon successful order creation following payment confirmation, the system must remove all purchased items from the customer's shopping cart. Items that were successfully ordered are deleted from the cart as part of the same atomic transaction. Unpurchased items in the cart remain for future checkout. The cart total is updated to reflect only remaining items. The customer can view their updated cart immediately after order completion with accurate totals and item counts.

## OrderItem Error Scenarios

Order items have individual statuses that can differ from the overall order status. Items can only be cancelled when in "paid" status, and items in "shipped" or "delivered" status cannot be cancelled. Each order item can have its own cancellation or refund request processed independently. The overall order status is recalculated based on the statuses of all items within it. Mixed item statuses result in a "partially completed" order status. Order items preserve snapshots of the product and seller profile at the time of purchase.

### Order Item Status Tracking

Each order item maintains its own status independent of the overall order status. The system shall track the following statuses for individual items: paid, shipped, delivered, cancelled, and refunded. An item's status is determined by payment confirmation, seller shipping actions, customer delivery confirmation, cancellation requests, or refund requests.

When an order is successfully placed, all items receive an initial status of paid. The status of an individual item changes only through specific operations performed on that item, not on the order as a whole. Each status change is recorded with a timestamp.

### Cancellation Eligibility Rules

Items in paid status are eligible for cancellation requests by customers. Items in shipped or delivered status cannot be cancelled by customers. The system shall reject any cancellation request for items that have progressed beyond paid status. Sellers cannot ship items that have pending cancellation requests.

### Delivered Item Cancellation Prevention

Items that have been delivered cannot be cancelled by customers. This rule is strictly enforced regardless of the time elapsed since delivery. The system shall not accept cancellation requests for delivered items and shall direct customers to the refund process instead. Sellers cannot approve cancellation requests for items that have been shipped or delivered.

### Item-Level Refund Processing

Refunds are processed at the item level, not the order level. Customers can request a refund for any delivered item within 7 days of that item's delivery date. Each item's refund window is calculated independently based on when that specific item was delivered. If an item is refunded, only that item's status changes to refunded and only that item's price is returned to the customer. The remaining items in the order continue with their own statuses unaffected.

### Order Status Derivation

The overall order status is calculated by the system based on the statuses of all items within the order. When all items have the same status, the order takes that status. When items have different statuses, the order status reflects the mixed state of its contents.

### Partial Completion Status Assignment

When items within an order have different statuses that cannot be represented by a single standard status, the order receives a partially completed status. Examples of scenarios resulting in partially completed include: some items delivered while others are refunded, some items shipped while others are cancelled, or any combination where items have diverged to incompatible states. The partially completed status indicates that the order is in a mixed operational state.

### Order Item Snapshot Preservation

When an order is placed, the system creates and preserves a snapshot of each purchased product and each purchased variant. These snapshots are stored with the order item and include the product name, description, variant options, and price at the time of purchase. Additionally, a snapshot of the seller's profile at purchase time is stored with each order item, preserving the shop name and logo. These snapshots cannot be modified or deleted after creation and serve as the authoritative record of what the customer purchased and from which seller.

### Independent Item Operations

Each order item can be cancelled or refunded independently from other items in the same order. A customer can cancel some items while others continue through the shipping process. A customer can request refunds for some delivered items while other items remain in delivered status. Sellers process cancellation and refund requests on a per-item basis, evaluating each request independently. The overall order status reflects these independent operations across items.

## Shipment Error Scenarios

Shipments must contain items from only one seller; attempts to bundle items from different sellers into a single shipment are rejected. Each shipment requires carrier name and tracking number, both between 1 and 100 characters. Items within a shipment share the same tracking information and transition to "shipped" status together. Customers can confirm delivery per shipment, which updates all items in that shipment to "delivered". If delivery is not confirmed, items automatically become "delivered" after 14 days from the shipping date.

### Single Seller Shipment Rule Violation

When a seller attempts to create a shipment containing items from multiple sellers, the system rejects the request. Each shipment must contain order items from exactly one seller.

If the seller attempts to add items from different sellers to the same shipment, the system displays an error message indicating that shipments can only include items from one seller.

The system validates item grouping before shipment creation completes.

### Carrier Name Validation Errors

When creating a shipment, the carrier name is a required field. The seller must provide a carrier name between 1 and 100 characters.

If the carrier name field is empty or contains only whitespace, the system rejects the shipment creation and displays an error message indicating that carrier name is required.

If the carrier name exceeds 100 characters, the system rejects the shipment creation and displays an error message indicating that carrier name must not exceed 100 characters.

### Tracking Number Validation Errors

When creating a shipment, the tracking number is a required field. The seller must provide a tracking number between 1 and 100 characters.

If the tracking number field is empty or contains only whitespace, the system rejects the shipment creation and displays an error message indicating that tracking number is required.

If the tracking number exceeds 100 characters, the system rejects the shipment creation and displays an error message indicating that tracking number must not exceed 100 characters.

### Shipment Status Synchronization Failures

When a shipment is created, all order items included in that shipment must transition to "shipped" status together. The system synchronizes the status of all items within the same shipment.

If any item in the shipment fails to update to "shipped" status due to an error, the entire shipment creation is rolled back and no items are marked as shipped.

The seller receives a notification if the shipment creation partially fails, with a list of items that could not be updated.

### Delivery Confirmation Validation Errors

The customer can confirm delivery for each shipment individually. When the customer confirms delivery of a shipment, all order items within that shipment transition to "delivered" status.

If the customer attempts to confirm delivery for a shipment that is not in "shipped" status, the system rejects the request and displays an error message.

The system records the delivery confirmation timestamp for audit purposes.

### Automatic Delivery Timeout Handling

If the customer does not confirm delivery within 14 days from the shipping date, the system automatically transitions all items in the shipment to "delivered" status.

The system runs a daily process to identify shipments that have been in "shipped" status for 14 days or more without delivery confirmation.

When automatic delivery confirmation occurs, the system records the automatic transition timestamp rather than a customer confirmation timestamp.

The seller and customer are notified when items transition to "delivered" status automatically.

### Item Grouping Validation Errors

When grouping order items into a shipment, the system validates that all items belong to the same seller. Items from different sellers cannot be combined into a single shipment.

If the seller selects items from different sellers, the system displays an error and prevents the shipment from being created.

The system also validates that each selected item is in "paid" status and can be shipped. Items that are already shipped, delivered, cancelled, or refunded cannot be added to a new shipment.

If any selected item does not meet the shipping eligibility criteria, the system rejects the entire shipment creation and lists the ineligible items.

### Shipment Creation Failure Handling

If the shipment creation fails due to validation errors, no shipment record is created and no order items have their status changed.

If the shipment creation fails after some items have been processed, the system rolls back all changes to ensure data consistency.

The seller receives a clear error message specifying which validation failed and which items were affected.

The seller can retry the shipment creation with corrected information after addressing the validation errors.

The system does not create partial shipments or update individual items independently when the complete shipment cannot be created.

## CancellationRequest Error Scenarios

Cancellation requests can only be submitted for items in "paid" status; items already shipped or delivered cannot be cancelled. Each cancellation request requires a reason between 1 and 1000 characters. Sellers can approve or reject cancellation requests, and rejecting requires a reason. If approved, the item status changes to "cancelled" and refund is processed for that specific item only. Cancelled items restore their stock quantities through inventory records. Only the customer who placed the order can request cancellation.

### Cancellation Request Eligibility and Status Validation

### Cancellation Request Eligibility Based on Item Status

Cancellation requests can only be submitted for individual order items that are in "paid" status. When a customer attempts to request cancellation for an item that is already shipped, the system must reject the request with an appropriate error message indicating that the item has already been shipped and cannot be cancelled. Similarly, if the item has been delivered, the system must indicate that delivered items cannot be cancelled and that the customer should request a refund instead. The system must verify the current status of the order item before allowing the cancellation request form to be submitted.

### Already Shipped Cancellation Denial

When a customer attempts to cancel an order item that has already been shipped, the system must prevent the cancellation request from being created. The error message must clearly state that the item is no longer eligible for cancellation because it has been shipped. The system must guide the customer toward the refund process instead, explaining that they can request a refund after the item has been delivered. This scenario ensures that items in transit are not interrupted and that the shipping process proceeds smoothly.

### Cancellation Reason Requirement and Validation

Every cancellation request must include a reason explaining why the customer wants to cancel the order. The reason field must contain between 1 and 1000 characters. If the customer attempts to submit a cancellation request without providing a reason or with a reason that is too short, the system must reject the submission and prompt the customer to provide a valid reason. The reason is stored with the cancellation request and is visible to the seller who will review the request.

### Customer-Only Cancellation Request Authorization

Only the customer who placed the original order can request cancellation for an order item. The system must verify that the user making the cancellation request is the same customer who created the order. If a different user attempts to request cancellation on behalf of someone else, the system must deny the request. Sellers cannot request cancellation on behalf of customers; only customers can initiate cancellation requests for their own orders.

### Cancellation Approval Workflow

When a seller receives a cancellation request, they have the option to approve or reject it. To approve a cancellation request, the seller must confirm their decision through the seller dashboard. When a cancellation request is approved, the system must change the order item status from "paid" to "cancelled". The approval action must also trigger the refund processing for that specific item and restore the stock quantity for the associated product variant through inventory records. A snapshot of the cancellation request state must be created at the time of approval.

### Cancellation Rejection Reason Requirement

When a seller rejects a cancellation request, they must provide a reason for the rejection. The rejection reason field must contain between 1 and 1000 characters. If the seller attempts to reject without providing a reason, the system must prompt them to include a rejection reason before the rejection can be processed. The rejection reason is stored with the cancellation request and is visible to the customer who submitted the request. A snapshot of the cancellation request state must be created at the time of rejection.

### Stock Restoration Upon Cancellation Approval

When a cancellation request is approved and an order item is cancelled, the system must restore the stock quantity for the affected product variant. The restoration is performed by creating a new inventory record with a positive quantity change equal to the quantity that was purchased in the cancelled order item. This inventory record must include the reason "Cancellation refund" or similar description indicating that stock is being restored due to a cancelled order. The current stock quantity of the variant is recalculated by summing all inventory records including the new restoration record.

### Cancelled Item Refund Processing

When a cancellation request is approved, the system must process a refund for the cancelled item. The refund amount must correspond to the unit price of the item multiplied by the quantity being cancelled. The refund is processed through the same payment method used for the original order. The system must handle both successful and failed refund scenarios. If the refund succeeds, the cancellation is finalized and the order item status changes to "cancelled". If the refund fails, the system must notify administrators and retain the cancellation request in a pending state until the refund can be successfully processed.

### Cancellation Request Edge Cases and System Behavior

### Concurrent Cancellation Request Prevention

The system must prevent duplicate cancellation requests for the same order item. If a customer attempts to submit a second cancellation request for an order item that already has a pending cancellation request, the system must reject the second request and inform the customer that a cancellation request is already pending for that item. This ensures that sellers do not receive multiple identical requests and prevents confusion in the approval workflow.

### Cancellation Request Visibility During Processing

While a cancellation request is pending, the order item must remain in "paid" status and must not be allowed to proceed to shipment. The system must display the pending cancellation status clearly to the seller when they view their order items. Sellers must be informed that an item has a pending cancellation request before they can attempt to ship it. This prevents situations where sellers ship items that are about to be cancelled.

### Seller Response Timeout Handling

The system must handle scenarios where sellers do not respond to cancellation requests within a reasonable timeframe. While the system does not automatically approve or reject requests, it must track the age of pending cancellation requests. Administrators must be able to view pending cancellation requests that have exceeded a certain age threshold and may intervene if necessary. The exact timeout threshold and automatic intervention rules are determined by business policy.

### Cancellation Affect on Remaining Order Items

When a cancellation request is approved for one item in a multi-item order, the remaining items in the order must continue processing normally. The overall order status must be recalculated based on the statuses of all remaining items. The system must not cancel the entire order if only some items are cancelled; each item is handled independently. Sellers can continue to ship other items in the same order that do not have pending cancellations.

### Cancellation Snapshot Content

When a seller responds to a cancellation request (either approving or rejecting), the system must create a snapshot containing the complete state of the cancellation request. This snapshot must include the original cancellation reason provided by the customer, the response type (approved or rejected), the response reason if rejected, the timestamp of the response, and the identities of the customer and seller involved. The snapshot is immutable and is preserved for dispute resolution purposes.

## RefundRequest Error Scenarios

Refund requests can only be submitted for items in "delivered" status within 7 days of delivery; requests outside this window are rejected. Each refund request requires a reason between 1 and 1000 characters. Sellers can approve or reject refund requests, and rejecting requires a reason. If approved, the item status changes to "refunded" and the refund is processed. Refunded items restore their stock quantities through inventory records. Only the customer who placed the order can request a refund.

### Refund Status Eligibility

The system shall reject refund requests for items that have not been delivered. Only items with status "delivered" are eligible for refund requests.

When a customer attempts to request a refund for an item with status "paid" or "shipped", the system shall reject the request and inform the customer that refunds can only be requested after the item has been delivered.

When a customer attempts to request a refund for an item with status "cancelled" or "refunded", the system shall reject the request and inform the customer that the item is not eligible for a refund.

### Expired Refund Deadline and Seven-Day Window

The system shall reject refund requests submitted more than 7 days after the delivery date of the item.

When a customer attempts to request a refund after the 7-day window has expired, the system shall reject the request and inform the customer that the refund window has closed.

The delivery date used for calculating the deadline is the date when the item was marked as delivered, either through customer confirmation or through automatic status change after 14 days from shipping.

### Refund Reason Requirement

The system shall require customers to provide a reason when submitting a refund request. The reason must be between 1 and 1000 characters.

When a customer submits a refund request without a reason or with a reason exceeding 1000 characters, the system shall reject the request and prompt the customer to provide a valid reason.

The system shall store the reason along with the refund request for seller review and record-keeping purposes.

### Customer-Only Refund Request

The system shall allow only the customer who placed the order to submit a refund request for that order's items.

When any other user attempts to submit a refund request on behalf of another customer, the system shall reject the request and inform the user that they are not authorized to request a refund for this order.

When a banned customer attempts to submit a refund request, the system shall reject the request and inform the user that their account is suspended.

### Refund Approval Workflow and Stock Restoration

When a seller approves a refund request, the system shall change the order item status to "refunded" and process the refund for that item.

The system shall restore the stock quantity of the refunded variant by creating an inventory record with a positive quantity change and a reason indicating the refund.

The refund applies only to the specific item being refunded. Other items in the same order continue with their normal status and are not affected.

When all items in an order are refunded, the system shall change the overall order status to "refunded".

### Refund Rejection Reason Requirement

When a seller rejects a refund request, the system shall require the seller to provide a rejection reason between 1 and 1000 characters.

When the seller submits a rejection without a reason or with a reason exceeding 1000 characters, the system shall reject the submission and prompt the seller to provide a valid reason.

The system shall create a snapshot of the refund request state when the seller responds (either approving or rejecting).

The snapshot shall preserve the request reason, the seller's response, and the timestamp of the response for dispute resolution purposes.

## Snapshot Error Scenarios

Snapshots are immutable once created and cannot be deleted, edited, or modified. Attempting to modify or delete a snapshot results in an error. Snapshots can be viewed by relevant parties including owners and administrators for dispute resolution. Each snapshot records when the change was made, what was changed, and the values before and after. If a snapshot's referenced content no longer exists, the snapshot still remains accessible as a historical record.

### Snapshot Immutability and Modification Prevention

### Snapshot Immutability Enforcement

Snapshots are immutable records that preserve the state of data at a specific point in time. Once a snapshot is created, the system must reject any attempt to alter its contents.

When a user attempts to modify any field within an existing snapshot, the system shall reject the request and return an error message indicating that snapshots cannot be modified.

When a user attempts to alter the recorded values, timestamps, or any attribute of a snapshot, the system shall deny the operation and preserve the original snapshot data unchanged.

### Snapshot Deletion Prevention

The system must prevent the deletion of any snapshot regardless of user role or circumstance.

When any user attempts to delete a snapshot, the system shall reject the request and return an error message indicating that snapshots are permanent records that cannot be deleted.

When an administrator attempts to delete a snapshot for any reason including data cleanup or dispute resolution, the system shall deny the operation.

### Snapshot Modification Denial

The system must explicitly deny all modification operations on snapshot records.

If a user attempts to update the content of a snapshot, the system shall reject the request and maintain the snapshot in its original state.

If a user attempts to change the snapshot type, reference identifier, or any metadata, the system shall deny the modification and return an appropriate error message.

### Snapshot Access Control

The system must enforce access controls that determine which users can view specific snapshots.

Owners of the data represented in a snapshot can view their own snapshots. Sellers can view snapshots of their own products, variants, and profile. Customers can view snapshots of their own reviews.

Administrators can view any snapshot on the platform for oversight and dispute resolution purposes.

When a user who is not the owner or an administrator attempts to view a snapshot, the system shall deny access and return an error message indicating insufficient permissions.

### Snapshot Content Preservation

The system must preserve all snapshot content completely and accurately.

Each snapshot records the timestamp when the change was made, identifying what data was changed, and the complete values before and after the modification.

When a product is edited, the snapshot must include all product fields including name, description, category, base price, images, and all variant information at that moment.

When a seller profile is edited, the snapshot must include the shop name, shop description, and logo image URL.

The system must never truncate, sanitize, or alter any snapshot content regardless of subsequent data changes.

### Snapshot Viewer Roles

The system must define clear viewer roles for snapshot access.

Product owners can view snapshots of their own products and variants. Seller profile owners can view snapshots of their own profile. Review authors can view snapshots of their own reviews.

Order item snapshots can be viewed by the customer who placed the order and the seller whose product was purchased.

Cancellation request and refund request snapshots can be viewed by the customer who submitted the request, the seller who received the request, and administrators.

Administrators with appropriate permissions can view any snapshot on the platform.

### Orphaned Snapshot Handling

When the original data that a snapshot references is deleted, the system must preserve the snapshot as a historical record.

If a product is deleted, all product snapshots must remain accessible as historical records of what the product contained at various points in time.

If a seller account is deleted, seller profile snapshots associated with order items must remain accessible to preserve the shop information that appeared on past orders.

If a review is deleted by the customer, the review snapshots must remain accessible showing the original rating and content.

The system must clearly indicate in the orphaned snapshot view that the original data source no longer exists while preserving all recorded information.

### Snapshot Retrieval After Deletion

The system must allow retrieval of snapshots even after the original data has been deleted.

When a user requests to view a product snapshot after the product has been deleted, the system shall retrieve and display the complete snapshot data including all preserved fields.

When an administrator needs to resolve a dispute involving a deleted product, the system must provide access to all associated snapshots showing the product state at various points in time.

When a seller requests their product history after deletion, the system shall display all snapshots in chronological order with timestamps and changed values.

### Snapshot Access Control and Viewer Roles

### Snapshot Viewer Permissions Matrix

| Viewer Role | Can View | Conditions |
|------------|----------|------------|
| Product Owner | Own product snapshots | Seller who created the product |
| Variant Owner | Own variant snapshots | Seller who owns the parent product |
| Profile Owner | Own profile snapshots | Seller whose profile was edited |
| Review Author | Own review snapshots | Customer who wrote the review |
| Order Customer | Order item snapshots | For items in their own orders |
| Order Seller | Order item snapshots | For items they sold |
| Administrator | Any snapshot | Platform oversight role |

### Error Response for Unauthorized Snapshot Access

When a user without appropriate permissions attempts to view a snapshot, the system shall return an error message stating that the user does not have permission to view this snapshot. The error message shall not reveal the contents of the snapshot to unauthorized users.

### Error Response for Deleted Data Snapshot Viewing

When a user requests a snapshot for data that has been deleted, the system shall still return the snapshot data with a clear indication that the original data has been removed. The response shall include a message such as "This record has been deleted but the historical snapshot is preserved below" before displaying the snapshot contents.

### Orphaned Snapshot Handling and Data Preservation

### Preserving Snapshot Chain After Data Deletion

When the system deletes a product that has existing snapshots, the snapshot records must remain intact and queryable.

The system must maintain the relationship between the deleted product and its snapshots even after the product record is removed from active tables.

Administrators reviewing a dispute about a deleted product must be able to retrieve all historical snapshots showing the product state at each modification point.

### Handling Missing Content References in Snapshots

If a snapshot references data that has been permanently removed from the system, the system must still return the snapshot with all recorded information intact.

When displaying an orphaned snapshot, the system must preserve every field value that was captured at snapshot creation time, including any identifiers, names, descriptions, prices, and images that may no longer exist in active records.

### Snapshot Integrity Verification

The system must verify snapshot integrity when retrieved after the original data is deleted.

If any portion of snapshot data is corrupted or missing, the system must report the integrity issue without modifying the remaining data.

The system must never reconstruct or infer missing snapshot data based on current values.

### Snapshot Retrieval After Deletion

### Retrieval Methods for Historical Snapshots

Users with appropriate permissions can retrieve snapshots through the following methods.

Sellers can retrieve product snapshots from their product management interface by selecting the option to view modification history.

Sellers can retrieve variant snapshots from the variant management page showing the complete history of changes to that variant.

Sellers can retrieve profile snapshots from their shop settings showing the history of profile edits.

Customers can retrieve review snapshots from their purchase history showing the history of their review edits.

Administrators can retrieve any snapshot through the administrative oversight interface using the content type and content identifier.

### Snapshot Listing After Data Deletion

When listing products or other entities that have been deleted, the system must indicate that historical snapshots exist for those items.

Deleted products can still show their modification history to administrators and the original seller.

Deleted reviews can still show their modification history to the customer who wrote them and administrators.

### Chronological Snapshot Access

The system must provide chronological access to all snapshots of a given item.

Users can view snapshots in order from oldest to newest to understand the complete modification history.

Each snapshot display includes the exact timestamp when that state was captured.

## ProductSnapshot Error Scenarios

Product snapshots are created automatically when any product field is edited and include all product data including images. The snapshot also includes snapshots of all variants at that moment, preserving the complete state of the product and its variants. When a product is deleted, its snapshots remain preserved for historical records and dispute resolution. Product snapshots can be viewed by the original seller and administrators. Attempting to create a snapshot for a non-existent product results in an error.

### Product Edit Snapshot Creation Errors

## Product Edit Snapshot Creation Errors

When a seller attempts to edit a product, the system must create a snapshot of the product state before the edit is applied.

If the product does not exist in the system, the system must reject the edit operation and return an error indicating the product cannot be found.

If the seller attempting the edit is not the owner of the product, the system must reject the edit operation and prevent snapshot creation.

If the product edit fails validation (such as missing required fields), the system must not create a snapshot since the edit was not completed.

If the system encounters an internal error during snapshot creation, the product edit must also fail to maintain data consistency.

### Variant Snapshot Inclusion Errors

## Variant Snapshot Inclusion Errors

When a product snapshot is created, it must include snapshots of all variants associated with that product at that moment in time.

If any variant is missing required fields when the parent product snapshot is created, the system must still include that variant in the snapshot with the available data and flag the incomplete variant for review.

If a variant has been deleted after the snapshot was created, the variant snapshot must remain preserved in the product snapshot record.

If the system cannot capture all variant data due to a technical error, the product edit must fail and no snapshot should be created.

If a variant is being edited simultaneously with the parent product, the system must use the variant data as it existed at the start of the product edit operation.

### Product Deletion Snapshot Preservation Errors

## Product Deletion Snapshot Preservation Errors

When a product is deleted, all previously created snapshots must remain preserved in the system.

If a request is made to view a snapshot of a deleted product, the system must successfully retrieve and display the historical snapshot data.

If a seller attempts to view snapshots of a product they previously owned but have since deleted, the system must still allow access to those historical snapshots.

If the system cannot locate a snapshot record that should exist, the system must log the discrepancy for administrative review.

If an administrator attempts to delete a product snapshot directly, the system must reject the request and indicate that snapshots cannot be deleted.

### Snapshot Product Field Coverage Errors

## Snapshot Product Field Coverage Errors

A product snapshot must capture all product fields including the product name, description, category assignment, base price, and creation timestamp.

If any field value is null or undefined when the snapshot is created, the snapshot must still record that the field was empty rather than omitting the field entirely.

If the product has been moved to a different category after the snapshot was created, the snapshot must reflect the category as it existed at the time of snapshot creation.

If a required field is discovered to be missing after snapshot creation, the system must not retroactively modify the snapshot but instead flag the issue for administrative review.

If the snapshot content appears incomplete compared to the product schema, the system must reject the snapshot and require the operation to be retried.

### Snapshot Image Preservation Errors

## Snapshot Image Preservation Errors

When a product snapshot is created, all product images must be included in the snapshot data.

If an image has been deleted from the product after the snapshot was created, the snapshot must preserve the reference to the deleted image and indicate that it has since been removed.

If the image URL in the snapshot becomes inaccessible after snapshot creation, the snapshot must still be valid and the system must display a placeholder for the unavailable image.

If the product has no images at the time of snapshot creation, the snapshot must reflect that the product had no images.

If there are more images than the system can reasonably include in a single snapshot, the system must include all images but may paginate the results when displaying the snapshot.

### Seller Snapshot Access Errors

## Seller Snapshot Access Errors

A seller can view snapshots of their own products to track changes over time.

If a seller attempts to view a snapshot of another seller's product, the system must reject the request and indicate that access is denied.

If a seller attempts to view a snapshot of a product that has been deleted, the system must still allow access to the historical snapshot if the seller previously owned the product.

If a seller has been suspended, they must still be able to view their own product snapshots for reference purposes.

If a seller requests a list of all their product snapshots, the system must return them in chronological order with the most recent first.

### Administrator Snapshot Access Errors

## Administrator Snapshot Access Errors

Administrators can view snapshots of any product on the platform for oversight and dispute resolution purposes.

If an administrator requests a snapshot that does not exist, the system must return an error indicating the snapshot was not found.

If a super administrator requests a product snapshot, the system must grant full access regardless of the product's current status or ownership.

If a regular administrator attempts to perform administrative actions on snapshots, the system must verify their permissions before allowing the operation.

If the system detects unusual access patterns to product snapshots by administrators, the system must log the activity for security review.

If a customer disputes an order and references a product snapshot, administrators must be able to retrieve and verify the exact product state at the time of purchase.

### Snapshot Product Existence Check Errors

## Snapshot Product Existence Check Errors

Before creating a product snapshot, the system must verify that the product exists in the system.

If the product identifier provided is invalid or malformed, the system must reject the snapshot creation request with an appropriate error message.

If the product exists but has been marked as deleted, the system must still allow snapshots to be created for historical record purposes.

If the product identifier references a product belonging to a seller who no longer exists, the system must still create the snapshot with the available product data.

If multiple products share the same identifier due to a system error, the system must not create a snapshot and must report the data integrity issue to administrators.

If the product existence check takes longer than expected, the system must timeout and return an error indicating the operation could not be completed.

## SellerProfileSnapshot Error Scenarios

Seller profile snapshots are created automatically when shop name, description, or logo is edited. Each snapshot preserves the previous state of the shop profile. When a seller profile is deleted, its snapshots remain preserved as part of order item historical records. Seller profile snapshots can be viewed by the original seller and administrators. Attempting to create a snapshot for a non-existent seller profile results in an error.

### Shop Name Change Snapshot Creation

When a seller edits their shop name, the system must automatically create a snapshot of the previous shop name before the change is applied. If the shop name is identical to the current value, the system must not create a duplicate snapshot. If the edit operation fails after the snapshot would have been created, the system must not leave a partial or orphaned snapshot record. If the seller attempts to edit their shop name while their account is suspended, the edit must be rejected and no snapshot must be created.

### Logo Change Snapshot Creation

When a seller changes their shop logo image, the system must create a snapshot capturing the previous logo URL before the change. If the new logo URL is identical to the existing one, the system must not create a duplicate snapshot. If the image upload fails, the system must preserve the existing logo and must not create a snapshot. If the seller removes their logo entirely, the snapshot must record the previous logo URL as null.

### Shop Description Change Snapshot Creation

When a seller updates their shop description, the system must create a snapshot of the previous description before the change is applied. If the description content has not changed, the system must not create a snapshot. If the edit operation times out or fails, the system must rollback to the previous description and must not create an incomplete snapshot record.

### Snapshot Seller Profile Field Coverage

When the system creates a seller profile snapshot, it must capture all editable fields of the seller profile including shop name, shop description, and shop logo URL. The snapshot must record the exact state of these fields at the moment of capture. If any field is missing or null in the profile, the snapshot must record that field as null. The snapshot must include a timestamp of when the change was made.

### Seller Deletion Snapshot Preservation

When a seller deletes their account, all existing seller profile snapshots must remain preserved as part of order item historical records. If the seller attempts to delete their account while snapshots exist that are not associated with completed orders, the system must still allow deletion but must preserve those snapshots. If the seller's profile data is deleted but the seller record itself remains for audit purposes, the snapshots must still remain accessible by order item association.

### Snapshot Access for Sellers

When a seller requests to view their own profile snapshots, the system must display all snapshots associated with their seller profile. If no snapshots exist for the seller, the system must return an empty list without error. If the seller requests a specific snapshot by identifier and that snapshot belongs to another seller, the system must reject the request. If the seller account has been deleted but the seller record remains for historical purposes, the original seller cannot access their snapshots.

### Snapshot Access for Administrators

When an administrator requests to view seller profile snapshots, the system must allow access to any snapshot on the platform. If the administrator requests snapshots for a specific seller, the system must return all snapshots for that seller regardless of who initiated the original profile change. If the administrator requests a specific snapshot by identifier, the system must return that snapshot if it exists. Regular administrators and super administrators must have equal access to view seller profile snapshots.

### Non-Existent Seller Profile Snapshot Creation

When an operation attempts to create a seller profile snapshot for a seller profile that does not exist, the system must reject the operation and return an error indicating the seller profile was not found. If the seller profile is deleted but a seller account record remains, the system must allow snapshot viewing but must reject new snapshot creation. If the seller identifier is invalid or null, the system must reject the operation with a validation error.

### Snapshot Creation System Failure Handling

If the system experiences a database error during snapshot creation, the system must not commit the profile change until the snapshot is successfully created. The system must retry the snapshot creation at least once before rejecting the entire edit operation. If the snapshot creation fails after retries, the system must return an error to the seller and must preserve the previous profile state unchanged.

### Snapshot Data Retrieval and Display

When a seller profile snapshot is viewed, the system must display the captured shop name, shop description, and shop logo URL exactly as they existed at the time of the snapshot. The snapshot must also display the timestamp of when the change occurred and the reason for the change if available. If the snapshot references a seller who no longer has an active profile, the system must still display the snapshot data correctly.

## AdminRequest Error Scenarios

Admin requests can be submitted by any user to become an administrator and require a reason between 1 and 1000 characters. Requests are either "pending", "approved", or "rejected". Only super administrators can approve admin requests and manage administrator grades. Super administrators can promote regular administrators to super or demote other super administrators, but cannot demote themselves. If a user is already an administrator, submitting another admin request returns an error. Pending requests can be cancelled by the requester before approval.

### AdminRequest Submission Errors

### Already Administrator Prevention

When a user who is already an administrator submits an admin request, the system shall reject the request and return an error indicating that administrators cannot submit additional requests.

### Duplicate Request Prevention

When a user has a pending admin request, the system shall reject any additional requests from that user and return an error indicating an active request already exists.

### Request Reason Requirement

When a user submits an admin request, the system shall require a reason between 1 and 1000 characters. Requests without a reason or with a reason outside this length shall be rejected.

### Pending Request Cancellation

When a user has a pending admin request, the user shall be able to cancel that request before it is approved. Cancelled requests cannot be approved and do not prevent the user from submitting a new request later.

### Super Admin Approval Requirement

When a regular admin request is submitted, only super administrators shall be able to approve or reject it. Regular administrators shall not have the ability to approve admin requests.

### Grade Promotion Eligibility

When a super administrator promotes a regular administrator, the system shall verify the target user is a regular administrator before allowing the promotion. Only regular administrators can be promoted to super administrator.

### Self-Demotion Prevention

When a super administrator attempts to demote themselves, the system shall reject the request and return an error indicating that a user cannot demote their own account.

### Request Status Transitions

Admin requests shall follow these status transitions:

- From pending to approved when a super administrator approves the request
- From pending to rejected when a super administrator rejects the request
- From pending to cancelled when the requesting user cancels their own request
- From pending to approved when a user is promoted from regular administrator to super administrator

### AdminRequest Validation Errors

### Already Administrator Error

If a user who already holds an administrator role attempts to submit an admin request, the system shall return an error stating that the user is already an administrator.

### Duplicate Pending Request Error

If a user with an existing pending admin request attempts to submit another request, the system shall return an error stating that a pending request already exists.

### Invalid Request Reason Error

If a user submits an admin request without a reason or with a reason exceeding 1000 characters, the system shall return an error specifying the valid reason length requirement.

### Unauthorized Approval Error

If a regular administrator attempts to approve or reject an admin request, the system shall return an error stating that only super administrators can perform this action.

### Self-Demotion Error

If a super administrator attempts to demote their own account, the system shall return an error stating that a user cannot demote their own administrator role.

### Invalid Promotion Target Error

If an administrator attempts to promote a user who is not a regular administrator, the system shall return an error indicating the promotion target is not eligible.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Customer Purchase Journey

The complete purchase journey starts when a new visitor attempts to browse products and discovers that registration is required to use any platform features. The visitor must create a customer account by providing an email address and password. Once registered, the customer can log in and begin browsing products through search or category navigation.

The customer selects a product to view its details, including all available variants, prices, stock status, and existing reviews. The customer chooses a specific variant based on their preferred options (such as color and size) and adds it to their shopping cart along with the desired quantity. The customer can continue shopping and add more items from different sellers to the same cart.

When ready to checkout, the customer reviews the cart contents, ensuring all items are available and quantities are correct. The customer selects a shipping address from their saved addresses or adds a new one. The customer reviews the complete order summary including itemized prices and the total amount. The customer confirms and submits the order, which triggers payment processing through an external payment gateway.

If payment fails, the order is not created and the customer remains on the checkout page with an error message. The customer can retry payment or modify their order. If payment succeeds, the order is created with all items, stock quantities are decreased for each purchased variant, items are removed from the cart, and product and seller profile snapshots are captured for each order item.

After order creation, the customer can view their order history and track the status of individual items as sellers ship them. The customer receives tracking information for each shipment and confirms delivery when packages arrive.

### Seller Onboarding and First Sale Journey

The seller onboarding journey begins when a user decides to register as a seller. The user submits a seller registration request with their email and password. The request enters a pending state awaiting administrator review.

An administrator reviews the pending seller requests and either approves or rejects the registration. If rejected, the administrator must provide a rejection reason. The rejected applicant can view the rejection reason and submit a new registration request with improvements. If approved, the seller gains access to seller features and can log in to their seller dashboard.

Upon first login, the approved seller should complete their seller profile by providing a shop name, shop description, and logo image. Every edit to the profile creates a snapshot that preserves the previous state. The seller can view their shop profile as customers will see it by visiting their public profile page.

The seller then creates products by providing the required fields: name, description, category, and base price. The seller uploads multiple product images and arranges them to set the main thumbnail. The seller creates product variants with SKU codes, option values, and prices. The seller sets initial inventory quantities for each variant through restocking operations.

Once products are listed with inventory, customers can find and purchase them. The seller monitors their dashboard for new orders containing their products. The seller processes each paid order item by creating shipments with tracking information. The seller handles any cancellation requests or refund requests from customers.

### Order Fulfillment and Delivery Journey

The order fulfillment journey begins after a customer successfully places an order. The system creates an order containing multiple order items, each linked to a specific product variant purchased. Each order item captures a snapshot of the product data and seller profile at the time of purchase.

Sellers view their dashboard to see paid order items awaiting shipment. Each seller creates shipments for their own items only, as different sellers cannot share shipments. For each shipment, the seller enters the carrier name and tracking number. Creating a shipment changes all included items to the "shipped" status.

The customer receives tracking information for each shipment and can monitor delivery progress through external carrier systems. The customer confirms delivery for each shipment when packages arrive. If the customer does not confirm within 14 days of shipping, the items automatically change to "delivered" status.

After delivery, the customer has 7 days to request a refund for any delivered item. The customer submits a refund request with a reason. The seller reviews the request and approves or rejects it. If approved, the refund is processed and the item status changes to "refunded". Stock quantities are restored for refunded items.

Alternatively, before shipment, the customer can request cancellation for any paid item. The seller approves or rejects the cancellation. If approved, the item is cancelled, refund is processed, and stock is restored. The remaining items in the order continue through the fulfillment process.

### Product Editing and Snapshot Preservation Journey

The product editing and snapshot preservation journey demonstrates how the platform maintains historical records of all changes. A seller decides to update a product's price or description. Before saving the changes, the system creates a snapshot that captures the complete current state of the product and all its variants.

The snapshot includes all product fields such as name, description, category, base price, and images. The snapshot also includes the state of all product variants at that moment, including SKU codes, option values, prices, and stock quantities. This snapshot is immutable and cannot be deleted or modified after creation.

After the snapshot is created, the system applies the seller's edits to the product. Customers viewing the product see the updated information. However, any orders placed before the edit still reference the original snapshot, preserving what the customer actually purchased.

If a dispute arises about what was ordered, administrators can view the product snapshot that was captured at the time of purchase. This provides authoritative evidence of the product state when the customer placed the order. The snapshot is also useful for sellers to track their own product history and understand when changes were made.

When a product is deleted by the seller or an administrator, all existing snapshots are preserved. The product no longer appears in search or category listings, but the historical snapshots remain available for dispute resolution and records.

### Cancellation and Refund Dispute Resolution Journey

The cancellation and refund dispute journey handles situations where customers are unsatisfied with delivered items or need to cancel unpaid orders. The journey begins when a customer identifies a problem with an order item and decides to request a cancellation or refund.

For cancellation, the customer selects a paid (not yet shipped) order item and submits a cancellation request with a reason. The request enters a pending state. The seller responsible for that item receives notification and reviews the request. The seller can approve or reject the request. When the seller responds, a snapshot of the request state is created capturing the reason and status.

If the seller approves, the item status changes to cancelled and a refund is processed for that item only. The inventory quantity for the variant is restored through an inventory record. The remaining items in the order continue through normal processing.

For refunds, the customer selects a delivered order item and submits a refund request with a reason. The request is only accepted if the item was delivered within the past 7 days. The seller reviews and responds to the request. When responding, a snapshot of the request state is created. If approved, the item status changes to refunded and a refund is processed. Inventory is restored for the refunded variant.

Throughout this journey, both customers and sellers can view the history of their cancellation and refund requests. Administrators have access to view all requests and can intervene by force-cancelling or force-refunding items if necessary.

### Administrator Moderation Journey

The administrator moderation journey covers actions administrators take to maintain platform quality and resolve issues. An administrator discovers a product that violates platform policies through routine monitoring or a customer complaint.

The administrator views the product details and its complete history through product snapshots. The administrator decides to remove the product from the platform and deletes it. The deletion removes the product from search and category listings while preserving all historical snapshots and order records.

Alternatively, an administrator may need to handle a dispute between a customer and seller that could not be resolved. The administrator reviews the order details, product snapshots, cancellation or refund request history, and any other relevant information. The administrator can take corrective action such as force-cancelling items, force-refunding payments, or banning users who violate platform policies.

When handling seller issues, an administrator can suspend a seller whose products or behavior violate policies. Upon suspension, the seller's products are hidden from search and category listings. The seller cannot create new products or edit existing ones. However, the seller can still process existing orders by shipping items and responding to cancellation or refund requests. The administrator can unsuspend the seller when appropriate.

For customer issues, the administrator can ban customers who violate terms of service. Banned customers cannot log in to their accounts. The administrator can unban customers to restore their access.

### Customer Service and Support Journey

The customer service and support journey enables customers to manage their account and get help with issues. A customer contacts support about a problem with a recent order. The support representative (administrator) can look up the customer's account and view all their orders.

The representative reviews the specific order details including product snapshots of what was purchased, seller profile snapshots, shipment tracking information, and any cancellation or refund request history. This comprehensive view helps the representative understand the full context of the customer's issue.

If the issue involves a product that has been edited since the order was placed, the representative can view the product snapshot that was captured at the time of purchase. This confirms what the customer actually ordered and the price they paid. If the issue involves a seller, the representative can view the seller profile snapshot to see what shop name and logo were shown to the customer at purchase time.

The representative can take appropriate action based on the findings. This may include processing refunds, cancelling orders, or escalating to appropriate personnel. All actions taken are logged and snapshots are preserved to maintain an accurate record of what occurred.

For account-related issues such as forgotten passwords, the customer can use the password change functionality after verification. Customers can also delete their accounts if desired, understanding that profile information will be removed but orders and reviews will be preserved.

### Seller Profile Update and Customer Impact Journey

The seller profile update and customer impact journey demonstrates how changes to seller profiles affect existing orders. A seller decides to rebrand and changes their shop name and logo through their seller profile.

When the seller saves changes to their profile, a snapshot is immediately created preserving the previous shop name, description, and logo. This ensures that any orders placed before the rebrand will still show the original shop information that the customer saw at purchase time.

Customers who have previously placed orders can view their order history and see the seller profile snapshot that was captured when they made their purchase. Even though the seller now has a new shop name and logo, the historical record remains accurate.

When customers browse products, they see the current shop name and logo of sellers. New orders will capture snapshots of the updated seller profile. This allows the platform to maintain accurate historical records while also reflecting current information to customers browsing the marketplace.

The seller can view their own profile edit history through snapshots, seeing all previous versions of their shop information. This is useful for the seller to track their branding evolution and for administrators to investigate any disputes about what information was displayed to customers at specific times.

# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

## Payment Gateway Integration

The platform integrates with external payment gateways to process customer payments.

### Payment Request Initiation

When a customer confirms an order, the platform initiates a payment request to the configured payment gateway.

The platform sends order information to the payment gateway including the order total and a unique order reference.

The platform displays the payment interface provided by the external gateway to the customer.

The platform waits for payment confirmation from the gateway before creating the order.

### Payment Response Handling

When the payment gateway returns a success response, the platform creates the order and decrements inventory.

When the payment gateway returns a failure response, the platform displays an error message to the customer and allows retry.

When the payment gateway returns an unclear or timeout response, the platform treats it as a failure and allows retry.

### Payment States

The platform records the payment status for each order attempt.

Successful payments transition to a confirmed state.

Failed payments remain in a pending retry state until successful or cancelled by the customer.

## Third-Party Service Integration

### Service Communication

The platform communicates with third-party services using industry-standard protocols.

All communication with external services follows the security requirements defined by the platform.

### External Service Failures

When a third-party service is unavailable, the platform displays an appropriate error message to users.

The platform implements retry logic for transient failures when contacting external services.

When external service failures persist, the platform prevents affected operations and notifies users.

### Service Availability

The platform periodically checks the availability of integrated third-party services.

Administrators can view the current status of external service integrations.

## OAuth Provider Integration

### External Authentication

The platform supports authentication through approved external OAuth providers.

Customers can link their accounts to one or more OAuth providers.

When a customer uses OAuth authentication, the platform verifies their identity with the provider.

### OAuth Connection Management

Customers can disconnect an OAuth provider from their account.

Disconnecting an OAuth provider removes the link but does not delete the customer's account.

Customers must maintain at least one authentication method (password or connected OAuth provider).

### OAuth Provider Errors

When an OAuth provider returns an authentication failure, the platform informs the customer and offers alternatives.

When an OAuth provider is unavailable, the platform displays a service unavailable message and suggests retry.

## Webhook Integration

### Receiving External Notifications

The platform receives notifications from external services through webhook endpoints.

Each webhook request includes verification to confirm it originated from the expected service.

### Webhook Processing

The platform validates incoming webhook payloads before processing.

Valid webhook payloads trigger appropriate internal actions based on the notification type.

The platform records webhook events for audit and troubleshooting purposes.

### Webhook Acknowledgment

The platform acknowledges received webhooks by responding with the appropriate status code.

Failed webhook processing is logged and can be retried by the external service.

## External Data Exchange

### Data Format

Data exchanged with third-party services uses standard formats.

The platform converts internal data to the format expected by each external service.

The platform parses external responses into the platform's internal representation.

### Data Validation

The platform validates data received from external services before processing.

Invalid or unexpected data from external services is logged and rejected.

The platform handles missing or incomplete data from external services gracefully.

## Integration Configuration

### Administrator Controls

Administrators can configure the endpoints and credentials for integrated external services.

Integration settings are protected and require appropriate permissions to modify.

Changes to integration settings are recorded in the system audit log.

### Environment Separation

The platform supports separate configurations for different environments such as testing and production.

Test environments use sandbox or mock responses from external services when available.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Product Image Upload

## Product Image Upload

Sellers can upload multiple images for their products.
Each product can have up to 10 images attached.
When uploading, the system accepts the image file and assigns it a display order based on upload sequence.
The first uploaded image becomes the main or thumbnail image by default.
Sellers can reorder images to change which image appears as the main image.
Image uploads are validated for supported formats before acceptance.
The system stores the uploaded image and associates it with the originating product.
Image upload changes are included in product snapshots when products are edited.

### Seller Logo Upload

## Seller Logo Upload

Sellers can upload a logo image for their shop profile.
Each seller can have only one logo image.
Uploading a new logo replaces the existing logo.
Logo images must meet format and size requirements.
The logo appears on the seller's profile page and next to their products in listings.
Logo changes create a seller profile snapshot recording the previous state.

### Supported Media Formats

The system accepts image files in common web formats including PNG, JPEG, and WebP.
GIF images are not accepted for product images but may be allowed for specific use cases.
Each uploaded image must not exceed 5 megabytes in file size.
Images are validated for format by examining file content, not just file extension.
Files that fail format validation are rejected with an error message indicating the accepted formats.
Files that exceed size limits are rejected with an error message indicating the maximum allowed size.

### Image Storage

## Image Storage

Uploaded images are stored in the platform's media storage system.
Each image is assigned a unique identifier for retrieval.
Images are associated with their owning entity (product or seller profile).
When a product is deleted, its images remain stored but are no longer linked to any product.
When a seller deletes their account, their logo is removed from storage.
The system does not automatically delete orphaned images; administrators manage storage cleanup.
Image metadata including upload date, owning entity, and display order are stored separately from the image file.

### Image Access Control

## Image Access Control

All product images are publicly accessible to all platform visitors.
Seller logos are publicly accessible to all platform visitors.
Only the owning seller can upload, replace, reorder, or delete images for their own products.
Administrators can view and delete any image on the platform.
Image access does not require authentication for viewing.
Image modification requires the user to be authenticated and authorized for that specific product.

### Image Reordering

## Image Reordering

Sellers can change the display order of images on their products.
Reordering assigns a new position to each image in the sequence.
The image in position one becomes the main or thumbnail image.
Reordering is immediate and reflected in all product listings.
Image reordering does not create a product snapshot; only content changes trigger snapshots.

### Image Deletion

## Image Deletion

Sellers can delete images from their products.
Deleting the main image automatically promotes the next image in sequence to main.
If all images are deleted, the product displays a placeholder image.
Image deletion is permanent and cannot be undone.
Deletion of images is included in the next product snapshot if the product is edited afterward.
Administrators can delete any product image without seller consent.