**eCommerceMall — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Customer Operations

Customers register using email and password to access the platform, as no guest browsing is permitted. Once registered, customers log in with their credentials to view and manage their account. Customers can change their password at any time through their account settings. When a customer deletes their account, their profile information is removed, but their order history and reviews are preserved for seller records and legal purposes. Reviews left by a deleted customer are shown as written by a deleted user rather than removed entirely. Each customer maintains a profile containing their display name and phone number, both of which they can edit as needed. Customer accounts serve as the foundation for all platform interactions, including shopping cart, wishlist, orders, and reviews. If a customer enters incorrect login credentials, the system denies access and displays an appropriate error message. Password changes require the customer to confirm their current password before updating to a new one.

### Customer Registration

THE system SHALL require visitors to provide an email address and a password to register for a customer account.

WHEN a visitor attempts to access any platform page without being logged in, THE system SHALL redirect them to the registration or login page.

THE system SHALL create a customer account upon successful registration, associating the provided email and password with the new account.

### Customer Login

WHEN a registered customer provides their email and password, THE system SHALL authenticate their credentials and grant access to the platform.

WHEN a customer provides an incorrect email or an incorrect password during login, THE system SHALL deny access and display an error message indicating that the provided credentials are invalid.

### Password Change

WHEN a customer requests to change their password, THE system SHALL require them to confirm their current password before allowing the update.

WHEN the customer provides their current password correctly, THE system SHALL allow them to set a new password.

WHEN the customer provides an incorrect current password during a password change attempt, THE system SHALL reject the request and display an error message.

### Account Deletion

WHEN a customer requests to delete their account, THE system SHALL remove the customer's profile information including display name and phone number.

THE system SHALL preserve the customer's order history and order records after account deletion for seller records and legal purposes.

THE system SHALL preserve all reviews written by the customer after account deletion.

THE system SHALL display reviews from deleted accounts as written by a "deleted user" instead of the customer's name.

### Profile Management

THE customer SHALL be able to edit their display name through their account profile settings.

THE customer SHALL be able to edit their phone number through their account profile settings.

WHEN a customer saves changes to their display name or phone number, THE system SHALL update the profile with the new values.

## Seller Operations

Sellers register using email and password, similar to customer registration, but their accounts require administrator approval before they can begin selling products. Sellers log in with their credentials and can view their current approval status, which shows whether they are pending, approved, or rejected. If a seller's registration is rejected, they can view the rejection reason provided by the administrator and submit a new registration request. Sellers can change their password through their account settings. Seller account deletion is only permitted when there are no pending order items in paid or shipped status and no pending cancellation or refund requests for any of their products. When a seller deletes their account, their products are removed from listings, but order history and snapshots are preserved, including their shop name in past orders. Each seller maintains a profile with their shop name, shop description, and logo image, all of which they can edit, with every edit creating a snapshot. Customers can view seller profiles to learn about the shops they are purchasing from.

### Seller Registration

THE system SHALL allow prospective sellers to register by providing an email address and a password.

WHEN a prospective seller submits a registration request, THE system SHALL create a seller account in "pending approval" status.

WHEN a seller account is created, THE system SHALL send a confirmation of successful registration to the prospective seller.

THE seller SHALL NOT be allowed to log in until an administrator has approved their registration.

### Seller Approval Process

THE system SHALL allow administrators to view all pending seller registration requests.

WHEN an administrator approves a seller registration, THE system SHALL change the seller's status to "approved".

WHEN a seller's registration is approved, THE system SHALL allow the seller to log in and begin using the platform.

WHEN an administrator rejects a seller registration, THE system SHALL record the rejection reason provided by the administrator.

THE seller SHALL be able to view their current approval status, which SHALL be one of "pending", "approved", or "rejected".

WHEN a seller's registration has been rejected, THE seller SHALL be able to view the rejection reason provided by the administrator.

### Seller Re-Registration After Rejection

WHEN a seller's registration has been rejected, THE seller SHALL be able to submit a new registration request.

WHEN a rejected seller submits a new registration request, THE system SHALL treat it as a fresh registration requiring administrator approval again.

THE system SHALL retain the previous rejection reason and make it viewable to the seller for reference.

WHEN a rejected seller submits a new registration request, THE system SHALL change the seller's status back to "pending approval".

### Seller Password Change

THE seller SHALL be able to change their password through their account settings.

WHEN a seller requests a password change, THE system SHALL require the seller to provide their current password and a new password.

THE system SHALL verify that the current password matches the seller's existing password before updating it.

IF the current password does not match the seller's existing password, THEN THE system SHALL reject the password change request.

### Seller Account Deletion with Pending Order Check

THE seller SHALL be able to request deletion of their seller account.

WHEN a seller requests account deletion, THE system SHALL check whether the seller has any order items in "paid" or "shipped" status for any of their products.

IF pending order items in "paid" or "shipped" status exist, THEN THE system SHALL reject the deletion request.

THE system SHALL also check whether the seller has any pending cancellation requests for any of their products.

THE system SHALL also check whether the seller has any pending refund requests for any of their products.

IF any pending cancellation or refund requests exist, THEN THE system SHALL reject the deletion request.

WHILE no pending order items in "paid" or "shipped" status exist AND no pending cancellation or refund requests exist, THE system SHALL proceed with account deletion.

### Effects of Seller Account Deletion on Products and Records

WHEN a seller's account is deleted, THE system SHALL remove all of the seller's products from search results and category listings.

WHEN a seller's account is deleted, THE system SHALL preserve all order history and order snapshots that reference the seller's products.

WHEN a seller's account is deleted, THE system SHALL preserve the seller's shop name in past order records and order item snapshots so that historical order records remain identifiable.

WHEN a seller's account is deleted, THE system SHALL preserve customer reviews on the seller's products but SHALL anonymize the seller information in those reviews.

### Seller Profile Editing with Snapshots

THE seller SHALL be able to edit their shop name at any time.

THE seller SHALL be able to edit their shop description at any time.

THE seller SHALL be able to upload and update their logo image at any time.

WHEN a seller edits their profile, THE system SHALL create a snapshot of the current seller profile values (shop name, shop description, and logo image) before applying the change.

WHEN a seller updates their logo image, THE system SHALL accept the new logo image upload and include it in the snapshot.

THE system SHALL create a separate snapshot for each individual edit operation on the seller's profile.

### Customer Viewing of Seller Profiles

THE customer SHALL be able to view any seller's profile.

WHEN viewing a seller's profile, THE system SHALL display the seller's shop name, shop description, and logo image.

THE customer SHALL be able to access a seller's profile from product listings and product detail pages where the seller's shop name is displayed as a link.

## Category Operations

Products on the platform are organized into categories, which can have subcategories limited to one level of nesting. Each category has a name and description that defines the type of products it contains. Categories and subcategories are created and managed exclusively by administrators, who set the names and descriptions. Administrators can edit category names and descriptions as needed. When a category is deleted, the products that belonged to it become uncategorized rather than being removed. Customers can browse the full list of categories to explore available product groupings. Customers can also view all products within a specific category or subcategory to find items they are interested in. Subcategories inherit the structure of their parent category, providing a clean two-level hierarchy for product organization.

### Category Creation

THE system SHALL allow only administrators to create new categories.

THE system SHALL require administrators to provide a category name and description when creating a new category.

THE system SHALL allow administrators to create a subcategory under an existing category.

WHEN an administrator creates a subcategory, THE system SHALL validate that the subcategory is not created under another subcategory (one level of nesting only).

IF an administrator attempts to create a subcategory under an existing subcategory, THEN THE system SHALL reject the creation.

THE system SHALL allow a subcategory to be created only directly under a top-level category (not under another subcategory).

### Category Editing

THE system SHALL allow only administrators to edit category names and descriptions.

WHEN an administrator edits a category name or description, THE system SHALL update the category with the new values.

THE system SHALL allow administrators to edit both top-level categories and subcategories.

### Category Deletion

THE system SHALL allow only administrators to delete categories.

WHEN an administrator deletes a category, THE system SHALL set the category field of all products that belonged to that category to uncategorized.

WHEN an administrator deletes a top-level category, THE system SHALL also delete all subcategories under that category and set their associated products to uncategorized.

THE system SHALL NOT delete any products when a category is deleted.

### Customer Category Browsing

THE system SHALL allow customers to browse the full list of all categories.

WHEN a customer browses categories, THE system SHALL display both top-level categories and their subcategories in the hierarchy.

THE system SHALL display each subcategory grouped under its parent top-level category.

### Product Viewing Within a Category

WHEN a customer selects a top-level category, THE system SHALL display all products belonging to that category and all products belonging to its subcategories.

WHEN a customer selects a subcategory, THE system SHALL display only products belonging to that specific subcategory.

THE system SHALL NOT display products from sibling subcategories or the parent category when viewing a subcategory.

### Subcategory Hierarchy Management

THE system SHALL maintain a two-level category hierarchy: top-level categories (level 1) and subcategories (level 2).

WHEN an administrator views the category list, THE system SHALL display the hierarchy showing which categories are subcategories of which top-level categories.

THE system SHALL prevent any subcategory from being promoted to become a parent of another category.

THE system SHALL prevent any category from having more than one level of nesting.

## Product Operations

Sellers create products with a required name, required description, required category (which can be a subcategory), and a required base price. Each product belongs to the seller who created it, meaning only that seller can manage it. Sellers can edit their own products, and every edit automatically creates a snapshot to preserve the product state before the change. Sellers can delete their own products only if there are no pending order items in paid or shipped status and no pending cancellation or refund requests for any variant of that product. Deleting a product also removes all its variants and inventory records. Deleted products no longer appear in search results or category listings. Sellers can view snapshots of their own products, and administrators can view snapshots of any product, with snapshots preserved even after product deletion. Customers search for products by name with paginated results, and can filter by category, price range, and in-stock status, as well as sort by newest first or price. Product listing cards show the main image thumbnail, name, base price or price range, seller shop name, and average rating.

### Product Creation

THE system SHALL allow a seller to create a product by providing a name, a description, a category (which may be a subcategory), and a base price.

THE system SHALL associate the created product with the seller who created it.

WHEN a seller submits a product creation request, THE system SHALL validate that the name is provided, the description is provided, a category is selected, and the base price is provided.

IF any required field is missing, THEN THE system SHALL reject the creation request.

WHERE a seller selects a subcategory as the product's category, THE system SHALL accept the subcategory as a valid category assignment.

### Product Editing

THE system SHALL allow a seller to edit the name, description, category, and base price of their own products.

WHEN a seller edits a product, THE system SHALL create a snapshot that preserves all product fields before the edit, including all product images.

WHILE an edit is in progress, THE system SHALL record the timestamp of the change, what fields were changed, and the values before and after the change in the snapshot.

IF a seller attempts to edit a product they do not own, THEN THE system SHALL reject the edit request.

### Product Deletion

THE system SHALL allow a seller to delete their own products.

WHEN a seller requests deletion of a product, THE system SHALL verify that no order items in "paid" or "shipped" status exist for any variant of that product.

WHEN a seller requests deletion of a product, THE system SHALL verify that no pending cancellation or refund requests exist for any variant of that product.

IF pending order items or pending requests exist for any variant of the product, THEN THE system SHALL reject the deletion request.

WHEN a product is deleted, THE system SHALL remove all variants and inventory records associated with that product.

WHEN a product is deleted, THE system SHALL hide the product from search results and category listings.

WHEN a product is deleted, THE system SHALL preserve all snapshots of that product for audit and dispute resolution purposes.

### Product Snapshot Viewing

THE system SHALL allow a seller to view all snapshots of their own products.

THE system SHALL allow an administrator to view snapshots of any product on the platform.

WHEN a seller or administrator views a product snapshot, THE system SHALL display the product state at the time the snapshot was created, including all fields preserved in that snapshot.

WHERE a product has been deleted, THE system SHALL still allow the original seller and administrators to view its snapshots.

### Product Search

THE system SHALL allow customers to search for products by entering a product name.

WHEN a customer performs a search, THE system SHALL return results from all sellers' products that match the search term.

THE system SHALL paginate search results.

THE system SHALL allow customers to filter search results by product category.

THE system SHALL allow customers to filter search results by a price range, specifying a minimum price and a maximum price.

THE system SHALL allow customers to filter search results to show only products that have at least one variant in stock.

THE system SHALL allow customers to sort search results by newest products first.

THE system SHALL allow customers to sort search results by price from low to high.

THE system SHALL allow customers to sort search results by price from high to low.

WHEN multiple filters are applied, THE system SHALL combine all filters to narrow the search results.

WHEN sorting and filtering are both active, THE system SHALL apply filters first, then sort the filtered results.

### Product Listing Display

WHEN displaying a list of products in search results or category pages, THE system SHALL show each product with its main image as a thumbnail, its name, its base price or a price range if variants have different prices, the seller's shop name, and the product's average rating.

WHERE a product has multiple variants with different prices, THE system SHALL display the price range (lowest to highest variant price) instead of a single base price.

## ProductVariant Operations

A product can have multiple variants, each representing a specific combination of option values such as color and size. Each variant requires a unique SKU code for identification, option values describing the combination, an optional price that can override the product base price, and a required stock quantity that starts at zero. Sellers can add variants to their products to offer different configurations to customers. Sellers can edit existing variants, and every edit automatically creates a snapshot to preserve the variant state before the change. Sellers can delete a variant only if there are no pending order items in paid or shipped status and no pending cancellation or refund requests for that specific variant. A product must have at least one variant to be purchasable by customers. If a product has no variants, it remains visible in search results but is shown as unavailable. Variants with zero stock are shown as out of stock and cannot be added to the shopping cart.

### Variant Creation

WHEN a seller adds a variant to their product, THE system SHALL accept the following fields: a SKU code (required), option values describing the combination (required), an optional price that may override the product's base price, and a stock quantity (required, minimum of zero).

THE system SHALL validate that the provided SKU code is unique across all variants on the platform. WHEN a duplicate SKU code is provided, THE system SHALL reject the creation request.

THE system SHALL set the variant's stock quantity to the value provided by the seller. WHEN the stock quantity is not provided, THE system SHALL set it to zero.

THE system SHALL associate the created variant with the seller's product.

### Option Value Combinations

WHEN a seller creates a variant, THE system SHALL accept option values that distinguish the variant from other variants of the same product (e.g., color: "Red", size: "Large").

THE system SHALL enforce that no two variants of the same product share identical option value combinations.

THE system SHALL display the option values on the product detail page so customers can distinguish between available variants.

### Variant Price Override

WHEN a seller provides a price for a variant, THE system SHALL use that variant-specific price for all pricing calculations (cart subtotals, order totals) instead of the product's base price.

WHEN a seller does not provide a price for a variant, THE system SHALL use the product's base price as the effective price for that variant.

THE system SHALL display each variant's effective price on the product detail page, showing the variant price if set or the product's base price otherwise.

### Variant Editing with Snapshot

WHEN a seller edits a variant's SKU code, option values, or price, THE system SHALL create a snapshot preserving the variant's state before the edit (as defined in Snapshot Operations).

THE system SHALL record in the snapshot: the timestamp of the edit, which fields were changed, the values before the change, and the values after the change.

THE system SHALL preserve the snapshot even after the variant is deleted.

Sellers can view snapshots of their own variants. Administrators can view snapshots of any variant.

### Variant Deletion

BEFORE a seller deletes a variant, THE system SHALL verify that there are no pending order items in "paid" or "shipped" status referencing that variant, and that there are no pending cancellation or refund requests for that variant.

WHEN the verification passes, THE system SHALL delete the variant and:
- Remove the variant from the product detail page
- Cease stock tracking for that variant
- Preserve all inventory records for that variant
- Preserve all snapshots of that variant
- Mark any existing cart items referencing this variant as unavailable in the cart (as defined in CartItem Operations)

WHEN the verification fails due to pending orders or requests, THE system SHALL reject the deletion request.

### Minimum Variant Requirement for Purchasability

THE system SHALL require a product to have at least one variant before customers can purchase that product.

WHEN a product has no variants, THE system SHALL display the product in search results and category listings with an "unavailable" label.

WHEN the last variant of a product is deleted, THE system SHALL immediately mark the product as unavailable for purchase.

### Out of Stock Variant Handling

WHEN a variant's stock quantity reaches zero, THE system SHALL display the variant on the product detail page with an "out of stock" status alongside its price.

WHEN a customer attempts to add an out of stock variant to their cart, THE system SHALL reject the request and inform the customer that the variant is out of stock.

THE system SHALL continue to display the variant on the product detail page even when out of stock, so customers can see all available options.

## ProductImage Operations

