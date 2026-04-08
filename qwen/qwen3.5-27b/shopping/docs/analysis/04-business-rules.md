**shoppingMall — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Customer Rules

Customers must register with email and password to use any platform features, as guest browsing is not allowed. Email and password are required credentials for both registration and login. Customers can change their password at any time to maintain account security. When a customer deletes their account, their profile information including display name and phone number is permanently removed from the system. However, their order history and order details are preserved for seller records and legal compliance purposes. Reviews written by deleted customers remain visible but are attributed to "deleted user" instead of their original name. This preservation ensures transaction records remain intact while respecting the customer's request to remove personal information.

### Customer Registration and Authentication

**Registration Requirements**

THE system SHALL require customers to register with an email address and password before accessing any platform features.

THE system SHALL reject registration attempts where the email address is missing or invalid.

THE system SHALL reject registration attempts where the password is missing or does not meet minimum security requirements.

THE system SHALL reject registration if the email address is already registered to another account.

**Authentication Rules**

THE system SHALL require customers to authenticate using their registered email and password to access their account.

THE system SHALL reject login attempts with incorrect email or password credentials.

THE system SHALL allow customers to change their password at any time after successful authentication.

THE system SHALL require customers to provide their current password when changing to a new password.

**Error Conditions**

IF the email address format is invalid, THEN THE system SHALL reject the registration and display an error message.

IF the password does not meet minimum requirements, THEN THE system SHALL reject the registration and display an error message.

IF the email address is already registered, THEN THE system SHALL reject the registration and inform the customer.

IF the login credentials are incorrect, THEN THE system SHALL reject the login attempt without revealing which credential was wrong.

### Account Deletion and Data Retention

**Deletion Policy**

THE system SHALL allow customers to delete their account at any time.

WHEN a customer deletes their account, THE system SHALL permanently remove their profile information including display name and phone number.

WHEN a customer deletes their account, THE system SHALL preserve all order history and order details for seller records and legal compliance.

THE system SHALL preserve order information including purchased products, quantities, prices, shipping addresses, and transaction dates even after customer account deletion.

**Legal Record Retention**

THE system SHALL retain order records indefinitely to support seller business operations and legal requirements.

THE system SHALL maintain complete order snapshots including product details, variant information, and seller profiles at the time of purchase.

THE system SHALL preserve inventory records associated with completed orders for audit and dispute resolution purposes.

**Error Conditions**

IF a customer attempts to access their account after deletion, THEN THE system SHALL reject the login attempt.

IF a customer requests account deletion while having active orders, THEN THE system SHALL allow the deletion but preserve all order data.

THE system SHALL NOT allow deleted accounts to be reactivated or restored.

### Review Attribution After Account Deletion

**Review Preservation Rules**

WHEN a customer deletes their account, THE system SHALL preserve all reviews written by that customer.

THE system SHALL display reviews from deleted accounts with the attribution "deleted user" instead of the customer's original display name.

THE system SHALL maintain the original rating value and text content of reviews from deleted accounts.

THE system SHALL include reviews from deleted accounts in the product's average rating calculation.

**Deleted User Display**

THE system SHALL show "deleted user" as the reviewer name on product detail pages for reviews from deleted accounts.

THE system SHALL NOT display any identifying information from deleted customer accounts in review listings.

THE system SHALL preserve the review creation date and any edit history in snapshots even after account deletion.

**Error Conditions**

IF a deleted customer attempts to edit or delete their reviews, THEN THE system SHALL reject the request since the account no longer exists.

THE system SHALL NOT allow reviews to be reattributed to a different customer after the original author's account is deleted.

## Seller Rules

Sellers must sign up with email and password credentials to access the platform. Seller accounts require administrator approval before they can begin selling products. Sellers can view their approval status which can be pending, approved, or rejected. If a seller application is rejected, they can view the rejection reason provided by the administrator. Rejected sellers have the ability to submit a new registration request for reconsideration. Sellers can only delete their account if they have no pending orders with paid or shipped status. Additionally, sellers cannot delete their account if there are pending cancellation or refund requests associated with their products. When a seller deletes their account, their products are removed from listings but order history and snapshots are preserved for record-keeping purposes. The shop name from past orders is maintained to ensure order integrity.

### Seller Registration and Approval

WHEN a seller registers on the platform, THE system SHALL require email and password credentials.

WHEN a seller completes registration, THE system SHALL set the account status to pending until administrator approval.

WHEN a seller logs in, THE system SHALL display the current approval status (pending, approved, or rejected).

WHEN a seller's registration is rejected, THE system SHALL display the rejection reason provided by the administrator.

WHEN a seller's registration is rejected, THE system SHALL allow the seller to submit a new registration request.

WHILE a seller account is in pending status, THE system SHALL prevent the seller from creating or listing products.

WHILE a seller account is approved, THE system SHALL allow the seller to create and manage products.

WHILE a seller account is rejected, THE system SHALL prevent the seller from selling until a new registration is approved.

### Account Deletion Restrictions

IF a seller has order items with paid status, THEN THE system SHALL prevent account deletion.

IF a seller has order items with shipped status, THEN THE system SHALL prevent account deletion.

IF a seller has pending cancellation requests for their products, THEN THE system SHALL prevent account deletion.

IF a seller has pending refund requests for their products, THEN THE system SHALL prevent account deletion.

WHEN a seller requests account deletion, THE system SHALL validate all pending orders and requests before proceeding.

IF all deletion restrictions are satisfied, THEN THE system SHALL allow the seller to delete their account.

### Account Deletion Consequences

WHEN a seller deletes their account, THE system SHALL remove all their products from search and category listings.

WHEN a seller deletes their account, THE system SHALL preserve all order history associated with their products.

WHEN a seller deletes their account, THE system SHALL preserve all product and variant snapshots for dispute resolution.

WHEN a seller deletes their account, THE system SHALL preserve the shop name in past order records.

WHEN a seller deletes their account, THE system SHALL preserve the shop logo in past order records.

WHEN a seller deletes their account, THE system SHALL maintain order item snapshots showing the product state at purchase time.

## Administrator Rules

Any user, whether customer or seller, can submit a request to become an administrator by providing a reason for the request. Super administrators can view the list of pending administrator requests and decide whether to approve or reject them. When a request is approved, the user becomes a regular administrator with platform management capabilities. The system maintains two administrator grades: regular administrator and super administrator. Super administrators have the authority to promote regular administrators to super administrator status. Super administrators can also demote other super administrators to regular administrator level. However, super administrators cannot demote themselves, ensuring there is always at least one super administrator with full privileges. This grade system allows for flexible administrative oversight while maintaining a clear hierarchy of authority.

### Administrator Request Submission

WHEN a customer or seller wants to become an administrator, THE shopping mall platform SHALL allow them to submit an administrator request.

THE shopping mall platform SHALL require a reason text to be provided when submitting an administrator request.

IF the reason text is empty or missing, THEN THE shopping mall platform SHALL reject the administrator request submission.

THE shopping mall platform SHALL associate the administrator request with the user who submitted it.

### Super Administrator Approval

WHEN an administrator request is submitted, THE shopping mall platform SHALL make it visible to super administrators in a pending requests list.

THE shopping mall platform SHALL allow super administrators to view the reason provided by the user requesting administrator status.

THE shopping mall platform SHALL allow super administrators to approve administrator requests.

THE shopping mall platform SHALL allow super administrators to reject administrator requests.

IF a super administrator approves an administrator request, THEN THE shopping mall platform SHALL grant the user regular administrator status.

IF a super administrator rejects an administrator request, THEN THE shopping mall platform SHALL maintain the user's current role without administrator privileges.

### Administrator Grade System

THE shopping mall platform SHALL maintain two administrator grades: regular administrator and super administrator.

THE shopping mall platform SHALL assign regular administrator grade to users when their administrator request is approved.

THE shopping mall platform SHALL allow super administrators to promote regular administrators to super administrator grade.

THE shopping mall platform SHALL allow super administrators to demote other super administrators to regular administrator grade.

IF a super administrator attempts to demote themselves, THEN THE shopping mall platform SHALL prevent the self-demotion action.

THE shopping mall platform SHALL ensure at least one super administrator always exists in the system.

### Super Administrator Authority

THE shopping mall platform SHALL allow super administrators to view all pending administrator requests.

THE shopping mall platform SHALL allow super administrators to approve or reject any administrator request.

THE shopping mall platform SHALL allow super administrators to promote any regular administrator to super administrator status.

THE shopping mall platform SHALL allow super administrators to demote any other super administrator to regular administrator status.

THE shopping mall platform SHALL prevent super administrators from demoting themselves.

THE shopping mall platform SHALL maintain a clear hierarchy where super administrators have authority over regular administrators.

### Regular Administrator Limitations

