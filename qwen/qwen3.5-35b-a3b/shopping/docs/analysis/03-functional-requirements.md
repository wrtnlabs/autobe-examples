**ecommerceMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Customer Operations

Customers can register for an account using their email address and password. Once registered, customers log in with the same email and password credentials. Customers can change their password at any time through their account settings. When a customer decides to delete their account, their profile information is removed from the system. However, the customer's order history is preserved for seller records and legal compliance purposes. Reviews written by the customer remain visible but are displayed with a deleted user label instead of their name. Only registered users can access any features on the platform; guest browsing is not allowed.

### Customer Account Registration

Customers can register for a new account using an email address and password.

The email address must be unique across all customer accounts. Duplicate email addresses are rejected during registration.

Customer accounts are created with a timestamp recording the registration date.

Guest users must complete registration before accessing customer-specific features.

### Email and Password Login

Customers can log in to the system using their registered email address and password.

The system validates the credentials and grants access to registered customers.

Login provides customers access to their account features and order history.

### Password Modification

Customers can modify their account password through their account settings.

Customers must provide their current password to verify identity before modifying.

The new password is stored to replace the previous password.

After password modification, customers must use the new password for future logins.

### Account Deletion Process

Customers can request to delete their account through their account settings.

Account deletion removes the customer's ability to log in to the system.

Customer deletion requests are processed according to system procedures.

Deletion confirmation is provided upon successful account removal.

### Preserved Order History

When a customer account is deleted, all order history is preserved in the system.

Order records remain accessible to administrators for legal compliance and record-keeping.

Order numbers, dates, totals, and statuses are maintained in system records.

Sellers can continue to view orders placed by deleted customer accounts.

### Deleted Customer Review Display

Reviews written by deleted customers remain visible on products.

Review ratings continue to be included in product average rating calculations.

Review text content and timestamps are preserved after account deletion.

Deleted customer reviews maintain their placement in product review listings.

### Guest Access to Platform

Guest users can access the platform without an account.

Guest users can browse products and view product details.

Guest users can search for products and categories.

Guest users cannot place orders, view order history, or access account-specific features without registration.

### Customer Information After Deletion

After customer account deletion, the customer's identity is anonymized in system records.

Customer names in order history are replaced with generic identifiers.

Product reviews and ratings maintain their contribution to platform metrics.

Administrators can access original account information for legal compliance purposes.

## CustomerProfile Operations

Each customer has a profile that includes a display name and phone number for communication purposes. Customers can edit their display name to show how they want to be identified on the platform. Customers can also update their phone number for order notifications and contact purposes. All profile changes are editable by the customer at any time through their profile settings. The display name and phone number are visible to sellers when placing orders for fulfillment.

### Display Name Management

Each customer has a display name that serves as their public identity on the platform. The display name is visible to other customers and sellers when viewing orders, reviews, and product interactions. Customers can set their display name during account registration and update it at any time through their profile settings. When a customer updates their display name, the change is immediately reflected across the platform. The display name is required and cannot be left empty.

### Phone Number Management

Each customer has a phone number for order notifications and customer communication purposes. Customers can set their phone number during account registration and update it at any time through their profile settings. The phone number is used by sellers to contact customers regarding order issues or delivery coordination. Customers must provide a valid phone number format when setting or updating their phone number. The system validates the phone number format and rejects invalid entries. Phone numbers are only visible to the customer themselves and to sellers associated with the customer's orders for order-related communications.

### Profile Information Editing

Customers can edit their profile information at any time through the customer profile settings page. Profile edits include display name and phone number updates. When customers submit profile updates, the changes are immediately persisted to the system. Customers can update their display name and phone number independently without affecting the other field.

### Profile Update Workflow

When a customer initiates a profile update, they navigate to the profile settings page and modify the desired fields. The customer submits the updated information through the profile update form. The system validates all input fields before processing the update. If validation passes, the profile is updated immediately and the customer sees the new information. If validation fails, the customer receives an error message describing the issue and the update is not applied.

### Communication Details Visibility

Customers' communication details include their display name and phone number for seller interaction purposes. The display name is visible to all other customers and sellers throughout the platform. Phone numbers are only visible to the customer themselves and to sellers associated with the customer's orders. When a customer places an order, their phone number is shared with the seller for that order to facilitate delivery coordination. The phone number is not visible to other customers browsing products or reviews.

## Address Operations

Customers can add multiple shipping addresses for different delivery locations. Each address includes the recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit their existing addresses to update shipping information when details change. Customers can remove addresses they no longer use from their saved address list. One address can be set as the default shipping address for faster checkout. During checkout, customers can select any of their saved addresses or use the default for their order.

### Multiple Addresses Management

Customers can save multiple shipping addresses for different delivery locations. Each customer can maintain as many addresses as needed for their various shipping needs.

Customers can view their complete list of saved addresses from their account settings. The address list displays all saved addresses with their key information: recipient name, street address, city, and state/province.

Customers can manage their saved addresses at any time. They can add new addresses, edit existing ones, or remove addresses they no longer use.

Each address must belong to the customer who saved it. Customers cannot view or edit other customers' addresses.

Customers can organize their addresses by setting one as the default shipping address for faster checkout.

When a customer has no saved addresses, the system prompts them to add at least one address before they can complete checkout.

### Address Creation

Customers can create a new shipping address by providing complete address information.

Each address includes the following required information:
- Recipient name: the full name of the person receiving the delivery
- Phone number: contact number for delivery coordination
- Street address: the complete street address including building or unit number
- City: the city where the delivery is located
- State or province: the state, province, or region of delivery

All address fields must be provided when creating a new address. Addresses with missing required information are rejected.

After providing all required information, the system creates the new address and adds it to the customer's saved addresses list.

The newly created address is not automatically set as the default address unless the customer has no other saved addresses.

### Address Editing

Customers can edit any of their saved addresses to update shipping information when details change.

Customers can modify any field in their addresses including recipient name, phone number, street address, city, and state/province.

When editing an address, customers update the information and save the changes. The system updates the address immediately with the new values.

If the address being edited is set as the default shipping address, it remains the default address after the edit.

Customers can only edit their own addresses. Editing another customer's address is not permitted.

If an address is set as the default and the customer sets another address as default during editing, the original default is automatically unset.

Address edits are persisted immediately. There is no confirmation step required before the edit takes effect.

### Address Deletion

Customers can remove addresses they no longer need from their saved address list.

When deleting an address, the customer confirms the deletion. The system removes the address from their saved addresses permanently.

If the address being deleted is the default shipping address, the system requires the customer to select a new default address from their remaining addresses before completing the deletion.

If the customer has no other addresses available, the system allows the deletion but the customer must add a new address before they can proceed with checkout.

Deleted addresses cannot be recovered. Customers need to create a new address if they want to use the same shipping information again.

Customers cannot delete addresses that belong to other customers.

After deletion, the address is no longer available for selection during checkout.

### Default Address Setting

Customers can set one address as their default shipping address for faster checkout.

The default address is automatically suggested during checkout, but customers can still choose a different address from their saved list.

Customers can set any of their saved addresses as the default shipping address.

If a customer sets a new address as default, the previously set default address is automatically unset.

Customers can change their default address at any time from their account settings.

When a customer creates their first address, that address automatically becomes the default unless they specify otherwise.

Customers without a default address will see all their addresses displayed equally during checkout without any pre-selection.

The default address setting is stored with the customer account and persists across all checkout sessions.

### Checkout Address Selection

During checkout, customers can select a shipping address from their saved addresses or use their default address.

The checkout flow requires customers to select a shipping address before they can complete their order.

If a customer has a default address, it is pre-selected during checkout. Customers can change this selection to any of their other saved addresses.

If a customer has no saved addresses, the system prompts them to add a shipping address before proceeding with checkout.

The selected address is used for the entire order. All items in the order will be shipped to the same address.

The checkout address confirmation displays the complete address information including recipient name, phone number, street address, city, and state/province.

Once an order is placed, the shipping address cannot be changed. Customers need to contact customer support if address changes are needed after order placement.

Customers can add new addresses during checkout and use them immediately for that order without saving to their saved addresses list.

## Seller Operations

Sellers can register on the platform using their email address and password credentials. Seller accounts require administrator approval before they are allowed to sell products. Sellers can view their current approval status showing whether they are pending, approved, or rejected. If a seller application is rejected, the seller can view the reason provided by the administrator. Rejected sellers can submit a new registration request after addressing the rejection reason. Sellers can change their password through account settings. A seller can delete their account only if there are no pending orders with paid or shipped status and no pending cancellation or refund requests. When a seller deletes their account, their products are removed from listings but order history and snapshots are preserved for business records.

### ### Section 1: Seller Account Registration

Sellers can register on the platform using their email address and password credentials.

When a seller submits a registration request, their account is created with a pending approval status.
The seller cannot access any selling features until their account is approved by an administrator.

Registration requires a valid email address that has not been previously registered as a seller.

### ### Section 2: Admin Approval Requirement

All seller accounts require administrator approval before they can perform selling operations.

An administrator can view the list of pending seller approval requests.
Administrators can approve or reject each pending registration request.

### Approval Workflow

When a seller registration is submitted, the account remains in pending status.
The seller cannot access product creation, order management, or other selling features while pending.
An administrator must explicitly approve the registration to change the status to approved.

If the administrator approves the registration, the seller account status changes to approved.
The seller immediately gains access to the selling dashboard and can begin listing products.
If the administrator rejects the registration, the seller account status changes to rejected.

### Admin Approval Actions

An administrator can view the full list of pending seller registration requests.
Each pending request shows the seller's email address and registration date.
The administrator can approve a registration to activate the seller account.
The administrator can reject a registration with a required rejection reason.
The rejection reason is displayed to the seller for their review.

### Approval Restrictions

Only accounts with approved status can create products or receive orders.
Accounts with rejected status cannot be used for selling until a new registration is submitted.
Suspended accounts are a separate state from pending approval status.

### ### Section 3: Approval Status Visibility

Sellers can view their current approval status at any time through their account settings.

The approval status is displayed prominently to indicate whether the seller can access selling features.

### Status Display Options

A seller can view their account status showing one of four states: pending, approved, rejected, or suspended.
The status is visible in the seller dashboard and account settings page.
Pending status indicates the seller is waiting for administrator approval.
Approved status indicates the seller can access all selling features.
Rejected status indicates the registration was declined.
Suspended status indicates the seller has been suspended by an administrator.

### Status Transition Notifications

When the administrator changes the approval status, the seller can view the updated status immediately.
The status update does not require seller re-login to be visible.
Rejected sellers see the rejection reason provided by the administrator.

### Status Changes

If the approval status changes from pending to approved, the seller immediately gains access to selling features.
If the approval status changes from approved to rejected, the seller loses all selling access.
If the approval status changes from approved to suspended, the seller retains order processing access but cannot create new products.

### ### Section 4: Rejection Reason Viewing

When a seller registration is rejected, the seller can view the reason provided by the administrator.

The rejection reason is displayed in the seller account settings area.

### Rejection Reason Display

Sellers with rejected status can view the full rejection reason text provided by the administrator.
The rejection reason is permanently associated with the registration record.
The seller can review the rejection reason multiple times.
The reason text is not editable by either the seller or the administrator after submission.

### Viewing Rejection History

A rejected seller can view all rejection reasons if they submitted multiple registration requests.
Each rejection reason is displayed with the date of that rejection.
The seller can see which rejection reason corresponds to which submission attempt.

### Rejection Reason Content

The rejection reason is provided as free-form text by the administrator.
The reason can contain detailed explanation for the rejection decision.
The seller cannot edit or dispute the rejection reason through the platform.
The rejection reason remains visible for the lifetime of the rejected account.

### ### Section 5: Resubmit Registration Request

Rejected sellers can submit a new registration request after addressing the rejection reason.

A new registration creates a separate approval request that is reviewed independently.

### New Registration Submission

A seller with rejected status can create a new registration request using the same email address.
The new registration request enters pending status for administrator review.
The previous rejection reason does not prevent a new registration submission.
The new registration request is processed as a fresh approval request.

### Rejection Handling

If the new registration is rejected again, the seller can view the new rejection reason.
The seller can resubmit registration multiple times until approval is granted.
Each submission creates a new approval request record.
The system maintains a history of all registration submissions.

### Registration Restrictions

A pending registration request must be resolved before a new request can be submitted.
If the seller has an active pending request, they cannot submit another until it is resolved.
A rejected seller can immediately submit a new request without waiting.
An approved seller cannot submit a new registration request.

### ### Section 6: Seller Login Credentials

Sellers can log in to the platform using their registered email address and password.

### Login Process

A seller enters their email address and password to access their account.
The system validates the credentials against the registered seller account.
If the email address is not registered as a seller, the login is rejected.
If the password is incorrect, the login is rejected.

### Password Management

Sellers can change their password through account settings.
Changing the password requires entering their current password.
After a password change, the seller must log in again with the new password.

### ### Section 7: Account Deletion Prerequisites

Sellers can delete their account only if specific conditions are met to protect business records.

The system validates all prerequisites before allowing account deletion.

### Prerequisite Validation

A seller cannot delete their account if they have any pending orders with paid or shipped status.
A seller cannot delete their account if they have any pending cancellation requests.
A seller cannot delete their account if they have any pending refund requests.
All prerequisites must be satisfied before account deletion can proceed.

### Pending Order Check

The system checks for any order items with paid status before allowing deletion.
The system checks for any order items with shipped status before allowing deletion.
If any paid or shipped items exist, the deletion request is rejected.
Sellers must wait until all orders are completed before requesting deletion.

### Pending Request Check

The system checks for any cancellation requests that have not been resolved.
The system checks for any refund requests that have not been resolved.
If any pending cancellation or refund requests exist, the deletion request is rejected.
Sellers must wait until all requests are approved or rejected.

### Deletion Request Validation

When a seller requests account deletion, the system performs all prerequisite checks.
If all checks pass, the deletion process begins.
If any check fails, the request is rejected with details of what blocks deletion.
The seller can view which specific prerequisites are not yet met.

### ### Section 8: Seller Account Deletion Rules

When a seller deletes their account, specific business records are preserved for legal and operational purposes.

Product listings are removed but order history is maintained.

### Account Deletion Process

When a seller account deletion is approved, their products are removed from listings.
Products are deleted from search results and category pages.
Products are no longer visible to customers browsing the platform.

### Order History Preservation

All order history and snapshots are preserved even after account deletion.
Order history remains accessible to customers who made purchases.
Administrators retain access to all order records for oversight purposes.
Order records include all relevant information about the transaction.

### Shop Name Preservation

The seller's shop name is preserved in all past order records.
Customers who purchased from the seller can still see the shop name.
The preserved shop name cannot be modified after account deletion.
The shop name remains associated with historical orders.

### Product and Variant Removal

All products owned by the seller are deleted from the platform.
All product variants are deleted along with their products.
Product snapshots are preserved for dispute resolution.
Inventory records are preserved as part of order history.

### ### Section 9: Order History Preservation

Order history and snapshots are preserved indefinitely for business records after seller account deletion.

This ensures customers can reference their purchases and administrators can oversee transactions.

### Historical Order Access

Customers can view their complete order history even after the seller deletes their account.
Order details include product names, prices, and seller information.
The seller's preserved shop name remains visible in historical orders.
Customers cannot modify historical order information.

### Snapshot Preservation

All product snapshots created during the seller's active period are preserved.
All variant snapshots created during the seller's active period are preserved.
All seller profile snapshots are preserved for reference.
Snapshots cannot be deleted after account deletion.

### Administrative Oversight

Administrators retain full access to all historical order records.
Administrators can view snapshots from deleted seller accounts.
Administrators use preserved data for dispute resolution and audits.
Historical data is never removed even after account deletion.

### Data Retention Scope

Order records, snapshots, and related data are permanently retained.
Inventory history records are preserved as part of order records.
Cancellation and refund requests are preserved with their history.
All data remains queryable by authorized users.

### ### Section 10: Seller Profile Management

Each seller has a profile with a shop name, shop description, and logo image.

Sellers can edit their profile information at any time.
Every edit creates a snapshot to preserve the previous state.

### Profile Elements

A seller profile includes a shop name, shop description, and logo image.
The shop name is displayed to customers browsing products.
The shop description provides information about the seller's business.
The logo image is shown in product listings and seller profiles.

### Profile Editing

Sellers can update their shop name, description, and logo through profile settings.
When any profile field is modified, a snapshot is automatically created.
The snapshot records the time of the change and previous values.
The previous values remain accessible through snapshot history.

### Profile Visibility

Customers can view seller profiles when browsing products.
Seller profiles are accessible through the product detail page.
Profiles show the current shop name, description, and logo.
Profiles are not editable by customers.

### Edit Snapshot Creation

Every modification to the seller profile triggers snapshot creation.
Shop name changes are captured in a new snapshot.
Shop description changes are captured in a new snapshot.
Logo image updates are captured in a new snapshot.
The snapshot contains all three fields regardless of which changed.

### Profile Snapshot Access

Sellers can view snapshots of their own profile edits.
Administrators can view snapshots of any seller profile.
Snapshots are immutable and cannot be deleted.
Snapshots are used for dispute resolution and verification.

### ### Section 11: Product Creation and Management

Sellers can create and manage their own products on the platform.

Each product has required fields and belongs to the creating seller.

### Product Creation

Sellers can create a product by providing a name, description, category, and base price.
The product name is required and must be unique within the seller's catalog.
The product description is required and provides product details.
The product category is required and can be a subcategory.
The product base price is required and is the default price for variants.

### Product Ownership

Products belong to the seller who created them.
Sellers can only edit or delete their own products.
Sellers cannot access or modify products created by other sellers.
Product ownership cannot be transferred between sellers.

### Product Editing

Sellers can edit their product name, description, category, and base price.
Every product edit automatically creates a snapshot.
The snapshot captures the product state before the change.
Product images are included in product snapshots.

### Product Deletion Restrictions

Sellers can delete their products only if no pending orders exist.
Deletion is blocked if any variant has paid or shipped order items.
Deletion is blocked if any pending cancellation or refund requests exist.
All variants and inventory records are deleted with the product.

### Product Listing Restrictions

Deleted products no longer appear in search results.
Deleted products no longer appear in category listings.
Deleted products are removed from customer wishlists.
Deleted products are removed from shopping carts.

### ### Section 12: Product Variant Management

Sellers can create and manage multiple variants for each product.

Each variant represents a specific combination of options with its own SKU code.

### Variant Creation

Sellers can add variants to their products with SKU code, option values, and stock quantity.
Each variant requires a unique SKU code within the product.
Option values define the variant characteristics (e.g., color, size).
The stock quantity is required and defaults to zero for new variants.
The variant price can override the product's base price or match it.

### Variant Options

A variant represents a specific combination of options for a product.
Option values are displayed to customers when selecting variants.
Customers must select a specific variant before adding to cart.
Each option combination has its own stock tracking.

### Variant Editing

Sellers can edit the SKU code, option values, and price of variants.
Every variant edit automatically creates a snapshot.
The snapshot captures the variant state before the change.
Stock quantity cannot be edited directly; it is managed through inventory records.

### Variant Deletion Restrictions

Sellers can delete variants only if no pending orders exist.
Deletion is blocked if the variant has paid or shipped order items.
Deletion is blocked if there are pending cancellation or refund requests.
Deleted variants are removed from product listings.

### Minimum Variant Requirement

A product must have at least one variant to be purchasable.
Products with no variants are visible but shown as unavailable.
Customers cannot add products without variants to cart.
Sellers must add at least one variant before the product can be sold.

### ### Section 13: Inventory Management

Each product variant has its own stock quantity tracked through inventory records.

Sellers manage inventory through restocking and adjustment entries.

### Stock Quantity Tracking

Each variant maintains a stock quantity that reflects available items.
Stock quantity is calculated from inventory records.
Sellers cannot directly edit stock quantities; they use inventory records.
The current stock is the sum of all inventory record changes.

### Inventory Records

Inventory records track all stock changes with quantity, reason, and timestamp.
Restocking creates a positive inventory record with reason "restock".
Orders create negative inventory records with reason "order placement".
Cancellations create positive inventory records with reason "cancellation".
Refunds create positive inventory records with reason "refund".
Adjustments create records with appropriate reason codes.

### Restocking Process

