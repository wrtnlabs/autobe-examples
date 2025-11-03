## 08-seller-portal.md

### Seller Account Management Requirements

#### Business Model

The seller portal is a critical component of the e-commerce platform, enabling business entities to list products, manage inventory, and track sales. This portal differentiates our platform from consumer-only marketplaces by providing specialized tools for business vendors to manage their product catalogs with precision. The portal's success metrics include:

- 75% of active sellers maintaining 90%+ product availability
- Minimum 20 product listings per active seller within 30 days
- Seller satisfaction score of 4.3/5 based on portal usability

#### User Actor: Seller

Seller accounts are business-verified profiles with permissions distinct from customer and admin roles:

| Action | Seller Permissions | Customer Permissions | Admin Permissions |
|--------|-------------------|---------------------|------------------|
| Create Product | ✅ | ❌ | ✅ |
| Update Product Details | ✅ | ❌ | ✅ |
| Manage Inventory per SKU | ✅ | ❌ | ✅ |
| View Sales Reports | ✅ | ❌ | ✅ |
| Process Refunds | ❌ | ❌ | ✅ |
| Manage Other Sellers | ❌ | ❌ | ✅ |

#### Functional Requirements

##### Seller Registration Process

1. **Business Verification:**  
   WHEN a seller attempts to register, THE system SHALL require business email verification (domain must match company name) and provide a 24-hour verification window for business documents.

2. **Registration Flow:**  
   WHEN a new seller submits business details, THE system SHALL create a pending status with email-based verification, and automatically populate the seller panel after approval.

3. **Seller Onboarding:**  
   WHEN a seller completes verification, THE system SHALL send automated onboarding guide with product upload instructions and platform fees breakdown.

##### Product Listing Rules

1. **Product Variants Definition:**  
   WHEN a seller creates a product with variants (color/size), THE system SHALL require all variant combinations to be fully populated before listing, with no empty product options.

2. **SKU Requirements:**  
   WHEN a seller adds product variants, THE system SHALL generate unique SKUs based on product code + variant ID (e.g., PROD123-RED-S), and require minimum 10 initial inventory units per SKU.

3. **Product Visibility:**  
   IF a seller's product category is not approved, THEN THE system SHALL automatically hide the product from search results until category approval is received.

##### Inventory Management

1. **Inventory Tracking:**  
   WHEN a seller reduces inventory for a specific SKU, THE system SHALL immediately update the total available count in the product catalog while preserving variant-level data.

2. **Low Stock Alerts:**  
   WHILE inventory levels fall below 10 units for any SKU, THE system SHALL trigger automated email alerts to the seller with product-specific stock warnings.

3. **Stock Replenishment:**  
   WHEN a seller adds new inventory, THE system SHALL validate the SKU before updating stock levels and display a confirmation of updated quantities on the seller dashboard.

##### Sales Reporting

1. **Daily Sales Reporting:**  
   THE system SHALL generate daily sales summaries for sellers, showing top-selling SKUs, revenue generated, and order volume by category.

2. **Refund Tracking:**  
   WHEN a customer initiates a refund request, THE system SHALL log the reason and status in the seller's sales report with associated order identification.

3. **Performance Metrics:**  
   THE system SHALL display a 30-day sales trend graph showing revenue and unit sold per category in the seller dashboard.

#### Inventory Management Flow

```mermaid
graph LR
  A[Start - Seller Logs In] --> B{Check Inventory}
  B -->|Stock > 10| C[Show Dashboard]
  B -->|Stock <= 10| D[Send Low-Stock Alert]
  C --> E[View Product Variants]
  E --> F{Select SKU}
  F --> G[Adjust Inventory]
  G --> H[Confirm Update]
  H --> I[Update Database]
  I --> J[Display Updated Quantities]
  D --> K[Email Seller]
```</p>

#### Seller Portal Business Rules

- **SKU Definition Rule:** ALL product variants must have a unique SKU; no duplicate SKUs allowed between variants
- **Inventory Consistency Rule:** Inventory counts must match exactly in both database and seller dashboard
- **Seller Data Isolation Rule:** Each seller's product catalog and inventory are completely isolated from other sellers' data
- **Verification Deadline Rule:** Sellers must complete business verification within 72 hours or their account is automatically deactivated
- **Product Disapproval Rule:** If a seller's product is marked as non-compliant, it must be hidden from search and displayed with a warning message in the seller portal

#### Error Handling from Seller Perspective

- **Invalid Email Format:** IF a seller enters an incorrect business email format, THEN THE system SHALL display error message 'Business email must be company domain (e.g., name@company.com)'.

- **Stock Quantity Error:** IF a seller attempts to set inventory below 0 units, THEN THE system SHALL show alert 'Inventory cannot be negative. Please enter valid quantity.'

- **Verification Failure:** IF a seller's business documentation is rejected, THEN THE system SHALL provide detailed rejection reasons and instructions for re-uploading documents.

#### Seller Portal Performance Requirements

- **Dashboard Load Time:** THE system SHALL display seller dashboard within 2 seconds for 95% of all sessions.
- **Inventory Update Response:** WHEN a seller modifies inventory levels, THE system SHALL confirm the update within 1.5 seconds.
- **Report Generation:** THE system SHALL generate daily sales reports within 30 seconds from request.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*