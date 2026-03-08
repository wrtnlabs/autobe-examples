**ecommerceMall — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Customer Data Ownership

WHEN a customer is created, THE system SHALL associate all their personal data exclusively with that customer account.

WHEN a customer creates an order, THE system SHALL associate that order exclusively with the creating customer.

WHEN a customer adds items to their wishlist, THE system SHALL store the wishlist exclusively under their customer account.

WHEN a customer adds items to their shopping cart, THE system SHALL store the cart exclusively under their customer account.

WHEN a customer writes a review, THE system SHALL associate that review exclusively with the writing customer and the reviewed product.

IF a customer is banned by an administrator, THE system SHALL prevent the customer from accessing any data associated with their account.

THE system SHALL ensure that customers can only view their own orders, wishlists, and shopping carts.

THE system SHALL reject requests where a customer attempts to access another customer's private data.

### Seller Data Ownership

WHEN a seller creates a product, THE system SHALL associate that product exclusively with the creating seller.

WHEN a seller creates a seller profile, THE system SHALL associate the profile exclusively with the creating seller.

WHEN a seller adds product variants, THE system SHALL associate those variants exclusively with the creating seller's products.

WHEN a seller creates inventory records, THE system SHALL associate those records exclusively with the creating seller's product variants.

WHEN a seller creates cancellation or refund requests, THE system SHALL associate those requests exclusively with the creating seller.

IF a seller account is suspended by an administrator, THE system SHALL prevent other sellers and customers from viewing the suspended seller's products.

THE system SHALL ensure that sellers can only view and manage their own products and seller profiles.

THE system SHALL reject requests where a seller attempts to access another seller's private data.

WHEN a seller deletes their account, THE system SHALL preserve order history snapshots for legal purposes while deleting current product listings.

### Order Isolation and Separation

WHEN a customer places an order, THE system SHALL create an order that belongs exclusively to that customer.

WHEN an order contains items from multiple sellers, THE system SHALL maintain separate order items for each seller.

WHEN a seller creates a shipment, THE system SHALL associate that shipment exclusively with items from that seller.

THE system SHALL ensure that customers can only view their own orders and order items.

THE system SHALL ensure that sellers can only view and manage order items for products they have created.

THE system SHALL ensure that administrators can view all orders across all customers and sellers.

WHEN an order item is cancelled or refunded, THE system SHALL process that change only for that specific item, leaving other items in the same order unaffected.

IF an order is cancelled by an administrator, THE system SHALL preserve the order record for audit purposes while changing its status to cancelled.

THE system SHALL reject requests where a customer attempts to modify another customer's order.

THE system SHALL reject requests where a seller attempts to modify order items for products they did not create.

### Product Ownership and Cross-Seller Access

WHEN a product is created, THE system SHALL mark the product as owned by the creating seller.

THE system SHALL ensure that customers can view products from all sellers.

THE system SHALL ensure that sellers can only edit products they have created.

THE system SHALL ensure that sellers cannot view other sellers' products in edit mode.

WHEN an administrator deletes a product for policy violations, THE system SHALL preserve product snapshots for administrative records.

THE system SHALL ensure that administrators can view and manage products from all sellers.

WHEN a seller is suspended, THE system SHALL hide their products from search results and category listings while preserving them in the database.

IF a product is deleted, THE system SHALL automatically remove it from all customers' wishlists.

THE system SHALL reject requests where a seller attempts to modify a product owned by another seller.

THE system SHALL preserve product snapshots even after product deletion for dispute resolution purposes.

### Review Ownership and Visibility

WHEN a customer writes a review, THE system SHALL mark the review as owned by that customer.

THE system SHALL ensure that customers can only edit or delete their own reviews.

THE system SHALL ensure that sellers cannot delete reviews on their products.

THE system SHALL ensure that customers can view reviews on all products regardless of seller.

WHEN a review is deleted by its owner, THE system SHALL preserve the review snapshot but mark it as inactive.

THE system SHALL calculate product ratings from all active (non-deleted) reviews.

WHEN a customer account is deleted, THE system SHALL mark all their reviews as written by "deleted user" while preserving the review content.

WHEN a seller account is deleted, THE system SHALL preserve the seller name in all existing order items and reviews.

THE system SHALL reject requests where a customer attempts to modify another customer's review.

WHEN a review is edited, THE system SHALL create a snapshot recording the old and new values.

### Administrative Access and Oversight

WHEN an administrator accesses the system, THE system SHALL provide access to all data across all customers and sellers.

WHEN an administrator force-cancels an order item, THE system SHALL process the cancellation regardless of the item's current status.

WHEN an administrator force-refunds an order item, THE system SHALL process the refund regardless of the item's current status.

THE system SHALL ensure that regular administrators cannot access super-administrator functions such as promoting or demoting super administrators.

WHEN an administrator bans a customer, THE system SHALL prevent the banned customer from accessing any system features.

WHEN an administrator bans a seller, THE system SHALL prevent the banned seller from accessing the seller dashboard and creating new products.

THE system SHALL ensure that super administrators can view and manage all administrator accounts.

WHEN an administrator deletes a category, THE system SHALL mark products previously in that category as uncategorized.

THE system SHALL maintain a log of all administrative actions for audit purposes.

WHEN an administrator approves an admin request, THE system SHALL update the requester's role and notify the requester of the approval.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with an email address and password to access any platform features. Guest browsing is not permitted; authentication is required for all actions. Customers can log in using their registered email and password credentials. Password changes are allowed through a secure password update process. Account deletion permanently removes the customer's profile information from the system. When an account is deleted, order history and order records are preserved for seller records and legal compliance. Reviews written by deleted customers are maintained but displayed with a 'deleted user' label. Registration attempts are subject to rate limiting to prevent system abuse. Email addresses must be unique among active customer accounts to prevent duplicate registrations.

### Registration Requirements

### Registration Requirements

WHEN a customer registers a new account, THE system SHALL:
1. Require a valid email address
2. Require a password meeting security standards
3. Associate the account with customer profile information
4. Prevent guest access to all platform features

THE system SHALL reject registration when an email address is already registered to an active account.

THE system SHALL deny all platform access to unauthenticated users, including product browsing and search.

IF registration is attempted without an email address, THE system SHALL reject the request.

IF registration is attempted without a password, THE system SHALL reject the request.

THE system SHALL require customers to authenticate before any action beyond viewing public product listings.

Registration attempts are subject to rate limiting to prevent system abuse.

THE system SHALL count consecutive failed registration attempts and temporarily block further attempts after exceeding the threshold.

### Email Authentication Rules

WHEN a customer logs in, THE system SHALL validate the provided email and password against stored credentials.

IF the provided email does not exist, THE system SHALL reject the authentication request.

IF the provided password does not match the stored password hash, THE system SHALL reject the authentication request.

THE system SHALL lock the account after consecutive failed login attempts exceeding the maximum threshold.

WHEN an account is locked, THE system SHALL require identity verification before allowing login.

THE system SHALL maintain a single active session per customer account.

### Password Management Rules

WHEN a customer changes their password, THE system SHALL require authentication with the current password.

THE system SHALL require a new password to meet minimum security standards including length and complexity.

THE system SHALL update the password hash after successful password change.

IF the current password is incorrect, THE system SHALL reject the password change request.

IF the new password does not meet security standards, THE system SHALL reject the password change request.

THE system SHALL invalidate all existing sessions after a password change.

### Account Deletion Policy

WHEN a customer requests account deletion, THE system SHALL:
1. Verify the customer's identity
2. Remove profile information from active records
3. Preserve order history and order records
4. Preserve review records with deleted user designation

IF the customer has active orders in progress, THE system SHALL prevent account deletion.

IF the customer has pending cancellation requests, THE system SHALL prevent account deletion.

IF the customer has pending refund requests, THE system SHALL prevent account deletion.

WHEN an account is deleted, THE system SHALL retain all order records for legal and seller record purposes.

WHEN an account is deleted, THE system SHALL mark all reviews as belonging to a 'deleted user'.

WHEN an account is deleted, THE system SHALL preserve order history accessible to the customer before deletion.

### Unique Email Constraint

THE system SHALL ensure email addresses are unique among all active customer accounts.

IF a registration attempt uses an email already associated with an active account, THE system SHALL reject the registration.

IF a registration attempt uses an email associated with a banned account, THE system SHALL require account recovery before proceeding.

THE system SHALL validate email format before attempting registration.

THE system SHALL reject registration with malformed email addresses.

### Rate Limiting Protection

THE system SHALL track registration attempts per IP address.

IF the number of registration attempts from a single IP exceeds the threshold within the time window, THE system SHALL temporarily block further attempts.

THE system SHALL provide a clear message indicating rate limiting is in effect.

THE system SHALL automatically lift rate limiting restrictions after the designated cooldown period.

THE system SHALL log all rate limiting events for security analysis.

### Mandatory Authentication

THE system SHALL require customer authentication before allowing any account-specific actions.

THE system SHALL redirect unauthenticated users to the login page for protected resources.

THE system SHALL allow viewing of product listings without authentication.

THE system SHALL allow viewing of category listings without authentication.

THE system SHALL deny access to customer profile, cart, orders, and wishlist without authentication.

## CustomerProfile Rules

Each customer has a personal profile containing a display name and optional phone number. Customers can edit their display name to control how they appear to other users. Phone number updates are optional and allow customers to provide contact information for order notifications. Display name and phone number fields are editable by the profile owner at any time. Changes to profile information do not affect existing orders or review history. The display name is visible to other users when viewing customer reviews or order information. Phone number field is optional and may be left blank if the customer prefers not to share it. All profile edits are logged to maintain an audit trail of user information changes.

### Display Name Editing Rules

WHEN a customer edits their display name, THE system SHALL save the new name and create a snapshot of the previous display name value.

IF the display name is shorter than 1 character, THE system SHALL reject the update and prompt the customer to provide a name.

IF the display name exceeds 100 characters, THE system SHALL reject the update and request a shorter name.

THE display name SHALL be visible to other users when the customer writes reviews or appears in order information.

WHEN a customer views their profile, THE system SHALL display their current display name.

IF a customer has no display name set, THE system SHALL allow them to set one before making their first purchase.

THE system SHALL maintain the display name snapshot history for each edit, recording the timestamp and the old value.

WHEN a customer's order is delivered, THE system SHALL use their display name in the review submission interface.

IF a customer deletes their account, THE system SHALL preserve their display name in past order records but mark it as from a deleted user.

WHEN a customer creates a review, THE system SHALL associate the display name with that review for public display.

### Phone Number Management

WHEN a customer adds or updates their phone number, THE system SHALL validate the phone number format.

IF the phone number exceeds 20 characters, THE system SHALL reject the input and request a shorter number.

THE phone number field is OPTIONAL, and customers may choose not to provide it.

WHEN a customer updates their phone number, THE system SHALL create a snapshot of the previous phone number value (or null if none existed).

THE system SHALL allow customers to view their current phone number in their profile settings.

IF a customer provides a phone number, THE system SHALL store it securely for order notification purposes.

WHEN a customer edits their phone number, THE system SHALL log the change timestamp in the profile update history.

IF a customer has multiple shipping addresses with phone numbers, THE system SHALL NOT automatically update the profile phone number when they edit an address.

WHEN a customer deletes their account, THE system SHALL preserve their phone number in order records but remove it from the public profile view.

THE system SHALL allow customers to clear their phone number at any time by setting it to empty.

### Profile Visibility Settings

WHEN a customer views their profile, THE system SHALL display their display name and phone number (if provided).

THE system SHALL show the display name on customer reviews submitted to products.

WHEN another user views a review written by a customer, THE system SHALL display the reviewer's display name.

IF a customer deletes their account, THE system SHALL change their display name to "deleted user" on all their historical reviews.

THE system SHALL display the display name in the order history page for each order placed by the customer.

WHEN a seller views an order from a customer, THE system SHALL show the customer's display name (if provided).

THE system SHALL NOT display phone numbers in public-facing areas such as product reviews or category listings.

IF a customer edits their display name, THE system SHALL NOT retroactively update display names in existing reviews or orders.

WHEN a customer browses product reviews, THE system SHALL show the display names of reviewers for each review entry.

### Optional Contact Information Policy

THE system SHALL allow customers to complete their profile without providing a phone number.

WHEN a customer creates an account, THE system SHALL require only an email and password, not a phone number.

IF a customer chooses not to provide a phone number, THE system SHALL allow them to proceed with all customer features.

THE system SHALL mark phone number as optional in the customer registration process.

WHEN a customer places an order, THE system SHALL use the shipping address phone number even if the profile phone number is empty.

IF a customer provides a phone number, THE system SHALL NOT require them to set a display name first.

THE system SHALL allow customers to update their profile information independently (display name and phone number can be edited separately).

WHEN a customer views their profile, THE system SHALL clearly indicate that the phone number field is optional.

IF a customer has no profile at all, THE system SHALL create an empty profile record on first access.

### Profile Update Logging

WHEN a customer edits any profile field, THE system SHALL create a snapshot record with the change timestamp.

WHEN a snapshot is created, THE system SHALL record both the old value and the new value for each changed field.

THE system SHALL create a separate snapshot record for each profile edit operation.

IF a customer makes multiple edits in sequence, THE system SHALL create multiple snapshot records, one per edit.

WHEN a customer views their profile update history, THE system SHALL display the timestamp, changed field, old value, and new value.

THE system SHALL preserve snapshot records even after the customer's account is deleted.

IF a customer's account is suspended, THE system SHALL still allow them to update their profile information.

WHEN a customer's profile is viewed by an administrator for dispute resolution, THE system SHALL show the complete snapshot history.

THE system SHALL create a snapshot whenever the display name is changed, regardless of whether the value is the same as the previous one.

IF a customer attempts to set their display name to the same value, THE system SHALL NOT create a new snapshot record.

### Review Name Display Rules

WHEN a customer writes a review, THE system SHALL display their current display name on the review.

WHEN a customer edits their display name, THE system SHALL NOT change the display name shown on their existing reviews.

THE system SHALL use the display name that was active at the time the review was submitted.

WHEN a review is created, THE system SHALL capture and store the display name snapshot with the review.

IF a customer's account is deleted, THE system SHALL replace their display name with "deleted user" on all their reviews.

WHEN a customer views their own reviews, THE system SHALL show the display names as they were when each review was submitted.

THE system SHALL maintain the original display name in the review record for audit purposes.

IF a customer submits multiple reviews for the same product, THE system SHALL display their display name on each review independently.

WHEN a seller views reviews for their products, THE system SHALL show the display name associated with each review at submission time.

THE system SHALL allow review display names to differ from the current customer display name if the customer changed their name after submitting the review.

### Personal Information Control

WHEN a customer accesses their profile settings, THE system SHALL allow them to edit their display name and phone number.

THE system SHALL allow customers to update their profile information at any time, provided their account is active.

IF a customer's account is banned, THE system SHALL prevent them from editing their profile information.

WHEN a customer updates their profile, THE system SHALL immediately reflect the changes in their profile view.

THE system SHALL allow customers to set their display name to any valid text (1-100 characters) of their choice.

IF a customer attempts to upload a phone number with invalid characters, THE system SHALL reject the input.

WHEN a customer deletes their account, THE system SHALL NOT delete their shipping address phone numbers, only the profile phone number.

THE system SHALL allow customers to keep their display name private from other users until they submit a review.

IF a customer has no display name set, THE system SHALL display a placeholder or anonymous identifier in review lists.

WHEN a customer views their profile, THE system SHALL show which fields have been updated and when.

### Customer Identity Management

WHEN a customer creates an account, THE system SHALL require a unique email address for identity verification.

THE system SHALL use the customer's email as the primary identifier across all operations.

WHEN a customer logs in, THE system SHALL authenticate them using their email and password.

IF a customer forgets their password, THE system SHALL allow them to reset it using their email address.

THE system SHALL maintain a one-to-one relationship between customer accounts and email addresses.

WHEN a customer requests account deletion, THE system SHALL verify their identity before proceeding.

IF a customer submits a new registration with an email that already exists, THE system SHALL reject the registration and prompt them to log in.

THE system SHALL preserve the customer's identity in all order records and reviews even after account deletion.

WHEN a customer's account is banned, THE system SHALL retain their identity record for administrative oversight.

IF a customer's email address changes, THE system SHALL require administrator approval to update it.

### Edit History Tracking

WHEN a customer edits their profile, THE system SHALL log the edit in the history tracking system.

THE system SHALL record the user's identity (customer ID) for each profile edit.

WHEN a snapshot is created, THE system SHALL store the old value, new value, and timestamp of the change.

IF a customer views their edit history, THE system SHALL display all previous edits with timestamps.

THE system SHALL allow administrators to view the complete edit history of any customer profile for dispute resolution.

WHEN a customer requests an export of their data, THE system SHALL include profile edit history in the export.

THE system SHALL preserve edit history records indefinitely, even after account deletion.

IF a customer makes an edit while offline, THE system SHALL still record the edit with the server timestamp.

WHEN a customer's profile is modified by an administrator for security reasons, THE system SHALL record this action in the edit history.

THE system SHALL allow customers to view a summary of how many times they have edited their profile.

## ShippingAddress Rules

Customers can manage multiple shipping addresses for different delivery locations. Each address requires recipient name, phone number, street address, city, state or province, postal code, and country. Addresses can be edited to update recipient details or delivery location information. Customers can delete addresses they no longer wish to use for deliveries. One address must be designated as the default shipping address for checkout convenience. The default address is automatically selected during the checkout process unless manually changed. All address fields must contain complete information for successful delivery to be possible. Address changes do not affect orders that have already been placed with previous addresses.

### Multiple Address Management

THE system SHALL allow customers to manage multiple shipping addresses.

A customer can have up to 20 shipping addresses stored in the system.

THE system SHALL ensure each address has a unique identifier for the customer.

WHEN a customer adds a new address, THE system SHALL store it independently of other addresses.

THE system SHALL NOT merge or duplicate addresses that have the same street address and city.

IF the customer attempts to add more than 20 addresses, THE system SHALL reject the addition with an error message.

### Default Address Selection

THE system SHALL require each customer to have at least one default shipping address.

WHEN a customer adds their first address, THE system SHALL automatically designate it as the default.

WHEN a customer adds additional addresses, THE system SHALL allow them to select one as the default.

IF a customer attempts to delete their only address, THE system SHALL reject the deletion and require them to add a new address first.

THE system SHALL allow customers to change the default address at any time before checkout.

WHEN an address is set as default, THE system SHALL mark it clearly in the customer's address list.

### Address Editing Capabilities

WHEN a customer edits an address, THE system SHALL allow modification of recipient name, phone number, street address, city, state/province, and postal code.

THE system SHALL preserve the address's unique identifier during edits.

WHEN editing an address, THE system SHALL update the modifiedAt timestamp.

IF an edited address is currently set as default, THE system SHALL maintain it as the default address after editing.

THE system SHALL NOT allow editing of addresses that have already been used for completed orders.

IF a customer edits the default address, THE system SHALL update the default shipping address for future checkouts.

### Address Deletion Policy

THE system SHALL allow customers to delete addresses they no longer need.

IF an address is set as default, THE system SHALL require the customer to select a new default address before deletion.

IF an address has been used for a completed order, THE system SHALL mark it as read-only but still allow deletion.

IF an address is being used for a pending order, THE system SHALL warn the customer and prevent deletion until the order is completed or cancelled.

WHEN an address is deleted, THE system SHALL permanently remove it from the customer's address list.

IF a customer has multiple addresses and attempts to delete all of them, THE system SHALL prevent deletion and require at least one address to remain.

### Complete Address Requirements

WHEN creating a new shipping address, THE system SHALL require recipient name, street address, city, state/province, and postal code.

THE system SHALL require phone number for the recipient.

THE system SHALL require country selection for each address.

WHEN all required fields are provided, THE system SHALL save the complete address.

IF any required field is missing, THE system SHALL display validation errors and prevent address creation.

THE system SHALL reject addresses with incomplete recipient information (missing name or phone number).

WHEN shipping internationally, THE system SHALL validate that the country code is supported.

### Recipient Information Fields

WHEN collecting recipient information, THE system SHALL require the full recipient name (first and last name).

THE system SHALL require a valid phone number format for the recipient.

WHEN storing recipient information, THE system SHALL save it as plain text for easy display.

IF the recipient phone number format is invalid, THE system SHALL display a format error and request correction.

THE system SHALL allow the recipient name to contain special characters and spaces.

THE system SHALL NOT display recipient phone numbers on public product pages or seller dashboards.

### Checkout Address Selection

WHEN a customer proceeds to checkout, THE system SHALL display their saved shipping addresses.

THE system SHALL pre-select the default shipping address for checkout.

THE system SHALL allow customers to select a different saved address or add a new address during checkout.

IF no addresses are available, THE system SHALL prevent checkout and prompt the customer to add an address.

WHEN an address is selected during checkout, THE system SHALL use it for the order calculation.

THE system SHALL allow customers to create a new address during checkout and select it immediately.

ONCE an order is placed, THE system SHALL lock the shipping address and prevent further changes.

### Delivery Location Management

WHEN a customer manages their delivery locations, THE system SHALL organize addresses by geographic region.

THE system SHALL allow customers to search their addresses by city or postal code.

IF a customer adds an address in a new city, THE system SHALL allow the addition without affecting existing addresses.

THE system SHALL display delivery location information in a clear, readable format.

WHEN a customer views their address list, THE system SHALL show the default address at the top of the list.

IF a customer has many addresses, THE system SHALL paginate the address list with up to 10 addresses per page.

## Seller Rules

Sellers must register with email and password to access seller features on the platform. Seller accounts require administrator approval before they can begin selling products. Sellers can track their account approval status as pending, approved, or rejected. When a seller account is rejected, the specific reason for rejection is communicated to the seller. Rejected sellers may submit a new registration request to attempt approval again. Sellers can delete their account only if they have no pending orders in paid or shipped status. Account deletion is also prevented if there are pending cancellation or refund requests. When deleted, seller products are removed from listings but order history is preserved for legal purposes. The seller shop name remains visible in historical orders even after account deletion.

### Seller Registration Process

WHEN a seller registers for a seller account, THE system SHALL:
1. Require an email address (unique across all accounts)
2. Require a password
3. Create the account with approval status "pending"
4. Prevent the seller from listing products until approval is granted

IF the email is already registered, THE system SHALL reject the registration.
IF the seller has an active pending registration, THE system SHALL reject the new registration attempt.

### Administrator Approval Requirement

THE system SHALL prevent a seller from performing any selling operations until their account is approved by an administrator.

Selling operations include:
- Creating new products
- Editing existing products
- Viewing order items for shipment
- Shipping items
- Processing cancellation requests
- Processing refund requests

WHEN an administrator approves a seller, THE system SHALL change the approval status to "approved" and enable all selling operations.

### Approval Status Tracking

WHEN a seller logs in, THE system SHALL display their current approval status.

Approval status values:
- "pending": Account registered, awaiting administrator review
- "approved": Account approved, all selling operations enabled
- "rejected": Account rejected, selling operations disabled

WHEN approval status changes, THE system SHALL notify the seller of the new status.

### Rejection Reason Disclosure

IF a seller's account is rejected by an administrator, THE system SHALL:
1. Change the approval status to "rejected"
2. Store the rejection reason provided by the administrator
3. Display the rejection reason to the seller when they log in

IF a seller has a rejected account, THE system SHALL display the rejection reason on the account status page.

### Resubmission After Rejection

WHEN a seller with a "rejected" status submits a new registration request, THE system SHALL:
1. Accept the new registration request
2. Reset the approval status to "pending"
3. Allow the administrator to review the new request

IF a seller has an active rejected status, THE system SHALL allow only one new registration request at a time.
IF a seller submits a new registration while a previous rejected request exists, THE system SHALL reject the new submission.

### Account Deletion Eligibility

THE system SHALL prevent account deletion if any of the following conditions exist:
- There are order items with status "paid"
- There are order items with status "shipped"
- There are pending cancellation requests for any order item
- There are pending refund requests for any order item

WHEN a seller attempts to delete their account, THE system SHALL check for pending orders and requests before allowing deletion.
IF the account deletion is prevented, THE system SHALL list the reasons for rejection.

### Product Listing Removal on Account Deletion

WHEN a seller account is successfully deleted, THE system SHALL:
1. Remove all products from active listings (search results and category pages)
2. Mark products as unavailable in any customer carts or wishlists
3. Preserve the seller shop name in historical order records
4. Preserve order history with the original shop names visible

IF a product is removed due to seller account deletion, THE system SHALL NOT allow customers to purchase it.
IF a product is removed from listings, THE system SHALL maintain the product record for historical reference.

### Order History Preservation

WHEN a seller account is deleted, THE system SHALL preserve:
- All completed orders containing seller products
- All order items with their original product details
- The seller's shop name and logo as they appeared at the time of purchase
- All shipment and tracking information
- All reviews written for the seller's products

WHEN viewing historical orders, THE system SHALL display the seller shop name exactly as it was when the order was placed.
IF a seller account is deleted, THE system SHALL prevent any new orders from being created for that seller.

## SellerProfile Rules

Every seller maintains a shop profile containing a shop name, description, and logo image. Shop name, description, and logo are editable by the seller at any time. Each modification to the seller profile creates a snapshot for audit and dispute resolution purposes. Customers can view seller profiles to learn about the shop before making purchases. Profile changes are visible to customers once they take effect. The logo image serves as the shop's visual identity across the platform. Shop name changes are reflected in all future customer-facing content. Previous profile versions are preserved through snapshots even after updates.

### Shop Name Editing Rules

WHEN a seller edits their shop name, THE system SHALL: 1. Validate that the shop name is between 1 and 100 characters 2. Ensure the shop name does not contain prohibited characters 3. Update the shop name across all customer-facing content 4. Create a snapshot of the profile before the change IF the new shop name contains characters that violate the character constraint, THEN THE system SHALL reject the request. IF the shop name is empty or exceeds 100 characters, THE system SHALL reject the request. IF the seller attempts to change the shop name while the account is suspended, THE system SHALL allow the change but products remain hidden.

### Shop Description Management Rules

WHEN a seller edits their shop description, THE system SHALL: 1. Preserve the full description text without character truncation 2. Create a snapshot of the profile before the change 3. Update the description visible to customers immediately AFTER the change IF the description is modified, THEN customers viewing the profile SHALL see the updated description. IF the description contains HTML markup, THE system SHALL sanitize and strip all tags. THE system SHALL preserve the previous description text in the snapshot record.

### Logo Image Management Rules

WHEN a seller updates their logo image, THE system SHALL: 1. Replace the existing logo image with the new image 2. Create a snapshot of the profile including the old and new logo URL 3. Update the logo visible to customers across all pages IF the seller uploads a new logo, THEN the new logo becomes the shop's visual identity 4. Preserve the old logo URL in the snapshot for audit purposes. IF the new logo image fails to load or is corrupted, THE system SHALL retain the previous logo image. THE system SHALL ensure the logo is accessible in order histories and reviews even after deletion.

### Profile Snapshot Creation Rules

WHENEVER any seller profile field is modified, THE system SHALL create a snapshot that includes: 1. The record type identifier (SellerProfile) 2. The seller's ID 3. A timestamp of when the change was made 4. A JSON object of all fields that were changed 5. The values before the change 6. The values after the change IF the profile is edited, THEN the snapshot SHALL be immutable and cannot be deleted. IF the profile is deleted, THE snapshots SHALL continue to exist for dispute resolution purposes. SUPER ADMINISTRATORS SHALL have read access to all snapshots. THE SELLER WHO OWNS the profile SHALL have read access to their own snapshots.

### Customer Profile Viewing Rules

WHEN a customer views a seller profile, THE system SHALL display: 1. Current shop name 2. Current shop description 3. Current logo image 4. The number of products offered 5. The average rating of the shop's products IF the seller's account is suspended, THEN THE system SHALL display a message indicating the shop is not accepting new orders. IF the seller's account is deleted, THEN the customer SHALL see the last snapshot of the shop name in order histories. THE system SHALL NOT display private seller information such as email address or approval status. Customers SHALL have read-only access to seller profiles.

### Shop Visibility and Identity Rules

WHEN a seller account state changes, THE system SHALL apply visibility rules: 1. Approved sellers' shops are visible in search and category pages 2. Pending approval sellers' shops are hidden from all customer views 3. Rejected sellers' shops are hidden from all customer views 4. Suspended sellers' shops remain visible but products cannot be purchased 5. Deleted seller accounts preserve shop names in order histories IF a seller account is deleted, THEN the shop name SHALL appear as "[deleted]" in customer order histories. IF a product is deleted from a visible shop, THEN the product SHALL no longer appear in search results. THE system SHALL ensure that shop identity remains consistent across all customer-facing content at any point in time.

### Profile Edit History Access Rules

WHEN a seller accesses their profile edit history, THE system SHALL: 1. Display a chronological list of all profile modifications 2. Show the timestamp of each edit 3. Display the fields that were changed 4. Show the values before and after each change IF a seller requests to view their edit history, THEN THE system SHALL display up to the 50 most recent edits IF the seller account is suspended, THE system SHALL STILL allow access to edit history. IF the seller account is deleted, THEN the edit history SHALL be preserved and accessible to administrators for dispute resolution. THE system SHALL NOT allow sellers to delete or modify their own edit history records.

## Category Rules

Products are organized into a hierarchical category structure with one level of subcategory nesting. Categories contain a name and description for organizing products effectively. Categories are created and managed exclusively by administrators to maintain platform organization. Customers can browse the complete list of available categories to find products. Each category displays all products assigned to it and its subcategories. Subcategories cannot have their own nested subcategories; nesting is limited to one level. Category changes do not affect existing products unless products are moved to different categories. Administrators can delete categories, and products in deleted categories become uncategorized.

### Category Hierarchy Structure

Categories organize products in a hierarchical structure with parent-child relationships.

WHEN a customer browses categories, THE system SHALL display the complete category tree showing parent categories and their subcategories.

THE system SHALL ensure that categories can have at most one parent category.

THE system SHALL display categories in a hierarchical format that clearly indicates parent-child relationships.

WHEN a category is selected, THE system SHALL show all products in that category and its subcategories (if it has subcategories).

THE system SHALL allow one level of category nesting only.

### Subcategory Nesting Limit

Category nesting is strictly limited to one level to maintain platform organization.

IF a category already has subcategories, THE system SHALL NOT allow adding additional subcategories to those subcategories.

THE system SHALL enforce a one-level subcategory nesting limit across all categories.

WHEN a subcategory is created, THE system SHALL validate that its parent category does not already have subcategories.

THE system SHALL display the nesting level information in category management interfaces.