Sellers can add inventory to a variant with a quantity and reason.
The restock increases the available stock for that variant.
The inventory record is created with timestamp and reason.
Other sellers cannot modify inventory for a variant they do not own.

### Inventory Adjustments

Sellers can subtract inventory through adjustment entries.
Adjustments are used for loss, damage, or corrections.
Each adjustment requires a reason for the quantity change.
Inventory adjustments create permanent audit trail records.

### Stock Status Display

When stock reaches zero, the variant is shown as out of stock.
Out of stock variants are marked as unavailable for purchase.
Customers cannot add out of stock variants to cart.
Stock status is updated immediately when inventory changes.

### ### Section 14: Order Item Oversight

Sellers can view order items for their products.

Sellers can see order information for fulfillment purposes.

### Order Item Viewing

Sellers can view a list of all order items for their products.
The list shows item status, quantity, and customer information.
Order items from different orders are displayed together.

### Cancellation Request Management

Sellers can view cancellation requests for their order items.
Sellers can approve or reject pending cancellation requests.
When a seller responds to a cancellation request, a snapshot is created.
Approved cancellations cancel the item and process refund.
Rejected cancellations keep the item in its current status.

### Refund Request Management

Sellers can view refund requests for their delivered order items.
Sellers can approve or reject pending refund requests.
When a seller responds to a refund request, a snapshot is created.
Approved refunds process the refund for the item.
Rejected refunds keep the item in delivered status.

### Dashboard Summary

Sellers can view a summary showing total order items for their products.
The summary shows counts of pending cancellation requests.
The summary shows counts of pending refund requests.
Sellers use this overview to manage their fulfillment workflow.

### ### Section 15: Shipment Creation and Tracking

Sellers create shipments to send products to customers.

Each shipment contains order items from the same seller with tracking information.

### Shipment Creation

Sellers can view order items that need shipping (paid status).
Sellers can select one or more of their items to include in a shipment.
Different sellers always create separate shipments for their items.
A seller can bundle multiple items into a single shipment.

### Tracking Information

When creating a shipment, sellers enter tracking carrier and tracking number.
The tracking information is associated with the entire shipment.
All items in the same shipment share the same tracking details.
Customers can view tracking information for each shipment.

### Shipment Status Update

When a shipment is created, all items in it change to shipped status.
The shipment status updates automatically upon creation.
Items are marked as shipped only when included in a shipment.
Customers receive notification of shipment creation.

### Delivery Confirmation

Customers can confirm delivery for each shipment.
When a customer confirms delivery, all items in the shipment change to delivered.
If the customer does not confirm, items automatically change to delivered after 14 days.
The 14-day period starts from the shipment creation date.

### Shipment Bundling

Sellers can choose to ship items individually or together.
Items from different orders can be bundled if from the same seller.
Each shipment has unique tracking information.
Sellers are responsible for accurate shipment records.

### ### Section 16: Snapshot Management

All seller-related data modifications create immutable snapshots for audit and dispute resolution.

Snapshots preserve the complete state of records at specific points in time.

### Snapshot Creation Triggers

Snapshots are created when products are edited (all fields).
Snapshots are created when product variants are edited (SKU, options, price).
Snapshots are created when seller profiles are edited (shop name, description, logo).
Snapshots are created when reviews are edited or deleted.
Snapshots are created when cancellation requests are resolved (approved/rejected).
Snapshots are created when refund requests are resolved (approved/rejected).

### Snapshot Content

Product snapshots include all fields: name, description, category, price, images.
Variant snapshots include SKU code, option values, price.
Profile snapshots include shop name, description, logo image.
Order snapshots include product state, variant state, and seller profile at time of purchase.
Cancellation and refund snapshots capture the request state at resolution.

### Snapshot Immutability

Snapshots cannot be modified after creation.
Snapshots cannot be deleted under any circumstances.
Snapshots are permanently associated with their source entity.
Snapshots are used for dispute resolution and historical reference.

### Snapshot Access

Sellers can view snapshots of their own products and profiles.
Administrators can view snapshots of any seller's data.
Customers can view snapshots indirectly through order records.
Snapshots are preserved even after the source entity is deleted.

## SellerProfile Operations

Each seller has a profile that displays their shop name, shop description, and logo image to customers. Sellers can edit their shop name to change their store's identity on the platform. Sellers can update their shop description to provide information about their products and services. Sellers can change their shop logo image to refresh their brand appearance. Every edit to the shop profile creates a snapshot that preserves the previous state for dispute resolution. Customers can view seller profiles when browsing products or reviewing orders to see shop information and reputation.

### ### Shop Name Management

Sellers can create their shop profile with a shop name during seller registration. The shop name serves as the primary identifier for the seller on the platform and appears in product listings, order confirmations, and customer communications. Sellers can modify their shop name to update their brand identity or rebrand their store. The shop name must be unique across the platform—no two sellers can use the same name. When a seller changes their shop name, the old name is immediately replaced by the new name in all active listings and future orders. Customers browsing products see the current shop name in product listings and on the product detail page. The shop name is a required field and cannot be empty.

### ### Shop Description Editing

Sellers can create an initial shop description that explains their business, product range, and value proposition to customers. The shop description helps customers understand what kind of products the seller offers and builds trust with potential buyers. Sellers can edit their shop description at any time to update their business information. Changes to the shop description are immediately visible to customers who view the seller profile. The description field accepts text content and is used to display shop information in a readable format.

### ### Logo Image Updates

Sellers can upload a logo image that represents their shop brand identity. The logo appears on the seller profile page and is included in order snapshots for historical record. Sellers can replace their logo image when they update their branding or design a new logo. When a seller uploads a new logo, it replaces the previous logo in the active profile view. The logo image is used as a visual identifier in product listings, order documents, and customer communications. Sellers can remove their logo image if they prefer not to display branding. Image changes to the shop profile are captured in edit snapshots for historical tracking.

### ### Seller Profile Visibility

Customers can view seller profiles when browsing products to see shop information and seller reputation. The seller profile page displays the shop name, shop description, and logo image to customers. Customers can access the seller profile by clicking on the shop name link from product listing pages or product detail pages. The seller profile shows current shop information that customers can use to evaluate the seller before making a purchase decision. Profile information helps customers build trust and make informed purchasing decisions based on seller reputation and brand identity. The seller profile page is accessible to customers browsing the platform.

### ### Profile Edit Snapshots

Every time a seller edits their shop profile, a snapshot is automatically created to preserve the previous state. Snapshots capture the complete profile information including shop name, shop description, and logo image at the time of each change. Snapshots record the exact timestamp when the change was made and the values before and after the modification. Snapshots are immutable and cannot be modified or deleted once created. Both the seller and administrators can view the modification history to see how the shop profile has changed over time.

## Category Operations

Products are organized into categories to help customers browse and find items easily. Categories can have subcategories but only one level of nesting is allowed. Administrators exclusively create and manage all categories and subcategories on the platform. Each category has a name and description that helps customers understand what products it contains. Customers can browse the complete list of all available categories on the platform. Customers can view products within any specific category to narrow their shopping search. Categories enable structured product organization throughout the shopping mall.

### Category Creation by Administrators

Administrators can create new categories on the platform.
Each category must have a name and description.
Categories are created to organize products for customer browsing.
Administrators specify the category name and description when creating.
The category is immediately available for product assignment after creation.

### Subcategory Organization

Categories can have subcategories to create a hierarchical structure.
Only one level of nesting is allowed - subcategories cannot have their own subcategories.
When creating a subcategory, administrators select a parent category from the existing list.
The parent-child relationship is established during subcategory creation.
Subcategories inherit the one-level nesting limit from their parent categories.

### Category Management by Administrators

Administrators can edit existing category names and descriptions.
Any category edit creates a snapshot to preserve the previous state.
Administrators can view snapshots of all categories on the platform.
When a category is edited, customers immediately see the updated information.
Administrators can delete categories from the platform.

### Category Deletion Process

Administrators can delete categories from the system.
When a category is deleted, all products in that category become uncategorized.
Uncategorized products remain visible but cannot be browsed by category.
Administrators may need to reassign products to new categories after deletion.
Category deletion is irreversible for the category structure itself.

### Category Listing View

Customers can view a complete list of all categories on the platform.
The category list displays category names for browsing.
Categories are organized by hierarchy (parent categories and subcategories).
Customers can navigate through the category list to find products.
The category list is paginated if there are many categories.
Administrators can view the complete category list with all subcategories.

### Products Within Category

Customers can view all products within any specific category.
When viewing a category, the system shows products assigned to that category or its subcategories.
Each product displays its main image, name, base price, seller shop name, and average rating.
Customers can navigate from a category to view individual product details.
Categories enable customers to browse products by category and subcategory hierarchy.

### Category Navigation Structure

Categories form a navigation structure for product discovery.
Customers can browse from parent categories to subcategories.
The category hierarchy helps customers narrow their product search.
Administrators design the category structure for optimal customer navigation.
Category names and descriptions guide customer browsing behavior.

## Product Operations

Sellers can create products by providing a name, description, category selection, and base price. Each product belongs to the seller who created it and appears in their product management area. Sellers can edit their products to update information, and each edit creates a snapshot preserving the previous state. Sellers can delete their own products only if there are no pending order items with paid or shipped status and no pending cancellation or refund requests. When a product is deleted, all its variants and inventory records are also removed. Deleted products no longer appear in customer search results or category listings. Sellers can view snapshots of their own products for historical reference. Administrators can view snapshots of any product on the platform. Even after product deletion, snapshots are preserved for dispute resolution and business records.

### Product Creation

Sellers can create new products by providing a name, description, category selection (including subcategories), and base price. Each product automatically belongs to the seller who created it and appears in their product management area. The product must have a valid name, description, category, and base price to be created. Products must have at least one variant to be available for purchase.

### Product Editing Workflow

Sellers can edit their own products to update the name, description, category, base price, images, or variants. Each edit creates a snapshot that preserves the previous state of the product. Sellers cannot edit products they do not own. Administrators can view products created by any seller and can delete products that violate platform policies.

### Edit Snapshot Preservation

Every product edit automatically creates a snapshot that records when the change was made, what fields were changed, and the values before and after the modification. Product snapshots include all product fields (name, description, category, base price, images) and snapshots of all variants at that moment. Snapshots are immutable and cannot be deleted. They can be viewed by the product owner and administrators for dispute resolution.

### Product Deletion Restrictions

Sellers can delete their own products only if there are no pending order items with paid or shipped status for any variant of the product and no pending cancellation or refund requests for any variant. When a product is deleted, all its variants and inventory records are also removed. Deleting a product does not delete snapshots—they are preserved even after product deletion.

### Product Removal from Listings

Deleted products no longer appear in customer-visible product listings. Products marked as unavailable (no variants or out of stock) are visible but cannot be added to cart. When a product is deleted by the seller, it is automatically removed from all customer wishlists.

### Variant and Product Deletion

When a seller deletes a product, all its variants are deleted automatically along with the inventory records. Variants can only be deleted if there are no pending order items with paid or shipped status for that specific variant and no pending cancellation or refund requests for that variant. A product must have at least one variant to be purchasable.

### Product Snapshot Viewing

Sellers can view snapshots of their own products to see the history of changes. Administrators can view snapshots of any product on the platform for oversight purposes. Snapshots show the complete state of the product including all variants at the time of each change.

### Administrative Product Oversight

Administrators can view all products on the platform regardless of ownership. Administrators can view snapshots of any product for dispute resolution. Administrators can delete any product for policy violations. Administrators have full oversight of product listings and can remove products that violate platform policies.

### Product Listing Visibility

Sellers own their created products and control their visibility through edit and delete operations. Products are visible to all customers in product listings unless the seller deletes them or an administrator removes them. Suspended sellers' products are hidden from customer-visible listings but remain viewable for existing order processing.

### Product Ownership and Management

Each product is owned by the seller who created it. Only the product owner can edit or delete their own products. Sellers can manage multiple products and view them in their product management area. Product ownership cannot be transferred to another seller.

## ProductVariant Operations

A single product can have multiple variants representing different combinations of options like color and size. Each variant has a unique SKU code, option values, optional price that can override the base price, and required stock quantity. Sellers can add variants to their products to offer different choices to customers. Sellers can edit variant information including SKU code, option values, and price, and each edit creates a snapshot. Sellers can delete variants only if there are no pending order items with paid or shipped status and no pending cancellation or refund requests for that variant. Every product must have at least one variant to be purchasable by customers. Products with no variants are still visible in search but are shown as unavailable for purchase. When a variant's stock reaches zero, it is displayed as out of stock and cannot be added to the shopping cart.

### Variant Creation

Sellers can create product variants when listing a product for sale. Each variant represents a specific combination of product options such as color, size, or material. To create a variant, the seller must provide a unique SKU code, define the option values for that variant, and set the initial stock quantity. The price may be set to match the base price or may override it with a specific value for that variant. If any required field is missing, the variant creation is rejected.

### SKU Code Assignment

Each product variant requires a unique SKU code that serves as its identifier. The SKU code must be unique across all variants on the platform. Sellers are responsible for creating SKU codes that are meaningful to their operations. The system validates that the SKU code is not already in use before accepting the variant. If a duplicate SKU code is detected, the variant creation is rejected. Once created, the SKU code cannot be changed through editing; sellers must create a new variant if the SKU code needs to be different.

### Option Value Combinations

Variants are defined by combinations of option values that describe specific product choices. Common option types include color, size, material, and flavor, but the system accepts any option type that sellers define. Each variant can have multiple options, and the combination of options must be unique for each variant within the same product. When a customer views a product, all available option combinations are displayed so customers can select the variant that matches their needs.

### Variant Price Configuration

Each variant has a price that may either match the product base price or override it with a specific value. Variants with the same price as the base price display the base price. Variants with a different price display their specific price to customers. If a price override is provided, it must be a positive numeric value. Products with multiple variants that have different prices are shown with a price range on listing pages.

### Variant Edit Snapshots

Whenever a seller edits a variant's information, a snapshot is automatically created to record the previous state. Edited fields include SKU code, option values, price, and stock quantity. The snapshot preserves what was changed, when it was changed, and the values before and after. Both the seller and administrators can view these snapshots for dispute resolution and audit purposes. The snapshot is immutable and cannot be deleted once created.

### Variant Deletion Restrictions

Sellers can only delete variants that have no pending transactions. A variant cannot be deleted if it has any order items with paid or shipped status, any pending cancellation requests, or any pending refund requests. This restriction ensures that historical order records remain complete and accurate. When the seller attempts to delete a variant with pending transactions, the deletion is rejected with an explanation of which transactions are blocking deletion. Variants with no pending transactions can be deleted immediately.

### Minimum Variant Requirement

Every product must have at least one variant to be purchasable by customers. Products created without any variants are visible in search results and category listings but are shown as unavailable for purchase. The product must have at least one variant with stock quantity greater than zero to be considered available. If the last variant of a product is deleted or goes out of stock, the product becomes unavailable until a new variant is created or stock is restored.

### Out of Stock Display

When a variant's stock quantity reaches zero, the variant is displayed as out of stock to customers. Out of stock variants cannot be added to the shopping cart. On product detail pages, out of stock variants are clearly marked so customers are aware of their availability status. The variant remains visible in the variant list but is not selectable for purchase. When stock is restored, the variant becomes available for purchase immediately.

### Unavailable Product Variants

Products that have no variants are visible in search and category listings but are marked as unavailable for purchase. Products that have variants but all variants are out of stock are also marked as unavailable. Unavailable products do not appear in checkout or cannot have their variants added to cart. The product remains in the system with its information intact and can become available again when variants are added or stock is restored.

### Stock Quantity Management

Each variant maintains its own stock quantity that is managed through inventory records. The current stock level is tracked through inventory history records that record all stock movements. Sellers can add stock through restocking operations that create positive inventory records. Sellers can also subtract stock for adjustments or loss through operations that create negative inventory records. Stock management is tracked in separate inventory history records that are immutable and cannot be deleted.

## ProductImage Operations

Sellers can upload multiple images for each product to showcase items from different angles. Sellers can reorder the images so that the first image becomes the main thumbnail shown in listings. Sellers can delete images from their products if they are no longer needed or want to refresh the product presentation. All image changes are included in product snapshots to preserve the complete visual state at any point in time. The main thumbnail image serves as the primary visual representation of the product in search results and category pages. Customers see product images on the detail page showing all uploaded images in a gallery view.

### Image Upload Workflow

Sellers can upload multiple images for each product they create or edit. When uploading images, the first image uploaded becomes the main thumbnail image by default. Sellers can upload images at any time when creating a new product or when editing an existing product. The upload process allows sellers to select multiple image files and upload them in a single operation. Once uploaded, all images are immediately visible to customers on the product detail page. The system accepts image files and displays them to customers.

### Image Reordering

Sellers can reorder their product images to change the display sequence. The first image in the sequence serves as the main thumbnail image shown in search results and category listings. Sellers can change which image is the main thumbnail by reordering the image sequence. When an image is moved to the first position in the sequence, it becomes the main thumbnail. All other images shift to maintain their relative order. The updated order takes effect immediately and is reflected in all customer-facing views.

### Image Deletion Process

Sellers can delete any image from their product. Deleted images are immediately removed from the product and no longer visible to customers. If the main thumbnail image is deleted, the next image in the sequence automatically becomes the new main thumbnail. When a seller deletes an image, the product's visual presentation is updated immediately. Customers viewing the product before deletion will see the image removed when they refresh the page.

### Image Change Snapshots

Every image change creates a snapshot to record the visual state of the product at that point in time. Image upload creates a snapshot recording the added images and their display order. Image reordering creates a snapshot recording the previous and new image sequences. Image deletion creates a snapshot recording the removed image and its position in the previous sequence. Product snapshots can be viewed to review the history of visual changes. These snapshots are immutable and cannot be modified once created.

### Product Image Display

Customers see product images displayed in a gallery view on the product detail page showing all uploaded images. The main thumbnail image is shown in search results and category listings to provide a visual representation of the product. On the detail page, customers can view all images in sequence. The gallery displays images in the order specified by the seller's display sequence. The visual presentation allows customers to see the product images.

## InventoryRecord Operations

Each variant tracks its stock quantity through inventory history records that document every change. Sellers can add inventory to restock products by specifying a quantity and reason for the restock. Sellers can subtract inventory for adjustments or losses by specifying the quantity reduction and reason. When a customer places an order, the system automatically creates a negative inventory record for each variant purchased. When an order is cancelled or refunded, the system automatically creates a positive inventory record to restore stock. Sellers can view the complete inventory history for each variant showing all stock movements over time. Current stock quantity is calculated by summing all inventory records. When stock reaches zero, the variant is marked as out of stock and cannot be added to carts.

### Stock Quantity Tracking

Each product variant tracks its stock quantity through inventory history records. Stock quantity is calculated by summing all inventory records associated with the variant. Every change to stock quantity creates a new inventory record that documents the change. Inventory records are immutable and cannot be deleted or modified once created. The system maintains a complete history of all stock movements for each variant from creation to current state.

### Inventory Restocking Process

Sellers can add inventory to restock product variants by specifying a positive quantity and a reason for the restock. When a seller restocks inventory, the system creates a new inventory record with the positive quantity change. The restock quantity increases the current stock level for that variant. Sellers can view the restock record in the inventory history with the quantity added and the reason provided. Restocking can be performed on variants with any stock level, including those that are out of stock.

### Inventory Adjustment Entries

Sellers can subtract inventory to record adjustments or losses by specifying a negative quantity and a reason for the adjustment. When a seller makes an inventory adjustment, the system creates a new inventory record with the negative quantity change. The adjustment quantity decreases the current stock level for that variant. Sellers can view the adjustment record in the inventory history with the quantity removed and the reason provided.

### Order Inventory Deduction

When a customer successfully places an order, the system automatically creates negative inventory records for each purchased variant. The negative inventory record reflects the quantity of variants purchased in the order. Order placement deducts stock from the variant's available inventory. The inventory deduction occurs at the time of order creation, immediately after payment confirmation. If a variant's stock would go below zero due to the order, the order is rejected and the customer cannot complete the purchase.

### Cancellation Refund Restoration

