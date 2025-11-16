# Business Constraints and Operational Policies for shoppingMall Platform

This document outlines the critical operational constraints, validation rules, and business policies required to ensure the effective and reliable functioning of the shoppingMall e-commerce platform. It serves as an essential reference for backend developers to implement and enforce these constraints accurately.

## 1. Introduction

### 1.1 Purpose and Scope
This document specifies comprehensive business constraints that govern the concurrency of users, inventory management per SKU, order cancellation windows, and fraud detection rules for the shoppingMall platform. These constraints are essential to ensure system stability, data integrity, and secure operations.

### 1.2 Audience
This document is intended for backend developers, system architects, and security teams responsible for implementing robust business logic and enforcing operational policies.

## 2. Business Constraints and Policies

### 2.1 Concurrent User Limits

WHEN customers, sellers, or admins attempt to log in, THE system SHALL allow access only if the total number of concurrent authenticated users is below 10,000.
IF the number of concurrent authenticated users reaches or exceeds 10,000, THEN THE system SHALL deny further login attempts with a "Service Busy" message.
WHEN login attempts are throttled, THE system SHALL provide clear feedback to users about current service capacity.
IF the platform remains at maximum concurrency for more than 5 minutes, THEN THE system SHALL generate operational alerts to notify administrators.

THE platform SHALL allow unlimited concurrent guest users to browse products without login.

### 2.2 Inventory Limits per SKU

THE system SHALL maintain inventory quantities as whole integers per SKU.
IF a customer attempts to place an order where the requested SKU quantity exceeds available inventory, THEN THE system SHALL reject the order with a "Stock Not Available" message.
THE system SHALL decrement inventory only after payment is successfully confirmed.
SELLERS SHALL NOT be allowed to list SKUs with inventory quantities exceeding 10,000 units.
THE system SHALL NOT permit negative inventory values during inventory updates.

### 2.3 Order Cancellation Windows

WHEN a customer requests order cancellation, THE system SHALL allow cancellations only if the order status is "Processing" and the request is within 1 hour of order placement.
IF the order status is "Shipped" or later, THEN THE system SHALL deny cancellation requests and offer a refund request option.
THE system SHALL automatically cancel unprocessed and unpaid orders after 24 hours from order placement.
WHEN an order is cancelled, THEN THE system SHALL restore inventory quantities for the cancelled SKUs.

### 2.4 Fraud Detection Rules

THE system SHALL monitor continuous user behaviors for signs of fraud, including rapid multiple orders, multiple failed login attempts, and inconsistent payment information.
IF suspicious activity is detected, THEN THE system SHALL flag the user account and suspend order placement abilities pending manual review.
THE system SHALL block IP addresses linked to repeated fraudulent behaviors for a minimum of 24 hours.
IF a seller account is found to be involved in fraudulent activity, THE system SHALL suspend the seller's product listings and account access.
ADMINISTRATORS SHALL receive immediate notifications upon detection of fraud incidents.

## 3. Mermaid Diagrams

### 3.1 Concurrent User Limit Flow
```mermaid
graph LR
  A["User Login Attempt"] --> B{"Is Authenticated User?"}
  B --|"No"| C["Allow Login - Guest Browsing"]
  B --|"Yes"| D["Check Active Authenticated Users"]
  D --> E{"Concurrent Users < 10,000?"}
  E --|"Yes"| F["Allow Login"]
  E --|"No"| G["Throttle Login with \"Service Busy\" Message"]
  G --> H["Generate Alert if >5 minutes"]
```

### 3.2 Order Placement Inventory Check
```mermaid
graph LR
  A["Customer Places Order"] --> B["Check SKU Inventory"]
  B --> C{"Inventory >= Order Quantity?"}
  C --|"Yes"| D["Reserve Inventory on Payment Confirmation"]
  C --|"No"| E["Reject Order - 'Stock Not Available'"]
```

### 3.3 Order Cancellation Window
```mermaid
graph LR
  A["Customer Requests Order Cancellation"] --> B{"Order Status == 'Processing'?"}
  B --|"Yes"| C["Allow Cancellation Within 1 Hour"]
  B --|"No"| D["Deny Cancellation"]
  D --> E["Offer Refund Request Option"]
```

### 3.4 Fraud Detection Monitoring
```mermaid
graph LR
  A["Monitor User Activity"] --> B{"Suspicious Behavior Detected?"}
  B --|"Yes"| C["Flag User Account & Suspend Order Placement"]
  B --|"No"| D["Continue Monitoring"]
  C --> E["Notify Admin"]
  C --> F["Block IP for 24 Hours"]
```

## 4. Summary

THE system SHALL enforce concurrency limits to prevent overloading and maintain performance.
THE platform SHALL ensure inventory is tightly managed to avoid overselling.
ORDER cancellation policies SHALL protect both customer rights and operational feasibility.
FRAUD detection mechanisms SHALL guard platform integrity and provide administrative alerts.

This document strictly defines clear, measurable, and actionable business constraints necessary for the stable operation of the shoppingMall platform.

All technical and implementation decisions are the responsibility of the development team, with this document focusing on WHAT must be enforced.

> *Note: This document defines business requirements only. All technical implementations such as APIs, databases, and architectures are at the developers' discretion.*
