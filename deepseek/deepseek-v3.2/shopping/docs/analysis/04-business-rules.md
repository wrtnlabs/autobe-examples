**ecommerceMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

All users must register with an email and password to access any platform features. Email addresses must be unique across the entire platform. Password complexity requirements ensure account security. Users can only log in using their registered email and password combination. When changing passwords, users must provide their current password for verification. Account deletion requests are subject to business rules based on user type. Customer account deletion preserves order history but removes profile information. Seller account deletion requires specific conditions including no pending orders or refund requests. Administrators can ban users, which prevents login but preserves data for legal and historical purposes. Suspended sellers cannot create or edit products but can fulfill existing obligations. The system ensures no guest browsing is allowed, requiring authentication for all actions.

### User Registration Requirements

All users must register with an email address and password to access any platform features.

**No Guest Browsing**: The platform does not allow guest browsing or unauthenticated access to any features.

**Registration Fields**: During registration, users must provide:
- A valid email address
- A password meeting the platform's security requirements

**Immediate Authentication**: After successful registration, users are automatically logged in and can access all features appropriate to their user type.

**Error Conditions**:
- If the email address is not in valid format, registration fails
- If the password does not meet complexity requirements, registration fails
- If the email is already registered, registration fails (see Email Uniqueness Constraint)

**Business Justification**: This requirement ensures that all platform activities are traceable to specific users, supporting accountability and security in financial transactions.

### Email Uniqueness Constraint

Each email address can be registered to only one user account on the platform.

**Global Uniqueness**: Email addresses must be unique across all user types (customers, sellers, administrators).

**Registration Validation**: During registration, the system checks if the provided email is already registered.

**Account Recovery Implication**: Because emails are unique, they can be used for password recovery and account identification.

**Email Change Restrictions**: If a user changes their email address, the new email must also be unique across the platform.

**Error Conditions**:
- If a user attempts to register with an email already in use, registration fails
- If a user attempts to change their email to one already registered, the change fails

**Business Impact**: Email uniqueness prevents duplicate accounts, supports accurate user identification, and ensures proper communication channels.

### Password Change Verification

Users can change their password only after verifying their current password.

**Current Password Requirement**: To change password, users must provide their current password for verification.

**Security Validation**: The system verifies the current password matches the stored credentials before allowing a change.

**New Password Requirements**: The new password must meet the same complexity requirements as initial registration passwords.

**Immediate Effect**: Password changes take effect immediately, requiring re-authentication for active sessions.

**Error Conditions**:
- If the current password is incorrect, the password change fails
- If the new password does not meet complexity requirements, the password change fails
- If the new password is the same as the current password, the password change fails

**Security Considerations**: This rule prevents unauthorized password changes and maintains account security.

### Customer Account Deletion Rules

When a customer deletes their account, specific data handling rules apply based on business and legal requirements.

**Profile Information Deletion**: The customer's profile information (display name, phone number) is permanently deleted.

**Order History Preservation**: All orders and order history are preserved for seller records and legal purposes.

**Review Preservation**: The customer's reviews are preserved but displayed as "deleted user".

**Address Deletion**: All shipping addresses associated with the customer are deleted.

**Wishlist and Cart Deletion**: The customer's wishlist and shopping cart contents are deleted.

**Authentication Block**: After deletion, the email and password can no longer be used to log in.

**Irreversible Action**: Account deletion cannot be reversed or undone.

**Business Justification**: This approach balances user privacy (deleting personal information) with business needs (preserving transaction history for records and legal compliance).

### Seller Account Deletion Conditions

Sellers can delete their account only when specific conditions are met to protect customers and preserve transaction history.

**Pre-Deletion Conditions**:
- The seller must have no pending orders (items with "paid" or "shipped" status)
- The seller must have no pending cancellation or refund requests

**Product Deletion**: When a seller deletes their account, all their products are deleted from listings.

**Order History Preservation**: Order history and order snapshots are preserved for customer records and legal purposes.

**Shop Name Preservation**: The seller's shop name in past orders is preserved for historical accuracy.

**Review Impact**: Reviews of the seller's products remain but reference a deleted seller.

**Authentication Block**: After deletion, the seller's email and password can no longer be used to log in.

**Error Conditions**:
- If a seller attempts to delete their account while having pending orders, deletion fails
- If a seller attempts to delete their account while having pending cancellation or refund requests, deletion fails

**Business Protection**: These conditions ensure customers with pending transactions are not left without recourse.

### Administrator Ban Enforcement

Administrators can ban users to prevent platform access while preserving data for historical and legal purposes.

**Ban Effect**: When a user is banned:
- They cannot log in to the platform
- Their existing data (orders, products, reviews) remains visible
- They cannot perform any actions on the platform

**Customer Ban**: Banned customers cannot access their account, view orders, or make purchases.

**Seller Ban**: Banned sellers cannot log in, but their existing products and order processing continue (see Seller Suspension Restrictions for product visibility).

**Ban Reversal**: Administrators can unban users, restoring their access to the platform.

**Authentication Block**: Banned users receive an authentication error when attempting to log in.

**Business Justification**: Banning allows administrators to remove problematic users while maintaining complete transaction records for legal and historical purposes.

### Seller Suspension Restrictions

When a seller is suspended, specific restrictions apply to balance customer protection with order fulfillment obligations.

**Product Visibility**: Suspended sellers' products are hidden from search and category listings.

**Purchase Prevention**: Suspended sellers' products cannot be purchased by customers.

**Order Processing Continuation**: Suspended sellers can still:
- Process existing orders (ship items)
- Respond to cancellation requests
- Respond to refund requests
- Fulfill their obligations for already-placed orders

**Product Management Restrictions**: Suspended sellers cannot:
- Create new products
- Edit existing products
- Add new product variants
- Modify inventory

**Suspension Reversal**: Administrators can unsuspend sellers, making their products visible and purchasable again.

**Business Balance**: This approach protects customers from purchasing from problematic sellers while ensuring existing customers receive their ordered items.

### Mandatory Authentication Policy

All platform features require user authentication. No actions can be performed without a valid login session.

**Universal Requirement**: Every page, feature, and action on the platform requires the user to be logged in.

**No Public Access**: There are no publicly accessible pages or features.

**Session Enforcement**: Users must maintain an active session to perform any action, including:
- Browsing products
- Viewing categories
- Adding items to cart
- Viewing seller profiles
- Reading reviews

**Authentication Errors**: Any attempt to access platform features without authentication results in an authentication error.

**Business Justification**: This policy ensures all platform activities are traceable to specific users, supporting accountability in financial transactions and dispute resolution.

### Account Status Management

User accounts can be in different states, each with specific implications for platform access and capabilities.

**Account Statuses**:
- **Active**: Normal account with full access to appropriate features
- **Banned**: Cannot log in, but data preserved (see Administrator Ban Enforcement)
- **Suspended (sellers only)**: Restricted access (see Seller Suspension Restrictions)
- **Deleted**: Account removed with specific data handling (see Customer/Seller Account Deletion Rules)

**Status Transitions**:
- Active accounts can be banned by administrators
- Active seller accounts can be suspended by administrators
- Banned accounts can be unbanned by administrators
- Suspended seller accounts can be unsuspended by administrators
- Active accounts can be deleted by the user (subject to deletion conditions)

**Status Visibility**: Users can see their own account status in their profile or dashboard.

**Error Conditions**:
- Attempting to perform actions not allowed for current status results in authorization errors
- Attempting to log in with banned status results in authentication errors

**Business Control**: Account status management allows administrators to control user access while maintaining platform integrity and user accountability.

## CustomerProfile Rules

Every customer must have a profile with a display name and phone number. Display names are visible to other users on reviews and public-facing content. Phone numbers are required for shipping notifications and order communications. Customers can edit both their display name and phone number at any time. Profile information is deleted when a customer deletes their account, preserving order history. Display names may have character length restrictions to ensure appropriate visibility. Phone numbers must follow valid international formats for contact purposes. Profile data is separate from account credentials for security purposes. Changes to profile information do not require administrator approval.

### Profile Creation and Display Name Requirements

WHEN a customer creates an account, THE system SHALL create a customer profile with a display name.

WHERE a customer profile exists, THE display name SHALL be visible to other users on public-facing content such as reviews and order history.

WHERE display name is used, THE system SHALL enforce a character length restriction of 2 to 50 characters to ensure appropriate visibility and presentation.

IF the display name field is empty during profile creation or update, THEN the system SHALL reject the request and inform the customer that a display name is required.

WHERE a customer profile exists, THE display name SHALL be editable at any time by the customer who owns the profile.

IF a customer deletes their account, THEN the system SHALL delete the display name from the customer profile as part of account deletion cleanup.

WHEN a review is created, THE system SHALL associate the display name of the customer with that review for public visibility.

### Phone Number Validation and Contact Requirements

WHEN a customer creates a profile, THE system SHALL require a valid phone number for shipping notifications and order communications.

IF a phone number is provided during profile creation or update, THEN the system SHALL validate it follows international phone number format standards.

WHERE phone number validation occurs, THE system SHALL reject phone numbers that:
- Contain non-numeric characters except for the plus sign (+) for country codes
- Have an invalid country code prefix
- Are too short or too long for standard phone number formats
- Do not match known international phone number patterns

IF a customer attempts to submit a profile without a phone number, THEN the system SHALL reject the request and inform the customer that a phone number is required.

WHERE a customer profile exists, THE phone number SHALL be editable at any time by the customer who owns the profile.

IF a customer deletes their account, THEN the system SHALL delete the phone number from the customer profile as part of account deletion cleanup.

WHEN order shipping notifications are sent, THE system SHALL use the customer's phone number as the primary contact method for delivery updates.

### Profile Editing Permissions and Data Separation

WHERE a customer profile exists, ONLY the customer who owns the profile SHALL be able to edit the display name and phone number.

IF a non-owner attempts to edit a customer profile, THEN the system SHALL reject the request and indicate that the profile can only be edited by its owner.

WHERE profile editing occurs, THE system SHALL treat display name and phone number as separate from account credentials for security purposes.

WHEN a customer changes their password, THE system SHALL NOT affect the display name or phone number in the customer profile.

WHEN a customer updates their email address, THE system SHALL NOT affect the display name or phone number in the customer profile.

WHERE profile data is stored, THE system SHALL maintain separation between authentication credentials (email, password) and customer profile information (display name, phone number).

IF a customer requests account deletion, THEN the system SHALL delete the profile data (display name and phone number) while preserving order history for legal and seller record purposes.

### Public Visibility and Contact Information Rules

WHERE customer profile information is displayed publicly, ONLY the display name SHALL be visible to other users.

IF a customer's phone number is involved in public contexts, THEN the system SHALL NOT display the phone number publicly under any circumstances.

WHERE reviews are displayed on product detail pages, THE system SHALL show the reviewer's display name alongside the review content.

IF a customer has deleted their account, THEN the system SHALL display "deleted user" instead of the display name on preserved reviews.

WHERE order history is viewed by sellers, THE system SHALL include the customer's display name for identification purposes.

IF shipping notifications require contact information, THEN the system SHALL use the phone number from the customer profile but SHALL NOT expose it to other users.

WHERE customer profile data is used for contact purposes, THE system SHALL ensure the phone number is only accessible to:
- The system for automated notifications
- The customer who owns the profile
- Administrators for support purposes (when explicitly required)

## Address Rules

Customers can maintain multiple shipping addresses in their account. Each address must include recipient name, phone number, street address, city, state/province, postal code, and country. All address fields are required for a valid shipping destination. Customers can designate one address as their default shipping preference. Addresses can be edited, updated, or deleted by the account owner. Address validation ensures proper formatting for shipping carrier compatibility. When placing an order, customers must select a shipping address or use their default. Addresses are preserved in order history for record-keeping purposes. Deleted addresses are removed from the customer's account but remain in historical orders. Address management is independent of account status changes.

### Multiple Address Management

Customers can maintain multiple shipping addresses in their account to accommodate different shipping needs (home, work, gift recipients). There is no predefined limit on the number of addresses a customer can store. Each address must be complete with all required fields before it can be saved. When a customer attempts to add an address with missing required fields, the request is rejected with an error indicating which fields are missing. Customers can only manage addresses belonging to their own account; they cannot view or edit addresses of other customers. Address management is available regardless of order status—customers can add, edit, or delete addresses even with active orders, though existing order addresses remain unchanged. If a customer's account is banned, they lose the ability to add or edit addresses, but existing addresses remain stored and visible in historical orders. Deleted addresses are permanently removed from the customer's active address book but remain preserved in any historical orders where they were used.

### Address Field Requirements

Every shipping address must include the following fields, all of which are required for a valid shipping destination:

- **Recipient Name**: The full name of the person receiving the package. Must contain at least 2 characters and cannot consist solely of numbers or special characters.
- **Phone Number**: A contact phone number for the recipient. Must be provided in a valid international format that includes country code.
- **Street Address**: The complete street address including building number, street name, and any apartment or suite numbers. Cannot be empty and must include at least a building number and street name.
- **City**: The city or town name. Must be a valid city name and cannot contain numbers or special characters except hyphens and spaces.
- **State/Province**: The state, province, or region. This field must be provided even if the country does not have formal states/provinces (in which case 'N/A' is acceptable).
- **Postal Code**: The postal or ZIP code. Must match the format expected for the specified country.
- **Country**: The country name. Must be selected from a predefined list of supported shipping countries.

