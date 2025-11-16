# Secondary Exception Scenarios for E-commerce Shopping Mall Platform

## Introduction

This document outlines the secondary exception scenarios and error handling processes for the shopping mall platform. Building upon the primary user journeys documented in the [Customer Primary Scenarios](./06-customer-primary-scenarios.md), [Seller Management Scenarios](./07-seller-management-scenarios.md), and [Admin Management Scenarios](./08-admin-management-scenarios.md), this document focuses on alternative flows, edge cases, and exception recovery processes.

The platform must provide robust error handling that maintains user trust and operational efficiency. Exception scenarios are documented from the user's perspective, including clear recovery paths and business logic constraints.

## Authentication Error Scenarios

### Failed Login Attempts

WHEN a customer attempts to log in with incorrect credentials, THE system SHALL:
- Display an error message indicating the credentials are invalid
- Increment a login attempt counter for the account
- Allow the user to request a password reset after multiple failures

IF a user exceeds 5 failed login attempts within 15 minutes, THEN THE system SHALL temporarily lock the account for 30 minutes to prevent brute force attacks.

WHEN a seller account is locked due to repeated failures, THE system SHALL send a notification email with unlock instructions and provide a manual unlock option through customer support.

### Registration Validation Errors

WHEN a guest attempts to register with an email address already in use, THE system SHALL:
- Display a message explaining the email is taken
- Offer a "forgot password" link if the user might have an existing account
- Suggest alternative email addresses or account recovery options

IF registration data is incomplete or invalid, THEN THE system SHALL highlight specific fields with validation errors and provide clear instructions for correction.

WHEN a seller registration is rejected due to incomplete business information, THE system SHALL:
- Clearly indicate missing or invalid business documentation
- Provide a checklist of required materials for seller verification
- Allow the user to save progress and return to complete registration later

### Password Reset Complications

WHEN a user requests a password reset for an email not in the system, THE system SHALL display the same success message as valid requests to prevent email enumeration attacks, but not send any reset email.

IF a user attempts to use an expired password reset link, THEN THE system SHALL display an expiration message and offer to send a new reset link.

WHILE accessing the platform from a new device, WHEN two-factor authentication fails, THE system SHALL provide alternative verification methods and clear instructions for device registration.

## Payment Failure Handling

### Card Payment Rejections

WHEN a credit card payment is declined during checkout, THE system SHALL:
- Display the specific reason for decline (insufficient funds, expired card, etc.)
- Allow the user to retry with the same card or enter different payment information
- Maintain the shopping cart contents during payment attempts

IF the payment gateway is temporarily unavailable due to network issues, THEN THE system SHALL:
- Notify the user of the temporary outage
- Queue the transaction for automatic retry
- Provide alternative payment methods if supported

WHEN a customer cancels a transaction during payment processing, THE system SHALL ensure no charges are processed and release any held inventory.

### Refund Request Processing

WHEN a customer submits a refund request for a cancelled order, THE system SHALL:
- Verify the order meets refund policy criteria
- Calculate refund amount and processing fees
- Initiate refund process with the original payment method
- Update order status to "refund pending"

IF a refund is disputed by the payment processor, THEN THE system SHALL:
- Notify the customer and seller of the dispute status
- Provide evidence documentation pathway
- Escalate to admin intervention if needed

### Payment Method Updates

WHEN a customer's saved payment method expires during order processing, THE system SHALL:
- Prompt the user to update payment information
- Allow continuation of the order with new payment details
- Store the updated method for future use if requested

IF bulk payment updates fail for multiple customers, THEN THE system SHALL process updates in batches with rollback capability for failed transactions.

## Inventory Shortage Cases

### Out of Stock During Purchase

WHEN a customer attempts to add an out-of-stock item to their cart, THE system SHALL:
- Display the item as unavailable with estimated restock date
- Offer alternative similar products from the catalog
- Allow the user to subscribe to restock notifications

IF inventory levels drop below available stock during checkout, THEN THE system SHALL:
- Alert the affected customer about the shortage
- Provide options to adjust quantity, remove items, or wait for restocking
- Maintain on-hold status for partially available orders

### Seller Inventory Mismanagement

