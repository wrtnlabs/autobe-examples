# Business Rules and Constraints for Shopping Mall Platform

## Introduction

This document defines the core business validation rules, constraints, and operational logic that govern the behavior of the shopping mall platform. These rules ensure consistent, fair, and compliant operations across all platform functions, protecting both users and the business while maintaining a smooth shopping experience. The rules outlined here serve as the foundation for all platform features, from product management to order fulfillment, and must be enforced consistently to preserve trust and operational integrity.

The business rules are designed to balance user convenience with platform protection, legal compliance, and business sustainability. They apply to all user actors (guests, customers, sellers, and administrators) and cover every aspect of platform operations.

## Product Validation Rules

### Basic Product Information Validation

WHEN a seller creates or updates a product listing, THE platform SHALL require the product name to be between 5 and 100 characters in length.  
WHEN a seller creates or updates a product listing, THE platform SHALL require the product description to be between 50 and 5,000 characters in length.  
WHEN a seller creates or updates a product listing, THE platform SHALL require at least one high-resolution product image (minimum 1000x1000 pixels).  

### Product Categorization Requirements

WHEN a seller creates or updates a product listing, THE platform SHALL require the product to be assigned to exactly one primary category and optionally one or more secondary categories.  
IF a product is assigned to an invalid category, THEN the platform SHALL reject the product submission and display an error message indicating the valid category options.  
WHEN a product category is updated, THE platform SHALL automatically notify affected customers who have bookmarked or searched in that category within the last 30 days.  

### Product Variant Management

WHEN a seller adds product variants (colors, sizes, options), THE platform SHALL enforce that each variant combination has unique SKU identification.  
WHEN a seller maintains inventory for variants, THE platform SHALL prevent stock quantities from going below zero visible to customers.  
WHEN a product has multiple variants, THE platform SHALL require that pricing differs by no more than 50% between the cheapest and most expensive variant of the same product.  

### Pricing and Discount Rules

WHEN a seller sets product pricing, THE platform SHALL require prices to be between $0.01 and $50,000.00.  
WHEN a seller applies discounts, THE platform SHALL limit discount percentages to no more than 80% off the original price.  
WHEN promotional pricing is active, THE platform SHALL ensure that promotional prices expire automatically after the specified date and time.  
IF a seller attempts to set a price change that would result in a loss of more than 30% per product, THEN the platform SHALL require additional verification from the seller.  

### Inventory Management Constraints

WHEN inventory stock level falls below the minimum threshold defined by the seller for any SKU, THE system SHALL automatically notify the seller to reorder stock.  
WHEN a product's inventory reaches zero, THE system SHALL automatically set the product availability to 'out of stock', prevent new order placements for that SKU, and notify all customers with active shopping carts containing that item.  
WHEN inventory is updated, THE system SHALL maintain a 24-hour rolling history of stock level changes for audit purposes.  

## Order Processing Constraints

### Order Creation Rules

WHEN a customer places an order, THE platform SHALL require the order total to be at least $1.00 and not exceed $100,000.00.  
WHEN a customer places an order, THE platform SHALL require at least one valid shipping address to be associated with the account.  
WHEN a customer places an order with multiple items, THE platform SHALL ensure that all items are from stock (not including backordered items) at the time of submission.  

### Payment Processing Constraints

IF a payment attempt fails, THEN the platform SHALL allow up to three retry attempts within 24 hours before cancelling the order.  
WHEN processing payments, THE platform SHALL retain payment information only long enough to complete the transaction, not storing card details permanently.  
WHEN a payment is refunded, THE platform SHALL process the refund within 3-5 business days and notify both customer and seller.  

### Order Modification Limits

AFTER an order is placed and confirmed, THE platform SHALL allow modifications only within 30 minutes for adding or removing items.  
WHEN an order status changes to 'shipped', THE platform SHALL no longer allow order content modifications by the customer.  
WHEN a customer requests order cancellation, THE platform SHALL require approval from the seller for orders older than 24 hours.  

### Order Fulfillment Rules

WHEN an order is confirmed, THE platform SHALL reserve inventory for 48 hours to prevent overselling.  
IF inventory becomes unavailable after order placement, THEN the platform SHALL contact the customer within 2 hours to arrange alternatives or cancellation.  
WHEN processing bulk orders (10+ items), THE platform SHALL split the order into multiple shipments to ensure delivery efficiency.  

### Shipping and Delivery Constraints

WHEN calculating shipping costs, THE platform SHALL use real-time rates from integrated carriers, not allowing costs below $5.00 for domestic orders.  
WHEN a package is delivered, THE platform SHALL require delivery confirmation from the customer within 7 days to complete the transaction.  
IF an order is not delivered within the estimated timeframe plus 5 business days, THEN the platform SHALL automatically initiate a refund process.  

## User Data Validation Requirements

### Account Registration Validation

WHEN a new user registers, THE platform SHALL require an email address that matches standard email format patterns.  
WHEN a new user registers, THE platform SHALL require a password with minimum 8 characters including at least one uppercase, one lowercase, one number, and one special character.  
WHEN a guest account is created, THE platform SHALL limit purchases to $500.00 without full account verification.  

