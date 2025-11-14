## Service Overview

This document provides a high-level overview of the ShoppingMall platform—a multi-vendor e-commerce ecosystem designed to connect independent sellers directly with consumers. The platform enables sellers to list, manage, and sell products with full autonomy while empowering customers with comprehensive tools for discovery, purchasing, and post-purchase engagement. Unlike single-vendor marketplaces, ShoppingMall operates as a decentralized marketplace where each seller manages their own inventory, pricing, fulfillment, and customer interactions, with the platform providing infrastructure, trust mechanisms, and systemic coordination.

## Business Model

### Why This Service Exists

Modern consumers seek personalized, diverse, and authentic product experiences, while independent sellers struggle with the high costs, rigid policies, and limited exposure of dominant single-vendor platforms. ShoppingMall addresses this market gap by creating an open, transparent, and seller-empowered commerce ecosystem. Customers benefit from greater variety, niche product access, and direct vendor relationships. Sellers gain control over their brand, pricing, and customer data, with lower fees and higher retention of profits. The platform fills the void between rigid corporate marketplaces and unstructured peer-to-peer platforms by offering professional infrastructure—secure payments, standardized logistics, dispute resolution, and discoverability—without imposing restrictive vendor rules.

### Revenue Strategy

ShoppingMall generates revenue through three primary channels:

1. **Transaction Fee**: A flat 8% fee applied to every completed sale, collected at the time of payment processing. This fee applies to all products regardless of category or price point.
2. **Seller Subscription Tiers**: Optional premium memberships for sellers:
   - Basic: $0/month (free tier with 8% transaction fee)
   - Pro: $19.99/month—reduces transaction fee to 5% + access to advanced analytics and priority support
   - Enterprise: $99.99/month—reduces transaction fee to 3% + bulk listing tools, custom domain support, and dedicated account manager
3. **Featured Listings**: Sellers may pay $1.99 per day to feature a single product in targeted homepage banners, category carousels, or search result boosts. This is optional and non-disruptive to organic discovery.

No listing fees, subscription fees for customers, or hidden charges exist. All monetization is directly tied to value creation and transaction volume.

### Growth Plan

The platform will grow through a three-phase strategy:

1. **Seed Phase (Months 0–6)**: Onboard 500 vetted, high-quality sellers with unique product offerings (handmade, specialty, niche). Focus on building a loyal early-adopter customer base through targeted social campaigns and referral incentives.
2. **Scale Phase (Months 7–18)**: Expand seller onboarding to include larger SMEs and regional brands. Launch localized language and currency support. Introduce customer loyalty programs (e.g., points for reviews, referrals, repeat purchases). Begin affiliate marketing partnerships.
3. **Mature Phase (Months 19+)**: Expand internationally with localized fulfillment hubs. Introduce seller ratings and badges for trust. Integrate with third-party logistics providers to offer guaranteed delivery windows. Launch B2B bulk purchasing capabilities for resellers.

### Success Metrics

The platform’s success will be measured by the following key performance indicators (KPIs), each with target thresholds:

- **Monthly Active Users (MAU)**: 100,000 within 18 months
- **Monthly Transaction Volume (MTV)**: $5M in gross merchandise value (GMV) by Month 12
- **Seller Retention Rate**: 85% of sellers remain active after 6 months
- **Average Order Value (AOV)**: $75 across all purchases
- **Customer Satisfaction (CSAT)**: 4.5/5 average rating from post-purchase surveys
- **Order Fulfillment Time**: 95% of orders shipped within 48 hours of placement
- **Refund/Return Rate**: Below 7% of total transactions
- **Platform Revenue Per User (RPU)**: $1.50 per monthly active user after Month 12

## Core Functions Summary

The ShoppingMall platform delivers a comprehensive set of interdependent functions that serve both customers and sellers:

- **Customer-Centric Functions**: Registration/login with address management, product catalog browsing and search, SKU variant selection, cart and wishlist management, order placement, multi-method payment processing, order tracking with real-time shipping updates, product reviews and ratings, order history, and refund/cancellation requests.
- **Seller-Centric Functions**: Product listing and management, SKU inventory control per variant, order fulfillment notification and status updates, sales dashboard analytics, low-stock alerts, product visibility controls, and review response capabilities.
- **Platform Governance Functions (Admin)**: User account management (including seller/customer suspension), product moderation, order dispute resolution, payment gateway configuration, inventory oversight across all sellers, sales reporting, and audit logging.

All functions are designed to operate in concert: customers discover and purchase, sellers fulfill and communicate, and administrators ensure fairness, safety, and system integrity.

## User Actor Overview

The system is explicitly architected around three distinct user actor roles, each with specialized roles, permissions, and data models:

1. **Customer** (type: member): A buyer who registers to browse, purchase, review, and track products. Cannot manage listings, inventory, or other users.
2. **Seller** (type: member): A merchant who lists products, manages SKUs, fulfills orders, and responds to reviews. Separately authenticated from customers with different data schema and access controls. Cannot manage system-wide functions.
3. **Admin** (type: admin): System operator with full capabilities to manage users, products, orders, disbursements, and platform settings. Has oversight authority over all customers and sellers.

The separation between Customer and Seller is not merely a role toggle—it represents two fundamentally different data models, authentication contexts, and behavioral workflows. A user may be both a customer and a seller (e.g., a hobbyist selling handmade goods), but they must register and authenticate as two separate identities within the system.

## Document Roadmap

This document (00-toc.md) serves as the foundational overview for the entire ShoppingMall platform. All subsequent documents build directly from this scope:

- [01-business-model.md](./01-business-model.md): Deep dive into revenue strategy, market positioning, and growth metrics.
- [02-user-actors.md](./02-user-actors.md): Full specification of permissions, authentication flows, and JWT payload structure per actor.
- [03-authentication-flow.md](./03-authentication-flow.md): End-to-end user journey for registration, login, password reset, and session management.
- [04-product-catalog.md](./04-product-catalog.md): Product categorization, attribute system, and SKU variant structure.
- [05-shopping-cart-wishlist.md](./05-shopping-cart-wishlist.md): Functionality for managing items, quantity, preservation across sessions, and sharing.
- [06-checkout-process.md](./06-checkout-process.md): Payment method integration, validation rules, tax calculation, and failure recovery.
- [07-order-processing.md](./07-order-processing.md): Order capture, seller notification, shipping status flow, and tracking.
- [08-seller-inventory.md](./08-seller-inventory.md): Real-time inventory management, stock alerts, and atomic update rules.
- [09-product-reviews.md](./09-product-reviews.md): Review submission constraints, rating logic, moderation, and display rules.
- [10-order-history-refunds.md](./10-order-history-refunds.md): Cancellation windows, refund eligibility, processing paths, and return logistics.
- [11-admin-dashboard.md](./11-admin-dashboard.md): Full admin capabilities for user, product, order, and audit control.
- [12-conclusion-summary.md](./12-conclusion-summary.md): Final consolidated summary for business stakeholders.

Every document in this progression is designed to be implemented independently while adhering to the context defined here. No feature may be added, modified, or omitted without alignment to this document’s established scope.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*