WHEN a seller reports incorrect inventory levels, THE system SHALL:
- Allow the seller to update stock quantities manually
- Provide bulk inventory adjustment tools for multiple SKUs
- Generate alerts when reported and actual stock levels differ

IF automatic inventory sync fails with external warehouse systems, THEN THE system SHALL:
- Fall back to manual stock level entry mode
- Notify sellers of sync failures requiring attention
- Maintain inventory accuracy until sync is restored

### Backorder Management

WHEN an order contains backordered items, THE system SHALL:
- Split the order into immediate and backordered components
- Allow partial fulfillment and shipping
- Provide tracking for both order portions

IF backorder items exceed delivery promise dates, THEN THE system SHALL offer customer choices between:
- Refund and order cancellation
- Credit for future purchases
- Extended waiting period with compensation

## Shipping Delay Management

### Carrier Service Disruptions

WHEN shipping carriers experience service delays, THE system SHALL:
- Update estimated delivery times automatically
- Notify affected customers of changes
- Offer alternative shipping methods at adjusted rates

IF international shipping is impacted by customs delays, THEN THE system SHALL:
- Provide status updates from customs agencies
- Offer import duty payment assistance
- Extend buyer protection periods proportionally

### Shipping Address Errors

WHEN a shipping address is undeliverable or rejected by the carrier, THE system SHALL:
- Attempt redelivery with corrected information if possible
- Contact the customer for address verification
- Process pickup options at carrier locations

IF customers report receiving wrong items, THEN THE system SHALL:
- Facilitate return shipping arrangements
- Process refunds or exchanges promptly
- Investigate inventory picking errors with sellers

### Weather-Related Delays

WHEN severe weather affects shipping regions, THE system SHALL:
- Flag affected orders with weather-related delay notifications
- Automatically extend delivery timeframes
- Provide carrier updates and alternative arrangements

IF warehouse fulfillment is impacted by local weather conditions, THEN THE system SHALL prioritize:
- Rush orders and medical supplies if applicable
- Reschedule inventory picking during weather clearings
- Communicate honest delays to maintain trust

## Review Dispute Resolution

### Inappropriate Content Moderation

WHEN a product review contains inappropriate content, THE system SHALL:
- Flag the review for moderator review
- Temporarily hide the review from public display
- Notify the reviewer of content guidelines violation

IF disputed reviews involve factual inaccuracies, THEN THE system SHALL:
- Allow sellers to submit evidence of product specifications
- Provide a dispute resolution form for reviewers and sellers
- Remove or modify reviews based on verified information

### Review Sock Puppet Detection

WHEN multiple suspicious reviews originate from similar sources, THE system SHALL:
- Analyze review patterns for fraudulent activity
- Temporarily hold affected reviews for verification
- Alert administrators of potential review manipulation

IF verified fraudulent reviews are removed, THEN THE system SHALL recalculate product ratings and notify affected sellers of the changes.

### Translation and Cultural Issues

WHEN reviews translated by automated systems contain errors, THE system SHALL:
- Flag translated content for manual review
- Provide original language versions alongside translations
- Allow users to report translation issues for correction

IF cultural differences lead to misunderstanding in reviews, THEN THE system SHALL:
- Offer context-sensitive moderation guidelines
- Educate users about appropriate review content across cultures
- Maintain consistent quality standards globally

## Bulk Operation Edge Cases

### Large Order Processing

WHEN processing orders with hundreds of items, THE system SHALL:
- Process items in batch groups to prevent system overload
- Provide progress indicators for lengthy operations
- Allow users to cancel bulk operations partially

IF bulk order updates fail midway through processing, THEN THE system SHALL:
- Rollback completed changes automatically
- Preserve unaffected portions of the operation
- Notify users of partial completion status

### Inventory Sync Overloads

WHEN multiple sellers attempt simultaneous inventory updates, THE system SHALL:
- Queue requests and process them sequentially
- Prevent conflicting stock adjustments
- Provide estimated wait times for queued operations

IF network disruptions affect bulk inventory synchronization, THEN THE system SHALL:
- Cache local changes for later upload
- Merge conflicting updates with user review required
- Maintain data consistency across different locations

### Seasonal Traffic Spikes

WHEN platform experiences high traffic during sales events, THE system SHALL:
- Implement queuing for non-critical operations like email notifications
- Prioritize critical transactions over background tasks
- Scale response times proportionally to user base