THE shopping mall platform SHALL prevent regular administrators from approving or rejecting administrator requests.

THE shopping mall platform SHALL prevent regular administrators from promoting other administrators to super administrator status.

THE shopping mall platform SHALL prevent regular administrators from demoting super administrators.

THE shopping mall platform SHALL require regular administrators to have their administrator request approved by a super administrator before gaining any administrative privileges.

## Address Rules

Customers can add multiple shipping addresses to their account for flexible order delivery options. Each address must include recipient name, phone number, street address, city, state or province, postal code, and country. All address fields are required to ensure successful delivery of orders. Customers can edit their existing addresses to update any of the address information. Customers can delete addresses they no longer need from their account. Each customer can set one address as their default shipping address, which will be automatically selected during checkout. The default address streamlines the checkout process by reducing the number of selections customers need to make. Having multiple addresses allows customers to ship orders to different locations such as home, work, or gift recipients.

### Multiple Address Support

THE shopping mall platform SHALL allow customers to add multiple shipping addresses to their account. This capability enables customers to ship orders to different locations such as home, work, or gift recipients. Each address is stored independently and can be selected during checkout. There is no limit specified on the number of addresses a customer can maintain.

### Address Field Requirements

THE shopping mall platform SHALL require all address fields to be completed before an address can be saved. Each address must include the following required fields: recipient name, phone number, street address, city, state or province, postal code, and country. IF any required field is missing, THEN THE system SHALL reject the address creation or update request. The recipient name identifies who will receive the package. The phone number enables delivery personnel to contact the recipient if needed. The street address specifies the exact delivery location. The city identifies the municipal area. The state or province identifies the regional area. The postal code enables precise mail routing. The country identifies the destination nation.

### Default Address Selection

THE shopping mall platform SHALL allow each customer to designate one address as their default shipping address. THE default address SHALL be automatically selected during checkout to streamline the ordering process. Customers can change which address is set as default at any time. IF a customer has no default address set, THEN THE system SHALL require them to select an address during checkout. THE system SHALL prevent customers from setting more than one default address at the same time.

### Address Editing Rules

THE shopping mall platform SHALL allow customers to edit any of their existing addresses. Customers can modify any field including recipient name, phone number, street address, city, state or province, postal code, and country. When an address is edited, THE system SHALL validate that all required fields are still present. IF the edited address is the default address, THEN THE system SHALL preserve its default status after the update. Address edits do not affect orders that have already been placed using that address.

### Address Deletion Rules

THE shopping mall platform SHALL allow customers to delete addresses they no longer need. IF a customer attempts to delete their only address, THEN THE system SHALL reject the deletion request and require at least one address to remain. IF a customer attempts to delete their default address, THEN THE system SHALL require them to select a different default address first. Address deletion does not affect orders that have already been placed using that address. Deleted addresses are permanently removed from the customer's account.

### Address Validation Error Conditions

IF a customer submits an address with missing required fields, THEN THE system SHALL reject the request and indicate which fields are missing. IF a customer attempts to set a non-existent address as default, THEN THE system SHALL reject the request. IF a customer attempts to delete an address that is currently set as default without first selecting a new default, THEN THE system SHALL reject the deletion and require default address reassignment. IF a customer attempts to delete their last remaining address, THEN THE system SHALL reject the deletion and require retention of at least one address.

## Category Rules

Products are organized into categories to help customers browse and find items efficiently. Categories can have subcategories with only one level of nesting allowed, meaning subcategories cannot have their own subcategories. Each category must have a name and description to help customers understand what products belong to it. Categories are created and managed exclusively by administrators, not by sellers or customers. This centralized management ensures consistent categorization across the platform. Customers can browse the complete list of all categories available on the platform. Customers can view products that belong to a specific category. When administrators delete a category, products that were in that category become uncategorized but remain in the system. This prevents product loss while allowing category structure changes.

### Category Structure Requirements

WHEN creating a category, THE system SHALL require a category name to be provided.

WHEN creating a category, THE system SHALL require a category description to be provided.

WHEN creating a subcategory, THE system SHALL allow only one level of nesting (subcategories cannot have their own subcategories).

WHEN a subcategory is created, THE system SHALL link it to exactly one parent category.

WHEN viewing category structure, THE system SHALL display the hierarchical relationship between categories and subcategories.

IF a category name is missing during creation, THEN THE system SHALL reject the request.

IF a category description is missing during creation, THEN THE system SHALL reject the request.

IF a subcategory is assigned to another subcategory as its parent, THEN THE system SHALL reject the request.

### Category Management Rules

WHEN managing categories, THE system SHALL restrict category creation to administrators only.

WHEN managing categories, THE system SHALL restrict category editing to administrators only.

WHEN managing categories, THE system SHALL restrict category deletion to administrators only.

IF a non-administrator attempts to create a category, THEN THE system SHALL reject the request.

IF a non-administrator attempts to edit a category, THEN THE system SHALL reject the request.

IF a non-administrator attempts to delete a category, THEN THE system SHALL reject the request.

WHEN an administrator edits a category name, THE system SHALL update the category with the new name.

WHEN an administrator edits a category description, THE system SHALL update the category with the new description.

### Category Browsing and Product Listing

WHEN browsing categories, THE system SHALL display all available categories to customers.

WHEN viewing a category, THE system SHALL show the category name and description.

WHEN viewing a category, THE system SHALL display all products belonging to that category.

WHEN viewing a subcategory, THE system SHALL display only products directly assigned to that subcategory.

WHEN listing products in a category, THE system SHALL paginate the results for large product sets.

WHEN a product is assigned to a category, THE system SHALL include it in that category's product listing.

WHEN a product is assigned to a subcategory, THE system SHALL include it in that subcategory's product listing.

### Category Deletion and Product Retention

WHEN an administrator deletes a category, THE system SHALL preserve all products that were in that category.

WHEN an administrator deletes a category, THE system SHALL remove the category assignment from all products in that category.

WHEN a category is deleted, THE system SHALL mark affected products as uncategorized.

WHEN products become uncategorized due to category deletion, THE system SHALL retain them in the system.

WHEN products become uncategorized, THE system SHALL prevent them from appearing in category-based browsing.

IF a category has products assigned to it, THEN THE system SHALL allow deletion but remove category assignments from products.

WHEN a subcategory is deleted, THE system SHALL preserve products in that subcategory and mark them as uncategorized.

## Product Rules

Sellers can create products to list for sale on the platform. Every product must have a name, description, category, and base price, all of which are required fields. Products automatically belong to the seller who created them. Sellers can edit their own products to update information as needed. Every edit to a product creates a snapshot to preserve the previous state for dispute resolution. Sellers can only delete their own products if there are no pending order items with paid or shipped status for any variant of that product. Additionally, products cannot be deleted if there are pending cancellation or refund requests for any variant. When a product is deleted, all its variants and inventory records are also deleted. Deleted products no longer appear in search results or category listings. However, product snapshots are preserved even after deletion for record-keeping purposes.

### Product Creation Requirements

WHEN a seller creates a product, THE system SHALL require the product name to be provided. A product cannot be created without a name.

WHEN a seller creates a product, THE system SHALL require the product description to be provided. A product cannot be created without a description.

WHEN a seller creates a product, THE system SHALL require the seller to assign a category to the product. A product cannot be created without a category assignment.

WHEN a seller creates a product, THE system SHALL require the seller to specify a base price. A product cannot be created without a base price.

IF a seller attempts to create a product without providing a name, THEN THE system SHALL reject the creation request.

IF a seller attempts to create a product without providing a description, THEN THE system SHALL reject the creation request.

IF a seller attempts to create a product without assigning a category, THEN THE system SHALL reject the creation request.

IF a seller attempts to create a product without specifying a base price, THEN THE system SHALL reject the creation request.

### Product Ownership and Editing

WHEN a product is created, THE system SHALL automatically assign ownership to the seller who created it. Product ownership cannot be transferred to another seller.

WHILE a seller owns a product, THE system SHALL allow that seller to edit the product's name, description, category, and base price.

WHEN a seller edits any field of their product, THE system SHALL create a snapshot preserving the previous state of the product. This snapshot records when the change was made, what was changed, and the values before and after.

IF a seller attempts to edit a product they do not own, THEN THE system SHALL reject the edit request.

IF an administrator attempts to edit a product, THEN THE system SHALL allow the edit regardless of ownership.

WHEN a product is edited, THE system SHALL include all product fields in the snapshot, including name, description, category, base price, and associated images.

### Product Deletion Rules

WHEN a seller attempts to delete their product, THE system SHALL check for pending order items with paid or shipped status for any variant of the product. IF such order items exist, THEN THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their product, THE system SHALL check for pending cancellation requests for any variant of the product. IF such requests exist, THEN THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their product, THE system SHALL check for pending refund requests for any variant of the product. IF such requests exist, THEN THE system SHALL reject the deletion request.