Sellers can upload multiple images for each product to showcase it from different angles. The first image uploaded is automatically treated as the main or thumbnail image displayed in product listings and search results. Sellers can reorder their product images, changing which image appears first as the main image. Sellers can delete individual images from their products at any time. All image changes, including uploads, reordering, and deletions, are captured in product snapshots so the complete visual history is preserved. Customers viewing a product detail page see all available images for that product.

### Multiple Image Upload

THE system SHALL allow sellers to upload multiple images for each product they own.

WHEN a seller uploads an image for a product, THE system SHALL assign the image a sort position. THE system SHALL sort positions such that earlier uploads receive lower sort position values and appear before later uploads.

WHEN a seller uploads an image, THE system SHALL store the image data and make the image available for display on product listing pages and the product detail page.

### Thumbnail Image Designation

THE system SHALL automatically designate the image with the lowest sort position as the main thumbnail image for the product.

WHEN a product is displayed in a list — including search result pages, category browsing pages, the seller dashboard, and wishlist displays — THE system SHALL use the thumbnail image as the representative visual for the product.

WHEN a product has no images, THE system SHALL display a placeholder in place of the thumbnail.

### Image Reordering

THE system SHALL allow sellers to reorder the images of their products.

WHEN a seller reorders the images of a product, THE system SHALL update the sort position of each affected image.

WHEN the sort positions are updated, THE system SHALL designate the image now occupying the lowest sort position as the new thumbnail image.

WHEN a seller reorders images, THE system SHALL immediately reflect the new display order on the product detail page where customers browse product images.

### Image Deletion

THE system SHALL allow sellers to delete individual images from their products.

WHEN a seller deletes an image, THE system SHALL remove it from the product detail page, product listings, and all other displays.

WHEN an image is deleted, THE system SHALL preserve the relative sort order of the remaining images.

IF the deleted image was the thumbnail (the image with the lowest sort position), THEN THE system SHALL automatically designate the image with the next lowest sort position as the new thumbnail image.

IF a product has no remaining images after deletion, THEN THE system SHALL display the product with a placeholder image on all listing pages.

### Image Change Snapshots

WHEN a seller uploads a new image for a product, THE system SHALL capture the complete set of image URLs and sort order in a product snapshot.

WHEN a seller reorders the images of a product, THE system SHALL capture the previous image state (all image URLs and sort positions before the change) in a product snapshot.

WHEN a seller deletes an image from a product, THE system SHALL capture the image state prior to deletion in a product snapshot.

Each snapshot SHALL preserve the full set of image data at the moment of the change, providing a before-and-after visual record (defined in [Snapshot Operations]).

Snapshots of image changes SHALL be immutable and SHALL be viewable by the product owner and administrators.

### Product Detail Page Image Display

WHEN a customer views the product detail page, THE system SHALL display all available images for that product.

THE system SHALL display images in ascending sort order, with the image at the lowest sort position shown as the primary image.

WHILE viewing the product detail page, THE customer SHALL be able to browse through all images to view the product from different angles.

THE system SHALL display the total count of images available alongside the image viewer (e.g., "5 images").

## Address Operations

Customers can add multiple shipping addresses to their account for use during checkout. Each address includes the recipient name, phone number, street address, city, state or province, postal code, and country. Customers can edit any of their saved addresses to keep them current and accurate. Customers can delete addresses they no longer need from their account. One address can be set as the default shipping address, which is automatically selected during checkout. Customers can review their addresses before selecting one for an order. When proceeding to checkout, customers must select a shipping address or use their default if one is set. Once an order is placed, the shipping address is locked and cannot be changed.

### Multiple Address Storage

THE system SHALL allow a customer to add multiple shipping addresses to their account.

Each address SHALL contain the following fields:
- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

WHEN a customer submits a new address with all required fields, THE system SHALL save it and associate it with the customer.

THE system SHALL allow a customer to maintain any number of saved addresses on their account without a limit.

### Address Editing

WHEN a customer views their saved addresses, THE system SHALL present each address with an option to edit it.

THE system SHALL allow a customer to modify any of the following fields on an existing address:
- Recipient name
- Phone number
- Street address
- City
- State or province
- Postal code
- Country

WHEN a customer submits changes to an address, THE system SHALL update the address with the new values.

### Address Deletion

THE system SHALL allow a customer to delete any address from their account.

WHEN a customer deletes an address that is currently set as the default shipping address, THE system SHALL remove the default designation from that address.

IF the customer has no remaining addresses after deletion, THEN the system SHALL not set any default shipping address.

WHEN a customer deletes an address, THE system SHALL remove it from the customer's account permanently.

### Default Shipping Address

THE system SHALL allow a customer to designate any one of their saved addresses as the default shipping address.

WHERE a customer sets a new default shipping address, THE system SHALL automatically remove the default designation from the previously set default address. A customer SHALL have at most one default shipping address at any time.

WHERE a default shipping address is set, THE system SHALL pre-select it during checkout.

### Address Review Before Checkout

WHEN a customer proceeds to checkout, THE system SHALL display all of the customer's saved addresses for review.

Each displayed address SHALL show the full address details: recipient name, phone number, street address, city, state or province, postal code, and country.

WHERE a default shipping address exists, THE system SHALL highlight it as the pre-selected option.

### Shipping Address Selection During Checkout

WHEN a customer proceeds to checkout, THE system SHALL require the customer to select one of their saved addresses as the shipping destination for the order.

THE system SHALL allow the customer to choose any of their saved addresses.

IF a customer has no saved addresses, THEN THE system SHALL prompt them to add a shipping address before proceeding further.

WHERE a default shipping address is set, THE system SHALL pre-select it. The customer MAY still choose a different address if desired.

WHEN the customer confirms and places the order, THE system SHALL record the selected shipping address with the order.

### Address Lock After Order Placement

WHEN an order is placed successfully, THE system SHALL lock the shipping address to that order permanently.

THE customer SHALL NOT be able to change the shipping address of a placed order for any reason after the order is placed.

IF a customer needs to ship to a different address after placing an order, THEN the customer SHALL request cancellation of eligible items and place a new order with the correct address.

## CartItem Operations

Customers add products to their cart by selecting a specific variant and specifying the desired quantity. If the same variant is already in the cart, the quantities are combined rather than creating a separate line item. Customers can view their cart to see each item with its product name, variant option details, individual price, quantity, and subtotal. Customers can change the quantity of any item in their cart directly. Customers can remove items from their cart entirely. The cart displays the total price of all items combined. If a variant's stock quantity is less than the cart quantity, a warning is shown to alert the customer. If a variant is deleted or goes out of stock, it is marked as unavailable in the cart and cannot be checked out. Unavailable items must be removed before proceeding to checkout.

### Adding Items to Cart

THE system SHALL allow a customer to add a product variant to their cart by selecting a specific variant (SKU) and specifying a desired quantity.

WHEN a customer adds a variant to their cart, THE system SHALL require the variant to be in stock with available stock quantity greater than zero.

WHEN a customer adds a variant that is already present in their cart, THE system SHALL combine the quantities by increasing the existing line item's quantity by the newly requested quantity, rather than creating a separate cart entry.

IF a customer attempts to add an out-of-stock or deleted variant to their cart, THEN THE system SHALL reject the addition.

IF a customer does not specify a quantity, THEN THE system SHALL default the quantity to 1.

### Viewing Cart with Item Details

WHEN a customer views their cart, THE system SHALL display each cart item with the following details:
- Product name
- Selected variant options (e.g., color, size)
- Individual unit price of the variant
- Quantity in cart
- Subtotal for that line item (unit price multiplied by quantity)

THE system SHALL also display the total price of all items combined in the cart.

### Modifying Cart Item Quantity

WHEN a customer changes the quantity of a cart item, THE system SHALL update the quantity to the new value provided.

IF the customer sets the quantity to zero, THEN THE system SHALL remove that item from the cart.

WHILE a cart item's quantity exceeds the available stock of its variant, THE system SHALL display a warning to the customer indicating insufficient stock.

### Removing Items from Cart

WHEN a customer removes an item from their cart, THE system SHALL delete that cart entry entirely.

THE system SHALL recalculate the total cart price after removal.

### Handling Unavailable Variants in Cart

WHILE a variant in the customer's cart becomes deleted by the seller or goes out of stock (stock reaches zero), THE system SHALL mark that cart item as unavailable.

THE system SHALL display an unavailable status for such items clearly to the customer.

IF a cart item is marked unavailable, THEN THE system SHALL prevent that item from being included in checkout.

THE system SHALL allow the customer to remove unavailable items from their cart.

### Checkout Restriction for Available Items Only

WHEN a customer proceeds to checkout, THE system SHALL verify that all items in the cart are available (variant exists, in stock, and not deleted).

IF any cart item is unavailable, THEN THE system SHALL block checkout and inform the customer that unavailable items must be removed before proceeding.

THE system SHALL only permit checkout when all remaining cart items have sufficient stock to fulfill the requested quantity.

## WishlistItem Operations

Customers can add products to their wishlist to save them for future consideration. The wishlist shows products rather than specific variants, allowing customers to track interest in a product as a whole. Customers can view their wishlist, which is paginated for easy browsing of many saved items. Customers can remove products from their wishlist at any time. If a seller deletes a product, that product is automatically removed from all customers' wishlists to prevent references to unavailable items. The wishlist serves as a personal collection of desired products distinct from the shopping cart.

### Adding Products to Wishlist

WHEN a customer selects a product to add to their wishlist, THE system SHALL add that product to the customer's personal wishlist.

THE system SHALL store wishlist items at the product level (not the variant level), so that customers save interest in a product as a whole.

### Wishlist as Separate from Cart

THE system SHALL maintain the wishlist as a distinct collection separate from the shopping cart.

Items in the wishlist SHALL NOT appear in the cart, affect cart totals, or influence checkout processes.

Customers SHALL manage wishlist items and cart items independently through separate interfaces.

### Viewing the Wishlist

WHEN a customer views their wishlist, THE system SHALL display a paginated list of all products the customer has saved.

THE system SHALL show saved products in the wishlist, each displayed with product-level information such as name and main image.

WHEN the customer has more than one page worth of saved products, THE system SHALL provide navigation controls to browse through pages.

### Removing Products from the Wishlist

WHEN a customer chooses to remove a product from their wishlist, THE system SHALL remove that specific wishlist item.

### Automatic Removal on Product Deletion

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customers' wishlists.

THE system SHALL perform this automatic removal regardless of which customers have the product saved, ensuring no wishlist references unavailable products.

## Order Operations

An order is created when a customer successfully completes payment after reviewing their order summary. The order contains one or more order items, with each item representing a purchased product variant with a specific quantity. Each order has a unique order number, a total price, and an overall status derived from its items. When an order is placed, stock quantities are decreased for each purchased variant and items are removed from the customer's cart. Customers can view a list of all their orders, which is paginated and sorted by newest first. Each order in the list shows the order number, date, total price, and overall order status. Customers can view full order details, including all items with their product names, variants, quantities, prices, and individual statuses, the shipping address, and a list of shipments with tracking information. If payment fails during checkout, the order is not created and the customer can retry. The overall order status is derived from its items: paid if all items are paid, shipped if any item is shipped, delivered if all items are delivered, cancelled if all items are cancelled, refunded if all items are refunded, or partially completed for mixed states.

### Order Creation After Successful Payment

THE system SHALL create an order only after the customer confirms the order summary and payment processing succeeds.

WHEN the customer proceeds to checkout from the cart, THE system SHALL require the customer to select a shipping address.

WHEN the customer reviews the order summary, THE system SHALL display:
- A list of all items with prices
- The selected shipping address
- The total price

WHEN the customer confirms the order and payment is processed successfully, THE system SHALL create the order with all checked-out items as order items.

### Order Number and Total Price Assignment

THE system SHALL assign each created order:
- A unique order number for identification and reference
- A total price calculated as the sum of all order item prices multiplied by their quantities

THE order number SHALL be visible to the customer who placed the order and to administrators.

### Stock Decrease on Order Placement

WHEN an order is successfully placed, THE system SHALL automatically decrease the stock quantity for each purchased variant.

THE system SHALL create a negative inventory record for each variant with the quantity purchased as the change value and "order placement" as the reason.

IF any purchased variant has insufficient stock to fulfill the order, the order SHALL NOT be placed and an error SHALL be returned to the customer.

### Cart Item Removal on Order Placement

WHEN an order is successfully placed, THE system SHALL automatically remove all items included in the order from the customer's cart.

Items from the cart that were not included in the order SHALL remain in the cart.

### Payment Failure Handling

WHEN the customer confirms the order but payment processing fails, THE system SHALL NOT create the order.

THE system SHALL inform the customer that payment failed.

THE customer SHALL be able to retry payment without losing their order summary selections.

No stock quantities SHALL be decreased and no cart items SHALL be removed when payment fails.

### Paginated Order History Viewing

Customers SHALL be able to view a list of all their orders.

THE list SHALL be paginated, displaying a limited number of orders per page.

THE list SHALL be sorted by newest orders first.

Each order in the list SHALL display the order number, date, total price, and overall order status.

### Full Order Detail Viewing

Customers SHALL be able to view the full details of any of their orders.

THE full order details SHALL include:
- A list of all order items, each showing the product name, variant options, quantity, price at time of purchase, and individual item status
- The shipping address used for the order
- A list of shipments with tracking information, showing which items are included in each shipment

Administrators SHALL be able to view the full details of any order on the platform.

### Order Status Derivation from Items

THE overall order status SHALL be derived from the statuses of its order items:
- IF all items have status "paid", the order status SHALL be "paid"
- IF any item has status "shipped" and no items are "delivered", the order status SHALL be "shipped"
- IF all items have status "delivered", the order status SHALL be "delivered"
- IF all items have status "cancelled", the order status SHALL be "cancelled"
- IF all items have status "refunded", the order status SHALL be "refunded"
- For any other combination of item statuses (mixed states), the order status SHALL be "partially completed"

## OrderItem Operations

Each order item represents a purchased product variant with a specific quantity, so buying three of the same variant creates one order item with quantity three. Order items within a single order can belong to different sellers, and each order item has its own independent status. The available statuses for order items are paid, shipped, delivered, cancelled, and refunded. Each order item can be individually cancelled or refunded without affecting other items in the same order. When an order is placed, a snapshot of each purchased product and variant is saved with the order item, preserving the product name, description, variant options, and price at the time of purchase. A snapshot of each seller's profile is also saved with the order item, preserving the shop name and logo at the time of purchase. These snapshots ensure that order history remains accurate even if products, variants, or seller profiles are later modified or deleted.

### Order Item Creation with Variant and Quantity

WHEN an order is successfully placed after payment, THE system SHALL create one order item for each distinct product variant in the customer's purchased items.

If a customer purchases multiple units of the same variant, THE system SHALL create a single order item with the combined quantity, not separate line items per unit.

Each order item SHALL record:
- The purchased product variant (identified by SKU code and option values)
- The quantity purchased
- The unit price at the time of purchase
- An initial status of "paid"
- The seller who owns the product

The order item SHALL be associated with its parent order. The order SHALL remain associated with the customer who placed it.

### Multi-Seller Order Item Handling

A single order MAY contain order items from multiple different sellers. Each order item SHALL be linked to the seller who owns the purchased product variant.

WHEN a seller views order items for their products (via the seller dashboard), THE system SHALL display only the order items belonging to that seller — items from other sellers within the same order SHALL NOT be visible.

WHEN a seller creates a shipment, THE system SHALL allow the seller to select only their own order items. THE system SHALL reject attempts to include order items belonging to other sellers in the same shipment.

Each seller SHALL manage, ship, and respond to cancellation or refund requests for only their own order items independently.

### Independent Item Status Progression

Each order item SHALL maintain its own independent status. The status of one order item SHALL NOT affect the status of other items within the same order.

The valid statuses and their progression:
- "paid": Initial status after successful payment. The item is awaiting shipment by the seller.
- "shipped": The seller has created a shipment containing this item and entered tracking information.
- "delivered": The customer (or system, after 14 days) has confirmed delivery of the shipment containing this item.
- "cancelled": The seller approved a cancellation request for this item while it was in "paid" status.
- "refunded": The seller approved a refund request for this item while it was in "delivered" status.

THE allowed status transitions SHALL be:
- "paid" → "shipped" (when included in a shipment)
- "paid" → "cancelled" (when seller approves cancellation)
- "shipped" → "delivered" (when delivery is confirmed)
- "delivered" → "refunded" (when seller approves refund)

No other state transitions SHALL be permitted.

### Individual Item Cancellation (Status Change)

WHEN a seller approves a cancellation request for an individual order item (as detailed in CancellationRequest Operations), THE system SHALL change that item's status to "cancelled".