If any of these fields are missing or contain invalid data when saving an address, the entire address is rejected with specific error messages indicating which fields need correction. All fields must pass basic format validation before the address can be used for shipping.

### Default Shipping Address Designation

Customers can designate exactly one address as their default shipping address. This default address is automatically selected during checkout unless the customer explicitly chooses a different address. When a customer adds their first address, it is automatically set as the default. If a customer has no default address (e.g., after deleting their previous default), they must designate a new default before proceeding to checkout. Changing the default address does not affect existing orders or historical data—only future orders are impacted. If a customer attempts to delete their default address, they must first designate a different address as the new default, otherwise the deletion request is rejected. The default address is clearly marked in the customer's address book and can be changed at any time. There is no limit to how many times a customer can change their default address designation.

### Address Validation and Format Rules

All address fields undergo validation to ensure shipping carrier compatibility and deliverability:

- **Phone Number Validation**: Phone numbers are validated for basic format correctness (must contain country code and be parsable) but not verified for active service.
- **Postal Code Validation**: Postal codes are validated against country-specific format patterns (e.g., 5 digits for US ZIP codes, 6 alphanumeric characters for Canadian postal codes).
- **Country-State Consistency**: When a country has defined states/provinces, the state field must match a valid state for that country.
- **Street Address Format**: Street addresses must include a building/house number and cannot consist solely of generic terms like 'Home' or 'Office'.
- **Special Character Restrictions**: Certain special characters that could interfere with shipping label generation or carrier systems are prohibited in all address fields.

Address validation occurs both when saving an address and during checkout. If an address fails validation during checkout, the customer must correct the address or select a different valid address before proceeding. Validation errors provide specific guidance on what needs to be corrected. Addresses that pass validation are considered 'shippable' and can be used for order placement.

### Shipping Destination Selection

During checkout, customers must select a shipping address for their order. The checkout process presents the customer's address book with all valid addresses. The default shipping address is pre-selected, but customers can choose any other address from their address book. Customers cannot proceed to payment without selecting a shipping address. If a customer has no saved addresses, they must create a new address during checkout before proceeding. Once an order is placed, the selected shipping address is locked and cannot be changed for that order—this preserves the historical record of where the order was shipped. If a customer edits an address after it has been used in an order, the changes only affect future orders; historical orders continue to show the address as it existed at the time of order placement. During checkout, if a previously saved address fails current validation rules (due to rule changes or carrier requirements), it is marked as 'invalid for shipping' and cannot be selected; the customer must either correct the address or choose a different valid address.

### Address Preservation in Orders

When an order is placed, a complete copy of the selected shipping address is saved with the order record. This preserved address includes all fields (recipient name, phone number, street address, city, state/province, postal code, country) exactly as they existed at the time of order placement. The preserved address is immutable and cannot be modified, even if the customer later edits or deletes the original address from their address book. Historical orders always display the address as it was when the order was shipped, ensuring accurate records for customer service, dispute resolution, and legal compliance. Customers can view the preserved address in their order history, and sellers can view the shipping address for orders containing their products (but only the specific address used for their shipment). Administrators can view preserved addresses for all orders. Address preservation applies regardless of subsequent changes to the customer's account status, address book, or platform validation rules.

### Address Deletion Effects

When a customer deletes an address from their address book:

1. The address is immediately removed from the customer's active address list and is no longer available for selection in future orders.
2. If the deleted address was designated as the default shipping address, the customer must designate a new default address before they can proceed to checkout for future orders.
3. The deletion does NOT affect any historical orders—orders that used the deleted address continue to display the complete address as it existed at order placement.
4. The address is permanently removed from the customer's address book and cannot be recovered through normal customer actions.
5. If a customer attempts to delete their only remaining address, the request is rejected because at least one address is required for future purchases.
6. Address deletion is an irreversible action from the customer's perspective—once deleted, the address cannot be restored unless the customer recreates it manually.
7. Deleted addresses remain in the system's historical records for audit purposes but are not accessible to customers.
8. If a customer's account is deleted, all their addresses are also deleted from the active address book, but addresses preserved in historical orders remain intact.

## SellerProfile Rules

Every approved seller must have a profile with shop name, shop description, and logo image. Shop names must be unique to avoid customer confusion between sellers. Shop descriptions provide information about the seller's business and offerings. Logo images are displayed on product listings and seller profile pages. Sellers can edit their shop name, description, and logo after approval. Each edit creates a snapshot to preserve previous profile states for audit purposes. Customer-facing profile information is captured in order snapshots at purchase time. Shop names in historical orders are preserved even after seller account deletion. Suspended sellers retain their profile but products become hidden from listings. Profile information is publicly visible to customers browsing the platform.

### Shop Name Uniqueness

THE <system> SHALL ensure that each seller's shop name is unique across the platform.

WHEN a seller registers with a shop name, IF the shop name already exists, THEN THE <system> SHALL reject the registration request.

WHEN a seller edits their shop name, IF the new shop name already exists, THEN THE <system> SHALL reject the edit request.

WHEN a seller account is deleted, THE <system> SHALL preserve the shop name in historical order snapshots but SHALL allow the shop name to be reused by other sellers after deletion.

### Profile Edit Snapshot Creation

WHEN a seller edits their profile (shop name, shop description, or logo image), THE <system> SHALL create a snapshot of the profile before the change.

THE snapshot SHALL capture:
- The timestamp when the change was made
- The specific field that was changed (shop name, shop description, or logo image)
- The previous value and the new value
- The seller who made the change

Snapshots SHALL be immutable and cannot be deleted.

Snapshots SHALL be viewable by the seller who owns the profile and by administrators.

### Logo Image Requirements

THE <system> SHALL allow sellers to upload a logo image for their shop.

WHEN uploading a logo image, THE <system> SHALL validate that the file is an image format.

IF the uploaded file is not a valid image format, THEN THE <system> SHALL reject the upload.

THE <system> SHALL display the logo image on the seller's profile page and next to their products in listings.

WHEN a seller changes their logo image, THE <system> SHALL create a snapshot of the change.

IF a seller deletes their logo image, THE <system> SHALL set the logo to a default placeholder image.

### Shop Description Content

THE <system> SHALL allow sellers to provide a shop description that describes their business and offerings.

THE shop description SHALL be displayed on the seller's profile page.

Customers SHALL be able to view the shop description when browsing the seller's profile.

WHEN a seller edits their shop description, THE <system> SHALL create a snapshot of the change.

THE shop description SHALL support rich text formatting if provided by the platform, but IF not supported, THEN THE <system> SHALL accept plain text only.

### Profile Visibility Rules

THE <system> SHALL make seller profiles publicly visible to all customers.

Customers SHALL be able to view:
- Shop name
- Shop description
- Logo image
- Average rating (if available)
- Total number of products listed

Sellers SHALL be able to view their own profile with additional details including approval status and rejection reason if applicable.

Administrators SHALL be able to view all seller profiles with all details including snapshots.

WHEN a seller is suspended, THEIR profile SHALL remain visible but with a "Suspended" status indicator.

WHEN a seller account is deleted, THEIR profile SHALL no longer be publicly visible.

### Historical Preservation in Orders

WHEN an order is placed, THE <system> SHALL capture a snapshot of the seller's profile at the time of purchase.

The order snapshot SHALL include:
- Shop name at purchase time
- Shop description at purchase time
- Logo image at purchase time

THE historical shop name SHALL be preserved in order records even if the seller later changes or deletes their profile.

Customers SHALL see the historical shop name when viewing past orders, not the current shop name.

IF a seller account is deleted, THE <system> SHALL preserve the shop name in all historical order snapshots.

### Suspended Seller Profile Status

WHEN a seller is suspended by an administrator, THE <system> SHALL apply the following rules:

THE seller's profile SHALL remain active and visible with a "Suspended" status indicator.

THE seller's products SHALL be hidden from search results and category listings.

THE seller's products SHALL not be purchasable.

THE seller SHALL be able to continue processing existing orders:
- Ship items that are paid
- Respond to cancellation requests
- Respond to refund requests

THE seller SHALL NOT be able to:
- Create new products
- Edit existing products
- Add new variants to products
- Restock inventory
- Edit their profile

WHEN a seller is unsuspended, THE <system> SHALL restore their products to search results and category listings.

## Category Rules

Categories organize products with a name and description for customer browsing. Categories support one level of nesting with subcategories for better organization. Each category requires both a name and description for proper identification. Category names must be unique within their parent category hierarchy. Administrators exclusively create, edit, and manage all categories and subcategories. Products can be assigned to either main categories or subcategories. Deleting a category makes products within it become uncategorized. Customers can browse all categories and view products within specific categories. Categories provide navigation structure for product discovery and filtering. Subcategories inherit visibility rules from their parent categories.

### Category Hierarchy and Nesting Rules

THE ecommerceMall SHALL organize products into categories with a hierarchical structure.

WHEN creating a category, THE ecommerceMall SHALL allow the category to be designated as either a main category or a subcategory.

WHEN creating a subcategory, THE ecommerceMall SHALL require selection of exactly one parent category from existing main categories.

WHERE categories exist, THE ecommerceMall SHALL enforce a maximum nesting depth of one level (main category → subcategory).

IF an attempt is made to create a subcategory under another subcategory, THEN THE ecommerceMall SHALL reject the request with an appropriate error message.

WHERE a main category is deleted, THE ecommerceMall SHALL automatically delete all its associated subcategories.

WHEN a main category is deleted, THE ecommerceMall SHALL preserve references to deleted subcategories in product assignments for historical accuracy.

### Category Name Uniqueness and Validation

THE ecommerceMall SHALL require every category to have both a name and a description.

WHEN creating or editing a category name, THE ecommerceMall SHALL validate that the name is not empty.

WHERE categories exist within the same hierarchy level, THE ecommerceMall SHALL enforce unique category names.

IF an attempt is made to create a category with a name that already exists at the same hierarchy level under the same parent category, THEN THE ecommerceMall SHALL reject the request.

WHERE a subcategory is being created under a specific parent category, THE ecommerceMall SHALL enforce unique names only within that parent category's subcategories.

WHEN editing a category description, THE ecommerceMall SHALL validate that the description is not empty.

IF a category name exceeds reasonable length limits for display purposes, THEN THE ecommerceMall SHALL reject the request.

### Administrator Category Management

THE ecommerceMall SHALL restrict category creation exclusively to administrators.

WHEN any non-administrator attempts to create a category, THE ecommerceMall SHALL reject the request with a permissions error.

THE ecommerceMall SHALL restrict category editing (name or description) exclusively to administrators.

WHEN any non-administrator attempts to edit a category, THE ecommerceMall SHALL reject the request with a permissions error.

THE ecommerceMall SHALL restrict category deletion exclusively to administrators.

WHEN any non-administrator attempts to delete a category, THE ecommerceMall SHALL reject the request with a permissions error.

WHERE administrators manage categories, THE ecommerceMall SHALL provide them with tools to view all categories and their hierarchical relationships.

IF an administrator attempts to delete a category that contains products, THEN THE ecommerceMall SHALL proceed with deletion but preserve product references as uncategorized.

### Product Assignment and Category Relationship

THE ecommerceMall SHALL require every product to be assigned to exactly one category.

WHEN creating a product, THE ecommerceMall SHALL require selection of either a main category or a subcategory.

WHERE a product is assigned to a subcategory, THE ecommerceMall SHALL treat it as being within that subcategory's parent hierarchy for browsing purposes.

IF a category is deleted, THEN THE ecommerceMall SHALL automatically update all products assigned to that category (or its subcategories) to become uncategorized.

WHEN a product becomes uncategorized due to category deletion, THE ecommerceMall SHALL preserve the product's historical category assignment in order snapshots.

WHERE products exist, THE ecommerceMall SHALL allow filtering and searching by their assigned category.

WHEN browsing products by category, THE ecommerceMall SHALL include products from subcategories within the selected category hierarchy.

### Category Deletion Business Rules

THE ecommerceMall SHALL allow administrators to delete any category.

WHEN deleting a main category, THE ecommerceMall SHALL automatically delete all its associated subcategories.

IF a category (main or subcategory) contains products, THEN THE ecommerceMall SHALL proceed with deletion but change those products to uncategorized status.

WHERE a category is deleted, THE ecommerceMall SHALL remove it from all customer browsing interfaces.

WHEN a category is deleted, THE ecommerceMall SHALL preserve its name and description in historical references (order snapshots, product history).

IF an attempt is made to delete a category that does not exist, THEN THE ecommerceMall SHALL reject the request with an appropriate error message.

WHERE category deletion affects product organization, THE ecommerceMall SHALL update product listings to reflect uncategorized status without requiring product re-editing.

### Customer Browsing Structure

THE ecommerceMall SHALL allow customers to browse the complete list of all categories.

WHEN customers browse categories, THE ecommerceMall SHALL display categories in a hierarchical structure showing main categories and their subcategories.