IF a seller attempts to delete a product they do not own, THEN THE system SHALL reject the deletion request.

IF an administrator attempts to delete a product, THEN THE system SHALL allow the deletion regardless of pending orders or requests.

WHEN a product is deleted, THE system SHALL automatically delete all variants associated with that product.

WHEN a product is deleted, THE system SHALL automatically delete all inventory records associated with the product's variants.

WHEN a product is deleted, THE system SHALL remove the product from all search results.

WHEN a product is deleted, THE system SHALL remove the product from all category listings.

WHEN a product is deleted, THE system SHALL preserve all snapshots of that product. Snapshots remain accessible to the seller and administrators for dispute resolution.

IF a customer has a deleted product in their wishlist, THEN THE system SHALL automatically remove it from their wishlist.

IF a customer has a deleted variant in their cart, THEN THE system SHALL mark that cart item as unavailable.

## ProductImage Rules

Sellers can upload multiple images for each product to showcase items from different angles or highlight features. The first image in the list serves as the main or thumbnail image displayed in product listings. Sellers can reorder images to control which image appears first and how others are sequenced. Sellers can delete images from their products if they want to remove outdated or unwanted photos. When images are added, removed, or reordered, these changes are included in product snapshots. This ensures the complete visual presentation of the product at any point in time is preserved. Image changes are tracked alongside other product modifications to maintain accurate historical records for dispute resolution and order verification.

### Multiple Image Upload and Thumbnail Selection

Sellers can upload multiple images for each product to showcase items from different angles or highlight features. The first image in the display order serves as the main or thumbnail image. The thumbnail image is displayed in product listings, search results, and category browsing pages. Sellers can add images at any time after product creation. There is no specified limit on the number of images a seller can upload per product.

### Image Reordering Rules

Sellers can reorder images to control the display sequence on the product detail page. When images are reordered, the new first image in the sequence becomes the thumbnail image. Reordering affects how images are displayed to customers browsing the product. Sellers can move any image to any position in the sequence. The reordering capability allows sellers to prioritize their best product photos as the thumbnail.

### Image Deletion Rules

Sellers can delete images from their products if they want to remove outdated or unwanted photos. When the thumbnail image is deleted, the next image in the sequence automatically becomes the new thumbnail. If no other images exist after deletion, the product will have no thumbnail displayed. Sellers can delete any number of images from their products. Deleted images cannot be recovered through the system interface.

### Image Change Snapshots and History

When images are added, removed, or reordered, these changes are included in product snapshots. The product snapshot preserves the complete visual presentation of the product at the time of modification. Image changes are tracked alongside other product modifications to maintain accurate historical records. Snapshots record which images were present, their order, and which image served as the thumbnail at the time of the change. This image history is preserved for dispute resolution and order verification purposes. Even after product deletion, image snapshots remain accessible to relevant parties for historical reference.

## ProductVariant Rules

A product can have multiple variants to represent different option combinations such as color and size. Each variant must have a unique SKU code that identifies it across the platform. Variants include option values that describe the specific combination, such as color Red and size Large. Each variant has its own price that can override the product base price, or it can use the base price if no override is set. Every variant must have a stock quantity that starts at zero when created. Sellers can add variants to their products to offer more options to customers. Sellers can edit variant information including SKU code, option values, and price. Every variant edit creates a snapshot to preserve the previous state. Sellers can only delete variants if there are no pending order items with paid or shipped status for that variant. Variants also cannot be deleted if there are pending cancellation or refund requests. A product must have at least one variant to be purchasable by customers. Products with no variants are still visible in search results but are shown as unavailable for purchase.

### Variant SKU Code Rules

THE shopping mall SHALL require each product variant to have a unique SKU code.

THE shopping mall SHALL ensure SKU codes are unique across all variants within the same product.

THE shopping mall SHALL reject variant creation if the SKU code already exists for another variant of the same product.

THE shopping mall SHALL reject variant updates if the new SKU code conflicts with an existing variant's SKU code.

WHEN a seller attempts to create a variant without a SKU code, THE shopping mall SHALL reject the request.

WHEN a seller attempts to edit a variant's SKU code, THE shopping mall SHALL validate uniqueness before allowing the change.

### Variant Option Values Rules

THE shopping mall SHALL require each variant to define option values that describe the specific combination it represents.

THE shopping mall SHALL allow option values to include attributes such as color, size, or other product-specific characteristics.

THE shopping mall SHALL allow sellers to define custom option names and values for their products.

THE shopping mall SHALL display option values to customers to help them identify the correct variant.

THE shopping mall SHALL preserve option values in snapshots when variants are edited.

### Variant Pricing Rules

THE shopping mall SHALL allow each variant to have its own price that can override the product base price.

THE shopping mall SHALL permit variants to use the product base price if no specific price is set.

THE shopping mall SHALL allow sellers to set different prices for different variants of the same product.

THE shopping mall SHALL display the variant-specific price to customers when browsing products.

THE shopping mall SHALL use the variant price in cart calculations and order totals.

THE shopping mall SHALL preserve the price at the time of purchase in order item snapshots.

### Variant Stock Quantity Rules

THE shopping mall SHALL require each variant to have a stock quantity when created.

THE shopping mall SHALL initialize variant stock quantity to zero when first created.

THE shopping mall SHALL calculate current stock by summing all inventory history records for the variant.

THE shopping mall SHALL display stock status to customers (in stock or out of stock).

THE shopping mall SHALL prevent customers from adding out of stock variants to their cart.

THE shopping mall SHALL warn customers when cart quantity exceeds available stock.

THE shopping mall SHALL mark variants as unavailable in the cart when stock reaches zero.

### Variant Creation and Editing Rules

THE shopping mall SHALL allow sellers to add variants to their own products.

THE shopping mall SHALL allow sellers to edit variant information including SKU code, option values, and price.

WHEN a seller edits a variant, THE shopping mall SHALL create a snapshot to preserve the previous state.

THE shopping mall SHALL record the timestamp and values before and after each variant edit.

THE shopping mall SHALL preserve variant snapshots even after the variant is deleted.

THE shopping mall SHALL allow sellers to view snapshots of their own variants.

THE shopping mall SHALL allow administrators to view snapshots of any variant.

### Variant Deletion Constraints

THE shopping mall SHALL prevent sellers from deleting variants that have pending order items with paid status.

THE shopping mall SHALL prevent sellers from deleting variants that have pending order items with shipped status.

THE shopping mall SHALL prevent sellers from deleting variants that have pending cancellation requests.

THE shopping mall SHALL prevent sellers from deleting variants that have pending refund requests.

IF a seller attempts to delete a variant with active orders, THE shopping mall SHALL reject the request.

IF a seller attempts to delete a variant with pending requests, THE shopping mall SHALL reject the request.

THE shopping mall SHALL preserve variant snapshots even after the variant is deleted.

### Product Purchasability Rules

THE shopping mall SHALL require products to have at least one variant to be purchasable.

THE shopping mall SHALL display products without variants as unavailable for purchase.

THE shopping mall SHALL allow products without variants to appear in search results.

THE shopping mall SHALL allow products without variants to appear in category listings.

THE shopping mall SHALL prevent customers from adding products without variants to their cart.

WHEN a seller deletes the last variant of a product, THE shopping mall SHALL mark the product as unavailable.

WHEN a seller adds a variant to a product with no variants, THE shopping mall SHALL make the product purchasable.

## InventoryRecord Rules

Each product variant maintains its own independent stock quantity. Stock quantity is managed through inventory history records rather than direct updates. Each inventory record contains the quantity change amount, the reason for the change, and a timestamp. Positive quantity changes represent restocking or inventory additions. Negative quantity changes represent orders placed, adjustments, or inventory losses. The current stock quantity is calculated by summing all inventory records for that variant. Sellers can add inventory to variants by creating restocking records with a quantity and reason. Sellers can subtract inventory through adjustment or loss records with a quantity and reason. When an order is placed, the system automatically creates a negative inventory record for each purchased variant. When an order is cancelled or refunded, the system automatically creates a positive inventory record to restore stock. When a variant's stock reaches zero, it is displayed as out of stock. Out of stock variants cannot be added to the shopping cart by customers.

### Stock Management and Inventory Records

THE system SHALL maintain independent stock quantities for each product variant.

THE system SHALL record all stock changes through inventory history records rather than direct quantity updates.

WHEN an inventory change occurs, THE system SHALL record the quantity change amount.

WHEN an inventory change occurs, THE system SHALL record the reason for the change.

WHEN an inventory change occurs, THE system SHALL record the timestamp of the change.

THE system SHALL calculate the current stock quantity by summing all inventory records for a variant.