When an order item is cancelled, the system automatically creates a positive inventory record to restore the stock quantity. When a refund is approved and processed, the system automatically creates a positive inventory record to restore the stock quantity. The restored quantity returns the variant's stock to the level before the order was placed. Cancellation and refund restoration occur immediately when the request is approved by the seller. Stock is only restored to the specific variant that was purchased, not to other variants of the same product.

### Inventory History Viewing

Sellers can view the complete inventory history for each of their product variants. The inventory history shows all stock movements in chronological order with timestamps. Each inventory record displays the quantity change, the reason for the change, and the timestamp of the change. Inventory history includes records from restocking, adjustments, order placements, cancellations, and refunds. Sellers can view the cumulative effect of all inventory records on the current stock level. Inventory history cannot be deleted or modified once records are created.

### Current Stock Calculation

Current stock quantity for each variant is calculated by summing all inventory records associated with that variant. The calculation includes all positive and negative quantity changes from the time of variant creation. Current stock reflects the available inventory for that variant. The system calculates current stock when displaying stock information to users. Current stock is derived automatically and cannot be manually set or modified by any user.

### Zero Stock Out of Stock

When a variant's stock reaches zero, the system marks the variant as out of stock. Out of stock variants cannot be added to customer carts. Out of stock variants remain visible in search and category listings with an out of stock indicator. Out of stock variants can still be viewed on the product detail page with stock status displayed. Out of stock variants cannot be purchased until stock is restored through restocking.

### Inventory Reason Documentation

Every inventory record requires a reason to document why the stock change is occurring. Reasons are categorized as restock for adding inventory, adjustment for manual corrections, order for order deductions, cancellation for stock restoration on cancellation, and refund for stock restoration on refunds. Restock reasons can be freely entered by sellers describing the restock activity. Adjustment reasons can be freely entered by sellers describing the reason for the deduction. Order, cancellation, and refund reasons are automatically populated by the system. Reason documentation is required for all inventory operations and cannot be left blank.

### Variant Stock Management

Each product variant maintains its own independent stock quantity separate from other variants. Stock management operations are performed at the variant level, not at the product level. Different variants of the same product can have different stock levels simultaneously. A product with multiple variants can have some variants in stock while others are out of stock. Stock quantities for variants are managed through inventory records only, not through direct stock setting.

## Order Operations

Customers can place orders after successfully completing payment through the checkout process. An order contains one or more order items that may come from different sellers. Each order item represents a purchased product variant with a specific quantity. The overall order status is automatically derived from the status of its individual items. For example, if all items are delivered, the order status becomes delivered. If all items are cancelled, the order status becomes cancelled. Customers can view a paginated list of all their orders sorted by newest first. Each order in the list shows the order number, date, total price, and overall status. Customers can view full order details including items, shipping address, and shipment tracking information.

### Order Placement Workflow

Customers can place an order by selecting a shipping address and confirming items in their shopping cart.

When placing an order, customers must have a valid shipping address. If no address exists, the customer must add one before proceeding. The default shipping address is automatically selected if available.

Customers review an order summary before confirming the order. The summary displays all items with their prices, the selected shipping address, and the total price.

Unavailable items cannot be included in an order. If any item in the cart is unavailable (deleted or out of stock), the checkout process is blocked until the customer removes the item.

Payment is processed after the customer confirms the order. If payment fails, the order is not created and the customer can retry the checkout process.

Once payment succeeds, the order is created with all items in paid status. The items are then removed from the customer's cart.

### Order Creation After Payment

When payment succeeds, the system creates an order record with a unique order number.

Stock quantities are automatically decreased for each purchased variant. This ensures the inventory reflects the sale immediately.

Each purchased variant becomes an order item with paid status. An order item represents one product variant purchased with a specific quantity.

A snapshot of each purchased product is saved with the order item. The snapshot preserves the product name, description, and variant options at the time of purchase.

A snapshot of each seller's profile is saved with the order item. The snapshot preserves the shop name and logo at the time of purchase.

The order total price is calculated as the sum of all item prices multiplied by their quantities. The total is recorded at the time of order creation and does not change.

### Multiple Items Per Order

An order can contain items from multiple sellers. Each order item belongs to one seller based on the product seller.

If a customer buys multiple units of the same variant, it becomes one order item with a quantity greater than one.

Different sellers always ship their items separately. Each seller creates exactly one shipment containing their items from the order. Multiple shipments per seller are not allowed.

Customers can view which items belong to each seller in the order detail page. The order is displayed with items grouped by seller.

Each order item can be individually cancelled or refunded. Cancellation and refund operations apply to specific items, not the entire order.

### Order Status Derivation

The overall order status is automatically derived from the status of its individual order items.

If all items are paid, the order status is paid. This is the initial status after successful payment.

If any item is shipped and no items are delivered, the order status is shipped. Shipped status indicates that shipping has begun.

If all items are delivered, the order status is delivered. Delivery is confirmed by the customer or after the automatic confirmation period.

If all items are cancelled, the order status is cancelled. The order is fully cancelled when every item is cancelled.

If all items are refunded, the order status is refunded. The order is fully refunded when every item is refunded.

If items have mixed statuses (e.g., some delivered and some refunded), the order status is partially completed.

### Order History Viewing

Customers can view a list of all their orders in the order history page.

The order list is paginated to handle many orders efficiently. Only a subset of orders is displayed per page.

The order list is sorted by newest first. The most recently created orders appear at the top.

Each order in the list shows the order number, date, total price, and overall order status.

Customers can click on an order to view the full details of that order.

### Order Detail Information

The order detail page displays the list of items with product name, variant options, quantity, and price for each item.

Each order item shows its individual status: paid, shipped, delivered, cancelled, or refunded.

The shipping address is displayed on the order detail page. The address cannot be changed after the order is placed.

The order shows a list of shipments with tracking information for each shipment.

Each shipment displays which items are included in that shipment. This allows customers to see which seller is shipping which items.

Customers can confirm delivery for each shipment individually. Delivery confirmation applies to all items in that shipment.

### Order Summary Display

During checkout, customers see an order summary that lists all items with their prices and quantities.

The order summary shows the total price of all items. This is the final price the customer will pay.

The shipping address is displayed in the order summary. Customers can change the address before confirming the order.

If a variant's stock is less than the cart quantity, a warning is shown in the order summary.

The order summary is displayed before the customer confirms and places the order. Customers must review the summary to proceed.

After the order is created, the same order summary information is shown on the order detail page for reference.

### Customer Order Management

Customers can view their order history and manage their orders from the order management interface.

Customers can request cancellation for individual order items with paid status. Cancellation requests can only be made before items are shipped.

Customers can request refunds for individual order items with delivered status. Refund requests can only be made within seven days of delivery.

When customers request cancellation or refund, they must provide a reason as text input.

Customers can view the status of their cancellation and refund requests. The seller responds with approval or rejection.

Customers cannot modify the shipping address after the order is created. The address is locked at order placement.

## OrderItem Operations

Each order item has its own individual status independent of other items in the same order. Item statuses include paid, shipped, delivered, cancelled, and refunded. Item statuses determine the overall order status based on their combinations. If all items are paid, the order status is paid. If any item is shipped and none are delivered, the order status is shipped. Each order item can be individually cancelled or refunded by the customer. Cancellation is only possible for items with paid status that have not been shipped yet. Refunds can only be requested for items with delivered status within seven days of delivery. When all items in an order are cancelled, the entire order status becomes cancelled. When all items are refunded, the order status becomes refunded.

### Item Status Management

Each order item has its own individual status independent from other items in the same order.

Order item statuses include: paid, shipped, delivered, cancelled, and refunded.

An item with paid status indicates payment has been completed and the item is waiting for the seller to ship.

An item with shipped status indicates the seller has shipped the item and tracking information has been entered.

An item with delivered status indicates the item has been received by the customer.

An item with cancelled status indicates the customer or administrator cancelled the item before it was shipped.

An item with refunded status indicates the item has been refunded to the customer.

Items cannot transition directly between any statuses. Transitions follow specific rules based on business logic.

A paid item can transition to shipped when the seller ships it, or to cancelled when the customer or administrator cancels it.

A shipped item can transition to delivered when the customer confirms delivery or after 14 days.

A delivered item can transition to refunded when the customer requests a refund and the seller approves it.

A cancelled or refunded item is final and cannot be changed back to another status.

The system maintains the current status of each item at all times.

Customers can view the current status of each item in their order history.

Sellers can view the current status of items they need to process.

Administrators can view the current status of all items on the platform.

### Individual Item Cancellation

Customers can request cancellation of individual items with paid status.

Cancellation is requested per item, not per entire order.

Customers must provide a reason for the cancellation request in text form.

Cancellation requests can only be made for items with paid status that have not been shipped yet.

Cancellation requests cannot be made for items with shipped, delivered, cancelled, or refunded status.

When a cancellation request is submitted, the request status becomes pending.

The seller of the cancelled item receives notification of the cancellation request.

The seller can approve the cancellation request, which cancels the item and processes a refund.

The seller can reject the cancellation request, which keeps the item in paid status.

When the seller approves or rejects the request, a snapshot of the request state is created and preserved.

If the seller approves the cancellation, the item status changes to cancelled and the refund is processed.

Stock quantities are restored to the variant inventory when an item is cancelled.

If all items in an order are cancelled, the overall order status becomes cancelled.

Remaining items in the order continue processing normally and are unaffected by individual cancellations.

Customers can view the status of their cancellation requests (pending, approved, rejected).

Customers can view the reason they provided for the cancellation request.

Administrators can force-cancel individual items with paid status on behalf of customers.

### Item Refund Requests

Customers can request a refund for individual items with delivered status.

Refund requests can only be made for items that have been delivered to the customer.

A refund request can only be made within seven days of the item being delivered.

Customers must provide a reason for the refund request in text form.

Refund requests cannot be made for items that are delivered but outside the seven-day window.

When a refund request is submitted, the request status becomes pending.

The seller of the refunded item receives notification of the refund request.

The seller can approve the refund request, which refunds the customer and changes item status.

The seller can reject the refund request, which keeps the item in delivered status.

When the seller approves or rejects the request, a snapshot of the request state is created and preserved.

If the seller approves the refund, the item status changes to refunded and the refund is processed.

Stock quantities are restored to the variant inventory when an item is refunded.

If all items in an order are refunded, the overall order status becomes refunded.

Remaining items in the order continue normally and are unaffected by individual refunds.

Customers can view the status of their refund requests (pending, approved, rejected).

Customers can view the reason they provided for the refund request.

Administrators can force-refund individual items on behalf of customers.

### Paid Item Shipping

Sellers can view order items with paid status that need to be shipped.

Sellers can select one or more items with paid status to include in a shipment.

Sellers can bundle multiple items into a single shipment from the same seller.

Sellers can ship items individually, creating separate shipments for each item.

Sellers must enter tracking information when creating a shipment.

Tracking information includes the carrier name and tracking number.

All items in the same shipment share the same tracking information.

When a shipment is created, all items in it change status to shipped.

Sellers can view which items are included in each shipment they create.

Customers can view tracking information for shipments containing their items.

Once items are shipped, they cannot be cancelled by the customer.

Items with shipped status cannot be refunded directly; customers must wait for delivery.

Sellers can view shipments containing their items and their tracking status.

The system prevents shipment creation for items that are not with paid status.

### Delivered Item Status

Customers can confirm delivery for each shipment in their order.

Delivery confirmation is per shipment, not per individual item.

When a customer confirms delivery, all items in that shipment change to delivered status.

If a customer does not confirm delivery, items automatically change to delivered status after 14 days from shipping.

The 14-day automatic delivery confirmation begins from the shipment creation date.

Items with delivered status can have reviews written by the customer.

Customers can only write one review per product per order after delivery.

Reviews can only be written for items with delivered status.

The delivery status allows customers to request refunds within seven days.

Customers can view the delivery date of each shipment.

Customers can view the tracking information for delivered shipments.

Items with delivered status are eligible for refund requests if within the seven-day window.

### Cancelled Item Processing

When an item is cancelled, its stock quantities are restored to the variant inventory.

The inventory restoration is recorded as a positive quantity change with reason.

The original product snapshot with the variant details is preserved with the order item.

The original seller profile snapshot is preserved with the order item.

The cancellation request snapshot with reason and approval/rejection is preserved.

The cancelled item cannot be reactivated or changed back to another status.

The cancelled item remains visible in the order history with cancelled status.

The overall order status updates based on the remaining item statuses.

If cancellation is the result of a customer request, the customer receives a refund.

If cancellation is forced by an administrator, the customer receives a refund.

The cancelled item is not included in any shipments or tracking information.

Sellers cannot ship items that have been cancelled.

The system tracks which items were cancelled and the reason for cancellation.

Cancelled items remain in the order for record-keeping purposes.

### Refunded Item Restoration

When an item is refunded, its stock quantities are restored to the variant inventory.

The inventory restoration is recorded as a positive quantity change with reason.

The original product snapshot with the variant details is preserved with the order item.

The original seller profile snapshot is preserved with the order item.

The refund request snapshot with reason and approval/rejection is preserved.

The refunded item cannot be changed back to another status.

The refunded item remains visible in the order history with refunded status.

The overall order status updates based on the remaining item statuses.

The refund is processed to the customer's original payment method.

The refunded item is not eligible for further refunds.

The system tracks which items were refunded and the reason for the refund.

Refunded items remain in the order for record-keeping purposes.

Customers can view the refund amount and processing date for refunded items.

### Mixed Item Statuses

An order can contain items with different statuses at the same time.

If some items are delivered and some are refunded, the order status becomes partially completed.

If some items are shipped and some are paid, the order status is shipped.

Mixed statuses occur when customers cancel or refund individual items while others continue normally.

The overall order status reflects the current state of all items.

Partially completed orders show their mixed status to both customers and sellers.

Sellers can process items with different statuses in the same order.

Customers can view each item's individual status in order details.

The order summary displays the overall status derived from item statuses.

Mixed item statuses do not prevent other items from being processed or shipped.

### Item Status Independence

Each order item has its own independent status separate from other items.

One item's status change does not affect the status of other items in the same order.

Items can have different statuses simultaneously within the same order.

Each item can be cancelled or refunded independently from other items.

Cancellation of one item does not cancel other items in the order.

Refund of one item does not refund other items in the order.

Shipping of one item does not require shipping other items.

Each item has its own shipment or can be bundled with other items.

Items from different sellers in the same order are independent.

Items from the same seller can be bundled but remain independent.

Each item maintains its own inventory records and snapshots.

The independence of items enables flexible order management.

Customers can take different actions on different items in the same order.

### Item Status Derivation

The overall order status is derived from the statuses of all items in the order.

If all items are paid, the order status is paid.

If any item is shipped and none are delivered, the order status is shipped.

If all items are delivered, the order status is delivered.

If all items are cancelled, the order status is cancelled.

If all items are refunded, the order status is refunded.

If items have mixed statuses (e.g., some delivered, some refunded), the order status is partially completed.

The order status automatically updates when any item status changes.

The system calculates the order status based on the current item statuses.

The order status provides a summary view of the entire order.

Customers can see the overall status and drill down to individual items.

Sellers see the overall status and can focus on items needing action.

Administrators can filter orders by their overall status.

The status derivation ensures consistent order status representation.

## Shipment Operations

A shipment is a package sent by a seller containing one or more order items from the same seller. Different sellers always ship their items separately in different shipments regardless of customer order. Sellers can choose to ship items individually or bundle multiple items into a single shipment. When creating a shipment, sellers enter tracking information including the carrier name and tracking number. All items in the same shipment share the same tracking information and shipping status. Customers can view tracking information for each shipment sent to them. Customers can confirm delivery for each shipment they receive. If the customer does not confirm delivery, items automatically change to delivered status after fourteen days from shipping.

### Shipment Creation by Seller

Sellers can create shipments for order items from their products that are in paid status.

Sellers can view order items assigned to their products within an order that require shipping.

When creating a shipment, sellers select one or more of their order items from a single order to include.

Each shipment is associated with the seller who owns the products in the shipment.

Order items cannot be included in a shipment if they are not in paid status.

Order items already included in another shipment cannot be added to a new shipment.

Once an order item is included in a shipment, its status changes to shipped.

An order item can only be shipped once; it cannot be shipped multiple times.

Order items from different sellers cannot be combined into the same shipment.

Order items must belong to the seller creating the shipment.

### Tracking Information Entry

When creating a shipment, sellers can optionally enter a tracking carrier name.

When creating a shipment, sellers can optionally enter a tracking number.

Tracking carrier name is entered as free text by the seller.

Tracking number is entered as free text by the seller.

The system does not validate the format of tracking numbers.

The system does not validate the format of carrier names.

Customers viewing the shipment can see the tracking carrier name if provided.

Customers viewing the shipment can see the tracking number if provided.

### Shipment Per Seller Per Order

Each seller can create one shipment per order for their order items.

Order items from the same seller within an order are grouped into a single shipment.

A seller creates one shipment for all their order items from a given order.

Different sellers can ship separately from the same customer order.

The system enforces that only one shipment exists per seller per order.

Once a shipment is created, its associated order items cannot be transferred to another shipment.

### Item Bundling in Shipment

Sellers can bundle multiple order items into a single shipment.

Order items included in a shipment share the same tracking information.

All items in the same shipment use the same tracking carrier and tracking number.

Sellers choose which order items to include when creating the shipment.

There is no minimum or maximum limit on the number of items per shipment.

Items in a shipment are grouped by the seller.

Each item in a shipment maintains its individual status but shares shipment-level tracking.

### Shipment Tracking Visibility

Customers can view tracking information for shipments assigned to their orders.

Customers can view the tracking carrier name for each shipment if provided.

Customers can view the tracking number for each shipment if provided.

Customers can see which order items are included in each shipment.

Customers can view the shipment creation date for each shipment.

Customers can see the overall status of each shipment.

Sellers can view tracking information for shipments they created.

Administrators can view all shipment tracking information across the platform.

### Delivery Confirmation Process

Customers can confirm delivery for each shipment they receive.

Delivery confirmation is per shipment, not per individual order item.

When a customer confirms delivery, all order items in that shipment change to delivered status.

Customers can confirm delivery for a shipment that has not yet been marked as delivered.

A customer can confirm delivery once per shipment.

Once delivery is confirmed, the shipment status is marked as delivered.

Delivery confirmation is a customer-initiated action, not system-initiated.

The system records when the customer confirmed delivery.

Customers can view the delivery confirmation date for each shipment.

### Shipment Status Update

When a shipment is created, all items in the shipment change to shipped status.

When a customer confirms delivery, the shipment changes to delivered status.

A shipment can transition from shipped to delivered status.

A shipment cannot transition back to shipped status after being delivered.

Shipment status reflects the collective status of all items within it.

Order item status is synchronized with shipment status during transitions.

## WishlistItem Operations

Customers can add products to their personal wishlist for later purchase consideration. The wishlist shows products rather than specific variants, allowing flexible selection at checkout. Customers can view their complete wishlist paginated across multiple pages. Customers can remove products from their wishlist when they no longer want to track them. If a seller deletes a product from the platform, it is automatically removed from all customer wishlists. The wishlist helps customers save products they are interested in for future purchase decisions.

### Product Addition to Wishlist

Customers can add products to their personal wishlist for later purchase consideration.

Each wishlist entry represents a product, not a specific variant. When adding a product to the wishlist, the system records the product and its current main image for display purposes.

If the same product is already in the customer's wishlist, no duplicate entry is created. The existing wishlist entry is retained.

A customer can add any product from the platform to their wishlist, regardless of whether they have previously purchased the product.

The wishlist is persistent across sessions. Once added, a product remains in the customer's wishlist until they remove it or the product is deleted by the seller.

A wishlist entry is created immediately upon successful addition. The system confirms the addition to the customer.

### Viewing Paginated Wishlist

Customers can view their complete wishlist through a paginated interface.

Each page displays up to 20 products from the customer's wishlist.

Navigation controls allow customers to move between pages (first, previous, next, last).

The wishlist page shows a product count and current page number (e.g., "Page 2 of 5").

Products in the wishlist display: main image, product name, base price (or price range if variants have different prices), seller shop name, and average rating.

If a wishlist contains more than 20 products, customers can navigate to view additional pages.

When viewing the wishlist, products that have been deleted by sellers are automatically excluded from the list.

The wishlist view sorts products by date added, with most recently added products appearing first.