WHERE categories exist, THE ecommerceMall SHALL allow customers to view products within any specific category.

WHEN customers select a main category, THE ecommerceMall SHALL display products from that category and all its subcategories.

WHERE customers browse by category, THE ecommerceMall SHALL apply the same product filtering and sorting options available in general search.

IF a category has no products (and its subcategories have no products), THEN THE ecommerceMall SHALL still display the category in browsing lists but indicate it contains no products.

WHEN customers browse uncategorized products, THE ecommerceMall SHALL group them separately from categorized products.

WHERE customer browsing occurs, THE ecommerceMall SHALL maintain consistent category hierarchy display across all browsing interfaces.

## Product Rules

Products require a name, description, category, and base price to be created. Product names must clearly identify the item for customer recognition. Descriptions provide detailed information about product features and specifications. Category assignment ensures products appear in appropriate browsing sections. Base price serves as the default price when variants don't override it. Products belong exclusively to the seller who created them for ownership purposes. Product edits create snapshots preserving previous states for audit trails. Products must have at least one variant to be purchasable by customers. Products without variants are visible but marked as unavailable for purchase. Product deletion requires no pending orders, cancellations, or refund requests. Deleted products are removed from listings but snapshots remain for records.

### Product Creation Requirements

### Product Creation Requirements

**THE system SHALL allow sellers to create products only when they have an approved seller account status (approved).**

**WHEN a seller creates a product, THE system SHALL require the following fields:**
- Name: required text field that identifies the product to customers
- Description: required text field that provides detailed information about the product
- Category: required selection from existing categories and subcategories managed by administrators
- Base price: required numeric value representing the default price of the product

**THE system SHALL assign ownership of the created product exclusively to the seller who created it.**

**IF a seller attempts to create a product without providing any of the required fields, THEN THE system SHALL reject the creation request and inform the seller which fields are missing.**

**IF a seller attempts to select a category that does not exist or is not accessible, THEN THE system SHALL reject the creation request and inform the seller of the invalid category selection.**

**IF a seller attempts to set a base price that is zero, negative, or exceeds reasonable monetary limits, THEN THE system SHALL reject the creation request and inform the seller of the invalid price.**

**THE system SHALL automatically record the creation timestamp and creator information when a product is successfully created.**

### Ownership Assignment Rules

### Ownership Assignment Rules

**THE system SHALL automatically assign ownership of a product to the seller who created it at the moment of creation.**

**THE system SHALL prevent transfer of product ownership between sellers.**

**THE system SHALL ensure that only the owning seller can perform the following actions on their products:**
- Edit product name, description, category, or base price
- Upload, reorder, or delete product images
- Create, edit, or delete product variants
- Manage inventory for product variants
- View product snapshots and inventory history

**THE system SHALL allow administrators to view and delete products owned by any seller for policy enforcement purposes.**

**THE system SHALL maintain immutable product ownership records that cannot be altered or reassigned after creation.**

**IF a seller account is deleted, THEN THE system SHALL delete all products owned by that seller, provided deletion constraints are met (no pending orders, cancellations, or refunds).**

**WHEN viewing a product, THE system SHALL always display the shop name of the owning seller to identify product origin.**

### Edit Snapshot Creation

### Edit Snapshot Creation

**WHEN a seller edits any field of an existing product, THE system SHALL automatically create a product snapshot.**

**THE product snapshot SHALL include the complete state of the product at the moment before the edit, including:**
- Product name, description, category, and base price
- All product images with their display order
- All product variants with their SKU codes, option values, prices, and stock quantities

**THE system SHALL record the following metadata with each product snapshot:**
- Timestamp of when the change was made
- Identification of what was changed (specific fields modified)
- Values before and after the change
- User who made the edit (seller or administrator)

**THE system SHALL make product snapshots immutable and prevent their deletion.**

**THE system SHALL allow sellers to view snapshots of their own products for audit and dispute resolution purposes.**

**THE system SHALL allow administrators to view snapshots of any product on the platform for oversight and enforcement purposes.**

**THE system SHALL preserve product snapshots even after the product is deleted, maintaining a complete audit trail.**

**WHEN a seller edits product images (adds, reorders, or deletes), THE system SHALL include these image changes in the product snapshot.**

**THE system SHALL link each product snapshot to the specific product version it represents, creating a chronological history of changes.**

### Purchasability Variant Requirement

### Purchasability Variant Requirement

**THE system SHALL require a product to have at least one variant to be purchasable by customers.**

**WHEN a product has no variants, THE system SHALL mark it as "unavailable" in all customer-facing interfaces, including:**
- Search results
- Category browsing pages
- Product detail pages

**THE system SHALL prevent customers from adding unavailable products (products with no variants) to their shopping carts.**

**THE system SHALL prevent checkout of unavailable products during the checkout process.**

**THE system SHALL display unavailable products in search and category listings with appropriate visual indicators that they cannot be purchased.**

**THE system SHALL allow sellers to create products without variants initially, enabling them to set up product information before creating specific variants.**

**THE system SHALL update product availability status automatically whenever:**
- A variant is added to a product with no variants (product becomes purchasable)
- The last variant of a product is deleted (product becomes unavailable)
- All variants of a product become out of stock (product remains purchasable but variants show out of stock)

**THE system SHALL differentiate between "unavailable due to no variants" and "out of stock" when displaying product status to customers.**

### Product Deletion Constraints

### Product Deletion Constraints

**THE system SHALL allow sellers to delete their own products only if all of the following conditions are met:**
1. No pending order items exist for any variant of the product (items with status "paid" or "shipped")
2. No pending cancellation or refund requests exist for any variant of the product
3. The seller has an active account (not suspended or banned)

**IF a seller attempts to delete a product with pending orders, cancellations, or refunds, THEN THE system SHALL reject the deletion request and inform the seller which constraints are not met.**

**WHEN a seller successfully deletes a product, THE system SHALL:**
- Remove the product from all search results and category listings
- Delete all variants and inventory records associated with the product
- Preserve all product snapshots created before deletion
- Automatically remove the product from all customer wishlists
- Update the product status to "deleted" while maintaining the record for historical purposes

**THE system SHALL allow administrators to delete any product regardless of deletion constraints for policy enforcement purposes.**

**THE system SHALL preserve order item snapshots that reference deleted products, ensuring past orders remain complete and accurate.**

**THE system SHALL prevent sellers from creating new products with the same name as a deleted product without explicit administrative approval.**

**THE system SHALL maintain a record of product deletions including who deleted it, when, and the reason if provided by an administrator.**

### Base Price Default Role

### Base Price Default Role

**THE system SHALL define the product base price as the default price that applies to all variants unless a variant-specific price is set.**

**WHEN a variant does not have a specific price defined, THE system SHALL use the product base price as that variant's price.**

**WHEN a variant has a specific price defined, THE system SHALL use the variant-specific price instead of the base price for that variant.**

**THE system SHALL calculate price ranges for products with multiple variants as follows:**
- If all variants use the base price: show single price (base price)
- If variants have different prices: show range from lowest to highest variant price
- If some variants use base price and others have specific prices: include base price in the range calculation

**THE system SHALL display the base price prominently on product creation and editing interfaces to inform sellers of its default role.**

**THE system SHALL validate that the base price is a positive numeric value greater than zero at product creation and during edits.**

**THE system SHALL preserve the base price in product snapshots when the product is edited, maintaining historical price records.**

**THE system SHALL use the base price for all pricing calculations when no variant-specific prices exist, ensuring consistent pricing logic.**

**THE system SHALL allow sellers to update the base price, which automatically updates the price of all variants that don't have specific prices defined.**

### Category Assignment Validation

### Category Assignment Validation

**THE system SHALL require every product to be assigned to a valid category during creation.**

**THE system SHALL allow products to be assigned to either main categories or subcategories (one level of nesting only).**

**WHEN assigning a product to a category, THE system SHALL validate that:**
1. The category exists and is active (not deleted)
2. The category is accessible to the seller (not restricted)
3. If assigning to a subcategory, the parent main category exists and is active

**IF a seller attempts to assign a product to a non-existent or deleted category, THEN THE system SHALL reject the assignment and inform the seller of the invalid category.**

**THE system SHALL automatically assign products to the "uncategorized" state when their assigned category is deleted by an administrator.**

**THE system SHALL prevent products from being assigned to more than one category at a time.**

**THE system SHALL include category assignment in product snapshots when the category is changed, preserving the historical category trail.**

**THE system SHALL use category assignment for product organization in:**
- Category browsing pages
- Search filtering by category
- Product recommendations by category
- Seller dashboard organization by product category

**THE system SHALL validate category assignments during product edits, ensuring products are not left without a valid category.**

**THE system SHALL allow administrators to reassign products to different categories for organizational or policy compliance purposes.**

## ProductImage Rules

Sellers can upload multiple images for each product to showcase items. The first image in sequence serves as the main thumbnail for product listings. Images can be reordered to control display priority and visual presentation. Sellers can delete images from products while maintaining other media. Image changes are captured in product snapshots for historical tracking. Image management is restricted to product owners for security and control. Product images must meet format and size requirements for platform compatibility. Images enhance product presentation across search results and detail pages. The main thumbnail appears in search results, category listings, and wishlists. Deleted images are removed from product displays but preserved in snapshots.

### Multiple Image Uploads

THE system SHALL allow sellers to upload multiple images for each product.

WHEN a seller uploads an image for a product, THE system SHALL associate the image with that specific product.

WHERE product images are managed, THE system SHALL maintain the display order of images as specified by the seller.

### Thumbnail Designation Rules

WHEN a product has one or more images, THE system SHALL designate the first image in display order as the main thumbnail image.

WHEN the display order of product images changes, THE system SHALL designate the new first image as the main thumbnail image.

THE system SHALL use the main thumbnail image for product listings in search results, category pages, and wishlists.

### Image Reordering Permissions

WHEN a seller requests to reorder product images, THE system SHALL update the display order of images for that product.

IF the seller is not the owner of the product, THEN THE system SHALL reject the reordering request.

WHEN image reordering occurs, THE system SHALL create a product snapshot that includes the image order changes.

### Image Deletion Effects

WHEN a seller deletes an image from a product, THE system SHALL remove that image from product displays.

WHEN an image is deleted, THE system SHALL preserve the image information in product snapshots.

IF a product image is deleted and it was the main thumbnail image, THEN THE system SHALL designate the next image in display order as the new main thumbnail image.

IF a product has no remaining images after deletion, THEN THE system SHALL indicate that the product has no images in displays.

### Snapshot Inclusion of Images

WHEN any product image change occurs (upload, reorder, or deletion), THE system SHALL include the image changes in the product snapshot.

THE product snapshot SHALL record the complete state of all product images at the time of the snapshot, including display order and which image is designated as the main thumbnail.

WHERE product snapshots are viewed, THE system SHALL display the image state as it existed at the time of the snapshot.

### Image Format Requirements

THE system SHALL accept product images that meet platform-compatible format and size requirements.

WHEN a seller attempts to upload an image that does not meet format or size requirements, THEN THE system SHALL reject the upload with an appropriate error message.

WHERE product images are displayed, THE system SHALL ensure images are rendered correctly according to platform display capabilities.

### Owner-Based Image Management

WHEN a user attempts to manage product images (upload, reorder, or delete), THE system SHALL verify that the user is the seller who owns the product.

IF the user is not the product owner, THEN THE system SHALL reject all image management requests for that product.

WHERE product images are accessed, THE system SHALL restrict management operations to the product owner only.

## ProductVariant Rules

Variants represent specific combinations of product options like color and size. Each variant requires a unique SKU code for inventory identification. Option values define the specific attributes that distinguish each variant. Variants can have custom prices that override the product's base price. Stock quantity starts at zero and must be managed through inventory records. Variants are required for products to be purchasable by customers. Variant edits create snapshots preserving previous configurations and prices. Variant deletion requires no pending orders, cancellations, or refund requests. Out-of-stock variants cannot be added to shopping carts by customers. Variant-specific pricing allows for different prices based on options. Variants share the same product images but have distinct inventory tracking.

### SKU Code Identification and Uniqueness

### SKU Code Identification and Uniqueness

THE system shall require a unique SKU code for each product variant.

WHEN a seller creates a new variant, THE system shall reject the creation if the SKU code is not provided.

WHEN a seller creates or edits a variant, THE system shall reject the request if the SKU code matches an existing variant's SKU code (including variants of other products).

WHEN a seller attempts to edit a variant's SKU code to match an existing variant, THE system shall reject the edit request.

IF a variant's SKU code is not unique, THEN THE system shall reject the operation with an error indicating the SKU code is already in use.

THE system shall preserve the SKU code in all snapshots when a variant is edited, ensuring historical tracking of each variant's unique identifier.

WHERE variant snapshots are created, THE system shall include the SKU code as part of the immutable snapshot data.

### Option Value Definitions

### Option Value Definitions

THE system shall require option values for each variant to define the specific combination of product attributes.

WHEN a seller creates a variant, THE system shall require at least one option value to be specified (e.g., color, size, material).