THE system SHALL preserve all inventory history records indefinitely for audit purposes.

### Inventory Change Operations

WHEN a seller restocks a variant, THE system SHALL create an inventory record with a positive quantity change.

WHEN a seller adjusts inventory due to loss or correction, THE system SHALL create an inventory record with a negative quantity change.

THE system SHALL require sellers to provide a reason when adding inventory.

THE system SHALL require sellers to provide a reason when subtracting inventory.

THE system SHALL allow sellers to view the complete inventory history for each variant they own.

THE system SHALL prevent sellers from modifying or deleting existing inventory records.

THE system SHALL calculate current stock in real-time from all inventory records.

### Automatic Inventory Updates

WHEN an order is placed successfully, THE system SHALL automatically create a negative inventory record for each purchased variant.

WHEN an order item is cancelled, THE system SHALL automatically create a positive inventory record to restore the stock.

WHEN an order item is refunded, THE system SHALL automatically create a positive inventory record to restore the stock.

THE system SHALL process automatic inventory updates immediately upon order status changes.

THE system SHALL ensure inventory deductions occur before order confirmation is completed.

### Stock Status and Availability

WHEN a variant's stock quantity reaches zero, THE system SHALL display the variant as out of stock.

WHEN a variant is out of stock, THE system SHALL prevent customers from adding it to their cart.

THE system SHALL display real-time stock availability on product detail pages.

THE system SHALL show stock status for each variant individually.

WHEN a variant becomes available again, THE system SHALL immediately allow cart additions.

THE system SHALL warn customers if their cart quantity exceeds current stock availability.

## Wishlist Rules

Customers can add products to their wishlist to save items they are interested in purchasing later. The wishlist displays products rather than specific variants, allowing customers to bookmark products with multiple options. The wishlist is paginated to handle large collections efficiently. Customers can remove products from their wishlist when they no longer want to save them. If a seller deletes a product, that product is automatically removed from all customer wishlists. This ensures wishlists do not contain references to unavailable products. The wishlist feature helps customers track products they want to buy in the future without committing to a purchase immediately. Each customer has their own private wishlist that is not visible to other users.

### Product Addition and Storage Rules

THE system SHALL allow customers to add products to their wishlist.

THE system SHALL store products at the product level, not at the variant level, when adding to wishlist.

THE system SHALL associate each wishlist entry with the customer who added it.

THE system SHALL prevent duplicate products in the same customer's wishlist.

IF a customer attempts to add a product that is already in their wishlist, THEN THE system SHALL reject the addition.

IF a product does not exist, THEN THE system SHALL reject the addition request.

IF a product has been deleted by the seller, THEN THE system SHALL reject the addition request.

THE system SHALL record when a product was added to the wishlist.

### Wishlist Browsing and Removal Rules

THE system SHALL display wishlist items in paginated format.

THE system SHALL allow customers to view their own wishlist.

THE system SHALL allow customers to remove products from their wishlist.

IF a customer attempts to remove a product that is not in their wishlist, THEN THE system SHALL reject the removal request.

IF a customer attempts to view another customer's wishlist, THEN THE system SHALL reject the request.

THE system SHALL not display wishlist contents to other customers or sellers.

THE system SHALL not display wishlist contents to administrators.

### Automatic Removal and Integrity Rules

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

THE system SHALL maintain wishlist integrity by ensuring all wishlist entries reference existing products.

IF a product in a customer's wishlist becomes unavailable due to deletion, THEN THE system SHALL remove it from the wishlist.

THE system SHALL not preserve deleted products in wishlists.

THE system SHALL not notify customers when products are automatically removed from their wishlist due to deletion.

THE system SHALL ensure wishlist data remains consistent with product availability on the platform.

## Cart Rules

Customers can add product variants to their shopping cart, and must select a specific variant rather than just the product. When adding items to cart, customers specify the quantity they want to purchase. The cart displays each item with the product name, variant options, price, quantity, and subtotal. The cart shows the total price calculated from all items in the cart. Customers can change the quantity of items already in their cart. Customers can remove items from their cart if they decide not to purchase them. If a variant's available stock is less than the quantity in the cart, a warning is displayed to inform the customer. Cart items must be available to proceed to checkout. Unavailable items cannot be included in the checkout process.

### Cart Addition Rules

WHEN a customer adds an item to their cart, THE system SHALL require selection of a specific product variant rather than just the product.

WHEN a customer adds an item to their cart, THE system SHALL require specification of a quantity.

WHEN a customer adds a variant to their cart that already exists in the cart, THE system SHALL combine the quantities into a single cart item.

WHEN a customer attempts to add a variant to their cart, THE system SHALL reject the request if the variant is out of stock.

WHEN a customer attempts to add a variant to their cart, THE system SHALL reject the request if the variant has been deleted by the seller.

WHEN a customer attempts to add a variant to their cart, THE system SHALL reject the request if the requested quantity exceeds the available stock.

### Cart Display Rules

WHEN a customer views their cart, THE system SHALL display each cart item with the product name.

WHEN a customer views their cart, THE system SHALL display each cart item with the variant option values.

WHEN a customer views their cart, THE system SHALL display each cart item with the unit price.

WHEN a customer views their cart, THE system SHALL display each cart item with the quantity.

WHEN a customer views their cart, THE system SHALL display each cart item with the subtotal (unit price multiplied by quantity).

WHEN a customer views their cart, THE system SHALL display the total price calculated from all cart items.

### Cart Modification Rules

WHEN a customer modifies the quantity of a cart item, THE system SHALL update the quantity for that specific cart item.

WHEN a customer modifies the quantity of a cart item, THE system SHALL reject the request if the new quantity is zero or negative.

WHEN a customer modifies the quantity of a cart item, THE system SHALL reject the request if the new quantity exceeds the available stock.

WHEN a customer removes an item from their cart, THE system SHALL delete that cart item from the cart.

WHEN a customer removes an item from their cart, THE system SHALL update the cart total to reflect the removal.

### Stock Validation Rules

WHEN a variant's available stock is less than the quantity in a customer's cart, THE system SHALL display a warning to the customer.

WHEN a variant becomes out of stock while in a customer's cart, THE system SHALL mark that cart item as unavailable.

WHEN a variant is deleted by the seller while in a customer's cart, THE system SHALL mark that cart item as unavailable.

WHEN a cart item is marked as unavailable, THE system SHALL indicate the unavailability status to the customer.

### Checkout Validation Rules

WHEN a customer attempts to proceed to checkout, THE system SHALL verify that all cart items are available.

WHEN a customer attempts to proceed to checkout, THE system SHALL reject the request if any cart item is marked as unavailable.

WHEN a customer attempts to proceed to checkout, THE system SHALL exclude unavailable items from the checkout process.

WHEN a customer proceeds to checkout with available items, THE system SHALL allow the checkout process to continue.

## CartItem Rules

When the same variant is added to the cart multiple times, the quantities are combined into a single cart item rather than creating separate entries. This consolidation keeps the cart organized and prevents duplicate items. Customers can change the quantity of individual cart items as needed. Customers can remove specific items from their cart without affecting other items. If a variant becomes deleted or goes out of stock, it is marked as unavailable in the cart. Unavailable cart items are clearly identified so customers know they cannot be purchased. The system maintains cart item integrity by updating availability status when stock changes occur. This ensures customers have accurate information about what they can and cannot purchase.

### Quantity Combination on Duplicate

WHEN the same product variant is added to the cart multiple times, THE system SHALL combine the quantities into a single cart item rather than creating duplicate entries.

IF a cart item for a variant already exists, THEN THE system SHALL increase the existing quantity instead of creating a new cart item.

THE system SHALL maintain only one cart item per variant in the cart.

THE system SHALL display the consolidated quantity for each variant in the cart view.

### Single Item Consolidation

THE system SHALL consolidate duplicate variant additions into a single cart item.

THE system SHALL prevent multiple cart items for the same variant from existing simultaneously.

THE cart SHALL display each variant exactly once, regardless of how many times it was added.

THE system SHALL calculate the subtotal for a consolidated cart item using the current quantity and the variant's price.

### Individual Quantity Change

THE system SHALL allow customers to modify the quantity of individual cart items.

WHEN a cart item quantity is modified, THE system SHALL recalculate the item's subtotal.

WHEN a cart item quantity is modified, THE system SHALL recalculate the cart's total price.

### Individual Item Removal

THE system SHALL allow customers to remove individual cart items.

WHEN a cart item is removed, THE system SHALL permanently delete it from the cart.

WHEN a cart item is removed, THE system SHALL recalculate the cart's total price.

### Deletion Unavailability Marking

WHEN a product variant is deleted by the seller, THE system SHALL mark the corresponding cart item as unavailable.

IF a cart item references a deleted variant, THEN THE system SHALL prevent it from being included in checkout.