Upon cancellation, THE system SHALL:
- Create a positive inventory record to restore the stock quantity for the cancelled item's variant (the quantity restored equals the order item's quantity)
- Leave all other order items in the same order unaffected — they continue processing normally with their existing statuses

Cancellation is only applicable to order items with status "paid". No other statuses may transition to "cancelled".

### Individual Item Refund (Status Change)

WHEN a seller approves a refund request for an individual order item (as detailed in RefundRequest Operations), THE system SHALL change that item's status to "refunded".

Upon refund, THE system SHALL:
- Create a positive inventory record to restore the stock quantity for the refunded item's variant (the quantity restored equals the order item's quantity)
- Leave all other order items in the same order unaffected — they continue processing normally with their existing statuses

Refund is only applicable to order items with status "delivered" and only within 7 days of that item's delivery date. No other statuses may transition to "refunded".

### Purchase-Time Snapshots for Order History Accuracy

WHEN an order item is created at purchase, THE system SHALL capture and permanently store three types of snapshots to preserve order history accuracy:

**Product Snapshot**: THE system SHALL capture the complete state of the product at the moment of purchase, including: product name, description, category, base price, and all product images. The product snapshot SHALL also include snapshots of all product variants at that moment, preserving their SKU codes, option values, and prices.

**Variant Snapshot**: THE system SHALL capture the complete state of the purchased variant at the moment of purchase, including: SKU code, option values, and price.

**Seller Profile Snapshot**: THE system SHALL capture the seller's profile at the moment of purchase, including: shop name and logo image URL.

These snapshots SHALL be immutable — they cannot be modified or deleted by any user, including administrators. They SHALL be linked to the order item and viewable for order history, dispute resolution, and record-keeping purposes.

The snapshots ensure that the order history shows the product name, description, variant options, price, and seller shop name as they were at the time of purchase, even if the product, variant, or seller profile is later edited or deleted.

## Shipment Operations

A shipment is a package sent by a seller that contains one or more order items from that seller. Different sellers always ship separately, with each seller creating their own shipments. A seller can choose to ship items individually or bundle multiple items into one shipment. When creating a shipment, sellers select the order items to include and enter tracking information consisting of the carrier name and tracking number. All items included in the same shipment share the same tracking information and change their status to shipped. Customers can view the tracking information for each shipment to follow their delivery progress. Customers confirm delivery per shipment, not per individual item. When a customer confirms delivery, all items in that shipment change their status to delivered. If the customer does not manually confirm delivery, items automatically change to delivered after 14 days from the shipping date.

### Shipment Creation by Seller

THE system SHALL allow a seller to create a shipment containing one or more order items from the seller's own products.

WHEN a seller creates a shipment, THE system SHALL only allow the seller to select order items belonging to the seller's own products.

THE system SHALL separate items from different sellers into different shipments.

WHEN a seller creates a shipment, THE system SHALL allow the seller to bundle multiple of their own order items into a single shipment.

THE system SHALL also allow a seller to ship individual order items in separate shipments.

### Tracking Information Entry

WHEN a seller creates a shipment, THE system SHALL require the seller to enter a carrier name and a tracking number for the shipment.

THE system SHALL associate the carrier name and tracking number with the shipment so that all items in the shipment share the same tracking information.

### Status Change to Shipped

WHEN a shipment is created, THE system SHALL change the status of all order items included in that shipment to "shipped".

WHEN a shipment is created, THE system SHALL record the shipping date and time for that shipment.

### Tracking Information Viewing

THE system SHALL allow a customer to view the tracking information for each shipment associated with their orders.

WHEN a customer views shipment tracking information, THE system SHALL display the carrier name, tracking number, and shipping date.

THE system SHALL also show which order items are included in each shipment when the customer views tracking details.

### Delivery Confirmation Per Shipment

THE system SHALL allow a customer to confirm delivery for each shipment, not for individual order items.

WHEN a customer confirms delivery of a shipment, THE system SHALL change the status of all order items in that shipment to "delivered".

WHEN a customer confirms delivery of a shipment, THE system SHALL record the delivery confirmation date and time.

### Automatic Delivery Processing

IF a customer does not manually confirm delivery of a shipment within 14 days from the shipping date, THEN THE system SHALL automatically change the status of all order items in that shipment to "delivered".

WHEN the automatic delivery is triggered after 14 days, THE system SHALL record the automatic delivery date and time.

## CancellationRequest Operations

Cancellation requests are handled at the order item level rather than the entire order. Customers can request cancellation only for items with paid status that have not yet been shipped. When submitting a cancellation request, the customer must include a reason explaining why they want to cancel. The seller of that item reviews the request and can either approve or reject it. When the seller responds, a snapshot of the request state is created to record the decision. If the cancellation is approved, the item is cancelled, a refund is processed for that item only, and stock quantities for that variant are restored via an inventory record. The remaining items in the order continue processing normally. If all items in an order are cancelled, the overall order status becomes cancelled. Sellers can view the number of pending cancellation requests on their dashboard.

### Per-Item Cancellation Request Submission

WHEN a customer wants to cancel an order item, THE system SHALL allow cancellation requests at the individual order item level rather than for an entire order.

WHEN a customer submits a cancellation request for an order item, THE system SHALL require that the item's status is "paid" (items with status "shipped", "delivered", "cancelled", or "refunded" are not eligible for cancellation).

WHEN a customer submits a cancellation request, THE system SHALL require the customer to provide a reason (text explaining why they want to cancel).

### Seller Review and Response

WHEN a seller views their dashboard, THE system SHALL display the count of pending cancellation requests for their products.

WHEN a seller reviews a pending cancellation request, THE system SHALL allow the seller to either approve or reject the request.

WHEN a seller responds to a cancellation request (either approving or rejecting), THE system SHALL create a snapshot recording the request's state at the time of response, including the seller's decision.

### Cancellation Approval Processing

WHEN a seller approves a cancellation request for an order item, THE system SHALL change the order item's status to "cancelled".

WHEN a cancellation is approved, THE system SHALL restore the stock quantity for the cancelled item's product variant by creating a positive inventory record.

WHEN a cancellation is approved, THE system SHALL process a refund for that specific order item only. Other items in the same order are not affected by this refund.

WHEN a cancellation is approved, THE system SHALL leave the remaining order items in the order to continue processing normally through their own status progression.

### Order Status After All-Item Cancellation

WHEN all items in an order have been cancelled, THE system SHALL set the overall order status to "cancelled".

WHEN only some items in an order are cancelled while others remain active, THE system SHALL continue to derive the overall order status from the remaining active items (see OrderItem Operations for status derivation rules).

## RefundRequest Operations

Refund requests are handled at the order item level rather than the entire order. Customers can request a refund only for items with delivered status, and only within 7 days of that item being delivered. When submitting a refund request, the customer must include a reason explaining why they want a refund. The seller of that item reviews the request and can either approve or reject it. When the seller responds, a snapshot of the request state is created to record the decision. If the refund is approved, the item is refunded and stock quantities for that variant are restored via an inventory record. The remaining items in the order are unaffected. If all items in an order are refunded, the overall order status becomes refunded. Sellers can view the number of pending refund requests on their dashboard.

### Submitting a Refund Request

THE system SHALL allow customers to submit a refund request for individual order items. Refund requests SHALL be handled per order item, not per entire order.

WHEN a customer submits a refund request, THE system SHALL only allow the request IF the order item's status is "delivered". Items with any other status (paid, shipped, cancelled, refunded) SHALL NOT be eligible for refund requests.

WHEN a refund request is submitted, THE system SHALL verify that the request is within 7 days of the item's delivery date. IF the request is submitted after 7 days from delivery, THE system SHALL reject the request.

WHEN a customer submits a refund request, THE system SHALL require a text-based reason explaining why the refund is requested. IF no reason is provided, THE system SHALL reject the request.

### Seller Response to Refund Request

WHEN a refund request exists for one of their items, THE system SHALL allow the seller to either approve or reject the request.

WHEN the seller responds to a refund request, THE system SHALL create a snapshot of the request state. The snapshot SHALL record the response timestamp, the decision (approved or rejected), and the state of the request at that moment. THE snapshot SHALL be immutable and preserved for dispute resolution.

IF the seller rejects the refund request, THE system SHALL keep the order item in "delivered" status. THE system SHALL notify the customer of the rejection.

IF the seller approves the refund request, THE system SHALL process the refund for that item (the actual refund transaction is handled by an external payment gateway).

WHEN a refund is approved for an order item, THE system SHALL restore the stock quantities for that variant. THE system SHALL automatically create a positive inventory record with the reason "refund" and the restored quantity matching the order item's quantity.

WHEN a single order item is refunded, THE remaining items in the order SHALL be unaffected. Only the refunded item SHALL change status; other items in the same order SHALL continue processing according to their own statuses.

### Order Status After All Items Are Refunded

WHEN all items in an order have been refunded, THE system SHALL derive the overall order status as "refunded".

WHEN only some items are refunded while others have different statuses, THE overall order status SHALL reflect the mixed state as "partially completed" (as defined in OrderItem Operations).

### Dashboard Pending Refund Count

THE system SHALL allow sellers to view the number of pending refund requests on their seller dashboard. This count SHALL include all refund requests for the seller's products that have not yet been responded to by the seller (still in pending status). THE dashboard SHALL provide the seller with a quick overview of refund requests requiring their attention.

## Review Operations

Customers can write reviews for products they have purchased, but only after the order item's status has become delivered. Each customer can write one review per product per order, meaning multiple purchases of the same product result in separate review opportunities. Each review requires a rating from 1 to 5 stars and may optionally include text content. Reviews are displayed on the product detail page sorted by newest first. Customers can edit their own reviews, and every edit automatically creates a snapshot to preserve the previous version. Customers can delete their own reviews, though the snapshots of those reviews are preserved. A product's average rating is calculated from all non-deleted reviews, ensuring deleted reviews do not affect the displayed rating. Reviews from deleted customer accounts are shown as written by a deleted user rather than removed.

### Writing a Review

A customer may write a review only for a product they have purchased, and only after the corresponding order item's status has become "delivered".

THE SYSTEM SHALL allow a customer to submit a review containing a rating from 1 to 5 stars (required) and optional text content.

THE SYSTEM SHALL enforce that a customer may write at most one review per product per order. If a customer purchases the same product in two separate orders, they may write a separate review for each order.

WHEN a review is successfully submitted, THE SYSTEM SHALL create a review record associated with the customer, the product, and the order item.

### Viewing Reviews on the Product Detail Page

Reviews SHALL be displayed on the product detail page in descending order by creation date, with the most recent review appearing first.

WHEN a review was written by a customer who has since deleted their account, THE SYSTEM SHALL display the reviewer as "deleted user" rather than revealing the former customer's identity. The review content (rating and text) SHALL remain visible.

### Editing a Review

A customer may edit their own review at any time after it has been written.

WHEN a customer edits their review, THE SYSTEM SHALL update the review's rating and/or text content with the new values provided.

THE SYSTEM SHALL create a snapshot recording the review's previous state (rating and text) before applying the edit. This snapshot SHALL include the timestamp of the edit and the values both before and after the change.

### Deleting a Review

A customer may delete their own review.

WHEN a customer deletes their review, THE SYSTEM SHALL mark the review as deleted so that it no longer appears on the product detail page.

THE SYSTEM SHALL preserve all snapshots of the review created during prior edits. Deleted reviews and their snapshots SHALL be retained for record-keeping and dispute resolution purposes.

### Average Rating Calculation

THE SYSTEM SHALL calculate a product's average rating by averaging the star ratings of all non-deleted reviews for that product.

WHEN a new review is added, an existing review is edited, or a review is deleted, THE SYSTEM SHALL recompute the average rating for the affected product.

The average rating SHALL be displayed on the product listing page, the product detail page, and any search or category results where the product appears.

## InventoryRecord Operations

Each product variant has its own stock quantity managed through inventory history records rather than direct stock updates. Each inventory record contains a quantity change, which can be positive for restocking or negative for orders and adjustments, along with a reason and a timestamp. The current stock quantity is calculated by summing all inventory records for a variant. Sellers can add inventory to restock a variant by specifying a positive quantity and a reason for the restock. Sellers can subtract inventory for adjustments or losses by specifying a negative quantity and a reason. When an order is placed, the system automatically creates a negative inventory record for each purchased variant. When an order is cancelled or refunded, the system automatically creates a positive inventory record to restore the stock. Sellers can view the full inventory history of each variant to track stock changes over time. When stock reaches zero, the variant is shown as out of stock and cannot be added to the cart.

### Inventory Record Creation

THE system SHALL create an inventory record whenever the stock quantity of a product variant changes.

Each inventory record SHALL contain:
- A quantity change value (positive for stock increases, negative for stock decreases)
- A reason categorizing the type of change
- A timestamp recording when the change occurred

THE system SHALL NOT allow direct modification of a variant's stock quantity. All stock changes SHALL be recorded exclusively through inventory records.

### Restocking Inventory

WHEN a seller restocks a product variant, THE system SHALL create a new inventory record with a positive quantity change value.

THE seller SHALL provide a reason for the restock when submitting the restocking request.

THE system SHALL preserve the seller-provided reason in the inventory record.

The positive quantity change SHALL be added to the variant's calculated current stock.

### Inventory Adjustments

WHEN a seller performs an inventory adjustment or records a loss for a product variant, THE system SHALL create a new inventory record with a negative quantity change value.

THE seller SHALL provide a reason for the adjustment or loss when submitting the adjustment request.

THE system SHALL preserve the seller-provided reason in the inventory record.

The negative quantity change SHALL be subtracted from the variant's calculated current stock.

### Automatic Stock Deduction on Order Placement

WHEN an order is placed successfully, THE system SHALL automatically create a negative inventory record for each purchased product variant.

The quantity change SHALL equal the negative of the purchased quantity.

The reason for the inventory record SHALL indicate that the deduction is due to order placement.

This deduction SHALL occur atomically as part of the order creation process.

### Automatic Stock Restoration on Cancellation or Refund

WHEN an order item is cancelled or refunded, THE system SHALL automatically create a positive inventory record for the affected product variant.

The quantity change SHALL equal the positive of the cancelled or refunded quantity.

The reason for the inventory record SHALL indicate that the restoration is due to cancellation or refund.

This restoration SHALL occur automatically when the cancellation or refund is confirmed.

### Stock Calculation by Summation

THE current stock quantity of a product variant SHALL be calculated by summing all inventory records associated with that variant.

The summation SHALL total the quantity change values of all inventory records for the variant.

THE system SHALL compute the current stock dynamically from inventory records rather than storing a separate stock value.

### Inventory History Viewing

WHEN a seller views the inventory history of a product variant, THE system SHALL display all inventory records for that variant.

Each inventory record in the history SHALL show:
- The quantity change (positive or negative)
- The reason for the change
- The timestamp of when the change occurred

THE seller SHALL be able to view inventory history for any of their own product variants.

THE system SHALL order the inventory records by newest first.

### Out of Stock Handling

WHEN a product variant's calculated stock quantity reaches zero, THE system SHALL display the variant as "out of stock" on the product detail page.

WHILE a variant is out of stock, THE system SHALL prevent customers from adding that variant to their shopping cart.

IF a customer attempts to add an out-of-stock variant to the cart, THEN the system SHALL reject the request and indicate that the variant is unavailable.

The out-of-stock status SHALL be determined dynamically based on the calculated stock quantity at the time of the request.

## Snapshot Operations

The platform records all modifications to editable data by creating snapshots that preserve the previous state before any change is applied. Each snapshot records when the change was made, what was changed, and the values both before and after the modification. Snapshots are immutable and cannot be deleted or altered after creation. Relevant parties such as item owners and administrators can view snapshots for dispute resolution and audit purposes. Snapshot creation applies to products, where all product fields including images are captured, along with snapshots of all variants at that moment. Snapshots also apply to product variants, seller profiles, order items at the time of purchase, reviews, cancellation requests, and refund requests. Product snapshots include the complete state of the product and all its variants. Snapshots are preserved even after the related entity is deleted, ensuring a complete audit trail.

### Snapshot Creation on Data Modification

THE Snapshot Service SHALL create a snapshot whenever any editable data is modified, including products, product variants, seller profiles, reviews, cancellation requests, and refund requests.

WHEN a modification is requested, THE Snapshot Service SHALL record the following before applying the change:
- A timestamp indicating when the modification occurred
- The before values representing the state of the data prior to the change
- The after values representing the state of the data after the change

THE Snapshot Service SHALL store each snapshot as an immutable record, capturing what was changed and the values both before and after the modification.

