# AutoBE Shopping Mall Platform - Table of Contents

This document provides the complete structure of the AutoBE Shopping Mall Platform documentation set, organized to guide backend developers through the full implementation workflow. All documents are interconnected, with each serving as a critical component in the development lifecycle of this enterprise-grade e-commerce platform.

## Customer Actors

- [02-customer-account.md](./02-customer-account.md): Documents all customer-related authentication, profile, and account management requirements from a business perspective.

## Seller Actors

- [03-seller-account.md](./03-seller-account.md): Defines the seller onboarding, approval process, account lifecycle, and deletion constraints.

## Administrator Roles

- [04-administrator-roles.md](./04-administrator-roles.md): Documents the hierarchy, permissions, and responsibilities for admin and super admin roles.

## Product Lifecycle

- [05-product-lifecycle.md](./05-product-lifecycle.md): Defines the complete lifecycle of products from creation to deletion, including editing and snapshotting rules.
- [06-product-variants.md](./06-product-variants.md): Documents the specification of product variants (SKUs), their management lifecycle, and inventory relationships.
- [07-inventory-management.md](./07-inventory-management.md): Describes the inventory system, including restocking, adjustments, order impact, and history tracking.

## Order Workflow

- [08-shopping-cart.md](./08-shopping-cart.md): Defines the behavior of the shopping cart, including item aggregation, quantity management, and validation rules.
- [09-checkout-and-payment.md](./09-checkout-and-payment.md): Documents the workflow from cart to order placement, including address selection, review, and payment handling.
- [10-order-structure.md](./10-order-structure.md): Specifies the structure of orders, order items, statuses, and the relationship between sellers and items.
- [11-shipping-and-tracking.md](./11-shipping-and-tracking.md): Describes the shipment process, tracking, delivery confirmation, and automation rules.
- [12-cancellation-and-refunds.md](./12-cancellation-and-refunds.md): Documents the end-to-end process for cancellation and refund requests, including approval workflows and inventory impact.

## Payment and Checkout

- [09-checkout-and-payment.md](./09-checkout-and-payment.md): Documents the workflow from cart to order placement, including address selection, review, and payment handling.

## Shipping and Tracking

- [11-shipping-and-tracking.md](./11-shipping-and-tracking.md): Describes the shipment process, tracking, delivery confirmation, and automation rules.

## Cancellation and Refunds

- [12-cancellation-and-refunds.md](./12-cancellation-and-refunds.md): Documents the end-to-end process for cancellation and refund requests, including approval workflows and inventory impact.

## Reviews and Ratings

- [13-reviews-and-ratings.md](./13-reviews-and-ratings.md): Defines the review system including eligibility, editing, deletion, and rating calculation rules.

## System Snapshots

- [14-snapshot-principle.md](./14-snapshot-principle.md): Documents the comprehensive snapshot system covering all modified entities, what data is captured, and access rules.

## Admin Oversight

- [04-administrator-roles.md](./04-administrator-roles.md): Documents the hierarchy, permissions, and responsibilities for admin and super admin roles.
- [05-product-lifecycle.md](./05-product-lifecycle.md): Defines the complete lifecycle of products from creation to deletion, including editing and snapshotting rules.
- [10-order-structure.md](./10-order-structure.md): Specifies the structure of orders, order items, statuses, and the relationship between sellers and items.
- [12-cancellation-and-refunds.md](./12-cancellation-and-refunds.md): Documents the end-to-end process for cancellation and refund requests, including approval workflows and inventory impact.
- [13-reviews-and-ratings.md](./13-reviews-and-ratings.md): Defines the review system including eligibility, editing, deletion, and rating calculation rules.

## Service Overview

- [01-service-overview.md](./01-service-overview.md): Defines the platform's purpose, market position, and core value proposition for the e-commerce shopping mall.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*