THE system SHALL display unavailable cart items distinctly from available items in the cart view.

THE system SHALL preserve deleted variant cart items in the cart until the customer removes them.

### Out of Stock Unavailability Marking

WHEN a product variant's stock quantity reaches zero, THE system SHALL mark the corresponding cart item as unavailable.

IF a cart item's quantity exceeds the variant's available stock, THEN THE system SHALL display a warning to the customer.

IF a variant is out of stock, THEN THE system SHALL prevent the corresponding cart item from being included in checkout.

THE system SHALL display out-of-stock cart items distinctly from available items in the cart view.

### Availability Status Tracking

THE system SHALL continuously monitor variant availability for all cart items.

WHEN a variant's stock level changes, THE system SHALL update the corresponding cart item's availability status.

WHEN an out-of-stock variant is restocked, THE system SHALL mark the corresponding cart item as available.

THE system SHALL maintain accurate availability status for all cart items at all times.

### Cart Integrity Maintenance

THE system SHALL maintain cart item integrity by ensuring all cart items reference valid variants.

IF a cart item references an invalid variant, THEN THE system SHALL mark it as unavailable rather than silently removing it.

THE system SHALL prevent unavailable cart items from being included in checkout.

THE system SHALL require customers to remove all unavailable items before completing checkout.

THE system SHALL preserve cart item data until the customer explicitly removes it or completes checkout.

## Order Rules

An order contains one or more order items representing the products purchased. Each order item can be from a different seller, allowing customers to buy from multiple sellers in a single transaction. The overall order status is derived from the status of its individual items. If all items are paid, the order status is paid. If any item is shipped and none are delivered yet, the order status is shipped. If all items are delivered, the order status is delivered. If all items are cancelled, the order status is cancelled. If all items are refunded, the order status is refunded. When items have mixed statuses such as some delivered and some refunded, the order status is partially completed. The shipping address selected at checkout cannot be changed after the order is placed. This ensures delivery information remains consistent throughout the order fulfillment process.

### Order Composition Rules

An order contains one or more order items representing the products purchased by the customer. Each order item represents a specific product variant with a quantity. If a customer purchases multiple units of the same variant, they are consolidated into a single order item with the combined quantity. Order items can originate from different sellers within the same order, enabling customers to purchase from multiple sellers in a single transaction. Each order item maintains its own independent status throughout the fulfillment process. When an order is placed, a snapshot of each product and its variant is preserved with the order item, capturing the product name, description, variant options, and price at the time of purchase. A snapshot of each seller's profile is also preserved with the order item, recording the shop name and logo at the time of purchase.

### Order Status Derivation Rules

The overall order status is derived from the status of all its individual order items. When all order items have a status of paid, the order status is paid. When any order item has a status of shipped and no items have a status of delivered, the order status is shipped. When all order items have a status of delivered, the order status is delivered. When all order items have a status of cancelled, the order status is cancelled. When all order items have a status of refunded, the order status is refunded. When order items have mixed statuses such as some delivered and some refunded, or some shipped and some cancelled, the order status is partially completed. The order status automatically updates whenever the status of any order item changes. If an order item is cancelled or refunded, the remaining items in the order continue processing according to their individual statuses.

### Shipping Address Rules

The shipping address selected by the customer during checkout cannot be modified after the order is placed. This immutability ensures delivery information remains consistent throughout the order fulfillment process. The shipping address is captured as a snapshot at the time of order placement and is preserved with the order record. If a customer needs to change their delivery address after placing an order, they must cancel the existing order and create a new order with the correct address. The shipping address snapshot includes all address components: recipient name, phone number, street address, city, state/province, postal code, and country.

## OrderItem Rules

Each order item represents a purchased product variant with a specific quantity. If a customer purchases multiple units of the same variant, they are combined into one order item with the total quantity. Order items have their own individual status independent of other items in the same order. Item statuses include paid, shipped, delivered, cancelled, and refunded. Each order item can be individually cancelled or refunded without affecting other items in the order. When an order is placed, a snapshot of each purchased product and variant is saved with the order item. This snapshot preserves the product name, description, variant options, and price at the time of purchase. A snapshot of each seller's profile is also saved, preserving the shop name and logo at the time of purchase. These snapshots ensure order items maintain accurate historical information even if products or sellers change later.

### Variant Quantity Representation

WHEN a customer purchases multiple units of the same product variant, THE system SHALL combine them into a single order item with the total quantity.

WHEN an order item is created, THE system SHALL record the quantity as the number of units purchased.

IF a customer attempts to add the same variant to an existing order item, THE system SHALL increase the quantity rather than creating a separate item.

The order item quantity represents the exact number of individual units of that variant purchased in that order.

### Item Status Definitions

WHEN an order item is created from a successful payment, THE system SHALL set the item status to "paid".

WHILE an order item status is "paid", THE item SHALL be in a state where payment is completed and awaiting shipment.

WHEN a seller creates a shipment containing an order item, THE system SHALL change the item status to "shipped".

WHILE an order item status is "shipped", THE item SHALL be in a state where it has been dispatched to the customer.

WHEN a customer confirms delivery for a shipment containing an order item, THE system SHALL change the item status to "delivered".

WHEN 14 days have elapsed since shipment without customer confirmation, THE system SHALL automatically change the item status to "delivered".

WHILE an order item status is "delivered", THE item SHALL be in a state where it has reached the customer.

WHEN a cancellation request for an order item is approved, THE system SHALL change the item status to "cancelled".

WHILE an order item status is "cancelled", THE item SHALL be in a state where the purchase has been voided.

WHEN a refund request for an order item is approved, THE system SHALL change the item status to "refunded".

WHILE an order item status is "refunded", THE item SHALL be in a state where the customer has received a refund.

### Individual Cancellation and Refund

WHEN a customer requests cancellation, THE system SHALL allow cancellation of individual order items rather than requiring entire order cancellation.

IF an order item status is "paid", THE customer SHALL be able to request cancellation for that specific item.

IF an order item status is "shipped", "delivered", "cancelled", or "refunded", THE customer SHALL NOT be able to request cancellation for that item.

WHEN an order item is cancelled, THE remaining order items in the same order SHALL continue processing normally without being affected.

WHEN a customer requests a refund, THE system SHALL allow refund requests for individual order items rather than requiring entire order refund.

IF an order item status is "delivered", THE customer SHALL be able to request a refund for that specific item.

IF more than 7 days have elapsed since an order item was delivered, THE customer SHALL NOT be able to request a refund for that item.

IF an order item status is "paid", "shipped", "cancelled", or "refunded", THE customer SHALL NOT be able to request a refund for that item.

WHEN an order item is refunded, THE remaining order items in the same order SHALL remain unaffected.

### Purchase Time State Preservation

WHEN an order is placed, THE system SHALL create a product snapshot for each order item.

The product snapshot SHALL preserve the product name, description, category, and base price at the time of purchase.

WHEN an order is placed, THE system SHALL create a variant snapshot for each order item.

The variant snapshot SHALL preserve the SKU code, option values, and price at the time of purchase.

WHEN an order is placed, THE system SHALL create a seller profile snapshot for each order item.

The seller profile snapshot SHALL preserve the shop name, shop description, and logo image at the time of purchase.

WHEN a product is edited after purchase, THE order item SHALL retain the original product snapshot and SHALL NOT reflect the changes.

WHEN a variant is edited after purchase, THE order item SHALL retain the original variant snapshot and SHALL NOT reflect the changes.

WHEN a seller profile is edited after purchase, THE order item SHALL retain the original seller profile snapshot and SHALL NOT reflect the changes.

The order item snapshots SHALL be immutable and SHALL preserve the exact state of the product, variant, and seller at the time of purchase for the lifetime of the order record.

## Shipment Rules

A shipment represents a physical package sent by a seller to a customer. A single shipment can contain one or more order items from the same seller. Different sellers always ship their items separately, creating different shipments. A seller has the flexibility to ship items individually or bundle multiple items into one shipment. When creating a shipment, sellers enter tracking information including the carrier name and tracking number. All items included in the same shipment share the same tracking information. When a shipment is created, all items in that shipment change their status to shipped. Customers can view tracking information for each shipment to monitor delivery progress. Customers confirm delivery on a per-shipment basis rather than per individual item. When a customer confirms delivery, all items in that shipment change to delivered status. If the customer does not confirm delivery, items automatically change to delivered status after 14 days from the shipping date.

### Shipment Package Definition

THE system SHALL define a shipment as a physical package sent by a seller to a customer.

THE system SHALL restrict each shipment to contain order items from a single seller only.

IF a shipment contains items from multiple sellers, THEN THE system SHALL reject the shipment creation.

THE system SHALL track each shipment independently with its own tracking information.