The snapshot creation SHALL be part of the same business transaction as the modification itself, ensuring that no modification occurs without a corresponding snapshot.

### Snapshot Immutability and Preservation

THE Snapshot Service SHALL make all snapshots immutable once created. No user, including administrators and super administrators, SHALL be able to modify, delete, or alter any snapshot record after it has been stored.

WHEN an entity is deleted (e.g., a product is removed by a seller, a review is deleted by a customer), THE Snapshot Service SHALL preserve all snapshots related to that entity. Snapshots SHALL NOT be deleted or removed along with the source entity.

THE Snapshot Service SHALL maintain snapshots indefinitely for audit, dispute resolution, and legal record-keeping purposes.

### Snapshot Viewing Access

THE system SHALL allow owners of an entity to view snapshots of that entity. For example, a seller SHALL be able to view all snapshots of their own products, product variants, and seller profile.

THE system SHALL allow administrators to view snapshots of any entity on the platform, regardless of ownership, for oversight and dispute resolution purposes.

THE system SHALL present each snapshot with its timestamp, the field name that was changed, the previous value, and the new value, allowing viewers to understand the history of changes.

### Product and Variant Snapshots

WHEN a product is edited, THE Snapshot Service SHALL create a product snapshot that captures all fields of the product at that moment, including the product name, description, category, base price, and all images with their order.

THE product snapshot SHALL also include a complete snapshot of every variant belonging to that product at the time of the edit. Each variant snapshot SHALL capture the SKU code, option values, and price.

This structure (product-snapshot containing product-snapshot-variants) SHALL preserve the complete state of a product and its variants at any point in time, allowing historical reconstruction of exactly what was offered for sale.

WHEN a variant is edited independently (without the product being edited), THE Snapshot Service SHALL create a variant-level snapshot capturing only the variant's fields.

### Seller Profile Snapshots

WHEN a seller edits their profile, THE Snapshot Service SHALL create a snapshot capturing the shop name, shop description, and logo image both before and after the edit.

Every seller profile edit SHALL generate a new snapshot, preserving the complete history of how the seller's public-facing information has changed over time.

### Order Item Snapshots at Purchase

WHEN an order is placed successfully, THE Snapshot Service SHALL create a snapshot of each purchased product and variant at the time of purchase. This snapshot SHALL be associated with the corresponding order item and SHALL preserve:
- The product name, description, and category at the time of purchase
- The variant options (e.g., color, size) and the price paid

THE Snapshot Service SHALL also create a snapshot of each seller's profile at the time of purchase, preserving the shop name and logo as they appeared when the customer made the purchase.

These order item snapshots SHALL ensure that order history displays accurate information even if products, variants, or seller profiles are later modified or deleted.

### Review Snapshots on Edit

WHEN a customer edits an existing review, THE Snapshot Service SHALL create a snapshot capturing the review's rating and text content before the edit.

Review snapshots SHALL be preserved even if the customer later deletes the review, ensuring a complete audit trail of all review changes.

### Cancellation and Refund Request Snapshots

WHEN a seller responds to a cancellation request, THE Snapshot Service SHALL create a snapshot of the request state, capturing the reason provided by the customer, the seller's decision (approved or rejected), and the timestamp of the response.

WHEN a seller responds to a refund request, THE Snapshot Service SHALL create a snapshot of the request state, capturing the reason provided by the customer, the seller's decision (approved or rejected), and the timestamp of the response.

These snapshots SHALL be preserved for the lifetime of the platform, ensuring a complete record of dispute resolution for each order item.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Customer Error Scenarios

Customers must register with an email and password. If a customer attempts to register with an email that is already in use by another customer, the system rejects the registration. When logging in, if the email does not exist or the password does not match, the system denies access. When a customer tries to change their password, they must provide their current password; if it does not match, the system rejects the change. A customer may delete their account at any time. When a customer deletes their account, their profile information is removed, but their orders and order history remain preserved. Reviews from a deleted customer remain visible but are shown as belonging to a deleted user. If a banned customer attempts to log in, the system denies access since banned customers cannot log in. Administrators can ban and unban customers.

### Registration — Duplicate Email Rejection and Mandatory Registration

WHEN a user attempts to register with an email address that is already associated with an existing customer account, THE system SHALL reject the registration request.

WHEN a user who is not registered attempts to access any platform feature, including browsing products, viewing categories, adding items to cart, placing orders, or writing reviews, THE system SHALL deny access and prompt the user to register or log in first.

### Login — Invalid Credential Denial

WHEN a user attempts to log in with an email address that does not correspond to any registered customer account, THE system SHALL deny access and display an appropriate message.

WHEN a user attempts to log in with a password that does not match the stored password for the provided email address, THE system SHALL deny access and display an appropriate message.

### Password Change — Incorrect Current Password Rejection

WHEN a customer attempts to change their password and provides a current password that does not match the stored password for their account, THE system SHALL reject the password change request.

### Account Deletion — Profile Removal and Order Preservation

WHEN a customer deletes their account, THE system SHALL remove the customer's profile information, including their display name, phone number, email address, and stored shipping addresses.

WHEN a customer deletes their account, THE system SHALL preserve all orders and order history associated with that customer, including order numbers, item details, prices, dates, statuses, shipments, and tracking information.

WHERE orders are associated with the deleted customer account, THE system SHALL retain the shipping address recorded at the time of checkout for each preserved order.

### Review Anonymity After Account Deletion

WHEN a customer deletes their account, THE system SHALL preserve all reviews written by that customer.

WHILE a preserved review is displayed after the customer's account deletion, THE system SHALL display the review author as "deleted user" instead of the customer's former display name.

### Banned Customer — Login Denial

WHEN a banned customer attempts to log in with their email and password, THE system SHALL deny access regardless of whether the provided credentials are correct.

### Administrator — Customer Ban and Unban

WHEN an administrator initiates a ban on a customer account, THE system SHALL prevent that customer from logging into the platform.

WHEN an administrator initiates an unban on a customer account, THE system SHALL restore that customer's ability to log into the platform.

WHILE a customer account is banned, THE system SHALL allow the customer's existing orders to continue processing normally and their existing reviews to remain visible on product pages.

## Seller Error Scenarios

Sellers register with email and password and require administrator approval before they can sell. If a seller registers but an administrator has not yet responded, their approval status shows as pending. If rejected, the seller can view the rejection reason and submit a new registration request. If a seller tries to delete their account while they have pending order items with paid or shipped status, the system blocks the deletion. Similarly, if a seller has pending cancellation or refund requests, account deletion is denied. When a seller account is deleted, their products are removed from listings, but order history and snapshots are preserved along with their shop name in past orders. Administrators can suspend a seller, which hides their products from search and listings, prevents new purchases, and blocks creation or editing of products. Suspended sellers can still process existing orders and respond to cancellation or refund requests. Administrators can unsuspend a seller, restoring product visibility. Administrators can ban sellers, preventing login entirely while existing orders remain preserved.

### Seller Approval Requirement Restriction

WHEN a seller whose approval status is "pending" attempts to create a product, THE system SHALL reject the operation.

WHEN a seller whose approval status is "pending" attempts to edit an existing product, THE system SHALL reject the operation.

WHEN a seller whose approval status is "pending" attempts to upload, delete, or reorder product images, THE system SHALL reject the operation.

WHEN a seller whose approval status is "rejected" attempts to create a product, THE system SHALL reject the operation.

WHEN a seller whose approval status is "rejected" attempts to edit an existing product, THE system SHALL reject the operation.

THE system SHALL only allow sellers with approval status "approved" to create, edit, or manage products and product images.

WHEN a seller with "pending" or "rejected" approval status attempts any selling operation, THE system SHALL display an appropriate message indicating that administrator approval is required before selling.

### Rejected Seller Reregistration Process

WHEN a rejected seller submits a new registration request, THE system SHALL reset the seller's approval status to "pending" and SHALL notify administrators of the new registration request.

WHEN a rejected seller views their application history, THE system SHALL display the rejection reason from the previous attempt for reference.

WHEN a seller submits a new registration request after rejection, THE system SHALL process it as a new application requiring fresh administrator review.

WHEN a rejected seller submits a new registration request, THE system SHALL preserve the previous rejection reason in the seller's history for audit purposes.

### Account Deletion Blocked by Pending Orders

WHEN a seller requests account deletion, IF there exists any order item for that seller's products with status "paid", THEN THE system SHALL block the deletion and SHALL inform the seller that they have pending paid orders that must be shipped before account deletion.

WHEN a seller requests account deletion, IF there exists any order item for that seller's products with status "shipped", THEN THE system SHALL block the deletion and SHALL inform the seller that they have pending shipped orders awaiting delivery confirmation before account deletion.

WHEN a seller requests account deletion, IF there exists any pending cancellation request for any of that seller's order items, THEN THE system SHALL block the deletion and SHALL inform the seller to resolve all cancellation requests first.

WHEN a seller requests account deletion, IF there exists any pending refund request for any of that seller's order items, THEN THE system SHALL block the deletion and SHALL inform the seller to resolve all refund requests first.

WHEN a seller has no order items with status "paid" or "shipped" and no pending cancellation or refund requests, THE system SHALL allow the seller to delete their account.

### Product and Wishlist Removal on Seller Deletion

WHEN a seller account is successfully deleted, THE system SHALL remove all of that seller's products from search results and category listings.

WHEN a seller account is successfully deleted, THE system SHALL automatically remove all of that seller's products from all customer wishlists.

WHEN a seller account is successfully deleted, THE system SHALL preserve all order history containing that seller's products, including the product name, variant options, price, and shop name as recorded in snapshots at the time of purchase.

WHEN a seller account is successfully deleted, THE system SHALL preserve all snapshots of that seller's products, variants, and profile for record-keeping purposes.

### Seller Suspension: Product Visibility and Creation Restrictions

WHEN an administrator suspends a seller, THE system SHALL hide all of that seller's products from search results and category listings.

WHEN an administrator suspends a seller, THE system SHALL prevent customers from adding any of that seller's product variants to their shopping cart.

WHILE a seller is suspended, THE system SHALL reject any attempt by the seller to create new products.

WHILE a seller is suspended, THE system SHALL reject any attempt by the seller to edit existing product names, descriptions, categories, or base prices.

WHILE a seller is suspended, THE system SHALL reject any attempt by the seller to upload, delete, or reorder product images.

WHILE a seller is suspended, THE system SHALL reject any attempt by the seller to add, edit, or delete product variants.

WHILE a seller is suspended, THE system SHALL reject any attempt by the seller to add inventory or adjust stock quantities for existing variants.

### Seller Suspension: Existing Order Processing Allowed

WHILE a seller is suspended, THE system SHALL allow the seller to view their order items that require shipping.

WHILE a seller is suspended, THE system SHALL allow the seller to create shipments and enter tracking information for their order items.

WHILE a seller is suspended, THE system SHALL allow the seller to respond to pending cancellation requests for their order items.

WHILE a seller is suspended, THE system SHALL allow the seller to respond to pending refund requests for their order items.

WHILE a seller is suspended, THE system SHALL allow the seller to view inventory history records for their existing variants.

### Seller Unsuspension: Restoring Product Operations

WHEN an administrator unsuspends a seller, THE system SHALL restore all of that seller's previously hidden products to search results and category listings.

WHEN an administrator unsuspends a seller, THE system SHALL allow customers to add that seller's product variants to their shopping cart.

WHEN an administrator unsuspends a seller, THE system SHALL allow the seller to create new products, edit existing products, manage product images, add variants, and manage inventory normally.

### Banned Seller Login Prevention

WHEN an administrator bans a seller, THE system SHALL prevent that seller from logging into the platform from that point onward.

WHEN a banned seller attempts to log in, THE system SHALL reject the login attempt and SHALL display a message indicating that the account has been banned.

WHEN an administrator bans a seller, THE system SHALL preserve all existing orders containing that seller's products for record-keeping and legal purposes.

WHEN an administrator bans a seller, THE system SHALL still allow the processing of existing orders for that seller's products, including shipping, delivery confirmation, and responding to cancellation and refund requests.

WHEN an administrator unbans a seller, THE system SHALL restore the seller's ability to log into their account.

## Category Error Scenarios

Only administrators can create, edit, and delete categories. If an administrator creates a subcategory nested deeper than one level from the parent, the system rejects it since only one level of nesting is allowed. When an administrator deletes a category, any products assigned to that category become uncategorized. If a customer or seller attempts to create, edit, or delete a category, the system denies the operation since category management is administrator-only. All users can browse all categories. If a category has no products assigned, the category still appears in the browse list but shows an empty product listing. Administrators can edit category names and descriptions at any time.

### Two-Level Category Nesting Limit

THE system SHALL permit a category to have subcategories at a maximum nesting depth of two levels (one level of subcategories beneath a top-level category).

WHEN an administrator creates a subcategory, THE system SHALL verify that the parent category is a top-level category (not itself a subcategory).

IF the parent category is itself a subcategory, THEN THE system SHALL reject the creation request.

### Excessive Subcategory Depth Rejection

WHEN an administrator attempts to create a subcategory beneath an existing subcategory (a third-level category), THE system SHALL reject the operation.

IF a category is already classified as a subcategory, THEN THE system SHALL NOT allow it to have subcategories of its own.

The system SHALL return a clear indication that subcategory nesting is limited to a maximum depth of two levels.

### Category Deletion Makes Products Uncategorized

WHEN an administrator deletes a category, THE system SHALL reassign all products currently associated with that category to an uncategorized state.

IF a product had a subcategory as its assigned category and that subcategory is deleted, THEN THE system SHALL move the product to an uncategorized state (not promote it to the parent category).

Products in an uncategorized state SHALL remain visible in search results but SHALL NOT appear in any category browse listing.

### Non-Administrator Category Creation Denial

WHEN a customer or a seller attempts to create a category, THE system SHALL deny the operation.

The system SHALL only accept category creation requests from users with administrator privileges.

IF a non-administrator attempts to submit a category creation request, THEN THE system SHALL reject it and indicate that category management is restricted to administrators.

### Non-Administrator Category Edit Denial

WHEN a customer or a seller attempts to edit a category name or description, THE system SHALL deny the operation.

The system SHALL only accept category edit requests from users with administrator privileges.

IF a non-administrator attempts to modify a category's name or description, THEN THE system SHALL reject the request.

### Non-Administrator Category Deletion Denial

WHEN a customer or a seller attempts to delete a category, THE system SHALL deny the operation.

The system SHALL only accept category deletion requests from users with administrator privileges.

IF a non-administrator attempts to delete a category, THEN THE system SHALL reject the request.

### Empty Category Product List Display

WHEN a customer browses the category list, THE system SHALL display all categories regardless of whether they have any products assigned.

IF a category has no products assigned to it, THEN THE system SHALL display the category in the browse list but SHALL show an empty product listing when the category is selected.

WHILE a category has no products, THE system SHALL NOT display any products under that category until products are assigned.

## Product Error Scenarios

Sellers create products with required fields: name, description, category, and base price. If a seller omits any required field, the system rejects product creation. A seller can only edit their own products; attempting to edit another seller's product is denied. Sellers can delete their own products only if there are no pending order items with paid or shipped status for any variant of that product, and no pending cancellation or refund requests for any variant. If these conditions are not met, deletion is blocked. When a product is deleted, all its variants and inventory records are also removed, and the product no longer appears in search or category listings. Snapshots of the product and its variants are preserved even after deletion. Administrators can delete any product for policy violations regardless of pending orders. Products must have at least one variant to be purchasable; products with zero variants are visible in search but shown as unavailable.

### Missing Required Product Fields Rejection

WHEN a seller attempts to create a product, THE system SHALL require the following fields to be non-empty: name, description, category, and base price.

WHEN a seller attempts to create a product without providing a name, THE system SHALL reject the product creation.

WHEN a seller attempts to create a product without providing a description, THE system SHALL reject the product creation.

WHEN a seller attempts to create a product without selecting a category, THE system SHALL reject the product creation.

WHEN a seller attempts to create a product without providing a base price, THE system SHALL reject the product creation.

WHEN a seller attempts to create a product with multiple missing required fields, THE system SHALL reject the product creation and indicate which fields were missing.

### Cross-Seller Product Edit Denial

WHEN a seller attempts to edit a product that belongs to a different seller, THE system SHALL deny the edit operation.

WHEN a seller attempts to edit a product that belongs to a different seller, THE system SHALL reject the edit regardless of whether the editing seller has any business relationship with the owning seller.

WHEN a seller attempts to edit a product that belongs to a different seller, THE system SHALL return a message indicating the seller does not have permission to edit that product.

