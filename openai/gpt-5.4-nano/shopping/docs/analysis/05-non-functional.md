**shoppingMall — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Boundaries

Customers own their customer profile information, shipping addresses, wishlist contents, cart contents, and reviews they have authored.
Seller accounts own their seller profile information and the products, product images, product variants, inventory history records, and order placement-related seller data they contribute.
Administrators own only their administrator account information used to manage approvals, categories, and oversight actions.
Order history and order records belong to the purchasing customer for viewing purposes.
Order items and associated snapshots belong to the purchasing order context so that purchase-time information remains available for dispute resolution.
Review content belongs to the customer who wrote it, but display behavior changes after the customer deletes their account.
Snapshots are immutable and are owned by the platform’s snapshot history for dispute resolution; they cannot be deleted.
When a customer deletes their account, the customer profile information is deleted, while their orders and order history are preserved for seller records and legal purposes.
When a seller deletes their account, their products are deleted from listings, while order history and snapshots are preserved to keep purchase-time records available.
If a seller account is deleted or a product is deleted, customers’ past order item records must still display the product and seller profile snapshot data saved at purchase time.
If a seller is suspended, their products are hidden from search and category listings, but existing orders and their ability to fulfill and respond to existing cancellation/refund requests must remain unaffected.
If an administrator-approval change affects seller approval status, this only changes the seller’s ability to sell going forward; it must not retroactively remove purchase-time order records.


### Privacy Rules for User-Provided Information

The system must keep customer profile information and contact details private to that customer, except where it must be exposed in order-related contexts.
The system must expose shipping address information only to: (1) the purchasing customer, and (2) the sellers whose items are included in the order, and only for fulfilling that order.
The system must show seller shop profile information publicly to support product listing and product detail views.
The system must allow customers to view only the seller shop profile information that is publicly available, not private seller account details.
Wishlist contents must be visible only to the customer who owns the wishlist.
Cart contents must be visible only to the customer who owns the cart.
Customers must not be able to view or edit another customer’s reviews, wishlist, addresses, or cart.
Sellers must not be able to view another seller’s products, variants, or inventory history records.
Administrators must be able to view customer and seller account information required for account oversight, including ban/suspension decisions.
Administrators must be able to view product snapshots and order oversight information needed for dispute resolution.
When a customer deletes their account, any reviews they authored must remain visible on product pages but be displayed as “deleted user”.
The system must ensure that a displayed “deleted user” review does not reveal the deleted customer’s profile information.


### Access Control by Actor and Ownership

Only registered customers can access customer features such as managing addresses, wishlist, cart, checking out, viewing their orders, and writing or editing reviews.
Only registered sellers can access seller features such as creating and managing their products, managing product images and variants, managing inventory history, and shipping order items.
Only approved sellers (as determined by administrator approval status) can have their products purchased through the platform.
Administrators must be able to access administrative features for approving/rejecting administrator-privilege requests, managing seller approvals, managing categories, and overseeing products and orders.
Customers can edit and delete only their own profile and addresses.
Customers can add, view, edit, and delete only their own wishlist items.
Customers can add, view, edit, and remove only their own cart items.
Sellers can edit and delete only products and variants they own.
Sellers can view snapshots of their own products.
Administrators can view snapshots of any product.
Sellers can delete a product only when the stated conditions about pending order items and pending cancellation/refund requests are satisfied.
Sellers can delete a variant only when the stated conditions about pending order items and pending cancellation/refund requests are satisfied.
Cancellation approval/rejection and refund approval/rejection must be available to the seller responsible for the corresponding order item.
Customers can request cancellation for individual paid, not-yet-shipped order items only for their own orders.
Customers can request refunds for individual delivered order items only for their own orders.
Customers can edit or delete their own reviews only for reviews they wrote.
Administrators can delete any product for policy violations, and product snapshots must remain preserved for dispute resolution.
Administrators can force-cancel or force-refund individual items or entire orders, and the resulting stock restoration must apply accordingly.
Administrators can ban customers so they cannot log in; banned customers must not be able to access account-specific features.
Administrators can ban sellers so they cannot log in; banned sellers must not be able to create or edit products, while existing order processing must remain possible.
Administrators can suspend sellers; suspended sellers must have products hidden from search and category listings and cannot create or edit products, while still processing existing orders.


### Data Isolation in Multi-Party Workflows