THE system SHALL require separate shipments for order items from different sellers.

### Seller Grouping Rules

THE system SHALL allow order items from the same seller to be grouped together into a single shipment.

THE system SHALL require order items from different sellers to be placed in separate shipments.

THE system SHALL create separate shipments automatically when a customer places an order with items from multiple sellers.

THE system SHALL allow sellers to ship their items individually as separate shipments.

THE system SHALL allow sellers to bundle multiple items into one shipment.

IF a seller attempts to include items from another seller in their shipment, THEN THE system SHALL reject the shipment creation.

### Multi-Item Shipment Support

THE system SHALL allow a single shipment to contain one or more order items.

THE system SHALL allow sellers to select one order item or multiple order items when creating a shipment.

THE system SHALL require all items selected for a shipment to belong to the same seller.

THE system SHALL ship all items included in a shipment together in the same physical package.

THE system SHALL allow sellers to create multiple shipments for their items, shipping some items together and others separately.

### Tracking Information Requirements

THE system SHALL require sellers to provide a carrier name when creating a shipment.

THE system SHALL require sellers to provide a tracking number when creating a shipment.

IF the carrier name is missing during shipment creation, THEN THE system SHALL reject the shipment.

IF the tracking number is missing during shipment creation, THEN THE system SHALL reject the shipment.

THE system SHALL assign the same carrier name and tracking number to all items included in the same shipment.

THE system SHALL maintain independent tracking information for different shipments.

THE system SHALL allow customers to view the tracking information for each shipment in their order details.

### Shipment Creation Status Rules

WHEN a shipment is created, THE system SHALL immediately change the status of all order items included in that shipment to shipped.

IF a seller attempts to add items to a shipment after the shipment is created, THEN THE system SHALL reject the addition.

IF an order item does not have paid status, THEN THE system SHALL prevent it from being included in a new shipment.

IF an order item has shipped, delivered, cancelled, or refunded status, THEN THE system SHALL prevent it from being included in a new shipment.

WHEN items are marked as shipped through shipment creation, THE system SHALL prevent reverting their status to paid.

### Delivery Confirmation Rules

THE system SHALL allow customers to confirm delivery on a per-shipment basis, not on a per-item basis.

WHEN a customer confirms delivery for a shipment, THE system SHALL change the status of all order items in that shipment to delivered simultaneously.

IF a customer attempts to confirm delivery for individual items within a shipment, THEN THE system SHALL reject the request.

WHEN 14 days pass from the shipping date without customer confirmation, THE system SHALL automatically change all items in the shipment to delivered status.

THE system SHALL calculate the 14-day automatic delivery period from the date the shipment was created, not from the order date.

WHEN items are marked as delivered either by customer confirmation or automatic process, THE system SHALL prevent reverting their status to shipped.

## Review Rules

Customers can write reviews for products they have purchased on the platform. A review can only be written after the order item status is delivered, ensuring customers have received the product. Customers can write one review per product per order, preventing multiple reviews for the same purchase. Each review must include a rating from one to five stars. The review text content is optional, allowing customers to provide just a rating if they prefer. Reviews are displayed on the product detail page for other customers to see. Reviews are sorted by newest first so recent feedback appears at the top. Customers can edit their own reviews to update their feedback. Every review edit creates a snapshot to preserve the previous version. Customers can delete their own reviews, but the snapshots are preserved for record-keeping. The product's average rating is calculated from all non-deleted reviews only.

### Review Eligibility Requirements

WHEN a customer attempts to write a review, THE system SHALL verify that the customer has purchased the product from the platform.

WHEN a customer attempts to write a review, THE system SHALL verify that the order item status is delivered.

IF the order item status is not delivered, THEN THE system SHALL reject the review creation request.

WHEN a customer writes a review for a product in an order, THE system SHALL allow only one review per product per order.

IF a customer already has a review for the same product in the same order, THEN THE system SHALL reject any additional review creation for that product in that order.

IF a customer attempts to write a review for a product they have not purchased, THEN THE system SHALL reject the review creation request.

### Review Content Validation Rules

WHEN a customer creates a review, THE system SHALL require a rating between one and five stars.

IF the rating is less than one or greater than five, THEN THE system SHALL reject the review creation request.

WHEN a customer creates a review, THE system SHALL allow the text content to be optional.

IF a customer provides no text content, THE system SHALL still accept the review with only the rating.

WHEN a customer edits a review, THE system SHALL require the updated rating to be between one and five stars.

IF the edited rating is outside the one to five range, THEN THE system SHALL reject the review update request.

### Review Display and Calculation Rules

WHEN customers view a product detail page, THE system SHALL display all reviews for that product.

WHEN displaying reviews on a product page, THE system SHALL sort reviews by newest first.

WHEN calculating the average rating for a product, THE system SHALL include only non-deleted reviews.

WHEN calculating the average rating, THE system SHALL exclude deleted reviews from the calculation.

IF a product has no non-deleted reviews, THEN THE system SHALL not display an average rating.

WHEN displaying reviews, THE system SHALL show the rating and text content (if provided) for each review.

### Review Modification and Snapshot Rules

WHEN a customer edits their own review, THE system SHALL allow the modification of the rating.

WHEN a customer edits their own review, THE system SHALL allow the modification of the text content.

WHEN a customer successfully edits a review, THE system SHALL create a snapshot of the review before the change.

THE snapshot created on review edit SHALL record the previous rating value.

THE snapshot created on review edit SHALL record the previous text content.

THE snapshot created on review edit SHALL record when the change was made.

THE snapshot created on review edit SHALL record who made the change.

### Review Deletion and Preservation Rules

WHEN a customer deletes their own review, THE system SHALL allow the deletion.

WHEN a customer deletes their review, THE system SHALL remove the review from public display.

WHEN a customer deletes their review, THE system SHALL preserve all snapshots of that review.

THE deleted review SHALL no longer be included in the product's average rating calculation.

IF a customer deletes their only review for a product, THE system SHALL remove that review from the product page.

WHEN a review is deleted, THE system SHALL mark it as deleted but preserve the deletion record.

## CancellationRequest Rules

Cancellation is handled per order item rather than for the entire order. Customers can request cancellation only for individual items that have paid status and have not yet been shipped. Cancellation requests must include a reason in text format to explain why the customer wants to cancel. The seller of that specific item can approve or reject the cancellation request. When a seller responds to a cancellation request, a snapshot of the request state is created. If the seller approves the cancellation, that specific item is cancelled and a refund is processed for that item only. Cancelled items restore their stock quantities through inventory records. The remaining items in the order continue processing normally without being affected. If all items in an order are cancelled, the entire order status becomes cancelled.

### Per-Item Cancellation Scope

THE system SHALL handle cancellation requests at the individual order item level rather than at the entire order level.

THE system SHALL allow each item in an order to be cancelled independently of other items in the same order.

THE system SHALL enable customers to cancel specific items they no longer want while keeping other items in the order active for processing.

### Cancellation Eligibility

THE system SHALL allow customers to request cancellation only for order items that have paid status.

IF an order item has already been shipped, THEN THE system SHALL reject cancellation requests for that item.

IF an order item has delivered, cancelled, or refunded status, THEN THE system SHALL reject cancellation requests for that item.

THE system SHALL require customers to provide a reason in text format when requesting cancellation.

IF the cancellation reason is missing or empty, THEN THE system SHALL reject the cancellation request.

### Seller Response Authority

THE system SHALL allow only the seller of the specific order item to approve or reject cancellation requests for that item.

THE system SHALL prevent other sellers in the same order from responding to cancellation requests for items they do not sell.

WHEN a seller responds to a cancellation request with approval or rejection, THE system SHALL automatically create a snapshot of the request state.

THE system SHALL preserve the snapshot including the response and its timing for dispute resolution.

THE system SHALL prevent deletion of cancellation request snapshots.

### Cancellation Effects

WHEN a seller approves a cancellation request, THE system SHALL immediately cancel that specific order item and change its status to cancelled.

WHEN an order item is cancelled, THE system SHALL process a refund for that cancelled item only, not for other items in the order.

WHEN an order item is cancelled, THE system SHALL restore the stock quantity for that item's variant through an inventory record.

THE system SHALL allow items in the same order that were not cancelled to continue processing normally without being affected by the cancellation.

IF all items in an order are cancelled, THEN THE system SHALL automatically change the overall order status to cancelled.

## RefundRequest Rules

Refund requests are handled per order item rather than for the entire order. Customers can request a refund only for individual items that have delivered status. Refund requests must be submitted within seven days of the item being delivered. Refund requests must include a reason in text format to explain why the customer is requesting a refund. The seller of that specific item can approve or reject the refund request. When a seller responds to a refund request, a snapshot of the request state is created. If the seller approves the refund, that specific item is marked as refunded. Refunded items restore their stock quantities through inventory records. The remaining items in the order are unaffected by the refund. If all items in an order are refunded, the entire order status becomes refunded.