### Product Deletion Blocked by Pending Orders and Requests

WHEN a seller requests deletion of a product and any variant of that product has order items in "paid" status that have not yet been shipped, THE system SHALL block the product deletion.

WHEN a seller requests deletion of a product and any variant of that product has order items in "shipped" status that have not yet been delivered, THE system SHALL block the product deletion.

WHEN a seller requests deletion of a product and any variant of that product has a pending cancellation request awaiting seller response, THE system SHALL block the product deletion.

WHEN a seller requests deletion of a product and any variant of that product has a pending refund request awaiting seller response, THE system SHALL block the product deletion.

IF a seller requests deletion of a product and any of the above blocking conditions apply, THEN THE system SHALL reject the deletion and inform the seller that the product cannot be deleted due to active orders, cancellation requests, or refund requests.

### Variant and Inventory Removal on Product Deletion

WHEN a seller successfully deletes a product and all deletion conditions are satisfied, THE system SHALL delete all product variants associated with that product.

WHEN a seller successfully deletes a product, THE system SHALL delete all inventory records associated with each variant of that product.

WHEN a seller successfully deletes a product, THE system SHALL remove all variants and inventory records simultaneously with the product deletion.

IF a product has historical order items referencing its variants, THEN THE system SHALL still delete the variants and inventory records while preserving the order item references to those variants through snapshots (defined in [Snapshot Preservation After Product Deletion]).

### Product Hidden from Search After Deletion

WHEN a product has been deleted by its seller, THE system SHALL remove the product from all search results.

WHEN a product has been deleted by its seller, THE system SHALL remove the product from all category listings.

WHEN a product has been deleted by an administrator, THE system SHALL remove the product from all search results.

WHEN a product has been deleted by an administrator, THE system SHALL remove the product from all category listings.

WHEN a customer attempts to navigate to a deleted product's detail page using a direct URL, THE system SHALL display a message indicating the product is no longer available.

### Snapshot Preservation After Product Deletion

WHEN a product is deleted by its seller, THE system SHALL preserve all existing snapshots of that product.

WHEN a product is deleted by an administrator, THE system SHALL preserve all existing snapshots of that product.

WHEN a product is deleted, THE system SHALL preserve all existing snapshots of each variant associated with that product.

WHEN a product is deleted, THE system SHALL preserve the product and variant snapshots linked to any historical order items, ensuring past order records remain complete.

WHEN a seller or an administrator views snapshots of a deleted product, THE system SHALL display those snapshots with their complete data as if the product were still active.

### Administrator Forced Product Deletion

WHEN an administrator requests deletion of any product on the platform, THE system SHALL allow the deletion regardless of pending order items with "paid" or "shipped" status for that product.

WHEN an administrator requests deletion of any product on the platform, THE system SHALL allow the deletion regardless of pending cancellation or refund requests for any variant of that product.

IF an administrator deletes a product that has pending order items, THEN THE system SHALL still process the deletion while preserving those order items for the buyer's records through snapshots (defined in [Snapshot Preservation After Product Deletion]).

WHEN an administrator deletes a product, THE system SHALL remove all variants and inventory records for that product, following the same variant and inventory removal rules as seller-initiated deletion.

### Zero Variant Product Marked Unavailable

WHEN a product has no variants associated with it, THE system SHALL display the product as "unavailable" in search results.

WHEN a product has no variants associated with it, THE system SHALL display the product as "unavailable" in category listings.

WHEN a customer views the detail page of a product that has no variants, THE system SHALL display the product information but indicate that the product cannot be purchased.

IF a product has no variants, THEN THE system SHALL prevent customers from adding it to their cart.

IF a product has no variants, THEN THE system SHALL prevent customers from adding it to their wishlist.

## ProductVariant Error Scenarios

Each variant requires a unique SKU code. If a seller attempts to create a variant with a SKU code that already exists among any product's variants, the system rejects the creation. Every edit to a variant creates a snapshot of the variant state. Sellers can delete a variant only if there are no pending order items with paid or shipped status for that variant, and no pending cancellation or refund requests. If these conditions exist, deletion is blocked. Deleting the last variant of a product makes that product unpurchasable, but the product remains visible in search as unavailable. A product must have at least one variant to be purchasable. When stock reaches zero, the variant is shown as out of stock and cannot be added to a cart. Out-of-stock variants remain visible on the product detail page but are marked as unavailable.

### Duplicate SKU Code Rejection

WHEN a seller attempts to create a product variant with a SKU code that already exists among any product variant on the platform, THE system SHALL reject the creation and notify the seller that the SKU code is already in use.

WHEN a seller attempts to edit a variant's SKU code to a value that already exists among any product variant on the platform, THE system SHALL reject the edit and notify the seller that the SKU code is already in use.

### Variant Edit Snapshot Creation

WHEN a seller edits any field of a product variant (SKU code, option values, or price), THE system SHALL create a snapshot of the variant state before the edit is applied.

The snapshot SHALL record the timestamp of the change, all variant field values before the edit, and all variant field values after the edit.

Sellers and administrators MAY view the snapshot history of any variant.

### Variant Deletion Blocked by Pending Paid Orders

WHEN a seller attempts to delete a variant that has any order item with status "paid" that references that variant, THE system SHALL block the deletion and notify the seller that the variant cannot be deleted because there are pending paid order items.

### Variant Deletion Blocked by Pending Shipped Orders

WHEN a seller attempts to delete a variant that has any order item with status "shipped" that references that variant, THE system SHALL block the deletion and notify the seller that the variant cannot be deleted because there are pending shipped order items.

### Variant Deletion Blocked by Pending Requests

WHEN a seller attempts to delete a variant that has any pending cancellation request or pending refund request referencing an order item of that variant, THE system SHALL block the deletion and notify the seller that the variant cannot be deleted because there are pending cancellation or refund requests.

### Last Variant Deletion Makes Product Unpurchasable

WHEN a seller deletes a variant and that variant was the last remaining variant of its product, THE system SHALL mark the product as unpurchasable.

WHILE a product has no variants, it SHALL remain visible in search results and category listings but SHALL be displayed with an "unavailable" label.

Customers SHALL NOT be able to add an unpurchasable product to their cart or wishlist.

### Out of Stock Variant Cart Addition Prevention

WHEN a variant's stock quantity reaches zero, THE system SHALL mark the variant as "out of stock".

WHEN a customer attempts to add an out-of-stock variant to their cart, THE system SHALL reject the addition and display a message that the variant is out of stock and cannot be added to the cart.

IF an out-of-stock variant already exists in a customer's cart, THE system SHALL mark the item as unavailable in the cart view and prevent it from being checked out.

### Out of Stock Variant Display on Product Page

WHILE a variant is out of stock (stock quantity is zero), THE system SHALL display the variant on the product detail page with its price and option values but SHALL mark it visibly as "out of stock" or "unavailable".

Customers MAY view the variant's details (SKU code, option values, price) on the product detail page even when it is out of stock, but SHALL NOT be able to add it to their cart.

### Product Requires at Least One Variant

A product SHALL require at least one variant to be purchasable.

WHEN a product has no variants, THE system SHALL display the product in search results and category listings as "unavailable" and SHALL prevent customers from adding the product to their cart.

WHERE a product has at least one in-stock variant, THE system SHALL allow customers to purchase that variant.

## ProductImage Error Scenarios

Sellers can upload multiple images for each product and reorder them, with the first image serving as the main thumbnail. If a seller deletes all images from a product, the product listing appears without a thumbnail image in search results and category pages. Image changes are captured in product snapshots, so previous images are preserved historically even after deletion or reordering. Only the seller who owns the product can upload, reorder, or delete images for that product; another seller attempting these operations is denied. There is no stated minimum number of images required for a product, so a product with no images is still visible in listings.

### All Product Images Deleted Scenario

WHEN a seller deletes all images from one of their products, THE platform SHALL update the product to have no images. THE platform SHALL continue to display the product in all listings, search results, and the product detail page without a thumbnail image.

### Missing Thumbnail in Search Results

WHEN a product has no uploaded images, THE platform SHALL display the product in search results and category listings without a thumbnail image placeholder. THE platform SHALL NOT hide, deprioritize, or remove the product from search results or category listings due to the absence of images.

### Image Snapshot Preservation on Deletion

WHEN a seller deletes one or more images from a product, THE platform SHALL create a product snapshot that includes the complete set of images before deletion, preserving their urls and sort order. THE deleted or removed images SHALL remain viewable in historical product snapshots by the product owner and administrators, even after deletion.

### Image Snapshot Preservation on Reorder

WHEN a seller reorders images of a product, THE platform SHALL create a product snapshot that captures the image order before the reorder occurred. THE previous image ordering SHALL remain viewable in historical product snapshots by the product owner and administrators.

### Cross-Seller Image Operation Denial

WHEN a seller attempts to upload, reorder, or delete images for a product owned by a different seller, THE platform SHALL reject the operation. THE platform SHALL only allow the seller who owns the product to perform image management operations on that product.

### Product Visible Without Images

IF a product has no images (all deleted or never uploaded), THEN THE platform SHALL still display the product in search results, category listings, and on its product detail page. THE platform SHALL NOT impose a minimum image count requirement for product visibility or purchasability. Products with no variants remain shown as 'unavailable' as defined in [Module 1 > ProductVariant Operations].

### First Image as Main Thumbnail

WHERE a product has at least one image, THE platform SHALL designate the first image in the sort order as the main thumbnail for search results, category listings, and the product detail page. WHEN a seller reorders images, THE platform SHALL update the main thumbnail to the new first image. WHEN the first image is deleted, THE platform SHALL designate the next image in the sort order as the new main thumbnail. WHEN all images are deleted, THE platform SHALL display no thumbnail.

## Address Error Scenarios

Customers can add multiple shipping addresses, each requiring a recipient name, phone number, street address, city, state or province, postal code, and country. If any required field is missing when adding an address, the system rejects the addition. Customers can edit and delete any of their addresses. Only one address can be set as the default shipping address at a time; if a customer sets a new default, the previous default automatically becomes a regular address. The requirements state that customers have one default address but do not specify behavior when that default is deleted, which may need a business rule to handle this edge case.

### Missing Required Address Field Rejection

WHEN a customer adds a shipping address and any required field (recipient name, phone number, street address, city, state or province, postal code, country) is missing, THE system SHALL reject the addition and indicate which specific fields are missing.

WHEN a customer edits a shipping address and any required field is missing, THE system SHALL reject the edit and indicate which specific fields are missing.

### Single Default Address Constraint

THE system SHALL allow at most one default shipping address per customer at any time.

WHEN a customer designates an address as their default shipping address, THE system SHALL automatically remove the default designation from any previously designated default address belonging to that customer.

WHERE a customer has no default shipping address, THE system SHALL not preselect any address during checkout.

### Address Edit Error Scenarios

WHEN a customer attempts to edit a shipping address that belongs to another customer, THE system SHALL reject the edit.

WHEN a customer edits a shipping address and changes any field values, THE system SHALL apply the edits and preserve the address identifier so that existing orders referencing the address remain valid.

WHEN a customer attempts to edit a shipping address that has been deleted, THE system SHALL reject the edit.

### Address Deletion Edge Cases

WHEN a customer deletes their default shipping address, THE system SHALL remove the address from their address book and leave the customer with no default shipping address.

WHEN a customer deletes a non-default shipping address, THE system SHALL remove only that address from their address book and preserve the default designation of any other address unchanged.

WHEN a customer has only one shipping address and deletes it, THE system SHALL remove the address and leave the customer with no saved addresses.

### Multiple Address Storage and Display

THE system SHALL allow customers to store multiple shipping addresses in their address book.

WHEN a customer views their saved addresses, THE system SHALL display all stored addresses and clearly indicate which address, if any, is currently designated as the default shipping address.

WHERE multiple addresses exist for a customer, each address SHALL be independently editable and deletable without affecting other addresses.

## CartItem Error Scenarios

Customers can add variants to their cart by specifying a variant and quantity. If a customer attempts to add a variant that is out of stock, the system prevents the addition since out-of-stock variants cannot be added to the cart. If a variant is deleted by the seller or becomes out of stock after being added to the cart, it is marked as unavailable in the cart. Unavailable items cannot be checked out. If the same variant is already in the cart, adding more combines the quantities rather than creating a separate line item. If a variant's stock is less than the cart quantity, the system shows a warning to the customer. Customers can change quantities and remove items from their cart. The cart shows the total price of all items.

### Variant Selection Required for Cart Addition

WHEN a customer attempts to add a product to the cart, THE system SHALL require the customer to select a specific product variant.

WHEN a customer attempts to add a product variant to the cart without specifying a variant, THE system SHALL reject the addition.

WHERE a customer adds a variant to the cart, THE system SHALL accept the quantity specified by the customer.

### Out of Stock Variant Addition Denial

WHEN a customer attempts to add a product variant to the cart whose stock quantity is zero, THE system SHALL deny the addition.

WHEN a customer attempts to add a product variant to the cart whose stock quantity is zero, THE system SHALL inform the customer that the variant is out of stock and cannot be added.

WHEN a customer attempts to add a product variant to the cart that has been deleted by the seller, THE system SHALL deny the addition.

### Same Variant Quantity Combination

WHEN a customer adds a product variant to the cart that already exists in the cart, THE system SHALL combine the quantities by adding the new quantity to the existing quantity rather than creating a separate cart item.

WHEN a customer adds the same variant to the cart with quantity of 2 and the cart already contains 3 of that variant, THE system SHALL update the cart item quantity to 5.

### Insufficient Stock Warning for Cart Items

WHILE a variant in the customer's cart has a stock quantity that is less than the cart item quantity, THE system SHALL display a warning to the customer indicating that the available stock is insufficient for the requested quantity.

WHERE a variant's stock quantity is less than the cart item quantity, THE system SHALL still allow the cart item to remain but SHALL mark it with a warning.

WHERE a variant's stock quantity is zero, THE system SHALL mark the cart item as unavailable in the cart.

### Deleted Variant Marked Unavailable in Cart

WHEN a variant in a customer's cart is deleted by the seller, THE system SHALL mark that cart item as unavailable.

WHEN a variant in a customer's cart becomes out of stock (stock reaches zero), THE system SHALL mark that cart item as unavailable.

WHILE a cart item is marked as unavailable, THE system SHALL display an indicator to the customer explaining that the item is no longer available for purchase.

### Unavailable Item Checkout Prevention

WHEN a customer proceeds to checkout, THE system SHALL check all cart items for availability.

WHEN any cart item is marked as unavailable (due to deletion or being out of stock), THE system SHALL prevent the customer from checking out those items.

WHEN a cart contains both available and unavailable items, THE system SHALL allow checkout of the available items only and SHALL inform the customer that the unavailable items have been excluded from the order.

### Cart Quantity Modification and Item Removal

WHEN a customer modifies the quantity of a cart item, THE system SHALL update the quantity to the customer's specified value.

WHEN a customer sets the quantity of a cart item to zero, THE system SHALL remove that cart item.

WHEN a customer removes a cart item, THE system SHALL delete the cart item and recalculate the cart total price.

WHERE a customer modifies a cart item's quantity to exceed the variant's stock quantity, THE system SHALL accept the quantity change but SHALL display an insufficient stock warning (as defined in "Insufficient Stock Warning for Cart Items").

### Cart Total Price Display

WHILE the customer views the cart, THE system SHALL display the total price of all cart items.

THE system SHALL calculate the total price by summing the price of each variant multiplied by its quantity in the cart.

WHERE a cart item is marked as unavailable, THE system SHALL exclude that item from the total price calculation OR display it separately with the total of available items.

## WishlistItem Error Scenarios

Customers can add products to their wishlist. If a customer attempts to add a product that is already in their wishlist, the requirements do not specify whether duplicates are allowed or prevented. If a product is deleted by the seller, it is automatically removed from all customers' wishlists silently without notifying the customer. If a customer tries to remove a product that is not in their wishlist, the system may silently succeed or indicate the item was not found. The wishlist stores products, not specific variants, so variant-level changes do not affect wishlist entries. Customers can view their wishlist in a paginated list.

### Adding Products to Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL add that product to the customer's wishlist.

WHERE a customer attempts to add a product that is already present in their wishlist, THE system SHALL reject the duplicate addition. The product appears only once in the wishlist regardless of how many times the customer attempts to add it.

WHERE a customer attempts to add a product that has been deleted by its seller, THE system SHALL reject the addition. The customer receives no notification that the product was deleted.

### Automatic Removal on Product Deletion

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customers' wishlists.

The removal SHALL occur silently — customers are not notified that the deleted product has been removed from their wishlist.