WHEN a seller creates multiple variants for the same product, THE system shall ensure each variant has a distinct combination of option values.

WHEN a seller attempts to create a variant with identical option values to an existing variant for the same product, THE system shall reject the creation request.

THE system shall store option values in a structured format that preserves the attribute name and value (e.g., "color: Red", "size: Large").

WHERE option values are displayed to customers, THE system shall present them in a human-readable format.

WHEN a variant is edited and its option values change, THE system shall create a snapshot preserving both the previous and new option values.

### Variant Price Override Rules

### Variant Price Override Rules

THE system shall allow variants to have custom prices that override the product's base price.

WHEN a variant has no custom price specified, THE system shall use the product's base price for that variant.

WHEN a variant has a custom price specified, THE system shall use that price instead of the product's base price.

WHEN a product's base price is changed, THE system shall NOT automatically update the prices of variants that have custom prices.

WHERE a variant has a custom price, THE system shall display that price to customers instead of the product's base price.

WHEN a seller edits a variant's price, THE system shall create a snapshot preserving both the previous and new price values.

IF a seller attempts to set a variant price to zero or a negative value, THEN THE system shall reject the request with an error indicating the price must be positive.

### Stock Quantity Management

### Stock Quantity Management

THE system shall initialize the stock quantity of new variants to zero.

WHEN a seller creates a variant, THE system shall set its stock quantity to zero, requiring explicit inventory management actions.

THE system shall calculate current stock quantity by summing all inventory records for that variant.

WHEN stock reaches zero, THE system shall mark the variant as "out of stock" and prevent customers from adding it to their cart.

WHEN an order is placed for a variant, THE system shall automatically create a negative inventory record reducing the stock quantity.

WHEN an order item is cancelled or refunded, THE system shall automatically create a positive inventory record restoring the stock quantity.

WHERE sellers manually adjust inventory, THE system shall require a reason for the adjustment and create an inventory record with the quantity change.

IF a seller attempts to set stock quantity directly without using inventory records, THEN THE system shall reject the operation.

### Variant Deletion Constraints

### Variant Deletion Constraints

THE system shall prevent deletion of variants that have pending order items with status "paid" or "shipped".

WHEN a seller attempts to delete a variant, THE system shall check if any order items for that variant have status "paid" or "shipped".

IF the variant has order items with status "paid" or "shipped", THEN THE system shall reject the deletion request.

THE system shall prevent deletion of variants that have pending cancellation or refund requests.

WHEN a seller attempts to delete a variant, THE system shall check if any cancellation or refund requests are pending for that variant.

IF the variant has pending cancellation or refund requests, THEN THE system shall reject the deletion request.

WHERE a variant meets all deletion criteria, THE system shall allow the seller to delete it, which also deletes all associated inventory records.

WHEN a variant is deleted, THE system shall remove it from product listings and search results, but preserve all historical snapshots and order item associations.

### Purchasability Requirements

### Purchasability Requirements

THE system shall require a product to have at least one variant to be purchasable.

WHEN a product has no variants, THE system shall display it as "unavailable" in search results and category listings.

WHEN a product has at least one variant with positive stock quantity, THE system shall allow customers to purchase that product.

WHERE a product has multiple variants, THE system shall require customers to select a specific variant before adding to cart.

WHEN a product's last variant is deleted, THE system shall automatically mark the product as "unavailable" for purchase.

IF a customer attempts to add a product with no variants to their cart, THEN THE system shall prevent the action and show an "unavailable" message.

THE system shall prevent checkout of products that have become unavailable since being added to the cart.

### Out-of-Stock Cart Restrictions

### Out-of-Stock Cart Restrictions

THE system shall prevent customers from adding out-of-stock variants to their shopping cart.

WHEN a customer attempts to add a variant to their cart, THE system shall check if the variant has positive stock quantity.

IF the variant has zero stock quantity, THEN THE system shall reject the addition to cart with an error indicating the item is out of stock.

THE system shall warn customers when cart items have insufficient stock.

WHILE a variant in the cart has stock quantity less than the cart quantity, THE system shall display a warning to the customer.

WHEN a variant becomes out of stock while in a customer's cart, THE system shall mark that cart item as "unavailable".

WHERE cart items are marked as unavailable, THE system shall prevent those items from being checked out.

IF a customer attempts to check out with unavailable items in their cart, THEN THE system shall reject the checkout and require removal of unavailable items.

THE system shall automatically remove deleted variants from customer shopping carts.

## InventoryRecord Rules

Inventory records track all quantity changes for product variants. Positive quantity changes represent restocking or returns to inventory. Negative quantity changes represent sales, adjustments, or inventory losses. Each record includes a reason explaining the inventory change purpose. Current stock is calculated by summing all inventory record quantities. Order placement automatically creates negative inventory records for purchased items. Cancellations and refunds create positive inventory records restoring stock. Sellers can manually add inventory with specified quantities and reasons. Sellers can subtract inventory for adjustments with documented reasons. Inventory history provides complete audit trail for stock management. Stock reaching zero marks variants as out of stock for customers. Inventory records cannot be modified or deleted once created.

### Quantity Change Tracking

Quantity changes in inventory records represent stock adjustments with specific direction and magnitude.

- Positive quantity changes represent additions to inventory (restocking, returns, cancellations, refunds).
- Negative quantity changes represent reductions from inventory (sales, adjustments, losses).
- Zero quantity changes are not permitted; inventory records must have non-zero values.
- Each quantity change is recorded as an integer value representing the number of units.
- The magnitude of the change (absolute value) must be a positive integer (1 or greater).
- Inventory records are created for every stock movement, providing complete historical tracking.
- Quantity changes cannot be modified after the inventory record is created.
- Each inventory record includes a timestamp of when the quantity change occurred.

### Stock Calculation Method

Current stock quantity for each variant is calculated by aggregating all inventory record changes.

- Stock calculation formula: current stock = sum(quantity_change) of all inventory records for the variant.
- The calculation includes all historical records from variant creation to present.
- Stock calculations are performed in real-time when inventory records are added or modified.
- The system maintains a cached current stock value for performance but recalculates as needed for accuracy.
- Stock calculations consider both positive (additions) and negative (deductions) quantity changes.
- Deleted or voided inventory records are excluded from stock calculations.
- When a variant is first created, its initial stock quantity is zero until inventory is added.
- The stock calculation method ensures that inventory totals are always mathematically accurate based on recorded transactions.

### Automatic Order Inventory Deduction

Order placement automatically reduces inventory through negative inventory records.

- When a customer successfully places an order, inventory is automatically deducted for each purchased variant.
- The quantity deducted equals the quantity purchased for each order item.
- The deduction occurs as a negative quantity change in an inventory record.
- The reason field for order-related deductions is "order purchase".
- Deduction happens after payment is confirmed and the order is created.
- If payment fails, no inventory deduction occurs.
- If an order contains multiple items from the same variant, the total quantity for that variant is deducted in a single inventory record.
- The timestamp of the inventory record matches the order placement time.
- Inventory deductions for orders are irreversible through the normal order process; only cancellations or refunds can restore stock.

### Cancellation Stock Restoration

Cancelled order items restore inventory through positive inventory records.

- When a cancellation request is approved, the cancelled item's quantity is restored to inventory.
- Restoration occurs as a positive quantity change in an inventory record.
- The reason field for cancellation restorations is "cancellation approval".
- Restoration happens immediately when the seller approves the cancellation request.
- The restored quantity equals the quantity originally purchased for that order item.
- If multiple items of the same variant are cancelled, each cancellation creates a separate inventory record.
- Stock restoration occurs regardless of whether a refund is processed.
- The timestamp of the inventory record matches the cancellation approval time.
- Cancelled items that were already shipped cannot be restored to inventory.

### Manual Inventory Adjustments

Sellers can manually adjust inventory quantities through explicit addition or subtraction.

- Sellers can add inventory (restock) by specifying a positive quantity and reason.
- Sellers can subtract inventory (adjustment/loss) by specifying a negative quantity and reason.
- Manual adjustments require a reason to be specified explaining the inventory change.
- The reason must be descriptive enough to understand the purpose of the adjustment.
- Adjustments can be made at any time, regardless of variant availability status.
- Large adjustments (exceeding typical restocking amounts) may require additional verification.
- Manual adjustments cannot result in negative current stock (stock cannot go below zero through subtraction).
- Sellers can only adjust inventory for their own products' variants.
- Manual adjustments are recorded as inventory records with the seller as the responsible party.

### Inventory Audit Trail

Inventory records provide a complete, immutable audit trail for stock management.

- Every inventory record is preserved indefinitely and cannot be modified or deleted.
- Each record includes: quantity change (positive or negative), reason for change, timestamp, and responsible party.
- The audit trail shows the complete history of stock movements for each variant.
- Sellers can view the full inventory history for each of their variants.
- The history is displayed chronologically, showing all additions and deductions.
- Inventory records cannot be altered to prevent tampering with stock history.
- The audit trail provides accountability for all stock movements, including automatic and manual changes.
- In case of discrepancies, the inventory audit trail serves as the authoritative source for stock reconciliation.
- The audit trail supports financial reporting, inventory analysis, and dispute resolution.

### Out-of-Stock Determination

Variants are considered out of stock when current stock reaches zero.

- Out-of-stock status is determined by calculating current stock: if sum(quantity_change) = 0, the variant is out of stock.
- When a variant becomes out of stock, it is marked as unavailable for purchase.
- Out-of-stock variants cannot be added to shopping carts.
- Out-of-stock variants appear in search results but are marked as "out of stock".
- The system continuously monitors stock levels and updates availability status in real-time.
- A variant with positive stock (greater than zero) is considered in stock and available.
- Out-of-stock determination is automatic and requires no manual intervention.
- When inventory is added to an out-of-stock variant (making stock > 0), it automatically becomes available again.
- Out-of-stock status is calculated independently for each variant, regardless of other variants of the same product.

## Wishlist Rules

Customers can add products to their personal wishlist for future reference. Wishlists track products at the product level, not specific variants. Customers can view their wishlist with pagination for browsing convenience. Products can be removed from the wishlist by the account owner. Wishlists are private to each customer and not publicly visible. When sellers delete products, those items are automatically removed from all wishlists. Wishlists help customers track items they're interested in purchasing later. Products in wishlists show current availability and pricing information. Wishlist management is independent of shopping cart contents. Customers cannot add unavailable or deleted products to wishlists.

### Wishlist Item Tracking at Product Level

THE ecommerceMall SHALL track wishlist items at the product level, not at the variant level.
WHEN a customer adds a product to their wishlist, THE ecommerceMall SHALL create a wishlist entry that references the product.
THE ecommerceMall SHALL NOT allow adding specific product variants to wishlists.
WHERE a product has multiple variants, THE ecommerceMall SHALL display the product with its variants in the wishlist view.
IF a customer attempts to add a variant to a wishlist, THEN THE ecommerceMall SHALL reject the request.
THE ecommerceMall SHALL display product-level availability information in wishlist views based on whether at least one variant of the product has stock.

### Wishlist Pagination Rules

THE ecommerceMall SHALL paginate wishlist views when the number of items exceeds the page size.
WHEN customers view their wishlist, THE ecommerceMall SHALL display items in pages.
THE ecommerceMall SHALL provide navigation controls to move between wishlist pages.
WHILE customers browse their wishlist, THE ecommerceMall SHALL maintain consistent pagination state.
WHERE wishlist pagination is implemented, THE ecommerceMall SHALL include page numbers and total count information.
IF a product is removed from the wishlist during pagination, THEN THE ecommerceMall SHALL adjust the pagination display accordingly.

### Wishlist Privacy and Visibility Rules

THE ecommerceMall SHALL keep wishlists private to each customer account.
WHEN a customer views their wishlist, THE ecommerceMall SHALL display only their own wishlist items.
THE ecommerceMall SHALL NOT allow customers to view other customers' wishlists.
WHERE wishlist data is accessed, THE ecommerceMall SHALL enforce data isolation between customers.
IF a customer attempts to access another customer's wishlist, THEN THE ecommerceMall SHALL reject the request.
THE ecommerceMall SHALL NOT make wishlists publicly visible or searchable.

### Automatic Wishlist Cleanup Rules

WHEN a seller deletes a product from the platform, THE ecommerceMall SHALL automatically remove that product from all wishlists.
WHEN a product becomes permanently unavailable (deleted by seller or administrator), THE ecommerceMall SHALL remove it from wishlists within 24 hours.
THE ecommerceMall SHALL notify customers when products are automatically removed from their wishlists due to deletion.
WHERE product deletion occurs, THE ecommerceMall SHALL clean up all wishlist entries referencing that product.
IF a deleted product is restored, THEN THE ecommerceMall SHALL NOT automatically re-add it to wishlists.
THE ecommerceMall SHALL maintain a record of automatic wishlist removals for audit purposes.

### Wishlist Management Permissions

THE ecommerceMall SHALL allow only the account owner to manage their wishlist.
WHEN managing wishlist items, THE ecommerceMall SHALL verify the customer's identity.
THE ecommerceMall SHALL permit customers to add products to their own wishlist.
THE ecommerceMall SHALL permit customers to remove products from their own wishlist.
WHERE wishlist operations are requested, THE ecommerceMall SHALL validate that the requesting customer owns the wishlist.
IF a non-owner attempts to modify a wishlist, THEN THE ecommerceMall SHALL reject the request.