### Per-Item Refund Handling and Status Requirements

Refund requests are processed at the individual order item level, not at the order level. Each order item can have its own refund request independent of other items in the same order. Customers can only submit refund requests for order items that have delivered status. Refund requests cannot be submitted for items with paid, shipped, cancelled, or refunded status. The delivered status requirement ensures that customers have received the item before requesting a refund.

### Refund Window and Reason Requirements

Refund requests must be submitted within seven days of the item being delivered. The seven-day window is calculated from the delivery confirmation date, whether confirmed by the customer or automatically applied after fourteen days from shipping. Refund requests must include a reason in text format explaining why the customer is requesting a refund. The reason field is required and cannot be left empty or blank. The reason text provides context for the seller when reviewing the refund request.

### Seller Response Authority

The seller of the specific order item has the authority to approve or reject refund requests for their products. Only the seller who sold the item can respond to refund requests for that item. Sellers can approve refund requests, which marks the item as refunded and initiates the refund process. Sellers can reject refund requests, which denies the refund and keeps the item in its current status. When a seller responds to a refund request (either approval or rejection), a snapshot of the request state is created and preserved. The snapshot captures the refund request details at the time of the seller's response, including the reason and status change.

### Refund Processing and Stock Restoration

When a seller approves a refund request, that specific order item is marked as refunded status. The refund approval applies only to the approved item and does not affect other items in the same order. Refunded items restore their stock quantities through inventory records, making the variant available for purchase again. The stock restoration is automatic upon refund approval and creates a positive inventory record. The remaining items in the order continue processing normally and are unaffected by the refund. Other order items maintain their current status and can still be shipped, delivered, cancelled, or refunded independently.

### Order Status Impact from Refunds

The overall order status is derived from the status of all its order items. If all order items in an order are refunded, the entire order status becomes refunded. If only some items are refunded while others remain in different statuses, the order status reflects the mixed state as partially completed. The refunded order status indicates that all items have been processed for refund and no further action is required on the order. Orders with mixed refund and other statuses continue to show their composite status based on the remaining active items.

## Snapshot Rules

All data modifications on the platform create snapshots to preserve the previous state for dispute resolution and record-keeping. Snapshots record when the change was made, what was changed, and the values before and after the modification. Snapshots are immutable and cannot be deleted once created, ensuring permanent historical records. Snapshots can be viewed by relevant parties including the owners of the data and administrators. Snapshots are preserved even after the original entity is deleted, maintaining complete audit trails. Product snapshots include all product fields such as name, description, category, base price, and images. Product snapshots also include snapshots of all variants at that moment, preserving the complete state. Seller profile snapshots capture shop name, description, and logo at the time of modification. Order item snapshots preserve product, variant, and seller profile information at the time of purchase. Review snapshots capture rating and text content changes. Cancellation and refund request snapshots record reason and status changes.

### Snapshot Creation Triggers

WHEN any editable data is modified on the platform, THE system SHALL create a snapshot to preserve the previous state.

WHEN a product is edited, THE system SHALL create a product snapshot.

WHEN a product variant is edited, THE system SHALL create a variant snapshot.

WHEN a seller profile is edited, THE system SHALL create a seller profile snapshot.

WHEN a review is edited, THE system SHALL create a review snapshot.

WHEN a cancellation request is responded to, THE system SHALL create a request state snapshot.

WHEN a refund request is responded to, THE system SHALL create a request state snapshot.

WHEN any snapshot is created, THE system SHALL record the timestamp of when the change was made.

WHEN any snapshot is created, THE system SHALL record what data was changed.

### Snapshot Content Requirements

WHEN a snapshot is created, THE system SHALL preserve the values before the modification.

WHEN a snapshot is created, THE system SHALL preserve the values after the modification.

WHEN a product snapshot is created, THE system SHALL capture all product fields including name, description, category, base price, and images.

WHEN a product snapshot is created, THE system SHALL include snapshots of all variants at that moment.

WHEN a variant snapshot is created, THE system SHALL capture SKU code, option values, price, and stock quantity.

WHEN a seller profile snapshot is created, THE system SHALL capture shop name, shop description, and logo image.

WHEN a review snapshot is created, THE system SHALL capture rating and text content.

WHEN a cancellation request snapshot is created, THE system SHALL capture reason and status.

WHEN a refund request snapshot is created, THE system SHALL capture reason and status.

### Snapshot Immutability and Retention

THE system SHALL ensure that all snapshots are immutable once created.

THE system SHALL prevent deletion of any snapshot.

WHEN an entity is deleted, THE system SHALL preserve all associated snapshots.

WHEN a product is deleted, THE system SHALL preserve all product snapshots and variant snapshots.

WHEN a seller deletes their account, THE system SHALL preserve all seller profile snapshots.

WHEN a review is deleted, THE system SHALL preserve all review snapshots.

WHEN a cancellation request is processed, THE system SHALL preserve all request state snapshots.

WHEN a refund request is processed, THE system SHALL preserve all request state snapshots.

### Snapshot Access Rules

THE system SHALL allow owners of data to view snapshots of their own data.

THE system SHALL allow sellers to view snapshots of their own products.

THE system SHALL allow sellers to view snapshots of their own variants.

THE system SHALL allow sellers to view snapshots of their own profiles.

THE system SHALL allow customers to view snapshots of their own reviews.

THE system SHALL allow administrators to view snapshots of any product on the platform.

THE system SHALL allow administrators to view snapshots of any variant on the platform.

THE system SHALL allow administrators to view snapshots of any seller profile.

THE system SHALL allow administrators to view snapshots of any review.

THE system SHALL allow administrators to view snapshots of any cancellation request.

THE system SHALL allow administrators to view snapshots of any refund request.

### Order Item Snapshots

WHEN an order is placed, THE system SHALL create a snapshot of each purchased product.

WHEN an order is placed, THE system SHALL create a snapshot of each purchased variant.

WHEN an order is placed, THE system SHALL create a snapshot of each seller's profile involved in the order.

WHEN an order item snapshot is created, THE system SHALL preserve the product name, description, and category at the time of purchase.

WHEN an order item snapshot is created, THE system SHALL preserve the variant options and price at the time of purchase.

WHEN an order item snapshot is created, THE system SHALL preserve the seller shop name and logo at the time of purchase.

THE system SHALL ensure that order item snapshots remain unchanged regardless of future product or seller profile modifications.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Product Search Filtering Rules

THE shopping mall platform SHALL allow customers to filter search results by category.

THE shopping mall platform SHALL allow customers to filter search results by price range with minimum and maximum values.

THE shopping mall platform SHALL allow customers to filter search results to show only in-stock products.

IF a customer applies a category filter, THEN THE shopping mall platform SHALL display only products belonging to the selected category or its subcategories.

IF a customer applies a price range filter, THEN THE shopping mall platform SHALL display only products with prices within the specified range.

IF a customer applies an in-stock filter, THEN THE shopping mall platform SHALL display only products with at least one variant having stock quantity greater than zero.

IF multiple filters are applied simultaneously, THEN THE shopping mall platform SHALL apply all filters together and display only products matching all criteria.

IF no products match the applied filters, THEN THE shopping mall platform SHALL display an empty results message.

### Product Search Sorting Rules

THE shopping mall platform SHALL allow customers to sort search results by newest first.

THE shopping mall platform SHALL allow customers to sort search results by price from low to high.

THE shopping mall platform SHALL allow customers to sort search results by price from high to low.

IF customers sort by newest first, THEN THE shopping mall platform SHALL display products created most recently at the top of the list.

IF customers sort by price low to high, THEN THE shopping mall platform SHALL display products with the lowest prices first.

IF customers sort by price high to low, THEN THE shopping mall platform SHALL display products with the highest prices first.

IF a product has multiple variants with different prices, THEN THE shopping mall platform SHALL use the lowest variant price for sorting purposes.

### Product Search Pagination Rules

THE shopping mall platform SHALL paginate product search results.

THE shopping mall platform SHALL display a reasonable number of products per page to ensure fast loading times.

THE shopping mall platform SHALL allow customers to navigate between pages of search results.

THE shopping mall platform SHALL maintain applied filters and sorting when customers navigate between pages.

IF a customer reaches the last page of results, THEN THE shopping mall platform SHALL not display a next page navigation option.

IF a customer is on the first page of results, THEN THE shopping mall platform SHALL not display a previous page navigation option.

### Wishlist Browsing Rules

THE shopping mall platform SHALL paginate wishlist results.

THE shopping mall platform SHALL display products in the customer's wishlist in a paginated list.

THE shopping mall platform SHALL allow customers to navigate between pages of their wishlist.