IF a subcategory is deleted, THE system SHALL preserve all products assigned to that subcategory (they remain in the parent category's view).

### Administrator Category Management

Only administrators can create, edit, and delete categories on the platform.

WHEN an administrator creates a category, THE system SHALL require a name and optional description.

WHEN an administrator edits a category, THE system SHALL require the category name to remain unique.

THE system SHALL allow administrators to assign categories to products during product creation.

IF a category has existing products, THE system SHALL still allow the administrator to edit the category name and description.

WHEN an administrator deletes a category, THE system SHALL move all products in that category to uncategorized status.

THE system SHALL prevent non-administrators from creating or modifying categories.

### Customer Category Browsing

Customers can browse and view categories to discover products.

WHEN a customer views the categories page, THE system SHALL display all active categories with their subcategories.

WHEN a customer selects a category, THE system SHALL show all products in that category and its subcategories.

THE system SHALL display category names and descriptions when browsing.

IF a category is empty, THE system SHALL still display it in the category list.

WHEN a customer browses products within a category, THE system SHALL sort products by default (newest first) unless overridden by user sorting preference.

### Product Organization by Category

Products must be organized within the category hierarchy.

WHEN a seller creates a product, THE system SHALL require selection of a category (parent or subcategory).

THE system SHALL allow products to be assigned to either parent categories or subcategories.

WHEN a product is assigned to a subcategory, THE system SHALL also display it in the parent category's product listings.

IF a product's category is edited, THE system SHALL update all product listings accordingly.

WHEN a product is moved from a subcategory to a different subcategory, THE system SHALL update parent category associations.

THE system SHALL ensure every product has exactly one active category assignment.

### Uncategorized Product Handling

Products without a category assignment are handled as uncategorized.

WHEN a category is deleted, THE system SHALL automatically move all products to uncategorized status.

UNCATEGORIZED products SHALL still be visible in search results but SHALL NOT appear in any category browsing.

THE system SHALL display a label "Uncategorized" for products without category assignment.

WHEN a product is uncategorized, sellers SHALL be notified and encouraged to assign a category.

THE system SHALL NOT allow products to exist without a category assignment permanently.

### Category Deletion Consequences

Deleting categories has specific consequences for products and customer experience.

WHEN an administrator deletes a category, THE system SHALL move all products in that category to uncategorized status.

THE system SHALL NOT delete products when a category is deleted.

WHEN a category with subcategories is deleted, THE system SHALL move all subcategory products to uncategorized.

THE system SHALL preserve category history records for administrative audit purposes.

WHEN a deleted category is referenced in reports, THE system SHALL display the category name but mark it as deleted.

THE system SHALL notify sellers whose products become uncategorized after category deletion.

### Category Hierarchy Management

Administrators manage the complete category hierarchy and its structure.

WHEN an administrator creates a subcategory, THE system SHALL require the parent category selection.

THE system SHALL validate that the parent category does not already have subcategories (one-level nesting rule).

WHEN an administrator reorders categories, THE system SHALL update the display order in the category tree.

THE system SHALL allow administrators to view the complete category hierarchy structure.

WHEN an administrator edits a category name, THE system SHALL update all product listings that reference that category.

THE system SHALL maintain category relationship data for all category operations.

## Product Rules

Sellers can create products with a required name, description, category, and base price. Products belong to the seller who created them and cannot be transferred to other sellers. Sellers can edit their own products at any time to update information. Every product edit creates a snapshot preserving the previous state for audit purposes. Products can only be deleted if no variants have pending orders in paid or shipped status. Cancellation or refund requests for any variant also prevent product deletion. Deleting a product removes all its variants and inventory records from the system. Deleted products no longer appear in search results or category listings. Sellers can view snapshots of their products even after deletion occurs. Administrators can view snapshots of any product on the platform for oversight.

### Product Creation Requirements

### Product Creation Requirements

WHEN a seller creates a product, THE system SHALL:
1. Require a product name
2. Require a product description
3. Require a category assignment (including subcategory option)
4. Require a base price that is greater than zero
5. Associate the product with the creating seller
6. Require at least one product variant for the product to be purchasable

IF the product name is empty or exceeds 500 characters, THE system SHALL reject the request.
IF the description is empty, THE system SHALL reject the request.
IF the selected category does not exist, THE system SHALL reject the request.
IF the base price is zero or negative, THE system SHALL reject the request.
IF the product has no variants, THE system SHALL mark it as "unavailable" in search results.

WHEN a product is created, THE system SHALL create an initial snapshot recording the product's state at creation time.

### Product Ownership Rules

### Product Ownership Rules

THE system SHALL enforce that a product belongs exclusively to the seller who created it.

WHEN a seller attempts to access a product they did not create, THE system SHALL reject the request unless the seller has administrator privileges.

IF a seller account is deleted, THE system SHALL preserve all order history and snapshots associated with that seller's products.

IF a seller account is suspended, THE system SHALL:
1. Hide the seller's products from search and category listings
2. Prevent new purchases of the seller's products
3. Allow the seller to continue processing existing orders (shipping items, responding to cancellation/refund requests)
4. Prevent the seller from creating new products or editing existing products

WHEN a product is deleted, THE system SHALL preserve all order items referencing that product for historical and legal purposes.

THE system SHALL NOT allow product transfers between sellers. Products can only be deleted and recreated by a new seller if the original product must be changed.

### Product Editing Capabilities

### Product Editing Capabilities

WHEN a seller edits their own product, THE system SHALL:
1. Allow updates to product name
2. Allow updates to product description
3. Allow updates to category assignment
4. Allow updates to base price
5. Create a snapshot capturing the before and after state
6. Record the timestamp of the edit

IF the seller attempts to edit a product they do not own, THE system SHALL reject the request unless the seller has administrator privileges.

IF the seller attempts to edit a suspended account's product, THE system SHALL reject the request.

IF the new name exceeds 500 characters, THE system SHALL reject the request.

IF the new base price is zero or negative, THE system SHALL reject the request.

IF the selected category does not exist, THE system SHALL reject the request.

WHEN a product edit is successful, THE system SHALL make the updated information immediately visible in search and category listings (assuming the seller is not suspended).

THE system SHALL preserve all product snapshots even after the product itself is deleted.

### Product Deletion Restrictions

### Product Deletion Restrictions

THE system SHALL NOT allow a seller to delete a product if any variant of that product has:
1. An order item with status "paid"
2. An order item with status "shipped"
3. A pending cancellation request
4. A pending refund request

WHEN a seller attempts to delete a product that violates deletion restrictions, THE system SHALL:
1. Reject the deletion request
2. Display a clear message indicating which variants prevent deletion
3. Specify the reason (pending orders or pending requests)

IF all variants of a product are deleted, THE system SHALL also delete all inventory records for those variants.

WHEN a product is deleted, THE system SHALL:
1. Remove the product from all search results
2. Remove the product from all category listings
3. Mark the product as unavailable in customer wishlists (automatically removing from wishlists)
4. Delete all product variants and their inventory records
5. Preserve all snapshots created before deletion

THE system SHALL prevent deletion of products by sellers who do not own the product, unless the seller has administrator privileges.

### Product Oversight by Administrators

### Product Oversight by Administrators

ADMINISTRATORS CAN:
1. View all products on the platform regardless of ownership
2. View snapshots of any product
3. Delete any product for policy violations
4. View products from suspended sellers

WHEN an administrator views a product, THE system SHALL display:
1. All product information including name, description, category, and price
2. All product variants with their stock quantities
3. All product images
4. All snapshots for the product
5. The seller who created the product
6. Order history referencing the product

IF an administrator deletes a product, THE system SHALL:
1. Remove the product from all search and category listings
2. Delete all variants and inventory records
3. Preserve all snapshots for audit purposes
4. Preserve all order items that reference the product
5. Log the deletion action for audit tracking

ADMINISTRATORS CANNOT:
1. Transfer product ownership between sellers
2. Modify product information directly (must use snapshot tracking)
3. Delete snapshots once created

THE system SHALL display product snapshots to administrators in reverse chronological order (newest first).

### Product Audit History and Snapshots

### Product Audit History and Snapshots

EVERY product edit creates a snapshot that preserves:
1. The timestamp of the change
2. All changed fields and their previous values
3. All unchanged fields for complete record
4. The seller who made the edit

EVERY product variant edit creates a snapshot that preserves:
1. The previous SKU code
2. The previous option values
3. The previous price override (if any)
4. The previous stock quantity
5. The timestamp of the change

EVERY product snapshot is immutable and CANNOT be deleted.

THE system SHALL preserve all product snapshots even after:
1. The product itself is deleted
2. The seller account is deleted
3. The seller account is banned

CUSTOMERS CAN VIEW:
1. Current product information
2. Current variant options and prices

SELLERS CAN VIEW:
1. All snapshots of their own products
2. All snapshots of their own product variants
3. The complete audit history of each edit

ADMINISTRATORS CAN VIEW:
1. All snapshots of any product on the platform
2. The complete audit history of any product
3. Information about who made each change and when

THE system SHALL display snapshots sorted by timestamp (newest first) when viewing audit history.

## ProductVariant Rules

Products can have multiple variants representing different combinations of options like color or size. Each variant requires a unique SKU code and option values describing the specific combination. Variants have an optional price that can differ from the product's base price. Stock quantity is required for each variant and starts at zero when created. Sellers can add new variants to their products to offer more choices. Variants can be edited to update SKU codes, option values, or pricing. Every variant edit creates a snapshot to preserve the previous configuration. Variants can only be deleted if no pending orders exist for that specific variant. Products must have at least one variant to be purchasable by customers. Products with no variants are visible in search but marked as unavailable.

### Variant Option Combinations

WHEN a seller creates a product variant, THE system SHALL require option values describing the specific combination (e.g., color: "Red", size: "Large").

THE system SHALL allow multiple option fields per variant to represent complex combinations.

WHEN a variant is created, THE system SHALL validate that option values are meaningful and distinguishable from other variants of the same product.

IF two variants have identical option values, THE system SHALL reject the creation request.

WHEN a customer views a product, THE system SHALL display all available variant option combinations.

IF a product has no variants with available stock, THE system SHALL show all variants as "out of stock".

WHEN adding items to cart, THE system SHALL require the customer to select a specific variant with defined option values.

THE system SHALL prevent customers from purchasing products where no variant options have been defined.

THE system SHALL validate that option values match the expected format defined by the product's option structure.

IF option values are invalid or empty, THE system SHALL reject the variant creation or editing request.

### Unique SKU Requirement

WHEN a seller creates a product variant, THE system SHALL require a unique SKU code for that variant.

THE system SHALL validate that the SKU code is unique across all variants of the same product.

THE system SHALL NOT allow SKU codes that are identical to any existing variant of the same product.

IF a duplicate SKU code is detected, THE system SHALL reject the variant creation or editing request.

WHEN a customer views a variant in the shopping cart, THE system SHALL display the SKU code for reference.

THE system SHALL generate a warning if a SKU code exceeds 50 characters in length.

THE system SHALL allow SKU codes to contain alphanumeric characters, hyphens, and underscores.

WHEN a seller edits a SKU code, THE system SHALL validate uniqueness before applying the change.

IF a variant is deleted, THE system SHALL NOT reuse that SKU code for a new variant created after deletion.

THE system SHALL store the SKU code as immutable once associated with an order item.

### Optional Price Override

WHEN a seller creates a product variant, THE system SHALL allow an optional price override different from the product's base price.

IF no price override is provided, THE system SHALL use the product's base price for the variant.

WHEN a seller sets a price override, THE system SHALL require the price to be a positive number greater than zero.

IF a price override is set to zero or negative, THE system SHALL reject the variant creation or editing request.

WHEN a variant's price is overridden, THE system SHALL display the overridden price to customers on product listing pages.

IF multiple variants have different price overrides, THE system SHALL show the price range on the product listing.

THE system SHALL calculate order totals using the variant's price at the time of purchase, not the current price.

WHEN a price override is edited, THE system SHALL create a snapshot capturing the before and after values.

IF a variant's price is set to null, THE system SHALL revert to using the product's base price.

THE system SHALL display overridden prices clearly differentiated from the base price in the product detail page.

### Stock Quantity Management

WHEN a product variant is created, THE system SHALL require an initial stock quantity (starting at zero by default).

THE system SHALL allow sellers to add inventory (restock) with a positive quantity and reason.

WHEN an order is placed, THE system SHALL automatically decrease stock quantity for each purchased variant.

WHEN a cancellation is approved, THE system SHALL automatically increase stock quantity via inventory record.

WHEN a refund is approved, THE system SHALL automatically increase stock quantity via inventory record.

IF a variant's stock reaches zero, THE system SHALL mark the variant as "out of stock".

THE system SHALL prevent customers from adding out-of-stock variants to their shopping cart.

WHEN a variant's stock is less than the quantity in cart, THE system SHALL display a warning to the customer.

THE system SHALL calculate current stock by summing all inventory records for that variant.

THE system SHALL maintain an immutable history of all inventory changes with timestamps and reasons.

### Variant Addition Process

WHEN a seller adds a variant to a product, THE system SHALL require option values to describe the variant.

WHEN a seller adds a variant to a product, THE system SHALL require a unique SKU code.

WHEN a seller adds a variant to a product, THE system SHALL require a stock quantity value.

THE system SHALL allow sellers to optionally specify a price override for the new variant.

WHEN a variant is added, THE system SHALL validate all required fields before creation.

IF required fields are missing, THE system SHALL reject the variant addition and display error messages.

THE system SHALL allow sellers to add multiple variants to a single product.

WHEN multiple variants are added, THE system SHALL ensure each has a unique SKU code.

IF a product has no variants after adding, THE system SHALL mark it as "unavailable" for purchase.

THE system SHALL create a snapshot immediately after successful variant creation.

### Variant Editing Rules

WHEN a seller edits a product variant, THE system SHALL allow updates to SKU code, option values, and price.

WHEN a variant is edited, THE system SHALL create a snapshot recording the before and after values.

THE system SHALL allow sellers to edit variants only for products they own.

IF a variant has pending order items, THE system SHALL allow editing but SHALL NOT delete the variant.

WHEN a SKU code is changed, THE system SHALL validate uniqueness before applying the edit.

THE system SHALL allow sellers to edit the price override independently of the base price.

IF a variant is marked as inactive, THE system SHALL remove it from customer-facing listings.

WHEN option values are edited, THE system SHALL validate they remain distinct from other variants.

THE system SHALL preserve inventory records during variant editing (no stock reset).

THE system SHALL require the seller to review the snapshot before confirming variant edits.

### Single Variant Deletion Constraint

WHEN a seller attempts to delete a product variant, THE system SHALL check for pending order items.

IF any order item has status "paid" or "shipped" for that variant, THE system SHALL reject the deletion.

IF any cancellation request is pending for that variant, THE system SHALL reject the deletion.

IF any refund request is pending for that variant, THE system SHALL reject the deletion.

WHEN all conditions are satisfied, THE system SHALL allow deletion of the variant.

THE system SHALL delete all inventory records when a variant is deleted.

THE system SHALL create a snapshot of the variant before deletion.

IF a variant is deleted, THE system SHALL remove it from all active shopping carts.

WHEN a variant is deleted, THE system SHALL NOT allow re-creation with the same SKU code.

THE system SHALL preserve snapshots of deleted variants for audit purposes.

### Purchasability Requirement

WHEN a product is listed in search results, THE system SHALL verify it has at least one variant.

IF a product has no variants, THE system SHALL mark it as "unavailable" for purchase.

WHEN a customer attempts to purchase a product, THE system SHALL require selection of a specific variant.

THE system SHALL NOT allow purchase of products where all variants are out of stock.

IF all variants are deleted from a product, THE system SHALL remove the product from search results.

WHEN a product has variants, THE system SHALL require at least one variant to have stock greater than zero.

THE system SHALL prevent checkout if the selected variant becomes unavailable.

IF a variant is removed from a cart due to deletion, THE system SHALL notify the customer.

WHEN viewing a product detail page, THE system SHALL show purchase availability based on variant stock.

THE system SHALL enforce that only active variants can be added to shopping cart.

### Variant Snapshot Creation

WHEN a variant is created, THE system SHALL create a snapshot capturing all variant fields.

WHEN a variant is edited, THE system SHALL create a snapshot with before and after values.

THE system SHALL record the timestamp of each snapshot creation.

THE system SHALL store the SKU code, option values, price override, and stock quantity in each snapshot.

WHEN a variant is deleted, THE system SHALL create a final snapshot of the deleted variant.

THE system SHALL allow sellers to view snapshots of their own variants.

THE system SHALL allow administrators to view snapshots of any variant on the platform.

WHEN a variant is associated with an order item, THE system SHALL preserve the variant state in the order item snapshot.

THE system SHALL prevent deletion or modification of any snapshot.

THE system SHALL make snapshots available for dispute resolution and audit purposes.

## ProductImage Rules

Sellers can upload multiple images for each product to display from different angles. The first image in the sequence serves as the main thumbnail for search and listing pages. Sellers can reorder images to change which one appears as the primary thumbnail. Images can be deleted from products when no longer needed or when product content changes. Image changes are automatically included in product snapshots when the product is edited. All images associated with a product are visible on the product detail page. The display order determines the sequence in which images appear to customers. Deleting images does not create a snapshot of the deleted images themselves.

### Multiple Image Upload

WHEN a seller uploads images for a product, THE system SHALL accept multiple images in a single upload operation.

IF a seller attempts to upload more than 20 images for a product, THE system SHALL reject the excess images.

THE system SHALL validate that each uploaded image meets the required image format standards.

IF an uploaded image fails validation, THE system SHALL reject that specific image but continue processing other images in the batch.

### Primary Image Selection

THE system SHALL designate the first image in the display sequence as the primary thumbnail image.

WHEN a product is created, THE system SHALL automatically set the first uploaded image as the primary image.

THE system SHALL display the primary image on all product listing pages and search results.

WHEN the primary image is deleted, THE system SHALL automatically promote the next image in the sequence to become the new primary image.

### Image Reordering

WHEN a seller reorders product images, THE system SHALL update the display sequence accordingly.

THE system SHALL allow sellers to drag and drop images to change their position in the display sequence.

IF a seller changes the display order, THE system SHALL update the thumbnail image if the previous primary image is moved to a lower position.

THE system SHALL preserve the complete image display sequence even after product edits.

### Image Deletion Policy

WHEN a seller deletes an image from a product, THE system SHALL remove it from all product views.

IF a seller attempts to delete the last remaining image, THE system SHALL reject the deletion.

THE system SHALL prevent deletion of images when the product has active pending orders.

Deleting an image does not create a snapshot of the deleted image itself.

### Snapshot Inclusion

WHEN a product is edited, THE system SHALL include all associated images in the product snapshot.

THE system SHALL record the complete image set including URLs, display order, and timestamps.

IF images are added or removed during a product edit, THE system SHALL capture both the old and new image states in the snapshot.

Administrators can view the complete image history through product snapshots.

### Thumbnail Image Role

THE system SHALL use the primary image as the thumbnail for all product search results.

THE system SHALL display the thumbnail image in category listing pages.

THE system SHALL show the thumbnail image in the customer's shopping cart when adding products.

The thumbnail image shall be the first image in the display sequence at all times.

### Image Display Sequence

THE system SHALL display product images to customers in the order specified by the seller.

THE system SHALL show all images for a product on the product detail page.

IF a product has no images, THE system SHALL display a placeholder image on the detail page.

THE system SHALL maintain the display sequence through all customer-facing views.

### Product Image Management

WHEN a seller views their product images, THE system SHALL show the complete list with current display order.

THE system SHALL allow sellers to preview each image before setting it as primary.

IF a product is deleted, THE system SHALL remove all associated images from the product.

THE system SHALL prevent sellers from managing images for products they do not own.

## Wishlist Rules

Customers can add products to their personal wishlist to save items for later consideration. Wishlists display products rather than specific variants, allowing broad saving of item interest. The wishlist interface is paginated to handle large collections of saved products. Customers can remove products from their wishlist when they no longer wish to save them. If a seller deletes a product, it is automatically removed from all customer wishlists. Wishlist items persist until manually removed or when the underlying product is deleted. Customers can view their complete wishlist to review saved products at any time. Products removed due to deletion no longer appear in any customer's wishlist.

### Product Adding to Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Verify the customer is authenticated
2. Check the product exists and is active
3. Add the product to the customer's wishlist
4. Record the timestamp of when the product was added

IF the customer is not authenticated, THE system SHALL reject the request and prompt for login.
IF the product does not exist or has been deleted, THE system SHALL reject the request and display an error message.
IF the product is already in the customer's wishlist, THE system SHALL NOT create a duplicate entry.

THE system SHALL allow a customer to have multiple products in their wishlist without a defined maximum limit.
THE wishlist SHALL store products at the product level, not at the variant level.

WHEN adding a product to the wishlist, THE system SHALL NOT require selection of a specific variant.

### Wishlist Display and Pagination

WHEN a customer views their wishlist, THE system SHALL display products in paginated format.

IF a customer's wishlist contains more products than can be displayed on a single page, THE system SHALL show multiple pages of results.

THE system SHALL display the following information for each product in the wishlist:
1. Product main image (thumbnail)
2. Product name
3. Product base price (or price range if variants have different prices)
4. Seller shop name
5. Average rating if reviews exist

IF a product in the wishlist has no variants with available stock, THE system SHALL mark the product as unavailable but retain it in the wishlist.

WHEN viewing the wishlist, THE system SHALL allow customers to navigate between pages of results.
THE system SHALL sort wishlist products by the date they were added, with newest additions shown first by default.

### Product Removal from Wishlist

WHEN a customer removes a product from their wishlist, THE system SHALL delete that product entry from their wishlist.

IF the customer is not authenticated, THE system SHALL reject the removal request.

WHEN a product is removed from the wishlist, THE system SHALL NOT affect:
1. The product listing on the platform
2. The product's availability for purchase
3. The product's reviews or ratings
4. The product's stock quantities

THE customer SHALL have the ability to remove any product from their wishlist at any time.

IF the customer attempts to remove a product that is no longer in their wishlist, THE system SHALL display a message indicating the product was not found in the wishlist.

THE removal action SHALL be immediate and visible to the customer upon confirmation.

### Automatic Product Deletion Propagation

WHEN a seller deletes a product from the platform, THE system SHALL automatically remove that product from all customer wishlists.

IF a product is deleted due to policy violations or administrative action, THE system SHALL remove it from all customer wishlists without requiring explicit action from each customer.

WHEN a product is deleted, THE system SHALL NOT:
1. Notify customers whose wishlists contained the deleted product
2. Preserve deleted products in wishlists
3. Maintain any reference to deleted products in wishlist records

THE deletion propagation SHALL occur immediately upon product deletion.

IF a deleted product had been added to wishlists, THE system SHALL preserve the integrity of the remaining wishlists by removing only the deleted product entries.

### Wishlist Persistence Rules

WHEN a customer adds a product to their wishlist, THE system SHALL persist the wishlist entry until explicitly removed or the product is deleted.

THE wishlist SHALL be associated with the customer account and persist across login sessions.

IF a customer's account is deleted, THE system SHALL remove the customer's entire wishlist as part of the account deletion process.

THE system SHALL preserve wishlist entries even if:
1. The product price changes
2. The product stock quantity changes
3. The product images are updated
4. The product description is modified

WHEN a customer logs into their account, THE system SHALL load their complete wishlist from persistent storage.

THE wishlist data SHALL be immutable once created, with only addition and removal operations allowed (no in-place modifications to wishlist entries).

### Wishlist Viewing and Saved Items Management

WHEN a customer views their wishlist, THE system SHALL display all products they have saved for later consideration.

IF a customer has no products in their wishlist, THE system SHALL display an empty state message indicating no saved items.

THE system SHALL allow customers to:
1. View their complete wishlist
2. Navigate through paginated results
3. Remove individual products from the wishlist
4. Add new products to the wishlist

WHEN a variant of a wishlist product becomes unavailable (out of stock), THE system SHALL mark it as unavailable but retain the product in the wishlist.

IF a customer adds a product to their wishlist that was previously deleted and then re-added by the seller, THE system SHALL allow the re-addition as a new wishlist entry.

THE system SHALL provide clear visual indicators for products in the wishlist that are no longer available for purchase.

## ShoppingCart Rules

Customers add specific product variants to their shopping cart with chosen quantities. When adding the same variant again, quantities are combined into a single cart line rather than creating duplicates. The cart displays each item with product name, variant options, price, quantity, and subtotal. Customers can adjust quantities of items already in their cart as needed. Items can be removed from the cart individually before checkout proceeds. The cart calculates the total price of all items automatically. Warnings are displayed when variant stock is insufficient for the requested cart quantity. Deleted or out-of-stock variants are marked as unavailable in the cart. The cart maintains state between browsing sessions for returning customers.

### Variant Selection Requirement

WHEN a customer adds a product to their shopping cart, THE system SHALL require the customer to select a specific product variant, not just the product.

WHEN a customer selects a variant for cart addition, THE system SHALL capture the variant's SKU code, option values, and current price.

THE system SHALL reject cart addition if the customer has not selected a specific variant.

IF a product has no variants, THE system SHALL prevent the customer from adding it to the cart.

IF a variant is marked as inactive, THE system SHALL prevent the customer from adding it to the cart.

WHEN a customer attempts to add an out-of-stock variant to the cart, THE system SHALL reject the request.

IF the selected variant's stock quantity is zero, THE system SHALL display a message indicating the variant is unavailable for purchase.

THE system SHALL verify that the variant belongs to a product that has not been deleted by the seller before adding to cart.

### Quantity Combination Logic

WHEN a customer adds a variant to the cart that already exists in their cart, THE system SHALL combine the new quantity with the existing quantity.

THE system SHALL NOT create duplicate cart lines for the same variant.

IF a customer adds the same variant again, THE system SHALL add the new quantity to the existing quantity in that cart line.

WHEN a customer modifies an existing cart line's quantity, THE system SHALL replace the existing quantity with the new quantity, not add to it.

THE system SHALL ensure the combined quantity does not exceed the maximum allowed per cart line.

IF the combined quantity would exceed available stock, THE system SHALL cap the quantity at the available stock level and notify the customer.

THE system SHALL update the cart subtotal automatically when quantities are combined.

IF a customer removes an item and then re-adds the same variant, THE system SHALL treat it as a new addition and set the quantity to one.

### Cart Line Item Display

WHEN displaying the cart, THE system SHALL show each cart line with the following information: product name, variant options, unit price, quantity, and subtotal.

THE system SHALL display the variant's option values (e.g., color, size) alongside the product name.

WHEN displaying the cart, THE system SHALL show the unit price at the time the item was added to the cart.

THE system SHALL calculate and display the subtotal for each line as unit price multiplied by quantity.

THE system SHALL display the product's main image thumbnail for each cart line item.

WHEN a customer views their cart, THE system SHALL show the seller shop name for each item.

THE system SHALL display the total price of all cart items at the bottom of the cart page.

IF a product has been deleted but the cart item remains, THE system SHALL still display the product name and variant information from the cart snapshot.

### Quantity Adjustment Process

WHEN a customer adjusts the quantity of a cart item, THE system SHALL allow quantities from 1 to the maximum allowed per item.

IF a customer attempts to set quantity to zero, THE system SHALL automatically remove that item from the cart.

WHEN a customer increases the quantity, THE system SHALL check if the new total quantity exceeds available stock.

IF the requested quantity exceeds available stock, THE system SHALL display a warning and prevent the quantity change.

THE system SHALL update the cart subtotal immediately after quantity adjustment.

WHEN a customer changes quantity, THE system SHALL recalculate the cart total price automatically.

IF the product price has changed since the item was added to the cart, THE system SHALL display the new price and update the subtotal accordingly.

THE system SHALL allow customers to adjust quantities as many times as needed before checkout.

### Cart Removal Functionality

WHEN a customer requests to remove an item from their cart, THE system SHALL remove that specific cart line.

THE system SHALL allow customers to remove individual items from their cart at any time before checkout.

WHEN an item is removed from the cart, THE system SHALL update the cart subtotal and total price automatically.

IF a customer removes all items from their cart, THE system SHALL display an empty cart message.

THE system SHALL provide a confirmation step before permanently removing items that have been in the cart for an extended period.

WHEN a customer removes an item from the cart, THE system SHALL immediately recalculate stock availability for the returned items.

THE system SHALL allow customers to remove multiple items in a single action through bulk removal.

IF a customer is checking out and an item is removed mid-transaction, THE system SHALL prevent checkout completion until all remaining items are valid.

### Total Price Calculation

THE system SHALL calculate the cart total price by summing all line subtotals.

THE system SHALL update the total price immediately when any cart item is added, removed, or modified.

WHEN a product price changes in the system, THE system SHALL update all cart items referencing that product with the new price.

THE system SHALL display tax information separately from the subtotal and total price.

IF a promotional discount applies to cart items, THE system SHALL display the discount amount separately from the subtotal.

THE system SHALL recalculate the total price when shipping costs are determined based on cart items.

WHEN a cart item's unit price changes, THE system SHALL display the price change notification to the customer.

THE system SHALL ensure the total price is always accurate and reflects current pricing for all items.

### Stock Availability Warnings

WHEN the stock quantity for a cart item is less than the quantity in the cart, THE system SHALL display a warning message to the customer.

THE system SHALL update the stock warning display in real-time as inventory changes occur.

IF the stock becomes completely depleted while an item remains in the cart, THE system SHALL mark that item as unavailable.

THE system SHALL show the available stock quantity in the warning message.

WHEN a customer attempts to adjust quantity and the new quantity exceeds available stock, THE system SHALL display a specific out-of-stock warning.

THE system SHALL prevent checkout if any cart item has insufficient stock.

IF multiple cart items have stock warnings, THE system SHALL display all warnings before allowing checkout.

THE system SHALL automatically reduce the cart quantity to the available stock level when the item was originally added with a higher quantity than now available.

### Unavailable Item Handling

WHEN a product is deleted by the seller, THE system SHALL mark all cart items containing that product as unavailable.

IF a variant is deleted, THE system SHALL mark that specific variant's cart items as unavailable.

WHEN an out-of-stock variant is in the cart, THE system SHALL display the item as unavailable with a clear indicator.

THE system SHALL prevent checkout if any cart item is marked as unavailable.

IF an unavailable item is removed from the cart, THE system SHALL allow the customer to proceed with remaining items.

WHEN a product's category is changed, THE system SHALL preserve the cart item's original category information.

THE system SHALL allow customers to view unavailable items in the cart but prevent purchase.

IF a cart item becomes unavailable due to seller suspension, THE system SHALL display a message explaining the item cannot be purchased.

### Cart State Persistence

THE system SHALL persist cart state between browsing sessions for authenticated customers.

WHEN a logged-in customer adds items to their cart and then logs out, THE system SHALL preserve those items for when they log back in.

IF a customer creates an account while having items in their cart, THE system SHALL associate the cart with the new account.

THE system SHALL automatically remove cart items that reference deleted products when the customer returns to their account.

IF a customer has items in their cart from a previous session and adds new items in the current session, THE system SHALL preserve all items.

THE system SHALL update the cart's last activity timestamp whenever items are added, modified, or removed.

IF a cart has been inactive for more than 30 days, THE system SHALL notify the customer that some items may no longer be available.

THE system SHALL maintain separate carts for different customer sessions if the same customer logs in from multiple devices simultaneously.

## CartItem Rules

Each cart item represents a specific product variant with a selected quantity. Cart items must reference a valid variant that is currently purchasable. The quantity field tracks how many units of that variant the customer wants to purchase. Cart items are linked to the customer's active shopping cart session. Changing quantity updates the line subtotal based on the variant's current price. Items with zero quantity are automatically removed from the cart. Cart items are cleared when an order is successfully placed. Unavailable variants cannot have cart items created or modified.

### Variant Quantity Tracking

WHEN a customer adds a variant to their cart, THE system SHALL create a cart item with a quantity of 1 by default.

WHEN a customer specifies a quantity when adding a variant, THE system SHALL record that quantity in the cart item.

IF a customer adds the same variant that is already in their cart, THE system SHALL combine the quantities instead of creating a separate cart item.

IF a customer attempts to add a quantity of 0, THE system SHALL reject the request and display an error message.

IF a customer attempts to add a quantity greater than the available stock, THE system SHALL limit the quantity to the available stock and display a warning.

WHEN a customer changes the quantity of a cart item, THE system SHALL update the recorded quantity and recalculate the line subtotal.

IF a customer reduces the quantity of a cart item, THE system SHALL update the quantity to the new value.

IF a customer attempts to reduce a quantity below 1, THE system SHALL reject the request and maintain the minimum quantity of 1.

### Cart Session Linkage

EACH customer SHALL have exactly one active shopping cart session at any time.

WHEN a customer logs in, THE system SHALL associate their shopping cart with their customer account.

IF a cart item belongs to a customer who is logged out, THE system SHALL store the cart item in a temporary session cart.

WHEN a customer who has a temporary session cart logs in, THE system SHALL merge the temporary cart items into their permanent cart.

IF the same variant exists in both the temporary and permanent cart during merge, THE system SHALL combine the quantities.

IF a customer creates a new account while having cart items, THE system SHALL associate the cart items with the new account.

THE system SHALL maintain cart session linkage even when a customer is temporarily logged out.

WHEN a customer logs out, THE system SHALL preserve the cart items in the temporary session for later retrieval upon login.

### Line Subtotal Calculation

WHEN a cart item is created or modified, THE system SHALL calculate the line subtotal as: variant price × cart item quantity.

IF a variant has a price override, THE system SHALL use the override price for line subtotal calculation.

IF a variant does not have a price override, THE system SHALL use the base price for line subtotal calculation.

WHEN a customer changes the quantity of a cart item, THE system SHALL recalculate the line subtotal based on the new quantity.

IF the variant price changes after a cart item is created, THE system SHALL update the line subtotal to reflect the new price.

THE system SHALL display the line subtotal for each cart item to the customer.

THE system SHALL display the sum of all line subtotals as the cart total.

IF a cart item becomes unavailable, THE system SHALL mark the line subtotal as unavailable but preserve the calculation.

### Zero Quantity Cleanup

WHEN a customer reduces a cart item quantity to 0, THE system SHALL automatically remove that cart item from the cart.

IF a cart item quantity becomes 0 through any means, THE system SHALL immediately delete that cart item.

THE system SHALL NOT allow cart items with quantity of 0 to exist in the cart.

WHEN the system removes a zero-quantity cart item, THE system SHALL update the cart total to reflect the removal.

IF a customer attempts to set a cart item quantity to 0, THE system SHALL prevent the action and display a minimum quantity message.

THE system SHALL perform zero quantity cleanup automatically without requiring customer confirmation.

WHEN zero quantity cleanup occurs, THE system SHALL log the removal event for audit purposes.

### Order Completion Cleanup

WHEN an order is successfully created and payment is confirmed, THE system SHALL remove all cart items from the customer's cart.

IF an order is successfully placed, THE system SHALL delete all cart items associated with that customer.

IF an order placement fails, THE system SHALL preserve the cart items without any changes.

WHEN a cart item is removed after successful order placement, THE system SHALL NOT restore the cart item automatically.

IF a customer wants to repurchase items after successful order, THE system SHALL require the customer to add items to cart again.

THE system SHALL ensure no cart items persist after a successful order completion.

WHEN order completion cleanup occurs, THE system SHALL log the cart clearing event for audit purposes.

### Availability Validation

WHEN a customer attempts to add a variant to cart, THE system SHALL validate that the variant exists.

IF the variant does not exist, THE system SHALL reject the request with an error message.

WHEN a customer attempts to add a variant to cart, THE system SHALL validate that the variant is currently active.

IF the variant is inactive, THE system SHALL reject the request with an error message.

WHEN a customer attempts to add a variant to cart, THE system SHALL validate that the variant has available stock.

IF the variant stock is 0 (out of stock), THE system SHALL reject the request and display an out of stock message.

WHEN a customer views their cart, THE system SHALL check the availability status of each cart item.

IF a cart item's variant becomes out of stock or deleted while in the cart, THE system SHALL mark that item as unavailable.

THE system SHALL NOT allow unavailable items to be included in the checkout process.

IF a cart item becomes unavailable, THE system SHALL display a warning to the customer.

### Cart Item Lifecycle

A cart item is CREATED when a customer adds a variant to their cart.

A cart item EXISTS when it is visible in the customer's shopping cart with valid quantity.

A cart item is MODIFIED when the customer changes its quantity.

A cart item is REMOVED when the customer deletes it or when quantity becomes 0.

A cart item is CLEARED when an order is successfully placed and all cart items are removed.

A cart item is TRANSFERRED when a logged-out cart is merged with a logged-in account.

WHEN a product associated with a cart item is deleted by the seller, THE system SHALL automatically remove that cart item.

IF a cart item's variant is deleted, THE system SHALL remove that cart item and mark the line as unavailable.

THE system SHALL track the creation timestamp for each cart item.

THE system SHALL track the last modification timestamp for each cart item.

### Cart Item Quantity Limits

WHEN a customer adds a variant to cart, THE system SHALL enforce a maximum quantity limit per cart item.

IF a customer attempts to exceed the maximum quantity, THE system SHALL reject the request with an error message.

THE maximum quantity per cart item SHALL be 99 units.

IF a customer attempts to set a quantity greater than 99, THE system SHALL limit the quantity to 99.

WHEN a variant's available stock is less than the cart item quantity, THE system SHALL display a warning.

IF the variant stock is completely depleted, THE system SHALL reduce the cart item quantity to match available stock.

### Unavailable Variant Handling

WHEN a cart item's variant becomes out of stock, THE system SHALL mark the cart item as unavailable.

IF a cart item is marked as unavailable, THE system SHALL prevent the customer from checking out.

WHEN a product is deleted by the seller, THE system SHALL remove all cart items for that product.

IF a variant is deleted, THE system SHALL remove cart items referencing that variant.

WHEN a cart item becomes unavailable, THE system SHALL display a clear message explaining the unavailability.

THE system SHALL NOT automatically remove unavailable cart items; the customer must manually remove them.

WHEN an unavailable cart item is present, THE system SHALL show the unavailable status prominently in the cart display.

### Cart Item Price Consistency

WHEN a cart item is created, THE system SHALL record the current price of the variant.

IF the variant price changes after cart item creation, THE system SHALL update the cart item to the new price.

WHEN the line subtotal is calculated, THE system SHALL use the current variant price.

IF a variant has a price override, THE system SHALL use the override price for the cart item.

WHEN a cart item is displayed, THE system SHALL show the current price to the customer.

IF the price update causes a significant change, THE system SHALL display a price change notification.

## Order Rules

Orders are created when customers successfully complete the checkout and payment process. Each order contains one or more order items that can be from different sellers. The overall order status is derived from the statuses of all its constituent items. If all items are paid, the order status is paid. When any item is shipped, the order status becomes shipped. The order status is delivered only when all items have been delivered. Orders become cancelled when all items are cancelled. Refunded orders occur when all items have been refunded. Mixed item statuses result in a partially completed order status. The shipping address selected at checkout cannot be changed after order placement.

### Order Creation Trigger

WHEN a customer completes payment successfully, THE system SHALL create a new order.

WHEN creating an order, THE system SHALL:
1. Decrease stock quantities for each purchased variant
2. Remove all purchased variants from the customer's shopping cart
3. Create an order record with a unique order number
4. Create order items for each variant with initial status "paid"
5. Save snapshots of products, variants, and seller profiles with each order item

IF the payment fails, THE system SHALL NOT create an order and SHALL allow the customer to retry.

IF any variant is out of stock at checkout time, THE system SHALL reject the order creation.

IF any variant is deleted by the seller after checkout, THE system SHALL mark the item as unavailable and prevent order completion.

THE system SHALL reject the order creation request when the customer does not have a valid shipping address selected.

WHEN an order is created, THE system SHALL record the current product and variant state in snapshots, including product name, description, variant options, unit price, and seller shop name.

THE system SHALL ensure that inventory records are created with negative quantities when order items are created with status "paid".

### Multi-Item Order Structure

AN order SHALL contain one or more order items.

WHEN an order contains multiple order items, EACH item MAY belong to a different seller.

IF a customer purchases 3 units of the same variant, THE system SHALL create one order item with quantity 3, not three separate items.

ORDER items SHALL be individually trackable with their own status independent of other items in the same order.

THE system SHALL allow individual cancellation of order items with status "paid" without affecting other items in the order.

THE system SHALL allow individual refund requests for order items with status "delivered" without affecting other items in the order.

IF a customer purchases variants from multiple sellers in the same order, THE system SHALL group items by seller for shipment purposes.

ORDER items SHALL contain snapshots of the product, variant, and seller profile at the time of purchase to preserve the original transaction state.

THE system SHALL calculate the overall order total price as the sum of all order item subtotals.

### Order Status Derivation

THE overall order status SHALL be derived from the statuses of all constituent order items.

WHEN all order items in an order have status "paid", THE order status SHALL be "paid".

WHEN any order item in an order has status "shipped" and none have status "delivered", THE order status SHALL be "shipped".

WHEN all order items in an order have status "delivered", THE order status SHALL be "delivered".

WHEN all order items in an order have status "cancelled", THE order status SHALL be "cancelled".

WHEN all order items in an order have status "refunded", THE order status SHALL be "refunded".

WHEN order items have mixed statuses (e.g., some delivered, some refunded, some shipped), THE order status SHALL be "partially completed".

THE system SHALL recalculate order status whenever any order item status changes.

WHEN an order item status changes to "cancelled" or "refunded", THE system SHALL immediately recalculate the overall order status.

### Delivered Order Conditions

AN order SHALL achieve "delivered" status ONLY when all items in the order have status "delivered".

WHEN a customer confirms delivery for a shipment, ALL items in that shipment SHALL change to status "delivered".

IF the customer does not confirm delivery within 14 days from shipment date, THE system SHALL automatically change all items in that shipment to status "delivered".

THE system SHALL NOT allow an order to be marked as delivered until every single item in the order has received delivery confirmation or automatic delivery.

WHEN all items in an order are delivered, THE system SHALL allow customers to write reviews for each delivered product.

THE system SHALL prevent review creation for any item that has not reached status "delivered".

### Cancelled Order Conditions

AN order SHALL achieve "cancelled" status ONLY when all items in the order have status "cancelled".

WHEN a customer requests cancellation for an item with status "paid", THE system SHALL create a cancellation request with reason text.

THE system SHALL allow sellers to approve or reject cancellation requests.

WHEN a seller approves a cancellation request, THE system SHALL:
1. Change the order item status to "cancelled"
2. Process a refund for that item only
3. Create a snapshot of the cancellation request state
4. Restore stock quantity via an inventory record
5. Recalculate the order status

IF a seller rejects a cancellation request, THE system SHALL notify the customer and keep the item status as "paid".

WHEN all items in an order are cancelled, THE system SHALL update the order status to "cancelled".

THE system SHALL allow customers to request cancellation ONLY for items with status "paid" (not yet shipped).

### Refunded Order Conditions

AN order SHALL achieve "refunded" status ONLY when all items in the order have status "refunded".

WHEN a customer requests a refund for an item with status "delivered", THE system SHALL create a refund request with reason text.

THE system SHALL allow refund requests ONLY within 7 days of the item being delivered.

THE system SHALL allow sellers to approve or reject refund requests.

WHEN a seller approves a refund request, THE system SHALL:
1. Change the order item status to "refunded"
2. Process a refund for that item only
3. Create a snapshot of the refund request state
4. Restore stock quantity via an inventory record
5. Recalculate the order status

IF a seller rejects a refund request, THE system SHALL notify the customer and keep the item status as "delivered".

WHEN all items in an order are refunded, THE system SHALL update the order status to "refunded".

THE system SHALL allow refunds ONLY for items with status "delivered" (not yet delivered items cannot be refunded).

### Partially Completed Order Status

AN order SHALL have status "partially completed" WHEN order items have mixed statuses.

WHEN an order contains items with different statuses (e.g., some delivered, some shipped, some cancelled), THE system SHALL assign status "partially completed" to the order.

WHEN any item in a "partially completed" order changes status, THE system SHALL recalculate whether the order should remain "partially completed" or change to another status.

THE system SHALL maintain "partially completed" status as long as the order has items in at least two different statuses.

WHEN all items become delivered, THE system SHALL change order status from "partially completed" to "delivered".

WHEN all items become cancelled, THE system SHALL change order status from "partially completed" to "cancelled".

WHEN all items become refunded, THE system SHALL change order status from "partially completed" to "refunded".

THE system SHALL allow partial cancellation of some items in an order while other items continue processing normally.

### Shipping Address Immutability

WHEN an order is successfully placed, THE shipping address SHALL be immutable and CANNOT be changed.

THE system SHALL lock the shipping address at order creation time and prevent any modifications.

WHEN a customer requests to change the shipping address for an existing order, THE system SHALL reject the request and inform the customer that the address cannot be modified after order placement.

THE system SHALL store the shipping address snapshot with the order record at creation time.

WHEN a customer places an order without a default address, THE system SHALL require the customer to select a shipping address before order completion.

THE system SHALL display the shipping address from the order record when customers view order details.

WHEN a shipment is created for an order item, THE system SHALL reference the immutable shipping address from the original order.

THE system SHALL allow address updates for future orders but SHALL NOT affect the shipping address of already-placed orders.

### Seller Item Grouping for Shipments

A shipment SHALL contain order items from ONE seller only.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipments for each seller.

A seller SHALL be able to choose to ship items individually or bundle multiple items from the same seller into one shipment.

WHEN a seller creates a shipment, THE system SHALL allow the seller to select one or more of their order items to include in the shipment.

ALL items in the same shipment SHALL share the same tracking information (carrier name and tracking number).

WHEN a shipment is created, THE system SHALL change the status of all items in that shipment to "shipped".

A shipment SHALL contain tracking information including carrier name and tracking number.

WHEN a customer confirms delivery for a shipment, THE system SHALL change the status of all items in that shipment to "delivered".

WHEN an order has multiple sellers, THE order status SHALL reflect the latest status among all shipments (shipped if any shipment is shipped but not delivered).

## OrderItem Rules

Each order item represents a purchased product variant with a specific quantity and price. Order items have individual statuses that progress through paid, shipped, delivered, cancelled, or refunded. Different sellers' products can exist in the same order as separate order items. Order items can be individually cancelled or refunded without affecting other items. Each order item preserves a snapshot of the product, variant, and seller profile at purchase time. Item status changes trigger inventory adjustments when applicable. The item status determines what actions are available to customers and sellers. Multiple units of the same variant are combined into a single order item.

### Individual Item Status Tracking

WHEN an order item is created, THE system SHALL assign it the status 'paid' if payment succeeded for that item.

WHILE an order item has status 'paid', THE system SHALL allow the seller to create a shipment containing that item.

WHEN a shipment is created containing an order item, THE system SHALL update that item's status to 'shipped'.

WHILE an order item has status 'shipped', THE system SHALL automatically change its status to 'delivered' after 14 days unless the customer confirms delivery earlier.

WHEN the customer confirms delivery for a shipment, THE system SHALL update all order items in that shipment to status 'delivered'.

IF an order item's status is 'delivered', THE system SHALL allow the customer to request a refund for that item.

IF an order item's status is 'paid' or 'shipped', THE system SHALL allow the customer to request cancellation for that item.

IF an order item's status is 'cancelled' or 'refunded', THE system SHALL not allow cancellation or refund requests for that item.

THE overall order status SHALL be derived from the combined statuses of all order items in that order.

IF all order items in an order have status 'delivered', THE order status SHALL be 'delivered'.

IF any order item has status 'shipped' and none have status 'delivered', THE order status SHALL be 'shipped'.

IF all order items have status 'cancelled', THE order status SHALL be 'cancelled'.

IF all order items have status 'refunded', THE order status SHALL be 'refunded'.

IF order items have mixed statuses (e.g., some delivered, some cancelled), THE order status SHALL be 'partially completed'.

### Purchased Variant Representation

WHEN an order item is created, THE system SHALL capture and store the product variant that was purchased, including SKU code and option values.

WHEN an order item is created, THE system SHALL record the unit price of the variant at the time of purchase.

WHEN an order item is created, THE system SHALL record the quantity of variants purchased.

IF the same variant is purchased multiple times in a single order, THE system SHALL create a single order item with the combined quantity.

THE system SHALL allow order items from different sellers to exist within the same order.

WHEN viewing an order, THE system SHALL display each order item with its associated product name, variant options, and unit price.

IF a product variant is modified after an order is placed, THE system SHALL not affect existing order items (snapshots preserve original data).

THE system SHALL allow customers to view the complete history of order items for their orders.

THE system SHALL allow sellers to view all order items for products they own.

### Snapshot Preservation

WHEN an order item is created, THE system SHALL create and store a snapshot of the product (including name, description, and images) at the time of purchase.

WHEN an order item is created, THE system SHALL create and store a snapshot of the product variant (including SKU code, option values, and price) at the time of purchase.

WHEN an order item is created, THE system SHALL create and store a snapshot of the seller's profile (including shop name and logo) at the time of purchase.

THE product snapshot, variant snapshot, and seller profile snapshot SHALL be immutable and cannot be modified or deleted.

THE snapshots SHALL be preserved even if the product, variant, or seller profile is later deleted from the platform.

THE system SHALL allow customers to view snapshots of products and sellers in their order items.

THE system SHALL allow sellers to view snapshots of products and sellers in their order items.

THE system SHALL allow administrators to view snapshots of any order item.

THE system SHALL record the timestamp when each snapshot was created.

THE snapshots SHALL be used to display accurate product and seller information in order history, even if the current product or seller has been modified or deleted.

### Separate Cancellation Capability

WHEN a customer requests cancellation for an order item, THE system SHALL verify that the item's status is 'paid' (not yet shipped).

IF an order item's status is 'shipped', 'delivered', 'cancelled', or 'refunded', THE system SHALL reject the cancellation request.

WHEN a customer requests cancellation, THE system SHALL require the customer to provide a reason (text field).

THE system SHALL forward the cancellation request to the seller who owns the product for that order item.

WHEN a seller approves a cancellation request, THE system SHALL change the order item status to 'cancelled' and process a refund for that item.

WHEN a seller rejects a cancellation request, THE system SHALL change the request status to 'rejected' and notify the customer.

WHEN a cancellation request is approved, THE system SHALL create a snapshot of the request state (including reason, approval decision, and timestamps).

IF a cancellation request is approved, THE system SHALL restore the stock quantity for the variant (create a positive inventory record).

IF all order items in an order are cancelled, THE system SHALL update the order status to 'cancelled'.

IF only some order items in an order are cancelled, THE system SHALL allow the remaining items to continue processing normally.

THE system SHALL allow sellers to view cancellation requests for their order items and respond to them.

IF a seller deletes their account while cancellation requests are pending, THE system SHALL preserve those requests until they are resolved.

### Separate Refund Capability

WHEN a customer requests a refund for an order item, THE system SHALL verify that the item's status is 'delivered'.

IF an order item's status is not 'delivered' (e.g., 'paid', 'shipped', 'cancelled', 'refunded'), THE system SHALL reject the refund request.

WHEN a customer requests a refund, THE system SHALL require the customer to provide a reason (text field).

THE system SHALL verify that the refund request is submitted within 7 days of the item being delivered.

IF the refund request is submitted after 7 days from delivery, THE system SHALL reject the request.

THE system SHALL forward the refund request to the seller who owns the product for that order item.

WHEN a seller approves a refund request, THE system SHALL change the item status to 'refunded' and process the refund.

WHEN a seller rejects a refund request, THE system SHALL change the request status to 'rejected' and notify the customer.

WHEN a refund request is approved or rejected, THE system SHALL create a snapshot of the request state (including reason, decision, and timestamps).

IF a refund request is approved, THE system SHALL restore the stock quantity for the variant (create a positive inventory record).

IF all order items in an order are refunded, THE system SHALL update the order status to 'refunded'.

IF only some order items in an order are refunded, THE system SHALL allow the remaining items to retain their original statuses.

THE system SHALL allow sellers to view refund requests for their order items and respond to them.

### Quantity Aggregation

WHEN a customer adds the same variant to a shopping cart multiple times, THE system SHALL combine the quantities into a single cart item.

WHEN an order is created from a shopping cart, THE system SHALL create order items based on the cart items.

IF an order contains multiple units of the same variant, THE system SHALL create a single order item with the total quantity.

THE system SHALL NOT create separate order items for the same variant within the same order.

THE system SHALL display the combined quantity for each order item when customers view their order.

THE system SHALL allow quantity adjustments at the order item level, not at the unit level.

IF a customer requests cancellation or refund for part of the quantity in an order item, THE system SHALL reject the request (partial quantity cancellation is not supported).

THE system SHALL calculate the order item total price as: unit price × quantity.

THE system SHALL allow inventory management at the order item level (when cancelling or refunding, restore quantity equal to the order item's quantity).

IF an order item has quantity 3 of a variant, THE system SHALL treat it as a single unit for status tracking (all 3 units share the same status).

THE system SHALL allow customers to view the quantity breakdown in their order items.

THE system SHALL preserve the original quantity in order item snapshots for dispute resolution.

### Status-Based Actions

WHILE an order item has status 'paid', THE system SHALL allow the customer to request cancellation.

WHILE an order item has status 'paid' or 'shipped', THE system SHALL allow the seller to create a shipment.

WHILE an order item has status 'paid', THE system SHALL NOT allow the customer to request a refund.

WHILE an order item has status 'shipped', THE system SHALL allow the customer to view tracking information but NOT request cancellation or refund.

WHILE an order item has status 'delivered', THE system SHALL allow the customer to submit a review for the product.

WHILE an order item has status 'delivered', THE system SHALL allow the customer to request a refund.

WHILE an order item has status 'delivered', THE system SHALL NOT allow the customer to request cancellation.

WHILE an order item has status 'cancelled', THE system SHALL NOT allow any further actions from the customer or seller.

WHILE an order item has status 'refunded', THE system SHALL NOT allow any further actions from the customer or seller.

THE system SHALL validate item status before allowing any action and reject requests with inappropriate status.

IF a customer attempts an action not allowed for the current item status, THE system SHALL display an error message explaining the restriction.

THE system SHALL provide visual indicators in the user interface showing what actions are available based on each item's status.

WHEN an order item's status changes, THE system SHALL update all derived statuses (e.g., order status) to reflect the change.

THE system SHALL prevent customers from cancelling or refunding items owned by sellers they do not own (each seller manages only their own items).

### Seller Item Identification

WHEN a seller views their dashboard, THE system SHALL display all order items for products they own.

WHEN a seller views order items, THE system SHALL clearly identify which items are from their products.

THE system SHALL allow sellers to filter order items by status to focus on items needing action.

WHEN a seller creates a shipment, THE system SHALL only show order items for products they own.

THE system SHALL allow sellers to identify their order items in the order view shared by customers.

WHEN a seller receives a cancellation request, THE system SHALL only forward requests for items they own.

WHEN a seller receives a refund request, THE system SHALL only forward requests for items they own.

THE system SHALL allow sellers to view the full history of order items for their products.

WHEN a seller edits their profile, THE system SHALL NOT affect existing order items (snapshots preserve original profile).

THE system SHALL allow administrators to identify the seller associated with each order item.

WHEN a seller is suspended, THE system SHALL allow them to process existing order items (ship, respond to cancellation/refund) but NOT create new items.

WHEN a seller is banned, THE system SHALL prevent them from logging in and managing order items, but existing order items shall remain in the system.

## Shipment Rules

A shipment represents a package sent by a seller containing one or more order items. Different sellers always create separate shipments even for items in the same order. Sellers can choose to ship items individually or bundle multiple items together. Tracking information including carrier name and tracking number is entered when shipping. All items in the same shipment share identical tracking information. Creating a shipment changes all included items to shipped status. Customers can view tracking details for each shipment separately. Delivery confirmation is made per shipment rather than per individual item. Items automatically change to delivered status 14 days after shipping if not confirmed.

### Shipment Creation

WHEN a seller creates a shipment, THE system SHALL:
1. Accept one or more order items from the same seller
2. Assign a unique shipment identifier
3. Record the creation timestamp
4. Change the status of all included order items to "shipped"

IF the seller attempts to create a shipment with order items from different sellers, THE system SHALL reject the request and display an error message.

IF the seller attempts to create a shipment with an order item that is not in "paid" status, THE system SHALL reject the request and display an error message.

WHEN an order contains items from multiple sellers, THE system SHALL require separate shipments for items from different sellers.

### Seller-Separated Shipments

WHEN an order contains items from different sellers, THE system SHALL create separate shipments for each seller's items.

IF a customer places an order with items from multiple sellers, THE system SHALL:
1. Create one shipment per seller
2. Include only that seller's items in their respective shipment
3. Allow each seller to manage their own shipment independently

THE system SHALL NOT allow combining items from different sellers into a single shipment.

WHEN a seller views their shipments, THE system SHALL show only shipments containing items from that seller.

### Tracking Information Entry

WHEN a seller creates a shipment, THE system SHALL require:
1. Carrier name (text)
2. Tracking number (text)

IF the carrier name is missing, THE system SHALL reject the shipment creation request.

IF the tracking number is missing, THE system SHALL reject the shipment creation request.

WHEN tracking information is entered, THE system SHALL:
1. Save the carrier name and tracking number to the shipment record
2. Make the tracking information visible to the customer
3. Allow the seller to update the tracking information before shipment is complete

IF a shipment is marked as delivered, THE system SHALL prevent further tracking information updates.

### Shipment Status Updates

WHEN a seller creates a shipment with tracking information, THE system SHALL change the status of all order items in the shipment to "shipped".

IF an order item is in "shipped" status, THE system SHALL prevent it from being included in another shipment.

WHEN all items in a shipment are marked as delivered, THE system SHALL automatically change the shipment status to "delivered".

IF an order contains multiple shipments, THE system SHALL allow each shipment to have a different status independently.

WHEN a shipment is created, THE system SHALL preserve a snapshot of the shipment with all order items included at the time of creation.

### Delivery Confirmation

WHEN a shipment is created, THE system SHALL set the delivery confirmation deadline to 14 days from the shipment creation date.

WHILE the delivery confirmation deadline has not passed, THE customer SHALL be able to confirm delivery for the shipment.

WHEN the customer confirms delivery for a shipment, THE system SHALL:
1. Change all order items in the shipment to "delivered" status
2. Record the confirmation timestamp
3. Create a snapshot of the delivery confirmation

IF the customer does not confirm delivery within 14 days of shipment creation, THE system SHALL automatically change all order items in the shipment to "delivered" status.

THE system SHALL send a notification to the customer when delivery confirmation is required for a shipment.

### Bulk Shipping Option

WHEN a seller prepares to ship order items, THE system SHALL allow the seller to:
1. View all pending shipment items from that seller
2. Select one or multiple items to include in a single shipment
3. Create one shipment containing all selected items

IF a seller selects multiple items for the same shipment, THE system SHALL assign the same tracking number and carrier to all items in the shipment.

WHEN a seller creates a bulk shipment, THE system SHALL create individual shipment records for each item while maintaining the grouping information.

THE system SHALL allow the seller to view all order items awaiting shipment with options to select individual items or select all items for bulk shipment.

### Delivery Timeout Handling

WHEN a shipment reaches 14 days from its creation date, THE system SHALL automatically check the delivery confirmation status.

IF no delivery confirmation has been recorded by the customer, THE system SHALL automatically change all order items in the shipment to "delivered" status.

WHEN the automatic delivery timeout occurs, THE system SHALL:
1. Create a record of the automatic timeout event
2. Update the order status based on the new item statuses
3. Notify the seller that the automatic delivery timeout has occurred

IF a shipment has items with different creation dates, THE system SHALL evaluate each shipment's timeout independently.

THE system SHALL check for automatic delivery timeout occurrences once per day for all active shipments.

### Carrier Tracking Visibility

WHEN a customer views an order, THE system SHALL display the tracking information for each shipment in the order.

WHEN displaying tracking information, THE system SHALL show:
1. Carrier name
2. Tracking number
3. Shipment creation date
4. Current shipment status

IF the customer clicks on the tracking number, THE system SHALL provide a link to the carrier's tracking page (when available).

WHEN a shipment status changes to "delivered", THE system SHALL show "delivered" alongside the tracking information.

THE system SHALL allow customers to view tracking information for all shipments from past orders, not just current active orders.

### Shipment View Access

ONLY the seller who created a shipment shall have the ability to update tracking information for that shipment.

CUSTOMERS shall only have read-only access to view shipment tracking information.

ADMINISTRATORS shall have full access to view all shipments across the platform for oversight purposes.

WHEN a seller views their shipments, THE system SHALL show:
1. All shipments created by that seller
2. Items included in each shipment
3. Tracking information for each shipment
4. Current status of each shipment

IF a shipment contains items that have been cancelled after shipment creation, THE system SHALL exclude cancelled items from the shipment status calculation.

### Shipment Rejection and Corrections

IF a customer reports incorrect tracking information, THE system SHALL allow the seller to update the tracking information provided it has not been marked as delivered.

WHEN tracking information is updated after shipment creation, THE system SHALL create a snapshot of the before and after values.

IF a shipment needs to be cancelled due to an error, THE system SHALL:
1. Allow the seller to cancel the shipment
2. Change all order items in the shipment back to "shipped" status (not delivered)
3. Require a reason for the shipment cancellation
4. Create a snapshot of the cancellation

IF an order item is removed from a shipment after it was created, THE system SHALL create a new shipment for the remaining items or update the existing shipment as appropriate.

## CancellationRequest Rules

Customers can request cancellation for individual order items with paid status that have not yet shipped. Cancellation requests must include a reason describing why the cancellation is needed. The seller of the specific item can approve or reject the cancellation request. When the seller responds, a snapshot of the request state is created for record-keeping. Approved cancellations trigger refunds for that item only, leaving other items unaffected. Cancelled items have their stock quantities restored through inventory records. The order continues processing normally with remaining items after partial cancellation. When all items in an order are cancelled, the entire order status becomes cancelled.

### Cancellation Request Creation

WHEN a customer creates a cancellation request, THE system SHALL:
1. Require the request to reference a specific order item (item-specific cancellation)
2. Require a reason text field explaining why the cancellation is needed
3. Set initial request status to "pending"
4. Associate the request with the seller of that specific order item

IF the referenced order item does not exist, THE system SHALL reject the request with error ORDER_ITEM_NOT_FOUND.
IF the order item does not belong to a valid order, THE system SHALL reject the request with error INVALID_ORDER_ITEM.

THE system SHALL enforce that cancellation requests are created for paid-status items only (defined in Order Item Status section).

Error codes referenced:
- ORDER_ITEM_NOT_FOUND: The requested order item does not exist in the system
- INVALID_ORDER_ITEM: The order item referenced is not valid for cancellation

### Paid-Status Requirement

WHEN a customer attempts to create a cancellation request, THE system SHALL validate the order item status.

WHILE an order item status is "paid", THE system SHALL allow the customer to create a cancellation request.

IF an order item status is "shipped", "delivered", "cancelled", or "refunded", THE system SHALL reject the request with error ITEM_ALREADY_SHIPPED.

Error code:
- ITEM_ALREADY_SHIPPED: The order item has progressed beyond the cancellation window (status is shipped, delivered, cancelled, or refunded)

### Seller Response Capability

WHEN a cancellation request is created, THE system SHALL notify the seller of the order item about the pending request.

THE seller SHALL have the capability to approve or reject the cancellation request.

IF the seller approves the request, THE system SHALL:
1. Set the request status to "approved"
2. Create a snapshot of the request state at the moment of approval
3. Mark the order item status as "cancelled"
4. Process a partial refund for that item only
5. Create an inventory record to restore the stock quantity

IF the seller rejects the request, THE system SHALL:
1. Set the request status to "rejected"
2. Create a snapshot of the request state at the moment of rejection
3. Leave the order item status unchanged

THE system SHALL ensure only the seller of the specific order item can approve or reject that request.

### Snapshot on Response

WHEN a seller responds to a cancellation request (either approve or reject), THE system SHALL create a snapshot of the request state.

THE snapshot SHALL record:
- The timestamp of when the seller responded
- The action taken (approved or rejected)
- The previous request status
- The new request status after the response
- The order item reference and order number

THE snapshot SHALL be immutable and cannot be deleted or modified.

THE snapshot SHALL be accessible to:
- The customer who created the request
- The seller who responded
- Administrators for dispute resolution

Error code for snapshot operations:
- SNAPSHOT_CREATION_FAILED: System error preventing snapshot creation (should be retried or escalated)

### Partial Refund Processing

WHEN a cancellation request is approved, THE system SHALL process a partial refund for the specific order item only.

THE refund SHALL be calculated based on the unit price of the order item and the quantity cancelled.

THE system SHALL ensure that:
1. Only the cancelled item is refunded
2. Other items in the same order remain unaffected
3. The order item status changes to "cancelled"
4. Other items in the order continue their normal status

IF the order has multiple items from different sellers, EACH seller's approval is required for their respective items.

THE system SHALL handle partial refunds without affecting:
- The customer's other orders
- Other order items from different sellers
- Items that have already been delivered

### Stock Restoration on Cancellation

WHEN a cancellation request is approved, THE system SHALL restore the stock quantity for the cancelled variant.

THE system SHALL create an inventory record with:
- Positive quantity change (equal to the cancelled quantity)
- Reason: "Cancellation - {order item ID}"
- Timestamp matching the approval timestamp

THE system SHALL calculate current stock by summing all inventory records for the variant.

IF the variant has multiple inventory records, THE system SHALL ensure the stock is updated accurately after each cancellation.

Error code:
- INVENTORY_UPDATE_FAILED: System error preventing stock restoration (should be retried or escalated)

### Order Continuation After Partial Cancellation

WHEN some items in an order are cancelled but others remain active, THE system SHALL continue processing the order with remaining items.

THE overall order status SHALL be derived from the remaining items:
- If remaining items are all "paid" → order status is "paid"
- If remaining items are all "shipped" → order status is "shipped"
- If all remaining items are "delivered" → order status is "delivered"
- If remaining items are in mixed states → order status is "partially completed"

THE system SHALL ensure the order remains active and processable despite partial cancellation.

WHEN all items in an order are cancelled (either individually or through bulk cancellation), THE system SHALL set the overall order status to "cancelled".

### Full-Order Cancellation

WHEN all order items in an order are cancelled (either through individual customer requests or seller responses), THE system SHALL set the overall order status to "cancelled".

THE order SHALL be marked as fully cancelled with no remaining items to process.

THE system SHALL ensure:
1. No further shipping can occur for cancelled orders
2. No further actions can be taken on the order except by administrators
3. All refunds have been processed for cancelled items
4. Inventory has been restored for all cancelled items

Error code:
- ORDER_ALREADY_CANCELLED: Attempting to cancel an order that is already fully cancelled

## RefundRequest Rules

Customers can request refunds for individual items that have delivered status. Refund requests must include a reason explaining why the refund is needed. Refunds can only be requested within seven days after the item is delivered. The seller of the specific item approves or rejects the refund request. A snapshot of the refund request is created when the seller responds. Approved refunds process money back for that item only. Refunded items have their stock quantities restored through inventory records. Other items in the order remain unaffected by individual item refunds. When all items in an order are refunded, the order status becomes refunded.

### Refund Request Eligibility

WHEN a customer requests a refund, THE system SHALL verify the order item status is 'delivered'.

IF the order item status is not 'delivered', THE system SHALL reject the refund request.

WHEN a customer requests a refund, THE system SHALL verify the item was delivered within the past seven days.

IF the item was delivered more than seven days ago, THE system SHALL reject the refund request.

THE system SHALL calculate the seven-day window from the delivery confirmation date to the current date.

### Refund Reason Requirement

WHEN a customer creates a refund request, THE system SHALL require a reason text field.

IF the reason field is empty or missing, THE system SHALL reject the refund request.

WHEN a refund request is submitted, THE system SHALL record the timestamp of submission.

WHEN a customer edits a refund request, THE system SHALL update the reason and timestamp.

THE system SHALL display the reason to the seller for review.

### Refund Approval Workflow

WHEN a refund request is submitted, THE system SHALL create the request with status 'pending'.

WHEN a seller responds to a refund request, THE system SHALL update the request status to 'approved' or 'rejected'.

IF the seller approves the refund, THE system SHALL process a refund for the specific order item only.

IF the seller rejects the refund, THE system SHALL update the request status to 'rejected' and notify the customer.

WHEN a seller responds, THE system SHALL create a snapshot of the request state at that moment.

### Snapshot Creation on Response

WHEN a seller approves or rejects a refund request, THE system SHALL create an immutable snapshot.

THE snapshot SHALL record: request ID, response action (approved/rejected), response timestamp, and seller ID.

THE snapshot SHALL preserve the reason text and request status before the response.

THE system SHALL not allow modification or deletion of snapshots.

Administrators and relevant parties SHALL be able to view snapshots for dispute resolution.

### Partial Refund Processing

WHEN a refund is approved, THE system SHALL process refund for only that specific order item.

THE system SHALL refund the unit price multiplied by the item quantity.

OTHER order items in the same order SHALL continue processing normally.

THE order status SHALL remain unchanged unless all items are refunded.

THE system SHALL process the refund through the external payment gateway.

### Stock Restoration on Refund

WHEN a refund is approved, THE system SHALL create an inventory record with positive quantity change.

THE inventory record SHALL restore stock equal to the refunded item quantity.

THE inventory record SHALL record reason as 'refund' with a timestamp.

THE system SHALL recalculate the variant's current stock by summing all inventory records.

THE system SHALL mark the variant as available for purchase after stock restoration.

### Item-Level Refund Isolation

WHEN a refund is processed for one order item, THE system SHALL isolate the refund to that item only.

OTHER order items in the same order SHALL maintain their original status.

SHIPMENT status SHALL not be affected by individual item refunds.

CUSTOMERS SHALL receive refund notification for the specific item only.

SELLERS SHALL see the refund request in their dashboard with item-level details.

### Full Order Refund Status

WHEN all order items in an order have been refunded, THE system SHALL update the overall order status to 'refunded'.

THE system SHALL check all items in the order before updating the overall status.

IF some items are refunded and others are not, THE order status SHALL be 'partially completed'.

THE system SHALL display 'refunded' status in the order history list.

THE system SHALL display 'partially completed' status when there is a mix of refunded and other statuses.

### Refund Request Status Transitions

A refund request SHALL transition from 'pending' to 'approved' when the seller approves.

A refund request SHALL transition from 'pending' to 'rejected' when the seller rejects.

WHILE a refund request is 'pending', THE customer SHALL be able to view the request but cannot submit another request for the same item.

WHILE a refund request is 'approved', THE system SHALL process the refund through the payment gateway.

WHILE a refund request is 'rejected', THE customer SHALL be able to view the rejection reason.

## Review Rules

Customers can write reviews only for products they have actually purchased. Reviews can only be created after the order item status becomes delivered. Each customer can write one review per product per order they placed. Reviews require a rating between one and five stars. Review text content is optional and can be left blank if the customer prefers. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews at any time. Every review edit creates a snapshot preserving the previous version. Customers can delete their own reviews while snapshots remain preserved. Product average ratings are calculated only from non-deleted reviews.

### Review Eligibility Requirements

### Purchase Verification

WHEN a customer attempts to write a review for a product, THE system SHALL verify that the customer has purchased at least one item of that product in a completed order.

WHEN a customer attempts to write a review, THE system SHALL check that at least one order item for the product has status "delivered".

IF the customer has no order containing the product, THE system SHALL reject the review creation request.

IF the customer has an order with the product but no item has status "delivered", THE system SHALL reject the review creation request.

THE system SHALL reject the review request when the specified product does not exist in the system.

THE system SHALL reject the review request when the product has been deleted by the seller.

### Delivered Status Prerequisite

WHEN a customer attempts to write a review, THE system SHALL verify that the order item's status is "delivered".

IF an order item's status is not "delivered", THE system SHALL prevent the customer from writing a review for that item.

THE system SHALL allow review creation for any order item with status "delivered" regardless of when it was delivered.

THE system SHALL not allow review creation for order items with status "paid", "shipped", or "cancelled".

### Purchase Record Verification

WHEN a review is submitted, THE system SHALL record which order contained the purchased item.

THE system SHALL ensure the review is linked to the specific customer who made the purchase.

IF the customer account associated with the order has been deleted, THE system SHALL still allow the review to be associated with the purchase record.

THE system SHALL display the review on the product page regardless of whether the purchasing customer account is still active.

### Review Creation Rules

### One Review Per Product Per Order Rule

WHEN a customer creates a review for a product in an order, THE system SHALL ensure no other review exists for that same product from that same order.

IF a customer has already written a review for a product in an order, THE system SHALL reject any additional review attempts for that product.

THE system SHALL allow customers to write reviews for different products within the same order.

IF a customer has multiple orders containing the same product, THE system SHALL allow one review per product per order.

### Required Star Rating Validation

WHEN a customer submits a review, THE system SHALL require a rating value between 1 and 5 stars.

IF the submitted rating is less than 1, THE system SHALL reject the review creation request.

IF the submitted rating is greater than 5, THE system SHALL reject the review creation request.

THE system SHALL reject the review creation request when the rating field is empty or null.

THE system SHALL enforce rating as a required field during review creation.

### Optional Text Content Handling

WHEN a customer submits a review, THE system SHALL allow the text content field to be empty.

IF the customer provides no text content, THE system SHALL accept the review with only the star rating.

IF the customer provides text content, THE system SHALL store the complete text for display.

THE system SHALL trim leading and trailing whitespace from text content before storage.

THE system SHALL preserve the original text formatting as entered by the customer.

### Review Submission Process

WHEN a review is successfully submitted, THE system SHALL display it on the product detail page.

THE system SHALL sort reviews on the product page by newest first.

THE system SHALL include the new review in the average rating calculation immediately.

IF the review submission fails for any reason, THE system SHALL display an error message to the customer.

### Review Editing and Snapshot Creation

### Review Editing Capability

WHEN a customer who owns a review attempts to edit the review, THE system SHALL allow the modification.

WHEN a customer who does not own a review attempts to edit it, THE system SHALL reject the edit request.

WHEN any non-owner customer attempts to edit a review, THE system SHALL reject the edit request.

IF the product associated with the review has been deleted, THE system SHALL still allow the review owner to edit their review.

THE system SHALL allow review editing at any time after creation.

### Mandatory Snapshot on Edit

WHEN a customer edits their review, THE system SHALL create a snapshot of the previous review state.

THE snapshot SHALL record the timestamp when the edit occurred.

THE snapshot SHALL preserve the old rating value.

THE snapshot SHALL preserve the old text content value.

THE snapshot SHALL preserve the new rating value.

THE snapshot SHALL preserve the new text content value.

THE system SHALL store the snapshot as an immutable record that cannot be deleted.

THE system SHALL link the snapshot to the original review for version history tracking.

### Snapshot Access Rules

WHEN an administrator views review snapshots, THE system SHALL display all snapshots for the specified review.

WHEN a review owner views their review, THE system SHALL show an indicator that snapshots exist.

THE system SHALL display the snapshot creation timestamp for each version.

### Edit Validation During Submission

WHEN a customer submits edited review changes, THE system SHALL apply the same validation rules as initial creation.

IF the new rating is outside the 1-5 range, THE system SHALL reject the edit and preserve the previous values.

IF the new rating is required and not provided, THE system SHALL reject the edit.

THE system SHALL display an error message when edit validation fails.

THE system SHALL maintain the review in its previous state if editing fails.

### Review Deletion Policy

### Deletion Permission Rules

WHEN a customer who owns a review attempts to delete it, THE system SHALL allow the deletion.

WHEN a customer who does not own a review attempts to delete it, THE system SHALL reject the deletion request.

WHEN any non-owner customer attempts to delete a review, THE system SHALL reject the deletion request.

WHEN a review owner has been deleted as a customer account, THE system SHALL still allow the review to be deleted through administrative processes.

### Snapshot Preservation on Deletion

WHEN a review is deleted, THE system SHALL preserve a snapshot of the review state at the time of deletion.

THE snapshot SHALL include all fields from the deleted review (rating and text content).

THE snapshot SHALL record the deletion timestamp.

THE snapshot SHALL indicate that the review was deleted by the owner.

THE snapshot SHALL be immutable and cannot be deleted.

THE system SHALL preserve the snapshot even if the review owner's customer account has been deleted.

### Display Behavior After Deletion

WHEN a deleted review is displayed on the product detail page, THE system SHALL show it as "deleted user".

THE system SHALL not display the text content of deleted reviews.

THE system SHALL not include deleted reviews in the average rating calculation.

THE system SHALL preserve the star rating information in the snapshot but not count it in averages.

WHEN viewing the review list, THE system SHALL show that the review was deleted without showing content.

### Deletion Confirmation Process

WHEN a customer requests to delete their review, THE system SHALL present a confirmation dialog.

IF the customer confirms deletion, THE system SHALL create the deletion snapshot and hide the review.

IF the customer cancels the deletion request, THE system SHALL maintain the review in its current state.

THE system SHALL display a success message when deletion is complete.

THE system SHALL refresh the review list to reflect the deletion.

### Average Rating Calculation Rules

### Inclusion Criteria for Average Calculation

WHEN calculating the average rating for a product, THE system SHALL include only non-deleted reviews.

WHEN calculating the average rating, THE system SHALL exclude reviews marked as deleted.

WHEN calculating the average rating, THE system SHALL include all reviews with valid ratings between 1 and 5.

THE system SHALL recalculate the average rating after each new review submission.

THE system SHALL recalculate the average rating after each deleted review.

### Exclusion Rules

THE system SHALL exclude reviews with ratings outside the valid 1-5 range from calculation.

THE system SHALL exclude deleted reviews from the average rating calculation even if the product has been deleted.

THE system SHALL exclude reviews from deleted customer accounts if they have been marked as deleted.

IF a product has no reviews, THE system SHALL display "no reviews" rather than a zero rating.

IF a product has only deleted reviews, THE system SHALL display "no reviews" rather than a zero rating.

### Calculation Method

WHEN calculating the average rating, THE system SHALL sum all valid review ratings.

THE system SHALL divide the sum by the count of non-deleted reviews.

THE system SHALL round the average to one decimal place for display purposes.

THE system SHALL display the average rating on the product detail page.

THE system SHALL display the total count of non-deleted reviews alongside the average.

### Real-Time Updates

WHEN a new review is created, THE system SHALL immediately update the product's average rating.

WHEN a review is deleted, THE system SHALL immediately update the product's average rating.

WHEN a review is edited (rating changed), THE system SHALL immediately update the product's average rating.

THE system SHALL ensure the average rating displayed matches the current calculation.

THE system SHALL update the average rating displayed on all product detail pages where the product appears.

## InventoryRecord Rules

Each variant maintains its own stock quantity tracked through inventory records. Inventory records are created for restocking (positive change) or order adjustments (negative change). Each record includes the quantity change amount, reason, and timestamp. Current stock levels are calculated by summing all inventory records for that variant. Sellers can add inventory when restocking products with a quantity and reason. Adjustments or losses are recorded as negative quantity changes with appropriate reasons. Placing orders automatically creates negative inventory records for purchased quantities. Cancellations and refunds automatically create positive inventory records to restore stock. The full inventory history is visible to sellers for each variant. Variants with zero stock are displayed as out of stock and cannot be added to cart.

### Variant-Level Stock Tracking

THE system SHALL track stock quantity for each product variant independently.

WHEN a product variant is created, THE system SHALL initialize its stock quantity to the value specified by the seller.

IF two variants have the same SKU code for different products, THE system SHALL reject the creation.

WHEN stock levels change, THE system SHALL record the change in an inventory history record with the quantity change amount, reason, and timestamp.

THE system SHALL calculate current stock levels by summing all inventory records for that variant.

IF the current stock calculation does not match the expected stock, THE system SHALL flag the variant for manual review by the seller.

WHEN displaying variant information, THE system SHALL show the current stock quantity calculated from inventory history.

THE system SHALL NOT allow manual modification of stock quantity without creating an inventory record.

IF a stock quantity is negative, THE system SHALL reject the inventory adjustment and require the seller to investigate.

THE system SHALL display stock status as "in stock" when quantity is greater than zero, and "out of stock" when quantity equals zero.

### Inventory History Records

WHEN any stock level change occurs, THE system SHALL create an inventory history record.

EACH inventory record SHALL contain: quantity change (positive or negative), reason for change, and timestamp.

THE system SHALL NOT allow deletion of inventory history records once created.

THE system SHALL preserve all inventory history records even when a product or seller is deleted.

WHEN displaying inventory history, THE system SHALL show records sorted by timestamp with newest first.

IF an inventory record has an invalid reason code, THE system SHALL require the seller to provide a valid reason.

THE system SHALL allow sellers to add custom reason text for inventory adjustments.

WHEN stock reaches zero due to inventory adjustments, THE system SHALL NOT automatically remove the variant from listings.

THE system SHALL track the total number of inventory records for each variant for auditing purposes.

IF a seller attempts to modify an inventory record, THE system SHALL reject the request and indicate that records are immutable.

### Restocking Process

WHEN a seller restocks inventory, THE system SHALL create a positive quantity change record in inventory history.

THE seller SHALL specify the restock quantity and reason when adding inventory.

IF the restock quantity is zero or negative, THE system SHALL reject the restock request.

IF the restock quantity exceeds the maximum allowed per transaction (10000 units), THE system SHALL reject the request and notify the seller.

WHEN restocking is completed, THE system SHALL update the current stock level by adding the restock quantity.

IF a variant is marked inactive, THE system SHALL still allow restocking but the variant remains unavailable for purchase.

THE system SHALL record the timestamp of restock completion for audit purposes.

WHEN restocking a variant that has pending order items, THE system SHALL update stock but not cancel pending orders.

IF the seller has exceeded their maximum allowed stock level for a variant, THE system SHALL reject the restock request.

THE system SHALL send a notification to the seller confirming the restock amount and updated stock level.

### Adjustment Recording

WHEN a seller adjusts inventory due to loss, damage, or correction, THE system SHALL create a negative quantity change record.

THE seller SHALL specify the adjustment quantity (always positive number to indicate reduction) and reason.

IF the adjustment quantity exceeds current stock, THE system SHALL reject the adjustment and require investigation.

IF the adjustment reason is "correction" without providing adjustment details, THE system SHALL require the seller to provide adjustment details.

WHEN adjustment is processed, THE system SHALL update the current stock level by subtracting the adjustment amount.

IF the adjustment results in negative stock, THE system SHALL reject the adjustment and require a reason.

THE system SHALL record the timestamp of adjustment completion for audit purposes.

WHEN adjusting inventory for a variant with pending shipments, THE system SHALL still allow the adjustment but flag it for review.

IF an adjustment is made by a user without inventory management permissions, THE system SHALL reject the request.

THE system SHALL require seller confirmation for adjustments exceeding 100 units.

### Order-Triggered Deduction

WHEN an order is placed successfully, THE system SHALL create a negative inventory record for each purchased variant.

THE system SHALL deduct the ordered quantity from the current stock level.

IF the ordered quantity exceeds available stock at order time, THE system SHALL reject the order placement.

WHEN deducting inventory, THE system SHALL record the order number as the reason for the change.

IF the inventory deduction causes stock to reach zero, THE system SHALL mark the variant as "out of stock" immediately.

WHEN an order is paid but not yet shipped, THE system SHALL keep the inventory deducted.

IF an order is cancelled before shipment, THE system SHALL create a positive inventory record to restore stock.

THE system SHALL allow orders to be placed even if stock reaches zero during checkout, as long as stock was available at the time of order placement.

WHEN multiple customers attempt to purchase the last item simultaneously, THE system SHALL ensure only one order succeeds with inventory deduction.

IF inventory deduction fails due to system error, THE system SHALL roll back the order and notify the customer.

### Cancellation-Triggered Restoration

WHEN a cancellation request is approved, THE system SHALL create a positive inventory record to restore stock.

THE system SHALL restore the exact quantity that was cancelled to the variant's stock level.

IF the cancelled variant has been deleted from the platform, THE system SHALL still restore stock to the variant record.

WHEN restoring stock, THE system SHALL record the cancellation request ID as the reason for the change.

IF the cancellation is for multiple quantities of the same variant, THE system SHALL restore all quantities in a single inventory record.

WHEN stock is restored, THE system SHALL update the variant's stock status if it was previously "out of stock".

IF the cancellation occurs after the variant has been deleted by the seller, THE system SHALL restore stock but prevent new purchases of that variant.

THE system SHALL NOT allow stock restoration to exceed the original sold quantity for that cancellation.

IF a cancellation is rejected by the seller, THE system SHALL NOT create an inventory restoration record.

WHEN a partial cancellation is approved, THE system SHALL restore only the cancelled quantity, not the entire variant quantity.

### Refund-Triggered Restoration

WHEN a refund request is approved, THE system SHALL create a positive inventory record to restore stock.

THE system SHALL restore the exact quantity that was refunded to the variant's stock level.

IF the refunded item is in a shipment that has not been delivered, THE system SHALL still restore stock.

WHEN restoring stock, THE system SHALL record the refund request ID as the reason for the change.

IF the refund is for multiple quantities of the same variant, THE system SHALL restore all quantities in a single inventory record.

WHEN stock is restored after a refund, THE system SHALL update the variant's stock status if it was previously "out of stock".

IF the refund is rejected by the seller, THE system SHALL NOT create an inventory restoration record.

WHEN a refund is processed for a variant that has been discontinued by the seller, THE system SHALL still restore stock.

IF the refund amount differs from the original order amount, THE system SHALL still restore the full quantity.

THE system SHALL NOT allow refunds that result in negative stock restoration (i.e., restoring more than was originally sold).

### Zero-Stock Availability

WHEN a variant's stock reaches zero, THE system SHALL mark the variant as "out of stock".

IF a variant is marked "out of stock", THE system SHALL prevent customers from adding it to their cart.

WHEN displaying products to customers, THE system SHALL show out-of-stock variants with a visual indicator.

IF a customer has out-of-stock items in their cart when stock reaches zero, THE system SHALL mark those items as unavailable.

THE system SHALL NOT allow customers to check out with items that are out of stock.

IF an item becomes out of stock during checkout, THE system SHALL remove it from the order and notify the customer.

WHEN a product has all variants out of stock, THE system SHALL mark the entire product as unavailable.

IF a product has no variants, THE system SHALL show the product as unavailable in search results.

WHEN stock is restored after being zero, THE system SHALL immediately make the variant available for purchase.

THE system SHALL allow customers to view out-of-stock variants in product listings and wishlists.

### Inventory History Visibility

WHEN a seller requests to view inventory history, THE system SHALL show all inventory records for that variant.

THE system SHALL display inventory records sorted by timestamp with newest first.

WHEN viewing inventory history, THE system SHALL show: quantity change, running stock balance, reason, and timestamp for each record.

THE system SHALL allow sellers to filter inventory history by reason type (restock, order, cancellation, refund, adjustment).

WHEN viewing inventory history for a product, THE system SHALL show history for each variant separately.

THE system SHALL NOT allow customers to view detailed inventory history of products.

WHEN viewing inventory history, THE system SHALL show the current running balance after each transaction.

IF a seller exports inventory history, THE system SHALL include all records with complete details.

THE system SHALL allow sellers to view inventory history for variants even after those variants have been deleted from the product.

WHEN viewing inventory history for audit purposes, THE system SHALL preserve the record of who made each change.

## AdminRequest Rules

Any user can submit a request to become an administrator on the platform. Requests must include a reason explaining why the user seeks administrator privileges. Super administrators can view all pending administrator requests for review. Super administrators can approve or reject these administrator requests. When approved, the requesting user becomes a regular administrator with elevated permissions. Requests are tracked with their status as pending, approved, or rejected. Rejected requests may be resubmitted if the user still wishes to pursue administrator status. The approval process allows control over who gains administrative access to the platform.

### Administrator Request Submission

WHEN a user submits a request to become an administrator, THE system SHALL:
1. Accept requests from any user (customer or seller)
2. Require a reason field explaining why the user seeks administrator privileges
3. Create a new admin request record with status "pending"

IF the reason field is empty or contains only whitespace, THE system SHALL reject the request and inform the user that a reason is required.

WHEN a user submits an admin request, THE system SHALL track the request with a creation timestamp for audit purposes.

A user can submit only one pending administrator request at any given time.

IF a user has a pending administrator request, THE system SHALL prevent them from submitting a new request until the pending request is resolved (approved or rejected).

THE system SHALL allow a user to view the status of their submitted administrator request (pending, approved, or rejected).

THE system SHALL not allow a user to withdraw an administrator request once submitted. Resubmission after rejection requires creating a new request record.

### Required Reason Field

WHEN a user submits an administrator request, THE system SHALL require a reason field containing an explanation of why the user seeks administrator privileges.

IF the reason field contains fewer than 10 characters, THE system SHALL reject the request and inform the user that a minimum of 10 characters is required.

IF the reason field contains more than 500 characters, THE system SHALL reject the request and inform the user that the reason must not exceed 500 characters.

THE system SHALL store the reason text exactly as submitted and preserve it in the admin request record.

WHEN an administrator reviews an admin request, THE system SHALL display the reason text to allow informed approval or rejection decisions.

THE system SHALL not allow a user to edit the reason field after the request has been submitted.

A new administrator request after rejection requires a new reason field submission; previously submitted reasons are not carried forward.

### Super-Administrator Review Process

ONLY users with super-administrator grade can view the list of pending administrator requests.

WHEN a super-administrator views pending administrator requests, THE system SHALL display each request with: requester name, requester type (customer or seller), request submission date, and the submitted reason.

WHEN a super-administrator reviews an administrator request, THE system SHALL present the request in a review interface for approval or rejection decision.

THE system SHALL track which super-administrator approved or rejected each administrator request for audit purposes.

WHEN a super-administrator reviews administrator requests, THE system SHALL sort them by submission date with oldest requests displayed first to ensure timely processing.

WHEN multiple super-administrators exist, THE system SHALL ensure that only one super-administrator can work on a single pending request at any given time to prevent duplicate reviews.

THE system SHALL notify the requesting user when their administrator request status changes (approved or rejected).

### Request Approval Capability

WHEN a super-administrator approves an administrator request, THE system SHALL:
1. Change the request status from "pending" to "approved"
2. Grant administrator role to the requesting user
3. Record the approval timestamp

IF a user's administrator request is approved, THE system SHALL change their user role to "regular administrator".

WHEN an administrator request is approved, THE system SHALL record the super-administrator who performed the approval for audit and accountability purposes.

WHEN a regular administrator is promoted to super-administrator, THE system SHALL create a snapshot of the promotion event.

THE system SHALL allow a super-administrator to promote a regular administrator to super-administrator grade.

THE system SHALL allow a super-administrator to demote another super-administrator back to regular administrator grade.

WHEN a super-administrator demotes another super-administrator, THE system SHALL create a snapshot of the demotion event.

A super-administrator CANNOT demote themselves; THE system SHALL reject such a request and inform the user of this restriction.

### Request Rejection Capability

WHEN a super-administrator rejects an administrator request, THE system SHALL:
1. Change the request status from "pending" to "rejected"
2. Record the rejection timestamp
3. Allow the super-administrator to optionally add rejection notes

IF a user's administrator request is rejected, THE system SHALL inform the user that their request was rejected.

WHEN a super-administrator rejects an administrator request, THE system SHALL optionally record rejection notes explaining the reasons for rejection.

THE system SHALL allow rejected users to resubmit a new administrator request after rejection.

WHEN a rejected administrator request is resubmitted, THE system SHALL create a new admin request record rather than updating the rejected record.

THE system SHALL preserve both the original rejected request record and any subsequent resubmitted requests for audit and tracking purposes.

A user who has been rejected can view their rejection history including all rejected requests and any associated rejection notes from super-administrators.

THE system SHALL not impose any waiting period before a rejected user can resubmit an administrator request.

### Pending Status Tracking

WHEN an administrator request is submitted, THE system SHALL set its status to "pending" until resolved.

WHEN a super-administrator views pending administrator requests, THE system SHALL display only requests with "pending" status.

THE system SHALL allow super-administrators to filter pending administrator requests by requester type (customer or seller).

THE system SHALL allow super-administrators to filter pending administrator requests by submission date range.

WHEN an administrator request moves from "pending" to either "approved" or "rejected", THE system SHALL update the status accordingly and remove it from pending lists.

THE system SHALL prevent any status transition from "approved" or "rejected" back to "pending"; once resolved, a request's status is final.

WHEN a user has a pending administrator request, THE system SHALL clearly display this status on their user profile and dashboard.

THE system SHALL provide administrative tools to search and query administrator requests by requester email, requester name, or request ID.

### Approval Status Transition

AN administrator request starts in the "pending" status upon submission.

AN administrator request transitions from "pending" to "approved" when a super-administrator approves it.

AN administrator request transitions from "pending" to "rejected" when a super-administrator rejects it.

ONCE an administrator request transitions to "approved" or "rejected" status, THE status cannot be changed; resolved requests are immutable.

WHEN an administrator request status changes, THE system SHALL record the exact timestamp of the transition for audit purposes.

WHEN a user's administrator request is approved, THE system SHALL immediately activate their administrator privileges.

WHEN a user's administrator request is rejected, THE system SHALL maintain their existing user role (customer or seller) without any change.

THE system SHALL maintain a complete history of status transitions for each administrator request, including who performed the transition and when.

IF a super-administrator action fails during approval or rejection, THE system SHALL maintain the request in "pending" status and retry the operation.

### Resubmission After Rejection

WHEN an administrator request is rejected, THE system SHALL allow the user to submit a new administrator request.

WHEN a user submits a new administrator request after rejection, THE system SHALL create a completely new admin request record.

THE system SHALL NOT carry forward the reason or content from the previously rejected request to the new request.

THE system SHALL preserve the previously rejected request record and display it in the user's request history.

WHEN viewing their request history, a user SHALL see all previous administrator requests including rejected ones with their original reasons and rejection timestamps.

WHEN a new administrator request is submitted after rejection, THE system SHALL not automatically approve it; it must go through the full review process.

THE system SHALL allow unlimited resubmissions of administrator requests after rejection; no limit is imposed on the number of resubmissions.

WHEN processing a resubmitted administrator request, super-administrators SHALL have access to the complete history of previous requests to inform their decision.

## Snapshot Rules

All editable data modifications create snapshots to preserve the previous state for audit purposes. Snapshots record when the change was made, what fields were changed, and values before and after. Snapshots are immutable and cannot be deleted once created. Relevant parties can view snapshots for dispute resolution and transparency. Snapshots apply to products, variants, seller profiles, order items, reviews, and cancellation/refund requests. Product snapshots include all product fields and snapshots of all variants at that moment. Order item snapshots preserve the product, variant, and seller profile as they existed at purchase. Snapshot creation ensures historical accuracy even when current data is modified or deleted. Administrators can view snapshots of any record on the platform.

### Mandatory Snapshot Creation

WHEN a product is edited, THE system SHALL create a product snapshot that preserves the complete state of the product and all its variants at that moment.

WHEN a product variant is edited, THE system SHALL create a variant snapshot.

WHEN a seller profile is edited, THE system SHALL create a seller profile snapshot.

WHEN an order item is created, THE system SHALL create a snapshot of the product, variant, and seller profile as they existed at the time of purchase.

WHEN a review is edited, THE system SHALL create a review snapshot.

WHEN a cancellation request is created or responded to, THE system SHALL create a cancellation request snapshot.

WHEN a refund request is created or responded to, THE system SHALL create a refund request snapshot.

IF an editable record is modified, THEN THE system SHALL ensure a snapshot is created before the modification is applied.

### Change Timestamp Recording

THE system SHALL record the exact timestamp when each snapshot is created.

THE system SHALL include the timestamp in every snapshot record.

THE timestamp SHALL be in UTC format with millisecond precision.

THE system SHALL use the server's authoritative time source for timestamp generation.

THE system SHALL NOT allow snapshot timestamps to be manually modified or overridden.

WHEN viewing a snapshot, THE system SHALL display the change timestamp in the customer's local timezone.

THE timestamp SHALL be used to order snapshots chronologically when multiple snapshots exist for a record.

### Before-After Value Capture

WHEN a snapshot is created, THE system SHALL capture the old values of all modified fields.

WHEN a snapshot is created, THE system SHALL capture the new values of all modified fields.

THE system SHALL store both old values and new values in the snapshot record.

THE system SHALL indicate which specific fields were changed in the snapshot.

FOR product snapshots, THE system SHALL capture snapshots of all variants at that moment.

FOR order item snapshots, THE system SHALL capture the product name, description, variant options, and price at the time of purchase.

FOR order item snapshots, THE system SHALL capture the seller's shop name and logo at the time of purchase.

IF a field was not modified, THE system SHALL exclude it from the changed fields list but include its unchanged value for comparison.

### Immutable Record Preservation

ONCE a snapshot is created, THE system SHALL NOT allow any modifications to the snapshot content.

ONCE a snapshot is created, THE system SHALL NOT allow deletion of the snapshot.

THE system SHALL preserve all snapshots indefinitely, even after the source record is deleted.

THE system SHALL prevent any user (including administrators) from modifying snapshot data.

THE system SHALL mark all snapshots as immutable to enforce preservation rules.

WHEN a product is deleted, THE system SHALL preserve all product snapshots associated with that product.

THE system SHALL ensure snapshot data cannot be altered through any direct database access or API call.

### Dispute Resolution Access

THE system SHALL allow relevant parties to view snapshots for dispute resolution purposes.

FOR product snapshots, THE system SHALL allow the product owner (seller) to view their product snapshots.

FOR product snapshots, THE system SHALL allow administrators to view any product's snapshots.

FOR order item snapshots, THE system SHALL allow the customer who placed the order to view the snapshots.

FOR order item snapshots, THE system SHALL allow the seller of the item to view the snapshots.

FOR order item snapshots, THE system SHALL allow administrators to view any order item's snapshots.

FOR cancellation and refund request snapshots, THE system SHALL allow both the customer and seller to view the snapshots.

THE system SHALL provide snapshot viewing capabilities in dispute resolution workflows.

### Product Snapshot Scope

A product snapshot SHALL include all product fields: name, description, category, and base price.

A product snapshot SHALL include the current state of all product variants at the time of snapshot creation.

A product snapshot SHALL include all product images with their URLs and display order.

A product snapshot SHALL include the seller's information as it existed at the time of snapshot creation.

THE system SHALL store product variant data within product snapshots in a nested structure.

WHEN viewing a product snapshot, THE system SHALL display the complete product state as it existed at that point in time.

FOR dispute resolution, THE system SHALL allow viewing of historical product states for comparison with current data.

### Order Item Snapshot Preservation

WHEN an order item is created, THE system SHALL preserve a snapshot of the product as it existed at purchase.

WHEN an order item is created, THE system SHALL preserve a snapshot of the variant as it existed at purchase.

WHEN an order item is created, THE system SHALL preserve a snapshot of the seller profile as it existed at purchase.

THE system SHALL ensure order item snapshots cannot be modified even if the source product or seller is later edited.

THE system SHALL store the unit price of the variant at the time of purchase in the order item snapshot.

THE system SHALL ensure order item snapshots remain accessible after the product is deleted from the platform.

FOR refund and cancellation disputes, THE system SHALL provide order item snapshots to verify purchase conditions.

### Snapshot Viewer Permissions

PRODUCT OWNERS SHALL be able to view snapshots of their own products.

SELLERS SHALL be able to view snapshots of seller profiles they own.

CUSTOMERS SHALL be able to view snapshots of order items in their own orders.

ADMINISTRATORS SHALL be able to view snapshots of any record on the platform.

SUPER ADMINISTRATORS SHALL be able to view snapshots of any record on the platform.

CUSTOMERS SHALL NOT be able to view product or seller snapshots unrelated to their orders.

SELLERS SHALL NOT be able to view snapshots of other sellers' products or profiles.

THE system SHALL enforce access control checks before displaying snapshot information.

### Historical Data Accuracy

THE system SHALL ensure that snapshots accurately reflect the state of records at the time they were created.

THE system SHALL prevent modification of historical data through any means.

WHEN a product is edited, THE system SHALL create the snapshot before applying the changes to ensure accuracy.

THE system SHALL maintain data integrity between snapshots and the source records.

FOR dispute resolution, THE system SHALL ensure that historical snapshots cannot be altered to change the outcome of disputes.

THE system SHALL provide accurate chronology of all snapshots for a given record.

THE system SHALL ensure that product and variant data in order item snapshots matches exactly what was purchased, even if the product is later modified.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## Customer Validation Rules

Customer accounts require a valid email address that is unique across all active customers. Email addresses must follow standard email format with a local part, @ symbol, and domain. Passwords must be set during registration and meet security standards. Customers can update their passwords through a secure process. Each customer account is linked to a profile containing display name and optional phone number. Customer accounts cannot be created without both email and password credentials. Password changes require authentication through the current password. Customer accounts maintain creation timestamps for audit purposes.

### Email Uniqueness Validation

THE system SHALL reject customer registration when the provided email address already exists in the system.

THE system SHALL validate email uniqueness against all active customer accounts before account creation.

THE system SHALL consider email addresses case-insensitive for uniqueness validation ("user@example.com" equals "USER@EXAMPLE.COM").

IF a customer attempts to register with an email that matches an existing customer, THE system SHALL display a clear error message indicating the email is already registered.

### Email Format Requirements

WHEN a customer provides an email address during registration, THE system SHALL validate that it follows standard email format with a local part, @ symbol, and domain.

THE system SHALL reject email addresses with invalid format including: missing @ symbol, missing domain part, consecutive dots, or leading/trailing dots.

IF the email format is invalid, THE system SHALL display an error message describing the required format.

THE system SHALL store email addresses in lowercase for consistency.

### Password Security Standards

WHEN a customer creates an account, THE system SHALL require a password with minimum security standards.

THE system SHALL enforce password complexity rules including minimum length requirement.

THE system SHALL reject passwords that are too simple or commonly used.

THE system SHALL store password hashes securely and never store plain text passwords.

THE system SHALL display the minimum password requirements during the registration process.

### Password Change Authentication

WHEN a customer requests to change their password, THE system SHALL require authentication through the current password.

IF the current password provided does not match the stored password hash, THE system SHALL reject the password change request.

THE system SHALL require the new password to meet the same security standards as the original password.

WHEN a password change is successful, THE system SHALL prompt the customer to log in again with the new password.

### Profile Linking Requirement

THE system SHALL automatically create a customer profile linked to the customer account upon successful registration.

THE system SHALL require a display name as part of the customer profile (defined in CustomerProfile Validation Rules section).

THE system SHALL allow customers to update their display name and phone number through profile editing.

THE system SHALL ensure the customer account and profile remain linked for the account's lifetime.

### Account Creation Prerequisites

THE system SHALL reject customer registration when either email or password is missing.

THE system SHALL prevent account creation without valid email address that passes uniqueness validation.

THE system SHALL prevent account creation without a password that meets security standards.

IF any prerequisite is not met, THE system SHALL display specific error messages indicating which field(s) require correction.

### Account Timestamp Recording

WHEN a customer account is created, THE system SHALL record the creation timestamp.

THE system SHALL store the creation timestamp immutably for audit purposes.

THE creation timestamp SHALL be included in customer account queries for administrative review.

WHEN a customer account is deleted, THE system SHALL preserve the creation timestamp in the deletion record for legal compliance.

## CustomerProfile Validation Rules

Customer profiles require a display name that customers use to represent themselves publicly. Display names must be between 1 and 100 characters in length. Phone numbers in customer profiles are optional but must follow valid phone number formats when provided. Customers can update their display names and phone numbers at any time. Profile edits create snapshots to preserve historical versions for dispute resolution. Display names are visible to other users and in order records. Phone numbers may be used for order notifications and seller communication when provided. Each profile is uniquely linked to its parent customer account.

### Display Name Validation and Length Limits

WHEN a customer creates a customer profile, THE system SHALL require a display name field.

WHEN a customer creates or updates a customer profile, THE display name SHALL be between 1 and 100 characters in length.

IF a display name is shorter than 1 character, THE system SHALL reject the profile creation or update.

IF a display name exceeds 100 characters, THE system SHALL reject the profile creation or update.

WHEN a display name is provided, THE system SHALL validate it contains only allowed characters (letters, numbers, spaces, hyphens, and underscores).

IF a display name contains disallowed special characters, THE system SHALL reject the profile creation or update.

WHEN a display name change is requested, THE system SHALL check if the new name is already in use by another customer and SHALL reject if it is not unique.

IF a display name update results in a name that is already taken, THE system SHALL inform the customer and request a different name.

THE display name SHALL be visible to all other customers browsing the platform.

THE display name SHALL be visible in order records, review listings, and seller communications.

IF a customer deletes their account, THE display name SHALL be replaced with "deleted user" in all historical records.

### Phone Number Optional Validation

WHEN a customer creates a customer profile, THE phone number field SHALL be optional and can be left blank.

WHEN a customer provides a phone number, THE system SHALL validate the phone number follows a valid international format.

IF a phone number is provided, THE system SHALL accept phone numbers with country codes (e.g., +1-555-123-4567).

IF a phone number does not conform to a valid format, THE system SHALL reject the phone number and request correction.

WHEN a phone number is provided in a customer profile, THE customer SHALL be able to update or remove it at any time.

IF a phone number is removed from a customer profile, THE system SHALL retain the previous value in the profile snapshot.

WHEN a phone number is provided, THE system SHALL store it in an encrypted format for security.

THE phone number in a customer profile SHALL be used for order notifications and delivery confirmation when available.

WHEN a customer places an order, THE system SHALL use the stored phone number for shipping notifications if one is provided.

IF a customer does not provide a phone number, THE system SHALL use email as the primary contact method for order notifications.

### Profile Edit Snapshot Creation

WHEN a customer updates their customer profile (display name or phone number), THE system SHALL create a snapshot of the profile.

THE snapshot SHALL record the timestamp of when the profile change was made.

THE snapshot SHALL capture the old values of all modified fields.

THE snapshot SHALL capture the new values of all modified fields.

THE snapshot SHALL record which customer account made the change.

WHEN a customer deletes their account, THE system SHALL NOT create a snapshot for the deletion action, but SHALL preserve the last snapshot of the profile.

IF a profile edit is rejected due to validation failure, THE system SHALL NOT create a snapshot.

WHEN a profile edit is successful, THE snapshot SHALL be marked as immutable and SHALL NOT be deleted or modified.

CUSTOMER administrators SHALL be able to view snapshots of any customer profile for dispute resolution.

WHEN a profile snapshot is created, THE snapshot SHALL include the reason for the change if one was provided by the customer.

### Profile Update Permissions

ONLY the customer who owns a profile SHALL be able to update their own profile information.

WHEN a customer is not authenticated, THE system SHALL prevent them from accessing any customer profile update functionality.

WHEN a customer attempts to update another customer's profile, THE system SHALL reject the update request.

WHEN a customer is banned, THE system SHALL prevent them from updating their profile.

ADMINISTRATORS SHALL be able to view customer profiles for moderation purposes but SHALL NOT be able to modify profile data.

SUPER ADMINISTRATORS SHALL have the same read-only profile access as regular administrators.

WHEN a customer profile is suspended due to system restrictions, THE system SHALL prevent all profile updates until the suspension is lifted.

IF a customer's account is deleted, THE system SHALL prevent any further profile updates for that account.

CUSTOMERS SHALL be able to update their profile at any time unless their account is in a suspended state.

WHEN a profile update is successful, THE system SHALL confirm the update to the customer.

### Historical Version Preservation

WHEN a profile snapshot is created, THE system SHALL preserve it indefinitely for historical record purposes.

THE system SHALL maintain a chronological list of all profile snapshots for each customer profile.

CUSTOMERS SHALL be able to view their own profile history and snapshots.

CUSTOMERS SHALL be able to view snapshots from any date in their profile history.

ADMINISTRATORS SHALL be able to view all snapshots of any customer profile for dispute resolution.

SUPER ADMINISTRATORS SHALL have the same snapshot access as regular administrators.

WHEN a customer deletes their account, THE profile snapshots SHALL be preserved but the customer account link shall be removed.

PROFILE SNAPSHOTS SHALL be immutable and SHALL NOT be modified or deleted by any user.

THE system SHALL provide a reference timestamp for each snapshot showing when the change occurred.

THE system SHALL allow filtering of snapshots by date range for administrative review.

WHEN a dispute involves profile changes, THE system SHALL provide access to relevant snapshots for investigation.

### Notification Contact Preferences

WHEN a customer provides a phone number in their profile, THE system SHALL use it for delivery notifications.

WHEN a customer provides a phone number in their profile, THE system SHALL use it for cancellation request notifications.

WHEN a customer provides a phone number in their profile, THE system SHALL use it for refund request notifications.

IF a customer does not provide a phone number, THE system SHALL use email as the primary notification contact method.

WHEN a customer updates their phone number, THE system SHALL use the new number for future notifications.

WHEN a customer removes their phone number, THE system SHALL revert to using email as the primary contact method.

CUSTOMERS SHALL be able to opt out of SMS notifications while still receiving email notifications.

WHEN a customer opts out of SMS notifications, THE system SHALL still use the phone number for delivery confirmation if required by shipping carrier.

THE system SHALL allow customers to specify their preferred contact method (email only, phone only, or both).

WHEN an order is placed, THE system SHALL notify the customer of the order confirmation using their preferred contact method.

IF a customer's preferred contact method is unavailable, THE system SHALL fall back to the secondary contact method.

### Profile Visibility Settings

WHEN a customer creates a profile, THE display name SHALL be publicly visible by default.

CUSTOMERS SHALL be able to set their display name visibility to public or private.

WHEN a display name is set to private, OTHER customers SHALL NOT see it in search results or listings.

WHEN a display name is set to private, THE system SHALL show "private" instead of the actual display name in public-facing areas.

THE display name SHALL ALWAYS be visible to the customer themselves.

THE display name SHALL ALWAYS be visible in the customer's own order history and profile page.

THE display name SHALL ALWAYS be visible to the seller when the customer places an order.

WHEN a display name is set to private, THE seller SHALL still see the actual name for order communication purposes.

THE system SHALL allow customers to change their display name visibility setting at any time.

WHEN a customer's display name visibility is changed, THE change SHALL take effect immediately across all platform features.

IF a customer's account is banned, THE display name SHALL be replaced with "banned user" in all public-facing areas regardless of visibility settings.

### Profile Edit Restrictions

WHEN a customer attempts to update their display name to an identical value, THE system SHALL NOT create a new snapshot.

WHEN a customer updates their display name, THE system SHALL validate the new name does not violate content policies.

IF a display name contains offensive or prohibited content, THE system SHALL reject the update.

WHEN a customer updates their phone number to an identical value, THE system SHALL NOT create a new snapshot.

CUSTOMERS SHALL be able to update their profile at any time except during system maintenance periods.

WHEN the system is in maintenance mode, THE system SHALL display a notification that profile updates are temporarily unavailable.

IF a profile update fails due to a system error, THE system SHALL preserve the existing profile data.

IF a profile update fails due to network issues, THE system SHALL inform the customer and allow them to retry.

WHEN a profile update is partially successful, THE system SHALL roll back all changes to maintain data integrity.

CUSTOMERS SHALL receive a confirmation message after a successful profile update with a timestamp of when the change occurred.

## ShippingAddress Validation Rules

Shipping addresses require recipient name and phone number as mandatory fields. Street address, city, state or province, postal code, and country are all required for complete addresses. Each customer can maintain multiple shipping addresses with different delivery locations. One address per customer can be designated as the default shipping address for convenience. Address fields support text input up to 500 characters for street addresses and 100 characters for names. Postal codes must match the expected format for the selected country. Customers can edit and delete their saved addresses at any time. Address changes do not affect historical orders which preserve the original shipping address.

### Recipient Name Requirement

THE shipping address SHALL include a recipient name field that is mandatory and cannot be empty.

THE system SHALL validate that the recipient name field contains only text characters with a maximum length of 100 characters.

IF a shipping address is submitted without a recipient name, THE system SHALL reject the address creation request.

THE system SHALL require the recipient name to be provided when editing an existing shipping address.

### Phone Number in Addresses

THE shipping address SHALL include a phone number field that is mandatory for address validity.

THE system SHALL validate that the phone number field contains valid phone number characters for the selected country.

WHEN a customer adds a new shipping address, THE system SHALL require a phone number to be entered.

IF the phone number format does not match the expected pattern for the selected country, THE system SHALL reject the address.

THE system SHALL allow customers to update the phone number on an existing address at any time.

THE phone number SHALL be preserved in order snapshots even after the address is deleted from the customer's profile.

### Street Address Character Limits

THE street address field SHALL support a maximum of 500 characters.

THE system SHALL accept street addresses with a minimum of 10 characters to ensure sufficient detail.

IF the street address exceeds 500 characters, THE system SHALL reject the address and display a validation error.

WHEN editing a shipping address, THE system SHALL allow the street address to be modified up to the 500-character limit.

THE system SHALL preserve the original street address in the order record even if the customer later modifies their saved address.

### Default Address Designation

WHEN a customer adds their first shipping address, THE system SHALL automatically set it as the default address.

THE system SHALL allow customers to set exactly one address as their default shipping address at any time.

IF a customer designates a new address as default, THE system SHALL automatically remove the default designation from the previous default address.

WHEN a customer proceeds to checkout, THE system SHALL pre-select the default address if one exists.

IF a customer deletes their default address, THE system SHALL automatically select the next available address as the new default.

IF a customer has no addresses, THE system SHALL NOT display any default address option during checkout.

### Multiple Addresses per Customer

THE system SHALL allow each customer to maintain multiple shipping addresses simultaneously.

WHEN a customer adds a new shipping address, THE system SHALL allow up to a maximum of 20 addresses per customer account.

IF a customer attempts to add a 21st shipping address, THE system SHALL reject the request and display a maximum limit message.

THE system SHALL allow customers to edit any of their saved addresses without removing other addresses.

WHEN viewing their address list, THE system SHALL display all customer addresses in a paginated list with the default address marked.

### Postal Code Country Matching

WHEN a customer selects a country for their shipping address, THE system SHALL validate the postal code format against that country's expected pattern.

THE system SHALL require a postal code to be entered for countries where postal codes are standard practice.

IF the postal code format does not match the selected country's expected pattern, THE system SHALL reject the address submission.

THE system SHALL provide a list of valid postal code formats for the selected country to assist customer input.

WHEN a customer edits an address, THE system SHALL validate the postal code if the country field is also changed.

### Address Deletion Safety Rules

THE system SHALL allow customers to delete any shipping address that has no pending orders requiring that address.

WHEN a customer attempts to delete an address, THE system SHALL first check for any orders with "shipped" or "delivered" status that used that address.

IF the address has been used in any completed orders, THE system SHALL allow the deletion but display a confirmation message indicating the address will be removed from the customer's saved list.

IF the address has an active pending order ("paid" status), THE system SHALL prevent deletion and display a message indicating the address is in use.

THE system SHALL preserve the shipping address information in all order records even after the address is deleted from the customer's profile.

### Address Editing Capabilities

THE system SHALL allow customers to edit all fields of their saved shipping addresses at any time.

WHEN a customer edits an address, THE system SHALL validate all required fields before saving the changes.

IF an address is updated, THE system SHALL preserve the original address in all historical order records.

THE system SHALL allow the same address to be used as the default address after being edited.

WHEN an address is edited, THE system SHALL update the modified timestamp to reflect when the changes were made.

## Seller Validation Rules

Seller accounts require a valid email address that is unique across all seller accounts. Passwords must be provided during seller registration and meet security requirements. Seller accounts enter a pending approval state immediately after creation. Only administrators can approve or reject seller registration requests. Rejected sellers must provide a new request to reapply for account activation. Seller accounts can only be deleted when no pending orders exist in paid or shipped status. Accounts with pending cancellation or refund requests cannot be deleted by sellers. Seller accounts maintain approval status tracking visible to the account owner.

### Seller Email Uniqueness

WHEN a seller creates a new account, THE system SHALL validate that the email address is unique across all seller accounts.

IF a seller attempts to register with an email that already exists in the system, THE system SHALL reject the registration request and display an error message indicating the email is already in use.

THE system SHALL store the email address in lowercase format to ensure case-insensitive uniqueness validation.

WHEN a seller updates their email address, THE system SHALL verify that the new email is not already associated with another seller account before accepting the change.

IF a seller attempts to update their email to an address already in use by another seller, THE system SHALL reject the update and display an appropriate error message.

### Pending Approval Workflow

WHEN a seller submits a registration request, THE system SHALL automatically set the account approval status to pending.

WHEN a seller account is in pending status, THE system SHALL restrict all selling-related operations including product creation, order processing, and customer communication.

WHEN an administrator views a seller account with pending status, THE system SHALL display the registration submission timestamp and seller profile information for review.

WHEN an administrator approves a seller account, THE system SHALL immediately change the approval status to approved and enable all seller capabilities.

WHEN an administrator rejects a seller account, THE system SHALL set the approval status to rejected and require an administrator to provide a rejection reason before saving the rejection.

### Rejection Resubmission Process

WHEN a seller account is rejected, THE system SHALL display the rejection reason to the seller during their next login attempt.

WHEN a rejected seller submits a new registration request, THE system SHALL create a new seller account record with pending approval status.

IF a rejected seller attempts to modify their shop profile information before reapplication, THE system SHALL reject the modification until a new registration request is approved.

WHEN a seller submits a resubmission request after rejection, THE system SHALL clear the previous rejection reason and start a fresh approval review process.

IF a seller has multiple rejected registration attempts, THE system SHALL track the count of rejection attempts and display it to administrators for review.

### Seller Account Deletion Restrictions

WHEN a seller attempts to delete their account, THE system SHALL check for any pending orders in paid or shipped status before allowing deletion.

IF a seller has pending orders in paid or shipped status, THE system SHALL reject the account deletion request and display a message indicating the orders must be completed first.

WHEN a seller attempts to delete their account, THE system SHALL check for any pending cancellation requests associated with their order items.

IF a seller has pending cancellation requests, THE system SHALL reject the account deletion request and display a message indicating the requests must be resolved first.

WHEN a seller attempts to delete their account, THE system SHALL check for any pending refund requests associated with their order items.

IF a seller has pending refund requests, THE system SHALL reject the account deletion request and display a message indicating the requests must be resolved first.

WHEN a seller account with no restrictions is deleted, THE system SHALL preserve all order history and snapshots for legal and record-keeping purposes.

### Approval Status Visibility

WHEN a seller logs into their account, THE system SHALL display their current approval status prominently on the dashboard.

WHEN a seller account has pending status, THE system SHALL display an estimate of how long approval typically takes.

WHEN a seller account has approved status, THE system SHALL enable access to the seller dashboard and all selling features.

WHEN a seller account has rejected status, THE system SHALL display the rejection reason provided by the administrator.

WHEN a rejected seller views their account status, THE system SHALL display a link to submit a new registration request.

WHEN an administrator reviews seller accounts, THE system SHALL group accounts by approval status (pending, approved, rejected) for efficient management.

### Pending Order Protection

WHEN a seller account is under review, THE system SHALL prevent any order items associated with pending orders from being modified or cancelled by the seller.

WHEN a seller with approved status creates products, THE system SHALL allow those products to be purchased only after the seller status remains approved.

IF a seller is suspended by an administrator while pending orders exist, THE system SHALL allow the seller to complete fulfillment of those orders but prevent new product creation.

WHEN a seller account is suspended, THE system SHALL automatically hide all products from search and category listings while preserving order history.

WHEN a seller account is unsuspended, THE system SHALL automatically restore product visibility in search and category listings.

### Seller Registration Prerequisites

WHEN a user begins seller registration, THE system SHALL require a valid email address and password as prerequisites for account creation.

WHEN a seller registration form is submitted, THE system SHALL validate that the shop name meets character length requirements.

WHEN a seller registration form is submitted, THE system SHALL validate that the logo image file meets format and size requirements if provided.

IF a seller registration form is missing required fields, THE system SHALL reject the submission and highlight the missing fields.

WHEN a user attempts to register as a seller while already having a customer account, THE system SHALL create separate but linked accounts for customer and seller roles.

## SellerProfile Validation Rules

Seller profiles require a shop name that must be between 1 and 100 characters. Shop descriptions are optional but if provided support substantial text content. Shop logo images are required for profile completion and must meet file format requirements. Sellers can update shop names, descriptions, and logos through the dashboard. Every profile modification creates a snapshot preserving the previous state for transparency. Shop names are displayed on all product listings and order records. Customer-visible shop profiles show current information along with seller ratings. Profile snapshots include image metadata and timestamp information for dispute resolution.

### Shop Name Character Constraints

THE shop name MUST be between 1 and 100 characters in length.

WHEN a seller creates a new shop profile, THE system SHALL validate that the shop name field is not empty.

IF the shop name exceeds 100 characters, THE system SHALL reject the request and display an error message indicating the maximum length limit.

IF the shop name is empty, THE system SHALL reject the request and prompt the seller to provide a shop name.

IF the shop name contains only whitespace characters, THE system SHALL reject the request.

WHEN a seller edits their shop name, THE system SHALL validate the new value against the same character constraints.

THE shop name MUST be unique across all sellers on the platform.

IF a seller attempts to register with a shop name that already exists, THE system SHALL reject the registration request.

WHEN a seller account is suspended, THE shop name remains visible in all existing order records.

WHEN a seller account is deleted, THE shop name is preserved in all historical order records.

### Logo Image File Requirements

WHEN a seller uploads a logo image, THE system SHALL validate that the file is in one of the following formats: JPEG, PNG, or GIF.

IF the uploaded file is not in a supported format, THE system SHALL reject the upload and prompt the seller to choose a different file.

THE logo image file size MUST NOT exceed 10 megabytes.

IF the file size exceeds 10 megabytes, THE system SHALL reject the upload and display an error message indicating the size limit.

WHEN a seller uploads a logo, THE system SHALL create a thumbnail version for display in search results and seller lists.

THE logo image MUST be readable and clearly display the seller's branding.

IF the logo image appears to be blank or does not render properly, THE system SHALL flag it for review.

WHEN a seller edits their logo image, THE old logo is preserved in the profile snapshot.

IF a seller removes their logo image, THE system SHALL create a snapshot recording the removal.

WHEN displaying the seller profile, THE system SHALL show the current logo image along with the seller's shop name.

### Profile Modification Snapshots

WHEN a seller modifies their shop profile (shop name, description, or logo), THE system SHALL create a snapshot of the previous state.

THE snapshot MUST record the exact timestamp of the modification.

THE snapshot MUST include the field(s) that were changed.

THE snapshot MUST include the values before the modification.

THE snapshot MUST include the values after the modification.

WHEN a seller views their profile modification history, THE system SHALL display all snapshots in chronological order.

THE snapshot record MUST be immutable and cannot be deleted or modified.

WHEN a seller deletes their account, THE profile snapshots are preserved for at least 7 years.

WHEN an administrator reviews a seller profile for dispute resolution, THE system SHALL provide access to all profile snapshots.

IF a snapshot record cannot be created, THE system SHALL halt the profile modification and notify the seller.

### Shop Name Visibility Rules

THE shop name MUST be displayed on all product listings where the seller's products appear.

WHEN customers view a category page, THE shop name appears alongside each product listing.

WHEN customers view search results, THE shop name appears alongside each product.

WHEN customers view order confirmation pages, THE shop name appears for each seller's items.

WHEN customers view their order history, THE shop name is displayed for all past orders from that seller.

THE shop name displayed in order records MUST match the shop name at the time of purchase.

WHEN a seller changes their shop name, THE system SHALL NOT update the shop name displayed in historical order records.

IF a seller's account is banned, THE shop name remains visible in all order history.

THE shop name MUST be visible on the seller's public profile page.

WHEN the shop name is updated, THE system SHALL update the shop name on all current product listings.

### Description Text Capacity

THE shop description field is optional and sellers may choose not to provide one.

IF a seller provides a shop description, THE system SHALL allow up to 5000 characters.

IF the shop description exceeds 5000 characters, THE system SHALL reject the input and display an error indicating the maximum length.

WHEN a seller edits their shop description, THE system SHALL validate the new value against the character limit.

THE shop description SHOULD NOT contain HTML tags or executable script content.

IF the description contains HTML tags, THE system SHALL strip them before saving.

IF the description contains script content, THE system SHALL reject the input.

WHEN customers view a seller profile, THE system SHALL display the description text in a readable format.

IF the description is empty, THE system SHALL display a placeholder message indicating no description available.

WHEN a seller updates their description, THE change is captured in a profile modification snapshot.

### Seller Rating Integration

THE seller profile MUST display an average rating calculated from all product reviews.

THE average rating is calculated from reviews on products sold by the seller.

IF a seller has no reviews, THE system SHALL display a rating of 0 or no rating.

WHEN customers view the seller profile, THE system SHALL show the average rating rounded to two decimal places.

WHEN customers view product listings, THE seller's average rating is displayed next to the shop name.

IF a review is deleted by the customer, THE system SHALL recalculate the average rating.

IF a review is created, THE system SHALL recalculate the average rating.

THE rating display MUST update within 24 hours of any review change.

IF a seller account is suspended, THE existing rating remains displayed but is marked as "not available for new purchases."

WHEN customers view a category or search page, THE seller rating is visible for each seller's products.

### Profile Change Transparency

WHEN a seller requests dispute resolution regarding profile changes, THE system SHALL provide access to all profile snapshots.

WHEN an administrator investigates a seller profile, THE system SHALL display the complete modification history.

THE modification history MUST show when each change was made.

THE modification history MUST show who made each change (seller account email).

THE modification history MUST show what values were before each change.

THE modification history MUST show what values were after each change.

WHEN a seller account is deleted, THE modification history is preserved with the account.

WHEN a seller account is banned, THE modification history remains accessible to administrators.

THE modification history CANNOT be modified or deleted by any actor including administrators.

WHEN a dispute is resolved, THE system SHALL archive the profile modification snapshots for the dispute.

## Category Validation Rules

Categories require names that are between 1 and 100 characters in length. Category descriptions are optional but provide context for customers browsing products. Categories can have one level of subcategory nesting for organized product grouping. Only administrators can create, edit, or delete categories in the system. Category names must be unique within their parent category level. Products must be assigned to exactly one category or subcategory at all times. Deleted categories cause products to become uncategorized rather than being deleted. Category hierarchy supports browsing and filtering functionality for customers.

### Category Name Uniqueness

WHEN an administrator creates a category, THE system SHALL require a unique name within the parent category level.

IF a category name already exists within the same parent category, THE system SHALL reject the creation request and display an error message.

IF a category name already exists under a different parent category, THE system SHALL allow the creation since the uniqueness is per-parent-level.

WHEN an administrator edits a category name, THE system SHALL validate that the new name is unique among siblings (categories sharing the same parent).

IF the new name conflicts with an existing sibling category name, THE system SHALL reject the update and prompt for a different name.

### Subcategory Nesting Rules

WHEN an administrator creates a subcategory, THE system SHALL validate that the parent category is a top-level category (has no parent itself).

IF an administrator attempts to create a subcategory under an existing subcategory, THE system SHALL reject the request and indicate that only one level of nesting is permitted.

WHEN a category is created as a subcategory, THE system SHALL automatically mark it as a leaf category in the hierarchy.

WHEN products are assigned to a subcategory, THE system SHALL prevent moving those products to another subcategory of the same parent if the subcategory is deleted (products become uncategorized instead).

WHEN browsing categories, THE system SHALL display only one level of nesting (parent categories with their immediate subcategories shown as nested items).

### Administrator-Only Category Creation

WHEN a customer attempts to create, edit, or delete a category, THE system SHALL reject the request and indicate insufficient permissions.

WHEN a seller attempts to create, edit, or delete a category, THE system SHALL reject the request and indicate insufficient permissions.

WHEN an administrator creates a category, THE system SHALL verify the user has administrator role before proceeding.

WHEN an administrator edits a category name or description, THE system SHALL perform the update only after confirming administrator privileges.

WHEN an administrator deletes a category, THE system SHALL first verify administrator status and then proceed with the deletion process.

### Product Category Assignment

WHEN a seller creates a product, THE system SHALL require selection of exactly one category or subcategory.

IF a seller attempts to create a product without selecting a category, THE system SHALL reject the product creation and display an error.

WHEN an administrator edits a category that contains products, THE system SHALL allow the edit but maintain all existing product assignments.

IF an administrator attempts to delete a category that contains products, THE system SHALL change all products to uncategorized status rather than deleting them.

WHEN a customer browses products by category, THE system SHALL show products only from the selected category and its subcategories.

### Deleted Category Handling

WHEN an administrator deletes a category, THE system SHALL change all products in that category to uncategorized status.

IF a category is deleted, THE system SHALL NOT delete any products that were assigned to it.

WHEN products become uncategorized due to category deletion, THE system SHALL preserve the products in the inventory and search results.

WHEN a deleted category is referenced in existing product listings or order records, THE system SHALL display the category name as 'Uncategorized' or retain the original name in historical records.

IF a category is deleted while it has subcategories, THE system SHALL also change all subcategories to uncategorized parent status and preserve their products.

### Category Hierarchy Structure

WHEN the system displays the category hierarchy, THE system SHALL show a two-level structure: top-level categories with their immediate subcategories.

WHEN a customer browses categories, THE system SHALL display category names and descriptions in a hierarchical tree format.

IF a category has no subcategories, THE system SHALL display it as a leaf category without nested items.

WHEN a category has multiple subcategories, THE system SHALL list all subcategories indented under their parent category.

WHEN navigating to a subcategory page, THE system SHALL show products from that subcategory only (not products from sibling subcategories).

### Browsing Organization Requirements

WHEN a customer views the category listing, THE system SHALL display all top-level categories with their subcategories collapsed or expanded based on user interaction.

WHEN a customer clicks on a category, THE system SHALL show all products assigned to that category and its subcategories.

WHEN filtering search results by category, THE system SHALL include products from the selected category and all its descendant subcategories.

IF a category contains no products, THE system SHALL still display the category in browsing views but show zero product count.

WHEN a customer navigates through category hierarchy, THE system SHALL maintain breadcrumb navigation showing the path from top-level category to current subcategory.

## Product Validation Rules

Product names are required and must be between 1 and 500 characters. Product descriptions are required and support detailed text content for customers. Products require assignment to exactly one category or subcategory from available options. Base price is required and must be a positive numeric value. Products belong exclusively to the seller who created them. Products with no variants are visible but marked as unavailable for purchase. Sellers can only delete products when no pending orders exist for any variant. Product snapshots capture all fields including name, description, category, and base price.

### Product Name Length Validation

### Product Name Length Requirements

WHEN a seller creates a product, THE system SHALL:
1. Require a product name
2. Accept product names between 1 and 500 characters
3. Reject product names that are empty or exceed 500 characters

IF the product name is empty, THE system SHALL reject the creation request.
IF the product name exceeds 500 characters, THE system SHALL reject the creation request.
THE system SHALL reject the request when an edit attempt changes the product name to exceed 500 characters.
WHEN editing a product name, THE system SHALL preserve the original name if the new name violates the length requirement.


### Product Description Content Requirements

### Product Description Requirements

WHEN a seller creates a product, THE system SHALL:
1. Require a product description
2. Accept detailed text content for the description
3. Reject requests with empty descriptions

IF the product description is empty, THE system SHALL reject the creation request.
WHEN editing a product description, THE system SHALL reject the edit if the new description is empty.
THE system SHALL reject the request when the description field is missing from the creation request.
EVERY product MUST have a non-empty description value visible to customers.


### Category Assignment Requirement

### Category Assignment Validation

WHEN a seller creates a product, THE system SHALL:
1. Require assignment to exactly one category or subcategory
2. Validate that the selected category exists in the system
3. Accept categories and subcategories (one level of nesting only)

IF no category is selected, THE system SHALL reject the product creation request.
IF the selected category does not exist, THE system SHALL reject the creation request.
IF a subcategory is selected without a valid parent category, THE system SHALL reject the creation request.
WHEN editing a product, THE system SHALL reject the request when category assignment is removed.
THE system SHALL reject requests to assign products to multiple categories simultaneously.


### Positive Base Price Validation

### Base Price Validation Rules

WHEN a seller creates a product, THE system SHALL:
1. Require a base price value
2. Accept only positive numeric values
3. Reject zero or negative price values

IF the base price is missing, THE system SHALL reject the product creation request.
IF the base price is zero or negative, THE system SHALL reject the creation request.
IF the base price is not a numeric value, THE system SHALL reject the creation request.
WHEN editing a product, THE system SHALL reject requests to change the base price to zero or negative.
THE system SHALL reject the request when an invalid price format is provided (non-numeric).


### Product-Seller Ownership Rules

### Product Ownership and Isolation

WHEN a seller creates a product, THE system SHALL:
1. Associate the product exclusively with the creating seller
2. Allow only the product owner to edit the product
3. Allow only the product owner to delete the product (subject to restrictions)

IF a seller attempts to edit another seller's product, THE system SHALL reject the request.
IF a seller attempts to delete another seller's product, THE system SHALL reject the request.
THE system SHALL prevent access to product management functions for non-owners.
WHEN a seller is deleted, THE system SHALL preserve product ownership records for order history purposes.
THE system SHALL reject requests to transfer product ownership to another seller.


### Variant Availability Requirement

### Product Variant Requirements

WHEN a seller creates a product, THE system SHALL:
1. Allow product creation without variants initially
2. Require at least one variant for a product to be purchasable
3. Show products with no variants as "unavailable" in search results

IF a product has no variants, THE system SHALL mark the product as unavailable for purchase.
WHEN a product gains its first variant, THE system SHALL make the product purchasable.
THE system SHALL display "unavailable" status on products without variants in all listings.
WHEN the last variant of a product is deleted, THE system SHALL mark the product as unavailable.
THE system SHALL prevent checkout attempts on products with no available variants.


### Product Deletion Pending Order Checks

### Product Deletion Restrictions

WHEN a seller attempts to delete a product, THE system SHALL:
1. Check for pending order items with paid or shipped status for any variant
2. Check for pending cancellation requests for any variant
3. Check for pending refund requests for any variant

IF any variant has a pending order item with paid status, THE system SHALL reject the deletion.
IF any variant has a pending order item with shipped status, THE system SHALL reject the deletion.
IF any variant has a pending cancellation request, THE system SHALL reject the deletion.
IF any variant has a pending refund request, THE system SHALL reject the deletion.
THE system SHALL reject the deletion request and display reasons for each blocking condition.
WHEN all blocking conditions are cleared, THE system SHALL allow the deletion to proceed.


### Product Snapshot on Edit

### Product Edit Snapshot Requirements

WHEN a seller edits a product, THE system SHALL:
1. Create a snapshot before applying the changes
2. Record when the change was made
3. Record what was changed with before and after values
4. Include all product fields in the snapshot

WHEN any product field is modified, THE system SHALL create a snapshot of the previous state.
THE snapshot SHALL record the timestamp of the edit operation.
THE snapshot SHALL preserve the old and new values for each changed field.
WHEN a product is edited, THE system SHALL preserve the snapshot even after product deletion.
ADMINS SHALL be able to view snapshots of any product in the system.
Sellers SHALL be able to view snapshots of their own products only.


### Product Deletion After Edit

### Product Deletion Consequences

WHEN a product is deleted, THE system SHALL:
1. Delete all variants and inventory records
2. Remove the product from search and category listings
3. Preserve all snapshots of the deleted product
4. Preserve product information in order history

UPON deletion, THE system SHALL permanently remove all variants associated with the product.
UPON deletion, THE system SHALL remove the product from all search results and category pages.
UPON deletion, THE system SHALL preserve all snapshots for dispute resolution purposes.
THE system SHALL preserve product name and description in existing order items.
THE system SHALL automatically remove the product from all customer wishlists.


## ProductVariant Validation Rules

Product variants require a unique SKU code that identifies each combination. SKU codes must be between 1 and 50 characters in length. Option values describe the variant characteristics such as color or size in structured format. Price override is optional and allows variants to differ from base price. Stock quantity is required and must be a non-negative integer. A product must have at least one variant to be purchasable by customers. Each variant edit creates a snapshot preserving option values and pricing. Variants with zero stock cannot be added to shopping carts by customers.

### SKU Code Uniqueness Requirement

WHEN a seller creates a product variant, THE system SHALL assign a unique SKU code to identify that variant.

THE system SHALL ensure the SKU code is unique across all products in the platform.

IF the SKU code already exists in the system, THE system SHALL reject the variant creation request.

IF a seller attempts to edit a variant's SKU code to match an existing variant, THE system SHALL reject the update request.

THE system SHALL enforce SKU code uniqueness across all variants belonging to different products.

### SKU Character Length Constraints

WHEN a seller specifies an SKU code, THE system SHALL validate that the SKU code length is between 1 and 50 characters.

IF the SKU code is empty or contains only whitespace, THE system SHALL reject the request.

IF the SKU code exceeds 50 characters, THE system SHALL reject the variant creation or update request.

THE system SHALL display an error message indicating the SKU code must be between 1 and 50 characters when validation fails.

### Optional Price Override Rule

WHEN a seller creates or edits a product variant, THE system SHALL allow the seller to specify an optional price that may differ from the product's base price.

IF the seller does not specify a price override, THE system SHALL use the product's base price for that variant.

IF the seller specifies a price override, THE system SHALL allow any positive numeric value.

IF the seller provides a price override of zero or a negative value, THE system SHALL reject the variant creation or update request.

THE system SHALL display the variant's actual price (whether base price or override) to customers on the product detail page.

### Stock Quantity Requirements

WHEN a seller creates a product variant, THE system SHALL require a stock quantity value.

THE system SHALL validate that stock quantity is a non-negative integer (zero or positive).

IF the seller provides a negative stock quantity, THE system SHALL reject the variant creation or update request.

IF the seller provides a non-integer or decimal stock quantity, THE system SHALL reject the request.

THE system SHALL display variants with zero stock quantity as "out of stock" to customers.

### Minimum Variant Requirement

WHEN a seller creates a product, THE system SHALL allow the product to exist with zero variants initially.

WHEN a product has no variants, THE system SHALL mark the product as "unavailable" in search results and category listings.

IF a customer attempts to add a product without variants to their shopping cart, THE system SHALL reject the request and display a message indicating the product is unavailable.

WHEN a product has at least one variant, THE system SHALL allow the product to be visible and purchasable.

THE system SHALL display all available variants when a product has one or more variants.

### Variant Edit Snapshot Creation

WHEN a seller edits a product variant's option values, THE system SHALL create a snapshot to preserve the previous state.

WHEN a seller edits a product variant's price override, THE system SHALL create a snapshot to preserve the previous price.

THE snapshot SHALL record the timestamp of the change, the variant identifier, the option values before and after, and the price before and after.

THE system SHALL allow sellers to view the complete history of snapshots for their variants.

THE system SHALL preserve all variant snapshots even if the variant or product is deleted.

### Out-of-Stock Cart Restrictions

WHEN a customer attempts to add a variant to their shopping cart, THE system SHALL check the variant's current stock quantity.

IF the variant's stock quantity is zero, THE system SHALL prevent the variant from being added to the cart.

THE system SHALL display a message to the customer indicating the variant is out of stock.

IF a variant becomes out of stock after being added to the cart, THE system SHALL mark the cart item as unavailable.

WHEN a customer proceeds to checkout, THE system SHALL exclude any unavailable items from the order and display a warning that those items cannot be purchased.

## ProductImage Validation Rules

Product images require a valid URL for each uploaded image. Image URLs must conform to supported web format standards and length limits. Each image has a display order that determines which image appears as thumbnail. The first image in display order becomes the main product thumbnail. Sellers can reorder images to change which one appears prominently. Image changes are included in product snapshots for historical tracking. Sellers can remove images from products at any time. Multiple images per product support customer visualization of products from different angles.

### Image URL Format Validation

THE system SHALL validate that all image URLs conform to supported web format standards before accepting an upload.

WHEN a seller uploads an image, THE system SHALL verify the URL format matches standard web image URL patterns.

IF the image URL format is invalid, THE system SHALL reject the upload and notify the seller.

THE system SHALL store each image URL with a maximum length of 2000 characters as defined in ProductImage.schema.imageUrl.

WHEN a seller provides an image URL, THE system SHALL ensure the URL is accessible and points to a valid image resource.

IF the image URL cannot be resolved or the resource is inaccessible, THE system SHALL reject the upload.

### Supported Image Formats

THE system SHALL support standard web image formats for product images.

THE system SHALL reject image URLs that point to unsupported image formats.


### Thumbnail Selection Rules

THE system SHALL automatically designate the first image in display order as the main product thumbnail.

WHEN a product has multiple images, THE system SHALL display the image with display order value of 1 as the primary thumbnail.

IF a product has only one image, THE system SHALL use that single image as the thumbnail.

THE system SHALL ensure the thumbnail image is prominently displayed on product listing pages and search results.

IF the thumbnail image is deleted, THE system SHALL automatically promote the next image in display order to become the new thumbnail.

WHEN a product is created, THE system SHALL assign display order value of 1 to the first uploaded image.


### Image Reordering Capability

WHEN a seller reorders product images, THE system SHALL update the display order values to reflect the new sequence.

THE system SHALL allow sellers to change the display order of images on their products at any time.

IF a seller requests to reorder images, THE system SHALL preserve all image URLs while updating their display order values.

WHEN display order is modified, THE system SHALL create a product snapshot that includes the image reorder change.

THE system SHALL ensure display order values remain integers and maintain a sequential ordering.

IF a seller sets an invalid display order value, THE system SHALL reject the update and notify the seller of the valid range.

WHEN images are reordered, THE system SHALL update the main thumbnail to reflect the new first image in the sequence.


### Multiple Images Per Product

THE system SHALL allow sellers to upload multiple images for each product they create.

WHEN a seller uploads images to a product, THE system SHALL store all images with unique display order values.

THE system SHALL display all uploaded product images on the product detail page.

IF a seller attempts to add a duplicate image URL to the same product, THE system SHALL reject the duplicate upload.

THE system SHALL support an unlimited number of product images per product to ensure comprehensive product visualization.

WHEN viewing a product list, THE system SHALL display the thumbnail image for each product.

WHEN viewing product details, THE system SHALL display all images in the display order sequence.


### Snapshot Image Inclusion

WHEN a product is edited, THE system SHALL create a product snapshot that includes all current product images.

THE system SHALL include image URLs and display order values in every product snapshot created.

IF an image is added, deleted, or reordered as part of a product edit, THE system SHALL capture the change in the snapshot.

THE system SHALL preserve image snapshot data even after the product itself is deleted.

WHEN a seller views product snapshots, THE system SHALL display the complete image set as it existed at the time of each snapshot.

IF a seller deletes all images from a product, THE system SHALL record this change in the product snapshot with empty image data.

THE system SHALL ensure image snapshots are immutable and cannot be deleted or modified.


### Image Removal Permissions

WHEN a seller requests to delete an image from their product, THE system SHALL verify seller ownership before allowing deletion.

IF the requesting seller does not own the product, THE system SHALL reject the deletion request.

WHEN an image is deleted from a product, THE system SHALL update the display order values of remaining images.

IF a seller attempts to delete the only remaining image on a product, THE system SHALL allow the deletion and mark the product as having no images.

THE system SHALL NOT allow deletion of product images by any actor other than the product-owning seller.

IF the image deletion request is processed, THE system SHALL create a product snapshot that records the removal.

THE system SHALL ensure deleted images are no longer accessible via the product detail page.


### Display Order Precedence

THE system SHALL use display order values to determine the sequence in which product images are presented.

WHEN displaying product images, THE system SHALL order them by ascending display order values.

IF multiple images share the same display order value, THE system SHALL use creation timestamp as a tiebreaker.

THE system SHALL ensure display order value of 1 always represents the primary/thumbnail image.

WHEN customers view products, THE system SHALL display images in display order precedence on the product detail page.

IF the display order is modified, THE system SHALL ensure the new sequence is immediately reflected across all product views.

THE system SHALL maintain display order precedence consistency across all platform surfaces including search results, category listings, and product detail pages.


## Wishlist Validation Rules

Wishlist entries link customers to specific products they want to save. Each wishlist entry is uniquely identified by customer-product pair. Products added to wishlists remain accessible even if variants change. Deleted products are automatically removed from all customer wishlists. Wishlist entries include creation timestamps for sorting and management. Customers can view their wishlists through paginated lists. Multiple customers cannot share wishlists as each is tied to an account. Wishlists serve as personal product collection tools for customers.

### Customer-Product Uniqueness Constraint

WHEN a customer adds a product to their wishlist, THE system SHALL enforce that only one wishlist entry can exist for that customer-product pair.

IF a customer attempts to add a product that already exists in their wishlist, THE system SHALL NOT create a duplicate entry.

IF a customer views their wishlist, THE system SHALL show each product at most once regardless of how many times it was attempted to be added.

IF a customer removes a product from their wishlist, THEN subsequent addition attempts by the same customer for that product SHALL create a new wishlist entry.

THE system SHALL reject duplicate addition attempts with a message indicating the product is already in the wishlist.

THE system SHALL ensure that no two wishlist entries can have identical customer-product combinations.

IF multiple customers attempt to add the same product to their respective wishlists, THE system SHALL create separate wishlist entries for each customer.

THE system SHALL validate uniqueness constraint before any wishlist creation or update operation.

WHEN importing or restoring wishlist data, THE system SHALL skip entries that would violate the customer-product uniqueness constraint.

### Deleted Product Automatic Cleanup

WHEN a seller deletes a product from the platform, THE system SHALL automatically remove that product from all customer wishlists.

IF a product is deleted, THE system SHALL identify all wishlist entries referencing that product.

THE system SHALL remove the deleted product from every customer's wishlist in a single transaction.

WHEN a customer views their wishlist after a product deletion, THE system SHALL NOT display the deleted product.

THE system SHALL log the removal of each wishlist entry due to product deletion for audit purposes.

IF a deleted product is later recreated by the same or different seller, THE system SHALL NOT automatically restore it to previous wishlists.

THE system SHALL ensure wishlist view counts reflect only active products.

IF a customer attempts to navigate to a wishlist entry for a deleted product, THE system SHALL redirect to the wishlist page.

THE system SHALL clean up deleted product entries even if the product deletion occurs while the product is being viewed by customers.

### Wishlist Pagination Support

WHEN a customer views their wishlist, THE system SHALL display wishlist entries in paginated format.

IF a customer's wishlist contains more entries than the page size, THE system SHALL provide navigation controls for additional pages.

THE system SHALL show the total number of wishlist entries and current page information.

WHEN paginating wishlist results, THE system SHALL maintain consistent ordering across pages.

THE system SHALL allow customers to navigate to specific pages or use next/previous controls.

IF a product is added to or removed from the wishlist while pagination is active, THE system SHALL refresh the pagination metadata.

WHEN searching or filtering wishlists, THE system SHALL recalculate pagination based on filtered results.

THE system SHALL ensure that products appearing on one page do not appear on another page.

IF a customer's wishlist is empty, THE system SHALL display an appropriate empty state message.

THE system SHALL maintain pagination state even when products are dynamically added or removed from the wishlist.

### Variant Change Tolerance

WHEN a seller modifies product variants, THE system SHALL preserve wishlist entries for the parent product.

IF a product variant is added to an existing product, THE system SHALL NOT create new wishlist entries automatically.

THE system SHALL allow customers to add the same product to their wishlist regardless of variant changes.

WHEN a customer clicks on a wishlist product, THE system SHALL display the current product details.

IF a product's base variant is deleted, THE system SHALL NOT remove the wishlist entry.

THE system SHALL show the latest available variants when displaying a wishlist product.

IF all variants of a product become unavailable, THE system SHALL still show the wishlist entry but mark it as unavailable.

WHEN a product's name or description is updated, THE system SHALL reflect changes in the wishlist display.

THE system SHALL maintain the original timestamp of the wishlist entry despite product modifications.

### Creation Timestamp Tracking

WHEN a product is added to a customer's wishlist, THE system SHALL record a creation timestamp.

IF a product is removed and later re-added to the wishlist, THE system SHALL create a new entry with a fresh timestamp.

THE system SHALL use the creation timestamp for sorting wishlist entries.

WHEN displaying wishlists, THE system SHALL allow sorting by creation date (newest/oldest first).

IF a customer exports their wishlist, THE system SHALL include creation timestamps in the export.

THE system SHALL ensure timestamps are stored in a consistent timezone across all entries.

WHEN calculating wishlist statistics, THE system SHALL use creation timestamps.

THE system SHALL preserve creation timestamps even when products are viewed by customers.

IF a customer modifies their wishlist settings, THE system SHALL NOT alter existing creation timestamps.

THE system SHALL ensure creation timestamps cannot be manually modified by users.

### Personal Collection Isolation

WHEN a customer views their wishlist, THE system SHALL only show entries belonging to that customer.

IF a customer attempts to access another customer's wishlist, THE system SHALL deny access.

THE system SHALL ensure wishlist data is completely isolated between different customer accounts.

WHEN a customer is banned, THE system SHALL maintain their wishlist data but prevent access.

IF a customer account is deleted, THE system SHALL delete all wishlist entries associated with that account.

THE system SHALL prevent wishlists from being shared through URL manipulation or direct access.

WHEN a customer shares a wishlist link, THE system SHALL either restrict access or create a private copy.

THE system SHALL enforce that each customer owns their own personal wishlist collection.

IF multiple customer accounts exist, THE system SHALL ensure no wishlist entry can be shared between accounts.

THE system SHALL maintain data isolation during all wishlist operations (view, add, remove, export).

### Wishlist Access Permissions

WHEN a customer is logged in, THE system SHALL grant access to their own wishlist.

IF a customer is not logged in, THE system SHALL deny access to any wishlist.

THE system SHALL require authentication before any wishlist operation can be performed.

WHEN a customer accesses their wishlist, THE system SHALL verify their authentication status.

IF a customer's session expires, THE system SHALL redirect to login before allowing wishlist access.

THE system SHALL not expose wishlist entry IDs or internal identifiers to unauthorized users.

WHEN a customer is banned, THE system SHALL prevent wishlist access while retaining the data.

THE system SHALL ensure that wishlist access permissions cannot be bypassed through API manipulation.

IF a seller attempts to access another customer's wishlist, THE system SHALL deny the request.

THE system SHALL log all wishlist access attempts for security auditing.

## ShoppingCart Validation Rules

Shopping carts are uniquely associated with individual customer accounts. Cart entries track creation and update timestamps for session management. Cart capacity allows multiple items from different sellers and products. Customers can add the same variant multiple times with combined quantities. Carts support quantity adjustments to increase or decrease item amounts. Cart entries maintain current product and variant information including price. Unavailable or deleted items are marked rather than removed immediately. Carts are automatically cleared when customers proceed to checkout.

### Customer-Cart Association

THE shopping cart SHALL be uniquely associated with each logged-in customer account.

THE shopping cart SHALL be automatically created when a customer first logs in.

WHEN a customer logs out, THE system SHALL preserve their shopping cart for the next login session.

IF a customer attempts to add items to a cart without being logged in, THE system SHALL redirect to the login page.

THE system SHALL reject requests to modify carts belonging to other customers.

THE system SHALL prevent cart access when a customer account is banned.

### Quantity Combination Rules

WHEN a customer adds the same variant to cart multiple times, THE system SHALL combine the quantities into a single line item.

THE system SHALL NOT create duplicate line items for the same variant within a customer's cart.

IF a customer adds a variant that already exists in their cart with quantity 3, THE system SHALL update the quantity to the combined total.

THE system SHALL allow customers to adjust cart item quantities up or down.

WHEN a customer reduces a cart item quantity to zero, THE system SHALL automatically remove that line item from the cart.

IF a customer attempts to add zero or negative quantity to cart, THE system SHALL reject the request.

### Price Tracking in Cart

WHEN an item is added to cart, THE system SHALL capture and display the current variant price.

THE system SHALL calculate the line subtotal by multiplying unit price by quantity.

WHEN a customer reviews their cart, THE system SHALL display the total price of all items.

IF the variant price changes after an item is in cart but before checkout, THE system SHALL use the price at checkout time.

THE system SHALL display item-specific pricing variations (e.g., promotional discounts) in the cart.

IF a variant's price becomes unavailable during checkout, THE system SHALL mark the item as unavailable and prevent checkout.

### Unavailable Item Handling

THE system SHALL check variant stock availability before adding items to cart.

IF a variant is out of stock, THE system SHALL prevent the customer from adding it to cart.

WHEN a variant's stock decreases below the cart quantity, THE system SHALL mark the item as unavailable in the cart.

WHEN a variant is deleted by the seller, THE system SHALL mark it as unavailable in customers' carts.

THE system SHALL NOT allow checkout of carts containing unavailable items.

IF unavailable items exist in cart at checkout, THE system SHALL display a warning and require the customer to remove them before proceeding.

THE system SHALL preserve unavailable item information for cart review but exclude them from order total calculation.

### Cart Timestamp Management

WHEN a cart is created, THE system SHALL record the creation timestamp.

WHEN a customer adds an item to cart, THE system SHALL update the cart's last modified timestamp.

WHEN a customer removes an item from cart, THE system SHALL update the cart's last modified timestamp.

WHEN a customer adjusts item quantity, THE system SHALL update the cart's last modified timestamp.

THE system SHALL display the last cart modification time to customers for session awareness.

IF a cart remains inactive for an extended period, THE system SHALL preserve cart data indefinitely (no automatic expiration).

### Multi-Seller Cart Support

THE shopping cart SHALL support items from multiple sellers in a single cart session.

THE system SHALL display which seller each product belongs to in the cart.

WHEN a customer proceeds to checkout, THE system SHALL group order items by seller.

THE system SHALL calculate a separate subtotal for each seller's items.

THE system SHALL generate multiple shipments from a single checkout when items are from different sellers.

IF an item from a suspended seller is in cart, THE system SHALL mark it as unavailable and prevent checkout.

### Checkout Auto-Clear Behavior

WHEN a customer successfully completes checkout and places an order, THE system SHALL automatically clear all items from the cart.

IF checkout fails due to payment failure, THE system SHALL preserve cart contents for retry.

IF checkout fails due to item availability issues, THE system SHALL preserve cart contents but mark unavailable items.

WHEN an order is successfully created, THE system SHALL remove all purchased variants from the customer's cart immediately.

THE system SHALL NOT require customers to manually clear their cart after successful checkout.

IF a customer abandons checkout, THE system SHALL preserve all cart items for future continuation.

## CartItem Validation Rules

Cart items must reference a valid variant that exists and is currently purchasable. Each cart item requires a specific quantity between 1 and maximum allowed limits. Cart items link to their parent cart through required relationship fields. Quantity updates combine with existing items of the same variant. Out of stock variants cannot be added or have quantities increased. Cart items maintain current pricing information at time of cart addition. Items are removed from cart during successful checkout or customer removal. Cart item validation prevents invalid variant references.

### Variant Existence Validation

WHEN a customer adds a variant to their cart, THE system SHALL verify the variant exists in the product catalog.

IF the variant does not exist, THE system SHALL reject the cart addition request and display an error message.

IF the variant has been deleted by the seller, THE system SHALL reject the cart addition request.

IF the variant is marked as inactive, THE system SHALL prevent it from being added to the cart.

THE system SHALL maintain variant relationship integrity by ensuring every cart item references a valid product variant.

IF a variant reference becomes invalid after cart creation, THE system SHALL mark the cart item as unavailable.

The system SHALL check variant existence at cart addition time, at quantity update time, and at checkout time.

### Quantity Minimum Requirements

WHEN a customer adds a variant to their cart, THE system SHALL require a minimum quantity of 1 unit.

IF the quantity provided is less than 1, THE system SHALL reject the cart addition request.

IF the quantity provided is zero, THE system SHALL treat it as a request to remove the item from the cart.

THE system SHALL accept quantity values of 1 or greater when adding new cart items.

THE system SHALL validate that quantity updates maintain a minimum of 1 for existing cart items.

IF a customer attempts to update quantity to 0 or below, THE system SHALL remove the cart item instead.

THE system SHALL reject negative quantity values in all cart operations.

### Cart Item Quantity Limits

WHEN a customer specifies a quantity for a cart item, THE system SHALL enforce maximum quantity limits per variant.

THE system SHALL prevent cart items from exceeding the available stock quantity.

IF the requested quantity exceeds available stock, THE system SHALL reject the addition and display the maximum available quantity.

THE system SHALL allow customers to add quantities up to the total available stock.

IF a customer tries to add more units than available, THE system SHALL show a warning and suggest the maximum available quantity.

THE system SHALL validate quantity limits at cart addition and at quantity update operations.

Multiple customers adding the same variant simultaneously may result in stock availability changes.

### Out-of-Stock Prevention

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as out of stock.

IF a variant is out of stock, THE system SHALL prevent it from being added to the cart.

IF an item in the cart becomes out of stock, THE system SHALL mark the cart item as unavailable.

WHEN an unavailable item is detected in the cart, THE system SHALL display a warning to the customer.

THE system SHALL prevent checkout for orders containing unavailable (out of stock) items.

IF a customer attempts to increase the quantity of an unavailable item, THE system SHALL reject the update.

THE system SHALL automatically remove out-of-stock variants from wishlists when they become unavailable.

### Price Snapshot in Cart

WHEN a customer adds a variant to their cart, THE system SHALL capture and store the current variant price.

THE system SHALL preserve the price snapshot at the time of cart addition, independent of subsequent price changes.

IF the variant price changes after cart addition, THE system SHALL maintain the original cart price for checkout.

THE system SHALL display the price snapshot in cart item line items and order summaries.

THE system SHALL calculate cart subtotals using the captured price snapshots.

IF a variant's price is updated by the seller, THE system SHALL show the new price in product listings but retain the old price in existing carts.

THE system SHALL ensure price snapshots remain immutable once stored in the cart.

### Variant Relationship Integrity

WHEN a cart item is created, THE system SHALL establish a relationship between the cart and the selected variant.

THE system SHALL ensure each cart item references exactly one product variant.

IF the referenced variant is deleted or becomes inactive, THE system SHALL mark the cart item as unavailable but preserve it in the cart.

THE system SHALL prevent cart items from referencing variants that belong to different sellers.

WHEN a customer views their cart, THE system SHALL display complete variant information including option values.

THE system SHALL maintain variant-product relationships by ensuring every variant belongs to a valid product.

IF a product is deleted by the seller, THE system SHALL remove all associated cart items and mark them as unavailable.

### Checkout Item Removal

UPON successful order creation, THE system SHALL automatically remove all cart items from the customer's cart.

IF checkout fails due to payment failure, THE system SHALL preserve all cart items for retry.

IF a variant becomes unavailable during checkout, THE system SHALL remove only that item from the checkout process.

THE system SHALL validate all cart items before checkout completion and remove unavailable items.

IF a cart item is removed during checkout, THE system SHALL notify the customer of the removed item.

THE system SHALL recalculate the order total after removing unavailable items.

WHEN a customer manually removes items from the cart, THE system SHALL update cart totals immediately.

## Order Validation Rules

Orders require a unique order number generated for each successful purchase. Orders link to exactly one customer who made the purchase. Total price is required and calculated from all items in the order. Orders can contain multiple items from different sellers. Order creation timestamps are recorded for tracking and support periods. Customer-selected shipping address is captured at order creation time. Orders maintain overall status derived from their individual item statuses. Orders cannot be modified after creation except through cancellation or refund processes.

### Order Number Generation and Uniqueness

WHEN an order is created, THE system SHALL generate a unique order number for each order.

WHEN an order is created, THE system SHALL ensure the order number is unique across all orders in the system.

IF the system attempts to create an order with a duplicate order number, THE system SHALL reject the request and generate a new unique number.

THE system SHALL use the generated order number for all order-related communications and tracking.

IF a customer requests to view an order, THE system SHALL retrieve it using the unique order number.

IF an order number is not found in the system, THE system SHALL indicate the order does not exist.

THE order number SHALL be immutable and cannot be changed after order creation.

IF duplicate order numbers are detected during system maintenance, THE system SHALL flag them for administrator review.

THE system SHALL prevent the reuse of order numbers even after order cancellation or refund.

IF order creation fails, THE system SHALL NOT assign an order number to the incomplete order.

### Customer Order Association

WHEN an order is created, THE system SHALL associate the order with exactly one customer account.

WHEN a customer logs in, THE system SHALL display only orders associated with that customer account.

IF a non-authenticated user attempts to access an order, THE system SHALL reject the request.

IF an order attempt is made with an invalid or banned customer account, THE system SHALL reject the order creation.

THE system SHALL maintain the customer relationship for the entire lifecycle of the order.

IF a customer account is deleted, THE system SHALL preserve the customer's order history.

IF a customer account is banned, THE system SHALL still allow access to the customer's order history.

WHEN a customer views their order details, THE system SHALL verify the customer is the owner of the order.

IF an order is transferred to a different customer, THE system SHALL create a complete record of the transfer.

THE customer account association SHALL be immutable after order creation.

### Total Price Calculation

WHEN an order is created, THE system SHALL calculate the total price from all order items in the order.

WHEN calculating total price, THE system SHALL use the unit price captured at order creation time for each item.

IF the sum of item prices exceeds the maximum allowed order value, THE system SHALL reject the order creation.

THE system SHALL display the total price to the customer before order confirmation.

IF any order item is removed from the order before completion, THE system SHALL recalculate the total price.

THE system SHALL NOT allow the total price to be manually modified by users or sellers.

IF currency conversion is required, THE system SHALL apply the conversion rate at order creation time.

WHEN an order is refunded, THE system SHALL preserve the original total price for record-keeping.

THE system SHALL ensure the total price calculation includes all applicable taxes and fees.

IF price calculation fails, THE system SHALL reject the order creation and notify the customer.

### Multi-Seller Order Support

WHEN an order is created, THE system SHALL allow order items from multiple sellers in a single order.

WHEN an order contains items from different sellers, THE system SHALL create separate shipments for each seller.

IF an order item belongs to a different seller than other items in the order, THE system SHALL route it to that seller's fulfillment process.

THE system SHALL track which seller is responsible for each order item.

IF a seller's products are removed from the platform, THE system SHALL still fulfill existing multi-seller orders for that seller.

WHEN a customer cancels an order item, THE system SHALL only cancel items from that specific seller.

IF one seller cannot fulfill their items, THE system SHALL allow the remaining seller items to proceed.

THE system SHALL provide separate tracking information for each seller's shipment.

IF a customer contacts support about a multi-seller order, THE system SHALL identify the relevant seller for each item.

WHEN a refund is processed, THE system SHALL refund the appropriate seller for each item.

### Creation Timestamp Capture

WHEN an order is created, THE system SHALL record the creation timestamp with UTC timezone.

THE creation timestamp SHALL be immutable and cannot be modified after order creation.

IF an order creation fails, THE system SHALL NOT record a creation timestamp.

WHEN an order is viewed, THE system SHALL display the creation timestamp to the customer.

IF a system clock is incorrect, THE system SHALL use server time for all order timestamps.

THE system SHALL use the creation timestamp for all time-based calculations and support periods.

WHEN an order is updated, THE system SHALL record the update timestamp separately from creation timestamp.

IF orders are exported or archived, THE system SHALL preserve the original creation timestamp.

THE creation timestamp SHALL be used for determining refund eligibility periods.

IF timestamp recording fails, THE system SHALL abort the order creation process.

### Shipping Address Locking

WHEN an order is created, THE system SHALL capture the customer's selected shipping address.

IF a shipping address is deleted after order creation, THE system SHALL preserve the address snapshot for that order.

AFTER order creation, THE system SHALL NOT allow changes to the shipping address.

IF a customer requests to change the shipping address after order creation, THE system SHALL reject the request.

WHEN the order is shipped, THE system SHALL use the captured shipping address for all shipping documents.

IF the original shipping address is invalid or undeliverable, THE system SHALL notify the customer but still preserve the address.

THE system SHALL display the shipping address on all order-related communications.

IF a customer deletes their shipping address after order creation, THE system SHALL maintain the address record for the order.

THE shipping address snapshot SHALL include recipient name, phone number, and street address.

IF address format validation fails at order creation, THE system SHALL require the customer to provide a valid address.

### Order Status Derivation

THE overall order status SHALL be automatically derived from the statuses of all order items in the order.

WHEN all order items have status "paid", THE system SHALL set the order status to "paid".

WHEN any order item has status "shipped" and no items have status "delivered", THE system SHALL set the order status to "shipped".

WHEN all order items have status "delivered", THE system SHALL set the order status to "delivered".

WHEN all order items have status "cancelled", THE system SHALL set the order status to "cancelled".

WHEN all order items have status "refunded", THE system SHALL set the order status to "refunded".

IF order items have mixed statuses (e.g., some delivered, some refunded), THE system SHALL set the order status to "partially completed".

WHEN an order item status changes, THE system SHALL recalculate and update the overall order status.

IF all items in an order are cancelled, THE system SHALL update the order status to "cancelled" immediately.

IF all items in an order are refunded, THE system SHALL update the order status to "refunded" immediately.

### Order Status Derivation Error Handling

IF the order status calculation encounters inconsistent item statuses, THE system SHALL flag the order for administrator review.

IF an order item status change causes the order status to become invalid, THE system SHALL revert the item status change.

WHEN the order status cannot be automatically derived, THE system SHALL require administrator intervention.

IF order status derivation fails, THE system SHALL maintain the previous valid order status.

THE system SHALL prevent manual overrides of automatically derived order status.

IF an order item is deleted after order creation, THE system SHALL recalculate the order status based on remaining items.

WHEN order items are restored, THE system SHALL recalculate the order status based on all items.

IF order status derivation produces unexpected results, THE system SHALL send an alert to administrators.

THE system SHALL ensure order status derivation is consistent across all views and reports.

IF order status derivation creates an orphaned state, THE system SHALL automatically correct it based on item statuses.

## OrderItem Validation Rules

Order items require status values from the allowed set: paid, shipped, delivered, cancelled, or refunded. Each order item specifies quantity purchased and unit price at order time. Order items maintain their own independent status throughout fulfillment. Items can be cancelled or refunded individually within the order. Order items link to their parent order and preserve product snapshot data. Item status transitions follow defined business process rules. Refunded items restore inventory through automatic process. Cancelled items before shipping restore inventory immediately.

### Item Status Enumeration

### Item Status Values

THE system SHALL allow the following order item status values:
- "paid" - Payment completed, waiting for seller to ship
- "shipped" - Seller has shipped the item
- "delivered" - Item has been delivered to customer
- "cancelled" - Item was cancelled
- "refunded" - Item was refunded

WHEN the system creates an order item, THE system SHALL set the initial status to "paid".

IF the status value is not one of the enumerated values above, THE system SHALL reject the item status assignment.

WHEN an order item's status changes, THE system SHALL record the status change timestamp and the previous status value.

THE system SHALL display the current status to users using the standard terminology defined in the enumeration.

### Status Value Definitions

WHILE an item's status is "paid", THE system SHALL allow the seller to ship the item.

WHILE an item's status is "shipped", THE system SHALL allow the customer to confirm delivery.

WHILE an item's status is "delivered", THE system SHALL allow the customer to write a review or request a refund.

WHILE an item's status is "cancelled" or "refunded", THE system SHALL prevent any further status transitions or actions.

IF a cancellation request is approved for a paid item, THE system SHALL transition the status to "cancelled".

IF a refund request is approved for a delivered item, THE system SHALL transition the status to "refunded".

### Status Display Rules

THE system SHALL show items in "shipped" status with tracking information visible to customers.

THE system SHALL show items in "delivered" status with delivery confirmation date.

THE system SHALL display cancelled or refunded items in order history with the reason for cancellation or refund.

---

### Order Status Derivation

THE overall order status is derived from its items according to the following rules:

IF all items are paid, THE order status SHALL be "paid".

IF any item is shipped and none are delivered, THE order status SHALL be "shipped".

IF all items are delivered, THE order status SHALL be "delivered".

IF all items are cancelled, THE order status SHALL be "cancelled".

IF all items are refunded, THE order status SHALL be "refunded".

IF items have mixed states (e.g., some delivered, some refunded), THE order status SHALL be "partially completed".

WHEN any item's status changes, THE system SHALL recalculate and update the overall order status.

IF an order becomes "cancelled" or "refunded", THE system SHALL prevent further cancellations or refunds on remaining items.

THE system SHALL display the derived order status in order lists and order detail pages.

### Quantity and Unit Price Capture

### Required Quantity Field

WHEN a customer creates an order, THE system SHALL capture the quantity for each variant being purchased.

THE system SHALL require quantity to be a positive integer (1 or greater).

IF the customer specifies quantity of 0 or less, THE system SHALL reject the order request.

IF the customer specifies a quantity exceeding available stock, THE system SHALL reject the order request.

THE system SHALL store the quantity as purchased, not as a reference to later cart quantities.

IF the customer orders 3 units of the same variant, THE system SHALL create a single order item with quantity 3.

### Unit Price Capture

WHEN an order is placed, THE system SHALL capture the unit price at the time of purchase.

THE unit price SHALL be the variant price at the moment of order creation, regardless of any price changes after.

IF a product has no variant-specific price override, THE system SHALL use the product's base price as the unit price.

THE system SHALL store the captured unit price as part of the order item record.

IF the variant price changes after the order is placed, THE order item's unit price SHALL remain unchanged.

### Total Price Calculation

WHEN an order is created, THE system SHALL calculate the line subtotal as quantity × unit price.

THE system SHALL calculate the overall order total by summing all line subtotals.

THE system SHALL store the calculated order total at creation time.

IF an order item is cancelled or refunded, THE system SHALL adjust the order total accordingly.

### Price Display Rules

THE system SHALL display the unit price as captured at order time in order history.

THE system SHALL display line subtotals calculated as quantity × unit price.

THE system SHALL show the overall order total with currency formatting.

THE system SHALL allow customers to view all price information for each order item in order detail pages.

### Price Override Handling

IF a variant has a price override defined, THE system SHALL use the override price instead of the base price.

IF no price override exists, THE system SHALL use the product's base price.

THE system SHALL capture which pricing rule was applied (base price or price override) in the order item.

---

### Quantity Adjustment Restrictions

WHEN an order is placed, THE system SHALL lock the quantities of all order items.

THE system SHALL NOT allow customers to modify quantities after order placement.

IF a customer needs different quantities, THE system SHALL require a new order to be placed.

IF an order is cancelled or refunded, THE system SHALL restore the quantity to available inventory through inventory records.

THE system SHALL display the original quantity in order history even after cancellation or refund.

THE system SHALL show the restored quantity in inventory calculations after cancellation or refund.

### Independent Item Status Management

### Individual Status Tracking

THE system SHALL maintain an independent status for each order item.

WHEN one item in an order changes status, THE system SHALL NOT affect the status of other items in the same order.

THE system SHALL allow individual items to be in different statuses simultaneously.

FOR example, if an order contains items from different sellers, THE system SHALL allow one seller's item to be shipped while another seller's item remains paid.

THE system SHALL track the status of each item independently throughout the fulfillment process.

### Status Independence During Fulfillment

WHILE an item's status is "paid", THE system SHALL allow the seller to ship that specific item.

WHILE an item's status is "shipped", THE system SHALL allow the customer to confirm delivery for that specific item.

THE system SHALL allow customers to confirm delivery of one item without affecting other items in the same order.

WHEN a customer confirms delivery, THE system SHALL update only the confirmed item's status to "delivered".

WHEN an item reaches "delivered" status, THE system SHALL allow review creation for that item.

THE system SHALL allow review creation for delivered items while other items in the order remain in different statuses.

### Partial Cancellation Scenarios

THE system SHALL allow customers to cancel individual items with "paid" status.

WHEN one item is cancelled, THE system SHALL allow other items in the order to continue normal processing.

THE system SHALL NOT prevent shipping of remaining items when some items are cancelled.

WHEN all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

WHEN some items are cancelled and others remain, THE system SHALL maintain the order status based on the remaining items.

### Partial Refund Scenarios

THE system SHALL allow customers to request refunds for individual items with "delivered" status.

WHEN one item's refund is approved, THE system SHALL allow other items in the order to continue without refund requests.

THE system SHALL NOT prevent customers from making refund requests on some items while others have no refunds.

WHEN all items in an order are refunded, THE system SHALL update the overall order status to "refunded".

WHEN some items are refunded and others remain, THE system SHALL maintain the order status based on the remaining items.

---

### Item Status Visibility

THE system SHALL display the individual status of each item in order detail pages.

THE system SHALL allow customers to see which items are delivered, shipped, or pending delivery.

THE system SHALL allow customers to see which items have been cancelled or refunded.

THE system SHALL show the status of each item in the order history list view.

WHEN sellers view their order items, THE system SHALL show the status of each item independently.

### Partial Order Cancellation Rules

### Cancellation Eligibility

WHEN an order item has status "paid", THE system SHALL allow the customer to request cancellation.

IF an order item's status is "shipped", "delivered", "cancelled", or "refunded", THE system SHALL prevent cancellation requests.

THE system SHALL display cancellation options only for items with "paid" status.

WHEN a customer requests cancellation, THE system SHALL require a reason text field.

IF the cancellation reason field is empty, THE system SHALL reject the cancellation request.

### Cancellation Process Flow

WHEN a customer submits a cancellation request, THE system SHALL create a cancellation request record with status "pending".

THE system SHALL send a notification to the seller of the cancelled item.

WHEN the seller receives the cancellation request, THE system SHALL allow the seller to approve or reject it.

IF the seller approves the cancellation, THE system SHALL transition the item status to "cancelled".

IF the seller rejects the cancellation, THE system SHALL transition the item status to the previous status (typically "paid").

WHEN the seller responds to a cancellation request, THE system SHALL create a snapshot of the request state.

### Seller Response Requirements

THE system SHALL allow sellers to view all pending cancellation requests for their items.

THE system SHALL allow sellers to approve cancellation requests with a single action.

THE system SHALL allow sellers to reject cancellation requests with a single action.

WHEN a seller rejects a cancellation request, THE system SHALL capture the rejection reason.

THE system SHALL display the seller's response and reason to the customer.

WHEN the seller responds, THE system SHALL update the cancellation request status to "approved" or "rejected".

### Inventory Restoration on Cancellation

WHEN a cancellation request is approved, THE system SHALL create a positive inventory record for the cancelled item.

THE system SHALL restore the cancelled quantity to the variant's available stock.

WHEN an item is cancelled, THE system SHALL update the inventory total by adding the cancelled quantity.

THE system SHALL record the cancellation as the reason for the inventory adjustment.

THE system SHALL make the restored inventory available for new orders immediately after cancellation.

### Order Continuation After Partial Cancellation

WHEN some items in an order are cancelled, THE system SHALL allow remaining items to continue processing.

THE system SHALL allow the seller to ship remaining items without waiting for cancelled items.

WHEN all items in an order are cancelled, THE system SHALL prevent any further actions on the order.

THE system SHALL calculate and refund the total price for cancelled items.

THE system SHALL update the overall order status based on remaining items after partial cancellation.

### Cancellation Restrictions

IF an item is already cancelled, THE system SHALL NOT allow a second cancellation request.

IF an item is shipped, delivered, or refunded, THE system SHALL NOT allow cancellation requests.

WHEN a customer has already cancelled an item, THE system SHALL display the cancellation status in order history.

THE system SHALL prevent duplicate cancellation requests for the same item.

---

### Customer Notification of Cancellation

WHEN a cancellation request is approved, THE system SHALL notify the customer of the cancellation.

WHEN a cancellation request is rejected, THE system SHALL notify the customer of the rejection with the reason.

THE system SHALL display the cancellation decision in the order item detail page.

THE system SHALL show the cancellation reason to the customer in order history.

### Product Snapshot Preservation Requirements

### Snapshot Creation Trigger

WHEN an order is placed, THE system SHALL create snapshots of all products purchased in that order.

WHEN an order is placed, THE system SHALL create snapshots of all variants purchased in that order.

WHEN an order is placed, THE system SHALL create snapshots of the seller's profile for each order item.

THE system SHALL create snapshots at the exact moment of order placement.

### Snapshot Content Requirements

THE product snapshot SHALL include:
- Product name at time of purchase
- Product description at time of purchase
- Product category at time of purchase
- Product images at time of purchase
- All product attributes current at order time

THE variant snapshot SHALL include:
- SKU code at time of purchase
- Option values (e.g., color, size) at time of purchase
- Variant price at time of purchase
- All variant attributes current at order time

THE seller profile snapshot SHALL include:
- Shop name at time of purchase
- Shop description at time of purchase
- Shop logo image at time of purchase
- All seller profile attributes current at order time

### Snapshot Immutability

ONCE a snapshot is created, THE system SHALL NOT allow any modifications to the snapshot.

THE system SHALL preserve snapshots even after the original product is deleted or modified.

THE system SHALL preserve snapshots even after the original seller's profile is deleted or modified.

THE system SHALL NOT allow customers or sellers to delete snapshots.

THE system SHALL NOT allow administrators to delete snapshots.

### Snapshot Access Rights

THE system SHALL allow customers to view snapshots for items in their own orders.

THE system SHALL allow sellers to view snapshots for items in orders for their products.

THE system SHALL allow administrators to view snapshots for any order on the platform.

THE system SHALL display snapshot data in order detail pages for customers.

THE system SHALL display snapshot data in seller dashboards for their products.

### Snapshot Use Cases

WHEN a customer views an order, THE system SHALL show product information from the snapshot, not current product data.

WHEN a dispute arises, THE system SHALL allow parties to access the snapshots as evidence.

WHEN a product is modified after order placement, THE system SHALL ensure order items reference the snapshot, not the modified product.

THE system SHALL use snapshots for calculating refunds when products are refunded.

THE system SHALL preserve snapshot data for legal and record-keeping purposes.

---

### Snapshot Versioning

THE system SHALL create a new snapshot for each order containing the same product.

THE system SHALL preserve all historical snapshots for a product across multiple orders.

THE system SHALL allow administrators to view all snapshots of a product in product oversight.

THE system SHALL display snapshot creation timestamps for each order item snapshot.

THE system SHALL show which snapshot corresponds to each order item in order detail pages.

### Inventory Restoration Rules

### Restoration on Cancellation

WHEN a cancellation request is approved, THE system SHALL create a positive inventory record for the cancelled item.

THE system SHALL add the cancelled quantity back to the variant's stock quantity.

THE system SHALL record the cancellation as the reason for the inventory adjustment.

WHEN inventory is restored through cancellation, THE system SHALL make the stock immediately available for new orders.

THE system SHALL calculate the updated stock quantity by summing all inventory records.

### Restoration on Refund

WHEN a refund request is approved, THE system SHALL create a positive inventory record for the refunded item.

THE system SHALL add the refunded quantity back to the variant's stock quantity.

THE system SHALL record the refund as the reason for the inventory adjustment.

WHEN inventory is restored through refund, THE system SHALL make the stock immediately available for new orders.

THE system SHALL display the refunded quantity in the inventory history.

### Inventory Record Creation

WHEN an order is placed, THE system SHALL create negative inventory records for each variant purchased.

WHEN an order is cancelled, THE system SHALL create positive inventory records to restore stock.

WHEN an order is refunded, THE system SHALL create positive inventory records to restore stock.

WHEN a seller restocks inventory, THE system SHALL create positive inventory records with the restock reason.

WHEN a seller adjusts inventory due to loss or damage, THE system SHALL create negative inventory records with the adjustment reason.

### Inventory Calculation Rules

THE system SHALL calculate current stock quantity by summing all inventory records for a variant.

THE system SHALL ensure the sum reflects all restocks, orders, cancellations, and adjustments.

THE system SHALL display the current stock quantity on product pages.

THE system SHALL prevent orders that would result in negative stock quantities.

WHEN stock reaches 0, THE system SHALL mark the variant as "out of stock".

### Out of Stock Handling

WHEN a variant's stock is 0, THE system SHALL NOT allow customers to add the variant to cart.

WHEN a variant is already in cart and stock reaches 0, THE system SHALL mark it as unavailable.

WHEN a variant goes out of stock, THE system SHALL prevent new orders containing that variant.

WHEN stock is restored through cancellation or refund, THE system SHALL make the variant available again.

WHEN out of stock items cannot be added to cart, THE system SHALL display an "out of stock" message.

### Inventory History Visibility

THE system SHALL allow sellers to view the full inventory history for each variant.

THE system SHALL display all inventory records with timestamps and reasons.

THE system SHALL show restocking entries separately from order deductions.

THE system SHALL show cancellation and refund restorations in the inventory history.

WHEN sellers view inventory, THE system SHALL show the current calculated stock quantity.

---

### Inventory Data Preservation

THE system SHALL preserve all inventory records permanently, even after product deletion.

THE system SHALL NOT allow deletion of inventory records under any circumstances.

THE system SHALL maintain a complete audit trail of all stock movements.

THE system SHALL allow administrators to view inventory history for any variant.

THE system SHALL use inventory history for financial reporting and dispute resolution.

### Status Transition Constraints

### Valid Status Transitions

WHEN an order item status is "paid", THE system SHALL allow the following transitions:
- To "shipped" (when seller ships the item)
- To "cancelled" (when cancellation is approved)
- To "refunded" (when refund is approved after being delivered through other means)

WHEN an order item status is "shipped", THE system SHALL allow the following transitions:
- To "delivered" (when customer confirms delivery or 14 days pass)
- To "cancelled" (when seller approves cancellation before shipment, if applicable)

WHEN an order item status is "delivered", THE system SHALL allow the following transitions:
- To "refunded" (when refund is approved)
- To "cancelled" (when customer requests cancellation after delivery)

WHEN an order item status is "cancelled" or "refunded", THE system SHALL allow NO transitions.

### Status Transition Restrictions

THE system SHALL prevent direct transitions from "paid" to "delivered" without shipping.

THE system SHALL prevent direct transitions from "paid" to "refunded" without delivery.

THE system SHALL prevent skipping the "shipped" status for items that require shipping.

THE system SHALL prevent transitions to "shipped" if the item is already cancelled or refunded.

THE system SHALL prevent transitions to "delivered" if the item is already cancelled or refunded.

### Shipments and Status Transitions

WHEN a seller creates a shipment containing an order item, THE system SHALL transition the item to "shipped".

WHEN a shipment is created, THE system SHALL update ALL items in that shipment to "shipped".

WHEN a customer confirms delivery of a shipment, THE system SHALL transition ALL items in that shipment to "delivered".

WHEN 14 days pass after a shipment is created without delivery confirmation, THE system SHALL transition all items to "delivered" automatically.

THE system SHALL record the automatic delivery transition with the trigger reason.

### Cancellation Status Constraints

THE system SHALL allow cancellation only when status is "paid".

THE system SHALL prevent cancellation requests for items with "shipped" status.

THE system SHALL prevent cancellation requests for items with "delivered" status.

THE system SHALL prevent cancellation requests for items that are already cancelled or refunded.

WHEN a cancellation request is rejected, THE system SHALL maintain the item's current status.

### Refund Status Constraints

THE system SHALL allow refund requests only when status is "delivered".

THE system SHALL prevent refund requests for items with "paid" status.

THE system SHALL prevent refund requests for items with "shipped" status.

THE system SHALL prevent refund requests for items that are already cancelled or refunded.

WHEN a refund request is rejected, THE system SHALL maintain the item's current status.

### Status Change Auditing

WHEN an order item status changes, THE system SHALL record the change timestamp.

WHEN an order item status changes, THE system SHALL record the previous status value.

WHEN an order item status changes, THE system SHALL record the actor who triggered the change.

WHEN an order item status changes, THE system SHALL create a snapshot if the change involves a request approval.

THE system SHALL maintain a complete audit trail of all status transitions.

---

### Order-Level Transition Effects

WHEN all items transition to "paid", THE system SHALL update the order status to "paid".

WHEN any item transitions to "shipped" and none are delivered, THE system SHALL update the order status to "shipped".

WHEN all items transition to "delivered", THE system SHALL update the order status to "delivered".

WHEN all items transition to "cancelled", THE system SHALL update the order status to "cancelled".

WHEN all items transition to "refunded", THE system SHALL update the order status to "refunded".

WHEN items have mixed statuses, THE system SHALL update the order status to "partially completed".

THE system SHALL recalculate the order status immediately after any item status change.

## Shipment Validation Rules

Shipments require carrier name and tracking number for delivery tracking. Shipments link to their parent order through required relationship fields. One shipment can contain multiple order items from the same seller. Items in a shipment share identical tracking and delivery status. Shipment creation changes all contained items to shipped status. Customers can confirm delivery per shipment for all items within it. Unconfirmed shipments automatically mark items as delivered after 14 days. Shipments cannot be modified after creation for consistency.

### Shipment Carrier Name Requirement

WHEN a seller creates a shipment, THE system SHALL require a carrier name to be specified.

WHEN a shipment is created, THE system SHALL validate that the carrier name is not empty.

IF the carrier name is missing, THE system SHALL reject the shipment creation request.

THE system SHALL store the carrier name with the shipment for customer visibility.

IF the carrier name exceeds 200 characters, THE system SHALL reject the shipment creation request.

THE system SHALL display the carrier name on the shipment tracking information page.

WHEN viewing shipment details, customers SHALL see the carrier name associated with that shipment.

WHEN a seller updates a shipment, THE system SHALL validate that the carrier name remains a non-empty string.

THE system SHALL require the carrier name to be provided before shipment tracking can be shared.

IF a shipment has no carrier name, THE system SHALL mark it as incomplete until a carrier name is added.

### Tracking Number Association

WHEN a seller creates a shipment, THE system SHALL require a tracking number to be specified.

WHEN a shipment is created, THE system SHALL associate the tracking number with that shipment.

IF the tracking number is missing, THE system SHALL reject the shipment creation request.

THE system SHALL validate that the tracking number is not empty before shipment creation.

THE system SHALL store the tracking number with the shipment record.

WHEN customers view shipment details, THE system SHALL display the tracking number.

IF the tracking number exceeds 100 characters, THE system SHALL reject the shipment creation request.

THE system SHALL allow the tracking number to be updated if the shipment has not been confirmed as delivered.

WHEN a tracking number is updated, THE system SHALL record the change in shipment modification history.

IF a shipment has no tracking number, THE system SHALL indicate "tracking not available" to customers.

THE system SHALL require the tracking number to be unique across all shipments in the system.

WHEN a shipment status is "shipped", THE system SHALL require both carrier name and tracking number to be present.

### Multi-Item Shipment Support

WHEN a seller creates a shipment, THE system SHALL allow multiple order items to be included in the same shipment.

WHEN a seller creates a shipment, THE system SHALL allow the seller to select which order items to include.

IF multiple order items are included in a shipment, THE system SHALL associate all items with the same tracking number.

THE system SHALL allow a shipment to contain from 1 to 100 order items.

IF a shipment contains multiple items, THE system SHALL display all items in the shipment details.

WHEN a customer confirms delivery, THE system SHALL mark all items in that shipment as delivered.

THE system SHALL allow partial shipments where only some items from an order are included in one shipment.

WHEN viewing order details, customers SHALL see all shipments associated with that order.

IF an order has multiple shipments, THE system SHALL display each shipment separately.

THE system SHALL allow each shipment to have its own independent tracking number.

WHEN a shipment is created with multiple items, THE system SHALL ensure all items belong to the same seller.

IF a shipment attempt includes items from different sellers, THE system SHALL reject the shipment creation request.

### Same-Seller Shipment Rule

WHEN a seller creates a shipment, THE system SHALL ensure all order items in that shipment belong to the same seller.

IF a seller attempts to include order items from different sellers in one shipment, THE system SHALL reject the shipment creation request.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipments for each seller.

THE system SHALL allow only one seller to create shipments for their own order items.

IF a shipment is being created, THE system SHALL verify that all order items share the same seller ID.

WHEN viewing shipments for an order, THE system SHALL group shipments by seller.

THE system SHALL prevent a seller from modifying order items that belong to other sellers.

IF a seller attempts to ship items they do not own, THE system SHALL reject the request and display an access denied message.

WHEN creating a shipment, THE system SHALL automatically filter available order items to only those owned by the creating seller.

THE system SHALL allow each seller to manage shipments independently for their products within the same order.

IF a shipment request includes items from a suspended seller, THE system SHALL reject the shipment creation request.

### Shipment Status Updates

WHEN a shipment is created, THE system SHALL set the status of all contained order items to "shipped".

WHEN all items in a shipment are marked as delivered, THE system SHALL update the shipment status to "delivered".

IF a shipment status changes, THE system SHALL notify all customers associated with that shipment.

WHEN a shipment status becomes "delivered", THE system SHALL prevent further status updates to that shipment.

THE system SHALL track the shipment status at all times for customer visibility.

IF a shipment is marked as shipped, THE system SHALL update the overall order status accordingly.

WHEN a shipment status changes, THE system SHALL record the timestamp of the status change.

THE system SHALL allow status updates only by the seller who created the shipment or by an administrator.

IF a customer attempts to update shipment status, THE system SHALL reject the request and prompt to contact seller.

WHEN an order contains shipments with mixed statuses, THE system SHALL calculate the order status based on the latest status.

IF a shipment is cancelled after creation, THE system SHALL revert the status of contained items to their previous state.

THE system SHALL display the current shipment status on the customer order details page.

### Delivery Confirmation Timeline

WHEN a shipment is created, THE system SHALL start a 14-day countdown for automatic delivery confirmation.

IF a customer does not confirm delivery within 14 days, THE system SHALL automatically mark the shipment as delivered.

WHEN a customer manually confirms delivery, THE system SHALL immediately mark all items in that shipment as delivered.

IF a shipment is marked as delivered (either manually or automatically), THE system SHALL update the order status accordingly.

THE system SHALL track the shipment creation date to calculate the 14-day deadline.

WHEN delivery confirmation is performed, THE system SHALL record the confirmation timestamp and the confirming user.

IF a shipment has been delivered for more than 7 days, THE system SHALL disable the manual delivery confirmation option.

WHEN a customer confirms delivery, THE system SHALL prevent any other user from confirming delivery for the same shipment.

IF the 14-day deadline expires before manual confirmation, THE system SHALL automatically trigger the delivery confirmation.

THE system SHALL display the expected delivery date (current date + 14 days) on the shipment tracking page.

IF a shipment is marked as delivered, THE system SHALL enable customers to write reviews for products in that shipment.

WHEN automatic delivery confirmation occurs, THE system SHALL send a notification to the customer confirming the delivery status update.

### Shipment Immutability Rules

WHEN a shipment is created, THE system SHALL prevent any modifications to the list of contained order items.

IF a shipment is created, THE system SHALL prevent changes to the tracking number once the shipment status is "delivered".

WHEN a shipment status becomes "delivered", THE system SHALL lock the shipment from any further modifications.

THE system SHALL preserve the shipment record permanently after creation.

IF a shipment is deleted, THE system SHALL mark it as soft-deleted rather than permanently removed.

WHEN viewing shipment history, THE system SHALL display the immutable record of the original shipment.

IF a customer requests shipment modification, THE system SHALL reject the request and direct them to contact customer support.

THE system SHALL allow administrators to add notes to a shipment without modifying the shipment itself.

IF a shipment tracking number needs correction, THE system SHALL create a new shipment record rather than modify the existing one.

WHEN a shipment is created, THE system SHALL record the creator seller ID for audit purposes.

THE system SHALL prevent rollback of shipment status once the status reaches "delivered".

IF a shipment modification is attempted after delivery, THE system SHALL reject the request and log the attempt in audit records.

## CancellationRequest Validation Rules

Cancellation requests require a reason describing why the customer wants cancellation. Request status must be one of: pending, approved, or rejected. Cancellation requests link to specific order items being cancelled. Customers can only request cancellation for items with paid status. Sellers respond to requests by approving or rejecting them. Approved cancellations process refunds and restore inventory automatically. Rejected cancellations leave items in their current status. Request status changes create snapshots for audit trail.

### Cancellation Reason Requirement

### Cancellation Reason Requirement

WHEN a customer submits a cancellation request, THE system SHALL require a reason field containing text describing why the customer wants to cancel.

IF the cancellation reason is empty or contains only whitespace, THE system SHALL reject the cancellation request.

IF the cancellation reason exceeds 500 characters, THE system SHALL reject the cancellation request.

THE system SHALL validate that the cancellation reason contains at least 10 characters before submission.

IF the cancellation reason is too short, THE system SHALL display an error message: "Reason must be at least 10 characters."

THE system SHALL preserve the cancellation reason text for dispute resolution and audit purposes.

IF a customer attempts to submit a cancellation request without providing adequate reason, THE system SHALL prevent submission and highlight the reason field as required.

### Reason Content Guidelines

THE system SHALL not restrict cancellation reasons to predefined categories; customers may provide free-text reasons.

WHEN a cancellation request is created, THE system SHALL record the exact timestamp of reason submission.

THE system SHALL display the cancellation reason to the seller when they review the request.

IF a seller approves a cancellation request, THE system SHALL display the original cancellation reason on the approval confirmation.

### Request Status Workflow

### Request Status Enumerations

THE system SHALL restrict cancellation request status to exactly three values: pending, approved, or rejected.

WHEN a cancellation request is first submitted, THE system SHALL initialize the request status to "pending".

IF a cancellation request status is already "approved" or "rejected", THE system SHALL reject any attempt to change the status again.

THE system SHALL not allow status transitions from "approved" or "rejected" back to "pending".

### Status Transition Rules

WHEN a seller responds to a pending cancellation request, THE system SHALL allow status to transition to either "approved" or "rejected".

IF a cancellation request status is "pending", THE system SHALL display a pending indicator to both customer and seller.

IF a cancellation request status is "approved", THE system SHALL display a success indicator with approval timestamp.

IF a cancellation request status is "rejected", THE system SHALL display a failure indicator with rejection timestamp.

THE system SHALL prevent customers from modifying or resubmitting cancellation requests that have already been approved or rejected.

### Status Visibility

WHEN a customer views their cancellation requests, THE system SHALL show the current status for each request.

WHEN a seller views cancellation requests for their products, THE system SHALL show only requests with status "pending" in the action queue.

IF a cancellation request status changes, THE system SHALL update the status display for all relevant parties immediately.

### Paid-Item-Only Cancellation

### Item Status Validation

WHEN a customer requests cancellation for an order item, THE system SHALL verify the item status is "paid".

IF the order item status is "shipped", THE system SHALL reject the cancellation request with error: "Cannot cancel shipped items. Please request a refund after delivery."

IF the order item status is "delivered", THE system SHALL reject the cancellation request with error: "Cannot cancel delivered items. Please request a refund instead."

IF the order item status is "cancelled", THE system SHALL reject the cancellation request with error: "This item is already cancelled."

IF the order item status is "refunded", THE system SHALL reject the cancellation request with error: "This item has been refunded."

### Valid Cancellation Targets

THE system SHALL only allow cancellation requests for order items with status "paid".

WHEN viewing available cancellation options, THE system SHALL display only order items with status "paid" as cancellable.

THE system SHALL hide or disable cancellation buttons for all order items not in "paid" status.

IF a customer attempts to cancel an item through a non-standard path, THE system SHALL validate the item status and reject if not "paid".

### Status Change Prevention

IF an order item status changes from "paid" to "shipped" while a cancellation request is pending, THE system SHALL automatically reject the pending cancellation request.

THE system SHALL notify the customer when a pending cancellation request is auto-rejected due to shipping status change.

IF a cancellation request is pending, THE system SHALL continuously monitor the associated item status for changes.

### Seller Response Authority

### Seller Response Rights

WHEN a cancellation request has status "pending" and references an order item belonging to a specific seller, THE system SHALL grant that seller authority to approve or reject the request.

IF a user who is not the item's seller attempts to respond to a cancellation request, THE system SHALL reject the action with error: "Only the item's seller can respond to this cancellation request."

WHEN a seller views their pending cancellation requests, THE system SHALL display all requests for items from their products.

THE system SHALL allow each seller to respond to their pending cancellation requests within 7 calendar days of request submission.

IF a seller does not respond to a cancellation request within 7 days, THE system SHALL auto-reject the request and notify the customer.

### Response Actions

WHEN a seller approves a cancellation request, THE system SHALL change the request status to "approved" and trigger refund processing.

WHEN a seller rejects a cancellation request, THE system SHALL change the request status to "rejected".

THE system SHALL require sellers to view the cancellation reason before responding to a request.

IF a seller responds to a cancellation request, THE system SHALL record the response timestamp and the responding seller's identity.

### Response Restrictions

IF a seller has been suspended, THE system SHALL still allow them to respond to pending cancellation requests for existing orders.

IF a seller account is banned, THE system SHALL prevent them from responding to new cancellation requests.

THE system SHALL not allow sellers to transfer cancellation request response authority to other users.

### Response Audit Trail

WHEN a seller responds to a cancellation request, THE system SHALL create a record of the seller's identity and action taken.

THE system SHALL preserve the seller's response for dispute resolution and audit purposes.

### Refund Processing on Approval

### Automatic Refund Trigger

WHEN a cancellation request status changes to "approved", THE system SHALL automatically initiate refund processing for that order item.

THE system SHALL calculate the refund amount based on the unit price of the item at the time of purchase.

IF the refund processing succeeds, THE system SHALL update the order item status to "cancelled".

IF the refund processing fails, THE system SHALL maintain the cancellation request status as "approved" but mark the refund as failed and notify the customer.

THE system SHALL retry failed refund processing up to 3 times before marking the refund as permanently failed.

### Refund Amount Calculation

WHEN processing a refund, THE system SHALL calculate: refund amount = unit price × quantity ordered.

THE system SHALL not include shipping costs in the refund calculation unless the shipping was charged separately to the customer.

IF the item had any discounts or promotional adjustments, THE system SHALL calculate the refund based on the actual amount paid by the customer.

THE system SHALL preserve the original payment transaction reference for audit and reconciliation.

### Refund Status Tracking

WHEN a refund is initiated, THE system SHALL record the refund initiation timestamp.

THE system SHALL track refund status through: initiated, processing, completed, or failed.

WHEN a refund completes successfully, THE system SHALL update the order item status to "cancelled".

IF a refund fails after all retry attempts, THE system SHALL notify customer support for manual review.

### Customer Notification

WHEN a cancellation request is approved and refund is processed, THE system SHALL send a confirmation notification to the customer.

THE system SHALL include refund amount and expected timeline in the refund confirmation.

IF refund processing exceeds expected timeline, THE system SHALL send status update notifications to the customer.

### Inventory Restoration Trigger

### Automatic Inventory Restoration

WHEN a cancellation request status changes to "approved", THE system SHALL automatically trigger inventory restoration for the cancelled variant.

THE system SHALL create an inventory record with a positive quantity change equal to the cancelled item quantity.

THE system SHALL record the inventory restoration reason as "cancellation" with reference to the cancellation request ID.

WHEN inventory is restored, THE system SHALL update the variant's current stock quantity immediately.

### Inventory Record Creation

WHEN creating an inventory restoration record, THE system SHALL include the timestamp of restoration.

THE system SHALL reference the original order item ID and cancellation request ID in the inventory record.

THE system SHALL log the seller identity who approved the cancellation request.

IF the inventory restoration would result in negative stock (due to system error), THE system SHALL flag the anomaly for manual review.

### Stock Availability Update

WHEN inventory is restored through cancellation, THE system SHALL immediately update the variant's availability status.

IF the restored stock quantity is greater than zero, THE system SHALL make the variant available for purchase.

IF the variant had been shown as "unavailable" due to stock depletion, THE system SHALL update the product listing to show it as available.

THE system SHALL notify the seller of the inventory restoration for their records.

### Inventory Record Immutability

THE system SHALL preserve all inventory restoration records permanently for audit purposes.

THE system SHALL not allow deletion or modification of inventory records once created.

THE system SHALL allow querying inventory records to calculate current stock as the sum of all records.

WHEN viewing inventory history, THE system SHALL display restoration records with clear distinction from restocking and adjustment records.

### Snapshot on Status Change

### Snapshot Creation Trigger

WHEN a seller responds to a cancellation request by either approving or rejecting, THE system SHALL automatically create a snapshot of the request state.

THE system SHALL create a snapshot every time the cancellation request status changes from "pending" to "approved" or "rejected".

THE system SHALL preserve snapshots even after the cancellation request is no longer active.

THE system SHALL make snapshots immutable; they cannot be deleted or modified after creation.

### Snapshot Content Requirements

WHEN creating a snapshot, THE system SHALL record the exact timestamp of the status change.

THE system SHALL capture the old values: previous status, cancellation reason, request creation date.

THE system SHALL capture the new values: new status, response action (approve or reject), response timestamp.

THE system SHALL identify which seller approved or rejected the request and their seller profile reference.

### Snapshot Accessibility

WHEN a snapshot is created, THE system SHALL make it viewable to the customer who submitted the request.

THE system SHALL make the snapshot viewable to the seller who responded to the request.

THE system SHALL make the snapshot viewable to administrators for dispute resolution and audit purposes.

WHEN viewing snapshot history, THE system SHALL display all snapshots chronologically with timestamps.

### Snapshot Audit Trail

THE system SHALL record the identity of any user who accesses a snapshot for audit purposes.

WHEN a dispute is filed regarding a cancellation, THE system SHALL provide access to all related snapshots.

THE system SHALL preserve snapshots for a minimum of 7 years for legal compliance.

IF a cancellation request is associated with legal proceedings, THE system SHALL preserve snapshots indefinitely until released by legal authority.

## RefundRequest Validation Rules

Refund requests require a reason explaining why the customer wants refund. Request status must be one of: pending, approved, or rejected. Refund requests link to specific order items being refunded. Customers can only request refunds for items with delivered status. Refunds must be requested within 7 days of item delivery. Sellers respond to requests by approving or rejecting them. Approved refunds process payment back and restore inventory. Request status changes create snapshots for dispute resolution.

### Refund Reason Requirement

WHEN a customer submits a refund request, THE system SHALL require a reason text field explaining why the customer wants the refund.

IF the reason text is missing or empty, THE system SHALL reject the refund request and display an error message.

THE system SHALL validate that the reason text is between 10 and 1000 characters in length.

IF the reason text is shorter than 10 characters, THE system SHALL reject the request and prompt the customer to provide a more detailed explanation.

IF the reason text exceeds 1000 characters, THE system SHALL truncate it to 1000 characters or reject it with an error message.

THE system SHALL display the reason text to the seller when they view the refund request.

THE system SHALL preserve the exact reason text in the request snapshot for dispute resolution purposes.

### Delivered-Item-Only Refund

A customer can only request a refund for an order item with status "delivered".

IF the order item status is not "delivered", THE system SHALL reject the refund request and display an error message.

IF the order item status is "paid", "shipped", or "cancelled", THE system SHALL prevent the customer from initiating a refund request.

IF the order item status is "refunded", THE system SHALL prevent duplicate refund requests for the same item.

WHEN a customer views an order, THE system SHALL only show the "Request Refund" button for items with "delivered" status.

THE system SHALL validate that the order item exists before allowing a refund request to be created.

IF the order item does not exist or has been removed, THE system SHALL reject the refund request with an error message.

### 7-Day Refund Window

A refund request can only be submitted within 7 days from the delivery date of the order item.

WHEN a customer attempts to submit a refund request, THE system SHALL calculate the number of days elapsed since the item was delivered.

IF more than 7 days have elapsed since delivery, THE system SHALL reject the refund request and display a message indicating the refund window has expired.

THE system SHALL display the number of days remaining in the refund window to the customer when they view eligible order items.

IF the order item status changes to "delivered" after a previous refund request was submitted (e.g., from shipped to delivered), THE system SHALL reset the 7-day window calculation from the new delivery date.

THE system SHALL automatically expire all pending refund requests that exceed the 7-day window from submission.

IF a pending refund request reaches the 7-day limit before seller response, THE system SHALL automatically reject the request and notify the customer.

### Request Status Workflow

A refund request has three possible statuses: "pending", "approved", or "rejected".

WHEN a refund request is first created, THE system SHALL set its status to "pending".

WHEN a seller approves a refund request, THE system SHALL change the request status to "approved" and process the refund.

WHEN a seller rejects a refund request, THE system SHALL change the request status to "rejected" and notify the customer.

THE system SHALL prevent a seller from responding to a refund request that is already "approved" or "rejected".

WHEN a customer views their order details, THE system SHALL display the current status of each refund request for that order.

THE system SHALL show the seller's response (approval or rejection) and the timestamp of the response for each refund request.

IF all items in an order are refunded, THE system SHALL change the overall order status to "refunded".

IF some items are refunded and others remain in different statuses, THE system SHALL change the overall order status to "partially completed".

### Seller Response Timing and Inventory Restoration

SELLERS CAN APPROVE OR REJECT A REFUND REQUEST AT ANY TIME AFTER IT IS CREATED.

WHEN a seller approves a refund request, THE system SHALL process the payment refund to the customer immediately.

WHEN a seller approves a refund request, THE system SHALL automatically create an inventory record with a positive quantity change to restore stock.

WHEN a seller rejects a refund request, THE system SHALL NOT process a refund and stock quantities remain unchanged.

THE system SHALL create a snapshot of the refund request when the seller responds (approves or rejects).

THE system SHALL preserve the snapshot including: old values (reason, status before change), new values (status after change), response timestamp, and response type (approval or rejection).

WHEN a refund is approved, THE system SHALL update the order item status to "refunded".

THE system SHALL notify both the customer and seller when a refund request is approved or rejected.

THE system SHALL mark the snapshot as immutable, preventing any modifications after creation.

IF a refund request is rejected, THE system SHALL allow the customer to submit a new refund request for the same order item only if the 7-day window has not expired.

## Review Validation Rules

Reviews require a rating between 1 and 5 stars as a mandatory field. Review text content is optional but if provided captures customer feedback. Reviews link to customers who purchased the product being reviewed. Reviews can only be created for items with delivered status. Each customer can write one review per product per order. Reviews are sorted by newest first on product detail pages. Customers can edit their own reviews creating new snapshots. Deleted reviews preserve snapshots but no longer affect average ratings.

### Review Rating Requirement

WHEN a customer creates a review, THE system SHALL require a star rating between 1 and 5 stars inclusive.

IF the star rating is less than 1 or greater than 5, THE system SHALL reject the review creation request.

IF the star rating is missing, THE system SHALL reject the review creation request.

THE system SHALL store the star rating as an integer value from 1 to 5 for each review.

THE system SHALL display the star rating as a 1-5 star visual indicator on the product detail page.

IF the customer provides no star rating, THE system SHALL not create the review and SHALL display an error message requiring a rating selection.

WHEN a customer submits a review with an invalid rating value, THE system SHALL reject the request and SHALL inform the customer that a valid rating between 1 and 5 is required.

### Review Text Content Requirement

WHEN a customer creates a review, THE system SHALL allow optional text content for the review.

IF the customer provides review text content, THE system SHALL save the text and display it on the product detail page.

IF the customer does not provide review text content, THE system SHALL still create the review with the star rating.

THE system SHALL preserve the exact text content entered by the customer in the review.

IF the review text content is edited by the customer, THE system SHALL create a snapshot capturing the old and new text values.

WHEN a deleted review has its text content, THE system SHALL preserve the snapshot of the original text but SHALL NOT display it in the product reviews list.

THE system SHALL allow empty review text content as long as the required star rating is provided.

### Review Delivery Status Prerequisite

WHEN a customer attempts to create a review, THE system SHALL verify that the corresponding order item has status "delivered".

IF the order item status is not "delivered", THE system SHALL reject the review creation request.

IF the order item status is "paid" or "shipped", THE system SHALL prevent review creation and SHALL inform the customer that delivery confirmation is required.

IF the order item status is "cancelled" or "refunded", THE system SHALL prevent review creation.

WHEN an order item status changes to "delivered", THE system SHALL enable the customer to create a review for that product.

IF the customer tries to create a review before the item is delivered, THE system SHALL display a message explaining that reviews can only be written after delivery confirmation.

THE system SHALL check the delivered status for each item that the customer purchased before allowing review creation.

### One Review Per Product Per Order Rule

WHEN a customer creates a review for a product, THE system SHALL check if a review already exists for that product from the same order.

IF a review already exists for the product from the same order, THE system SHALL reject the new review creation request.

IF the customer has multiple orders containing the same product, THE system SHALL allow one review per order per product.

WHEN the customer attempts to create a duplicate review, THE system SHALL prevent the creation and SHALL inform the customer that one review per product per order is allowed.

THE system SHALL track which products have been reviewed by each customer for each order to enforce this rule.

IF the customer deletes their existing review for a product, THE system SHALL allow the customer to create a new review for that same product from the same order.

WHEN a customer wants to review a product multiple times, THE system SHALL require separate orders containing that product to create additional reviews.

### Review Display Sorting

WHEN displaying reviews on the product detail page, THE system SHALL sort all reviews by newest first based on creation timestamp.

WHEN a new review is created, THE system SHALL position it at the top of the review list.

WHEN a review is edited, THE system SHALL NOT change its position in the sorted list (sort by creation timestamp, not edit timestamp).

WHEN a review is deleted, THE system SHALL remove it from the review list and SHALL recalculate the average rating.

THE system SHALL display reviews in descending order by creation timestamp with the most recent review appearing first.

IF the customer requests to view reviews on a product, THE system SHALL always present them sorted by newest first regardless of rating value.

THE system SHALL maintain the newest-first sorting rule for all review display contexts including product detail pages and seller dashboards.

### Review Edit and Snapshot

WHEN a customer edits their own review, THE system SHALL create a snapshot of the review state.

THE snapshot SHALL record the review edit timestamp, the old rating value, and the new rating value.

THE snapshot SHALL record the old text content and the new text content when the text is edited.

IF the customer deletes their review, THE system SHALL create a snapshot of the deleted review state.

WHEN viewing review snapshots, THE system SHALL show the before and after values for both rating and text content.

THE system SHALL preserve all snapshots even after the review is deleted from active display.

WHEN a customer edits a review, THE system SHALL NOT change the original creation timestamp in the sorted display order.

### Average Rating Calculation

WHEN calculating the average rating for a product, THE system SHALL include all active (non-deleted) reviews.

THE system SHALL exclude deleted reviews from the average rating calculation.

THE system SHALL calculate the average as the sum of all star ratings divided by the count of active reviews.

IF there are no active reviews for a product, THE system SHALL display no average rating.

WHEN a new review is created or edited, THE system SHALL recalculate the average rating for the product.

IF a review is deleted, THE system SHALL recalculate the average rating to exclude that review's contribution.

THE system SHALL display the average rating rounded to one decimal place on the product detail page.

WHEN a review with rating is edited, THE system SHALL update the average rating based on the new rating value.

THE system SHALL ensure that the average rating always reflects only active reviews and excludes deleted review records.

## InventoryRecord Validation Rules

Inventory records require a quantity change value that is positive or negative. Positive changes represent restocking while negative changes represent orders or adjustments. Inventory records include a reason describing why the change occurred. Timestamps are required for each inventory record for audit purposes. Current stock is calculated by summing all inventory records for a variant. Order placement creates automatic negative inventory records. Order cancellation creates automatic positive inventory records for stock restoration. Sellers can manually add or subtract inventory with documented reasons.

### Inventory Record Creation

WHEN a seller creates an inventory record, THE system SHALL record the quantity change value (positive for restock, negative for deduction).

WHEN a seller creates an inventory record, THE system SHALL require a reason describing why the change occurred.

WHEN a system creates an inventory record automatically (for orders, cancellations), THE system SHALL require a reason describing the automatic change.

WHEN an inventory record is created, THE system SHALL capture the timestamp of when the change occurred.

WHEN an inventory record is created, THE system SHALL link it to the specific product variant.

IF an inventory record is missing the quantity change value, THE system SHALL reject the creation.

IF an inventory record is missing the reason field, THE system SHALL reject the creation.

IF an inventory record is missing the timestamp, THE system SHALL generate the current timestamp automatically.

### Quantity Change Direction Rules

THE system SHALL accept positive quantity change values to represent restocking or additions to inventory.

THE system SHALL accept negative quantity change values to represent deductions from inventory (orders, adjustments, losses).

THE system SHALL reject zero quantity change values as they do not represent any actual inventory movement.

THE system SHALL reject negative quantity changes that would cause total stock to go below zero.

WHEN a negative inventory record would cause stock to go below zero, THE system SHALL display a warning and require confirmation before creating the record.

THE system SHALL calculate current stock quantity by summing all inventory records for a variant (positive and negative changes).

THE system SHALL allow manual adjustments that exceed current stock only with explicit administrator authorization.

### Restock versus Deduction Classification

WHEN an inventory record has a positive quantity change, THE system SHALL classify it as restock.

WHEN an inventory record has a negative quantity change, THE system SHALL classify it as deduction.

WHEN an order is placed, THE system SHALL automatically create a negative inventory record classified as "order placement".

WHEN an order is cancelled, THE system SHALL automatically create a positive inventory record classified as "order cancellation".

WHEN a refund is approved, THE system SHALL automatically create a positive inventory record classified as "refund approved".

WHEN a seller manually restocks inventory, THE system SHALL require the seller to select "restock" as the reason type.

WHEN a seller makes a manual adjustment (loss, damage, etc.), THE system SHALL require the seller to select "adjustment" as the reason type.

THE system SHALL maintain separate counts of restock and deduction records for reporting purposes.

### Inventory Reason Tracking

WHEN an inventory record is created, THE system SHALL require a reason field that describes why the change occurred.

WHEN a seller creates a manual restock, THE system SHALL require the reason to specify the restock source (e.g., "supplier shipment", "returned items", "cycle count adjustment").

WHEN an automatic system record is created, THE system SHALL set the reason to reflect the automatic action (e.g., "order #12345", "cancellation #67890", "refund #11111").

WHEN an inventory adjustment is made (loss, damage, error correction), THE system SHALL require the reason to include specific details about what happened.

WHEN a reason field is less than 5 characters, THE system SHALL reject the inventory record creation.

WHEN a reason field exceeds 500 characters, THE system SHALL reject the inventory record creation.

THE system SHALL display the reason when showing inventory history to relevant parties (seller, administrator).

### Timestamp Requirement

WHEN an inventory record is created, THE system SHALL capture the exact timestamp of when the change occurred.

THE system SHALL store timestamps in UTC timezone for consistency across all time zones.

WHEN an inventory record is created, THE system SHALL make the timestamp immutable (cannot be edited after creation).

THE system SHALL display timestamps in the user's local timezone when showing inventory history.

THE system SHALL use timestamps for calculating current stock levels and for audit trail purposes.

WHEN a discrepancy is found in inventory counts, THE system SHALL use timestamps to identify when the most recent change occurred.

THE system SHALL require timestamps for all automatic inventory records created by the system (order placement, cancellation, refund).

THE system SHALL allow administrators to query inventory records by timestamp range for audit purposes.

### Stock Calculation and Visibility

THE system SHALL calculate current stock quantity by summing all inventory records (positive and negative) for a variant.

THE system SHALL display current stock as the calculated sum of all inventory history records.

WHEN a variant's stock reaches zero, THE system SHALL show it as "out of stock".

WHEN a variant is out of stock, THE system SHALL prevent customers from adding that variant to their cart.

WHEN an inventory record is created, THE system SHALL display the updated calculated stock level.

THE system SHALL NOT allow deletion or modification of inventory records after creation (immutable history).

THE system SHALL allow customers to see only stock availability status (available/out of stock) but not the inventory history.

### Automatic Inventory Recording

WHEN an order is successfully placed, THE system SHALL automatically create a negative inventory record for each purchased variant.

WHEN an order is successfully placed, THE system SHALL calculate the quantity deduction based on the order item quantity.

WHEN an order is cancelled, THE system SHALL automatically create a positive inventory record to restore stock.

WHEN a refund is approved, THE system SHALL automatically create a positive inventory record to restore stock.

WHEN an automatic inventory record is created, THE system SHALL set the reason to indicate the automatic action.

WHEN a payment fails and the order is not created, THE system SHALL NOT create any inventory records.

WHEN an order item is cancelled, THE system SHALL restore stock only for the cancelled item (not other items in the same order).

THE system SHALL create automatic inventory records immediately upon order placement, cancellation, or refund approval.

### Manual Adjustment Authorization

WHEN a seller manually adjusts inventory (restock, deduction, correction), THE system SHALL require the seller to select "manual adjustment" as the action type.

THE system SHALL log the seller identity who created each manual adjustment record.

THE system SHALL require a detailed reason for all manual adjustments.

WHEN a manual adjustment would cause stock to go negative, THE system SHALL require supervisor authorization.

THE system SHALL create a snapshot of the request state when a manual adjustment is approved or rejected.

THE system SHALL allow administrators to view all manual adjustment records for audit purposes.

THE system SHALL allow administrators to approve or deny manual adjustment requests that exceed current stock.

THE system SHALL provide a summary of manual adjustments to sellers in their dashboard.

### Inventory History Display

WHEN a seller views inventory history for a variant, THE system SHALL display all inventory records in chronological order.

WHEN an administrator views inventory history, THE system SHALL display records from all sellers for that variant.

WHEN viewing inventory history, THE system SHALL show: timestamp, quantity change, reason, and cumulative stock level.

THE system SHALL paginate inventory history records (20 records per page).

WHEN an inventory record is created, THE system SHALL add it to the end of the history list.

THE system SHALL NOT allow users to delete or modify inventory history records.

WHEN viewing inventory history, THE system SHALL highlight automatic system records versus manual records.

THE system SHALL provide export capability for inventory history records in CSV format for sellers and administrators.

## AdminRequest Validation Rules

Admin requests require a reason describing why the user wants administrative access. Request status must be one of: pending, approved, or rejected. Requests link to the user submitting the request for administrative role. Only super administrators can approve or reject admin requests. Approved requests convert users to regular administrator status. Super administrators can promote and demote other super administrators. Requests cannot be created for accounts that already have admin status. Status changes create snapshots for administrative audit trails.

### Administrative Access Reason Requirement

WHEN a user submits a request to become an administrator, THE system SHALL:
1. Require a reason field describing why the user wants administrative access
2. Validate that the reason field contains text content
3. Reject requests with empty or blank reason text

THE system SHALL reject the request when the reason field is empty or contains only whitespace.

THE reason field SHALL be preserved in the AdminRequest record and visible to super administrators for review.

IF a user already has administrative status, THE system SHALL prevent submission of a new admin request.

### Request Status Workflow States

AN AdminRequest SHALL exist in exactly one of three status states: pending, approved, or rejected.

WHEN an AdminRequest is first created, THE system SHALL set its status to "pending".

WHEN a super administrator approves a request, THE system SHALL change its status to "approved".

WHEN a super administrator rejects a request, THE system SHALL change its status to "rejected" and record a rejection reason.

THE system SHALL prevent status changes other than pending→approved or pending→rejected.

A request in "approved" or "rejected" status SHALL NOT be subject to further status changes.

### Super-Administrator Approval Authority

ONLY super administrators SHALL have authority to approve or reject administrator requests.

WHEN a super administrator reviews an AdminRequest, THE system SHALL display the request reason and the requesting user's current role.

WHEN a super administrator approves an AdminRequest, THE system SHALL:
1. Change the request status to "approved"
2. Convert the requesting user to a regular administrator
3. Grant the user administrative access immediately

WHEN a super administrator rejects an AdminRequest, THE system SHALL require a rejection reason to be provided.

IF a regular administrator attempts to approve or reject an AdminRequest, THE system SHALL reject the action.

### Regular-Administrator Conversion Process

WHEN an AdminRequest is approved by a super administrator, THE system SHALL convert the requesting user to a regular administrator.

UPON conversion, THE user SHALL immediately gain regular administrator privileges and access to administrator functions.

THE conversion SHALL be effective immediately upon request approval.

THE user SHALL retain their original role (customer or seller) in addition to the new administrator role.

IF the requesting user already had administrative status, THE system SHALL reject the conversion.

THE system SHALL record the conversion timestamp and the approving super administrator for audit purposes.

### Administrator Promotion Rules

ONLY super administrators SHALL have authority to promote regular administrators to super administrators.

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Change the administrator's grade from "regular" to "super".
2. Grant the promoted user super administrator privileges.

WHEN a super administrator promotes another super administrator, THE system SHALL prevent the promotion and reject the action.

A regular administrator SHALL NOT be able to promote themselves or other administrators.

THE promotion SHALL take effect immediately upon execution.

### Administrator Demotion Rules

ONLY super administrators SHALL have authority to demote other super administrators to regular administrators.

WHEN a super administrator demotes another super administrator, THE system SHALL:
1. Change the demoted user's grade from "super" to "regular".
2. Remove super administrator privileges from the demoted user.

IF the attempting super administrator tries to demote themselves, THE system SHALL reject the demotion and prevent the action.

A regular administrator SHALL NOT be able to demote themselves or other administrators.

THE demotion SHALL take effect immediately upon execution.

### Status Change Snapshot Requirements

WHEN an AdminRequest status changes from "pending" to "approved" or "rejected", THE system SHALL create a snapshot of the request state.

WHEN a super administrator approves or rejects an AdminRequest, THE system SHALL create a snapshot containing:
1. The timestamp of the status change
2. The identity of the super administrator who made the change
3. The request status before the change (pending)
4. The request status after the change (approved or rejected)
5. Any reason text associated with the action

THE snapshot SHALL be immutable and SHALL NOT be deleted.

SUPER administrators SHALL be able to view snapshots of AdminRequest status changes for audit trail and dispute resolution.

## Snapshot Validation Rules

Snapshots require a record type identifying what kind of data was changed. Record identifiers point to the specific record being captured. Changes JSON captures before and after values for audit purposes. Snapshots are immutable and cannot be deleted once created. Snapshots include timestamps showing when changes occurred. Relevant parties can view snapshots for dispute resolution and transparency. Snapshots are created for all editable data modifications as required. Snapshot data is preserved even after the original record is deleted.

### Record Type Identification

WHEN a snapshot is created, THE system SHALL include a record type field that identifies the kind of data that was changed.

THE system SHALL use the following record type values: "Product", "ProductVariant", "SellerProfile", "OrderItem", "Review", "CancellationRequest", "RefundRequest".

IF the record type is missing from a snapshot request, THE system SHALL reject the snapshot creation.

WHEN a customer edits their review, THE system SHALL create a snapshot with record type "Review".

WHEN a seller edits their shop profile, THE system SHALL create a snapshot with record type "SellerProfile".

WHEN a product is edited, THE system SHALL create a snapshot with record type "Product".

WHEN a product variant is edited, THE system SHALL create a snapshot with record type "ProductVariant".

WHEN a cancellation request is responded to by a seller, THE system SHALL create a snapshot with record type "CancellationRequest".

WHEN a refund request is responded to by a seller, THE system SHALL create a snapshot with record type "RefundRequest".

THE system SHALL NOT create snapshots for records that do not require snapshot tracking as defined in the business rules.


### Immutable Snapshot Storage

ONCE a snapshot is created, THE system SHALL NOT allow any modifications to its content.

ONCE a snapshot is created, THE system SHALL NOT allow deletion of the snapshot under any circumstances.

THE system SHALL mark all snapshots as immutable upon creation.

IF a user attempts to modify a snapshot, THE system SHALL reject the modification request.

IF a user attempts to delete a snapshot, THE system SHALL reject the deletion request.

SNAPSHOTS SHALL be stored with their creation immutable status permanently recorded.

WHEN a snapshot is accessed for dispute resolution, THE system SHALL display it with an "immutable" indicator.

THE system SHALL prevent automated cleanup processes from removing snapshots.

SNAPSHOTS SHALL remain accessible even when the original record is deleted.

THE system SHALL log all snapshot access attempts for audit purposes.


### Before-After Value Capture

WHEN a snapshot is created, THE system SHALL capture the values of all changed fields before the modification.

WHEN a snapshot is created, THE system SHALL capture the values of all changed fields after the modification.

THE system SHALL store both "oldValues" and "newValues" in each snapshot.

IF a field is added (previously null), THE system SHALL record the old value as null in the snapshot.

IF a field is removed (changed to null), THE system SHALL record the new value as null in the snapshot.

WHEN a product is edited, THE system SHALL capture old and new values for: name, description, base price, and category.

WHEN a product variant is edited, THE system SHALL capture old and new values for: SKU code, option values, price override, and stock quantity.

WHEN a seller profile is edited, THE system SHALL capture old and new values for: shop name, shop description, and logo image.

WHEN a review is edited, THE system SHALL capture old and new values for: rating and text content.

THE system SHALL store snapshot changes in JSON format for complete value preservation.


### Change Timestamp Recording

WHEN a snapshot is created, THE system SHALL record the exact timestamp of when the change occurred.

THE system SHALL store the timestamp in UTC format for consistency.

THE system SHALL include the timestamp in all snapshot queries and display.

WHEN a snapshot is created for dispute resolution review, THE system SHALL display the creation timestamp clearly.

IF the timestamp is missing from a snapshot, THE system SHALL reject the snapshot as invalid.

THE system SHALL use the server timestamp, not the client-provided timestamp, for accuracy.

THE system SHALL record the timestamp to the second for audit precision.

WHEN multiple snapshots are retrieved for the same record, THE system SHALL sort them by timestamp in descending order.

THE system SHALL preserve the exact timestamp even if the original record is deleted.

THE timestamp SHALL be included in all snapshot export reports.


### Dispute Resolution Access

THE owner of a record with snapshots SHALL have access to view all snapshots of that record.

ADMINISTRATORS SHALL have access to view snapshots of any record on the platform.

WHEN a customer requests dispute resolution, THE system SHALL provide access to relevant snapshots.

WHEN a seller responds to a cancellation or refund request, THE system SHALL create a snapshot accessible to the customer.

THE system SHALL display snapshots in a read-only format during dispute resolution.

WHEN a snapshot is accessed for dispute resolution, THE system SHALL log the access with user ID and timestamp.

CUSTOMERS SHALL NOT be able to modify snapshots accessed during dispute resolution.

SELLERS SHALL NOT be able to modify snapshots accessed during dispute resolution.

THE system SHALL provide snapshot data to administrators for official dispute resolution cases.

SNAPSHOTS SHALL be preserved indefinitely for dispute resolution purposes.


### Edit-Trigger Creation

WHEN a user edits any editable field, THE system SHALL automatically create a snapshot.

WHEN a seller edits their shop name, THE system SHALL create a snapshot immediately.

WHEN a seller edits their shop description, THE system SHALL create a snapshot immediately.

WHEN a seller edits their shop logo, THE system SHALL create a snapshot immediately.

WHEN a seller edits any product field, THE system SHALL create a product snapshot immediately.

WHEN a seller edits any product variant field, THE system SHALL create a variant snapshot immediately.

WHEN a customer edits their review text or rating, THE system SHALL create a review snapshot immediately.

WHEN a seller approves a cancellation request, THE system SHALL create a cancellation request snapshot immediately.

WHEN a seller approves a refund request, THE system SHALL create a refund request snapshot immediately.

THE system SHALL NOT create snapshots for system-generated fields or read-only fields.


### Preservation After Deletion

WHEN a product is deleted, THE system SHALL preserve all snapshots of that product.

WHEN a seller profile is deleted, THE system SHALL preserve all snapshots of that seller profile.

WHEN a review is deleted, THE system SHALL preserve all snapshots of that review.

WHEN a product variant is deleted, THE system SHALL preserve all snapshots of that variant.

WHEN a snapshot is accessed after the original record is deleted, THE system SHALL display it with a "record deleted" indicator.

ADMINISTRATORS SHALL be able to view deleted records' snapshots indefinitely.

THE system SHALL preserve snapshots even when the record owner's account is deleted.

WHEN a seller account is deleted, THE system SHALL preserve all product snapshots and seller profile snapshots.

SNAPSHOTS SHALL remain viewable for dispute resolution even after record deletion.

THE system SHALL provide a clear indicator showing when a snapshot's original record no longer exists.


# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Product Search Filtering

WHEN a customer searches for products, THE system SHALL allow filtering by category (including subcategories).
WHEN a customer searches for products, THE system SHALL allow filtering by price range with minimum and maximum values.
IF a customer requests in-stock only filter, THE system SHALL exclude out-of-stock variants from search results.
IF a product has no available variants (all out of stock), THE system SHALL exclude it from in-stock filtered results.
THE system SHALL support filtering for search results, category page listings, and seller dashboard order item lists.
IF multiple filters are applied, THE system SHALL combine them using AND logic.
IF no products match the filter criteria, THE system SHALL return an empty result set without error.

### Product Search Sorting

WHEN a customer searches for products, THE system SHALL allow sorting by newest first (by product creation date).
WHEN a customer searches for products, THE system SHALL allow sorting by price from low to high.
WHEN a customer searches for products, THE system SHALL allow sorting by price from high to low.
THE system SHALL sort category page listings by newest products first by default.
IF sorting by price, THE system SHALL use the base price for products with single variants or the minimum variant price for products with multiple variants.
IF the same sorting criteria is specified multiple times, THE system SHALL use the last specified criteria.
THE system SHALL preserve the default sort order when no sort parameter is provided.

### Pagination Rules

WHEN displaying product search results, THE system SHALL paginate results with a maximum of 20 items per page.
WHEN displaying category listings, THE system SHALL paginate results with a maximum of 20 items per page.
WHEN displaying wishlist items, THE system SHALL paginate results with a maximum of 20 items per page.
WHEN displaying order history, THE system SHALL paginate results with a maximum of 20 items per page.
THE system SHALL display the current page number and total number of pages in pagination controls.
WHEN a page request exceeds the total available pages, THE system SHALL return an empty result set.
WHEN requesting page 0 or negative page numbers, THE system SHALL redirect to page 1.

### Cursor-Based Pagination

WHEN result sets exceed 100 items, THE system SHALL support cursor-based pagination instead of page-based pagination.
THE system SHALL generate a unique cursor token for each page of results.
WHEN a customer provides a cursor token, THE system SHALL return the next page of results starting after that cursor.
THE system SHALL invalidate cursor tokens after 24 hours for security.
WHEN a cursor token is invalid or expired, THE system SHALL return an error and require the customer to start from the beginning.
THE system SHALL include cursor tokens in pagination responses for future navigation.
IF a product is added, removed, or modified while browsing paginated results, THE system SHALL maintain cursor consistency for stable results.

### Query Parameter Validation

WHEN a customer provides invalid query parameters, THE system SHALL reject the request with a validation error.
IF a price range minimum exceeds the maximum, THE system SHALL reject the request with a validation error.
IF a category ID does not exist in the system, THE system SHALL exclude that filter from results.
IF a sort parameter value is not one of the supported options, THE system SHALL use the default sort order.
IF a pagination page number exceeds integer maximum, THE system SHALL return the last available page.
WHEN multiple invalid query parameters are provided, THE system SHALL return all validation errors in a single response.
THE system SHALL ignore query parameters that are not relevant to the current listing operation.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Deletion Restrictions

WHEN a customer requests to delete their account, THE system SHALL delete their profile information including display name and phone number.

WHEN a customer requests to delete their account, THE system SHALL preserve their order history and order records.

WHEN a customer requests to delete their account, THE system SHALL preserve their reviews but display them as "deleted user".

IF a seller has pending orders (paid or shipped status), THE system SHALL reject the seller account deletion request.

IF a seller has pending cancellation or refund requests, THE system SHALL reject the seller account deletion request.

WHEN a seller account deletion is approved, THE system SHALL delete all products from active listings.

WHEN a seller account deletion is approved, THE system SHALL preserve order history and order snapshots.

WHEN a seller account deletion is approved, THE system SHALL preserve the shop name in past orders for seller identification.

### Registration and Approval Rejection

WHEN an administrator rejects a seller registration, THE system SHALL provide a rejection reason to the seller.

WHEN a seller account registration is rejected, THE seller SHALL be able to submit a new registration request.

IF a seller account is suspended, THE system SHALL hide all seller products from search and category listings.

IF a seller account is suspended, THE system SHALL prevent new product purchases from that seller.

WHEN a seller account is suspended, THE seller SHALL still be able to process existing orders (ship items, respond to cancellation/refund requests).

WHEN a seller account is suspended, THE system SHALL prevent the seller from creating new products.

WHEN a seller account is suspended, THE system SHALL prevent the seller from editing existing products.

IF a user submits an administrator request that is rejected, THE system SHALL notify the user of the rejection reason.

### Payment Processing Failures

IF the external payment gateway returns a failure response, THE system SHALL NOT create an order record.

IF payment processing fails, THE system SHALL allow the customer to retry the payment for the same cart contents.

IF the payment gateway times out or becomes unavailable, THE system SHALL display a payment processing error message.

IF the customer cancels the payment process before confirmation, THE system SHALL NOT create an order record.

### Order Cancellation Restrictions

IF an order item status is not "paid", THE system SHALL reject the customer cancellation request.

IF a cancellation request is pending seller approval, THE system SHALL prevent the customer from submitting a new cancellation request for the same item.

IF all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

IF a seller approves a cancellation request, THE system SHALL process a refund for the cancelled item only.

IF a seller approves a cancellation request, THE system SHALL restore the stock quantity for that variant via an inventory record.

IF a seller rejects a cancellation request, THE system SHALL notify the customer of the rejection reason.

WHEN a seller responds to a cancellation request (approve or reject), THE system SHALL create a snapshot of the request state.

### Refund Request Restrictions

IF an order item status is not "delivered", THE system SHALL reject the customer refund request.

IF the refund request is submitted more than 7 days after the item was delivered, THE system SHALL reject the refund request.

IF a refund request is pending seller approval, THE system SHALL prevent the customer from submitting a new refund request for the same item.

IF all items in an order are refunded, THE system SHALL update the overall order status to "refunded".

IF a seller approves a refund request, THE system SHALL restore the stock quantity for that variant via an inventory record.

IF a seller rejects a refund request, THE system SHALL notify the customer of the rejection reason.

WHEN a seller responds to a refund request (approve or reject), THE system SHALL create a snapshot of the request state.

### Review Submission Restrictions

IF a customer has not purchased the product, THE system SHALL reject the review submission request.

IF an order item status is not "delivered", THE system SHALL reject the review submission request for that item.

IF a customer has already written a review for a product in an order, THE system SHALL prevent the customer from writing another review for the same product in the same order.

IF a customer attempts to delete their review, THE system SHALL preserve the review snapshot for dispute resolution.

IF the product's average rating calculation includes a deleted review, THE system SHALL exclude the deleted review from the calculation.

### Shopping Cart Validation Errors

IF a customer attempts to add a variant with zero stock quantity, THE system SHALL reject the cart addition.

IF a variant in the cart becomes out of stock after the customer added it, THE system SHALL mark the cart item as unavailable.

IF a variant in the cart is deleted by the seller, THE system SHALL mark the cart item as unavailable.

IF a variant in the cart has less stock than the cart quantity, THE system SHALL display a stock warning to the customer.

IF a customer attempts to checkout with unavailable items, THE system SHALL remove unavailable items from the checkout process.

IF the customer's cart is empty, THE system SHALL reject the checkout request.

### Product and Variant Deletion Restrictions

IF a product has any pending order items (paid or shipped status) for any of its variants, THE system SHALL reject the product deletion request.

IF a product has any pending cancellation or refund requests for any of its variants, THE system SHALL reject the product deletion request.

IF a customer attempts to delete a product variant with pending order items, THE system SHALL reject the variant deletion request.

IF a customer attempts to delete a product variant with pending cancellation or refund requests, THE system SHALL reject the variant deletion request.

WHEN a product is deleted, THE system SHALL remove it from all search and category listings.

WHEN a product is deleted, THE system SHALL automatically remove it from all customer wishlists.

WHEN a product is deleted, THE system SHALL preserve all product snapshots for dispute resolution.

### Shipping and Delivery Exceptions

IF a customer confirms delivery for a shipment, THE system SHALL update all items in that shipment to "delivered" status.

IF fourteen days have passed since shipment without customer delivery confirmation, THE system SHALL automatically update all items in that shipment to "delivered" status.

IF a shipment is created for multiple order items from the same seller, THE system SHALL assign the same tracking number and carrier to all items in the shipment.

IF a customer cannot confirm delivery within the platform, THE system SHALL still process automatic delivery confirmation after fourteen days.

### Administrator Permission Exceptions

IF a super administrator attempts to demote themselves, THE system SHALL reject the demotion request.

IF a regular administrator attempts to promote themselves to super administrator, THE system SHALL reject the self-promotion request.

IF a banned customer attempts to log in, THE system SHALL reject the login and display an access denied message.

IF a banned seller attempts to log in, THE system SHALL reject the login and display an access denied message.

IF an administrator attempts to force-cancel an order item, THE system SHALL refund the customer and restore the stock quantity.

IF an administrator attempts to force-refund an order item, THE system SHALL process the refund and restore the stock quantity.

### Category Management Restrictions

IF an administrator attempts to delete a category that contains products, THE system SHALL move all products in that category to "uncategorized" status.

IF an administrator attempts to create a subcategory under an existing subcategory, THE system SHALL reject the request (one level nesting only).

IF an administrator attempts to delete a subcategory, THE system SHALL move all products in that subcategory to the parent category.

IF a category is deleted, THE system SHALL preserve all category snapshots for reference purposes.

### Snapshot Preservation Requirements

WHEN any editable record is modified, THE system SHALL create an immutable snapshot of the change.

WHEN a snapshot is created, THE system SHALL record the timestamp of the change.

WHEN a snapshot is created, THE system SHALL record both the old values and new values of the change.

WHEN a snapshot is created, THE system SHALL record the type of record that was changed.

IF a user attempts to delete a snapshot, THE system SHALL reject the deletion request.

ONLY record owners and administrators SHALL have access to view snapshots for dispute resolution.

AFTER a product is deleted, THE system SHALL preserve all product snapshots created before deletion.

### Inventory Stock Management Errors

IF a variant's stock quantity reaches zero, THE system SHALL mark the variant as "out of stock".

IF a customer attempts to add an out-of-stock variant to their cart, THE system SHALL reject the cart addition.

IF an order cancellation is approved, THE system SHALL automatically create a positive inventory record to restore stock.

IF an order refund is approved, THE system SHALL automatically create a positive inventory record to restore stock.

IF an inventory adjustment is made without a reason, THE system SHALL reject the inventory change request.

### Order and Shipment Validation Failures

IF a seller attempts to create a shipment containing items from multiple sellers, THE system SHALL reject the shipment creation.

IF a shipment is created without tracking information, THE system SHALL reject the shipment creation request.

IF an order item status is "cancelled" or "refunded", THE system SHALL reject any shipment creation request for that item.

IF a customer attempts to confirm delivery for an item that is not in "shipped" status, THE system SHALL reject the delivery confirmation.

WHEN a shipment is created, THE system SHALL update all items in the shipment to "shipped" status.

### Wishlist and Product Availability Errors

IF a product is deleted from the platform, THE system SHALL automatically remove it from all customer wishlists.

IF a customer views their wishlist and a product is unavailable, THE system SHALL display the product with an "unavailable" status.

IF a variant change occurs in a product after a customer adds it to their wishlist, THE system SHALL allow the wishlist to remain with the last known product state.

IF a wishlist pagination is requested beyond available data, THE system SHALL return an empty list rather than an error.

### Seller Dashboard Access Restrictions

IF a pending seller account attempts to access the seller dashboard, THE system SHALL deny access and display approval status.

IF a rejected seller account attempts to access the seller dashboard, THE system SHALL deny access and display the rejection reason.

IF a suspended seller attempts to access the seller dashboard, THE system SHALL display restricted access message.

IF a seller attempts to view order items for products they do not own, THE system SHALL deny access to those order items.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Gateway Integration Failure

### Payment Retry Policy

WHEN a payment gateway request fails, THE system SHALL retry the payment attempt according to the retry policy.

WHEN the third payment attempt fails, THE system SHALL mark the order as failed and inform the customer.

IF all retry attempts are exhausted, THE system SHALL allow the customer to retry the entire payment process.

IF the payment gateway returns a temporary error (timeout, network error), THE system SHALL retry with exponential backoff.

IF the payment gateway returns a permanent error (card declined, insufficient funds), THE system SHALL immediately reject the payment without retry.

### Payment Circuit Breaker

WHEN three consecutive payment failures occur within one minute, THE system SHALL open the circuit breaker for payment processing.

WHILE the payment circuit breaker is open, THE system SHALL reject new payment attempts with a service unavailable message.

WHEN the payment circuit breaker is open for five minutes, THE system SHALL attempt to close the circuit and resume payment processing.

WHEN the payment circuit breaker is successfully closed, THE system SHALL reset the failure counter.

### Payment Fallback Behavior

IF the primary payment gateway is unavailable, THE system SHALL use the secondary payment gateway as a fallback.

IF both payment gateways fail, THE system SHALL display an error message and suggest retrying later.

### Payment Integration Error Handling

THE system SHALL log all payment gateway errors with sufficient detail for dispute resolution.

THE system SHALL notify the customer of payment failures with actionable error messages.

THE system SHALL not charge the customer's account for failed payment attempts.

---

### Shipping Carrier Integration Retry

WHEN a shipping carrier API request fails, THE system SHALL retry the request up to three times.

WHEN the shipping carrier integration fails after retries, THE system SHALL notify the seller to manually track the shipment.

IF the carrier API returns an out-of-service message, THE system SHALL wait 30 minutes before the next retry attempt.

### Shipping Circuit Breaker

WHEN the shipping carrier returns five consecutive errors within ten minutes, THE system SHALL activate the carrier circuit breaker.

WHILE the carrier circuit breaker is active, THE system SHALL allow shipment creation but defer tracking number retrieval.

WHEN the carrier circuit breaker is active, THE system SHALL use the last known tracking number for customer display.

### Shipping Fallback

IF the primary shipping carrier integration fails, THE system SHALL record the shipment with status "manual tracking required".

IF manual tracking is required, THE system SHALL allow the seller to manually enter tracking information.

### Shipping Integration Error Catalog

THE system SHALL categorize shipping carrier errors as temporary, permanent, or informational.

THE system SHALL display different error messages based on the error category.

THE system SHALL preserve shipment data even when carrier integration fails.

---

### Email Service Integration Retry

WHEN an email sending request fails, THE system SHALL retry the email delivery up to three times.

WHEN all email delivery retries fail, THE system SHALL queue the email for manual review.

WHEN the email service returns a temporary error, THE system SHALL retry with 5-minute intervals.

### Email Circuit Breaker

WHEN ten consecutive email sending failures occur within one hour, THE system SHALL open the email circuit breaker.

WHILE the email circuit breaker is open, THE system SHALL skip non-critical emails (marketing, promotional).

WHILE the email circuit breaker is open, THE system SHALL send critical emails (order confirmation, shipping notification) with delayed delivery.

### Email Fallback

IF the primary email service fails, THE system SHALL attempt delivery through the backup email service.

IF both email services fail for critical emails, THE system SHALL create an internal alert for administrative follow-up.

### Email Integration Error Handling

THE system SHALL log all email delivery failures with recipient information and error codes.

THE system SHALL preserve email content even when delivery fails.

THE system SHALL notify administrators of sustained email delivery failures.

---

### General Integration Error Recovery

WHEN an integration error causes data inconsistency, THE system SHALL attempt automatic reconciliation.

WHEN automatic reconciliation fails, THE system SHALL flag the record for manual review.

WHEN a critical integration service is unavailable for more than one hour, THE system SHALL notify platform administrators.

THE system SHALL maintain an integration error log accessible to administrators for monitoring and debugging.

THE system SHALL preserve customer and seller data even when external integrations fail.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Upload Validation

WHEN a seller uploads a file (product image or shop logo), THE system SHALL validate the file before accepting it.

THE system SHALL reject the file if the file size exceeds the maximum allowed limit.
IF the file format is not in the approved content types list, THE system SHALL reject the upload.
THE system SHALL validate that uploaded images have a maximum resolution of 4096x4096 pixels.
THE system SHALL reject files that are corrupted or not properly formatted.
IF the uploaded file fails validation, THE system SHALL display an error message to the user.

IF a seller uploads a product image that does not meet validation requirements, THE system SHALL not include it in the product.
THE system SHALL display the validation error to the seller during the upload process.

PRODUCT IMAGES:
WHEN a seller uploads product images, THE system SHALL accept JPEG, PNG, and WebP formats only.
IF a seller uploads a file with an unsupported format, THE system SHALL reject it with an error.

SHOP LOGO:
WHEN a seller uploads a shop logo, THE system SHALL accept JPEG, PNG, and WebP formats.
IF the shop logo file size exceeds the limit, THE system SHALL reject the upload.

IMAGE QUALITY:
THE system SHALL require that all images have a minimum width of 200 pixels.
THE system SHALL reject images that do not meet the minimum size requirements.

MULTIPLE IMAGES:
THE system SHALL allow a maximum of 10 images per product.
IF a seller attempts to upload more than 10 images, THE system SHALL reject additional uploads.
WHEN a seller deletes an image, THE system SHALL allow adding a replacement image.

### Virus Scanning Policy

WHEN a file is uploaded to the system, THE system SHALL scan the file for malware and viruses.

THE system SHALL reject files that contain malware, viruses, or malicious code.
IF a virus scan detects malware, THE system SHALL reject the upload and delete the file.
THE system SHALL display a security warning to the user when malicious content is detected.

MALWARE DETECTION:
WHEN the system detects malware in an uploaded file, THE system SHALL notify administrators.
THE system SHALL record the incident in the security log for review.
IF the same user uploads files with malware multiple times, THE system SHALL flag the account for review.

SCAN TIMING:
THE system SHALL perform virus scanning immediately upon file upload.
IF the scan takes longer than 30 seconds, THE system SHALL display a progress indicator to the user.
THE system SHALL wait for scan completion before allowing the file to be processed.

RESCANNING:
IF a file is re-uploaded after deletion, THE system SHALL perform a new virus scan.
THE system SHALL not cache scan results across different uploads.

ADMINISTRATOR NOTIFICATION:
THE system SHALL send a notification to administrators when malicious files are detected.
ADMINISTRATORS SHALL be able to view the list of blocked uploads.

SELLER ACCOUNT STATUS:
IF a seller's uploaded files contain malicious content, THE system SHALL notify the seller.
THE system SHALL allow the seller to correct and re-upload the file after removing the issue.

### Content Type Validation

WHEN a file is uploaded, THE system SHALL validate that the content type matches the file extension.

IF the content type does not match the expected format, THE system SHALL reject the upload.
THE system SHALL validate image files contain valid image data.
IF the image data is corrupted or invalid, THE system SHALL reject the file.

IMAGE CONTENT:
WHEN an image is uploaded, THE system SHALL validate it contains actual image content.
IF the image is empty or contains only blank pixels, THE system SHALL reject it.
THE system SHALL reject images that contain copyrighted content without authorization.

FILE TYPE RESTRICTIONS:
THE system SHALL only accept image files (JPEG, PNG, WebP) for product images and shop logos.
IF a user attempts to upload non-image files (PDF, DOC, EXE), THE system SHALL reject them.
THE system SHALL display the list of accepted file types to users.

IMAGE FORMAT SPECIFICATIONS:
THE system SHALL validate that JPEG images have valid JPEG headers.
THE system SHALL validate that PNG images have valid PNG signatures.
THE system SHALL validate that WebP images have valid WebP container format.

PROTECTED FILE TYPES:
THE system SHALL reject executable files (EXE, BAT, COM, SCRIPT).
THE system SHALL reject archive files (ZIP, RAR, TAR) from uploads.
THE system SHALL reject documents (PDF, DOC, XLS) from uploads.

MIME TYPE VALIDATION:
THE system SHALL validate the MIME type matches the file extension.
IF the MIME type is application/octet-stream or unknown, THE system SHALL reject it.
THE system SHALL not allow users to bypass content type validation.

### File Retention Policy

WHEN a file is deleted by a seller, THE system SHALL retain the file for 30 days before permanent deletion.

DURING THE RETENTION PERIOD:
THE system SHALL allow administrators to recover deleted files.
THE system SHALL display the deletion date to administrators.
WHEN a file is deleted, THE system SHALL mark it as "scheduled for deletion" rather than immediately removing it.

PERMANENT DELETION:
AFTER 30 days, THE system SHALL permanently delete the file from storage.
THE system SHALL log the permanent deletion with timestamp and user.
AFTER permanent deletion, THE file SHALL NOT be recoverable.

PRODUCT IMAGE RETENTION:
WHEN a product is deleted, THE system SHALL retain all associated images.
THE system SHALL retain images for 90 days after the product deletion.
AFTER the retention period, THE system SHALL permanently delete the images.

SHOP LOGO RETENTION:
WHEN a seller account is deleted, THE system SHALL retain the shop logo.
THE system SHALL retain the logo for 60 days after account deletion.
WHEN the shop logo is retained, THE system SHALL preserve it in the deleted product snapshots.

SNAPSHOT PRESERVATION:
WHEN a product snapshot is created, THE system SHALL retain the image references.
THE system SHALL preserve image references even if the original image is deleted.
THE system SHALL NOT delete images referenced in snapshots.

ORDER RELATED FILES:
WHEN an order is created, THE system SHALL retain all product images referenced in the order.
THE system SHALL retain these images for the lifetime of the order history.
THE system SHALL allow viewing of historical product images in order details.

ADMINISTRATOR OVERRIDE:
THE system SHALL allow administrators to permanently delete files before the retention period expires.
IF an administrator deletes a file, THE system SHALL log the reason for early deletion.
THE system SHALL require administrator confirmation for early permanent deletion.

### Error Handling for File Operations

WHEN a file upload fails validation, THE system SHALL display an error message to the user.

IF the file size exceeds the maximum limit, THE system SHALL display the error "File size exceeds the maximum allowed limit of [limit]."
IF the file format is not supported, THE system SHALL display the error "Unsupported file format. Please use JPEG, PNG, or WebP."
IF the image resolution is invalid, THE system SHALL display the error "Image resolution does not meet requirements. Minimum width: 200 pixels, Maximum: 4096 pixels."
IF a virus is detected, THE system SHALL display the error "Upload rejected due to security concerns. Please try again or contact support."

RETRY BEHAVIOR:
WHEN a file upload fails, THE system SHALL allow the user to retry the upload.
IF the same file is uploaded again without modification, THE system SHALL skip validation.
THE system SHALL NOT retry more than 5 times for the same file.

PARTIAL UPLOADS:
WHEN a multi-image upload fails, THE system SHALL continue processing valid images.
IF only some images fail, THE system SHALL display which images were successfully uploaded.
THE system SHALL allow the user to retry only the failed uploads.

FILE LOCKING:
WHEN a file is being processed, THE system SHALL lock it from other operations.
IF another upload attempt is made for the same file, THE system SHALL display an error "File is being processed, please wait."
THE system SHALL unlock the file after processing completes or fails.

ERROR LOGGING:
THE system SHALL log all file upload errors with timestamp and user.
THE system SHALL log the error reason and file name.
ADMINISTRATORS SHALL be able to view the error log.

RECOVERY OPTIONS:
WHEN a file upload fails, THE system SHALL offer the user to retry or cancel.
IF the user cancels, THE system SHALL NOT delete partially uploaded data.
THE system SHALL allow the user to resume from where they left off.

### Admin Override and Recovery

WHEN an administrator initiates file recovery, THE system SHALL restore the file to its original location.

ADMINISTRATOR RECOVERY:
THE system SHALL allow administrators to recover files within the retention period.
WHEN recovering a file, THE system SHALL restore the original filename and metadata.
THE system SHALL log the recovery action with timestamp and administrator.

FILE PRESERVATION:
WHEN an administrator marks a file as "preserve", THE system SHALL extend the retention period.
THE system SHALL allow indefinite preservation upon administrator approval.
PRESERVED FILES SHALL NOT be subject to automatic deletion.

COMPLIANCE REQUESTS:
WHEN a legal compliance request is received, THE system SHALL preserve all related files.
THE system SHALL allow administrators to set custom retention periods for compliance.
COMPLIANCE PRESERVATION SHALL override standard retention policies.

PERMANENT DELETION AUTHORITY:
THE system SHALL allow administrators to permanently delete files before retention expires.
ADMINISTRATORS SHALL provide a reason for permanent deletion.
THE system SHALL require secondary confirmation for permanent deletion.

RECOVERY HISTORY:
THE system SHALL maintain a log of all file recovery operations.
ADMINISTRATORS SHALL be able to view the recovery history.
THE system SHALL show which administrator performed each recovery.

RESTORATION LIMITS:
THE system SHALL limit file restoration to once per retention period.
WHEN a file is restored, THE system SHALL reset the retention clock.
IF a file is restored and deleted again, THE system SHALL start a new retention period.

# Job Failure Policies

Failure handling and dead-letter queue policies for background jobs.

## Job Failure and Recovery

Define failure handling, recovery procedures, and notification requirements for background jobs.

### Job Failure Detection and Logging

WHEN a background job fails, THE system SHALL log the failure with: job type, failure reason, timestamp, and affected record IDs.

WHEN a job fails, THE system SHALL create a job failure record containing: job identifier, error message, stack trace summary, retry count, and maximum retry attempts.

IF a job failure occurs during critical business operations (order creation, payment processing, inventory update), THE system SHALL mark the failure as high priority.

THE system SHALL persist all job failure records for at least 90 days for auditing and dispute resolution.

THE system SHALL provide administrators with a list of recent job failures filtered by: status (pending retry, failed permanently), job type, and date range.

IF the same job fails consecutively three or more times, THE system SHALL automatically escalate the failure to a super administrator notification.

THE system SHALL capture the system state at the time of job failure for debugging purposes, including: relevant entity data, user context, and operational parameters.

### Automatic Retry Mechanisms

WHEN a background job fails, THE system SHALL automatically attempt to retry the job according to the retry policy defined for that job type.

IF a job failure is transient (network error, temporary timeout), THE system SHALL retry the job after a minimum of 5 minutes.

IF a job failure is due to data validation error, THE system SHALL NOT automatically retry the job.

THE system SHALL implement exponential backoff for retry attempts: 5 minutes, 15 minutes, 30 minutes, 1 hour, 2 hours.

IF a job exceeds its maximum retry count (5 attempts), THE system SHALL mark the job as permanently failed and create a notification.

THE system SHALL NOT retry jobs that fail due to business rule violations (e.g., invalid payment method, insufficient stock).

THE system SHALL maintain a retry history for each job, showing: retry attempt number, retry timestamp, retry result (success/failure), and time elapsed since previous retry.

### Job Recovery Procedures

WHEN a job fails permanently, THE system SHALL provide administrators with the option to manually re-trigger the job with corrected parameters.

IF a job failure causes data inconsistency (e.g., order created without inventory deduction), THE system SHALL offer a recovery procedure to restore data integrity.

THE system SHALL allow administrators to configure recovery timeout windows for different job types (e.g., 24 hours for order processing, 7 days for payment reconciliation).

IF a recovery attempt succeeds, THE system SHALL log the recovery success with original failure ID and recovery timestamp.

IF a recovery attempt fails, THE system SHALL increment the failure count and apply standard retry policies.

THE system SHALL NOT allow manual job re-triggering for jobs that have passed their recovery timeout window.

THE system SHALL create a snapshot of the system state before any manual recovery operation for audit purposes.

THE system SHALL notify relevant stakeholders (customer, seller, administrator) when a manually triggered job recovery is completed.

### Failure Notification System

WHEN a job fails and exceeds the retry threshold, THE system SHALL send a notification to the designated administrator or support team.

WHEN a job that affects a customer order fails permanently, THE system SHALL send a notification to the affected customer explaining the situation and next steps.

WHEN a job that affects a seller's operations fails (e.g., order processing, inventory update), THE system SHALL send a notification to the seller.

THE system SHALL include in all failure notifications: job type, affected record(s), failure reason, estimated recovery time (if known), and action required.

THE system SHALL allow administrators to configure notification channels (email, SMS, in-app notification) for different job failure severity levels.

IF a critical job failure impacts multiple users (e.g., payment gateway integration failure affecting all orders), THE system SHALL send an alert to all relevant administrators simultaneously.

THE system SHALL maintain a notification history showing: notification type, recipient, delivery status (sent, delivered, failed), and timestamp.

### Dead Letter Queue Policy

WHEN a job fails permanently after all retry attempts, THE system SHALL move the job to a dead letter queue for later review and recovery.

THE system SHALL preserve the complete job payload and error context for all jobs in the dead letter queue.

WHEN a job is moved to the dead letter queue, THE system SHALL create a notification for administrators.

THE system SHALL allow administrators to manually review and recover jobs from the dead letter queue.

THE system SHALL provide administrators with the ability to delete jobs from the dead letter queue after a retention period of 30 days.

THE system SHALL NOT automatically retry jobs that have been manually removed from the dead letter queue.

THE system SHALL generate daily reports listing all jobs in the dead letter queue, including: job type, failure reason, age, and status (pending review, recovered, deleted).

### Monitoring and Alerting

THE system SHALL provide real-time dashboards showing: current job queue status, failure rate by job type, average job processing time, and pending retry count.

IF the job failure rate exceeds 5% for any job type within a 1-hour window, THE system SHALL send an alert to the technical team.

IF the average job processing time for any job type increases by more than 50% compared to the 7-day average, THE system SHALL send a performance alert.

THE system SHALL track and display job success rates over time for each job type (24-hour, 7-day, 30-day periods).

THE system SHALL allow administrators to create custom alert thresholds for specific job types based on business requirements.

THE system SHALL maintain historical metrics for all job operations for a period of 90 days for trend analysis and capacity planning.