### Product Availability Display in Wishlist

THE ecommerceMall SHALL display current product availability status in wishlist views.
WHEN customers view their wishlist, THE ecommerceMall SHALL show whether each product is currently available for purchase.
THE ecommerceMall SHALL indicate if a product in the wishlist has no available variants (out of stock).
WHERE product availability changes, THE ecommerceMall SHALL update wishlist display accordingly.
IF a product becomes unavailable while in a customer's wishlist, THEN THE ecommerceMall SHALL mark it as unavailable but keep it in the wishlist.
THE ecommerceMall SHALL NOT automatically remove unavailable products from wishlists (except for product deletion).

### Product Deletion and Wishlist Synchronization

THE ecommerceMall SHALL synchronize product deletions with wishlist data.
WHEN a product deletion is processed, THE ecommerceMall SHALL identify all wishlist entries referencing that product.
THE ecommerceMall SHALL remove wishlist entries for deleted products as part of the deletion transaction.
WHERE product deletion occurs, THE ecommerceMall SHALL ensure no orphaned wishlist entries remain.
IF a product deletion fails, THEN THE ecommerceMall SHALL not modify wishlist entries.
THE ecommerceMall SHALL handle product deletion and wishlist cleanup as an atomic operation.

## ShoppingCart Rules

Shopping carts hold items customers intend to purchase during checkout. Carts are customer-specific and persist across browsing sessions. Cart contents are private and only visible to the account owner. Customers add specific variants to carts with desired quantities. When the same variant is added multiple times, quantities combine. Cart items show product names, variant options, prices, and subtotals. Customers can adjust quantities or remove items from their cart. Carts display total price calculations for all included items. Stock availability warnings appear when cart quantities exceed inventory. Unavailable or deleted items are marked as such within the cart. Carts must be emptied of unavailable items before proceeding to checkout.

### Cart Persistence and Customer Association

1. Each shopping cart is uniquely associated with a single customer account.
2. Shopping carts persist across browsing sessions—customers can add items, log out, and later return to find their cart contents unchanged.
3. Only the owner of a customer account can view or modify their own shopping cart.
4. A customer cannot have multiple active shopping carts; all cart items are stored within their single cart.
5. If a customer deletes their account, their shopping cart and all items within it are permanently deleted.
6. Guests (non-registered users) cannot create or use shopping carts; registration is required to add items to a cart.

### Variant-Specific Cart Additions

1. Customers can only add specific product variants to their cart, not generic products.
2. When adding a variant to cart, the customer must specify the quantity they wish to purchase.
3. The cart stores the exact variant SKU code, not just the product ID.
4. If a variant is out of stock (stock quantity = 0), it cannot be added to the cart.
5. If a variant becomes unavailable (deleted or out of stock) after being added to cart, it remains in the cart but is marked as unavailable.
6. The price displayed in the cart is the variant-specific price (if defined) or the product base price (if no variant-specific price is set).
7. Cart items preserve the price at the time they were added; subsequent price changes to the product or variant do not affect items already in the cart.

### Quantity Combination Rules

1. When a customer adds a variant that is already present in their cart, the system combines the quantities rather than creating a separate line item.
2. The combined quantity is the sum of the existing cart quantity plus the newly added quantity.
3. If combining quantities would exceed the variant's available stock, the system prevents the addition and informs the customer of the stock limit.
4. Customers can manually adjust the quantity of any variant in their cart through the cart interface.
5. If a customer reduces a variant's quantity to zero, that variant is removed from the cart entirely.
6. The cart displays the current combined quantity for each variant on a single line, not multiple duplicate entries.

### Cart Item Visibility and Privacy

1. Shopping cart contents are private and visible only to the account owner.
2. Sellers cannot see which customers have added their products to shopping carts.
3. Administrators cannot view the contents of individual customer shopping carts.
4. Cart items display:
   - Product name
   - Variant options (color, size, etc.)
   - Price per unit
   - Quantity
   - Subtotal (price × quantity)
5. The cart shows a running total of all items' subtotals.
6. Customers can view their cart at any time through the cart interface.

### Stock Availability Warnings and Validation

1. When a customer views their cart, the system checks current stock quantities for all variants in the cart.
2. If a cart quantity exceeds the variant's available stock, the system displays a warning indicating the maximum available quantity.
3. The warning shows: "Only X of this item are available. Please reduce your quantity to proceed."
4. Cart items with insufficient stock are highlighted visually to draw attention.
5. Customers cannot proceed to checkout while any cart item exceeds available stock.
6. The system validates stock availability in real-time when customers adjust cart quantities.
7. If stock decreases while items are in the cart (due to other purchases), the system updates warnings accordingly.

### Unavailable Item Handling

1. If a variant is deleted by the seller while in a customer's cart, the cart item is marked as "unavailable."
2. Unavailable items remain in the cart but cannot be purchased.
3. Unavailable items display a clear indicator (e.g., "This item is no longer available") instead of normal product information.
4. Customers cannot adjust the quantity of unavailable items.
5. Unavailable items are excluded from the cart's total price calculation.
6. Customers must remove unavailable items from their cart before proceeding to checkout.
7. The system automatically removes unavailable items when:
   - A customer attempts to checkout (preventing checkout until removed)
   - The customer manually removes them
8. If a product variant is suspended (due to seller suspension), items in carts are treated as unavailable.

### Checkout Preparation Requirements

1. Before proceeding to checkout, the cart must contain at least one available item.
2. All items in the cart must have sufficient stock availability (cart quantity ≤ available stock).
3. The cart must not contain any unavailable items (deleted, out of stock, or suspended).
4. Customers must have at least one valid shipping address on file to proceed to checkout.
5. During checkout preparation, the system:
   - Validates all cart items are still available and in stock
   - Locks the prices of all items to prevent changes during checkout
   - Calculates the final total price
   - Presents the order summary for review
6. If any validation fails during checkout preparation, the customer is returned to the cart with appropriate error messages.
7. Once checkout begins, cart items are reserved (stock is temporarily deducted) to prevent other customers from purchasing the same items.
8. If checkout is abandoned or payment fails, reserved stock is restored to inventory.
9. After successful payment, all items are removed from the cart and transferred to the order.

## CartItem Rules

Cart items represent specific product variants selected for purchase. Each cart item includes the variant SKU and requested quantity. Quantity must be a positive whole number greater than zero. Cart items combine when the same variant is added multiple times. Item prices are fixed at the time of addition to the cart. Cart items display product names, variant options, and individual subtotals. Customers can modify quantities or remove cart items before checkout. Cart items validate stock availability against current inventory levels. When variants become unavailable, cart items are marked accordingly. Cart items are removed from carts when products are deleted by sellers. Cart items are cleared upon successful order placement.

### Cart Item Representation

### Cart Item Representation

Cart items must be variant-specific, representing a particular SKU code and its associated option values (e.g., "Red / Large"). A cart item cannot represent a product generically; it must always reference one specific variant.

When displaying cart items, the system must show:
- Product name
- Variant option values
- SKU code
- Price per unit (fixed at time of addition)
- Quantity
- Subtotal (price × quantity)

If the referenced variant is deleted or made inactive, the cart item must be marked as unavailable but preserved until manually removed or the cart is cleared.

Cart items from the same customer for the same variant must combine into a single cart item with summed quantity, not appear as separate lines.

### Quantity Validation Rules

### Quantity Validation Rules

When adding or updating cart item quantity:

**Minimum Quantity Rule**:
- Quantity must be a positive whole number (1, 2, 3, ...)
- Zero or negative quantities are rejected
- Fractional quantities are rejected

**Maximum Quantity Rule**:
- Quantity cannot exceed available stock
- If available stock is 5, maximum allowed quantity is 5
- If customer tries to set quantity to 6, it must be reduced to 5 with a warning

**Increment Rule**:
- Quantity changes must be in whole units (no fractions)
- Customers can increase quantity by any amount up to available stock
- Customers can decrease quantity to any positive whole number
- Changing from 3 to 0 is not allowed; customers must remove the item instead

**Combination Rule**:
- When the same variant is added multiple times, quantities combine
- Example: Cart has 2 units of SKU-123, customer adds 3 more → cart now shows 5 units of SKU-123
- The combined quantity must still respect stock availability rules

### Price Fixation and Display

### Price Fixation and Display

**Price Locking**:
- Cart item price is fixed when the variant is first added to the cart
- Subsequent price changes to the product or variant do not affect cart items already in the cart
- Price remains locked until checkout or item removal

**Price Display Rules**:
- Display price per unit clearly
- Display subtotal (price × quantity) for each cart item
- If variant has no specific price override, use product base price
- If variant has a price override, use that variant-specific price

**Currency and Format**:
- Prices must be displayed in the platform's default currency
- No currency conversion occurs within the cart
- All monetary values must show exactly two decimal places

**Consistency Check**:
- If a cart item's price differs from current variant price by more than 50%, show a warning to the customer
- The warning must not prevent checkout, but must be acknowledged

### Stock Availability Validation

### Stock Availability Validation

**Real-time Stock Checking**:
- When displaying cart items, check current stock levels
- Stock availability must be validated:
  - When adding to cart
  - When updating quantity in cart
  - When viewing cart
  - During checkout process

**Out-of-Stock Rules**:
- Variants with zero stock cannot be added to cart
- If stock reaches zero after item is in cart, the item becomes unavailable
- Customers cannot increase quantity of an item beyond current stock