IF a product in the wishlist is deleted by the seller, THEN THE shopping mall platform SHALL automatically remove it from the wishlist before displaying the list.

IF a product in the wishlist is out of stock, THEN THE shopping mall platform SHALL display the product but mark it as unavailable.

### Order History Browsing Rules

THE shopping mall platform SHALL paginate order history results.

THE shopping mall platform SHALL display orders sorted by newest first by default.

THE shopping mall platform SHALL allow customers to navigate between pages of their order history.

IF a customer views their order history, THEN THE shopping mall platform SHALL display the most recent orders on the first page.

IF a customer reaches the last page of their order history, THEN THE shopping mall platform SHALL not display a next page navigation option.

### Review Listing Rules

THE shopping mall platform SHALL display reviews on product detail pages sorted by newest first.

THE shopping mall platform SHALL display the most recently created reviews at the top of the review list.

IF a review is deleted by the customer, THEN THE shopping mall platform SHALL not display it in the review list.

IF a review is deleted by the customer, THEN THE shopping mall platform SHALL not include it in the average rating calculation.

IF a product has no reviews, THEN THE shopping mall platform SHALL not display a review section on the product detail page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Deletion Error Scenarios

WHEN a seller attempts to delete their account while having order items with paid status, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their account while having order items with shipped status, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their account while having pending cancellation requests, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete their account while having pending refund requests, THE system SHALL reject the deletion request.

WHEN a customer deletes their account, THE system SHALL preserve all order history and order records.

WHEN a customer deletes their account, THE system SHALL preserve all reviews but display them as belonging to a deleted user.

WHEN a seller deletes their account, THE system SHALL delete all products from listings.

WHEN a seller deletes their account, THE system SHALL preserve all order history and order snapshots.

WHEN a seller deletes their account, THE system SHALL preserve the shop name in all past order records.

### Product and Variant Deletion Error Scenarios

WHEN a seller attempts to delete a product while any variant has order items with paid status, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a product while any variant has order items with shipped status, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a product while any variant has pending cancellation requests, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a product while any variant has pending refund requests, THE system SHALL reject the deletion request.

WHEN a seller deletes a product, THE system SHALL also delete all variants and inventory records associated with that product.

WHEN a product is deleted, THE system SHALL remove it from all search results and category listings.

WHEN a seller attempts to delete a variant while it has order items with paid status, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a variant while it has order items with shipped status, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a variant while it has pending cancellation requests, THE system SHALL reject the deletion request.

WHEN a seller attempts to delete a variant while it has pending refund requests, THE system SHALL reject the deletion request.

WHEN a product is deleted, THE system SHALL preserve all snapshots even after deletion.

WHEN a product is deleted, THE system SHALL automatically remove it from all customer wishlists.

### Cart and Checkout Validation Errors

WHEN a customer attempts to add an out of stock variant to their cart, THE system SHALL reject the addition.

WHEN a variant in the cart becomes out of stock, THE system SHALL mark it as unavailable in the cart.

WHEN a variant in the cart is deleted by the seller, THE system SHALL mark it as unavailable in the cart.

WHEN the cart quantity exceeds available stock for a variant, THE system SHALL display a warning to the customer.

WHEN a customer proceeds to checkout with unavailable items, THE system SHALL prevent checkout until unavailable items are removed.

WHEN a customer selects a shipping address at checkout, THE system SHALL lock that address and prevent changes after order placement.

WHEN payment processing fails, THE system SHALL not create an order record.

WHEN payment processing fails, THE system SHALL allow the customer to retry payment.

### Order Cancellation and Refund Validation Errors

WHEN a customer requests cancellation for an order item with status other than paid, THE system SHALL reject the request.

WHEN a customer requests cancellation for an order item that has already been shipped, THE system SHALL reject the request.

WHEN a customer requests a refund for an order item with status other than delivered, THE system SHALL reject the request.

WHEN a customer requests a refund for an order item more than 7 days after delivery, THE system SHALL reject the request.

WHEN a seller approves a cancellation request, THE system SHALL restore the stock quantity for that variant.

WHEN a seller approves a refund request, THE system SHALL restore the stock quantity for that variant.

WHEN all items in an order are cancelled, THE system SHALL update the overall order status to cancelled.

WHEN all items in an order are refunded, THE system SHALL update the overall order status to refunded.

WHEN a customer does not confirm delivery within 14 days of shipping, THE system SHALL automatically update all items in that shipment to delivered status.

### Review Submission Validation Errors

WHEN a customer attempts to write a review for a product they have not purchased, THE system SHALL reject the request.

WHEN a customer attempts to write a review for an order item with status other than delivered, THE system SHALL reject the request.

WHEN a customer attempts to write a second review for the same product in the same order, THE system SHALL reject the request.

WHEN a customer submits a review, THE system SHALL require a rating between 1 and 5 stars.

WHEN a customer deletes their review, THE system SHALL preserve all review snapshots.

WHEN a customer deletes their review, THE system SHALL recalculate the product's average rating excluding the deleted review.

### Seller Approval Rejection Scenarios

WHEN an administrator rejects a seller registration, THE system SHALL require the administrator to provide a rejection reason.

WHEN a seller views their approval status as rejected, THE system SHALL display the rejection reason provided by the administrator.

WHEN a seller with rejected status submits a new registration request, THE system SHALL allow resubmission.

WHEN a seller is suspended by an administrator, THE system SHALL hide all their products from search and category listings.

WHEN a seller is suspended, THE system SHALL prevent purchase of their products.

WHEN a seller is suspended, THE system SHALL prevent creation of new products.

WHEN a seller is suspended, THE system SHALL prevent editing of existing products.

WHEN a seller is suspended, THE system SHALL allow processing of existing orders including shipping and responding to cancellation or refund requests.

### Administrator Action Validation Errors

WHEN a super administrator attempts to demote themselves, THE system SHALL reject the action.

WHEN an administrator force-cancels an order item, THE system SHALL refund the customer for that item.

WHEN an administrator force-cancels an order item, THE system SHALL restore the stock quantity for that variant.

WHEN an administrator force-refunds an order item, THE system SHALL refund the customer for that item.

WHEN an administrator force-refunds an order item, THE system SHALL restore the stock quantity for that variant.

WHEN an administrator deletes a category, THE system SHALL move all products in that category to uncategorized status.

WHEN an administrator bans a customer, THE system SHALL prevent the customer from logging in.

WHEN an administrator bans a seller, THE system SHALL prevent the seller from logging in.

WHEN an administrator bans a seller, THE system SHALL preserve all existing orders.

### Search and Listing Validation Errors

WHEN a customer searches for products, THE system SHALL return results from all sellers.

WHEN search results are displayed, THE system SHALL paginate the results.

WHEN a customer filters by category, THE system SHALL include products from that category and its subcategories.

WHEN a customer filters by price range, THE system SHALL include products with base prices within the specified minimum and maximum.

WHEN a customer filters by in-stock only, THE system SHALL exclude variants with zero stock quantity.

WHEN a product has no variants, THE system SHALL show it in search results but mark it as unavailable.

WHEN a product has variants with different prices, THE system SHALL display a price range on the product listing.

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Payment Retry Policy

WHEN payment processing fails, THE system SHALL allow the customer to retry the payment.

IF payment fails during checkout, THE system SHALL NOT create an order record.

IF payment fails, THE system SHALL inform the customer that the order was not created.

IF payment fails, THE customer SHALL be able to retry the payment process.

IF payment fails, THE system SHALL NOT decrease stock quantities.

IF payment fails, THE system SHALL NOT remove items from the customer's cart.

WHEN payment succeeds, THE system SHALL create the order and remove items from the customer's cart.

### Payment Integration Error Handling

WHEN the external payment gateway returns an error, THE system SHALL treat this as a payment failure.

IF payment integration experiences an error, THE system SHALL NOT proceed with order creation.

IF payment integration experiences an error, THE system SHALL display an error message to the customer.

IF payment integration experiences an error, THE customer's cart items SHALL remain in the cart for retry.

IF payment integration experiences an error, THE system SHALL NOT create inventory records.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Image File Validation Rules

Uploaded files for products must be valid image files.

Uploaded files for seller profile logos must be valid image files.

If an uploaded file is not a valid image, the upload is rejected.

If an image file is corrupted, the upload is rejected.

Sellers receive an error message when an image upload is rejected.

Rejected image uploads are not stored in the system.

### Image Storage and Retention

Uploaded product images are stored and associated with the product.

Uploaded seller logo images are stored and associated with the seller profile.

Product images are retained as long as the product exists.

Seller logo images are retained as long as the seller profile exists.

When a product is deleted, its images are removed from the system.

When a seller deletes their account, their logo image is removed from the system.

Image changes are recorded in snapshots and preserved even after product or account deletion.