### Removing Products from Wishlist

Customers can remove products from their wishlist at any time.

Removal is performed on a per-product basis. Each product has an associated removal option in the wishlist view.

When a customer initiates removal, the system removes that product entry from their wishlist immediately.

The system confirms the removal to the customer.

A product can be added back to the wishlist after removal by repeating the addition process.

Removing a product from the wishlist does not affect any order history or other customer data.

The customer can remove all products from their wishlist, resulting in an empty wishlist state.

### Wishlist Product Display

Each product in the wishlist displays key information to help customers track their items.

The main product image is shown as a thumbnail.

The product name is displayed in full.

If the product has variants with different prices, a price range is shown (e.g., "$10 - $25"). If all variants have the same price, the single price is shown.

The seller's current shop name is displayed.

If the product has received reviews, the average rating is shown.

If a variant is out of stock, the product displays an "out of stock" indicator.

The date when the product was added to the wishlist is displayed for reference.

A customer can click on a wishlist product to view the full product detail page.

### Automatic Removal on Product Deletion

When a seller deletes a product from the platform, all wishlist entries containing that product are automatically removed.

This automatic removal occurs across all customer wishlists that contain the deleted product.

Customers are not notified when a product is automatically removed from their wishlist due to deletion.

The deletion of a product triggers an immediate update to all affected wishlists.

After automatic removal, the product no longer appears in any customer's wishlist.

If a customer had previously purchased the product, their purchase history remains intact and unaffected by wishlist removal.

The system preserves the product record for order history purposes even after the product is deleted from listings.

### Wishlist Product Tracking

Wishlist entries track which products a customer is interested in purchasing later.

Each wishlist entry maintains a timestamp of when the product was added.

Customers can track multiple products simultaneously, with no limit on the number of products that can be added.

The wishlist helps customers remember products they want to consider for future purchase decisions.

Wishlist entries remain visible until explicitly removed or automatically removed due to product deletion.

Customers can reference their wishlist to remind themselves of products they plan to purchase.

The wishlist serves as a personal tracking mechanism for purchase consideration.

### Saved Product Consideration

The wishlist enables customers to save products for future purchase consideration.

Customers add products to the wishlist when they want to remember them but are not ready to purchase immediately.

The wishlist allows customers to build a collection of products they are interested in across different sellers.

Customers can review their wishlist periodically to evaluate their saved products.

Products can be moved from wishlist to cart for purchase at the customer's convenience.

The wishlist provides a convenient way to curate a personal collection of products for potential purchase.

### Wishlist Item Management

Customers have full control over their wishlist items through a simple management interface.

Customers can manage multiple products in their wishlist simultaneously.

Product removal is the only management operation available for wishlist items.

Customers can manage their wishlist from any page of the paginated list.

Each wishlist item has its own management controls separate from other items.

Wishlist management actions take effect immediately without requiring confirmation.

### Wishlist Persistence

Wishlist entries are persisted in the system and remain available across all customer sessions.

Customers do not need to re-add products to their wishlist after logging in again.

Wishlist data persists even if the customer closes their browser or logs out.

Wishlist entries are associated with the customer account, not with a specific device or session.

If a customer deletes their account, their wishlist is also deleted as part of account deletion.

The wishlist maintains its state across browser sessions and devices.

### Product Save for Later

The wishlist functionality provides a "save for later" capability for product consideration.

Customers use the wishlist to save products they want to purchase at a future time.

The wishlist serves as a bridge between initial product discovery and eventual purchase.

Products in the wishlist can be purchased later by adding them to the shopping cart.

The wishlist allows customers to defer purchase decisions without losing track of interested products.

This save-for-later capability helps customers manage their shopping decisions over time.

## Review Operations

Customers can write a review for products they have purchased after the item status is delivered. Each customer can write one review per product per order they placed. Reviews include a rating from one to five stars as a required field and optional text content. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews to update their feedback, and each edit creates a snapshot. Customers can delete their own reviews, but the review is preserved in snapshots for business records. The product's average rating is calculated from all non-deleted reviews on the product page.

### Review Creation

Customers can write a review for a product only after they have purchased the product and the order item status is delivered.

Customers can write one review per product per order they placed.

Each review includes a star rating from one to five stars as a required field.

Customers can optionally include text content in their review.

A customer can only write a review for a product they have actually purchased through the platform.

If the customer has not purchased the product, the review creation request is rejected.

If the order item status is not delivered, the review creation request is rejected.

If the customer has already written a review for this product in this order, the request is rejected.

Once a review is created, it is visible to other customers browsing the product.

The review is automatically associated with the creating customer and the purchased product.

The review is associated with the specific order in which the product was purchased.

A review cannot be created until at least seven days after delivery for refund eligibility tracking.

The system automatically validates that the rating is within the one to five star range before accepting the review.

### Review Editing and Deletion

Customers can edit their own reviews to update their feedback after submission.

Every review edit creates a snapshot that records when the change was made and what was changed.

The snapshot includes the previous rating, previous text content, and the updated values.

Customers can delete their own reviews after submission.

When a review is deleted, the review record is preserved in snapshots for business records.

The snapshot is immutable and cannot be deleted even after the original review is removed.

After deletion, the review is no longer visible on the product detail page.

After deletion, the review is excluded from average rating calculations.

A customer can edit a review multiple times, and each edit creates a new snapshot.

Only the customer who wrote the review can edit or delete it.

Other customers cannot edit or delete reviews written by different customers.

Sellers cannot delete or edit reviews written for their products.

The snapshot allows administrators to review the complete history of a review's changes.

### Review Display and Rating Calculation

Reviews are displayed on the product detail page where customers can view all feedback.

Reviews are sorted by newest first, with the most recent reviews appearing at the top.

Each review display includes the rating stars and optional text content.

If a reviewer's account has been deleted, their display name is shown as deleted user.

Reviews from deleted user accounts are still displayed but show deleted user instead of the actual name.

The product's average rating is calculated from all non-deleted reviews on the product page.

Deleted reviews are excluded from average rating calculations entirely.

If a product has no reviews, no average rating is displayed.

The average rating is updated immediately when new reviews are added or deleted.

The system displays the total review count alongside the average rating.

Customers can sort reviews by newest first when viewing the product detail page.

Only non-deleted reviews contribute to the product's displayed average rating.

Reviews are read-only for customers who did not write them.

Customers can view the review history snapshots only if they are the owner or administrator.


## Snapshot Operations

Every time editable data is modified, a snapshot is created to preserve the previous state for dispute resolution. Snapshots are immutable and cannot be deleted once created. Snapshots record when the change was made, what was changed, and the values before and after. Snapshots are created for product edits, product variant edits, seller profile edits, order items, reviews, and cancellation or refund requests. Sellers and customers can view snapshots of their own data for reference and verification. Administrators can view snapshots of any data on the platform for oversight purposes. Snapshots are preserved even after the original item is deleted from the system.

### Automatic Snapshot Creation on Edit

Every time editable data is modified, a snapshot is automatically created to preserve the previous state. This applies to product edits, product variant edits, seller profile edits, review edits, cancellation request responses, and refund request responses. The snapshot captures the complete state of the data at the moment the change occurs, including all relevant fields and values. Edit operations that trigger snapshots include: changing a product name or description, modifying a variant's SKU code or price, updating a seller's shop name or description, editing a review's rating or text content, and a seller approving or rejecting a cancellation or refund request.

### Immutable Snapshot Records

Snapshots are immutable records that cannot be modified or deleted once created. This immutability ensures the integrity of historical records for dispute resolution and audit purposes. Once a snapshot exists, it preserves the exact values as they were at the time of the change, including timestamps, field values, and change context. Neither system administrators nor data owners can alter or remove snapshots. This permanent preservation guarantees that historical evidence remains available indefinitely for review, dispute resolution, and verification purposes.

### Change History Preservation

Snapshots record complete change history by capturing when the change occurred, what was changed, and the specific values before and after the modification. Each snapshot includes the entity type, entity identifier, timestamp of the change, the change type (created, updated, deleted), previous values in structured format, and new values in structured format. This comprehensive recording enables complete reconstruction of any item's history, allowing users to trace the evolution of products, profiles, and other editable data over time.

### Owner Access to Snapshots

Data owners can view snapshots of their own data to verify changes and maintain records. Product sellers can view snapshots of their products, product variants, and seller profiles to track modifications and maintain accurate records. Product customers can view snapshots of their reviews, cancellation requests, and refund requests to maintain personal records of their activity. Review authors can view snapshots of their review edits to preserve the complete text history. Snapshots provide transparency and allow users to verify the accuracy of their records and maintain confidence in the system's data integrity.

### Administrative Snapshot Access

System administrators have access to view snapshots of any data on the platform for oversight purposes. Regular administrators can view snapshots of products, orders, cancellation requests, and refund requests across all sellers and customers. Super administrators have full visibility into all snapshots regardless of data ownership. This administrative access enables oversight, audit, and dispute resolution by providing complete historical records of all platform activity. Administrators can review snapshots to understand the evolution of problematic items and verify the accuracy of platform records.

### Snapshot Preservation After Deletion

Snapshots are preserved even after the original item is deleted from the system. When a product, product variant, or seller profile is deleted, all associated snapshots remain intact and accessible. This ensures that historical records of deleted items are available for dispute resolution, order verification, and audit purposes. Order items retain snapshots of the product and seller profile as they existed at the time of purchase, even if those products are later deleted. This permanent preservation of historical data supports legal compliance and dispute resolution requirements.

### Complete State Snapshots

Every snapshot captures the complete state of the entity at the moment of change, including all field values, relationships, and contextual information. Product snapshots include the product name, description, category, base price, all images with their order, and all variants with their SKU codes, option values, prices, and stock quantities. Order item snapshots preserve the product name, description, variant options, price, and seller shop name and logo as they existed at the time of purchase. This complete state preservation ensures that the exact conditions at any point in time can be reconstructed from historical records.

### Edit Timestamp Recording

Snapshots record the precise timestamp of when the change was made, down to the exact moment of the edit. This timestamp is included in the snapshot record and cannot be modified. The timestamp enables chronological reconstruction of changes, supports dispute resolution by establishing the exact sequence of events, and provides accountability for all modifications. Users can view the timestamp to understand when specific changes occurred, which is particularly important for dispute resolution and verification purposes.

## CancellationRequest Operations

Customers can request cancellation for individual order items that have paid status but have not been shipped yet. Cancellation requests require the customer to provide a reason text explaining why they want the item cancelled. The seller of that specific item can approve or reject the cancellation request. When the seller responds to the request, a snapshot of the request state is created for records. If the cancellation is approved, that item is cancelled and a refund is processed for that item only. Cancelled items restore their stock quantities through inventory records. The remaining items in the order continue processing normally even if one item is cancelled. If all items in an order are cancelled, the entire order status becomes cancelled.

### Cancellation Request Creation

Customers can request cancellation for individual order items that have a status of paid and have not yet been shipped.

Customers must provide a reason text when submitting a cancellation request, explaining why they want the item cancelled.

Customers can only request cancellation for items with paid status; items with shipped, delivered, cancelled, or refunded status cannot be cancelled.

Cancellation requests are submitted per order item, not for the entire order; customers can cancel some items while keeping others active.

The cancellation request includes the order item reference, the reason text, and the requesting customer reference.

Once submitted, the cancellation request is in pending status awaiting the seller's response.

Customers cannot modify a cancellation request after submission; they must wait for the seller's response.

If a customer requests cancellation for an item that has been shipped, the request is rejected immediately.

If a customer requests cancellation for an item with a different status (not paid), the request is rejected immediately.

### Seller Approval Workflow

Sellers can view all pending cancellation requests for order items of their products.

Sellers can view the cancellation request details including the customer, order item, quantity, and reason text.

Sellers can approve a cancellation request, which processes the cancellation for that item.

Sellers can reject a cancellation request if they choose not to cancel the item.

When a seller approves or rejects a cancellation request, a snapshot of the request state is created for record keeping.

Sellers must respond to cancellation requests within a reasonable timeframe; the system tracks response timing.

Sellers can view the list of their own products' cancellation requests, filtering by pending status.

Sellers can only approve or reject cancellation requests for items belonging to their products; they cannot modify other sellers' items.

After a seller responds (approve or reject), the cancellation request status changes from pending to the corresponding status.

### Approved Cancellation Processing

When a cancellation request is approved, the order item status changes from paid to cancelled.

The cancellation only affects the specific item; other items in the same order continue processing normally.

A refund is processed for the cancelled item only, not for other items in the order.

The refund amount equals the price of the cancelled item multiplied by its quantity.

The refund is processed through the external payment gateway used for the original purchase.

Refund processing follows the payment gateway's refund workflow and timing.

The customer receives notification of the cancellation approval and refund processing.

The seller is notified of the cancellation approval and the associated refund.

Cancelled items remain visible in the order history with their cancelled status for record purposes.

### Cancellation Snapshot Creation

When a seller responds to a cancellation request (approve or reject), a snapshot of the request state is created.

The snapshot records when the seller responded to the cancellation request.

The snapshot records what change occurred (approval or rejection of the request).

The snapshot preserves the request details at the time of the seller's response.

The snapshot is immutable and cannot be deleted or modified after creation.

Both the customer and seller can view the snapshot of the cancellation request.

Administrators can view snapshots of any cancellation request on the platform.

Snapshots of cancellation requests are preserved even after the cancellation is fully processed.

The snapshot includes the reason text provided by the customer and the seller's response.

Snapshot creation for cancellation requests supports dispute resolution and audit purposes.

### Item Stock Restoration

When a cancellation request is approved and the item is cancelled, stock quantities are restored for that variant.

An inventory record is created with a positive quantity change to represent the restocking.

The inventory record includes the quantity restored, the reason (order cancellation), and the timestamp of restoration.

Stock restoration occurs immediately upon approval of the cancellation request.

The restored stock becomes available for future purchases.

The inventory history maintains a complete record of all stock changes including cancellations.

Sellers can view the inventory history and see the restoration record from cancelled items.

If the cancelled item variant has no variants, stock restoration is not applicable.

Stock restoration ensures accurate inventory levels across the platform.

### Partial Order Cancellation

Customers can request cancellation for individual items within an order while keeping other items active.

Partial cancellation does not affect other items in the same order; they continue their normal processing flow.

Each cancelled item is processed independently with its own refund and stock restoration.

The remaining items in the order maintain their original order status and continue toward shipment.

Different sellers in the same order can be affected independently; one seller's cancellation does not impact other sellers' items.

If only some items from a single seller's shipment are cancelled, that shipment continues with remaining items.

Partial cancellation requests are tracked separately for each order item involved.

The order continues processing as long as at least one item remains active.

### Order Status Update on Cancellation

The overall order status is derived from the statuses of all items in that order.

If all items in an order are cancelled, the entire order status becomes cancelled.

If only some items in an order are cancelled, the order status remains based on the remaining active items.

An order with mixed statuses (e.g., some delivered, some cancelled) has a status of partially completed.

If an order has items with different statuses (paid, shipped, cancelled), the overall order status reflects the dominant active state.

Order status changes are automatic and occur immediately when the last active item is cancelled.

The order history shows the updated status after partial cancellations.

Customers can see the order status and individual item statuses separately in the order details.

The order status reflects the current state of all items at any point in time.

### Refund Processing for Cancelled Items

When a cancellation request is approved, a refund is processed for the cancelled item.

The refund amount is calculated as the item price multiplied by the quantity cancelled.

Refunds are processed only for items with approved cancellation requests; rejected requests do not trigger refunds.

The refund follows the external payment gateway's refund policy and timeline.

Customers receive confirmation of the refund through the system.

Refunds do not affect other items in the same order; each cancelled item is refunded independently.

The refund transaction is recorded in the system for audit purposes.

If the original payment method is no longer available, the refund follows the payment gateway's handling policy.

Refunds are processed even if the cancellation occurs after the order has partially shipped.

## RefundRequest Operations

Customers can request a refund for individual order items that have delivered status. Refund requests must be submitted within seven days of the item being delivered. Customers must provide a reason text explaining why they want the item refunded. The seller of that specific item can approve or reject the refund request. When the seller responds to the request, a snapshot of the request state is created. If the refund is approved, that item is refunded to the customer. Refunded items restore their stock quantities through inventory records. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded.

### Refund Request Submission

Customers can request a refund for individual order items that have been delivered. Each order item can only have one active refund request at a time. If a refund request already exists for an item, a new request cannot be submitted. Refunds can only be requested for items with delivered status; items with other statuses cannot have refund requests submitted. The customer must provide a reason text when submitting a refund request. The reason text explains why the customer is requesting the refund. The reason text is required and cannot be empty.

### Seven Day Refund Window

A refund request can only be submitted within seven days of the item being delivered. The seven day window is counted from the delivery date of that specific item. Once the seven day period expires, no refund request can be submitted for that item. Customers can view the delivery date for each item in their order history. The system automatically prevents refund request submission after the seven day window expires. The system displays the deadline for refund submission to customers.

### Refund Reason Submission

Customers must provide a reason when submitting a refund request. The reason is entered as text and can include detailed explanation. The reason text has no character limit. The reason is stored as part of the refund request. Sellers can view the customer's reason when reviewing the refund request. The reason cannot be modified after the refund request is submitted. If the customer wants to change the reason, they must submit a new refund request.

### Seller Refund Approval Process

The seller of the specific order item receives the refund request. Only the seller can approve or reject their item's refund request. Customers cannot approve their own refund requests. When a seller responds to a refund request, a snapshot of the request state is created. The snapshot records when the seller responded, the action taken, and the state of the request at that time. The seller approval process is separate for each order item. If an order has multiple items, the seller responds to each item's refund request individually. The seller can approve or reject each refund request independently.

### Approved Refund Processing

When a seller approves a refund request, the item is marked as refunded. The customer receives a refund for the approved item. The refund amount equals the price of the item at the time of purchase, as recorded in the order item snapshot. Only the approved item is refunded; other items in the same order are not affected. The refund processing updates the item status to refunded. The customer can view the refund status for each item in their order history. The system notifies the customer when their refund is approved.

### Item Stock Restoration on Refund

When a refund request is approved, the stock quantity for the variant is restored. The stock restoration happens automatically through an inventory record. The inventory record contains a positive quantity change equal to the item quantity. The inventory record includes the reason as refund. The timestamp of the inventory record matches the refund approval timestamp. The restored stock becomes available for future purchases immediately. Sellers can view the restored stock in their inventory records.

### Partial Order Refund

Refunds are handled per order item, not for the entire order. A customer can request a refund for one or more items in an order, but not the entire order at once. If an order has multiple items and one is refunded, the remaining items continue processing normally. The non-refunded items retain their original status and are unaffected by the refund. Each item in the order has its own refund status. Partial refunds allow customers to keep some items while refunding others. The refund process for each item is independent.

### Order Status Update on Refund

When all items in an order are refunded, the order status becomes refunded. If only some items are refunded, the order status becomes partially completed. The order status reflects the combined state of all its items. Mixed item statuses (some delivered, some refunded, some pending) result in partially completed order status. The order status is automatically updated when an item's status changes to refunded. Customers can view the updated order status in their order history. The refund of one item does not affect the status of other items in the order.

### Refund Snapshot Creation

Every time a seller responds to a refund request, a snapshot of the request state is created. The snapshot records the action taken (approved or rejected) and the timestamp. The snapshot is immutable and cannot be deleted. The snapshot can be viewed by the customer and administrators. The snapshot is created regardless of whether the request is approved or rejected. Snapshots provide a complete record of the refund request history. Administrators can view snapshots of any refund request on the platform.

### Customer Refund Processing Experience

Customers can view a list of all their refund requests in their account. Each refund request shows its current status (pending, approved, or rejected). Customers can view the reason they submitted for each refund request. Customers can view the seller's response status for each refund request. If rejected, customers can view the rejection reason from the snapshot. Customers can track the progress of their refund requests. The refund request list is sorted by most recent first. Customers cannot submit multiple refund requests for the same item simultaneously.

### Rejected Refund Handling

When a seller rejects a refund request, the rejection reason can be documented in a snapshot. The customer can view the rejection status for their refund request. Rejected refund requests cannot be resubmitted for the same item. The rejected status remains on the request record. The customer receives notification when their refund request is rejected. The seller's rejection decision is final for that specific refund request. The item remains in delivered status if the refund request is rejected.