**Stock Calculation**:
- Available stock = current stock quantity - reserved quantity (items in other customers' carts)
- Stock reservation occurs when items are added to cart
- Reservation duration: 30 minutes
- After 30 minutes, if not purchased, reservation expires and stock becomes available again

**Concurrent Access**:
- If two customers try to purchase the same limited stock simultaneously, first to complete checkout wins
- Second customer's cart must show updated stock availability
- No overselling allowed

### Unavailable Item Handling

### Unavailable Item Handling

**Marking Criteria**:
A cart item must be marked as unavailable when:
1. The referenced variant is deleted by the seller
2. The variant's stock reaches zero
3. The product is deleted by the seller
4. The seller's account is suspended
5. The variant is made inactive

**Visual Indication**:
- Unavailable items must be visually distinguished (e.g., grayed out, strikethrough)
- Must show reason for unavailability
- Must prevent checkout of that specific item

**Customer Options**:
- Customers can remove unavailable items from cart
- Customers cannot change quantity of unavailable items
- Customers cannot move unavailable items to wishlist
- Unavailable items do not affect cart total calculation

**Automatic Cleanup**:
- Unavailable items remain in cart for 7 days
- After 7 days, they are automatically removed
- Customer receives notification before automatic removal

**Error Prevention**:
- Checkout must be blocked if cart contains any unavailable items
- Customers must remove unavailable items before proceeding to checkout

### Product Deletion Synchronization

### Product Deletion Synchronization

**Deletion Detection**:
- When a seller deletes a product, all variants of that product become unavailable
- System must immediately check all customer carts for items referencing deleted variants
- Cart items referencing deleted variants must be marked as unavailable

**Notification Requirement**:
- Customers with affected cart items must receive a notification
- Notification must include:
  - Product name
  - Reason (product deleted by seller)
  - Action required (item removed from cart)

**Timing Rules**:
- Synchronization must occur within 5 minutes of product deletion
- Cart views must reflect unavailability immediately for affected customers
- No manual customer action required for synchronization

**Data Preservation**:
- Cart item records for deleted products must be preserved for 30 days
- After 30 days, they can be archived
- Archived items must still be accessible for customer support inquiries

**Cascade Effects**:
- Product deletion also affects wishlists (items removed)
- Cart items and wishlist removals must happen in the same transaction
- Customers must not see inconsistent states between cart and wishlist

### Order Completion Cleanup

### Order Completion Cleanup

**Successful Order Placement**:
- When an order is successfully placed and paid for:
  - All cart items included in the order must be removed from the cart
  - Stock reservations for those items must be converted to actual stock deductions
  - Cart must show empty or only contain items not included in the order

**Partial Order Scenarios**:
- If checkout includes only some cart items:
  - Selected items are removed from cart
  - Unselected items remain in cart
  - Stock reservations for unselected items remain active

**Payment Failure**:
- If payment fails:
  - Cart items must NOT be removed
  - Stock reservations must remain active
  - Customer can retry checkout with same cart items

**Cart Clearing Rules**:
- Cart must be cleared only after successful payment confirmation
- Payment confirmation must come from the payment gateway
- No cart clearing on payment initiation or authorization

**Data Retention**:
- Cleared cart items must be logged in order history
- Customers must be able to see what items were in their cart at time of purchase
- Cart clearing must not affect wishlist items

**Session Management**:
- Cart clearing applies only to the current customer's cart
- Other customers' carts are unaffected
- If customer has multiple devices with same cart, all must sync cleared state

## Order Rules

Orders represent completed purchases with unique order numbers for tracking. Each order contains one or more order items from potentially multiple sellers. Orders have an overall status derived from constituent item statuses. Total price is calculated as the sum of all item prices and quantities. Order creation requires successful payment processing through external gateways. Shipping addresses are locked at order creation and cannot be changed. Orders preserve snapshots of products, variants, and seller profiles at purchase time. Customers can view their order history with pagination and sorting. Administrators can view all orders across the platform for oversight. Order statuses include paid, shipped, delivered, cancelled, refunded, and partially completed. Mixed item statuses result in partially completed order status.

### Order Number Uniqueness

**Rules:**

THE <system> SHALL generate a unique order number for each new order.
WHEN generating an order number, THE <system> SHALL ensure the number does not conflict with any existing order number.
WHERE order number generation is concerned, THE <system> SHALL preserve the uniqueness even if order records are archived or deleted.
IF a duplicate order number generation attempt occurs, THEN THE <system> SHALL retry with a different number generation algorithm until uniqueness is achieved.

### Multi-Seller Order Composition

**Rules:**

WHILE <order> contains items from multiple sellers, THE <system> SHALL maintain separate order item records for each seller's products.
WHERE an order contains items from different sellers, THE <system> SHALL treat each seller's items as independently processable units for shipping, cancellation, and refund purposes.
WHEN calculating order totals, THE <system> SHALL sum all item prices regardless of seller origin.
IF a customer purchases items from multiple sellers in a single transaction, THEN THE <system> SHALL create a single order with multiple order items grouped by seller for shipping purposes.

### Derived Overall Status Calculation

**Rules:**

WHEN all order items have status "paid", THEN THE <system> SHALL set the overall order status to "paid".
WHEN any order item transitions to "shipped" and no items are "delivered", THEN THE <system> SHALL set the overall order status to "shipped".
WHEN all order items have status "delivered", THEN THE <system> SHALL set the overall order status to "delivered".
WHEN all order items have status "cancelled", THEN THE <system> SHALL set the overall order status to "cancelled".
WHEN all order items have status "refunded", THEN THE <system> SHALL set the overall order status to "refunded".
WHEN order items have mixed statuses (e.g., some delivered, some refunded, some cancelled), THEN THE <system> SHALL set the overall order status to "partially completed".
THE <system> SHALL recalculate the overall order status whenever any constituent order item status changes.

### Payment Requirement for Creation

**Rules:**

THE <system> SHALL require successful payment confirmation before creating any order record.
WHEN payment processing fails, THE <system> SHALL NOT create an order record.
WHERE payment is concerned, THE <system> SHALL treat external payment gateway confirmation as the authoritative source of payment success.
IF payment succeeds but order creation fails, THEN THE <system> SHALL initiate a refund through the payment gateway.
WHEN payment succeeds, THE <system> SHALL proceed with order creation, stock deduction, cart clearing, and snapshot preservation as an atomic transaction.

### Shipping Address Lock

**Rules:**

THE <system> SHALL capture and lock the selected shipping address at the moment of order placement.
WHEN an order is created, THE <system> SHALL preserve the shipping address details as they existed at that moment.
WHERE shipping address is concerned for an existing order, THE <system> SHALL NOT allow modification of the address after order creation.
IF a customer's address book changes after order placement, THEN THE <system> SHALL NOT update the address on existing orders.
THE <system> SHALL display the locked shipping address on all order views and confirmations.

### Purchase-Time Snapshot Preservation

**Rules:**

WHEN an order is created, THE <system> SHALL capture and preserve snapshots of:
- The product name, description, and images as they existed at purchase time
- The variant options, SKU code, and price as they existed at purchase time
- The seller's shop name, description, and logo as they existed at purchase time

THE <system> SHALL associate these snapshots with each order item record.
WHERE order history is viewed, THE <system> SHALL display the preserved snapshots rather than current product/variant/seller data.
THE <system> SHALL preserve these snapshots even if the original product, variant, or seller profile is later modified or deleted.
IF a snapshot capture fails during order creation, THEN THE <system> SHALL prevent order creation and roll back the transaction.

### Mixed Status Handling

**Rules:**

WHEN an order contains items with different statuses (e.g., some delivered, some refunded), THE <system> SHALL classify the overall order status as "partially completed".
WHERE mixed statuses exist, THE <system> SHALL continue processing unaffected items according to their normal workflows.
WHEN a partially completed order has all remaining items delivered, THEN THE <system> SHALL transition the overall order status to "delivered".
WHEN a partially completed order has all remaining items cancelled, THEN THE <system> SHALL transition the overall order status to "cancelled".
WHEN a partially completed order has all remaining items refunded, THEN THE <system> SHALL transition the overall order status to "refunded".
THE <system> SHALL allow customers to view the specific status of each item within a partially completed order.
THE <system> SHALL allow sellers to process their items independently within partially completed orders.

## OrderItem Rules

Order items represent purchased quantities of specific product variants. Each order item captures the variant, quantity, and price at purchase time. Order items have individual statuses: paid, shipped, delivered, cancelled, or refunded. Price at purchase is preserved even if product prices change later. Quantity represents the number of units purchased for that variant. Order items include snapshots of product, variant, and seller profile data. Items from different sellers are processed independently within the same order. Cancellation and refund requests apply to individual order items. Stock quantities are adjusted based on order item status changes. Order items can be shipped individually or bundled in shipments. Delivery confirmation affects all items within the same shipment.

### Purchase Price Preservation and Snapshot Requirements

### Purchase Price Preservation and Snapshot Requirements

1. When a customer purchases a product variant, the price at the time of purchase is preserved with the order item.
2. Subsequent price changes to the product or variant do not affect the purchase price of existing order items.
3. The preserved purchase price is used for all financial calculations, refunds, and cancellations related to that order item.
4. Each order item must include a snapshot of the purchased product at the time of purchase, capturing:
   - Product name and description
   - All product images and their order
   - Product category
   - Base price
5. Each order item must include a snapshot of the purchased product variant at the time of purchase, capturing:
   - Variant SKU code
   - Option values (color, size, etc.)
   - Variant-specific price (if different from base price)
6. Each order item must include a snapshot of the seller's profile at the time of purchase, capturing:
   - Shop name
   - Shop description
   - Logo image
7. These snapshots are immutable and cannot be modified after creation.
8. The snapshots are preserved even if the original product, variant, or seller profile is later deleted.
9. All snapshots are timestamped with the exact moment the order was placed.
10. The system must validate that all required snapshots are successfully created before marking an order item as "paid".
11. If snapshot creation fails for any reason, the order placement fails and must be retried.
12. Customers, sellers, and administrators can view these snapshots for dispute resolution and historical accuracy.
13. The purchase price preserved in the order item must match the price displayed to the customer at checkout.
14. Any price discrepancies between the displayed price and preserved price must prevent order placement.

### Individual Status Management and Transitions

### Individual Status Management and Transitions

1. Each order item maintains its own independent status separate from other items in the same order.
2. Valid statuses for order items are: "paid", "shipped", "delivered", "cancelled", "refunded".
3. Status transitions follow specific rules:
   - "paid" → "shipped" (seller ships item)
   - "shipped" → "delivered" (customer confirms delivery or 14-day timeout)
   - "paid" → "cancelled" (seller approves cancellation request)
   - "delivered" → "refunded" (seller approves refund request)
4. Status changes must be recorded with timestamps and, where applicable, the actor who initiated the change.
5. An order item cannot skip statuses (e.g., cannot go directly from "paid" to "delivered" without being "shipped").
6. Once an order item reaches "cancelled" or "refunded" status, it cannot return to any previous status.
7. An order item with status "delivered" cannot be changed back to "shipped".
8. Only sellers can change order item status from "paid" to "shipped".
9. Only customers can confirm delivery, changing status from "shipped" to "delivered".
10. The system automatically changes "shipped" to "delivered" after 14 days if the customer does not manually confirm.
11. Status changes that violate these rules must be rejected with an appropriate error message.
12. All status changes must be recorded in an audit log.
13. Customers can only view the status of their own order items.
14. Sellers can only view and manage the status of order items for their own products.
15. Administrators can view and manage the status of any order item.
16. The current status of an order item determines which operations are available:
   - "paid" items can be cancelled
   - "delivered" items can be refunded (within 7 days)
   - "cancelled" and "refunded" items cannot be modified further

### Seller-Specific Processing and Applicability

### Seller-Specific Processing and Applicability

1. Each order item is associated with exactly one seller (the seller who owns the product variant).
2. Order items from different sellers are processed independently within the same order.
3. Sellers can only view and manage order items for products they own.
4. Cancellation requests apply to individual order items, not entire orders.
5. Refund requests apply to individual order items, not entire orders.
6. A seller's response (approve/reject) to a cancellation or refund request only affects their specific order item.
7. Other order items in the same order from different sellers remain unaffected by one seller's decisions.
8. Shipments must contain only order items from a single seller.
9. A seller cannot create a shipment containing order items from another seller.
10. Sellers can choose to ship their items individually or bundle multiple items into a single shipment.
11. When a seller creates a shipment, all items in that shipment share the same tracking information.
12. Delivery confirmation applies to entire shipments, not individual items.
13. When a customer confirms delivery of a shipment, all order items in that shipment are marked as "delivered".
14. If a seller is suspended, they can still process existing order items (ship items, respond to cancellation/refund requests) but cannot create new products or edit existing ones.
15. If a seller account is deleted, their order history and snapshots are preserved, but their products are removed from listings.
16. Seller-specific pricing and inventory are managed independently of other sellers.
17. A seller's approval status (pending/approved/rejected) affects their ability to create products but not their ability to fulfill existing order items.
18. Rejected sellers cannot create new order items but must fulfill existing commitments.

### Stock Adjustment Triggers and Rules

### Stock Adjustment Triggers and Rules

1. When an order item is created with status "paid", the stock quantity for that variant is immediately decreased by the purchased quantity.
2. The stock decrease must be recorded as a negative inventory record with reason "order purchase".
3. If an order item is cancelled (status changes from "paid" to "cancelled"), the stock quantity for that variant is increased by the cancelled quantity.
4. The stock restoration must be recorded as a positive inventory record with reason "cancellation".
5. If an order item is refunded (status changes from "delivered" to "refunded"), the stock quantity for that variant is increased by the refunded quantity.
6. The stock restoration must be recorded as a positive inventory record with reason "refund".
7. Stock adjustments must be atomic operations—either both the status change and stock adjustment succeed, or both fail.
8. Stock cannot go below zero. If a purchase would cause negative stock, the purchase must be rejected.
9. When stock reaches zero, the variant is marked as "out of stock" and cannot be added to carts.
10. Items already in carts that become out of stock must be marked as unavailable.
11. Customers cannot checkout with unavailable items in their cart.
12. Stock adjustments due to order status changes must be processed before the status change is finalized.
13. If stock adjustment fails, the status change must also fail and roll back.
14. Manual inventory adjustments by sellers (restocking or loss adjustments) create inventory records but do not affect order item statuses.
15. The current stock quantity is calculated by summing all inventory records for that variant.
16. Inventory records are immutable and cannot be deleted or modified after creation.
17. Sellers can view the full inventory history for their variants, including order-related adjustments.
18. Customers cannot purchase variants with zero or negative stock.
19. Order items for out-of-stock variants cannot be created.

### Shipment Bundling Rules and Delivery Handling

### Shipment Bundling Rules and Delivery Handling

1. A shipment can only contain order items from a single seller.
2. Different sellers must always ship their items separately (different shipments).
3. Sellers can choose to ship items individually or bundle multiple items into one shipment.
4. When creating a shipment, sellers select which of their order items to include.
5. All items in a shipment share the same:
   - Carrier name
   - Tracking number
   - Shipping date
6. When a shipment is created, all included order items change status from "paid" to "shipped".
7. This status change must occur atomically for all items in the shipment.
8. Delivery confirmation applies to entire shipments, not individual items.
9. When a customer confirms delivery of a shipment, all items in that shipment change status from "shipped" to "delivered".
10. If a customer does not confirm delivery, items automatically change to "delivered" after 14 days from the shipping date.
11. The 14-day automatic delivery rule applies per shipment, not per item.
12. Once any item in a shipment is marked as "delivered" (manually or automatically), all items in that shipment must also be marked as "delivered".
13. Customers can view tracking information for each shipment.
14. Tracking information is visible to both the customer and the seller.
15. Shipments cannot be modified after creation (cannot add or remove items).
16. If a shipment needs correction, it must be cancelled and a new shipment created.
17. Cancelling a shipment returns all included items to "paid" status and restores stock quantities.
18. Delivery confirmation cannot be undone once processed.
19. After delivery confirmation, refund requests can be made for individual items within the shipment.
20. The delivery confirmation timestamp is recorded for audit purposes.
21. Customers cannot confirm delivery before the shipping date.
22. Automatic delivery after 14 days cannot be prevented by customers or sellers.

### Cancellation and Refund Application Rules

### Cancellation and Refund Application Rules

1. Cancellation requests can only be made for order items with status "paid" (not yet shipped).
2. Refund requests can only be made for order items with status "delivered".
3. Refund requests must be made within 7 days of the item being delivered.
4. Each cancellation or refund request applies to exactly one order item.
5. Customers cannot request cancellation or refund for entire orders—only individual items.
6. Cancellation and refund requests require a reason (text explanation).
7. The seller of the item reviews the request and can approve or reject it.
8. When a seller responds to a request, a snapshot of the request state is created.
9. If a cancellation request is approved:
   - The order item status changes from "paid" to "cancelled"
   - Stock quantity is restored for that variant
   - Refund is processed for that item only
10. If a refund request is approved:
    - The order item status changes from "delivered" to "refunded"
    - Stock quantity is restored for that variant
    - Refund is processed for that item only
11. If a request is rejected, the order item status remains unchanged.
12. Other items in the same order are unaffected by cancellation or refund decisions.
13. If all items in an order are cancelled, the entire order status becomes "cancelled".
14. If all items in an order are refunded, the entire order status becomes "refunded".
15. Mixed statuses (some items delivered, some refunded) result in "partially completed" order status.
16. Customers can only make one cancellation request per order item.
17. Customers can only make one refund request per order item.
18. If a request is rejected, customers cannot submit another request for the same item.
19. Sellers must respond to requests within a reasonable timeframe (business rule, not SLA).
20. Administrators can force-cancel or force-refund items without seller approval.
21. Force actions by administrators still create snapshots and follow the same stock adjustment rules.
22. Cancelled or refunded items cannot be re-ordered automatically; customers must place new orders.

### Error Scenarios and Validation Rules

### Error Scenarios and Validation Rules

1. If an order item cannot be created because the variant is out of stock, the order placement fails.
2. If snapshot creation fails for any required data (product, variant, seller profile), order placement fails.
3. If stock adjustment fails during order placement, the entire order creation rolls back.
4. If a customer attempts to cancel an already shipped item (status "shipped" or "delivered"), the cancellation request is rejected.
5. If a customer attempts to refund an item that is not delivered, the refund request is rejected.
6. If a customer attempts to refund an item more than 7 days after delivery, the refund request is rejected.
7. If a seller attempts to ship items from multiple sellers in one shipment, the shipment creation fails.
8. If a seller attempts to create a shipment with items that are not in "paid" status, the shipment creation fails.
9. If tracking information is missing or invalid when creating a shipment, the shipment creation fails.
10. If a customer attempts to confirm delivery before the shipping date, the confirmation is rejected.
11. If stock restoration fails during cancellation or refund processing, the status change fails and rolls back.
12. If a seller attempts to delete their account while having order items with status "paid" or "shipped", the deletion fails.
13. If a seller attempts to delete a product with pending order items (paid or shipped status), the deletion fails.
14. If a seller attempts to delete a variant with pending order items (paid or shipped status), the deletion fails.
15. If payment processing fails, no order items are created and stock is not adjusted.
16. If a customer's account is banned, they cannot place new orders but existing order items continue processing.
17. If a seller's account is suspended, they cannot create new products but must fulfill existing order items.
18. If a seller's account is banned, they cannot log in but existing order items remain for historical records.
19. If a product is deleted by an administrator, existing order items with snapshots are preserved.
20. If a variant is deleted, existing order items with snapshots are preserved.
21. If a seller profile is edited, existing order item snapshots remain unchanged.
22. All error conditions must provide clear, user-friendly messages explaining why the operation failed.
23. Failed operations must not leave the system in an inconsistent state (all changes must be atomic).
24. Customers must be notified of relevant errors affecting their orders (cancellation rejections, shipment failures, etc.).
25. Sellers must be notified of relevant errors affecting their order items (inventory issues, shipment validation failures, etc.).

## Shipment Rules

Shipments represent physical packages sent by sellers to customers. Each shipment contains one or more order items from the same seller. Sellers create shipments by selecting items and providing tracking information. Shipments require carrier name and tracking number for customer monitoring. All items within a shipment share the same tracking information. When a shipment is created, all contained items change to shipped status. Customers confirm delivery per shipment, not per individual item. Unconfirmed shipments automatically mark items as delivered after 14 days. Different sellers always ship separately in different shipments. Shipments preserve the shipping address from the original order. Tracking information is visible to customers for shipment monitoring.

### Single-Seller Shipment Constraint

Each shipment can contain items from only one seller.

- When a seller creates a shipment, they can only include order items from their own products.
- Order items from different sellers cannot be included in the same shipment.
- If a customer's order contains items from multiple sellers, each seller must create their own separate shipment for their items.
- Attempting to add items from different sellers to a single shipment is rejected.
- Sellers cannot view or manage order items from other sellers.

### Tracking Information Requirements

Every shipment must have tracking information for customer monitoring.

- When creating a shipment, sellers must provide both a carrier name (e.g., 'FedEx', 'UPS', 'USPS') and a tracking number.
- The carrier name must be a recognizable shipping company name (cannot be empty or only spaces).
- The tracking number must be a non-empty string that follows the carrier's format.
- Both carrier name and tracking number must be provided before the shipment can be finalized.
- Sellers cannot create shipments without tracking information.
- Once a shipment is created, tracking information cannot be modified.

### Item Status Update on Shipment Creation

When a shipment is created, the status of all contained items updates to 'shipped'.

- All order items included in a shipment immediately change status from 'paid' to 'shipped' when the shipment is created.
- Items with status other than 'paid' (such as 'cancelled' or 'refunded') cannot be included in a shipment.
- Attempting to create a shipment with items that are not in 'paid' status is rejected.
- The status change is immediate and cannot be reversed by deleting or modifying the shipment.
- Each item's 'shipped' timestamp corresponds to the shipment creation time.

### Delivery Confirmation Rules

Customers confirm delivery per shipment, not per individual item.

- Customers can confirm delivery of an entire shipment through their order details page.
- When a customer confirms delivery, all items in that shipment change status from 'shipped' to 'delivered' simultaneously.
- Customers cannot confirm delivery of individual items within a shipment.
- Delivery confirmation requires the customer to be logged in and have access to the order.
- Once delivery is confirmed, the status change cannot be reversed by the customer.
- Delivery confirmation is only available for shipments with status 'shipped' (not for cancelled or refunded items).
- The delivery confirmation timestamp is recorded for audit purposes.

### Automatic Delivery After Timeout

Unconfirmed shipments automatically mark items as delivered after 14 days.

- If a customer does not manually confirm delivery of a shipment, the system automatically changes the status of all items in that shipment from 'shipped' to 'delivered' after 14 days from the shipment creation date.
- The 14-day period is calculated based on the shipment's creation timestamp.
- No notification or warning is sent before automatic delivery confirmation.
- Automatic delivery confirmation occurs as a system process and cannot be initiated manually.
- Once automatically confirmed, the delivery timestamp is recorded as the date when the 14-day period expired.
- Items that were already manually confirmed are not affected by this automatic process.

### Seller Separation Requirement

Different sellers always ship their items in separate shipments.

- Even if a customer orders multiple items from different sellers in a single order, each seller must create their own shipment for their items.
- There is no option for sellers to combine their items with another seller's items in a single shipment.
- Each shipment is associated with exactly one seller.
- Shipping addresses are preserved from the original order for each seller's shipment.
- Customers may receive multiple packages from different sellers for a single order.

### Tracking Visibility Permissions

Tracking information visibility follows specific permission rules.

- Customers can view tracking information (carrier name and tracking number) for shipments containing items they purchased.
- Sellers can view tracking information only for shipments they created (their own shipments).
- Administrators can view tracking information for all shipments on the platform.
- Tracking information is not visible to customers before a shipment is created (when items are still in 'paid' status).
- Once a shipment is created, customers can view tracking information immediately in their order details.
- Tracking information is never visible to other customers or unauthorized sellers.

## Review Rules

Reviews allow customers to rate and comment on purchased products. Customers can only review products after the item status is delivered. Each customer can write one review per product per order. Reviews consist of a required 1-5 star rating and optional text. Reviews are displayed on product detail pages sorted by newest first. Customers can edit their own reviews, creating snapshots of changes. Customers can delete their reviews, but snapshots are preserved. Deleted user reviews are preserved but shown as from a deleted user. Product average ratings are calculated from all non-deleted reviews. Review text content is optional but ratings are mandatory. Reviews provide feedback visible to other customers and sellers.

### Delivery Status Requirement

WHEN a customer attempts to write a review for a purchased product, THE system SHALL verify the order item's status.

IF the order item status is "delivered", THEN THE system SHALL allow the customer to write a review.

IF the order item status is NOT "delivered", THEN THE system SHALL prevent review creation.

WHEN an order item's status changes from "shipped" to "delivered", THE system SHALL enable the review option for that item.

### One Review Per Product Per Order

WHEN a customer attempts to create a review for a product, THE system SHALL check if the customer has already reviewed that specific product from the same order.

IF the customer has not reviewed this product from this order before, THEN THE system SHALL allow the review creation.

IF the customer has already reviewed this product from this order, THEN THE system SHALL prevent duplicate review creation.

THE system SHALL track reviews by the combination of customer, product, and order reference to enforce this rule.

### Rating Requirement Rules

WHEN a customer creates or edits a review, THE system SHALL require a rating value.

THE rating SHALL be a whole number between 1 and 5 inclusive.

THE system SHALL NOT accept reviews without a rating value.

THE system SHALL accept review text content as optional.

WHEN a customer attempts to submit a review without a rating, THE system SHALL reject the submission and inform the customer that rating is required.

### Review Editing with Snapshots

WHEN a customer edits an existing review, THE system SHALL create a snapshot of the review before changes.

THE snapshot SHALL include: timestamp of the change, the review's rating before change, the review's text content before change.

THE snapshot SHALL be immutable and cannot be deleted.

THE system SHALL preserve snapshots even if the review is later deleted.

Customers SHALL be able to view snapshots of their own review edits.

Administrators SHALL be able to view snapshots of any review for dispute resolution purposes.

### Deleted User Review Preservation

WHEN a customer deletes their account, THE system SHALL preserve all reviews written by that customer.

Preserved reviews SHALL be displayed with the author identified as "deleted user".

The preserved reviews SHALL continue to contribute to product average rating calculations.

The preserved reviews SHALL remain visible on product detail pages.

Review snapshots for deleted user reviews SHALL also be preserved and accessible to administrators.

### Average Rating Calculation

THE system SHALL calculate each product's average rating from all non-deleted reviews.

Deleted user reviews SHALL be included in average rating calculations.

Reviews marked as deleted by the customer SHALL NOT be included in average rating calculations.

The average rating SHALL be calculated as the arithmetic mean of all included review ratings.

The calculated average rating SHALL be displayed on product listings and product detail pages.

THE system SHALL update the average rating whenever a new review is created, an existing review is edited, or a review is deleted by the customer.

### Review Display Sorting

THE system SHALL display reviews on product detail pages sorted by newest first.

THE sorting SHALL be based on the original creation timestamp of the review, not the last edit timestamp.

THE system SHALL support pagination of reviews when there are many reviews for a product.

Deleted user reviews SHALL be displayed in the same sorted order as active user reviews.

Review snapshots SHALL be displayed in chronological order when viewing review edit history.

## CancellationRequest Rules

Cancellation requests

### Cancellation Request Eligibility

### Cancellation Request Eligibility

WHERE a customer wants to cancel an order item, THE system SHALL allow cancellation requests only for items with status "paid" (not yet shipped).

WHERE a customer attempts to cancel an item with status other than "paid", THE system SHALL reject the request.

WHERE an order item has status "paid" but belongs to an order where payment failed, THE system SHALL reject the cancellation request.

WHERE a seller attempts to cancel an order item they do not own, THE system SHALL reject the request.

WHERE an administrator attempts to force-cancel an item, THE system SHALL allow it regardless of the item's current status.

### Cancellation Request Content Validation

### Cancellation Request Content Validation

WHEN a customer creates a cancellation request, THE system SHALL require a reason (text) to be provided.

WHEN the reason is empty or contains only whitespace, THE system SHALL reject the request.

WHEN a seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

WHERE a cancellation request is approved, THE system SHALL process a refund for that item only.

WHERE a cancellation request is approved, THE system SHALL restore the item's stock quantity via inventory record.

WHERE a cancellation request is approved, THE system SHALL change the item's status to "cancelled".

WHERE a cancellation request is rejected, THE system SHALL change the request status to "rejected" and maintain the item's current status.

### Cancellation Request Workflow Constraints

### Cancellation Request Workflow Constraints

WHEN a cancellation request is created, THE system SHALL assign it to the seller who owns the product.

WHEN a seller has a pending cancellation request for an item, THE system SHALL prevent that seller from shipping that item.

WHERE multiple cancellation requests exist for different items in the same order, THE system SHALL process each independently.

WHERE a cancellation request is pending, THE customer who requested it SHALL be able to view its status.

WHERE a cancellation request is approved or rejected, THE customer who requested it SHALL be notified.

WHEN all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

### Cancellation Request Error Scenarios

### Cancellation Request Error Scenarios

IF a customer attempts to cancel an item that does not exist, THEN THE system SHALL reject the request.

IF a customer attempts to cancel an item they do not own, THEN THE system SHALL reject the request.

IF a seller attempts to respond to a cancellation request that does not exist, THEN THE system SHALL reject the response.

IF a seller attempts to respond to a cancellation request for an item they do not own, THEN THE system SHALL reject the response.

IF a cancellation request cannot be processed due to payment gateway issues, THEN THE system SHALL maintain the request in "pending" status and retry.

IF a seller attempts to delete their account while they have pending cancellation requests, THEN THE system SHALL reject the account deletion.

IF a customer attempts to delete their account while they have pending cancellation requests, THEN THE system SHALL allow the account deletion but preserve the cancellation request records.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search and Browsing

### Filtering

Customers can filter product search results by the following criteria:

- **Category**: Filter by selecting a specific category or subcategory. Products must belong to the selected category or its subcategories to appear in results.
- **Price Range**: Filter by specifying minimum and maximum price boundaries. The base price of products (or variant price if overridden) must fall within the specified range.
- **In-Stock Only**: Filter to show only products with at least one variant that has available stock (stock quantity > 0). Products with all variants out of stock are excluded.

### Sorting

Customers can sort product search results by the following options:

- **Newest First**: Products are sorted by creation date, with most recently created products appearing first.
- **Price (Low to High)**: Products are sorted by their base price (or lowest variant price if variants exist), from lowest to highest.
- **Price (High to Low)**: Products are sorted by their base price (or highest variant price if variants exist), from highest to lowest.

### Pagination

All product listings (search results, category pages, seller dashboard lists) must support pagination:

- **Default Page Size**: A reasonable default number of items per page (e.g., 20-50 items).
- **Page Navigation**: Customers can navigate to next, previous, and specific pages.
- **Result Count**: The total number of matching results is displayed to help customers understand the scope.
- **Consistent Ordering**: Pagination maintains consistent sorting order across pages.

### Data Browsing Expectations

When browsing any list of data (products, orders, wishlist items), users expect:

1. **Progressive Loading**: Lists load efficiently without overwhelming the system.
2. **Visual Consistency**: All lists follow the same pagination and filtering patterns.
3. **State Preservation**: Applied filters and sorting preferences persist during navigation.
4. **Empty State Handling**: Clear messaging when no results match the criteria.
5. **Performance**: Lists load within reasonable time limits even with large datasets.

### Seller Dashboard List Management

### Order Item Filtering

Sellers can filter order items for their products by:

- **Status**: Filter by order item status (paid, shipped, delivered, cancelled, refunded).
- **Time Period**: Filter by order date range (e.g., last 7 days, last month, custom date range).
- **Product**: Filter by specific product or variant.

### Product List Filtering

Sellers can filter their product listings by:

- **Availability**: Filter by products with or without available inventory.
- **Category**: Filter by product category.
- **Status**: Filter by active products vs. products marked for deletion or out of stock.

### Pagination for Business Lists

All seller dashboard lists (products, order items, inventory records) support pagination:

- **Business-appropriate Page Size**: Larger page sizes (e.g., 50-100 items) for business use.
- **Export Capability**: Option to export filtered results to external formats.
- **Quick Statistics**: Summary statistics showing counts by filter criteria.

### Administrator List Views

### Administrator Filtering Options

Administrators can filter various lists with advanced options:

- **User Management**: Filter users by account status (active, banned, suspended), user type (customer, seller), and registration date.
- **Order Oversight**: Filter orders by overall status, total price range, seller, customer, and date range.
- **Product Oversight**: Filter products by seller, category, creation date, and approval status.

### Sorting for Administrative Use

Administrators can sort lists by:

- **User Lists**: Sort by registration date, last login, or account status.
- **Order Lists**: Sort by order date, total price, or number of items.
- **Product Lists**: Sort by creation date, base price, or number of reviews.

### Pagination for Administrative Scale

Administrator interfaces handle larger datasets with:

- **Configurable Page Sizes**: Administrators can adjust items per page based on their needs.
- **Bulk Action Support**: Pagination works with bulk approval/rejection operations.
- **Audit Trail Access**: Each page maintains access to detailed audit information when needed.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Registration and Authentication Error Scenarios

### Registration and Authentication Error Scenarios

#### Email Uniqueness Violation

**Scenario**: A user attempts to register with an email address that is already associated with an existing account.

**Expected System Response**: The registration request is rejected. The user is informed that the email address is already in use and must choose a different email address.

#### Invalid Password Format

**Scenario**: A user attempts to set or change their password, but the password does not meet the system's minimum security requirements (e.g., minimum length, required character types).

**Expected System Response**: The password change request is rejected. The user is informed of the specific password format requirements that were not met.

#### Incorrect Login Credentials

**Scenario**: A user attempts to log in with an email address and password that do not match an existing account.

**Expected System Response**: The login request is rejected. The user is informed that the email or password is incorrect. No specific information is given about whether the email exists or the password is wrong (to prevent account enumeration).

#### Account Deletion Constraints

**Scenario**: A seller attempts to delete their account, but they have pending orders, cancellation requests, or refund requests for their products.

**Expected System Response**: The account deletion request is rejected. The seller is informed they cannot delete their account until all pending order-related activities for their products are resolved.

#### Account Status Blocking Login

**Scenario**: A user with a "banned" or "suspended" status attempts to log in.

**Expected System Response**: The login request is rejected. The user is informed that their account is currently not active and they should contact support.

### Seller Approval and Management Error Scenarios

### Seller Approval and Management Error Scenarios

#### Seller Registration Rejection

**Scenario**: An administrator rejects a seller's registration application.

**Expected System Response**: The seller's approval status changes to "rejected." The seller is notified of the rejection and can view the administrator-provided reason. The seller can submit a new registration request.

#### Attempting to Sell Without Approval

**Scenario**: A seller with "pending" or "rejected" approval status attempts to create a new product.

**Expected System Response**: The product creation request is rejected. The seller is informed they must have "approved" status to list products for sale.

#### Seller Suspension Effects

**Scenario**: An administrator suspends a seller's account.

**Expected System Response**: The seller's products are immediately hidden from search and category listings and cannot be purchased. The seller cannot create or edit products. The seller can still process existing orders (ship items, respond to cancellation/refund requests). The seller is notified of the suspension.

#### Attempting to Edit While Suspended

**Scenario**: A suspended seller attempts to edit their shop profile or an existing product.

**Expected System Response**: The edit request is rejected. The seller is informed their account is suspended and they cannot modify listings.

#### Unauthorized Seller Product Access

**Scenario**: A seller attempts to view or edit a product that belongs to a different seller.

**Expected System Response**: The request is rejected. The seller is informed they do not have permission to access the specified product.

### Product and Inventory Operation Error Scenarios

### Product and Inventory Operation Error Scenarios

#### Product Deletion Constraints

**Scenario**: A seller attempts to delete a product that has pending order items (with "paid" or "shipped" status) or pending cancellation/refund requests for any of its variants.

**Expected System Response**: The product deletion request is rejected. The seller is informed they cannot delete the product until all pending order-related activities for its variants are resolved.

#### Variant Deletion Constraints

**Scenario**: A seller attempts to delete a product variant that has pending order items (with "paid" or "shipped" status) or pending cancellation/refund requests.

**Expected System Response**: The variant deletion request is rejected. The seller is informed they cannot delete the variant until all pending order-related activities for it are resolved.

#### Creating Product Without Variants

**Scenario**: A customer attempts to purchase a product that has no defined variants.

**Expected System Response**: The purchase attempt is rejected. The product is shown as "unavailable" to customers and cannot be added to cart or purchased.

#### Out-of-Stock Purchase Attempt

**Scenario**: A customer attempts to add a variant to their cart, or checkout, but the requested quantity exceeds the available stock.

**Expected System Response**: The request is rejected. The customer is shown a warning that insufficient stock is available. They can reduce the quantity or remove the item.

#### Invalid Inventory Adjustment

**Scenario**: A seller attempts to subtract more inventory from a variant than the current available stock (resulting in negative stock).

**Expected System Response**: The inventory adjustment request is rejected. The seller is informed they cannot set stock below zero through manual adjustments.

### Order, Cancellation, and Refund Error Scenarios

### Order, Cancellation, and Refund Error Scenarios

#### Checkout with Unavailable Items

**Scenario**: A customer attempts to proceed to checkout with items in their cart that are marked as unavailable (deleted or out of stock).

**Expected System Response**: The checkout request is rejected. The customer must remove the unavailable items from their cart before they can proceed.

#### Invalid Cancellation Request

**Scenario**: A customer attempts to request cancellation for an order item that is not in "paid" status (e.g., it is already shipped, delivered, cancelled, or refunded).

**Expected System Response**: The cancellation request is rejected. The customer is informed they can only cancel items that have not yet been shipped.

#### Invalid Refund Request

**Scenario**: A customer attempts to request a refund for an order item that is not in "delivered" status, or the delivery occurred more than 7 days ago.

**Expected System Response**: The refund request is rejected. The customer is informed they can only request refunds for items that have been delivered within the last 7 days.

#### Payment Processing Failure

**Scenario**: During checkout, the external payment gateway reports a failure (e.g., insufficient funds, expired card).

**Expected System Response**: The order is not created. The customer is informed the payment failed and can retry the payment process. Stock quantities are not decreased, and cart items remain unchanged.

#### Unauthorized Order Access

**Scenario**: A customer attempts to view the details of an order that does not belong to them.

**Expected System Response**: The request is rejected. The customer is informed they do not have permission to view the specified order.

### Review and Administrative Error Scenarios

### Review and Administrative Error Scenarios

#### Invalid Review Submission

**Scenario**: A customer attempts to write a review for a product they have not purchased, or for an order item that is not in "delivered" status.

**Expected System Response**: The review submission request is rejected. The customer is informed they can only review products they have purchased and received.

#### Duplicate Review Attempt

**Scenario**: A customer attempts to write more than one review for the same product within the same order.

**Expected System Response**: The review submission request is rejected. The customer is informed they can only write one review per product per order.

#### Administrator Request Rejection

**Scenario**: A super administrator rejects a user's request to become an administrator.

**Expected System Response**: The request's status changes to "rejected." The user is notified of the rejection. The user can submit a new request.

#### Unauthorized Administrative Action

**Scenario**: A regular administrator attempts to perform an action reserved for super administrators (e.g., promoting another administrator, approving administrator requests).

**Expected System Response**: The request is rejected. The administrator is informed they do not have sufficient privileges for the action.

#### Self-Demotion Attempt

**Scenario**: A super administrator attempts to demote themselves to a regular administrator.

**Expected System Response**: The demotion request is rejected. The super administrator is informed they cannot change their own grade.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Gateway Retry Strategy

Payment gateway calls must employ a staggered retry strategy with exponential backoff.

WHEN a payment request fails with a network error, THE system SHALL retry up to 3 times using the following intervals: 5 seconds, 30 seconds, 2 minutes.

WHEN a payment request fails with a server error (5xx HTTP status code), THE system SHALL retry up to 2 times with 30-second intervals.

WHEN a payment request fails with a client error (4xx HTTP status code), THE system SHALL NOT retry.

THE system SHALL stop all retries if the payment gateway returns a "payment already processed" or "duplicate request" error.

THE system SHALL log all retry attempts with the timestamp, error type, and retry count.

### Circuit Breaker for External Services

External service integrations must implement a circuit breaker pattern to prevent cascading failures.

WHEN an external service fails 5 times within a 1-minute window, THE system SHALL open the circuit breaker for that service.

WHILE the circuit is open, THE system SHALL immediately fail all requests to that service without attempting them.

AFTER 1 minute of being open, THE system SHALL transition the circuit to half-open state.

WHEN in half-open state, THE system SHALL attempt a single request to the service.

IF the request in half-open state succeeds, THE system SHALL close the circuit.

IF the request in half-open state fails, THE system SHALL re-open the circuit.

THE system SHALL maintain separate circuit breakers for:
- Payment gateway
- Email notification service
- SMS notification service

### Integration Failure Fallback Behavior

When external services fail, the system must provide appropriate fallback behavior.

IF the payment gateway is unavailable or circuit breaker is open, THE system SHALL display a message to customers indicating payment services are temporarily unavailable and prevent order placement.

IF the email notification service fails, THE system SHALL queue notification emails for later delivery and log the failure.

IF the SMS notification service fails, THE system SHALL skip SMS notifications and log the failure.

IF external address validation services fail, THE system SHALL accept addresses without validation but log the validation bypass.

THE system SHALL provide administrative dashboards showing current service availability status.

### Integration Error Handling and Escalation

Integration errors must be properly logged, classified, and escalated.

WHEN any external integration fails, THE system SHALL log the error with:
- Service name
- Error type (network, timeout, authentication, rate limit, server error, client error)
- Request context (user ID, order ID if applicable)
- Timestamp

WHEN payment gateway errors persist for more than 15 minutes, THE system SHALL notify administrators.

WHEN email notification failures accumulate beyond 100 queued messages, THE system SHALL notify administrators.

IF critical order processing integrations (payment, inventory deduction) fail repeatedly, THE system SHALL pause all checkout operations and require manual administrator intervention.

THE system SHALL maintain error rate metrics for each external service and trigger alerts when error rates exceed 10% over a 5-minute period.