### Address Management Rules

WHEN a customer adds a shipping address, THE platform SHALL require complete address information including street, city, state, postal code, and country.  
WHEN validating addresses, THE platform SHALL confirm postal code format matches the country's postal system specifications.  
WHEN a customer sets a default address, THE platform SHALL ensure that address belongs to their account and is marked as verified.  

### Profile Information Constraints

WHEN a user updates their profile, THE platform SHALL limit display names to 50 characters and prohibit special characters except spaces and hyphens.  
WHEN a seller updates their business profile, THE system SHALL require a valid business name, tax identification (where applicable), and contact phone number.  
WHEN user phone numbers are collected, THE system SHALL store them in international format starting with +country-code.  

### Authentication and Security

WHEN a user logs in with incorrect credentials, THE platform SHALL display a generic error message without revealing whether the username or password was incorrect.  
WHEN a user account is locked due to multiple failed login attempts, THE platform SHALL implement a 15-minute cooldown period.  
WHEN password reset is requested, THE platform SHALL require the request to come from the registered email and provide a secure, time-limited reset link.  

## Business Logic Constraints

### Seller-Customer Interaction Rules

WHEN sellers respond to customer inquiries, THE platform SHALL require responses within 24 hours of initial contact.  
WHEN customers leave product reviews, sellers SHALL not be allowed to respond or modify reviews directly, only through official support channels.  
WHEN a seller's products receive multiple negative reviews (3 or more with ratings below 3 stars), THE system SHALL trigger an automated quality review process.  

### Platform Integrity Rules

WHEN duplicate products are detected, THE platform SHALL prioritize the product with higher customer ratings and longer history.  
WHEN search results are displayed, THE platform SHALL use relevance-based ranking with no paid placement outside premium seller agreements.  
WHEN promotional codes are used, THE platform SHALL validate codes against inventory and ensure each code can be used only once per customer, except where specified otherwise.  

### Compliance and Ethics Constraints

IF a product violates content policies, THEN the platform SHALL remove it immediately and provide the seller 48 hours to appeal the decision.  
WHEN processing international orders, THE platform SHALL comply with export regulations and restrict sales of certain products to approved countries.  
WHEN collecting user data for marketing, THE platform SHALL require explicit opt-in consent and provide unsubscribe options in every communication.  

### Operational Efficiency Rules

WHEN processing high-volume sales events, THE platform SHALL maintain consistent performance and prevent order submission over 10 orders per second during peak periods.  
WHEN handling customer service escalations, THE platform SHALL categorize issues automatically and route to appropriate support levels within 1 hour.  
WHEN updating system features, THE platform SHALL notify users at least 7 days in advance of major changes that affect their purchases or seller operations.  

## Operational Boundaries

### Scale and Capacity Limits

WHEN platform usage approaches infrastructure limits, THE platform SHALL implement queuing for non-critical operations like email notifications.  
WHEN processing seasonal traffic spikes (holiday periods), THE platform SHALL scale resources automatically while maintaining response times under 3 seconds for core operations.  
WHEN launching new features, THE platform SHALL limit rollout to 10% of users initially for 48 hours to test stability.  

### Compliance and Legal Boundaries

WHEN operating in regulated markets, THE platform SHALL maintain audit trails for all financial transactions for 7 years minimum.  
WHEN handling user data, THE platform SHALL comply with GDPR, CCPA, and local privacy regulations, allowing data portability and right to erasure.  
WHEN processing seller payouts, THE platform SHALL withhold payments for 14 days to allow for dispute resolution.  

### Business Continuity Constraints

WHEN experiencing technical outages, THE platform SHALL display clear status messages and estimated resumption times to all users.  
WHEN backing up critical data, THE platform SHALL maintain encrypted backups with secure access controls.  
WHEN vendors experience issues, THE platform SHALL have alternative suppliers contracted for essential services (payments, shipping).  

### Quality Assurance Boundaries

WHEN product reviews are published, THE platform SHALL scan for inappropriate content and flag suspicious patterns for human review.  
WHEN sellers maintain below-average customer satisfaction (ratings below 4.0), THE platform SHALL require performance improvement plans within 30 days.  
WHEN processing bulk data exports, THE platform SHALL limit export size to 10,000 records per request to maintain platform performance.  

### Risk Management Limits

WHEN risk assessment identifies potential fraud, THE platform SHALL implement additional verification steps without disrupting legitimate users.  
WHEN handling cross-border transactions, THE platform SHALL apply appropriate currency conversion with transparent fees not exceeding 3% of transaction value.  
WHEN sellers request account deletion, THE platform SHALL retain transaction history for 5 years for legal and tax compliance.  

These business rules and constraints form the foundation for trustworthy, efficient, and compliant operations on the shopping mall platform. They ensure fair treatment of all participants while maintaining the platform's reputation and legal standing.

For detailed user actor permissions and capabilities, refer to the [User Actors and Permissions Documentation](./04-user-actors-permissions.md).  
For comprehensive exception handling and edge cases, refer to the [Secondary and Exception Scenarios Documentation](./09-secondary-exception-scenarios.md).  

*Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*