### Refund Request List and Filtering

Customers can view all their refund requests in a paginated list. The list shows the item name, variant, request date, and current status. Customers can filter refund requests by status (pending, approved, rejected). The default sort order is by request date, newest first. The list shows all items from the customer's order history. Customers can view details of any refund request from the list. Pagination limits the number of refund requests displayed per page.

## SellerApprovalRequest Operations

Sellers submit a registration request to become a seller on the platform. The request includes the seller's email, password, and other required information. Administrators review seller registration requests and can approve or reject them. When rejecting a request, administrators must provide a reason explaining why the application was rejected. Rejected sellers can view the rejection reason and submit a new registration request after addressing the issues. Pending sellers can view their current approval status showing they are waiting for review. Approved sellers can start listing products and selling on the platform. The approval workflow ensures only qualified sellers can operate on the platform.

### Seller Registration Request Submission

Sellers can submit a registration request to become a seller on the platform.

The registration request includes the seller's email address and password. The email address must be unique and not already registered by another account.

When a seller submits a registration request, their account is created with a pending approval status. The seller can log in but cannot list products or sell items until the account is approved by an administrator.

If the email address is already registered, the registration request is rejected and the seller is notified.

The registration request is automatically associated with the seller account and includes the date and time of submission.

### Admin Approval Workflow

Administrators can view a list of all pending seller registration requests.

Administrators review each registration request and decide whether to approve or reject it.

When approving a request, the seller account status changes to approved and the seller can immediately start listing products and selling on the platform.

When rejecting a request, administrators must provide a rejection reason in text format. The rejection reason explains why the application was denied and helps the seller understand what improvements are needed.

The rejection reason is required and cannot be left blank when rejecting a request.

After a request is approved or rejected, a snapshot of the decision is created to preserve the approval history for dispute resolution.

### Pending Approval Status Viewing

Sellers can view the current approval status of their registration request.

The approval status can be in one of three states: pending, approved, or rejected.

When the status is pending, the seller account exists but cannot list products or process sales. The seller can view their status at any time to check when the decision is made.

When the status is approved, the seller can immediately start using all seller features including creating products and managing orders.

When the status is rejected, the seller can view the rejection reason provided by the administrator and understand what improvements are needed.

The approval status is visible to the seller who submitted the request and to administrators.

### Rejection Reason and Resubmission

When a seller registration request is rejected, the seller can view the rejection reason provided by the administrator.

The rejection reason is displayed in full text format, allowing the seller to understand what issues led to the rejection.

After viewing the rejection reason, the seller can submit a new registration request. The resubmitted request goes through the same approval workflow as the initial request.

The seller can modify their information and submit a new request after addressing the issues mentioned in the rejection reason.

The previous rejection record is preserved and remains visible to the seller for reference.

There is no limit to the number of times a seller can resubmit a registration request after rejection.

### Approval Status and Seller Onboarding

When a seller registration request is approved, the seller account becomes active for selling.

The seller can immediately create products, set up their seller profile, and start listing items for sale on the platform.

Approved sellers can view their shop profile and begin building their seller presence on the platform.

The approval status changes from pending to approved, and this change is recorded in the approval history.

Once approved, the seller gains access to all seller dashboard features including order management, inventory tracking, and seller analytics.

The approval enables the seller to participate in the marketplace and begin transacting with customers.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Customer Error Scenarios

When a customer attempts to register with an email that is already in use, the system displays a message indicating the email is taken and does not create a duplicate account. Login attempts with incorrect password credentials are rejected without revealing whether the email exists. Customers attempting to change their password must provide their current password correctly; the system rejects requests with an invalid current password. When a customer deletes their account, the system verifies the password before proceeding. After account deletion, the customer cannot log in again, but their order history and reviews remain visible in the system with their display name replaced by 'deleted user'.

### Duplicate Email Registration Rejection

When a customer attempts to register with an email address that is already associated with an existing account, the system displays an error message indicating the email is already in use. The registration request is rejected and no new account is created. The error message does not specify whether the email belongs to a customer or seller account, only that it is already registered.

Customers can view the registration form and attempt to submit their details. Upon submission, the system validates whether the email exists in the database. If a matching email is found, the registration process terminates with a clear error notification and the customer is prompted to use a different email address or log in with existing credentials.

### Invalid Login Credentials Handling

When a customer attempts to log in with incorrect credentials, the system rejects the login attempt and displays a generic error message. The system does not reveal whether the email address exists in the system or whether the password is incorrect. The same error message is shown for all login failures regardless of the cause.

Login attempts include providing an email and password combination. The system validates the credentials against stored account data. If either the email is not found or the password does not match, the system returns a uniform failure notification without distinguishing between the two scenarios. This prevents information disclosure about valid account emails.

After a failed login attempt, the customer may retry with different credentials. There is no specified limit on login attempts documented by the user requirements.

### Password Change with Current Password Verification

When a customer requests to change their password, the system requires them to provide their current password as verification. The customer must enter their email address, current password, and the new password they wish to set.

The system validates the current password before accepting the change request. If the current password is incorrect or does not match the stored password, the password change is rejected and an error is displayed. The customer's password remains unchanged and they continue using their existing password.

Only after successful current password verification does the system update the password to the new value. The new password becomes active immediately and can be used for subsequent login attempts.

### Account Deletion Password Confirmation

Before a customer account can be deleted, the system requires password confirmation. The customer must provide their current password to verify their identity before the deletion process proceeds.

When initiating account deletion, the system prompts the customer to enter their password. If the password provided does not match the stored password, the deletion request is rejected and the account remains active. No changes are made to the account or its data.

If the password is verified successfully, the system proceeds with the account deletion process, which removes the customer's profile information while preserving order history and reviews.

### Deleted User Display Name Replacement

After a customer deletes their account, their display name is replaced with the marker 'deleted user' throughout the system. This replacement occurs in all locations where the customer's name appears, including order histories, review listings, and transaction records.

The replacement marker is applied to all historical data associated with the deleted customer. When viewing past orders, purchase records, or product reviews, the system displays 'deleted user' instead of the customer's original display name. This ensures the customer's personal information is not retained while preserving the integrity of transaction and review data.

The replacement occurs immediately upon account deletion completion and is permanent. The original display name cannot be restored even if the account deletion is reversed.

### Order History Preservation After Account Deletion

When a customer deletes their account, all their order history and purchase records are preserved in the system. The orders remain accessible to administrators and sellers for legal and record-keeping purposes. The customer themselves cannot access their orders after deletion.

Order details including items purchased, quantities, prices, and transaction dates are retained indefinitely. The order status, shipping information, and tracking records are also preserved. This preservation applies to all orders regardless of their current status (paid, shipped, delivered, cancelled, or refunded).

The order preservation is independent of account deletion. Even after the customer account is removed, the orders continue to exist in the system with the 'deleted user' marker replacing the customer's name.

### Review Preservation With Deleted User Marker

When a customer deletes their account, all their product reviews remain visible in the system but are associated with the marker 'deleted user' instead of the original customer name. The review content, ratings, and timestamps are preserved.

The reviews continue to appear on product detail pages and contribute to the product's average rating calculation (unless deleted by the customer before account deletion). The text content of the review is retained exactly as written by the customer.

Other customers can still read and see the reviews from deleted accounts. The reviews are not deleted or hidden, only the customer's identity is anonymized by replacing their name with 'deleted user'.

## CustomerProfile Error Scenarios

Customers editing their display name encounter errors if they attempt to save the same name as currently set without changes. The system allows phone number updates but validates that the new format is appropriate for a phone number. When a customer tries to edit their profile while another session is active, the system processes the update but may show a warning about session conflicts. Profile updates are persisted immediately without requiring additional confirmation steps from the user.

### Duplicate Display Name Edit Rejection

When a customer attempts to update their display name, the system validates that the new display name differs from the current display name.

If the customer submits a display name that matches their existing display name exactly, the system rejects the update request.

The customer receives an error message indicating that no changes were detected in the display name.

The system does not create a snapshot when the display name remains unchanged.

The update request is rejected immediately without saving any changes.

This validation prevents unnecessary snapshot creation and maintains data integrity.

Customers must enter a genuinely different display name to trigger an update.

### Phone Number Format Validation

When a customer submits a new phone number, the system validates the phone number format.

The system accepts phone numbers that follow a recognized phone number format.

Invalid phone number formats are rejected with an appropriate error message.

The validation occurs during the profile update submission process.

Customers cannot save a profile with an improperly formatted phone number.

The system displays guidance on acceptable phone number formats when validation fails.

Phone number updates require valid format before the profile can be saved.

The validation ensures phone numbers can be used for customer communication.

### Concurrent Session Profile Edit Warning

When a customer has multiple active sessions and attempts to edit their profile, the system processes the update.

The customer may receive a warning about potential session conflicts during the profile edit.

The system allows the profile update to proceed despite multiple active sessions.

All active sessions reflect the updated profile information after the update completes.

The system does not block profile edits when concurrent sessions exist.

The warning helps customers understand their session state without preventing updates.

Customers can continue editing their profile while maintaining active sessions on different devices.

### Display Name Unchanged Validation

The system validates whether a display name update request contains actual changes.

A display name update request that does not change the display name is rejected.

The system compares the submitted display name with the current stored display name.

If the values are identical, the update is rejected before processing.

This validation prevents unnecessary database operations and snapshot creation.

Customers are informed that their display name has not changed.

The system allows the customer to proceed with other profile fields or cancel the update.

Only meaningful changes to the display name trigger profile update processing.

### Phone Number Update Edge Cases

When a customer updates their phone number to an empty value, the system handles the update based on whether the phone number field is required.

If the phone number field is optional, customers can clear their phone number and save the profile.

If the phone number field is required, the system rejects updates that remove the phone number.

Customers receive an error message if they attempt to save a profile without a required phone number.

The system preserves the previous phone number when an update fails validation.

Special characters and formatting in phone numbers are normalized according to the validation rules.

Customers can update their phone number to the same value as the current phone number without triggering an error, unlike display name updates.

The system accepts phone number format variations that represent the same number.

### Profile Edit Without Confirmation Requirement

When a customer edits their profile information, the system saves the changes immediately without requiring additional confirmation.

Customers do not need to confirm profile updates through a separate step or dialog.

The profile update is persisted to the database as soon as the validation passes.

This approach streamlines the profile editing workflow for customers.

Customers can make multiple profile edits in succession without repeated confirmations.

The system provides visual feedback to confirm the profile was saved successfully.

The immediate persistence ensures customers do not lose their changes due to session expiration.

## Address Error Scenarios

Customers attempting to set a default shipping address can only have one default address at a time; setting a new default automatically unsets the previous default. When deleting an address that is currently marked as default, the customer must designate another address as the new default or the deletion is rejected. Invalid address formats such as missing required fields cause the address creation or update to fail with appropriate error messages. The system does not allow deleting addresses that are associated with pending orders until those orders are completed.

### Single Default Address Constraint

A customer can have only one default shipping address at any given time. When a customer marks an address as default, any previously set default address is automatically unset. The system enforces this constraint to ensure clear delivery destination identification during checkout. Attempting to set multiple addresses as default will cause the request to fail.

### Default Address Unset on New Default Selection

When a customer selects a new default shipping address, the system immediately unsets the previous default address without additional confirmation. This automatic transition ensures that only one address remains marked as default at all times. The previous default address remains in the customer's address list but is no longer designated as default.

### Default Address Deletion with Reassignment Requirement

When a customer attempts to delete an address currently marked as default, the customer must select an alternative address to become the new default before the deletion can proceed. If no alternative address is selected, the deletion request is rejected. The customer is prompted to choose a replacement default address or to cancel the deletion operation.

### Missing Required Address Field Validation

Address creation or update requires all mandatory fields to be provided. Each address must include recipient name, phone number, street address, city, state/province, postal code, and country. If any required field is missing or left blank, the system rejects the address creation or update and displays an error message indicating which field is missing. The customer must provide all required fields before the address can be saved.

### Address Deletion Blocked by Pending Orders

An address cannot be deleted while it is associated with any pending orders. Orders with paid, shipped, or cancelled status are considered pending for this purpose. The customer must wait until all orders associated with the address are completed or fully cancelled before deleting that address. The system checks for order associations and blocks deletion if pending orders exist.

### Invalid Address Format Rejection

The system validates address formats against expected patterns before accepting the address. Invalid formats such as incorrect postal code structures, improperly formatted phone numbers, or street addresses with invalid characters are rejected. The system provides specific error messages indicating which field has an invalid format and what format is expected. Customers must correct the format errors before the address can be saved.

### Address Update with Existing Associations

Address updates are permitted for addresses that have been used in completed orders. Updated addresses do not affect historical order records which preserve the original address at the time of purchase. New orders placed after an address update will use the updated address information. The customer can modify all address fields except for associations with completed historical orders.

### Cannot Delete Associated Pending Order Address

When an address is linked to an order that is still in progress, the address cannot be deleted regardless of the order status. This includes orders with paid status (waiting for shipping), shipped status (in transit), and cancelled status (awaiting refund processing). The system identifies orders associated with the address and prevents deletion until all associated orders are resolved. Customers must complete or cancel all orders before removing the address.

## Seller Error Scenarios

Seller account deletion requests are rejected if the seller has any pending orders in paid or shipped status. Account deletion is also rejected when there are pending cancellation or refund requests. Rejected seller registrations display the specific rejection reason provided by administrators. If a seller account is rejected, the seller can submit a new registration request with the corrected information. Suspended sellers can continue processing existing orders but cannot create new products or edit existing ones.

### Seller Account Deletion with Pending Orders

A seller can submit a request to delete their seller account.

The deletion request is rejected if the seller has any order items with status "paid" or "shipped".

When the request is rejected, the system displays a message indicating that pending orders prevent account deletion.

The seller can view which order items are blocking the deletion.

Order items with status "paid" indicate completed payment but not yet shipped.

Order items with status "shipped" indicate items that have been sent to customers.

Once all pending orders are completed or cancelled, the seller can submit a new deletion request.

Pending orders include orders in paid status waiting for shipping and orders in shipped status awaiting delivery confirmation.

The system checks order status at the time of the deletion request submission.

### Seller Account Deletion with Pending Cancellation Requests

A seller can submit a request to delete their seller account.

The deletion request is rejected if the seller has any pending cancellation requests for their order items.

Pending cancellation requests are those with status "pending" awaiting seller response.

When the request is rejected, the system displays the number of pending cancellation requests blocking deletion.

The seller can view details of each pending cancellation request.

Pending cancellation requests must be resolved before account deletion.

Cancellation requests are resolved when the seller approves or rejects them.

An approved cancellation request cancels the order item and processes a refund.

A rejected cancellation request maintains the original order item status.

The system checks cancellation request status at the time of the deletion request submission.

### Seller Account Deletion with Pending Refund Requests

A seller can submit a request to delete their seller account.

The deletion request is rejected if the seller has any pending refund requests for their order items.

Pending refund requests are those with status "pending" awaiting seller response.

When the request is rejected, the system displays the number of pending refund requests blocking deletion.

The seller can view details of each pending refund request.

Pending refund requests must be resolved before account deletion.

Refund requests are resolved when the seller approves or rejects them.

An approved refund request processes a refund for the order item.

A rejected refund request maintains the original order item status.

The system checks refund request status at the time of the deletion request submission.

### Seller Registration Rejection Reason Display

When a seller submits a registration request, administrators can review and approve or reject it.

If administrators reject the registration, they must provide a rejection reason.

The rejection reason is displayed to the seller in their dashboard.

The seller can view the rejection reason immediately after being notified of rejection.

The rejection reason includes specific details about why the registration was not approved.

The rejection reason remains visible in the seller's account history.

The rejection reason is preserved even if the seller submits a new registration request.

### Seller Registration Re-Submission Capability

When a seller registration request is rejected, the seller can submit a new registration request.

The seller can submit a new request using the same email address.

The new registration request is processed independently of the previous rejected request.

The seller should address the issues mentioned in the rejection reason before resubmitting.

Each new registration request is assigned a new unique identifier.

The system tracks the history of all registration attempts for the seller.

There is no limit to the number of re-submission attempts.

The previous rejection reason is visible when submitting a new request to help the seller understand what to address.

### Suspended Seller Product Creation Restriction

Suspended sellers cannot create new products on the platform.

When a suspended seller attempts to create a product, the system rejects the request.

The system displays a message indicating that the seller account is suspended.

The suspended seller cannot access the product creation interface.

Existing products remain visible to the suspended seller but cannot be modified.

Suspended sellers can still process existing orders for shipping and cancellations.

The suspension prevents new commercial activity while allowing fulfillment of current commitments.

Suspension takes effect immediately upon administrator action.

### Suspended Seller Product Edit Restriction

Suspended sellers cannot edit their existing products.

When a suspended seller attempts to edit a product, the system rejects the request.

The system displays a message indicating that the seller account is suspended.

The suspended seller cannot access the product editing interface.

Product information including name, description, and price cannot be modified.

Product variants cannot be added, edited, or deleted by suspended sellers.

Product images cannot be uploaded, reordered, or deleted by suspended sellers.

Suspension prevents any modifications to product listings while maintaining order fulfillment capability.

### Seller Approval Status Visibility

Sellers can view their current registration approval status at all times.

Available approval statuses are "pending", "approved", and "rejected".

The status is displayed in the seller dashboard upon login.

When status is "pending", the seller knows their request is under review.

When status is "approved", the seller can immediately begin selling products.

When status is "rejected", the seller can view the rejection reason and resubmit.

The approval status is visible without requiring administrator interaction.

Status changes are reflected in real-time without delay.

### Pending Seller Registration Rejection Scenario

When a seller submits a registration request, their status becomes "pending".

The seller cannot access seller features while status is pending.

The seller can only view their profile and pending status.

Sellers cannot create products or manage orders while pending.

Administrators can view all pending registration requests in a list.

Administrators can approve or reject pending requests at their discretion.

When rejected, the seller's status changes to "rejected".

The seller receives notification of the status change.

Pending status allows the seller to see that their request is being processed.

## SellerProfile Error Scenarios

When a seller edits their shop name, description, or logo, the previous values are preserved in a snapshot immediately. Customers viewing seller profiles always see the most recent snapshot state. There is no conflict prevention mechanism since edits are allowed and snapshots are created automatically. Sellers cannot revert to previous snapshot states; they must create new edits to restore desired values.

### Seller Profile Edit Creates Snapshot Automatically

Whenever a seller edits their profile information, the system automatically creates a snapshot to preserve the previous state.

The snapshot is created immediately when the edit is submitted and saved. This includes changes to shop name, shop description, or logo image.

The snapshot records when the change was made, what field was changed, and the values before and after the change.

All profile edits trigger snapshot creation without requiring any additional action from the seller.

### Previous Shop Name Preservation in Snapshot

When a seller changes their shop name, the previous shop name is preserved in the snapshot.

The snapshot stores the shop name value before the edit was applied.

This preserved shop name remains in the snapshot even after the new shop name is displayed to customers.

The previous shop name can be viewed by the seller and administrators for dispute resolution and historical reference.

Even if the product is deleted from listings, the snapshot preserves the shop name that existed at the time of purchase or review.

### Shop Description Edit Snapshot Creation

Whenever a seller edits their shop description, the system creates a snapshot with the previous description text.

The snapshot captures the complete description text before the edit.

The new description replaces the previous one for customer viewing.

The snapshot is immutable and cannot be deleted or modified.

The previous description is accessible to the seller and administrators for reference.

### Logo Update Snapshot Creation

When a seller updates their logo image, a snapshot is created preserving the previous logo image URL.

The snapshot records the image URL before the change.

The new logo image replaces the previous one for customer viewing.

The snapshot preserves the previous logo even after the update is complete.

The previous logo image can be viewed in snapshots by the seller and administrators.

### Immediate Snapshot on Profile Modification

Snapshot creation occurs immediately when profile modification is submitted.

There is no delay between the edit submission and snapshot creation.

The snapshot is created before the new values are persisted to the profile.

This ensures the previous state is always captured before any changes are applied.

Customers viewing the profile immediately see the updated values, while snapshots preserve the previous state.

### Seller Profile Snapshot Immutability

Once a seller profile snapshot is created, it cannot be modified or deleted.

