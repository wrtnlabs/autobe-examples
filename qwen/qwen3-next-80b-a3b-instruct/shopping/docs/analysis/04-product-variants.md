# Product Variants Requirements Document

## Business Logic Overview

This document defines the requirements for managing product variants in the shopping mall platform. Variants represent different physical configurations of the same base product, such as size, color, material, or other attributes that affect inventory, pricing, and customer selection.

The system must support infinite variant combinations while maintaining accurate inventory tracking and intuitive customer selection workflows.

## Variant Definition System

### Core Principles

- Each product can have zero or more variants
- Variants are defined by combinations of attributes (e.g., size, color, material)
- All variants share the same base product metadata (title, description, images, category)
- Variant selection must be presented as clear, mutually exclusive options to customers
- Each variant must have a unique identifier (SKU)

### Attribute Management

#### Attribute Types

- **Size**: Numeric or text values (e.g., "S", "M", "L", "XL", "10", "12")
- **Color**: Text values representing color names or codes (e.g., "Red", "Navy Blue", "#FF0000")
- **Material**: Text values describing composition (e.g., "Cotton", "Leather", "Polyester")
- **Capacity**: Numeric values for volume or storage (e.g., "512GB", "1TB")
- **Style**: Text values representing design variations (e.g., "Slim Fit", "Vintage", "Wireless")

#### Attribute Rules

- **MUST** support at least 5 distinct attribute types
- **MUST** allow admins to define custom attribute types
- **MUST** enforce attribute values to be case-insensitive ("red" === "Red")
- **MUST** prevent duplicate attribute values within the same attribute type
- **MUST** allow attributes to be reused across multiple products
- **MUST** support attribute sorting by name, not by creation order

- WHEN a product is created, THE system SHALL allow administrators to assign one or more attribute types to it
- WHEN an attribute type is deleted, THE system SHALL NOT delete variants using that attribute but SHALL mark them as "incompatible"
- IF an attribute type is renamed, THE system SHALL update all existing variants using that attribute
- WHERE a product has no defined attributes, THE system SHALL treat it as a single-variant product

### Variant Combination Validation

- **MUST** prevent creation of duplicate variant combinations
- **MUST** validate that each attribute type is used at most once per variant
- **MUST** validate that at least one attribute type exists when creating multiple variants
- **MUST** validate that variant field values match the allowed attribute values

- WHEN a product administrator attempts to create a variant with duplicate attribute-value pairs, THE system SHALL reject the operation with an error message
- WHEN an existing variant is modified to match another existing variant, THE system SHALL reject the operation with an error message
- WHERE two variants share all attribute-value pairs, THE system SHALL consider them identical and prevent creation

## SKU Generation Rules

### Structure Requirements

- SKUs must be globally unique across all products
- SKUs must be machine-readable and human-readable
- SKUs must be generated automatically by the system
- SKUs must not contain spaces or special characters except hyphens (-) and underscores (_)
- SKUs must be case-insensitive ("SKU123" === "sku123")

### Generation Pattern

- **Format**: {ProductID}-{AttributeCode1}{AttributeCode2}-{SequentialNumber}
- **ProductID**: 6-character alphanumeric code derived from product category and creation timestamp
- **AttributeCodes**: 2-character codes representing attribute values
- **SequentialNumber**: 3-digit numeric counter for identical combinations

### Attribute Code Mapping

- Each attribute value must be assigned a unique 2-character code
- Codes must be deterministic and reversible
- Codes must be case-insensitive

#### Code Generation Rules:

- First letter: First letter of attribute value's first word (uppercase)
- Second letter: First letter of attribute value's second word (if exists, otherwise second letter from first word)

Examples:
- "Red" → "RD"
- "Navy Blue" → "NV"
- "Large" → "LG"
- "10" → "10" (numeric values use their value)
- "Cotton" → "CT"
- "Steel" → "ST"

### SKU Example

- Product: Premium Wireless Headphones with 5 attribute types
- Variants: 
  - Color: Black (BK), White (WT), Silver (SL)
  - Size: Standard (ST), Compact (CP)
  - Material: Leather (LV), Fabric (FB)
  - Warranty: 1 Year (YR1), 2 Years (YR2)
  - Bundle: With Case (CS), Without Case (WC)
- Sample SKU: PRMWHD-BKSTLFLVYR1CS-001

### Validation Rules

- WHEN an SKU is requested for a new variant, THE system SHALL generate it using the defined pattern
- WHEN a SKU already exists for the exact same variant combination, THE system SHALL NOT generate a new one but reuse it
- IF an SKU is manually entered by an administrator, THE system SHALL validate it against the pattern and reject invalid formats
- IF an SKU contains forbidden characters (spaces, punctuation other than - or _), THE system SHALL reject it with error code SKU_INVALID_FORMAT
- WHILE an SKU is being generated, THE system SHALL lock the variant combination to prevent race conditions

## Pricing Strategy per Variant

### Core Principles