In product search and category browsing, the system must ensure customers only see products that are not hidden due to deletion or seller suspension.
When a product is deleted by the seller, the product must no longer appear in search or category listings for customers.
When a seller is suspended, the system must hide that seller’s products from search and category listings.
When a variant is out of stock or deleted, it must not be addable to cart.
When items are added to cart, the cart must reference specific variants owned by the respective sellers and must not expose other sellers’ inventory data.
When an order is created, order items must be grouped into shipments by seller so that shipments carry the correct items for each seller.
Shipping tracking information must be accessible to the purchasing customer for shipments that belong to the customer’s order, and to the responsible seller for shipments that include that seller’s items.
Cancellation requests and refund requests must be isolated to the corresponding order item; customers and sellers must only see requests related to items they own in the workflow.
When a cancellation request or refund request is approved or rejected, the snapshot created for that request must preserve the state change for dispute resolution without exposing unrelated customer or seller data.
When a seller creates shipments, only items selected for that shipment must move to “shipped”; items in other shipments must not be affected.
When the customer confirms delivery for a shipment, only the items included in that shipment must change to “delivered”.
If delivery confirmation does not occur within the specified period, the items in the shipment must automatically change to “delivered”, while other shipments remain unaffected.


## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-delete handling and visibility rules

- The system must support soft-delete for editable business content where applicable, so that deleted content is no longer shown in normal customer or seller browsing.
- When a customer deletes their account, the customer’s profile information must be removed from customer profile views, while the customer’s orders and order history must remain available for order records and legal/seller-side needs.
- When a customer deletes their account, any reviews previously written by that customer must remain stored for product rating history, but must be displayed as “deleted user” when shown to other users.
- When a seller deletes their account, the seller’s products must be removed from product listings so they no longer appear in search or category listings.
- When a seller deletes their account, order history and order snapshots required for past transactions must remain available for dispute resolution and seller record consistency, including the shop name used in past orders.
- When a seller deletes a product, the product must be removed from product browsing and search results.
- When a product is deleted, its related wishlists must be updated so the deleted product is automatically removed from all wishlists.
- When a seller deletes a product image, that image must no longer be shown as part of the product’s current images; image changes must be preserved through the snapshot principle.
- When a seller deletes a variant, that variant must be unavailable for purchase and cannot be added to cart, and it must be treated as unavailable in product details.
- Snapshots used to preserve historical states must be immutable and must remain viewable by relevant parties (owners and administrators) for dispute resolution, even after the source content is deleted.
- The system must distinguish between account suspension/ban and deletion: suspension/ban must not remove existing order history or snapshots, and it must not perform the retention behavior intended for deletion.

### Retention of historical records and snapshots

- The system must retain order history records after customer account deletion, so that customers (where permitted by access rules) and other relevant parties can review past orders.
- The system must retain the snapshots created at edit or transactional time for all supported snapshot-enabled concepts, including:
  - Products and product variants at edit time
  - Seller profile snapshots created when seller profile information is edited
  - Order item snapshots that preserve product and variant details at purchase time
  - Order item seller profile snapshots that preserve the shop name and logo at purchase time
  - Review history created through review edits
  - Cancellation request state and refund request state snapshots created when the seller responds
- Snapshots must continue to be available for viewing by relevant parties (owners and administrators) after any associated source content is deleted.
- Inventory history records used to calculate current stock must be retained as the authoritative history of stock changes.
- When an item is cancelled or refunded and stock is restored, the resulting stock change must be recorded in inventory history, and the history must remain viewable to the seller for the relevant variant.
- The system must ensure that “deleted” records do not break historical calculations and dispute viewing, meaning retained records must still be consistent with the snapshot principle.

### Recovery expectations after deletion

- The system must define and support recovery behavior that aligns with the platform’s snapshot principle: while editable content may be removed from normal listings after deletion, the system must allow relevant parties to view the immutable snapshots that preserve prior states.
- If a seller or product is deleted, the system must not require recovery of current listing data to resolve disputes; instead, it must rely on viewing the preserved snapshots for dispute resolution.
- If a review is deleted, the system must keep the review snapshot history so the product’s average rating calculation excludes deleted reviews while dispute viewing can still rely on stored historical review information.
- For wishlists, when products are deleted, the system must automatically remove the affected wishlist items; recovery of deleted products in wishlists must not re-add the removed product after it is deleted.
- If a cancellation request or refund request state is reached and then the related higher-level entities are deleted later, the system must still preserve the snapshot of the request state for dispute resolution.

### Permanent deletion boundaries and triggers

- The system must support permanent deletion only where the user requirements explicitly describe irreversible removal (e.g., a product being deleted so it no longer appears in listings; a customer account deletion removing profile information; a seller deletion removing products from listings).
- The system must ensure that permanent deletion does not violate the snapshot principle: snapshots must remain immutable and must not be permanently deleted.
- The system must ensure that permanent deletion of a customer profile does not remove orders and order history, including the snapshots needed for order record consistency.
- The system must ensure that permanent deletion of a seller account does not permanently delete order history and snapshots needed to preserve the shop name used at purchase time.
- The system must ensure that any “permanent-deletion” outcome never deletes historical snapshots required for cancellation/refund dispute resolution.
- The system must ensure that the platform’s user-facing “deleted” states are consistent with the operational behavior: deleted products become unavailable for browsing and purchase; deleted reviews are shown as “deleted user”; and deleted wishlisted products are removed from wishlists.