The snapshot remains permanently in the system.

Only the seller owner and administrators can view snapshots.

The snapshot records cannot be altered, even by administrators.

This immutability ensures reliable dispute resolution with unchangeable records.

### No Profile Edit Conflict Prevention

The system does not prevent profile edits from being applied.

There is no lock or conflict prevention mechanism on profile edits.

Multiple edits can be submitted and all will create their own snapshots.

Edits are applied sequentially as they are submitted.

The most recent edit is always displayed to customers.

### Cannot Revert to Previous Snapshot State

Sellers cannot revert their profile to a previous snapshot state.

If a seller wants to restore a previous value, they must create a new edit with that value.

The system does not provide a one-click revert to snapshot functionality.

The seller must manually enter the desired previous value and submit a new edit.

This creates a new snapshot of the restored value.

## Category Error Scenarios

Only administrators can create, edit, or delete categories; regular customers encounter permission errors if they attempt these operations. When a category is deleted, products within that category become uncategorized and must be reassigned. Subcategories cannot exceed one level of nesting from the parent category. Attempting to create a subcategory under an existing subcategory is rejected by the system. Administrators can edit category names and descriptions without affecting existing products assigned to that category.

### Administrator-Only Category Management

Only administrators can create categories or subcategories on the platform. Regular customers and sellers who attempt to create categories receive a permission error. Only administrators can edit existing categories, including names and descriptions. Regular customers and sellers who attempt to edit categories receive a permission error. Only administrators can delete categories. Regular customers and sellers who attempt to delete categories receive a permission error. All category management operations require administrator authentication and authorization. The system validates that the requesting user has administrator privileges before allowing category operations.

### Category Deletion Product Impact

When a category is deleted, all products within that category become uncategorized. Products that become uncategorized are not removed from the platform and remain visible to customers. Products without a category are displayed in a separate uncategorized section or require category reassignment. The deletion of a category does not delete the products themselves. All products affected by category deletion retain their other attributes including name, description, price, variants, and images. Administrators must review products that become uncategorized after category deletion. Products in deleted categories are flagged for category reassignment but continue to exist on the platform.

### Category Product Reassignment Requirement

Products that become uncategorized due to category deletion require reassignment to a valid category. Administrators must manually reassign these products to maintain proper catalog organization. Products cannot be purchased or appear in category browsing without a valid category assignment. The reassignment process involves selecting a new category and updating all affected products. Reassignment is required before the products can be properly discovered by customers through category navigation. Reassignment preserves all existing product data including variants, images, and review ratings.

### One-Level Subcategory Nesting Limit

Categories can have subcategories, but subcategories cannot have their own subcategories. Each category can directly contain product items or subcategories, but subcategories can only contain products, not further subcategories. The maximum nesting depth from the root category is two levels: root category and subcategory. When browsing categories, customers see only the first level of categories. Subcategories are displayed as children of their parent category but cannot have nested children. The system enforces this limit to maintain a simple category hierarchy structure. Products can only be assigned to categories at the first or second level of the hierarchy.

### Nested Subcategory Creation Rejection

When attempting to create a subcategory under an existing subcategory, the creation is rejected with a permission error. The system identifies subcategories and prevents further nesting beyond the allowed one-level limit. Attempting to create a subcategory under a subcategory results in an error message indicating the operation is not permitted. The rejection prevents users from accidentally creating deeper category hierarchies. Administrators cannot override this limitation for subcategory creation. The system validates the parent category type before allowing subcategory creation and rejects if the parent is already a subcategory.

### Category Edit Does Not Affect Existing Products

When an administrator edits a category name, all products in that category remain unchanged and retain their association. Product data including names, descriptions, prices, and variants are not modified when the parent category is edited. When an administrator edits a category description, it only affects the category display, not any product information. The relationship between products and categories remains intact despite category name or description changes. Customers browsing products in the edited category see the updated category information but product details remain the same. Edit operations on categories do not trigger any product data modifications or snapshots.

### Category Name Change Without Product Impact

Changing a category name does not affect how products are displayed in product listings. The category name is used for navigation and browsing but is not stored as part of product records. Products retain their original category assignment even when the category name is modified. Customer reviews and ratings associated with products are not affected by category name changes. Search results that include category information continue to work correctly after category name changes. The historical category name is preserved in the category edit snapshot for audit purposes.

### Subcategory Under Subcategory Restriction

The system prevents creation of subcategories under existing subcategories. A subcategory can only be created under a root category, not under another subcategory. When a user attempts to assign a subcategory as a parent for a new subcategory, the operation is rejected. The rejection is accompanied by an error message explaining that subcategories cannot have child subcategories. This restriction is enforced at the validation layer before any database changes are made. The category hierarchy must always maintain a two-level maximum depth with root categories at the top.

## Product Error Scenarios

Product deletion is rejected if any variant has pending order items with paid or shipped status. Products without any variants are visible in search results but displayed as unavailable for purchase. Every product edit automatically creates a snapshot preserving the previous state. Deleted products are removed from all search results and category listings immediately. Administrators can delete any product on the platform for policy violations, and the deleted products leave behind snapshots for audit purposes.

### Product Deletion with Pending Orders

A product cannot be deleted if any of its variants have order items with paid or shipped status. The deletion request is rejected when the system detects any pending order items in paid or shipped status for any variant of the product. A seller can only delete a product when all order items for all its variants have statuses other than paid or shipped. The system checks all variants of the product, not just the main product record. If any variant has a pending order item with paid status, the entire product deletion is blocked. If any variant has a pending order item with shipped status, the entire product deletion is blocked. The rejection message indicates that the product has pending orders that must be completed before deletion.

### Product Without Variants Display

Products without any variants are visible in search results and category listings. Products without variants are displayed as unavailable for purchase. The product detail page shows that the product has no available variants. Customers can view the product information but cannot add it to their cart. The unavailable status is clearly indicated on the product listing card. Products without variants can still be searched and found by customers. The system allows product creation without variants for informational purposes.

### Product Edit Snapshot Creation

Every product edit automatically creates a snapshot preserving the previous state. The snapshot records when the change was made by the product owner. The snapshot captures all product fields including name, description, category, base price, and images. The snapshot includes snapshots of all variants at the moment of the edit. The snapshot preserves option values, SKU codes, prices, and stock quantities for all variants. Product owners can view the complete history of snapshots for their products. Administrators can view snapshots of any product on the platform. Snapshots are created regardless of whether the edit is approved or submitted.

### Deleted Product Removal from Listings

Deleted products are removed from all search results immediately. Deleted products are removed from all category listings immediately. Deleted products no longer appear in any browsing or filtering operations. The removal from search results happens instantaneously after deletion confirmation. The removal from category listings happens instantaneously after deletion confirmation. Search results do not include any products that have been deleted. Category pages do not display any products that have been deleted. The system ensures deleted products cannot be accessed through search or category navigation.

### Product Deletion Snapshot Preservation

Deleted products leave behind snapshots for audit purposes. Snapshots are preserved even after the product is deleted from the active listings. Snapshots remain accessible to the product owner and administrators. Snapshots contain the complete state of the product at the time of deletion. Product snapshots can be viewed after the product has been deleted. Snapshot records are immutable and cannot be deleted. Administrators can view snapshots of any deleted product on the platform. Snapshot records serve as audit trail for policy violations.

### Administrator Product Deletion

Administrators can delete any product on the platform for policy violations. The deletion applies to products created by any seller. Administrator deletion bypasses the normal restrictions for seller-initiated deletion. Deleted products are removed from all search results and category listings. Product snapshots are preserved for administrative audit purposes. The administrator deletion includes all product variants. The administrator deletion includes all product images. Product deletion by administrators is logged for compliance tracking.

## ProductVariant Error Scenarios

Variant deletion is rejected if there are pending order items with paid or shipped status for that specific variant. Products cannot be purchased without at least one variant; the system requires adding variants before enabling purchase capability. Every variant edit creates a snapshot of the previous state including SKU code, option values, price, and stock. When stock reaches zero, the variant is marked as out of stock and cannot be added to cart. Out of stock variants remain visible in product detail pages but show unavailable status to customers.

### Variant Deletion With Pending Orders

A variant cannot be deleted if there are pending order items with paid status for that specific variant. A variant cannot be deleted if there are pending order items with shipped status for that specific variant. When deletion is attempted with pending orders, the request is rejected with an appropriate message. Existing paid or shipped order items remain accessible even after deletion attempt rejection.

### Variant Deletion With Pending Cancellation

A variant cannot be deleted if there are pending cancellation requests for that specific variant. Cancellation requests must be resolved before the variant can be deleted. When a pending cancellation exists, deletion requests are rejected until the cancellation is approved or rejected.

### Variant Deletion With Pending Refund

A variant cannot be deleted if there are pending refund requests for that specific variant. Refund requests must be resolved before the variant can be deleted. When a pending refund exists, deletion requests are rejected until the refund is approved or rejected.

### Variant Edit Snapshot Creation

Every variant edit automatically creates a snapshot of the previous state. Snapshots record the SKU code, option values, price, and stock quantity before the change. Snapshots are immutable and cannot be deleted. Snapshots can be viewed by the seller who owns the variant.

### Stock Zero Out of Stock Display

When a variant's stock quantity reaches zero, the variant is marked as out of stock. Out of stock variants are displayed as unavailable in product listings and detail pages. The variant remains visible in the product detail page but shows out of stock status. Customers can view out of stock variants but cannot add them to cart.

### Out of Stock Variant Cart Addition

Out of stock variants cannot be added to the shopping cart. When a customer attempts to add an out of stock variant, the request is rejected. The cart shows a warning if a variant's stock is less than the requested cart quantity. Customers are informed that the variant is out of stock before attempting addition.

### Product Purchase Variant Requirement

A product must have at least one variant to be purchasable. Products with no variants are visible in search results but shown as unavailable. Customers cannot add products without variants to their cart. Sellers must add at least one variant before the product becomes available for purchase.

### Unavailable Product Display

Products with no variants or all variants out of stock are displayed as unavailable. Unavailable products show a status indicator in search results and category listings. Unavailable products still display in product detail pages with unavailable status shown to customers.

## ProductImage Error Scenarios

Sellers can reorder product images, and the first image becomes the main thumbnail shown in listings. Image changes are automatically included in product snapshots when products are edited. Sellers can delete images from products at any time without restriction. If the main image is deleted, the next image in display order becomes the new main image. Multiple images can be uploaded for a single product without quantity restrictions.

### Image Upload

Sellers can upload multiple images for each product they create or edit.
There is no limit on the number of images that can be uploaded per product.
Each uploaded image is assigned a display order number.
The first image in display order becomes the main thumbnail shown in search results and category listings.
Sellers can specify the display order when uploading images.
Each image is associated with the product that owns it.
Uploaded images are immediately available for viewing on the product detail page.

### Image Reordering

Sellers can reorder images by changing their display order numbers.
Reordering images does not require creating a product snapshot on its own.
When an image is moved, all other images' display order numbers are adjusted accordingly.
The new display order takes effect immediately for all product listings.
Sellers can change the main thumbnail image by reordering to put that image first.
Image reordering is only allowed on products that the seller owns.

### Main Thumbnail Selection

The first image in display order is automatically used as the main thumbnail.
Product listings show only the main thumbnail image to save space.
Customers view the main thumbnail when browsing search results and category pages.
Changing which image is first in display order changes which image is the main thumbnail.
Every product must have at least one image to display on listings.
If a product has no images, it is not shown in search or category listings.
The main thumbnail is visible when customers add the product to their wishlist.

### Image Deletion

Sellers can delete any image from their product at any time.
Image deletion does not require approval from administrators.
Deleted images are immediately removed from the product detail page.
Deleted images are also removed from search and category listings.
There are no restrictions on when images can be deleted.
A product can have images deleted until no images remain.
If all images are deleted, the product no longer appears in listings.

### Main Image Reassignment

If the main image is deleted, the next image in display order becomes the new main image.
Automatic reassignment happens immediately when the deletion occurs.
No manual action is required to assign a new main image.
If no images remain after deletion, the product has no main image.
Reassignment preserves the relative order of remaining images.
This ensures products always have a visible thumbnail when they have images.

### Display Priority

Image display order determines the priority of which image is shown first.
Higher priority images appear in more prominent positions in listings.
The first image has the highest priority and is always the main thumbnail.
Customers primarily see the highest priority image when browsing.
Image order does not affect which image appears on the product detail page.
All images are accessible from the product detail page regardless of order.

### Image Changes in Snapshots

When a product is edited, all image changes are included in the product snapshot.
Image snapshots record: the image URLs, the display order, and the image deletion status.
Product snapshots preserve the complete state of all images at the time of the edit.
Image order changes are captured in snapshots when they occur during product edits.
Snapshots of images can be viewed by the product owner and administrators.
Deleted images are still visible in snapshots even after being removed from the product.

### Deleted Image Removal

Deleted images are permanently removed from the product and all listings.
Deleted images no longer appear in search results or category pages.
Deleted images cannot be recovered through the user interface.
Historical snapshots preserve the deleted images for audit purposes.
Administrators can view deleted images through product snapshots.
Deleted images are no longer accessible via direct URLs.

## InventoryRecord Error Scenarios

Inventory records are created automatically when orders are placed or cancelled, with positive or negative quantity changes based on the transaction. Sellers cannot manually delete inventory records; only system-generated records can be created for orders and adjustments. Stock calculations are derived from summing all inventory records, so incorrect initial data cannot be simply removed. When a variant runs out of stock, no new orders can be placed for that variant, but existing orders remain valid.

### Automatic Inventory Record on Order Placement

When an order is successfully placed, the system automatically creates inventory records for each variant in the order. Each inventory record contains a negative quantity change equal to the ordered quantity, the reason "order placement", and the current timestamp. The inventory record is created immediately after payment succeeds and before the order status changes to "paid". The stock quantity for each variant is decreased by the ordered amount, reflected in the inventory history. This ensures inventory accuracy from the moment payment is confirmed.

### Automatic Inventory Record on Order Cancellation

When an order item is cancelled, the system automatically creates a positive inventory record for the cancelled variant. The inventory record contains a positive quantity change equal to the cancelled quantity, the reason "order cancellation", and the current timestamp. The stock quantity for the variant is increased by the cancelled amount. The inventory record is created immediately when the cancellation is approved by the seller. This ensures stock availability is restored to customers when orders are cancelled. The restoration happens automatically without manual intervention from sellers.

### Positive Quantity Change for Restocking

Sellers can restock inventory by creating positive quantity changes. Each restocking action requires the seller to specify the quantity being added and provide a reason for the adjustment. The inventory record contains the positive quantity, the reason entered by the seller (e.g., "restock", "inventory correction", "return processing"), and the timestamp of the restocking action. The stock quantity is increased by the restocked amount. Restocking can be done at any time when the seller has access to the inventory management interface.

### Negative Quantity Change for Orders

Negative quantity changes for inventory records are automatically generated by the system when orders are placed. Sellers cannot manually create negative inventory records outside of order transactions. Each negative change corresponds to an order quantity and uses the reason "order placement". The system calculates the negative change based on the variant quantity in the order. This ensures inventory records only reflect actual sales transactions and prevents artificial stock reduction by sellers.

### Cannot Manually Delete Inventory Records

Inventory records cannot be manually deleted by any user, including sellers and administrators. The system does not provide a delete function for inventory records. This ensures the complete history of stock movements is preserved for auditing and dispute resolution. When inventory quantities are corrected, the system creates a new positive or negative record rather than modifying or removing existing records. This maintains an immutable audit trail of all stock changes.

### Stock Calculation from Record Sum

Current stock quantity for each variant is calculated by summing all inventory records associated with that variant. The calculation adds positive quantity changes (restocking, cancellations, refunds) and subtracts negative quantity changes (orders, adjustments). The system performs this calculation in real time when displaying stock levels. The displayed stock quantity reflects the most up-to-date sum of all inventory history. This ensures inventory accuracy regardless of the number of historical records.

### Out of Stock Prevents New Orders

When a variant's stock reaches zero, the system prevents new orders from being placed for that variant. The variant is marked as "out of stock" and cannot be added to the shopping cart. Customers see the out of stock status on the product detail page and category listings. The system validates stock availability at the time of order placement. If a customer attempts to add an out of stock variant to their cart, the system displays a warning message and prevents the action.

### Existing Orders Valid When Stock Zero

Existing orders remain valid and cannot be cancelled or modified solely because stock has reached zero. Customers who have already placed orders with paid or shipped status retain their purchase rights even when the variant shows out of stock to other customers. The system does not retroactively affect orders based on current stock levels. This ensures order fulfillment is not impacted by subsequent inventory changes. Sellers must fulfill existing orders regardless of current stock availability.

### Inventory Adjustment Requires Reason

Every inventory record must include a reason field that explains the cause of the quantity change. Sellers must provide a reason when restocking or making adjustments to inventory. The reason can be "restock", "inventory correction", "damaged goods", "return processing", or any custom text describing the change. The reason is stored with each inventory record and cannot be left blank. This ensures accountability for all stock movements and supports dispute resolution by documenting why inventory changed.

## Order Error Scenarios

Order creation is rejected if payment processing fails; the customer can retry the payment without losing cart contents. Orders cannot be created with unavailable items in the cart. After an order is placed, the shipping address becomes immutable and cannot be changed. The overall order status is derived from individual item statuses, so mixed item statuses result in partially completed order status. If all items in an order are cancelled, the entire order status becomes cancelled.

### Payment Failure Handling

If the payment processing fails when a customer attempts to place an order, the order is not created. The customer is notified of the payment failure and the cart contents are retained for a retry. The customer can retry the payment processing with the same cart contents. The cart items remain unchanged and can be checked out again after a successful payment. If the payment succeeds on retry, the order is created as normal. If the customer abandons the cart after payment failure, the items remain in the cart until removed or deleted by the system per data retention policies. Payment failures do not remove items from the cart or affect the stock quantities.

### Unavailable Item Order Rejection

Orders cannot be created if the cart contains unavailable items. Items are considered unavailable if they are out of stock or if the product has been deleted by the seller. The checkout process checks all cart items for availability before order creation. If any item is unavailable, the order creation is rejected and the customer is notified which items are unavailable. The customer must remove unavailable items from the cart before proceeding with checkout. Out of stock items are identified and marked as unavailable in the cart view. Deleted products are automatically removed from the cart and the customer is notified.

### Shipping Address Immutability

Once an order is successfully placed, the shipping address associated with that order becomes immutable and cannot be changed. The shipping address selected at checkout is preserved with the order record permanently. If a customer needs to change the shipping address for a delivered order, a new order must be created. The system does not allow modifications to the shipping address of any order after payment confirmation. This ensures accurate order fulfillment records for dispute resolution and legal purposes. The shipping address remains associated with the order for the entire lifecycle of the order.

### Order Status Derived from Item Statuses

The overall order status is automatically derived from the statuses of all individual order items within that order. If all items have status paid, the order status is paid. If any item has status shipped and none are delivered yet, the order status is shipped. If all items have status delivered, the order status is delivered. If all items have status cancelled, the order status is cancelled. If all items have status refunded, the order status is refunded. When items have mixed statuses (for example, some delivered and some refunded), the order status is partially completed. The order status is recalculated whenever any item status changes. This ensures the order status accurately reflects the current state of all items within the order.

### Order Creation and Record Management

When a customer places an order successfully after payment confirmation, an order record is created in the system. The order record contains all items from the cart with their quantities, prices, and statuses. Each purchased variant becomes an order item with initial status paid. Stock quantities are decreased for each purchased variant at order creation. Items are automatically removed from the customer's cart after successful order creation. A snapshot of each purchased product and variant is saved with the order item to preserve the product state at time of purchase. A snapshot of each seller's profile is also saved with the order item. The order is assigned a unique order number for identification. The order record is immutable and cannot be deleted after creation. The order record is used for all future order tracking and dispute resolution.

## OrderItem Error Scenarios

Cancellation requests can only be made for order items with paid status before they are shipped. Refund requests can only be made for delivered items within 7 days of delivery. Order items can be cancelled individually while other items in the same order continue processing normally. When an order item is cancelled, its stock is restored via an inventory record. If all items in an order are cancelled, the order status changes to cancelled but remaining items continue processing.

### Cancellation Request Status Requirement