IF a customer views their wishlist after a product deletion, the deleted product SHALL NOT appear in the wishlist.

### Removing Products from Wishlist

WHEN a customer requests removal of a product from their wishlist, THE system SHALL remove that product from the customer's wishlist.

WHERE a customer attempts to remove a product that is not present in their wishlist, THE system SHALL treat the request as successful — the result is the same (the product is not in the wishlist). No error is indicated to the customer.

### Viewing the Wishlist

WHEN a customer views their wishlist, THE system SHALL display only products that the customer has added and that have not been deleted by their sellers.

THE system SHALL display the wishlist in paginated form. Each page SHALL show a fixed number of products.

WHILE viewing the wishlist, products that were deleted by their sellers SHALL NOT appear, as they were automatically removed.

### Wishlist Stores Products Not Variants

THE wishlist SHALL store products — not specific product variants.

WHEN a customer adds a product to their wishlist, the wishlist entry references the product itself, not any particular variant or SKU of that product.

WHERE a variant's stock reaches zero, is edited, or is deleted, the containing product SHALL remain in customers' wishlists unaffected. Variant-level changes do not impact wishlist entries.

IF a product has no purchasable variants (all variants deleted or out of stock), the product MAY still appear in the wishlist but customers cannot add it to cart from the wishlist.

## Order Error Scenarios

When a customer proceeds to checkout, unavailable items in the cart cannot be checked out. A shipping address must be selected; if none is selected and no default exists, the system should prompt the customer to add or select an address. After an order is placed, the shipping address cannot be changed. If payment fails, the order is not created and the customer can retry with the same cart contents. Only a successful payment results in order creation. The overall order status is derived from its item statuses; for example, if some items are delivered and others refunded, the order shows as partially completed. If a customer attempts to cancel an entire order, the system handles cancellation per item, not per order. Administrators can force-cancel or force-refund individual items or entire orders.

### Unavailable Item Checkout Prevention

WHEN a customer proceeds to checkout from their cart, THE system SHALL evaluate each cart item for availability.

THE system SHALL consider a cart item unavailable if:
- The associated product variant is out of stock (stock quantity is zero)
- The associated product variant has been deleted
- The associated product has been deleted

IF any cart item is unavailable, THEN THE system SHALL block the checkout process.

THE system SHALL display a message listing each unavailable item along with the specific reason (e.g., "out of stock", "variant no longer exists").

THE customer SHALL be able to remove unavailable items from the cart and proceed with checkout using only the available items.

### Missing Shipping Address at Checkout

WHEN a customer proceeds to checkout, THE system SHALL verify that a shipping address has been selected.

IF no shipping address is selected AND the customer has no default shipping address defined (default address management is defined in [01-actors-and-auth.md]), THEN THE system SHALL prompt the customer to add a new shipping address or select from existing addresses.

THE system SHALL NOT allow the order to proceed until a valid shipping address has been selected.

IF the customer has a default shipping address defined (as set through Address Management operations), THE system SHALL pre-select that address as the shipping destination for the order.

### Shipping Address Immutability After Placement

WHEN an order is successfully placed, THE system SHALL record the selected shipping address as part of the order record (shipping address association is defined in [02-domain-model.md > Order]).

AFTER an order is placed, THE system SHALL NOT permit any modification to the shipping address associated with that order.

IF a customer attempts to change the shipping address after order placement, THE system SHALL reject the request and SHALL inform the customer that the shipping address is locked once the order is placed.

This restriction applies regardless of the order status — even for orders with status "paid" that have not yet been shipped.

### Payment Failure Preventing Order Creation

WHEN a customer confirms the order and initiates payment, THE system SHALL submit the payment to the external payment gateway.

IF the payment fails (e.g., card declined, insufficient funds, gateway timeout), THEN THE system SHALL NOT create the order record.

THE system SHALL display a clear error message to the customer indicating that the payment was unsuccessful.

THE customer's cart SHALL remain intact with all items and quantities preserved, allowing the customer to review and retry.

THE customer SHALL NOT be charged for any failed payment attempt.

### Payment Retry After Payment Failure

IF payment fails during checkout, THEN THE system SHALL allow the customer to retry without losing their cart contents.

WHEN the customer retries payment, THE system SHALL preserve:
- The same cart contents with quantities unchanged
- The selected shipping address
- The order summary with item list and total price

THE customer SHALL also be allowed to modify their cart or shipping address before retrying.

WHEN the customer retries and payment succeeds, THE system SHALL create the order normally (order creation flow is defined in Module 1 > Order Operations).

### Derived Order Status from Item Statuses

THE system SHALL derive the overall order status from the statuses of all order items belonging to that order (order item status values are defined in [02-domain-model.md > OrderItem]).

IF all order items have status "paid", THEN THE order status SHALL be "paid".

IF any order item has status "shipped" AND none have status "delivered", THEN THE order status SHALL be "shipped".

IF all order items have status "delivered", THEN THE order status SHALL be "delivered".

IF all order items have status "cancelled", THEN THE order status SHALL be "cancelled".

IF all order items have status "refunded", THEN THE order status SHALL be "refunded".

IF order items have a mix of statuses that do not match any single-status rule above (e.g., some delivered and some refunded), THEN THE order status SHALL be "partially completed".

### Mixed Item Status Partial Completion Behavior

WHEN the overall order status is "partially completed" due to mixed item statuses, THE system SHALL display each order item with its individual status alongside the overall order status.

THE customer SHALL be able to see which specific items are delivered, cancelled, refunded, or still in progress.

IF some items are delivered and others remain in transit, THE customer SHALL be able to take actions on eligible items (e.g., confirm delivery, request refund) independently without affecting other items in the same order.

THE system SHALL continue to process status transitions for each order item independently according to its individual workflow, even while the overall order shows "partially completed".

### Per-Item Cancellation Not Per-Order

IF a customer attempts to cancel an entire order, THE system SHALL NOT process a single order-level cancellation.

INSTEAD, THE system SHALL identify all order items within the order that have status "paid" (eligible for cancellation per cancellation rules defined in Module 2 > CancellationRequest Error Scenarios).

THE system SHALL present the customer with the list of eligible items and allow the customer to select which items to cancel individually.

Items with status "shipped", "delivered", "cancelled", or "refunded" SHALL NOT be affected by this operation.

THE system SHALL display which items were successfully cancelled and which items could not be cancelled (with reasons).

### Administrator Force Cancel Orders

WHEN an administrator performs a force cancellation on an order item, THE system SHALL:
- Change the status of the specified order item to "cancelled"
- Process a refund for the cancelled item
- Restore the stock quantity for the associated product variant via an inventory record (inventory record creation is defined in Module 1 > InventoryRecord Operations)
- Create a snapshot of the cancellation state (snapshot rules are defined in [02-domain-model.md > Snapshot])

WHEN an administrator performs a force cancellation on an entire order, THE system SHALL apply the force cancellation to all order items within that order.

IF an order item already has status "cancelled", "refunded", or "delivered", THE system SHALL skip that item during force cancellation and SHALL notify the administrator which items could not be cancelled.

Force cancellation SHALL NOT be subject to the usual per-item cancellation eligibility rules — administrators SHALL be able to force cancel items regardless of their current status.

### Administrator Force Refund Orders

WHEN an administrator performs a force refund on an order item, THE system SHALL:
- Change the status of the specified order item to "refunded"
- Process a refund for the item
- Restore the stock quantity for the associated product variant via an inventory record
- Create a snapshot of the refund state

WHEN an administrator performs a force refund on an entire order, THE system SHALL apply the force refund to all order items within that order.

IF an order item already has status "refunded" or "cancelled", THE system SHALL skip that item during force refund and SHALL notify the administrator which items could not be refunded.

Force refund SHALL NOT be subject to the usual per-item refund eligibility rules (7-day delivery window, delivered status requirement) — administrators SHALL be able to force refund items regardless of their current status or delivery date.

## OrderItem Error Scenarios

Each order item has its own status: paid, shipped, delivered, cancelled, or refunded. A customer can request cancellation only for items with paid status. If a customer attempts to cancel an item with shipped or delivered status, the system denies the request. A cancellation request requires a reason. A customer can request a refund only for items with delivered status and within 7 days of delivery. If a customer attempts to refund an item outside the 7-day window or with a non-delivered status, the system rejects the request. A refund request requires a reason. The seller of each item can approve or reject cancellation and refund requests. When a seller responds, a snapshot of the request state is created. If approved, cancelled or refunded items restore stock quantities. The remaining items in the order are unaffected by individual item cancellation or refund.

### Cancellation Eligibility Status Validation for Order Items

THE system SHALL restrict cancellation requests to order items with "paid" status only.
WHEN a customer attempts to request cancellation for an order item with "shipped", "delivered", "cancelled", or "refunded" status, THE system SHALL deny the request and inform the customer that only items with "paid" status can be cancelled.
WHEN a customer submits a cancellation request, THE system SHALL require a cancellation reason. IF no reason is provided, THEN THE system SHALL reject the request.

### Refund Eligibility Status and Time Window Validation for Order Items

THE system SHALL restrict refund requests to order items with "delivered" status only.
WHEN a customer attempts to request a refund for an order item with "paid", "shipped", "cancelled", or "refunded" status, THE system SHALL deny the request and inform the customer that only items with "delivered" status can be refunded.
WHEN a customer submits a refund request, THE system SHALL enforce a 7-day refund window starting from the item's delivery date. IF the refund request is submitted more than 7 days after delivery, THEN THE system SHALL reject the request and inform the customer that the refund window has expired.
WHEN a customer submits a refund request, THE system SHALL require a refund reason. IF no reason is provided, THEN THE system SHALL reject the request.

### Seller Response Handling for Cancellation and Refund Requests

WHEN a seller receives a cancellation request for one of their order items, THE system SHALL allow the seller to either approve or reject the request.
WHEN a seller receives a refund request for one of their order items, THE system SHALL allow the seller to either approve or reject the request.
WHEN a seller responds to a cancellation or refund request (whether approving or rejecting), THE system SHALL create a snapshot recording the request state, including the seller's decision, the timestamp of the response, and the before and after status values of the order item.

### Stock Restoration and Order-Level Impact of Cancellation or Refund

WHEN a seller approves a cancellation request for an order item, THE system SHALL change the item's status to "cancelled" and create a positive inventory record to restore the stock quantity of the corresponding product variant.
WHEN a seller approves a refund request for an order item, THE system SHALL change the item's status to "refunded" and create a positive inventory record to restore the stock quantity of the corresponding product variant.
WHEN an order item is cancelled or refunded, THE system SHALL leave all other order items in the same order unaffected, allowing them to continue their normal status progression.

## Shipment Error Scenarios

Sellers create shipments by selecting one or more order items from their own products. Different sellers always ship separately; a shipment cannot contain items from different sellers. When a shipment is created, the seller must enter a carrier name and tracking number. All items in a shipment share the same tracking information and change to shipped status. If a seller attempts to include an item that is not in paid status, the system should prevent it since only paid items are ready for shipping. Customers confirm delivery per shipment, not per item. If a customer does not confirm delivery, items automatically change to delivered after 14 days from the shipping date. If a customer attempts to confirm delivery of a shipment that has not been shipped yet, the system denies the action.

### Cross-Seller Item Shipment Prevention

IF a seller attempts to include order items from another seller's products in a shipment, THEN THE system SHALL reject the shipment creation and SHALL notify the seller that a shipment can only contain items from their own products.

### Carrier Name and Tracking Number Required

IF a seller attempts to create a shipment without providing a carrier name, THEN THE system SHALL reject the shipment creation.

IF a seller attempts to create a shipment without providing a tracking number, THEN THE system SHALL reject the shipment creation.

IF a seller provides only a carrier name but no tracking number, OR only a tracking number but no carrier name, THEN THE system SHALL reject the shipment creation and SHALL notify the seller that both carrier name and tracking number are required.

### Non-Paid Item Shipment Denial

IF a seller attempts to include an order item whose status is not "paid" in a shipment, THEN THE system SHALL reject the shipment creation and SHALL inform the seller that only items with "paid" status can be shipped.

Items with statuses such as "shipped", "delivered", "cancelled", or "refunded" SHALL be ineligible for shipment inclusion.

### Same Tracking for All Shipment Items

IF a seller attempts to assign different tracking information to individual items within the same shipment, THEN THE system SHALL deny the action since all items in a single shipment share identical carrier name and tracking number.

### Per-Shipment Delivery Confirmation

IF a customer attempts to confirm delivery for a single order item within a shipment rather than the entire shipment, THEN THE system SHALL deny the action and SHALL require the customer to confirm delivery for the entire shipment.

### Premature Delivery Confirmation Denial

IF a customer attempts to confirm delivery of a shipment whose status is not "shipped" (i.e., no shipment has been created or items are still in "paid" status), THEN THE system SHALL deny the action.

IF a customer attempts to confirm delivery of a shipment where no carrier name and tracking number have been recorded, THEN THE system SHALL deny the action.

### Automatic Delivery After 14 Days

WHEN 14 calendar days have elapsed since a shipment was marked as "shipped" and the customer has not confirmed delivery, THE system SHALL automatically change the status of all order items in that shipment to "delivered".

IF a customer confirms delivery before the 14-day automatic delivery period expires, THEN the automatic delivery SHALL NOT apply, and the customer's confirmation date SHALL be used as the delivery date.

IF some items in a shipment have been cancelled before the 14-day automatic delivery period expires, THEN the automatic delivery SHALL apply only to the remaining non-cancelled items in that shipment.

## CancellationRequest Error Scenarios

Customers can submit a cancellation request only for order items with paid status. If a customer attempts to submit a cancellation request for an item with shipped, delivered, cancelled, or refunded status, the system rejects the request. The cancellation request must include a reason; a request without a reason is rejected. The seller of the item reviews the request and can either approve or reject it. If the seller rejects the cancellation, the item remains in paid status and continues processing normally. If the seller approves, the item is cancelled and a refund is processed for that item only. A snapshot of the cancellation request state is created when the seller responds. Approved cancellations restore stock quantities. If all items in an order are cancelled, the overall order status becomes cancelled. If a customer attempts to submit a duplicate cancellation request for the same item while one is already pending, the system should indicate that a request is already under review.

### Non-Paid Item Cancellation Rejection

WHEN a customer attempts to submit a cancellation request for an order item that does not have "paid" status, THE system SHALL reject the request.

WHEN a customer attempts to submit a cancellation request for an order item with "shipped", "delivered", "cancelled", or "refunded" status, THE system SHALL reject the request and indicate that cancellation is only available for items awaiting shipment.

### Cancellation Reason Requirement

WHEN a customer submits a cancellation request, THE system SHALL require a reason in text form.

IF the cancellation request does not include a reason, THEN THE system SHALL reject the request.

### Seller Rejection Keeps Item Active

WHEN a seller rejects a cancellation request, THE system SHALL keep the order item in "paid" status.

WHEN a cancellation request is rejected, THE system SHALL continue normal processing for that order item, including shipment eligibility.

### Seller Approval Triggers Cancellation

WHEN a seller approves a cancellation request, THE system SHALL change the order item's status to "cancelled".

WHEN a cancellation request is approved, THE system SHALL process a refund for that item only, without affecting other items in the same order.

### Snapshot on Cancellation Request Response

WHEN a seller responds to a cancellation request (either approving or rejecting), THE system SHALL create a snapshot of the cancellation request state.

THE snapshot SHALL record: the timestamp of the response, the seller's decision (approved or rejected), and the state of the request before and after the response.

### Stock Restoration on Approved Cancellation

WHEN a cancellation request is approved and the order item is cancelled, THE system SHALL restore the stock quantity for the cancelled item's product variant.

THE stock restoration SHALL be recorded as a positive inventory record with the reason set to "cancellation".

### All Items Cancelled Order Status

WHEN all order items in an order are cancelled, THE system SHALL set the overall order status to "cancelled".

IF some items remain active while others are cancelled, THE system SHALL derive the order status based on the status of the remaining active items, not from the cancelled items.

### Duplicate Pending Cancellation Request Handling

WHEN a customer attempts to submit a cancellation request for an order item that already has a pending cancellation request, THE system SHALL reject the duplicate request.

WHEN a duplicate cancellation request is detected, THE system SHALL indicate to the customer that a cancellation request for that item is already under review and awaiting the seller's response.

## RefundRequest Error Scenarios