IF system capacity is exceeded during peak times, THEN THE system SHALL:
- Gracefully degrade non-essential features
- Maintain core purchase and payment functionality
- Provide clear user communication about service status

## Common Recovery Patterns

### User Session Recovery

WHEN users lose sessions due to browser crashes or network issues, THE system SHALL allow automatic session restoration based on saved credentials or device recognition.

IF session cannot be automatically restored, THEN THE system SHALL provide clear login instructions and preserve cart contents where possible.

### Data Corruption Handling

WHEN database corruption affects user data, THE system SHALL:
- Use backup recovery procedures
- Notify affected users of data restoration status
- Provide manual data reconstruction assistance

IF corrupted data cannot be fully recovered, THEN THE system SHALL offer credit compensation and expedited service recovery options.

### Service Outage Response

WHEN platform experiences complete or partial outages, THE system SHALL:
- Display maintenance pages with estimated restoration times
- Send proactive notifications to all logged-in users
- Queue pending operations for automatic resumption

During recovery from outages, THE system SHALL validate all data integrity and perform system health checks before full service resumption.

## Business Rules Integration

### Event Sequencing Requirements

WHEN multiple events trigger concurrently for the same order, THE system SHALL process events in defined priority order: payment events first, then order status changes, followed by notifications.

IF conflicting events occur (e.g., cancellation during shipping), THEN THE system SHALL apply business rules to determine the valid outcome state and rollback invalid operations.

### Data Consistency Validation

WHEN any business event processes, THE system SHALL validate all related entities are in consistent state before applying changes and maintain audit trails of all event-driven modifications.

### Performance Monitoring

THE system SHALL monitor event processing latency and report any events exceeding response time thresholds to operational dashboards for immediate review.

### Error Handling and Recovery

IF an event processing fails due to system error, THEN THE system SHALL queue the event for retry with exponential backoff timing, up to 5 attempts, and alert engineers when retries are exhausted.

WHEN external service integration fails during event processing, THE system SHALL switch to fallback processing mode and ensure business continuity while marking the issue for manual resolution.

```mermaid
graph LR
  A["Exception Occurs"] --> B{"Exception Type?"}
  B -->| "Authentication" | C["Validate Credentials"]
  B -->| "Payment" | D["Check Payment Method"]
  B -->| "Inventory" | E["Verify Stock Levels"]
  B -->| "Shipping" | F["Confirm Carrier Status"]
  B -->| "Review" | G["Moderate Content"]
  B -->| "Bulk Operation" | H["Process in Batches"]
  C --> I["Recovery Process"]
  D --> I
  E --> I
  F --> I
  G --> I
  H --> I
  I --> J{"Recovery Successful?"}
  J -->| "Yes" | K["Resume Normal Flow"]
  J -->| "No" | L["Escalate to Support"]
  L --> M["Incident Resolution"]
  M --> N["User Communication"]
  N --> O["Monitor Impact"]
  O --> P["Process Improvement"]
```

```mermaid
graph LR
  A["Payment Declined"] --> B{"Decline Reason?"}
  B -->| "Insufficient Funds" | C["Show Specific Error"]
  B -->| "Expired Card" | D["Prompt Card Update"]
  B --> E["Recovery Options"]
  C --> E
  D --> E
  E --> F{"User Action"}
  F -->| "Retry" | G["Process Payment"]
  F -->| "Cancel" | H["Order Cancellation"]
  F -->| "Support" | I["Human Intervention"]
  G --> J["Order Confirmation"]
  H --> K["Refund Processing"]
  I --> L["Manual Resolution"]
  L --> J
  L --> K
```

```mermaid
graph LR
  A["Out of Stock Item"] --> B["Display Alternatives"]
  B --> C["Notify Customer"]
  C --> D{"Customer Choice"}
  D -->| "Wait" | E["Backorder Processing"]
  D -->| "Alternative" | F["Cart Update"]
  D -->| "Cancel" | G["Order Removal"]
  E --> H["Partial Fulfillment"]
  F --> I["Continue Shopping"]
  G --> J["Refund Calculation"]
  H --> K["Split Shipping"]
  I --> L["Complete Purchase"]
  J --> M["Payment Refund"]
  K --> L
  M --> N["Customer Notification"]
```