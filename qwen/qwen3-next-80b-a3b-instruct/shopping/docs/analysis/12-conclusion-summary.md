# Executive Summary

The shoppingMall platform is a multi-vendor e-commerce ecosystem that connects customers seeking diverse products with independent sellers, offering a seamless, secure, and scalable marketplace experience. Unlike single-vendor platforms, shoppingMall enables community-driven commerce where sellers operate as independent merchants, while customers enjoy consolidated discovery, purchasing, and support through a unified interface. The system automates critical processes including inventory synchronization, order routing, payment splitting, and dispute resolution, creating a self-sustaining digital marketplace that generates value for all participants.

# Core System Capabilities

The shoppingMall platform delivers twelve essential capabilities, all designed to support the interdependent roles of customers, sellers, and administrators:

1. **Multi-Actor Authentication**: Secure, role-based access for customers, sellers, and administrators using JWT tokens with distinct payloads and session rules.
2. **Product Catalog with SKU Variant Management**: Products are organized hierarchically, with each variation (e.g., color, size, material) treated as a distinct SKU with independent inventory, pricing, and descriptions.
3. **Shopping Cart and Wishlist**: Customers can build, modify, and save carts and wishlists across sessions. Guest carts persist for 30 days, and wishlist items trigger automated price-drop and restock notifications.
4. **Checkout and Payment Processing**: Customers select shipping addresses, verify cart contents, and complete purchases using credit/debit cards, digital wallets, or bank transfers. Tax and shipping are calculated in real-time before submission.
5. **Order Fulfillment Workflow**: Orders auto-notify the responsible seller, who must mark them as shipped with a tracking number within 48 hours. Shipping status updates (pending, processing, shipped, out_for_delivery, delivered, cancelled) are triggered automatically and communicated via email or SMS.
6. **Seller Product and Inventory Management**: Sellers can create, edit, freeze, or remove products and manage SKU-level inventory. Inventory is updated atomically upon order confirmation and triggers low-stock alerts at 3 units or fewer.
7. **Product Reviews and Ratings**: Only customers who completed an order may submit reviews. Ratings are 1–5 stars, with a verified purchase badge. Sellers may respond publicly, and reviews are moderated for spam or profanity.
8. **Order History and Refund Processing**: Customers may request cancellation (if status is pending or processing) or refund (if damaged, incorrect, or undelivered). Refunds return via original payment method or store credit. Return shipping labels are auto-generated when applicable.
9. **Admin Control Dashboard**: Admins can suspend users, override product details, force order cancellations/refunds, audit all system actions, view platform-wide sales analytics, and resolve disputes independently of sellers.
10. **Shipping and Tracking Integration**: Real-time tracking updates from carriers are displayed to customers visually, with auto-flagging for delays exceeding 48 hours past estimated delivery.
11. **Data Persistence Across Devices**: User sessions, carts, and wishlists are maintained across devices via browser storage, with encrypted tokens to ensure security.
12. **Audit Logging**: All administrative actions, system events, and payment processing steps are logged for compliance and investigation purposes.

# Actor Roles Recap

The platform is built upon three distinct actor types, each with non-overlapping responsibilities:

- **Customer**: A registered end-user who browses, purchases, rates, and tracks products. Cannot manage inventory, listings, or other users. Can initiate refunds, manage addresses, and save wishlists.
- **Seller**: An authenticated merchant who lists, prices, and manages inventory of their own products. Can view orders for their products, update stock, and respond to reviews. Cannot manage other sellers or alter platform settings.
- **Admin**: A system operator with full control over users, products, orders, and finances. Can override any business decision, resolve conflicts, suspend accounts, and generate compliance reports.

The separation of these actors is not a technical limitation—it is a business necessity. Customers need simplicity. Sellers need autonomy. Admins need oversight. All three roles are indispensable for the platform’s operational integrity.

# Primary User Journeys

## Customer Journey: From Browsing to Delivery

WHEN a customer visits the platform, THE system SHALL display products organized by category and popularity. WHERE a customer adds a product to cart, THE system SHALL store its price and SKU at that moment. WHILE the customer is session-active, THE system SHALL allow cart modifications with numeric quantity control up to 30 items. WHEN the customer proceeds to checkout, THE system SHALL require selection of one registered shipping address and a payment method. IF payment fails, THE system SHALL retain cart state and allow retry. THEN THE system SHALL generate an order number and send confirmation via email. WHEN the seller ships the product, THE system SHALL update shipping status and notify the customer. WHILE the order is in transit, THE system SHALL provide periodic tracking updates. IF delivery is delayed beyond 48 hours past estimated date, THE system SHALL auto-flag for admin review.

## Seller Journey: Listing to Inventory Adjustment

WHEN a seller logs in, THE system SHALL display their active product list and pending order notifications. WHEN a seller adds a new product, THE system SHALL require at least three SKU attributes (e.g., color, size, material) and permit unique pricing per variant. WHERE inventory for an SKU falls to 3 or fewer units, THE system SHALL send automated low-stock alert. WHEN an order is received, THE system SHALL automatically deduct inventory. IF a product is out of stock, THE system SHALL hide it from public browsing. THEN the seller SHALL mark the order as "shipped" and enter a tracking number within 48 hours to avoid penalties.

## Admin Journey: Oversight and Intervention

WHEN an admin logs in, THE system SHALL display a comprehensive dashboard of sales metrics, user activity, and order anomalies. WHEN a dispute arises, THE system SHALL allow admin to override seller decisions and issue refunds without seller consent. WHILE any user’s account is under review, THE system SHALL suspend interaction capability. IF a seller’s product violates policies, THE system SHALL allow admin to remove it and notify the user. WHERE a customer reports a product as damaged, THE system SHALL permit admin to process a full refund and generate a return label independently.

# Business Value Summary

This platform creates a three-sided value network:

- **Customers** gain access to a rich, diverse catalog without visiting multiple websites, enjoy streamlined returns and refunds, and benefit from community reviews.
- **Sellers** gain access to a built-in audience, are freed from web development and marketing infrastructure, and manage inventory with real-time synchronization.
- **The Business** earns revenue through transaction fees, premium seller subscriptions, and promotional listings—all without holding inventory or managing logistics.

Success is defined by:
- 90% of customers completing checkout without payment abandonment
- 95% of sellers fulfilling orders within 48 hours
- 98% of refund requests resolved within 5 business days
- 1,000 active sellers and 50,000 monthly customers by end of Q1

# Final Requirements Checklist

The system must deliver the following non-negotiable features for initial launch:

- ✅ Three actor types: customer, seller, admin
- ✅ SKU-level inventory management with auto-decrement on order
- ✅ Cart persistence for guests (30-day expiry)
- ✅ Price locking at time of cart addition
- ✅ 3 required payment methods: credit/debit, digital wallet, bank transfer
- ✅ Seller fulfillment within 48 hours with tracking number
- ✅ Verified purchase badge on reviews
- ✅ Admin ability to force refunds or cancellations
- ✅ Low-stock alert at 3 units per SKU
- ✅ Inventory not allowed to go negative
- ✅ JWT authentication with 30-minute access token and 14-day refresh token
- ✅ All status changes (order, shipping) trigger user notifications

No feature beyond this list is required for version 1. The platform’s strength lies in its focused execution of these core capabilities—not feature bloat.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*