Customers can request cancellation for individual order items only when the item status is "paid". Cancellation requests are rejected if the item has status "shipped", "delivered", "cancelled", or "refunded". Items with shipped status cannot be cancelled by customers; instead, they must use the refund request process after delivery. The system validates the item status before accepting any cancellation request.

### Cancellation Pre-Shipment Timing

Cancellation requests can only be submitted before the seller has shipped the order item. Once the seller creates a shipment and the item status changes to "shipped", the cancellation option is no longer available to customers. The system checks the current shipment status when a cancellation request is submitted. If the item has already been shipped, the request is rejected with a message indicating that the item is no longer eligible for cancellation.

### Refund Request Status Requirement

Customers can request a refund for individual order items only when the item status is "delivered". Refund requests are rejected if the item status is "paid", "shipped", "cancelled", or "refunded". Customers must wait until the item has been confirmed as delivered before they can request a refund. The system validates the delivery status before accepting any refund request.

### Refund Seven Day Delivery Window

Refund requests must be submitted within 7 days of the item being delivered. The system tracks the delivery date and calculates whether the refund request is within the allowed time window. If a customer attempts to request a refund more than 7 days after delivery, the request is rejected. The 7-day period is calculated from the delivery confirmation date, whether confirmed by the customer or automatically after 14 days of shipping.

### Individual Item Cancellation and Order Continuation

Customers can cancel individual order items while other items in the same order continue processing normally. When an order item is cancelled, the remaining items maintain their current status and continue through the normal fulfillment process. If all items in an order are cancelled, the overall order status automatically changes to "cancelled". Partial cancellations do not affect the processing of remaining items.

### Stock Restoration on Cancellation

When an order item is cancelled, the system creates an inventory record that restores the stock quantity for the purchased variant. The quantity restored equals the quantity of the cancelled item. This inventory record is positive to indicate restocking. The stock restoration happens immediately when the cancellation is approved by the seller, ensuring that the variant becomes available for purchase again.

## Shipment Error Scenarios

Shipment tracking information is entered by sellers when they mark items as shipped. Different sellers always ship separately, so shipments cannot span multiple sellers. Items are automatically marked as delivered 14 days after shipping if the customer does not confirm delivery. Customers confirm delivery per shipment, and all items in that shipment change to delivered status upon confirmation. Sellers can bundle multiple order items from their products into a single shipment or ship individually.

### Shipment Tracking Information Entry

When a seller ships an order item, they must enter tracking information for the shipment.
The tracking information includes the carrier name and tracking number.
The seller selects one or more order items belonging to their products to include in the shipment.
All items in the same shipment share the same tracking information.
Tracking information must be provided when creating a shipment; shipments cannot be created without tracking details.

### Separate Shipments per Seller

Each seller creates their own separate shipments for their products.
Shipments cannot span multiple sellers; each shipment contains only items from a single seller.
Different sellers always ship separately, even if their products are in the same customer order.
Each seller manages their own shipment creation and tracking for items they sold.

### Customer Delivery Confirmation

Customers can confirm delivery for each shipment individually.
Delivery confirmation is per shipment, not per individual order item.
When a customer confirms delivery for a shipment, all order items in that shipment change to delivered status.
Customers view tracking information for each shipment before confirming delivery.
Delivery confirmation can only be performed by the customer who placed the original order.

### Multiple Items in Single Shipment

Sellers can bundle multiple order items into a single shipment.
Sellers may also choose to ship items individually, creating separate shipments for each item.
When multiple items are bundled in one shipment, they share the same tracking information.
The same tracking carrier and tracking number apply to all items in the shipment.
Sellers have flexibility in how they group items for shipment.

### Automatic Delivery Confirmation

If a customer does not confirm delivery, order items automatically change to delivered status after 14 days from the shipping date.
The 14-day period starts from when the shipment is created with tracking information.
Automatic delivery confirmation occurs regardless of whether the customer has confirmed.
Customers can still confirm delivery before the 14-day period expires.
The automatic status change cannot be undone once triggered.

### Shipment Error Conditions

Sellers cannot create shipments for order items that have been cancelled.
Sellers cannot create shipments for order items that have already been shipped.
Customers cannot confirm delivery for shipments that have already been marked as delivered.
Tracking information cannot be modified after shipment creation.
A shipment cannot be created after an order item has been refunded.

## WishlistItem Error Scenarios

If a seller deletes a product, all wishlist entries for that product are automatically removed. Customers can remove products from their wishlist at any time without restriction. Wishlist entries show products rather than specific variants, so the product must exist to be in the wishlist. The wishlist is paginated, so very long wishlists are displayed across multiple pages. Customers cannot add variants to their wishlist, only whole products.

### Product Deletion from Wishlist

When a seller deletes a product from the platform, all wishlist entries for that product are automatically removed from every customer's wishlist.

The system scans all wishlist entries for the deleted product and removes each one.

Customers are not notified when a product is removed from their wishlist due to deletion.

Deleted products no longer appear in search results or category listings.

Customers cannot add a deleted product to their wishlist.

If a customer attempts to add a deleted product to their wishlist, the request is rejected.

The product must exist in the product catalog to be added to a wishlist.

Existing wishlist entries are cleaned up immediately when product deletion is confirmed.

Wishlist counts are updated to reflect the removal of deleted products.

Products with no remaining variants are considered deleted for wishlist purposes.

### Wishlist Product Removal Permissions

Customers can remove products from their wishlist at any time without restriction.

Customers can remove products from their wishlist using the delete action.

Removal of a wishlist entry is immediate and permanent.

Customers cannot remove products from other customers' wishlists.

Wishlist removal does not affect the product listing or availability.

Removal is not restricted by product status or availability.

Customers can remove products that are out of stock from their wishlist.

Customers can remove products that have been deleted by sellers.

Removed products cannot be recovered from the wishlist.

Customers can add products back to their wishlist after removal.

### Product vs Variant Display

Wishlist entries display products, not specific product variants.

Customers select a whole product to add to their wishlist, not a variant.

The wishlist shows the product name, main image, and seller shop name.

Product price range is shown if variants have different prices.

Customers can see all available variants when viewing a wishlist product.

Wishlist entries do not store which variant was selected.

If all variants are out of stock, the product is shown as unavailable in the wishlist.

Customers can navigate from a wishlist product to the product detail page to see variants.

Adding a product to wishlist does not reserve any specific variant.

The wishlist product display includes the average rating if reviews exist.

### Wishlist Pagination

The customer wishlist is paginated to handle long lists of products.

The system displays a maximum number of products per page.

Customers can navigate between pages of their wishlist.

Each page shows product details including name, image, price, and seller.

The total number of wishlist items is displayed for page navigation.

Pagination is required when the wishlist exceeds one page capacity.

Customers can add or remove products while viewing any page.

Wishlist navigation maintains the current page when products are modified.

The wishlist list is sorted with newest products first.

Search or filtering is not supported within the wishlist pagination.

### Variant Addition Restriction

Customers cannot add specific variants to their wishlist.

Wishlist entries are for whole products, not individual variants.

Customers must select a product, not a variant combination.

The variant selection interface is hidden during wishlist addition.

Attempting to add a specific variant to the wishlist is rejected.

The system only accepts product-level wishlist additions.

Variant options are not stored in the wishlist entry.

Customers cannot save a variant preference in their wishlist.

The wishlist product display shows all available variants for reference.

Adding a product to wishlist does not pre-select any variant for purchase.

## Review Error Scenarios

Customers can only write reviews for products they have purchased where the item status is delivered. Each customer can write only one review per product per order, preventing duplicate reviews for the same purchase. Review editing creates a snapshot of the previous review state. Review deletion is allowed but snapshots are preserved for audit purposes. Products calculate their average rating from all non-deleted reviews only, so deleted reviews do not affect the average.

### Review Creation Requirements

Customers can write a review for a product only after the order item has status "delivered". A review cannot be created if the item status is "paid", "shipped", or any other non-delivered status. The system validates that the customer has actually purchased the product before allowing a review to be created. If the customer has not completed a purchase of the product, the review creation request is rejected.

### One Review Per Product Per Order

Each customer can write only one review per product per order. If a customer has already written a review for the same product in the same order, a new review creation request is rejected. This prevents duplicate reviews for the same purchase. If a customer purchases the same product in multiple orders, they can write a separate review for each order, but only one review per order-product combination.

### Review Edit Process

Customers can edit their own reviews after creation. When a customer edits a review, the system automatically creates a snapshot that records the previous state of the review. The snapshot includes the rating, text content, and timestamp before the edit. The snapshot is immutable and cannot be deleted. After the edit, the review is updated with the new rating and/or text content. Customers can edit their reviews multiple times, and each edit creates a new snapshot.

### Review Deletion Process

Customers can delete their own reviews at any time. When a review is deleted, a snapshot is created and preserved that records the original state of the review, including the rating, text content, and timestamps. The deleted review is no longer visible to other customers on the product detail page. The snapshot remains accessible to the review owner and administrators for audit purposes. Even after deletion, the review record persists in the system.

### Average Rating Calculation

The product's average rating is calculated from all non-deleted reviews only. Reviews that have been deleted by their owners are excluded from the average calculation. The average rating does not include deleted review entries, even though the review records remain in the system with their snapshots. This means deleted reviews have no impact on the displayed average rating. Customers and sellers can view the average rating on the product detail page, which reflects only active (non-deleted) reviews.

## Snapshot Error Scenarios

All snapshots are immutable and cannot be deleted by any user including administrators. Relevant parties can view snapshots for dispute resolution purposes. Snapshots record when changes were made, what fields changed, and the values before and after the change. Product snapshots include all product fields and all variant snapshots at the time of change. Order item snapshots preserve the product, variant, and seller profile state at the time of purchase.

### Snapshot Immutability

All snapshots are immutable records that cannot be modified or deleted by any user, including administrators.

Once a snapshot is created, it remains permanently in the system for audit and dispute resolution purposes.

Neither system administrators nor regular users have the capability to remove or alter snapshots from the database.

This immutability ensures that historical records of all data changes remain intact and verifiable for compliance and dispute resolution.

Even if an account is deleted or a product is removed, associated snapshots remain accessible to relevant parties.

Administrators cannot delete snapshots even when investigating policy violations or system errors.

The immutability constraint applies to all entity types including products, variants, seller profiles, order items, reviews, and cancellation/refund requests.

### Snapshot Creation Triggers

A snapshot is created automatically whenever any editable data field is modified.

Product edits trigger snapshot creation for all changed product fields including name, description, category, base price, and images.

Variant edits trigger snapshot creation including SKU code, option values, price, and stock quantity changes.

Seller profile edits (shop name, description, logo) automatically create a snapshot at the time of modification.

Review edits create a snapshot capturing the rating and text content before and after the change.

Cancellation request status changes trigger snapshot creation to preserve the previous approval state.

Refund request status changes trigger snapshot creation to record the prior decision state.

Every edit operation requires snapshot creation before the change is persisted to the database.

Customers cannot manually create or delete snapshots—system automatically generates them on all edits.

Product deletion does not delete snapshots; the snapshots remain accessible even after the product is removed.

### Snapshot Access by Relevant Parties

Product owners (sellers) can view snapshots of their own products for audit and dispute purposes.

Administrators can view snapshots of any product on the platform regardless of ownership.

Order customers can view snapshots of order items they purchased to verify purchase details.

Administrators can view snapshots of all order items across the entire platform.

Sellers can view snapshots of their own seller profiles including previous shop names and logos.

Administrators can view all snapshots for dispute resolution and compliance auditing.

The system determines relevant parties based on entity ownership and administrative privileges.

Customers cannot view snapshots of products from sellers they have not purchased from.

Relevant parties access is logged to track which users have viewed which snapshots for accountability.

Snapshot access does not include the ability to view snapshots of deleted accounts—only the snapshot data itself remains.

### Change Timestamp Recording

Each snapshot records the exact timestamp when the change was made.

The timestamp is captured at the moment the edit operation is committed to the database.

Timestamps are recorded in system time and used to establish chronological order of changes.

For dispute resolution, the timestamp determines which version of data was active at any given time.

Multiple snapshots for the same entity can be compared by their timestamps to identify the sequence of changes.

Order item snapshots include the purchase timestamp as part of the preserved state.

The timestamp allows customers and administrators to verify when specific prices or product details were current.

System displays timestamps in a format readable by customers and sellers for dispute resolution contexts.

Timestamps cannot be manually edited or backdated by any user including administrators.

### Snapshot Field Change Values

Snapshots record both the previous values and the new values for each changed field.

This before-and-after comparison allows verification of what exactly was modified.

For product edits, the snapshot includes the product name, description, and base price before and after the change.

For variant edits, the snapshot captures the SKU code, option values, and price before and after modification.

Seller profile snapshots record the previous shop name and description alongside the new values.

Review snapshots preserve the old rating and text content alongside the updated version.

The snapshot structure ensures complete traceability of all data modifications.

Administrators can compare snapshots to identify patterns of unauthorized or fraudulent changes.

Customers can review snapshots to verify that seller claims about product changes match the actual modification history.

Field change values are stored as immutable text that cannot be altered even by system administrators.

### Product Snapshot Includes All Variants

When a product is edited, the snapshot includes all variants associated with that product at that moment.

Each variant is captured with its complete state: SKU code, option values, price, and stock quantity.

This creates a complete record of what the product looked like including all purchasing options.

The snapshot structure preserves the relationship between the product and all its variants.

Even if a variant is later deleted, its snapshot data remains intact within the product snapshot.

Product snapshots enable reconstruction of the exact purchasing options available at any point in time.

This is critical for dispute resolution when a customer disputes price or availability of a specific variant.

The snapshot captures all variants regardless of their stock status at the time of editing.

Product snapshots are essential when a customer purchased a product and later the seller modified variants.

### Order Item Snapshot Purchase State

Each order item includes a snapshot preserving the complete product state at the time of purchase.

The snapshot captures the product name, description, and category as they existed when the order was placed.

The snapshot includes the variant's SKU code, option values, and price at the moment of purchase.

This preserves the exact product details that the customer ordered and paid for.

If the seller later modifies the product, the order item snapshot remains unchanged.

This ensures that customers can always verify what they actually purchased regardless of later changes.

Order item snapshots are immutable and cannot be modified after order placement.

The purchase price snapshot is critical for refund calculations and dispute resolution.

Customers can view their order item snapshots to verify the details they purchased.

Administrators can review order item snapshots when investigating purchase disputes or fraud claims.

### Seller Profile Snapshot in Order

Each order item includes a snapshot of the seller's profile at the time of purchase.

The snapshot preserves the shop name that the customer saw when making the purchase.

The snapshot includes the seller's logo image URL as it appeared at purchase time.

The snapshot captures the shop description as displayed during the customer's shopping experience.

If the seller later changes their shop name, the order item snapshot retains the original name.

This ensures that customers can identify which seller they purchased from even if the seller rebrands.

Order item snapshots with seller profile information are critical for dispute resolution regarding seller identity.

The snapshot enables customers to verify the seller's identity at the time of their purchase.

Administrators can use seller profile snapshots to track which shop name was active during disputed transactions.

### Snapshot for Dispute Resolution

Snapshots are primarily designed to support dispute resolution between buyers and sellers.

When a customer disputes a product change, snapshots provide the authoritative record of what was originally offered.

When a seller disputes a refund claim, snapshots verify the product state at the time of purchase.

Administrators review snapshot history to determine the facts of any dispute case.

Snapshots enable chronological reconstruction of events surrounding a transaction.

The before-and-after field values help determine whether a seller made unauthorized changes.

For cancellation or refund disputes, snapshots preserve the request state before and after approval/rejection.

Customers and sellers both have access to their relevant snapshots for self-service dispute evidence.

Snapshots serve as the immutable evidence source when third-party payment disputes occur.

The system uses snapshot timestamps to establish the timeline of events for dispute resolution decisions.

## CancellationRequest Error Scenarios

Customers can submit cancellation requests only for order items with paid status before shipping. Sellers can approve or reject cancellation requests, and their response creates a snapshot of the request state. If a cancellation is approved, the item is cancelled and stock is restored. If rejected, the item continues processing normally. When all items in an order are cancelled, the entire order status changes to cancelled.

### Cancellation Request Submission

Customers can request cancellation for individual order items with paid status that have not yet been shipped.
A reason for the cancellation must be provided when submitting the request.
Cancellation requests can only be submitted before the seller has shipped the item.
Once an item status changes to shipped, cancellation requests are no longer accepted.

### Seller Cancellation Approval

Sellers can approve cancellation requests for their items.
When a seller approves a cancellation, a snapshot of the request state is created to record the approval.
The cancellation approval is final and cannot be reversed.
Upon approval, the item status changes to cancelled and the customer receives a refund for that item only.

### Seller Cancellation Rejection

Sellers can reject cancellation requests for their items.
When a seller rejects a cancellation, a snapshot of the request state is created to record the rejection.
The rejection is final and cannot be reversed.
Upon rejection, the item continues processing normally with its original paid status.

### Cancellation Stock Restoration

When a cancellation is approved, stock quantities are restored for the cancelled variant.
Stock restoration occurs automatically through an inventory record with a positive quantity change.
The reason for the inventory change is recorded as cancellation restoration.
Only stock for the cancelled item is restored; other items in the order remain unaffected.

### Order Status Update on Full Cancellation

If all items in an order are cancelled, the entire order status changes to cancelled.
When any item remains active (paid, shipped, or delivered), the order maintains its current status.
Partial cancellations do not change the overall order status.
Order status changes are derived automatically from the statuses of all items in the order.

## RefundRequest Error Scenarios

Customers can request refunds only for delivered items within 7 days of delivery. Sellers can approve or reject refund requests, and their response creates a snapshot of the request state. Approved refunds restore stock to the variant through inventory records. Rejected refund requests leave the item in delivered status. If all items in an order are refunded, the order status changes to refunded.

### Refund Request Eligibility

Customers can request a refund only for order items with status "delivered". Items that are still in "paid" or "shipped" status cannot be refunded. Customers can view the status of each item in their order history. The system validates the item status before accepting a refund request. If the item status is not "delivered", the refund request is rejected. Customers cannot request refunds for items they have not received.

### Refund Request Time Window

Customers can request a refund only within 7 days of the item being delivered. The system calculates the delivery date and counts the days elapsed. If more than 7 days have passed since delivery, the refund request is rejected. The delivery date is the date the customer confirmed delivery or the date the shipment was automatically marked as delivered after 14 days. Customers can view the delivery date and remaining refund window on the order details page.

### Refund Request Reason Requirement

Customers must provide a reason text when submitting a refund request. The reason field is required and cannot be empty. The reason field accepts any text input up to 1000 characters. If no reason is provided, the refund request is rejected. The reason is displayed to the seller when reviewing the refund request. Customers can edit their refund request reason before the seller responds.

### Seller Refund Approval Option

Sellers can approve or reject each refund request for their order items. The seller views the refund request with the customer's reason and order details. The seller can approve the refund request, which processes the refund and restores stock to the variant. The seller can reject the refund request, which leaves the item in "delivered" status. The seller's response creates a snapshot of the refund request state. Rejected refund requests cannot be resubmitted by the customer.

### Approved Refund Stock Restoration

When a refund request is approved, the stock quantity is restored to the variant through inventory records. The system creates a positive inventory record with quantity equal to the refunded item quantity. The reason field for the inventory record is "refund approved". The stock restoration happens immediately when the seller approves the refund. The variant's stock quantity is updated to reflect the returned items. Customers cannot purchase the same quantity if stock is limited.

### Rejected Refund Item Status

If a seller rejects a refund request, the order item remains in "delivered" status. The item is not cancelled and does not affect the order status. The customer is notified of the rejection reason provided by the seller. The rejected refund request is marked with status "rejected" in the system. The customer cannot submit a new refund request for the same item after rejection. The rejection snapshot is preserved for dispute resolution.

### Order Status After All Items Refunded

If all order items in an order are refunded, the overall order status changes to "refunded". The order status is derived from the status of all its items. Mixed states (some items refunded, some delivered) result in "partially completed" order status. If any item is not refunded, the order status remains unchanged. The order status update happens automatically when the last item is refunded. Customers can view the updated order status in their order history.

### Refund Request Snapshot Creation

