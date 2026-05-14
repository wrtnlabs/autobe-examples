# E-Commerce Shopping Mall Platform Database Design

## Customer Account
- Customers sign up with email and password
- Customers can change their password
- Customers can delete their account
- When a customer deletes their account:
    - Their profile information is deleted
    - Their orders and order history are preserved
    - Their reviews are preserved but shown as "deleted user"

## Customer Profile
- Each customer has a profile with: display name and phone number
- Customers can edit their display name and phone number

## Address Management
- Customers can add multiple shipping addresses
- Each address has: recipient name, phone number, street address, city, state/province, postal code, country
- Customers can edit their addresses
- Customers can delete their addresses
- Customers can set one address as the default shipping address

## Seller Account
- Sellers sign up with email and password
- Seller accounts require administrator approval before they can sell (pending, approved, rejected)
- Rejected sellers can view the rejection reason and submit a new registration
- Sellers can delete their account only if no pending orders/requests; when deleted, product listings are deleted but order history/snapshots preserved

## Seller Profile
- Each seller has a profile with: shop name, shop description, and logo image
- Every edit creates a snapshot
- Customers can view seller profiles

## Categories
- Products are organized into categories
- Categories can have subcategories (one level of nesting only)
- Each category has: name and description
- Created and managed by administrators only

## Snapshot Principle
- Snapshots are immutable records of data changes for dispute resolution
- Snapshots record: when, what, before, and after values
- Snapshots apply to:
    - Products (all fields including images)
    - Product variants (SKU, options, price)
    - Seller profiles
    - Order items (product, variant, seller profile at time of purchase)
    - Reviews
    - Cancellation requests
    - Refund requests

## Products
- Sellers create products with: Name, Description, Category, Base Price
- Every edit creates a snapshot
- Sellers can delete products only if no pending orders/requests for any variant
- Deleting a product also deletes variants and inventory records; products are removed from listings
- Deleted products' snapshots are preserved

## Product Images
- Sellers upload multiple images; first image is main/thumbnail
- Sellers can delete images
- Image changes included in product snapshots

## Product Variants (SKU)
- A product has multiple variants representing option combinations
- Each variant: SKU code, Option values, Price, Stock quantity
- Sellers can add/edit variants; every edit creates a snapshot
- Products without variants are visible but "unavailable"

## Inventory Management
- Inventory history records (quantity change, reason, timestamp)
- Current stock = sum of all inventory records
- Order placement automatically creates negative inventory records
- Order cancellation/refund automatically creates positive inventory records

## Product Search
- Search by name (paginated)
- Filter by: Category, Price range, In-stock only
- Sort by: Newest, Price (Low/High)

## Wishlist
- Customers add products to wishlist
- Paginated list
- If product is deleted, automatically removed

## Shopping Cart
- Customers add variants to cart with quantity
- Combine quantities for same variant
- Show warning if stock is low/out of stock

## Checkout & Orders
- Order contains one or more order items from different sellers
- Each order item represents a purchased variant
- Each item has its own status: Paid, Shipped, Delivered, Cancelled, Refunded
- Order status derived from items: paid, shipped, delivered, cancelled, refunded, partially completed
- Checkout reserves stock temporarily? Or strictly decreases on successful payment
- Order items are grouped into shipments

## Shipping and Tracking
- Sellers create shipments for their items
- Shipments contain Carrier name, Tracking number
- All items in a shipment become "shipped"
- Customers confirm delivery per shipment
- Delivery confirmation -> item becomes "delivered"
- Auto-deliver after 14 days if not confirmed

## Cancellation & Refund
- Per order item:
    - Cancellation: Requested by customer (status "paid"), approved/rejected by seller
    - Refund: Requested by customer (status "delivered", within 7 days), approved/rejected by seller
- Approvals create snapshots
- Successful cancellation/refund restores stock

## Reviews and Ratings
- 1 review per product per order
- Written after item is "delivered"
- Rating (1-5), Text
- Sort by newest
- Edits create snapshots

## Administrator System
- User requests admin: reason text (pending/super approval)
- Admin grades: regular, super
- Super can promote/demote (not self)
- Seller management: approve/reject, suspend/unsuspend
- Category management
- Product oversight: view/delete
- Order oversight: view, force-cancel/refund
- User management: ban/unban customers and sellers