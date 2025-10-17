# Business Rules and Validation Constraints for ShoppingMall Platform

## Introduction
This document defines all critical business rules and validation constraints that govern the functioning of the ShoppingMall e-commerce platform. The purpose is to provide backend developers with unambiguous, actionable requirements describing how the system should enforce rules related to inventory, orders, payments, reviews, user data, refunds, and cancellations. This document does not cover technical design or architecture but focuses solely on business requirements.

---

## 1. Inventory Constraints

### 1.1 SKU-level Inventory Management
- THE system SHALL maintain a non-negative integer inventory count for every SKU representing product variants.
- WHEN a customer places an order including SKUs, THE system SHALL reserve the inventory by decrementing the available count immediately upon payment confirmation.
- IF the available inventory for a SKU is zero, THEN THE system SHALL prevent adding that SKU to any user's shopping cart or completing an order containing that SKU.
- WHEN a seller updates the SKU inventory count, THE system SHALL validate that the new inventory count is a non-negative integer.

### 1.2 Inventory Synchronization
- WHILE a SKU is associated with an active listing on the platform, THE system SHALL synchronize inventory changes in real-time to prevent overselling.

### 1.3 Inventory Limits
- THE system SHALL support inventory levels up to at least 1,000,000 units per SKU to accommodate large sellers.

### 1.4 Inventory Adjustment Rules
- WHEN an order is canceled or refunded, THE system SHALL restore the SKU inventory by incrementing the available count accordingly.


## 2. Order Status Rules

### 2.1 Order Lifecycle States
- THE system SHALL track orders through the following status states: "Pending Payment", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded".

### 2.2 State Transitions
- WHEN an order is created and awaiting payment, THE system SHALL set status to "Pending Payment".
- WHEN payment is confirmed, THE system SHALL update the order status to "Processing".
- WHEN the seller marks the order as shipped, THE system SHALL update status to "Shipped".
- WHEN the customer confirms receipt or the system auto-confirms after delivery period, THE system SHALL update status to "Delivered".
- WHEN a customer or admin cancels an order prior to shipment, THE system SHALL update status to "Cancelled" and release inventory.
- WHEN a refund is approved and processed, THE system SHALL update status to "Refunded".

### 2.3 Order Cancellation Rules
- IF an order is in "Shipped" or "Delivered" status, THEN the system SHALL reject cancellation requests unless accompanied by a refund request.
- IF an order is "Pending Payment" or "Processing", THEN customers may request cancellation.

### 2.4 Order Tracking Updates
- THE system SHALL allow sellers to update shipping status including tracking numbers.
- THE system SHALL notify customers of status changes promptly.


## 3. Payment Validation

### 3.1 Payment Method Support
- THE system SHALL support multiple payment methods including credit/debit cards, digital wallets, and bank transfers.

### 3.2 Payment Processing
- WHEN processing payment, THE system SHALL validate payment details (e.g., card number format, expiration date, CVV) before submission.
- IF payment validation fails, THEN THE system SHALL reject the payment and notify the user with specific error messages.

### 3.3 Payment Confirmation
- WHEN payment is successful, THE system SHALL generate a unique transaction ID linked to the order.
- IF payment remains unconfirmed within 15 minutes of order creation, THEN THE system SHALL cancel the order and release reserved inventory.

### 3.4 Payment Security
- THE system SHALL never store sensitive full payment data beyond what is required for transaction processing.


## 4. Review Moderation Policies

### 4.1 Review Eligibility
- ONLY customers who have completed delivery of an order SHALL be permitted to submit product reviews or ratings.

### 4.2 Review Submission Rules
- THE system SHALL allow text reviews with a maximum length of 1000 characters.
- THE system SHALL allow rating submissions on a 1 to 5 star scale.

### 4.3 Review Moderation
- WHEN a review is submitted, THE system SHALL flag it as "Pending Approval" until reviewed by admins.
- THE system SHALL notify admins upon new review submissions.
- IF a review contains prohibited content (e.g., hate speech, spam), THEN THE system SHALL reject or remove the review.

### 4.4 Review Visibility
- ONLY approved reviews SHALL be visible to other customers.

### 4.5 Review Editing
- CUSTOMERS SHALL be allowed to edit their reviews within 7 days of submission.


## 5. User Data Validation

### 5.1 Registration and Profile Data
- WHEN a user registers, THE system SHALL require a valid email address matching RFC 5322 standards.
- THE system SHALL require passwords with minimum 8 characters, containing at least one uppercase letter, one lowercase letter, one digit, and one special character.
- THE system SHALL allow address entries with mandatory fields: recipient name, address line 1, city, postal code, and phone number.
- Phone numbers SHALL be validated to conform to E.164 international format.

### 5.2 Address Management
- USERS SHALL be able to manage multiple shipping addresses.
- THE system SHALL validate that postal codes are consistent with the country of the address.

### 5.3 Login
- WHEN a user attempts login, THE system SHALL limit failed login attempts to 5 within 15 minutes and temporarily lock the account for 30 minutes after that.


## 6. Refund and Cancellation Policies

### 6.1 Refund Eligibility
- REFUNDS SHALL only be available for orders with status "Shipped" or "Delivered" and within 30 days of delivery date.
- THE system SHALL allow partial refunds when specific SKUs are returned or refunded.

### 6.2 Refund Request Process
- WHEN a user requests a refund, THE system SHALL collect reason, amount, and optionally supporting evidence (e.g., photos).
- THE system SHALL notify sellers and admins of refund requests for approval.

### 6.3 Refund Approval
- ADMIN users SHALL have final authority to approve or reject refund requests.
- WHEN a refund is approved, THE system SHALL initiate payment reversal via the original payment method.
- THE system SHALL update the order status to "Refunded" upon refund completion.

### 6.4 Cancellation Requests
- Cancellation requests SHALL follow the order cancellation rules in section 2.3.
- THE system SHALL notify users of cancellation request status updates.


---

## Summary
This document provides a detailed overview of the key business rules and validation requirements essential to the ShoppingMall platform's operation. These rules ensure inventory accuracy, order correctness, payment validity, customer and seller fairness, and regulatory compliance. Backend developers MUST adhere strictly to these rules to guarantee system reliability, user satisfaction, and operational efficiency.

Backend developers are entrusted with complete autonomy to implement these requirements using appropriate technologies and designs, ensuring the platform functions as specified by these business rules.