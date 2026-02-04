# Seller Account Requirements Specification

## Business Model

### Why This Service Exists

The shopping mall platform exists to connect independent sellers with global customers through a unified, trustworthy e-commerce marketplace. Unlike single-vendor platforms, this model empowers small businesses to reach broad audiences without building their own infrastructure. The core differentiator is the **snapshot principle**, which ensures all financial and transactional changes are immutable, resolving disputes with transparent historical records. This builds trust for both customers and sellers, making the platform a reliable environment for commerce.

### Revenue Strategy

The platform generates revenue through:

- Transaction fees on all successful sales
- Optional premium features for sellers (e.g., featured placement, analytics dashboard)
- Sponsored category listings
- Subscription plans for high-volume sellers

Revenue flows through the platform’s escrow system, ensuring sellers receive payment only after delivery confirmation.

### Growth Plan

Growth is driven by:

- Seller acquisition: Onboarding independent vendors with compelling value propositions
- Customer acquisition: Search engine optimization, targeted advertising, and referral incentives
- Network effects: More sellers → more product diversity → more customers → more sellers
- Strategic partnerships with logistics providers and payment gateways

### Success Metrics

- Seller acquisition rate: >1,000 new sellers/month
- Active seller retention: >85% after 90 days
- Order volume per seller: >15 orders/month on average
- Seller approval turnaround: <48 hours
- Average order value: >$50
- Customer satisfaction (CSAT): >4.5/5 stars

## User Actor Structure

### Seller

A seller is a registered business entity that creates, manages, and sells products on the platform. Sellers operate independently but under platform governance.

#### Permissions and Capabilities

- THE seller SHALL register using verified email and password
- THE seller SHALL authenticate via email and password to access the seller dashboard
- THE seller SHALL edit shop name, description, and logo
- THE seller SHALL manage product listings (create, edit, delete)
- THE seller SHALL manage inventory for product variants
- THE seller SHALL respond to cancellation and refund requests
- THE seller SHALL view order items assigned to their products
- THE seller SHALL view seller profile snapshots
- THE seller SHALL view approval status and rejection reasons

#### Restrictions

- THE seller SHALL NOT sell products without administrator approval
- THE seller SHALL NOT delete account if pending order items exist
- THE seller SHALL NOT edit product listings if suspended
- THE seller SHALL NOT bypass the approval workflow
- THE seller SHALL NOT access customer accounts or financial records

#### Authentication Flow

WHEN a seller registers, THE system SHALL send a verification email with a link to complete registration.  
WHEN the seller clicks the verification link, THE system SHALL mark the account as "unverified".  
WHEN the account is fully registered, THE system SHALL set status to "pending_approval".  
WHEN an administrator approves the seller, THE system SHALL set status to "approved" and enable selling privileges.  
WHEN an administrator rejects the seller, THE system SHALL set status to "rejected" and include a rejection reason.  
WHEN a seller submits a new registration after rejection, THE system SHALL reset status to "pending_approval".

### Administrator

Administrators manage seller onboarding and platform compliance.

#### Permissions and Capabilities

- THE administrator SHALL review pending seller registrations
- THE administrator SHALL approve or reject seller applications
- THE administrator SHALL suspend seller accounts
- THE administrator SHALL unsuspend seller accounts
- THE administrator SHALL view all seller profiles and histories
- THE administrator SHALL view rejection reasons provided by other administrators

#### Restrictions

- THE administrator SHALL NOT approve sellers with fraudulent documentation
- THE administrator SHALL NOT delete seller accounts directly
- THE administrator SHALL NOT modify seller login credentials
- THE administrator SHALL NOT bypass the snapshot system

## Seller Registration

### Requirements

WHEN a new seller registers, THE system SHALL collect:

- Email address (required, validated format)
- Password (required, minimum 12 characters, must contain uppercase, lowercase, digit, special character)
- Business name (required)
- Business registration document (optional upload)
- Contact phone number (optional)

WHEN the registration form is submitted, THE system SHALL:

- Validate all required fields
- Verify email format
- Check if email is already registered (customer or seller)
- Encrypt password using bcrypt
- Generate unique seller ID
- Send confirmation email to provided email address
- Set initial status to "pending_verification"

WHILE the account is "pending_verification", THE system SHALL:

- Block login attempts
- Block access to seller dashboard
- Hide shop from product listings
- Prevent product creation or editing

WHEN the email verification link is clicked, THE system SHALL:

- Set account status to "pending_approval"
- Send notification to all administrators of new pending application
- Log registration timestamp and IP address

WHEN a user attempts to register with an email already registered as a customer, THE system SHALL NOT create a duplicate account and SHALL return error message: "This email is already associated with an existing account. Please log in or contact support."

## Approval Workflow

### Requirements

WHEN a seller’s status is "pending_approval", THE system SHALL display to administrators: "New seller application [Business Name]" in admin dashboard with "Review" button.