Customers can submit a refund request only for order items with delivered status and within 7 days of delivery. If a customer attempts to submit a refund request for an item with paid, shipped, cancelled, or refunded status, the system rejects the request. If the customer attempts to submit a refund request beyond the 7-day window, the system rejects it as expired. The refund request must include a reason; a request without a reason is rejected. The seller of the item reviews the request and can either approve or reject it. If the seller rejects the refund, the item remains in delivered status. If the seller approves, the item is refunded and stock quantities are restored. A snapshot of the refund request state is created when the seller responds. If all items in an order are refunded, the overall order status becomes refunded. If a customer attempts to submit a duplicate refund request while one is pending, the system should indicate that a request is already under review.

### Non-Delivered Item Refund Rejection

WHEN a customer attempts to submit a refund request for an order item whose status is not "delivered", THEN THE system SHALL reject the request.

WHEN an order item has status "paid", "shipped", "cancelled", or "refunded", AND a customer attempts to request a refund, THEN THE system SHALL deny the action and indicate that only delivered items are eligible for refund.

### Seven-Day Refund Window Enforcement

WHEN a customer attempts to submit a refund request for a delivered order item more than 7 calendar days after the item's delivery date, THEN THE system SHALL reject the request as expired.

WHEN a customer attempts to submit a refund request for a delivered order item within 7 calendar days from the delivery date, THEN THE system SHALL accept the request for processing.

The 7-day window begins on the date the order item's status changed to "delivered" and expires at the end of the 7th calendar day.

### Refund Reason Requirement

WHEN a customer submits a refund request, THEN THE system SHALL require a reason (text) to be provided.

WHEN a customer attempts to submit a refund request without providing a reason, THEN THE system SHALL reject the request and indicate that a reason is required.

### Seller Refund Approval and Stock Restoration

WHEN a seller approves a refund request for an order item, THEN THE system SHALL change that order item's status to "refunded", create a snapshot of the refund request state including the seller's response, AND create a positive inventory record for the corresponding variant to restore the stock quantity.

WHEN a seller rejects a refund request for an order item, THEN THE system SHALL create a snapshot of the refund request state including the seller's response, AND the order item SHALL remain in "delivered" status with no changes to stock quantities.

### All Items Refunded Order Status

WHEN all order items within an order have been refunded, THEN THE system SHALL set the order's overall status to "refunded".

WHEN some items in an order are refunded while others are delivered or in another state, THEN THE system SHALL reflect the mixed status ("partially completed") as the overall order status.

### Duplicate Pending Refund Request Prevention

WHEN a customer attempts to submit a refund request for an order item that already has a pending refund request, THEN THE system SHALL reject the duplicate request and indicate that a refund request is already under review for that item.

## Review Error Scenarios

Customers can write a review only for products they have purchased and only after the order item status is delivered. If a customer attempts to review a product they have not purchased or before delivery, the system rejects the review. Customers can write only one review per product per order. If a customer attempts to submit a second review for the same product in the same order, the system rejects the duplicate. Each review requires a rating from 1 to 5 stars; text content is optional. If a rating is missing or outside the 1-5 range, the system rejects the review. Customers can edit their own reviews, and every edit creates a snapshot of the review state. Customers can delete their own reviews, but snapshots are preserved. When a review is deleted, it no longer counts toward the product's average rating. The product's average rating is calculated from all non-deleted reviews only. If a customer deletes their account, their reviews remain but are shown as from a deleted user.

### Review Without Purchase Denial

WHEN a customer attempts to submit a review for a product that does not appear in any of their past order items, THE system SHALL reject the review submission.

WHEN a customer attempts to submit a review for a product they have purchased but the associated order item has never reached the "delivered" status, THE system SHALL reject the review submission.

### Pre-Delivery Review Denial

WHEN a customer attempts to submit a review for a product whose associated order item currently has a status of "paid" or "shipped", THE system SHALL reject the review submission.

THE system SHALL accept review submissions only after the associated order item status has transitioned to "delivered".

### One Review Per Product Per Order Limit

THE system SHALL allow at most one review per product per order for each customer.

WHEN a customer has already submitted a review for a specific product within a given order and attempts to submit a second review for the same product and order combination, THE system SHALL reject the second review submission.

A deleted review SHALL count toward the one-review limit; the customer SHALL NOT be permitted to submit a new review for the same product and order after deleting their original review.

### Duplicate Review Rejection

THE system SHALL detect duplicate review submissions based on the combination of customer identity, product identity, and order identity.

WHEN a customer attempts to submit a review for a product and order combination that already has an existing non-deleted review by that customer, THE system SHALL reject the submission.

WHEN a customer attempts to submit a review for a product and order combination that previously had a review that was deleted, THE system SHALL also reject the submission, as the one-review limit persists after deletion.

### Missing Rating Rejection

THE system SHALL require a rating value for every review submission.

WHEN a customer submits a review without providing a rating, THE system SHALL reject the review submission.

Text content for a review is optional; THE system SHALL accept review submissions that contain only a rating and no text content.

### Rating Out of Range Rejection

THE system SHALL accept only integer rating values between 1 and 5 (inclusive).

WHEN a customer submits a review with a rating value below 1, such as 0 or a negative number, THE system SHALL reject the review submission.

WHEN a customer submits a review with a rating value above 5, such as 6 or higher, THE system SHALL reject the review submission.

WHEN a customer submits a review with a non-integer rating value, THE system SHALL reject the review submission.

### Review Edit Snapshot Creation

WHEN a customer edits an existing review, THE system SHALL create a snapshot of the review state before applying the edit.

The snapshot SHALL record: the timestamp of the edit, the previous rating value, the previous text content, the new rating value, and the new text content.

THE system SHALL preserve review edit snapshots according to the Snapshot Principle as defined in the domain model.

### Review Deletion Preserves Snapshots

WHEN a customer deletes a review, THE system SHALL mark the review as deleted but SHALL NOT remove the review record from the database.

All snapshots associated with the deleted review, including snapshots created during prior edits, SHALL remain permanently preserved.

THE system SHALL NOT allow a deleted review to be undeleted or restored.

### Deleted Review Exclusion from Average Rating

WHEN a review is deleted by its author, THE system SHALL immediately exclude that review from the product's average rating calculation.

THE system SHALL recalculate the product's average rating dynamically after each review deletion, considering only the remaining non-deleted reviews.

WHEN all reviews for a product have been deleted, THE system SHALL display the product's average rating as unavailable or indicate that no ratings exist.

### Average Rating from Non-Deleted Reviews Only

THE system SHALL calculate a product's average rating using only reviews where the deletion status is false.

Reviews marked as deleted SHALL have no influence on the computed average rating value.

THE system SHALL recalculate the product's average rating dynamically whenever a new review is submitted, an existing review is edited, or a review is deleted.

### Deleted User Review Anonymity

WHEN a customer deletes their account, the reviews they have written SHALL remain visible on the respective product detail pages.

Reviews authored by a deleted customer account SHALL display the reviewer name as "deleted user" instead of the original customer display name.

Reviews from deleted customer accounts SHALL continue to count toward the product's average rating, following the same rules as reviews from active customers.

### Review Sorting — Newest First

Reviews displayed on a product detail page SHALL be sorted in descending order by their creation timestamp.

The most recently submitted review SHALL appear first in the review list.

Edited reviews SHALL retain their original creation timestamp for sorting purposes; the edit timestamp SHALL NOT alter the sort position.

Deleted reviews SHALL NOT appear in the sorted review list displayed to customers.

## InventoryRecord Error Scenarios

Each variant's current stock is calculated by summing all inventory records associated with that variant. Sellers can add inventory with a quantity and reason for restocking. Sellers can subtract inventory with a quantity and reason for adjustments or loss. When an order is placed, the system automatically creates a negative inventory record for each purchased variant. When an order item is cancelled or refunded, the system automatically creates a positive inventory record to restore stock. Current stock is always the sum of all records, so sellers should consider the impact of inventory subtraction on the calculated stock level. Sellers can view the full inventory history of each variant. When stock reaches zero, the variant is shown as out of stock and cannot be added to a cart. There is no stated minimum or maximum inventory level enforced by the system.

### Insufficient Stock for Manual Subtraction

WHEN a seller attempts to subtract inventory with a quantity that exceeds the variant's current calculated stock (the sum of all inventory records), THE system SHALL reject the operation.

WHEN the operation is rejected, THE system SHALL NOT allow the calculated stock to become negative through manual subtraction.

WHEN the operation is rejected, THE system SHALL present an error to the seller indicating insufficient stock for the requested adjustment.

WHEN the operation is rejected, THE system SHALL leave the variant's inventory records unchanged.

### Invalid Restock Quantity

WHEN a seller attempts to restock inventory with a quantity of zero, THE system SHALL reject the operation.

WHEN a seller attempts to restock inventory with a negative quantity, THE system SHALL reject the operation.

WHEN the operation is rejected due to invalid quantity, THE system SHALL present an error to the seller explaining that the restock quantity must be a positive number.

WHEN the operation is rejected, THE system SHALL leave the variant's inventory records unchanged.

### Invalid Subtraction Quantity

WHEN a seller attempts to subtract inventory with a quantity of zero, THE system SHALL reject the operation.

WHEN a seller attempts to subtract inventory with a negative quantity, THE system SHALL reject the operation.

WHEN the operation is rejected due to invalid quantity, THE system SHALL present an error to the seller explaining that the subtraction quantity must be a positive number.

WHEN the operation is rejected, THE system SHALL leave the variant's inventory records unchanged.

### Missing Reason for Manual Adjustment

WHEN a seller attempts to add inventory (restock) without providing a reason, THE system SHALL reject the operation.

WHEN a seller attempts to subtract inventory without providing a reason, THE system SHALL reject the operation.

WHEN the operation is rejected due to missing reason, THE system SHALL present an error to the seller indicating that a textual reason is required for inventory adjustments.

WHEN the operation is rejected, THE system SHALL leave the variant's inventory records unchanged.

### Order Deduction on Variant with Insufficient Stock

WHEN an order is placed that includes a variant whose current calculated stock is less than the ordered quantity, THE system SHALL reject the order for that variant.

WHEN the order is rejected due to insufficient stock, THE system SHALL NOT create the negative inventory record for that variant.

WHEN the order is rejected due to insufficient stock, THE system SHALL present an error to the customer indicating insufficient stock for the requested quantity.

WHEN only some items in an order have insufficient stock, THE system SHALL allow the remaining items (with sufficient stock) to proceed normally.

### Stock Calculation as Sum of All Records

THE system SHALL calculate current stock for a variant at all times as the sum of all inventory records associated with that variant.

THE system SHALL include positive records (restocks, cancellation restorations, refund restorations) and negative records (manual subtractions, order deductions) in the sum.

THE system SHALL NOT retroactively correct or adjust historical inventory records to enforce a minimum stock level.

WHEN the calculated stock reaches zero, THE system SHALL mark the variant as out of stock.

## Snapshot Error Scenarios

Snapshots are created whenever editable data is modified, recording the timestamp, what was changed, and the values before and after. Snapshots are immutable and cannot be deleted by any user, including administrators. If any user attempts to delete a snapshot, the system denies the operation. Product snapshots include all product fields and snapshots of all variants at that moment. Order item snapshots preserve the product, variant, and seller profile at the time of purchase. Cancellation and refund request snapshots are created when the seller responds. Review snapshots are created on every review edit. Seller profile snapshots are created on every shop name, description, or logo change. Snapshots are preserved even after the related entities such as products or reviews are deleted. Only the owning seller or administrators can view product snapshots. Snapshots serve as an immutable audit trail for dispute resolution.

### Snapshot Immutability Enforcement

WHEN a snapshot exists, THE system SHALL prevent any modification to its recorded timestamp, changed fields, before-values, or after-values.

WHEN a snapshot exists, THE system SHALL deny any attempt to update, overwrite, or patch the snapshot data.

IF a user attempts to modify any field of a snapshot, THEN THE system SHALL reject the operation.

### Snapshot Deletion Denial for All Users

WHEN a snapshot exists, THE system SHALL deny all deletion attempts regardless of the requesting user's role.

IF a customer attempts to delete a snapshot, THEN THE system SHALL reject the operation.

IF a seller attempts to delete a snapshot, THEN THE system SHALL reject the operation.

IF an administrator attempts to delete a snapshot, THEN THE system SHALL reject the operation.

IF a super administrator attempts to delete a snapshot, THEN THE system SHALL reject the operation.

### Product Snapshot Includes Variant Snapshots

WHEN a seller edits a product, THE system SHALL create a product snapshot capturing all product fields (name, description, category, base price, images) AND SHALL also capture a snapshot of every product variant existing at that moment.

WHEN a product snapshot is created, THE system SHALL record each variant's SKU code, option values, and price within the same snapshot structure.

IF a variant is created or deleted after a product snapshot was taken, THE system SHALL NOT retroactively modify the existing snapshot.

### Order Item Snapshot Preservation at Purchase

WHEN an order is placed successfully, THE system SHALL create a snapshot of each purchased product and its variant with the order item, preserving the product name, description, variant options, and price at the time of purchase.

WHEN an order is placed successfully, THE system SHALL create a snapshot of each seller's profile with the order item, preserving the shop name and logo at the time of purchase.

IF a product is later edited or deleted, THE system SHALL preserve the order item snapshot unchanged.

IF a seller profile is later edited, THE system SHALL preserve the order item snapshot unchanged.

### Cancellation Request Snapshot on Seller Response

WHEN a seller responds to a cancellation request by approving it, THE system SHALL create a snapshot of the request capturing the reason, the seller's decision, and the response timestamp.

WHEN a seller responds to a cancellation request by rejecting it, THE system SHALL create a snapshot of the request capturing the reason, the seller's decision, and the response timestamp.

IF a cancellation request has no response yet, THEN THE system SHALL NOT create a snapshot.

### Refund Request Snapshot on Seller Response

WHEN a seller responds to a refund request by approving it, THE system SHALL create a snapshot of the request capturing the reason, the seller's decision, and the response timestamp.

WHEN a seller responds to a refund request by rejecting it, THE system SHALL create a snapshot of the request capturing the reason, the seller's decision, and the response timestamp.

IF a refund request has no response yet, THEN THE system SHALL NOT create a snapshot.

### Review Edit Snapshot Creation

WHEN a customer edits a review's rating, THE system SHALL create a snapshot capturing the previous rating value before the edit.

WHEN a customer edits a review's text content, THE system SHALL create a snapshot capturing the previous text content before the edit.

IF a customer edits both rating and text in a single operation, THEN THE system SHALL create one snapshot capturing both previous values.

IF a customer deletes a review, THEN THE system SHALL preserve all existing review snapshots associated with that review.

### Seller Profile Snapshot on Edit

WHEN a seller edits their shop name, THE system SHALL create a snapshot capturing the previous shop name before the change.

WHEN a seller edits their shop description, THE system SHALL create a snapshot capturing the previous description before the change.

WHEN a seller edits their logo image, THE system SHALL create a snapshot capturing the previous logo before the change.

IF a seller edits multiple profile fields in a single operation, THEN THE system SHALL create one snapshot capturing all previous values at that moment.

### Snapshot Preservation After Entity Deletion

WHEN a product is deleted, THE system SHALL preserve all product snapshots and variant snapshots associated with that product.

WHEN a review is deleted, THE system SHALL preserve all review snapshots associated with that review.

WHEN a seller account is deleted, THE system SHALL preserve all seller profile snapshots associated with past order items.

IF any entity with associated snapshots is deleted, THEN THE system SHALL retain all its snapshots in an immutable, queryable state.

### Snapshot Viewing Restricted to Owners and Administrators

WHEN a seller requests to view a product's snapshots, THE system SHALL allow access only if the seller is the owner of that product.

WHEN an administrator requests to view a product's snapshots, THE system SHALL allow access for any product regardless of ownership.

WHEN a customer requests to view a review's snapshots, THE system SHALL allow access only if the customer is the author of that review.

IF a user who is neither the owning seller nor an administrator requests to view a product's snapshots, THEN THE system SHALL deny the request.

### Snapshot Audit Trail for Dispute Resolution

WHEN a dispute arises regarding a product's state at a past point in time, THE system SHALL provide the owning seller and administrators with access to the relevant product snapshots.

WHEN a dispute arises regarding order fulfillment, THE system SHALL provide the customer, the seller, and administrators with access to the order item snapshots capturing product and seller profile at the time of purchase.

WHEN a dispute arises regarding a cancellation or refund, THE system SHALL provide the customer, the seller, and administrators with access to the cancellation request and refund request snapshots.

WHEN a dispute arises regarding a review, THE system SHALL provide administrators with access to all review snapshots for investigation.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Customer Registration and Initial Account Setup Journey

A new customer discovers the e-commerce platform and begins their onboarding journey.

**Step 1 — Registration**: The customer navigates to the registration page and creates an account by providing an email address and password. The system validates that the email is not already registered — if a duplicate email is provided, the request is rejected. The system creates the customer account.

