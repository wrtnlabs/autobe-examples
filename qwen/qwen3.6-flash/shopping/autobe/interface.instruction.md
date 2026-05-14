# E-Commerce Shopping Mall Platform - API Interface Design

## Authentication & Account
- `POST /api/auth/customer/register` - Register new customer (email, password)
- `POST /api/auth/customer/login` - Customer login (email, password)
- `POST /api/auth/customer/logout` - Customer logout
- `PATCH /api/auth/customer/change-password` - Change password (oldPwd, newPwd)
- `POST /api/auth/seller/register` - Register seller (email, password, shopName, description)
- `POST /api/auth/seller/login` - Seller login
- `POST /api/auth/seller/logout` - Seller logout
- `PATCH /api/auth/seller/change-password` - Change password
- `POST /api/auth/seller/status` - View seller approval status (pending/approved/rejected)
- `DELETE /api/auth/customer/account` - Delete customer account
- `POST /api/auth/admin/request` - User requests admin access

## Profile Management
- `GET /api/profiles/me` - Get current user profile
- `PATCH /api/profiles/me` - Update profile (display name, phone for customer; shop name, description, logo for seller)
- `GET /api/sellers/:id/profile` - View public seller profile

## Addresses
- `GET /api/addresses` - List customer's shipping addresses
- `POST /api/addresses` - Add shipping address
- `PATCH /api/addresses/:id` - Update address
- `DELETE /api/addresses/:id` - Delete address
- `PATCH /api/addresses/:id/set-default` - Set as default

## Wishlist
- `GET /api/wishlist` - Paginated list of wished products
- `POST /api/wishlist` - Add product to wishlist
- `DELETE /api/wishlist/:productId` - Remove product from wishlist

## Shopping Cart
- `GET /api/cart` - View cart items (product name, variant options, price, qty, subtotal)
- `POST /api/cart` - Add variant to cart (productId, variantId, qty)
- `PATCH /api/cart/:cartItemId` - Update cart item quantity
- `DELETE /api/cart/:cartItemId` - Remove item from cart
- `DELETE /api/cart` - Clear entire cart

## Products & Categories
- `GET /api/categories` - List all categories (with subcategories)
- `GET /api/categories/:id` - Category details
- `POST /api/admin/categories` - Admin: Create category
- `PATCH /api/admin/categories/:id` - Admin: Update category
- `DELETE /api/admin/categories/:id` - Admin: Delete category
- `GET /api/products` - Search & list products (query: name, categoryId, minPrice, maxPrice, inStock; sort: newest, priceLow, priceHigh; pagination)
- `GET /api/products/:id` - Product detail (images, variants, reviews summary)
- `GET /api/admin/products` - Admin: List all products

## Product Management (Seller)
- `POST /api/sellers/products` - Create product
- `GET /api/sellers/products` - List seller's products
- `PATCH /api/sellers/products/:id` - Edit product (creates snapshot)
- `DELETE /api/sellers/products/:id` - Delete product
- `GET /api/admin/products/:id` - Admin: View product & snapshots
- `DELETE /api/admin/products/:id` - Admin: Delete product

## Product Variants (SKU)
- `POST /api/sellers/products/:id/variants` - Add variant
- `GET /api/sellers/products/:id/variants` - List variants
- `PATCH /api/sellers/products/:id/variants/:variantId` - Edit variant (creates snapshot)
- `DELETE /api/sellers/products/:id/variants/:variantId` - Delete variant

## Product Images
- `POST /api/sellers/products/:id/images` - Upload image
- `PATCH /api/sellers/products/:id/images/:imageId` - Reorder or delete image

## Inventory
- `POST /api/sellers/products/:id/variants/:variantId/inventory` - Add/Subtract inventory (qty, reason)
- `GET /api/sellers/products/:id/variants/:variantId/inventory` - Get inventory history

## Orders & Checkout
- `POST /api/orders` - Checkout from cart (select address, confirm items, payment process)
- `GET /api/orders` - Paginated order history list
- `GET /api/orders/:id` - Order details (items, address, shipments, tracking)
- `POST /api/admin/orders/:id/force-cancel` - Admin force cancel order items
- `POST /api/admin/orders/:id/force-refund` - Admin force refund order items

## Shipping & Tracking
- `GET /api/sellers/orders/items` - List seller's order items needing shipping
- `POST /api/sellers/shipments` - Create shipment (items, carrierName, trackingNumber) -> items become "shipped"
- `POST /api/orders/:id/shipments/:shipmentId/confirm-delivery` - Customer confirms delivery -> items become "delivered"

## Cancellation & Refund Requests
- `POST /api/orders/:id/items/:itemId/cancel` - Customer requests cancellation (reason)
- `POST /api/orders/:id/items/:itemId/refund` - Customer requests refund (reason)
- `GET /api/sellers/requests/cancel` - Seller views pending cancel requests
- `PATCH /api/sellers/requests/cancel/:requestId/approve` or `/reject` - Seller responds (creates snapshot)
- `GET /api/sellers/requests/refund` - Seller views pending refund requests
- `PATCH /api/sellers/requests/refund/:requestId/approve` or `/reject` - Seller responds

## Reviews & Ratings
- `GET /api/products/:id/reviews` - List reviews (sorted newest)
- `POST /api/products/:id/reviews` - Create review (rating, text) - only after item delivered
- `PATCH /api/reviews/:reviewId` - Update review (creates snapshot)
- `DELETE /api/reviews/:reviewId` - Delete review

## Seller Dashboard
- `GET /api/sellers/dashboard` - Shop summary (product count, order items, pending cancel/refund requests)

## Admin Panel
- `GET /api/admin/users` - List customers (pagination)
- `PATCH /api/admin/users/:id/ban` - Ban customer
- `PATCH /api/admin/users/:id/unban` - Unban customer
- `GET /api/admin/sellers` - List sellers & approval requests
- `PATCH /api/admin/sellers/:id/approve` - Approve seller
- `PATCH /api/admin/sellers/:id/reject` - Reject seller (reason required)
- `PATCH /api/admin/sellers/:id/suspend` - Suspend seller
- `PATCH /api/admin/sellers/:id/unsuspend` - Unsuspend seller
- `GET /api/admin/requests` - List admin access requests
- `PATCH /api/admin/requests/:requestId` - Approve or reject admin request
- `PATCH /api/admin/promote` - Super admin promote regular admin
- `PATCH /api/admin/demote` - Super admin demote admin