- Each variant can have its own price, independent of other variants
- Base product price serves as the default for variants without explicit pricing
- Price changes for variants MUST NOT affect the base product price
- Pricing must be stored as a decimal with exactly 2 decimal places
- All prices are expressed in the platform's base currency (USD)

### Pricing Rules

- WHEN a variant is created, THE system SHALL inherit the base product price unless an override is specified
- WHEN a variant price is updated, THE system SHALL update only that variant's price
- WHERE a variant price is set to zero or negative, THE system SHALL treat it as "out of stock" for purchase purposes but preserve pricing data
- IF a base product price is changed, THE system SHALL NOT automatically update variant prices

### Discount Application

- **MUST** allow percentage-based discounts on variant prices
- **MUST** allow fixed-amount discounts on variant prices
- **MUST** allow "Buy X Get Y Free" promotions on variant combinations
- **MUST** exclude certain variant combinations from promotions (e.g., limited edition variants)

- IF a discount applies to a base product, THEN THE system SHALL apply it to all variants unless explicitly excluded
- WHERE a variant has a specific discount assigned, THE system SHALL use that discount instead of the product-level discount
- WHEN a discounted variant's price drops below zero after discount application, THE system SHALL apply a zero floor to the final price

## Inventory Tracking Requirements

### Core Requirements

- Inventory must be tracked at the SKU level, not at the product level
- Each variant (SKU) must have individual inventory count
- Low stock alerts must trigger per variant, not per product
- Stock levels must be real-time accurate
- Inventory must be updated on order placement, cancellation, and return

### State Machine for Inventory

- **Available**: Positive stock count > 0
- **Low**: Stock count ≤ low stock threshold (configurable)
- **Out of Stock**: Stock count = 0
- **Backordered**: Stock count < 0 (negative stock allowed per business rules)
- **Discontinued**: Inventory flag set to discontinued

### Business Rules for Inventory Updates

- WHEN an order is placed and paid, THE system SHALL immediately deduct the purchased quantity from the variant's inventory count
- WHEN an order is canceled before payment, THE system SHALL NOT modify inventory
- WHEN an order is canceled after payment, THE system SHALL fully restore inventory
- WHEN a return is processed and accepted, THE system SHALL increase inventory by returned quantity
- IF inventory reaches zero, THE system SHALL disable "Add to Cart" for that variant
- WHILE inventory is being updated, THE system SHALL implement a lock mechanism to prevent race conditions

### Overstock and Backorder Management

- WHERE a seller enables backorders, THE system SHALL allow inventory count to go negative
- IF backorders are disabled, THE system SHALL prevent sales when inventory reaches 0
- WHEN variants have different backorder policies, THE system SHALL enforce independence (some variants can be backordered while others cannot)

### Real-time Sync Requirements

- **MUST** maintain inventory accuracy within 3 seconds of any transaction
- **MUST** support 100+ concurrent inventory updates per second
- **MUST** have audit trail for all inventory changes including user ID and timestamp

## Variant Selection Workflow

### UI Requirements (Business Perspective)

- Variant options must be presented as clearly labeled, clickable selections
- Selected options must be visually highlighted
- Incompatible combinations must be visibly disabled (grayed out)

### Compatibility Rules

- **MUST** calculate compatibility dynamically based on all attribute combinations
- **MUST** disable unattainable variants based on inventory and attribute limitations
- **MUST** calculate available variants in real-time as selections are made

### Selection Logic Flow

- WHEN a customer navigates to a product page, THE system SHALL display all available variants
- WHEN a customer selects an attribute, THE system SHALL dynamically filter compatible variants
- IF no variants remain compatible after selection, THE system SHALL display "No available combinations"
- WHILE a variant is selected, THE system SHALL display its price, inventory status, and SKU
- WHERE a variant is out of stock, THE system SHALL display "Out of Stock" and disable selection
- WHEN a variant is selected, THE system SHALL populate the cart quantity input with minimum 1

### State Display Requirements

- **Available for Purchase**: Green indicator, selectable
- **Low Stock**: Yellow indicator, selectable
- **Out of Stock**: Red indicator, unselectable
- **Discontinued**: Gray indicator, unselectable

- WHILE a customer is viewing product variants, THE system SHALL update selection states in real-time as options are chosen
- WHEN a variant's inventory changes (by order, return, or admin update), THE system SHALL notify all active viewers of the product page
- IF an inventory update makes a previously unavailable variant available, THE system SHALL enable selection for that variant

### Accessibility Requirements (Business Terms)

- **MUST** support screen reader announcements for variant states
- **MUST** support keyboard navigation between variant options
- **MUST** maintain logical tab order for variant selection
- WHERE selections are disabled, THE system SHALL not allow focus or interaction

## Related Documents

- [Product Catalog Requirements](./03-product-catalog.md) for category hierarchy and search integration
- [Shopping Cart Requirements](./05-shopping-cart.md) for variant persistence and cart logic
- [Order Placement Requirements](./06-order-placement.md) for variant selection during checkout
- [Inventory Management Requirements](./11-admin-dashboard.md) for admin-level inventory controls

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development