**Step 2 — Initial Login**: The customer logs in with their registered email and password. The system authenticates the credentials. If the credentials are invalid, the login is denied. Upon successful authentication, the customer is granted access to the platform.

**Step 3 — Profile Setup**: After first login, the customer accesses their profile settings. The customer sets their display name and phone number. The system saves the profile information. The customer can later edit these fields.

**Step 4 — Address Addition**: The customer navigates to address management and adds a shipping address by providing recipient name, phone number, street address, city, state/province, postal code, and country. If any required field is missing, the request is rejected. The customer sets this address as the default shipping address. Only one address can be the default — setting a new default replaces the previous default.

**Step 5 — Platform Exploration**: With account active and profile configured, the customer can now browse categories, search for products, view product details, and begin shopping.

### Seller Onboarding and Product Listing Journey

A seller registers on the platform, undergoes administrator approval, and begins listing products for sale.

**Step 1 — Seller Registration**: The seller navigates to the seller registration page and creates a seller account with an email address and password. The seller provides their shop name, shop description, and logo image. The system creates the seller account with an initial approval status of "pending".

**Step 2 — Awaiting Approval**: The seller views their approval status on their dashboard, seeing that they are pending administrator review. The system shows the seller their current status.

**Step 3 — Administrator Review**: An administrator views the list of pending seller approvals. The administrator reviews the seller's shop information. If the administrator approves, the seller's account status changes to "approved". If the administrator rejects, a rejection reason must be provided, and the seller's status becomes "rejected".

**Step 3a — Rejection Handling**: If the seller is rejected, they view the rejection reason on their dashboard. The seller can submit a new registration request with updated information, which restarts the approval process.

**Step 4 — Product Creation**: Once approved, the seller creates a product by providing a name (required), description (required), selecting a category (or subcategory), and setting a base price (required). If required fields are missing, the request is rejected. The system creates the product and associates it with the seller.

**Step 5 — Variant Setup**: The seller adds variants to the product. For each variant, the seller provides a unique SKU code, option values (e.g., "Red / Large"), an optional price override, and a stock quantity (defaults to 0). If the SKU code already exists, the request is rejected. The product now has purchasable variants. A product must have at least one variant to be purchasable.

**Step 6 — Image Upload**: The seller uploads multiple images for the product. The seller arranges the images in order — the first image becomes the main thumbnail. The system stores the images and associates them with the product.

**Step 7 — Inventory Restocking**: The seller adds inventory to each variant by recording a positive quantity change with a reason (e.g., "Initial stock"). The current stock quantity is calculated as the sum of all inventory records. Each inventory record contains the quantity change, reason, and timestamp.

**Step 8 — Product Goes Live**: The product is now visible in search results and category listings with its main image, name, base price (or price range if variants differ), seller shop name, and average rating.

### Customer Shopping and Purchase Journey

A customer searches for products, adds items to their wishlist and cart, and completes a purchase.

**Step 1 — Browsing and Searching**: The customer browses all categories to find products of interest, or searches for products by name. The customer applies filters — by category, price range (minimum and maximum), or in-stock only. The customer sorts results by newest first, price low-to-high, or price high-to-low. Search results are paginated.

**Step 2 — Product Discovery**: From search results or category listings, the customer sees each product's thumbnail image, name, base price (or price range if variant prices differ), seller shop name, and average rating.

**Step 3 — Product Detail Viewing**: The customer clicks a product to view its full details — all images, name, description, category, seller shop name (with link to seller profile), available variants with prices and stock status, average rating, total review count, and all reviews sorted newest first.

**Step 4 — Wishlist Addition**: The customer adds the product to their wishlist for future reference. The product appears in the customer's paginated wishlist. If the customer tries to add a duplicate product to the wishlist, the system handles it appropriately. If a product is deleted by the seller, it is automatically removed from all wishlists.

**Step 5 — Cart Addition**: The customer selects a specific variant and specifies a quantity, then adds it to their shopping cart. If the same variant is already in the cart, the quantities are combined. If the variant is out of stock, it cannot be added to the cart. If stock is less than the requested quantity, a warning is shown.

**Step 6 — Cart Review**: The customer views their cart, seeing each item's product name, variant options, price, quantity, and subtotal, along with the total price. The customer adjusts quantities or removes items as needed. If a variant is deleted or out of stock, it is marked as unavailable.

**Step 7 — Checkout**: The customer proceeds to checkout. Unavailable items cannot be checked out. The customer selects a shipping address or uses their default address. The order summary displays the list of items with prices, shipping address, and total price. Once the order is placed, the shipping address cannot be changed.

**Step 8 — Payment and Order Placement**: The customer confirms the order. The system processes payment through an external payment gateway. If payment fails, the order is not created and the customer can retry. If payment succeeds, the order is created. Stock quantities are decreased for each purchased variant via a negative inventory record. Items are removed from the customer's cart. An order record is created with an order number, total price, and timestamp. Each purchased variant becomes an order item with status "paid". A snapshot of each purchased product and variant (preserving name, description, variant options, and price at purchase time) is saved with the order item. A snapshot of each seller's profile (preserving shop name and logo at purchase time) is saved with the order item.

**Step 9 — Post-Purchase**: The customer views their order in the order history list, sorted newest first, seeing the order number, date, total price, and overall order status. The customer can view full order details including items with their statuses, shipping address, and future shipment tracking information.

### Order Fulfillment and Delivery Journey

After a customer places an order, the seller fulfills it through shipping and the customer receives the items.

**Step 1 — Seller Views Pending Orders**: The seller accesses their seller dashboard and views all order items for their products that need shipping. The seller can filter order items by status — starting with items in "paid" status. The dashboard also shows total counts of products, order items, pending cancellation requests, and pending refund requests.

**Step 2 — Shipment Creation**: The seller selects one or more order items from the same order or different orders to include in a single shipment. All selected items must belong to the seller — cross-seller shipment is not allowed. The seller enters the carrier name and tracking number — both are required. When the shipment is created, all included order items change status to "shipped". A shipment cannot contain items with non-paid status.

**Step 3 — Customer Tracking**: The customer views their order details and sees the shipment with tracking information. Each shipment displays which items are included, the carrier name, and tracking number. The shipment also shows the shipping date and, if applicable, the delivery date.

**Step 4 — Delivery Confirmation**: The customer receives their package. The customer confirms delivery for the entire shipment. When confirmed, all items in that shipment change status to "delivered".

**Step 4a — Automatic Delivery**: If the customer does not manually confirm delivery, items automatically change to "delivered" after 14 days from the shipping date.

**Step 5 — Post-Delivery**: Once items are delivered, the customer can write reviews for the purchased products and request refunds if needed within 7 days of delivery.

### Order Item Cancellation and Refund Journey

When issues arise with an order item, the customer can request cancellation or refund through a per-item process.

## Cancellation Scenario: Customer Cancels Before Shipping

**Step 1 — Cancellation Request**: The customer views their order and identifies an item with status "paid" (not yet shipped). The customer requests cancellation for that item, providing a reason in text — the reason is required. The system creates a cancellation request with status "pending". Items with non-paid status cannot be cancelled.

**Step 2 — Seller Response**: The seller views the pending cancellation request on their dashboard. The seller can approve or reject the request. When the seller responds, a snapshot of the request state (reason, status, timestamp) is created.

**Step 3a — Approval**: If the seller approves, the item status changes to "cancelled". A refund is processed for that item. Stock quantities for the variant are restored via a positive inventory record. The remaining items in the order continue processing normally. If all items in an order are cancelled, the overall order status becomes "cancelled".

**Step 3b — Rejection**: If the seller rejects the cancellation, the item remains in "paid" status and continues through normal fulfillment.

## Refund Scenario: Customer Requests Refund After Delivery

**Step 4 — Refund Request**: The customer views their order and identifies an item with status "delivered". The customer requests a refund for that item, providing a reason in text — the reason is required. The system checks that the request is within the 7-day refund window (counted from the delivery date). If outside the window, the request is rejected. Only items with "delivered" status are eligible for refund.

**Step 5 — Seller Response**: The seller views the pending refund request on their dashboard. The seller can approve or reject the request. When the seller responds, a snapshot of the request state is created.

**Step 6a — Approval**: If the seller approves, the item status changes to "refunded". The refund is processed. Stock quantities for the variant are restored via a positive inventory record.

**Step 6b — Rejection**: If the seller rejects the refund, the item remains in "delivered" status.

## Administrator Intervention

**Step 7 — Force Resolution**: For policy violations or dispute resolution, an administrator can view the order and force-cancel or force-refund individual items or entire orders. This processes the refund and restores stock accordingly.

### Customer Review and Rating Journey

After receiving products, the customer shares their experience through reviews and ratings.

**Step 1 — Eligibility**: After an order item's status changes to "delivered", the customer becomes eligible to write a review for that product. The system enforces one review per product per order — duplicate reviews are rejected. Reviews cannot be written before delivery.

**Step 2 — Review Writing**: The customer navigates to their order details and selects an item to review. The customer provides a rating from 1 to 5 stars (required) and optionally writes text content. If the rating is missing, the request is rejected. The system creates the review and associates it with the customer, the product, and the order item. A snapshot of the review is created.

**Step 3 — Public Display**: The review appears on the product detail page, sorted newest first. The product's average rating is recalculated based on all non-deleted reviews.

**Step 4 — Review Editing**: The customer can edit their review. Changes to the rating or text create a snapshot of the previous review state.

**Step 5 — Review Deletion**: The customer can delete their own review. When deleted, the review text and rating are removed from the product page. The snapshot of the review is preserved.

**Step 5a — Account Deletion Impact**: If the customer later deletes their account, their reviews remain on the product page but are attributed to "deleted user" instead of the customer's name.

### Account Deletion Journey

A customer or seller decides to permanently delete their account on the platform.

## Customer Account Deletion

**Step 1 — Deletion Initiation**: The customer navigates to their account settings and selects the option to delete their account. The system confirms the customer's intent.

**Step 2 — Account Deletion**: Upon confirmation, the system deletes the customer's profile information (display name, phone number) and all addresses. The customer's orders and order history are preserved for seller records and legal purposes. The customer's reviews are preserved but displayed as "deleted user" on product detail pages. The email address becomes available for new registration.

## Seller Account Deletion

**Step 1 — Eligibility Check**: The seller navigates to their account settings and initiates account deletion. The system checks eligibility conditions:
- The seller must have no pending order items with status "paid" or "shipped"
- The seller must have no pending cancellation or refund requests
If conditions are not met, the deletion request is rejected with an explanation.

**Step 2 — Account Deletion**: If eligible, the system deletes the seller's account and profile information. All of the seller's products are deleted from listings (including their variants and inventory records). Order history and product snapshots in past orders are preserved for historical accuracy. The shop name in past orders is preserved.

**Step 3 — Account Closure**: The email address becomes available for new registration.

### Administrator Governance Journey

An administrator oversees platform operations, manages users, resolves disputes, and maintains categories.

## Seller Approval Process

**Step 1 — Review Pending Sellers**: The administrator views the list of pending seller registrations. Each entry shows the seller's shop name, description, and logo.

**Step 2 — Approve or Reject**: The administrator approves a seller registration or rejects it with a required reason. Rejected sellers can view the reason and submit a new registration request.

**Step 3 — Seller Suspension**: If a seller violates policies, the administrator suspends the seller account. When suspended, the seller's products are hidden from search and category listings and cannot be purchased. The seller can still process existing orders (ship items, respond to cancellation/refund requests) but cannot create or edit products.

**Step 4 — Seller Unsuspension**: The administrator can unsuspend the seller, restoring product visibility and purchasing capability.

## Category Management

**Step 5 — Category Creation**: The administrator creates a top-level category with a name and description, or creates a subcategory under an existing category (one level of nesting only). Deeper nesting is rejected.

**Step 6 — Category Editing**: The administrator edits category names and descriptions as needed.

**Step 7 — Category Deletion**: The administrator deletes a category. Products in the deleted category become uncategorized.

## Product Oversight

**Step 8 — Product Review**: The administrator can view any product on the platform and its full snapshot history.

**Step 9 — Product Removal**: If a product violates policies, the administrator can delete it regardless of which seller created it.

## Order and Dispute Resolution

**Step 10 — Order Viewing**: The administrator can view all orders on the platform with full details.

**Step 11 — Force Cancellation**: For policy violations or dispute resolution, the administrator force-cancels individual items or entire orders. This refunds the customer and restores stock.

**Step 12 — Force Refund**: The administrator force-refunds individual items or entire orders, processing the refund and restoring stock.

## User Management

**Step 13 — Customer Banning**: The administrator views all customer accounts and can ban a customer. Banned customers cannot log in. The administrator can unban customers.

**Step 14 — Seller Banning**: The administrator views all seller accounts and can ban a seller. Banned sellers cannot log in but existing orders remain for fulfillment.

## Administrator Elevation

**Step 15 — Becoming an Administrator**: Any user (customer or seller) can submit a request to become an administrator with a reason (text).

**Step 16 — Super Administrator Review**: A super administrator views the list of pending administrator requests and approves or rejects them.

**Step 17 — Grade Management**: A super administrator promotes a regular administrator to super administrator, or demotes a super administrator to regular administrator. Super administrators cannot demote themselves.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Product Image Upload

THE system SHALL allow sellers to upload multiple images for each of their products.

WHEN a seller uploads an image for a product, THE system SHALL associate that image with the product.

THE system SHALL designate the first uploaded image as the main or thumbnail image for the product.

WHEN a seller reorders images for a product, THE system SHALL update the main or thumbnail image to reflect the new first position.

WHEN a seller deletes an image from a product, THE system SHALL remove that image from the product's image set.

IF a seller deletes all images from a product, THEN THE system SHALL display the product with no thumbnail image in search results and category listings.

### Seller Profile Logo Upload

THE system SHALL allow sellers to upload a logo image for their shop profile.

WHEN a seller edits their shop logo, THE system SHALL replace the existing logo with the new uploaded image.

WHEN a seller edits their shop logo, THE system SHALL create a snapshot preserving the previous logo image (defined in [02-domain-model.md]).

### Image Snapshot Preservation

WHEN a seller modifies product images (upload, reorder, or delete), THE system SHALL include the image state changes in a product snapshot (defined in [02-domain-model.md]).

THE system SHALL preserve image snapshots after product deletion so that order history and audit trails retain the product images at the time of modification.

THE system SHALL include the current set of images in each product snapshot, reflecting the image order at the time the snapshot was created.

### Order Item Image Preservation

WHEN an order is placed, THE system SHALL save a snapshot of each purchased product's images as part of the order item record (defined in [02-domain-model.md]).

THE system SHALL preserve the product images captured at the time of purchase, even if the seller subsequently modifies or deletes those images.

# External Integrations

Third-party API contracts, webhook handlers, and integration specifications.

## Integration Contracts

Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.

### Payment Gateway Integration

THE system SHALL integrate with an external payment gateway to process payments during checkout.

THE system SHALL send the order total and currency to the payment gateway for processing when a customer confirms and places an order.

THE system SHALL receive a payment confirmation from the payment gateway upon successful payment.

THE system SHALL receive a payment failure notification from the payment gateway when payment cannot be processed.

IF payment is confirmed by the gateway, THEN THE system SHALL create the order, decrease stock quantities for each purchased variant, and remove purchased items from the customer's cart.

IF payment fails, THEN THE system SHALL NOT create the order and SHALL allow the customer to retry payment with the same cart contents.

THE system SHALL treat the payment gateway's confirmation as the authoritative signal that funds have been captured.

### Payment Webhook Processing

THE system SHALL receive asynchronous payment status notifications from the payment gateway via webhooks.

WHEN a payment success webhook is received, THE system SHALL create the corresponding order, decrease stock quantities for purchased variants, and remove items from the customer's cart.

WHEN a payment failure webhook is received, THE system SHALL NOT create an order and SHALL notify the customer that payment was not successful.

THE system SHALL authenticate incoming webhook requests to verify they originate from the legitimate payment gateway.

THE system SHALL respond to webhook requests with an acknowledgment to prevent retries from the payment gateway.

IF a webhook cannot be processed (e.g., duplicate notification, invalid payload), THEN THE system SHALL log the event and respond with an error status.

### Authentication Provider Integration

THE system SHALL authenticate customers and sellers using email and password credentials only.

THE system SHALL NOT support authentication via external OAuth providers (e.g., Google, Facebook, Apple) for customer or seller registration or login.

Registration flow SHALL require the customer or seller to provide an email address and create a password directly within the platform.

Login flow SHALL validate the provided email and password against the platform's stored credentials.