Every seller response to a refund request creates a snapshot of the request state. The snapshot records the seller's approval or rejection decision. The snapshot includes the timestamp of the seller's response and the rejection reason if applicable. Snapshots are immutable and cannot be deleted. Relevant parties (customer, seller, administrator) can view the snapshots. Snapshots are preserved for dispute resolution even after the refund request is processed.

## SellerApprovalRequest Error Scenarios

Administrators must provide a rejection reason when rejecting seller registration requests. Rejected sellers can submit new registration requests with corrected information. Seller accounts remain in pending status until an administrator approves or rejects them. Approved sellers can immediately begin selling products on the platform.

### Seller Approval Rejection Reason Required

When an administrator rejects a seller registration request, the administrator must provide a rejection reason.

The rejection reason is required and cannot be left blank.

The rejection reason is stored permanently and becomes part of the seller approval request record.

Rejected sellers can view the rejection reason to understand why their registration was denied.

The rejection reason is displayed to the rejected seller in the seller approval request status view.

Administrators cannot reject a seller registration without providing a reason.

If an administrator attempts to reject without a reason, the rejection request is rejected.

The system prompts the administrator to enter a rejection reason before confirming the rejection.

The rejection reason remains visible in the seller's registration history for future reference.

Rejection reasons are preserved even if the seller submits a new registration request.

### Seller Registration Pending Status

When a seller submits a registration request, the seller account status is set to pending.

The seller account remains in pending status until an administrator approves or rejects it.

Sellers in pending status cannot sell products on the platform.

Sellers in pending status can view their approval status in the seller dashboard.

Pending seller accounts cannot create or publish products.

Pending seller accounts cannot view the order management interface.

Pending seller accounts cannot access shipping or inventory management features.

The system shows a pending status badge next to seller registration requests in the admin panel.

Pending sellers can update their profile information while waiting for approval.

Pending status is displayed in the seller's profile view to other users.

### Rejected Seller Re-Submission Allowed

Sellers whose registration is rejected can submit a new registration request.

The rejected seller must address the reason provided by the administrator.

The rejected seller can modify their registration information before re-submitting.

The new registration request creates a separate seller approval request record.

The previous rejection record is preserved and cannot be deleted.

The rejected seller can view their history of all registration requests.

The system shows which previous requests were rejected and why.

There is no limit to the number of times a seller can re-submit.

Each new submission is treated as a fresh registration request.

Rejected sellers cannot see other rejected sellers' information.

### Approved Seller Immediate Selling

Once an administrator approves a seller registration, the seller account status changes to approved.

Approved sellers can immediately begin selling products on the platform.

Approved sellers can create and publish products without additional waiting periods.

Approved sellers can upload product images and variants immediately.

Approved sellers can manage inventory and stock levels immediately.

Approved sellers can receive and process customer orders immediately.

Approved sellers can view their seller dashboard immediately after approval.

Approved sellers can update their shop profile immediately after approval.

No additional verification is required after administrative approval.

The system sends a notification to the approved seller confirming they can start selling.

### Pending Seller Approval Status Visibility

Sellers can view their current approval status at all times.

The approval status is displayed prominently in the seller dashboard.

Sellers can see if their request is pending, approved, or rejected.

Sellers in pending status can view when they submitted their request.

Sellers can see if any additional information is needed for processing.

The system shows the current status without revealing other sellers' information.

Pending status updates are shown in real-time when an administrator responds.

Sellers cannot see why a request is still pending or in review.

Sellers cannot contact administrators to inquire about pending status.

### Seller Approval Administrator Decision

Only administrators can approve or reject seller registration requests.

Administrators view a list of all pending seller registration requests in the admin panel.

Administrators can view the seller's profile information before making a decision.

Administrators can approve or reject each request individually.

Administrators cannot approve a request without first reviewing it.

When an administrator makes a decision, a snapshot of the approval request is created.

The snapshot records when the decision was made and who made it.

The decision is final and cannot be reversed by other administrators.

The system notifies the seller when an administrator makes a decision.

Administrators must act within a reasonable timeframe to process requests.

### Seller Rejection Reason Disclosure

Rejected sellers receive full disclosure of the rejection reason from the administrator.

The rejection reason is displayed in detail in the seller's dashboard.

Sellers can read the complete rejection reason at any time.

The rejection reason cannot be edited or removed by the administrator after rejection.

Sellers can view their rejection reason multiple times.

The rejection reason is specific and actionable when possible.

Vague rejection reasons are discouraged but technically allowed.

Sellers can use the rejection reason to improve their re-submission.

### Seller Registration Corrected Resubmission

Rejected sellers can correct issues identified in the rejection reason.

Sellers can modify any field in their registration information.

After corrections, sellers submit a new registration request.

The new request is processed as a fresh application by administrators.

The system does not automatically approve corrected registrations.

Administrators review the corrected registration with full attention.

Sellers can see the status of their re-submission request immediately.

The corrected information is clearly distinguishable from previous submissions.

Sellers are encouraged to address all points in the rejection reason.

## Administrator Error Scenarios

Only regular administrators can approve or reject seller registration requests and category management. Super administrators have additional privileges to promote and demote administrator grades. Super administrators cannot demote themselves to regular administrator. Administrators can ban or unban customer and seller accounts, preventing banned users from logging in. Banned sellers cannot log in but existing orders remain active and processable.

### Administrator Grade Privileges

Regular administrators can approve or reject seller registration requests. Regular administrators can approve or reject category management changes. Regular administrators cannot promote or demote administrator grades. Super administrators can approve or reject seller registration requests. Super administrators can approve or reject category management changes. Super administrators can promote regular administrators to super administrator. Super administrators can demote other super administrators to regular administrator. Super administrators cannot demote themselves to regular administrator.

### Seller Management Approval Process

Administrators can view the list of pending seller registration requests. Administrators can approve seller registration requests. When approving, the seller can immediately start selling. Administrators can reject seller registration requests. When rejecting, administrators must provide a rejection reason. Rejected sellers can view the rejection reason. Rejected sellers can submit a new registration request. Administrators can view all seller accounts on the platform.

### Administrator Grade Promotion and Demotion

Super administrators can promote a regular administrator to super administrator. Promoted administrators gain all super administrator privileges. Super administrators can demote other super administrators to regular administrator. When demoted, the administrator loses super administrator privileges. Super administrators cannot demote themselves to regular administrator. The demotion requires another super administrator to perform the action.

### Customer Ban and Login Prevention

Administrators can ban customer accounts. Banned customers cannot log in to the platform. Banned customers lose access to all features. Banned customers cannot create new orders. Banned customers cannot view existing orders. Administrators can unban customer accounts. Unbanned customers regain full platform access immediately. Customer ban status is reflected in login attempts.

### Seller Ban and Account Restrictions

Administrators can ban seller accounts. Banned sellers cannot log in to the platform. Banned sellers cannot create new products. Banned sellers cannot edit existing products. Banned sellers can still process existing orders. Banned sellers can ship items for pending orders. Banned sellers can respond to cancellation requests. Banned sellers can respond to refund requests. Administrators can unban seller accounts. Unbanned sellers regain full platform access immediately.

### Category Management Administrator Restriction

Only administrators can create categories on the platform. Only administrators can create subcategories. Only administrators can edit category names. Only administrators can edit category descriptions. Only administrators can delete categories. Customers can only browse and view categories. Customers cannot create, edit, or delete categories. Deleted categories make products uncategorized.

### Product Oversight Administrator Capability

Administrators can view all products on the platform. Administrators can view snapshots of any product. Administrators can delete products for policy violations. When deleting, the product is removed from all listings. Administrators can view snapshots of deleted products. Regular administrators cannot delete products. Only super administrators can delete products from the platform.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Customer Shopping Journey

A customer can browse products by viewing the list of all categories and selecting a category to see products within it.

A customer can search for products by name using the search functionality, with results showing products from all sellers.

Search results are paginated and can be filtered by category, price range (minimum and maximum), and in-stock only option.

Search results can be sorted by newest first, price low to high, or price high to low.

When viewing a product list (search results or category page), each product displays its main image thumbnail, name, base price or price range if variants have different prices, seller shop name, and average rating if reviews exist.

A customer can view a single product's full details on the product detail page, including all images, name, description, category, seller shop name (linking to seller profile), all available variants with prices and stock status, average rating and total review count, and all reviews.

A customer can add a product to their wishlist. The wishlist shows products (not specific variants) and is paginated when the list is long.

A customer can add specific product variants to their shopping cart, selecting a quantity for each variant.

When the same variant is added to the cart multiple times, the quantities are combined into a single line item (not separate entries).

The shopping cart displays each item with product name, variant options, price, quantity, and subtotal.

A customer can change the quantity of items in their cart or remove items entirely.

The cart calculates and displays the total price of all items.

If a variant's stock is less than the cart quantity, a warning is shown to the customer.

If a variant is deleted by the seller or becomes out of stock, it is marked as unavailable in the cart.

A customer can view their wishlist at any time, and products removed from the platform are automatically removed from wishlists.

When proceeding to checkout, unavailable items cannot be included in the order.

During checkout, the customer must select a shipping address or use their default address.

Before placing the order, the customer reviews the order summary including list of items with prices, shipping address, and total price.

After confirming and placing the order, payment is processed through an external payment gateway.

If payment fails, the order is not created and the customer can retry the payment.

If payment succeeds, the order is created with stock quantities decreased for each purchased variant, items removed from the customer's cart, and each purchased variant becomes an order item with status "paid".

Snapshots of each purchased product, variant, and seller profile are saved with each order item, preserving the state at the time of purchase.

An order contains one or more order items, where each item can be from different sellers.

If a customer buys multiple quantities of the same variant, it becomes one order item with the total quantity.

The overall order status is derived from item statuses: paid if all items are paid, shipped if any item is shipped, delivered if all items are delivered, cancelled if all items are cancelled, refunded if all items are refunded, and partially completed for mixed states.

### Order Cancellation Journey

Cancellation is handled per order item, not per the entire order. This allows partial order cancellations.

A customer can request cancellation for individual items that have status "paid" (items that have not yet been shipped).

A customer cannot request cancellation for items with status "shipped", "delivered", "cancelled", or "refunded".

When requesting cancellation, the customer must provide a reason as text.

The cancellation request is sent to the seller of that specific item.

The seller can approve or reject the cancellation request.

When the seller responds to a cancellation request, a snapshot of the request state is created.

If the seller approves the cancellation, that specific item is cancelled.

The refund is processed for the cancelled item only, not the entire order.

Cancelled items restore their stock quantities through an inventory record with a positive quantity change.

The remaining items in the order continue processing normally with their original status.

If all items in an order are cancelled, the entire order status automatically becomes "cancelled".

If only some items are cancelled, the order status becomes "partially completed".

A customer can view their cancellation requests and their current status (pending, approved, rejected).

A customer cannot request cancellation for the same item multiple times if already approved or rejected.

The customer retains the ability to view the cancellation request history for dispute resolution.

The seller receives notification of the cancellation request and can take action within the system.

The cancellation process does not affect items from other sellers in the same order.

### Refund Request Journey

Refund is handled per order item, not per the entire order, allowing partial order refunds.

A customer can request a refund for individual items that have status "delivered".

A customer cannot request a refund for items with status "paid", "shipped", "cancelled", or "refunded".

A refund request can only be made within 7 days of the item being delivered.

After 7 days from delivery, the refund request window expires and no new refund requests can be made.

When requesting a refund, the customer must provide a reason as text.

The refund request is sent to the seller of that specific item.

The seller can approve or reject the refund request.

When the seller responds to a refund request, a snapshot of the request state is created.

If the seller approves the refund, that specific item is marked as refunded.

The refund amount is processed for the refunded item only.

Refunded items restore their stock quantities through an inventory record with a positive quantity change.

The remaining items in the order remain unaffected and continue with their original status.

If all items in an order are refunded, the entire order status automatically becomes "refunded".

If only some items are refunded, the order status becomes "partially completed".

A customer can view their refund requests and their current status (pending, approved, rejected).

A customer cannot request a refund for the same item multiple times if already approved or rejected.

The customer can view the refund request history for dispute resolution.

The seller receives notification of the refund request and can take action within the system.

The refund process does not affect items from other sellers in the same order.

### Seller Product Management Journey

A seller can create a new product by providing a name (required), description (required), category (required, can select a subcategory), and base price (required).

A product belongs to the seller who created it and is visible to customers after creation.

Every product must have at least one variant to be purchasable by customers.

Products without variants are visible in search but are shown as "unavailable" to customers.

A seller can add variants to their products. Each variant requires a unique SKU code, option values (e.g., color, size), and stock quantity (starting at 0).

Each variant can have a price that overrides the base price, or use the base price if not specified.

A seller can edit their products. Every edit creates a snapshot that records what was changed and the previous values.

Product snapshots include all fields: name, description, category, base price, images, and all variant information.

A seller can upload multiple images for each product. The first image is the main/thumbnail image.

Images can be reordered by the seller, which changes which image is the main thumbnail.

Image changes are included in product snapshots when the product is edited.

A seller can delete images from their products. If the main image is deleted, a new main image is assigned from the remaining images.

A seller can delete their own products only if there are no pending order items (paid or shipped status) for any variant of the product.

A seller can delete their own products only if there are no pending cancellation or refund requests for any variant of the product.

Deleting a product also deletes all its variants and inventory records associated with that product.

Deleted products no longer appear in search results or category listings.

A seller can view snapshots of their own products to see the complete history of changes.

A seller can view snapshots of all variants for their products.

A seller can edit their seller profile, including shop name, description, and logo image.

Every seller profile edit creates a snapshot that preserves the previous state.

Snapshots are preserved even after product or profile deletion and cannot be deleted.

Snapshots can be viewed by the product/seller owners and by administrators for dispute resolution.

### Seller Order Fulfillment Journey

A seller can view order items for their products that require shipping (items with status "paid").

The seller dashboard displays a summary of their shop including total products, total order items, pending cancellation requests, and pending refund requests.

Sellers can filter order items by status to focus on specific subsets.

When shipping, the seller selects one or more of their order items to include in a shipment.

A shipment is a package sent by a seller containing one or more order items from that seller.

Different sellers always ship separately, creating different shipments for items from different sellers.

A seller can choose to ship items individually or bundle multiple items into one shipment.

When creating a shipment, the seller enters tracking information including carrier name and tracking number.

All items in the same shipment share the same tracking information.

When a shipment is created, all items in that shipment change their status to "shipped".

The seller can view shipments for their orders and their tracking information.

Customers can view tracking information for each shipment on the order details page.

A customer can confirm delivery for each shipment (not per individual item).

When the customer confirms delivery, all items in that shipment change their status to "delivered".

If the customer does not confirm delivery, items automatically change to "delivered" after 14 days from the shipment creation date.

The order status is automatically updated based on item statuses: shipped if any item is shipped (and none delivered), delivered if all items are delivered.

Sellers can process existing orders even if their account is suspended, but cannot create new products or edit existing products while suspended.

Sellers can view order details including customer shipping address (which becomes immutable after order placement).

Sellers can view shipment history and tracking information for dispute resolution.

### Wishlist and Cart Management Journey

A customer can add products to their wishlist by selecting the add to wishlist option on the product detail page.

The wishlist shows products, not specific variants. When viewing wishlist items, the product's current availability is shown.

Customers can view their wishlist at any time, and the list is paginated when it contains many items.

A customer can remove products from their wishlist at any time without restriction.

If a product is deleted by the seller, it is automatically removed from all customer wishlists.

Customers can add products to their shopping cart by selecting a specific variant and specifying a quantity.

The cart requires customers to select a specific variant, not just the product.

When the same variant is added multiple times, quantities are combined rather than creating duplicate line items.

Customers can view their cart and see each item with product name, variant options, price, quantity, and subtotal.

Customers can change the quantity of items in their cart by entering a new quantity value.

Customers can remove items from their cart individually.

The cart displays the total price of all items and updates in real-time as items are added or removed.

If a variant's stock is less than the cart quantity, a warning message is displayed to the customer.

If a variant becomes out of stock after being added to the cart, it is marked as unavailable.

Unavailable items cannot be checked out and must be removed before checkout.

During checkout, the system validates that all items are available and in stock.

Customers can modify their cart at any time before proceeding to checkout.

The cart persists across sessions while the customer is logged in.

A customer can proceed to checkout only when all cart items are available and a shipping address is selected.

After placing an order, all purchased items are automatically removed from the customer's cart.

# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

The platform integrates with an external payment gateway service to process customer payments.
The integration connection is configured and managed by administrators.
The payment gateway supports multiple payment methods as configured in the integration settings.
All payment transactions are processed through the external gateway; the platform does not store or handle payment card data directly.

### Payment Processing

When a customer completes checkout, the system sends the order amount and customer information to the payment gateway.
The payment gateway processes the payment request and returns a success or failure response.
If the payment succeeds, the system creates the order and all order items.
If the payment fails, the order is not created and the customer is prompted to retry payment with a different payment method or correct the payment details.
The customer can retry payment multiple times for the same order if the initial attempt fails.

### Payment Callback Handling

The payment gateway sends a callback notification to the platform when payment processing is complete.
The callback includes the transaction status (succeeded or failed) and a unique transaction reference.
The system validates the callback signature to ensure it originates from the trusted payment gateway.
Upon receiving a successful callback, the system updates the order status to paid.
Upon receiving a failed callback, the system marks the order as payment failed and notifies the customer.
The system logs all payment callbacks for audit and dispute resolution purposes.

### Webhook Event Processing

The system receives webhook events from the payment gateway for payment lifecycle updates.
Webhook events include payment success, payment failure, refund initiated, and refund completed.
Each webhook event is processed asynchronously to ensure reliable delivery.
The system generates an event log for each processed webhook with a timestamp and event data.
If a webhook event processing fails, the system queues the event for retry.
Webhook events are used to update order status when the initial payment callback is delayed.

### Third-Party Integration Overview

The platform relies on external services for critical functions including payment processing.
The external service provider is selected and configured by administrators.
The platform documentation lists all third-party services and their purposes.
Integration failures do not prevent core platform functions; customers can contact support for manual order processing if payment services are unavailable.
The system monitors integration health and alerts administrators when integrations experience issues.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Product Image Upload

Sellers can upload multiple images for each product they create.

When creating a new product, the seller uploads at least one image.
Each uploaded image is associated with the product at creation time.

Sellers can add additional images to existing products.
Each image is stored with the product for which it was uploaded.

Sellers can upload images of any format supported by the platform.
There is no limit on the number of images a seller can upload per product.

If the image upload fails, the upload is rejected and the seller receives an error message.
If the seller does not upload at least one image, the product cannot be published.


### Product Image Management

Sellers can reorder images within a product's image set.

The first image in the ordered sequence becomes the main or thumbnail image.
The main image is displayed in product listings and search results.

When the main image is deleted or replaced, the next image in the sequence becomes the new main image.
The sequence order is preserved when images are added or removed.

Sellers can delete images from their products at any time.
Deleted images are permanently removed from the platform.

Image changes are recorded in product snapshots.
Each snapshot includes the current set of images and their display order.

If a product is deleted, all its images are also deleted.
If a product is deleted, the image data is removed from storage.


### Seller Logo Upload

Sellers can upload a logo image for their shop profile.

When creating a seller account, the seller does not need to upload a logo immediately.
Sellers can upload or update their logo at any time after account creation.

The logo image is displayed on the seller's public profile page.
The logo image is also shown in product listings next to the seller's shop name.

Sellers can replace their existing logo with a new image.
When the logo is updated, a snapshot of the previous logo is created.

If the logo upload fails, the current logo remains unchanged.
If a seller account is deleted, the logo is removed from the platform.

Logo changes are included in seller profile snapshots.
Each snapshot records the logo image URL and the time of the change.


### Image Storage and Access

All uploaded images are stored in secure file storage.

Images are accessible to the owner (seller) who uploaded them.
Images are publicly accessible when viewing the associated product or seller profile.

Images are preserved even when the owner's account is deleted.
Product images are deleted when the product is deleted.

Seller logo images are preserved in snapshots of seller profiles.
Images in snapshots cannot be deleted or modified.

The storage system maintains all uploaded images for the lifetime of the associated entity.
If an entity is deleted, its images are scheduled for removal from storage.

Images are accessible through the platform's file access controls.
Only authorized users can access image data based on their permissions.