WHEN an administrator clicks "Review", THE system SHALL display:

- Business name
- Registered email
- Contact phone number
- Uploaded business documentation (if any)
- Registration date and time
- IP address at registration

WHEN an administrator approves a seller, THE system SHALL:

- Set seller status to "approved"
- Notify seller via email: "Your application has been approved. You may now list products."
- Log approval timestamp, administrator ID, and IP address
- Grant selling privileges to seller dashboard
- Make shop name visible in product listings
- Allow product creation and editing

WHEN an administrator rejects a seller, THE system SHALL:

- Set seller status to "rejected"
- Require administrator to enter a rejection reason (minimum 10 characters)
- Notify seller via email: "Your application has been denied. Reason: [reason]"
- Log rejection timestamp, administrator ID, IP address, and reason
- Block seller from login until new registration

WHEN a seller submits a new registration after rejection, THE system SHALL:

- Set status to "pending_approval" again
- Clear previous rejection reason
- Reset all previous application data
- Create new approval request
- Notify administrators of new application

WHEN an administrator attempts to approve a seller with incomplete documentation and no justification, THE system SHALL NOT allow approval and SHALL display error: "A rejection reason must be provided when denying an application."

## Status Tracking

### Requirements

THE system SHALL track the following statuses for each seller:

- "pending_verification" — email not yet confirmed
- "pending_approval" — waiting for admin review
- "approved" — authorized to sell
- "rejected" — application denied, no selling privileges
- "suspended" — temporarily disabled by administrator

WHEN a seller’s status is "approved", THE system SHALL:

- Allow login to seller dashboard
- Display products in category and search listings
- Allow product creation, editing, and deletion (if no pending orders)
- Allow inventory management
- Allow responses to cancellation/refund requests

WHEN a seller’s status is "suspended", THE system SHALL:

- Prevent login to seller dashboard
- Hide all products from search and category listings
- Prevent new product creation or edits
- Keep existing order items active (shipping, cancellations, refunds)
- Display "Shop Suspended" instead of shop name on product detail pages
- Retain all previous snapshots

WHEN a seller’s status is "rejected" or "suspended", THE system SHALL:

- Prevent access to seller dashboard
- Prevent any product editing
- Allow viewing of existing products, inventory, and order history (read-only)

WHEN a suspended seller is unsuspended, THE system SHALL:

- Set status to "approved"
- Notify seller via email: "Your account has been reinstated. Your products are now visible."
- Make products visible again in search and category listings
- Restore full selling privileges

WHEN an administrator changes a seller’s status, THE system SHALL create a snapshot of:

- Seller’s profile (shop name, description, logo)
- Current approval status
- Timestamp of change
- Administrator ID who made change
- Reason (if provided)

## Account Deletion Conditions

### Requirements

WHEN a seller requests account deletion, THE system SHALL check:

- Are there any pending order items where status is "paid" or "shipped"?
- Are there any pending cancellation requests?
- Are there any pending refund requests?

IF any of the above conditions are true, THEN THE system SHALL:

- Return error message: "Account deletion is not allowed. You have pending orders/refunds/cancellations. Please resolve all outstanding issues before deleting your account."
- Block deletion request

IF none of the above conditions are true, THEN THE system SHALL:

- Set account status to "deletion_requested"
- Send confirmation email to seller with 7-day wait period
- During the 7-day period, seller SHALL be able to cancel deletion request
- After 7 days without cancellation, THE system SHALL:
  - Delete seller profile (shop name, description, logo)
  - Delete all products and variants
  - Delete all inventory records
  - Archive seller account record (keep for legal compliance)
  - Preserve all order history and associated snapshots
  - Preserve all cancellation and refund requests and their snapshots
  - Preserve all review history (reviews become "deleted seller" with no shop name)

WHEN seller account is deleted, THE system SHALL:

- Change all product listings linked to that seller to: "Seller: [Deleted Seller]"
- Preserve order records with:
  - Seller ID
  - Product name
  - Variant options
  - Quantity
  - Price at time of purchase
  - Seller profile snapshot at time of order
- Preserve order item history and shipping records
- Retain buyer contact information for delivery and dispute purposes

WHEN a seller account is deleted, THE system SHALL notify all customers who purchased from that seller: "The seller \"[Shop Name]\" has closed their store. Your order history and delivery details are preserved. For concerns, contact customer support."

## Profile Management

### Requirements

WHEN a seller updates their shop name, description, or logo, THE system SHALL:

- Create a snapshot of the previous profile state (shop name, description, logo, timestamp)
- Store the snapshot with immutable audit trail
- Apply updated values to active profile
- Do not remove or delete prior snapshots

WHEN a seller edits shop name, THE system SHALL:

- Validate against existing shop names (no duplicates)
- Enforce limits: 5–120 characters, alphanumeric with spaces, no special characters except hyphens and underscores
- Allow Unicode characters (internationalized shop names)

WHEN a seller uploads a logo image, THE system SHALL:

- Accept: JPEG, PNG, WebP formats
- Enforce size: ≤5MB
- Enforce aspect ratio: 1:1 recommended, 4:3 maximum
- Auto-resize to 512x512px for standardization
- Generate thumbnail (128x128px)
- Store original and optimized versions
- Add watermark: "[Shop Name] Official Logo" in bottom-right corner (opacity 20%)

WHEN a seller removes their logo, THE system SHALL:

- Set logo field to null
- Keep previous logo snapshot intact
- Default to placeholder image: "[Shop Name] Logo"

WHEN a customer views a seller profile, THE system SHALL display:

- Current shop name
- Current shop description
- Current logo
- Average product rating (from all non-deleted reviews)
- Total number of products
- Total number of completed orders
- Date of first product listing
- Last update timestamp (for profile)

WHEN a seller edits their profile, customers SHALL see the updated information immediately in search and product listings.

## Shop Visibility Controls

### Requirements

WHEN a seller is "approved", THE system SHALL:

- Show shop name in:
  - Product listings
  - Product detail pages
  - Seller search
  - Order history
  - Review pages

WHEN a seller is "suspended", THE system SHALL:

- Replace shop name with: "[Shop Suspended]"
- Hide shop profile page
- Hide shop search results
- Hide shop name from new orders
- Preserve shop name in historical order records and snapshots

WHEN a seller is "rejected" or "deletion_requested", THE system SHALL:

- Hide shop name from search, listings, and category views
- Hide shop profile page
- Show: "[Shop Closed]" or "[Seller Unverified]" depending on status
- Preserve all historical sales data and snapshots
- Allow customers to view old orders and reviews

WHEN a seller is "approved" after suspension or rejection, THE system SHALL:

- Restore shop name visibility in all new product listings
- Keep historical "[Shop Suspended]" labels on past order records
- Preserve the full history of status changes and snapshots

WHEN a product’s seller is deleted, THE system SHALL:

- Display: "Seller: [Deleted Seller]"
- Preserve:
  - Product name
  - Product images
  - Product price
  - Product category
  - Product variant details
  - Review data
  - All snapshots

WHEN a product’s seller is suspended, THE system SHALL:

- Retain product in database
- Hide product from search and category listings
- Allow existing orders to proceed
- Prevent new purchases
- Show: "Product unavailable — seller suspended" when accessed via direct link
- Preserve product snapshots, inventory history, and reviews

WHEN a product’s seller is deleted, and the product is later re-listed by a new seller, THE system SHALL:

- Treat it as a completely new product
- Assign new product ID
- Clear all previous reviews and ratings
- Start fresh inventory records
- No inheritance of previous seller history

## Snapshots and Compliance

### Requirements

THE system SHALL create snapshots for:

- Seller profile changes (shop name, description, logo)
- Seller approval/rejection decisions
- Seller suspension/unsuspension
- Seller account deletion state transitions

EVERY snapshot SHALL contain:

- Timestamp of change (ISO 8601)
- Seller ID
- Administrator ID (if changed by admin)
- Old values (JSON object)
- New values (JSON object)
- Reason for change (if provided)
- IP address of actor
- Device type (if collected)

SNAPSHOTS SHALL be:

- Immutable (no delete, update, or modify operations allowed)
- Accessible to seller (own history only)
- Accessible to administrators (all histories)
- Accessible to super administrators (all histories)
- Archived for legal compliance (minimum 7 years)
- Not visible to customers

THE system SHALL NOT permit:

- Deletion of any snapshot
- Alteration of any snapshot data
- External access to snapshots outside platform
- Direct database access to snapshot tables

WHEN a seller’s profile is edited, THE system SHALL:

- Prevent the update if the shop name duplicates an existing one
- Enforce a 24-hour cooldown before next profile edit
- Log every edit in audit trail
- Ensure every edit creates a new snapshot, even if only one field changes

WHEN a seller’s approval status changes, THE system SHALL:

- Create exactly one snapshot per status change
- Include all profile fields as they existed at time of change
- Link snapshot to the status transition event
- Ensure snapshot is accessible in audit report in admin panel

WHEN a seller is suspended, THE system SHALL:

- Create snapshot of profile as it exists at suspension time
- Record suspension reason and administrator
- Preserve access to all previous snapshots
- Allow unsuspension to revert visibility, but preserve suspension history

WHEN a seller account is deleted, THE system SHALL:

- Create final snapshot of profile state
- Archive all snapshots under account deletion audit trail
- Retain all snapshots for at least the period required by local financial regulations
- Ensure snapshots remain accessible to legal and compliance authorities

## Business Rules Summary

- All seller actions are subject to approval or moderation
- Seller visibility is contingent on account status
- All profile changes are versioned with immutable snapshots
- Deletion requires zero pending orders or financial requests
- Historical data is preserved even after deletion
- Platform is not liable for seller content, only for transaction integrity

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
