# E-Commerce Shopping Mall Platform Requirements

## Business Model

### Why This Service Exists

The e-commerce shopping mall platform serves as a digital marketplace connecting independent sellers with customers across diverse product categories. The primary business value lies in enabling small businesses and artisans to reach customers without needing their own e-commerce infrastructure, while providing customers with a unified, reliable, and diverse shopping experience.

The platform generates revenue through transaction fees on sales and premium seller features. Revenue sustainability depends on platform trust, operational efficiency, and seller satisfaction, which are enabled by comprehensive administrative controls and fraud prevention systems.

### Revenue Strategy

- Transaction fee: 5-8% commission on every successful sale processed through the platform
- Premium seller tiers: Subscription fees for enhanced features (analytics, priority support, featured listings)
- Advertising: Sponsored product placements and promoted categories
- Service fees: Charges for advanced inventory sync, multi-channel integration, or custom order fulfillment workflows

Revenue generation depends on platform trust and operational stability. The platform's ability to scale and maintain seller and customer retention directly correlates with the effectiveness of its administrative controls and quality assurance systems.

### Growth Plan

- Seller acquisition: Target independent brands, artisans, and small businesses in high-demand categories (fashion, home goods, handmade items)
- Customer acquisition: Digital marketing campaigns focused on niche product categories and regional markets
- Geographic expansion: Regional marketing localized to major urban areas with strong e-commerce adoption
- Platform partnerships: Integrations with logistics providers, payment processors, and inventory management systems

Growth depends on maintaining platform quality. Comprehensive administrative controls enable scalable growth by automating moderation, identifying high-risk accounts, and ensuring consistent customer experience across increasing transaction volume.

### Success Metrics

- **Platform integrity metrics**: Number of fraudulent accounts suspended, percentage of fake reviews removed
- **Operational efficiency**: Average time to resolve seller disputes, percentage of orders flagged for review
- **Seller satisfaction**: Seller churn rate, number of seller support tickets resolved within 24 hours
- **Customer trust metrics**: Product return rate, percentage of disputed transactions resolved in customer's favor
- **Platform health**: System downtime percentage, average response time for admin actions
- **Revenue metrics**: Payment processing success rate, chargeback rate per 1,000 transactions

These metrics must be continuously monitored and optimized through the administrative dashboard.

## User Actor Structure

### Customer

- Primary actor for browsing, purchasing, and reviewing products
- Has limited access to view their own orders, reviews, and wishlist
- Cannot access system-wide data or other user information
- Must complete registration with email verification and address management
- Can create and manage multiple shipping addresses
- Can save products to wishlist for future purchase
- Can place orders and track their status
- Can leave product reviews and ratings after purchase
- Can request order cancellations and refunds

### Seller

- Business entity that lists and manages products for sale
- Has access to sales analytics and order fulfillment tools for their own products
- Can communicate with customers regarding orders and reviews
- Cannot access other sellers' data or administrative controls
- Must complete registration with business verification and bank account details
- Can manage product catalog including creation, editing, and removal of products
- Can update inventory levels for each SKU variant
- Can view sales reports and financial summaries for their store
- Can manage shipping options and fulfillment settings
- Can respond to customer reviews and inquiries

### Admin

- System-wide authority with full control over the platform
- Has read and write access to all data across all users and entities
- Responsible for maintaining platform security, integrity, and compliance
- Acts as final arbitrator in disputes and policy enforcement
- Has privileged access to all system configuration options
- Manages user accounts (customers and sellers) including suspension and deletion
- Moderates product listings and reviews
- Oversees order fulfillment and dispute resolution
- Monitors inventory and detects fraud
- Manages payment and shipping system configurations
- Generates compliance and financial reports

## Authentication Requirements

### Core Authentication Functions

WHEN a user attempts to register as a customer or seller, THE system SHALL:

- Require email address with valid format
- Send verification email with unique cryptographic token
- Freeze account until email verification is completed
- Prevent duplicate registration from same email address
- Require password with minimum complexity (8+ characters, upper case, number, symbol)
- Store password using bcrypt hashing
- Log registration attempt with IP address and device fingerprint

WHEN a user logs in, THE system SHALL:

- Accept email address and password
- Validate email existence and password hash
- If credentials are valid:
  - Generate JWT access token with expiration 15 minutes after issuance
  - Generate refresh token with expiration 7 days after issuance
  - Store refresh token hash with user account record
  - Return access token and refresh token in HTTP-only secure cookie
  - Log login event with timestamp, IP address, and device fingerprint
- If credentials are invalid:
  - Return HTTP 401 Unauthorized
  - Log failed attempt with timestamp, IP address, and attempted email
  - Increment failed attempt counter for that email address
  - If failed attempts reach 5 within 10 minutes:
    - Lock the account for 15 minutes
    - Send notification email to registered email on file
    - Log account lock event

WHILE a user is authenticated, THE system SHALL:

- Validate JWT token on every API request to authenticated endpoints
- Verify token signature and expiration
- If token is valid:
  - Extract user ID and role from token payload
  - Allow access to requested resources based on role permissions
- If token is invalid or expired:
  - Return HTTP 401 Unauthorized
  - If token is expired but refresh token is valid and unrevoked:
    - Issue new access token
    - Return new access token in response
  - If refresh token is invalid or expired:
    - Logout user and clear all tokens
    - Return HTTP 401 Unauthorized

IF a user account is flagged for suspicious activity, THEN THE system SHALL:

- Immediately revoke all active session tokens
- Temporarily suspend the account
- Require password reset with additional verification step
- Send notification to user email about the suspension
- Lock the account until manually reviewed by another admin

### Authentication Flow Requirements

#### Customer Registration Flow

WHEN a visitor navigates to the registration page, THE system SHALL:

- Display registration form with fields for email, password, confirm password, and full name
- Validate form fields in real-time for:
  - Email format
  - Password strength
  - Matching password confirmation
- Submit form via POST request to /api/users/register endpoint
- On success:
  - Store user record with status "pending_verification"
  - Send verification email with unique link
  - Display confirmation message to user
- On failure:
  - Return appropriate error message
  - Preserve form values except password

WHEN a user clicks the email verification link, THE system SHALL:

- Validate the cryptographic token
- If token is valid and not expired:
  - Update user status to "active"
  - Clear the verification token
  - Redirect to login page
  - Show success message
- If token is invalid or expired:
  - Display error message
  - Offer option to resend verification email

#### Seller Onboarding Flow

WHEN a user selects "Become a Seller" during registration, THE system SHALL:

- Display additional fields for business information:
  - Business name
  - Business descriptor (category)
  - Business address
  - Business phone
  - Tax identification number or government registration number
  - Bank account details (for payout)
- Validate business registration number through country-specific verification API
- Require upload of business license document (PDF or image)
- Send business registration details to admin for manual approval
- Display message: "Your seller application is under review. You will be notified by email within 24 hours."
- Allow the user to complete customer registration (login, etc.) while awaiting approval
- Only grant seller privileges after admin approval

### Session Management

WHEN a user logs out, THE system SHALL:

- Clear access token and refresh token from browser storage
- Revoke refresh token in database (add to revoked token list)
- Redirect to home page
- Log logout event with timestamp

WHEN a user closes their browser, THE system SHALL:

- Allow their session to expire naturally after 15 minutes of inactivity
- Not automatically sign them out until expiration
- Require re-authentication to access protected resources

WHEN a user attempts to access a protected resource without a valid token, THE system SHALL:

- Return HTTP 401 Unauthorized
- Redirect unauthenticated users to login page
- Preserve original requested URL to redirect after successful login

## Authorization Matrix

| Action | Customer | Seller | Admin |
|--------|----------|---------|--------|
| Register account | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
| Manage own addresses | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| View own reviews | ✅ | ✅ | ✅ |
| View own wishlist | ✅ | ✅ | ✅ |
| View public product catalog | ✅ | ✅ | ✅ |
| Search products | ✅ | ✅ | ✅ |
| Filter products by category | ✅ | ✅ | ✅ |
| View product details | ✅ | ✅ | ✅ |
| View product variants | ✅ | ✅ | ✅ |
| View seller profile | ✅ | ✅ | ✅ |
| Add product to cart | ✅ | ✅ | ❌ |
| Add product to wishlist | ✅ | ✅ | ❌ |
| Adjust cart quantity | ✅ | ✅ | ❌ |
| Remove from cart | ✅ | ✅ | ❌ |
| View cart summary | ✅ | ✅ | ❌ |
| Place order | ✅ | ✅ | ❌ |
| View order status | ✅ | ✅ | ✅ |
| Cancel own order | ✅ | ✅ | ✅ |
| Request refund | ✅ | ✅ | ✅ |
| Leave product review | ✅ | ✅ | ❌ |
| Edit own review | ✅ | ✅ | ✅ |
| Remove own review | ✅ | ✅ | ✅ |
| Upload product images | ❌ | ✅ | ✅ |
| Create product listing | ❌ | ✅ | ✅ |
| Edit own product listings | ❌ | ✅ | ✅ |
| Delete own product listings | ❌ | ✅ | ✅ |
| Manage inventory per SKU | ❌ | ✅ | ✅ |
| Manage product variants | ❌ | ✅ | ✅ |
| Manage pricing per variant | ❌ | ✅ | ✅ |
| View sales analytics | ❌ | ✅ | ✅ |
| Manage shipping settings | ❌ | ✅ | ✅ |
| Respond to customer reviews | ❌ | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| View user details including email and IP | ❌ | ❌ | ✅ |
| View all sellers | ❌ | ❌ | ✅ |
| View seller details including business info | ❌ | ❌ | ✅ |
| Edit user information | ❌ | ❌ | ✅ |
| Edit seller information | ❌ | ❌ | ✅ |
| Enable/disable user account | ❌ | ❌ | ✅ |
| Enable/disable seller account | ❌ | ❌ | ✅ |
| Delete user account | ❌ | ❌ | ✅ |
| Delete seller account | ❌ | ❌ | ✅ |
| Reset password for any user | ❌ | ❌ | ✅ |
| Reset password for any seller | ❌ | ❌ | ✅ |
| View all products | ❌ | ❌ | ✅ |
| View product details including variants, pricing, inventory | ❌ | ❌ | ✅ |
| Edit product details (title, description, category) | ❌ | ❌ | ✅ |
| Edit product pricing | ❌ | ❌ | ✅ |
| Edit product variants | ❌ | ❌ | ✅ |
| Delete product | ❌ | ❌ | ✅ |
| Restore deleted product | ❌ | ❌ | ✅ |
| View all orders | ❌ | ❌ | ✅ |
| View order details including customer info, payment info, shipping info | ❌ | ❌ | ✅ |
| Edit order status | ❌ | ❌ | ✅ |
| Cancel order | ❌ | ❌ | ✅ |
| Refund order | ❌ | ❌ | ✅ |
| View all reviews | ❌ | ❌ | ✅ |
| Edit or delete reviews | ❌ | ❌ | ✅ |
| Hide reviews from public view | ❌ | ❌ | ✅ |
| Manage category structure | ❌ | ❌ | ✅ |
| Create new categories | ❌ | ❌ | ✅ |
| Edit category names and descriptions | ❌ | ❌ | ✅ |
| Delete categories | ❌ | ❌ | ✅ |
| Reorder categories | ❌ | ❌ | ✅ |
| Manage brand listings | ❌ | ❌ | ✅ |
| Approve/reject product listing requests | ❌ | ❌ | ✅ |
| Manage payment gateway configurations | ❌ | ❌ | ✅ |
| Edit transaction fees | ❌ | ❌ | ✅ |
| View payment processing logs | ❌ | ❌ | ✅ |
| Manually process payment transactions | ❌ | ❌ | ✅ |
| View system logs | ❌ | ❌ | ✅ |
| View system configuration | ❌ | ❌ | ✅ |
| Edit system configuration | ❌ | ❌ | ✅ |
| Change platform branding | ❌ | ❌ | ✅ |
| Manage email templates | ❌ | ❌ | ✅ |
| Send broadcast email to users or sellers | ❌ | ❌ | ✅ |
| Manage system announcements | ❌ | ❌ | ✅ |
| Manage notification settings | ❌ | ❌ | ✅ |
| Schedule system maintenance | ❌ | ❌ | ✅ |
| View backup logs | ❌ | ❌ | ✅ |
| Initiate system backup | ❌ | ❌ | ✅ |
| Restore system from backup | ❌ | ❌ | ✅ |
| View security audit trail | ❌ | ❌ | ✅ |
| Rotate security keys | ❌ | ❌ | ✅ |
| View compliance reports | ❌ | ❌ | ✅ |
| Generate compliance reports | ❌ | ❌ | ✅ |
| Export all platform data | ❌ | ❌ | ✅ |
| Import bulk data (users, products, orders) | ❌ | ❌ | ✅ |
| View API access logs | ❌ | ❌ | ✅ |
| Manage API tokens | ❌ | ❌ | ✅ |

## Customer Registration and Address Management

### Registration Process Flow

WHEN a visitor chooses to register as a customer, THE system SHALL:

- Present a form with fields for:
  - Full name (required)
  - Email address (required, must be unique)
  - Password (required, 8+ characters with uppercase, number, and symbol)
  - Confirm password (required, must match password)
  - Subscribe to newsletter (optional)
- Validate all form fields in real-time using client-side validation:
  - Email must be valid format (regex pattern)
  - Password must meet complexity requirements
  - Password and confirm password must match
- Submit form via POST request to /api/users/register endpoint
- On successful registration:
  - Create user record with status "pending_verification"
  - Generate unique verification token with 24-hour expiration
  - Send verification email to provided email address with link containing verification token
  - Display confirmation message: "Thank you for registering! Please check your email to verify your account."
- On registration failure:
  - Return appropriate error message ("Email already in use", "Password too weak", etc.)
  - Preserve non-password form values for re-submission
  - Log failed attempt with IP address and device fingerprint

WHEN a user clicks the verification link in their email, THE system SHALL:

- Extract verification token from URL path
- Validate token against database record:
  - Verify token exists and matches the user record
  - Verify token has not expired (24-hour window)
  - Verify user status is "pending_verification"
- If token validation passes:
  - Update user status to "active"
  - Delete the verification token from database
  - Redirect user to login page
  - Display success message: "Your account has been verified! You can now log in."
- If token validation fails (expired or invalid):
  - Display error message: "The verification link is invalid or has expired."
  - Offer option to "Resend verification email"
  - Log failed verification attempt

WHEN a user requests to resend the verification email, THE system SHALL:

- Accept email address input
- Validate that email exists and is in "pending_verification" status
- Generate new verification token with 24-hour expiration
- Send new verification email with fresh link
- Display message: "A new verification email has been sent to your address."
- Limit resends to 3 attempts within 24 hours

### Email Verification Workflow

- Verification email must be sent from system email (noreply@shoppingmall.com)
- Email body must contain: customer's name, clear call to action button, and expiration notice
- Email subject must be: "Verify your Shopping Mall account"
- Verification link must use HTTPS and include the unique token as a path parameter
- Email content must be delivered in both HTML and plain text formats
- Verification link must NOT contain user ID or sensitive information, only the cryptographic token
- Token must use cryptographically secure random generation
- System must log all email sends and delivery attempts

### Address Management Workflow

WHEN a customer navigates to "My Addresses" section, THE system SHALL:

- Display list of all saved addresses with:
  - Address label (personal, work, etc.)
  - Full address (street, city, state, postal code, country)
  - Phone number
  - Primary address indicator
  - Action buttons: Edit, Set as Primary, Delete
- Show "Add New Address" button
- Default view shows addresses sorted by "Primary" first, then most recently used

WHEN a customer clicks "Add New Address", THE system SHALL:

- Display address form with fields:
  - First name (required)
  - Last name (required)
  - Address line 1 (required)
  - Address line 2 (optional)
  - City (required)
  - State/Province (required)
  - Postal code (required)
  - Country (required, dropdown)
  - Phone number (required)
  - Address label (optional, default "Home")
  - Set as primary address (checkbox)
- Validate form fields before submission:
  - All required fields filled
  - Postal code format matches country pattern
  - Phone number follows E.164 format
- On successful submission:
  - Create new address record linked to user
  - If "Set as primary" checked:
    - Set this address as primary
    - Update all other addresses to non-primary
  - Display confirmation message
  - Redirect to address list
- On error:
  - Display appropriate error messages for each invalid field
  - Preserve form values with highlighted errors

WHEN a customer edits an address, THE system SHALL:

- Display address form pre-populated with current values
- Allow editing all fields except address ID
- Same validation as "Add New Address"
- Allow user to change primary status
- On save:
  - Update address record
  - If primary status changed, update other addresses accordingly
  - Redirect to address list
- On delete:
  - Confirm action with dialog: "Are you sure you want to delete this address? This cannot be undone."
  - Only allow deletion if not primary address
  - If primary address is deleted, promote the most recently used address to primary
  - Delete address record
  - Redirect to address list

WHEN a customer sets an address as primary, THE system SHALL:

- Update target address to "primary" = true
- Update all other addresses for the same user to "primary" = false
- Save changes to database
- Return updated address list

WHEN a customer places an order, THE system SHALL:

- Require selection of one of their saved addresses as shipping address
- Default to primary address if available
- Allow selection of "Add new address" during checkout
- Require shipping address for order creation
- Do not allow orders without a valid shipping address

## Product Catalog

### Catalog Structure Overview

The product catalog is organized as a hierarchical taxonomy with categories, subcategories, and products. Each product may have multiple variants (SKUs) with different attributes like size, color, material, etc.

Catalog navigation must support:
- Breadcrumb navigation: Home > Category > Subcategory > Product
- Category filtering without page refresh (JavaScript-driven)
- Search functionality with autocomplete
- Sorting by relevance, price, rating, newest

Category structure must be:
- Hierarchical (parent-child relationships)
- Maintained by admin with drag-and-drop reordering
- Support unlimited depth
- Each category has unique slug identifier
- Category images displayed in listings

### Category Hierarchy Requirements

WHEN an admin creates a category, THE system SHALL:

- Accept category name (max 100 characters)
- Accept category description (optional, max 500 characters)
- Accept category image (PNG, JPG, GIF - max 5MB)
- Accept parent category selection (optional)
- Require unique slug (auto-generated from name if not provided)
- Save category with active status
- Generate unique category ID
- Log creation with admin ID and timestamp

WHEN an admin edits a category, THE system SHALL:

- Allow editing of:
  - Name
  - Description
  - Image (allow upload or deletion)
  - Parent category
  - Slug (allow manual override)
  - Status (active/inactive)
- If slug is changed, update all references to product listings
- If parent category is changed, update category hierarchy
- If category becomes inactive:
  - Hide category from customer-facing navigation
  - Keep products under category but make them inaccessible via category navigation
  - Products remain searchable
- Log edits with admin ID and changes made

WHEN a category contains products, THE system SHALL:

- Prevent deletion of category
- Allow deactivation instead
- Display warning message if deletion is attempted: "This category contains products. Deactivate instead to preserve product listings."

WHEN a category is deactivated, THE system SHALL:

- Hide category from customer-facing navigation pages
- Keep all associated products in the system
- Allow products to be accessed directly via product URL
- Allow search to return products from deactivated categories
- Allow admin to reactivate category
- Log deactivation event with timestamp and admin ID

### Product Listing Requirements

WHEN a seller creates a product, THE system SHALL:

- Present product creation form with:
  - Product name (required, max 200 characters)
  - Category (required, hierarchical selection)
  - Product description (required, rich text editor)
  - Images (upload 1-10 images, required, JPG/PNG, max 3MB each)
  - Base price (required, min 0.01 USD)
  - Product status (draft/pending/approved)
  - Meta title (optional)
  - Meta description (optional)
  - Tags (optional, comma-separated keywords)
- Validate that category selection is active
- Require at least one image
- Validate price is numeric and greater than 0.01
- Save product with status "draft"
- Generate unique product ID
- Log creation with seller ID and timestamp

WHEN a product status is "draft", THE system SHALL:

- Hide product from customer-facing search and category pages
- Allow seller to edit and save changes freely
- Allow admin to view and approve pending products
- Allow admin to delete draft products without restriction

WHEN a product status is "pending", THE system SHALL:

- Hide product from customer-facing search and category pages
- Allow seller to view but not edit
- Allow admin to approve or reject
- Allow admin to request changes (change status to "draft" with comment)
- Save product creation timestamp
- Send notification email to seller of status change

WHEN a product status is "approved", THE system SHALL:

- Make product visible on customer-facing search and category pages
- Allow customers to view, add to cart, and purchase
- Allow seller to edit (except name) - changes require re-approval
- Allow customers to leave reviews
- Allow admin to suspend or delete
- Log all edits with reason
- Update search index on every edit

WHEN a seller edits an approved product, THE system SHALL:

- Allow editing of:
  - Description
  - Images
  - Price
  - Tags
  - Inventory
  - Shipping options
- Do NOT allow editing of: product name or category
- If any edit occurs:
  - Change status to "pending"
  - Send notification to admin that product requires re-approval
  - Hide product from customer-facing pages until re-approved
  - Log edit with seller ID and timestamp and list of changed fields
- Only if product name or category is changed:
  - Change status to "pending" immediately
- If editing includes price change:
  - Log price change history
  - Notify customer if product is in their wishlist or cart

WHEN an admin approves a product, THE system SHALL:

- Change product status from "pending" to "approved"
- Make product available to customers
- Send notification email to seller
- Log approval with admin ID and timestamp
- Update search index
- Ensure all images are properly processed and cached

WHEN an admin rejects a product, THE system SHALL:

- Change product status from "pending" to "draft"
- Send notification email to seller with rejection reason
- Allow seller to edit and resubmit
- Log rejection with admin ID, timestamp, and reason

### Search Functionality Requirements

WHEN a customer uses the search bar, THE system SHALL:

- Accept any text input (minimum 2 characters)
- Return results in real-time as user types (debounced 300ms)
- Display autocomplete suggestions with:
  - Product name
  - Category name
  - Brand name (if defined)
  - Product SKU (if applicable)
- Show "Search for 'term'" button below autocomplete
- On selection of suggestion, navigate to product page
- On clicking "Search" button, navigate to search results page

WHEN a customer performs a search, THE system SHALL:

- Display search results page with:
  - Total results count
  - Filter sidebar (categories, price range, ratings, attributes)
  - Results grid with product cards
  - Sorting options: Relevance, Price (Low-High), Price (High-Low), Newest, Rating
- Search must match:
  - Product name (exact and partial matching)
  - Product description (partial matching)
  - Product tags
- Use full-text search with stemming
- Return products from approved listings only
- Include products from deactivated categories
- Return results in order of relevance score
- Implement pagination (24 items per page)

WHEN a search returns no results, THE system SHALL:

- Display message: "No products found matching \"term\". Try adjusting your search terms."
- Suggest related popular search terms
- Show banner with top-selling products in relevant categories

### Filter and Sort Requirements

WHEN a customer filters products, THE system SHALL:

- Support filtering by:
  - Category (hierarchical selection)
  - Price range (slider with min/max values)
  - Rating (1 to 5 stars)
  - Features (dynamic attributes based on product variants)
  - Shipping options (free shipping, express shipping)
- Filter sidebar must be collapsible
- Apply filters with AJAX without page reload
- Update URL with query parameters so filters are bookmarkable
- Preserve state of filters during navigation
- Allow multiple selections per filter type (OR logic)
- Show active filters with "X" to remove individually

WHEN a customer sorts products, THE system SHALL:

- Support sorting by:
  - Relevance (default)
  - Price (Low to High)
  - Price (High to Low)
  - Newest first
  - Rating (Highest)
- Sorting must be applied without page reload
- Selected sort option must be visually highlighted
- Store sort preference in user preferences for 15 days

### Product Visibility Rules

WHEN a product is active, THE system SHALL:

- Be listed in category pages
- Be returnable in search results
- Be viewable on direct URL
- Be addable to cart and wishlist
- Allow customers to leave reviews

WHEN a product is inactive, THE system SHALL:

- Not appear in category pages
- Not appear in search results
- Not be viewable on direct URL
- Not be addable to cart
- Keep reviews intact but hidden from public view
- Allow admin to reactivate product

WHEN a product is pending approval, THE system SHALL:

- Not be visible to customers in any context
- Be editable by seller (if in draft)
- Be viewable and modifiable by admin
- Be searchable only by admin
- Have status badge: "Pending Approval"

WHEN a product is deleted, THE system SHALL:

- Be removed from all customer-facing views
- Remain in database for compliance
- Keep associated reviews and order history
- Hide from all searches and listings
- Log deletion with admin ID and timestamp

## Product Variants

### Variant Definition System

Product variants represent the different physical versions of a product with different attributes. Each unique combination of attributes forms a unique variant with its own SKU.

Common variant attributes:
- Size (S, M, L, XL, etc.)
- Color (Red, Blue, Green, etc.)
- Material (Cotton, Polyester, Leather, etc.)
- Style (Short-sleeve, Long-sleeve, etc.)
- Weight (100g, 500g, 1kg, etc.)
- Memory (8GB, 16GB, 32GB, etc.)
- Capacity (100ml, 500ml, 1L, etc.)

Variant attributes must be:
- Configurable by admin for each category
- Reusable across multiple products in same category
- Assigned to products during creation
- Validated to prevent invalid combinations

### Attribute Management

WHEN an admin configures product attributes, THE system SHALL:

- Present attribute management interface:
  - List of available attributes (e.g., Size, Color, Material)
  - Button to create new attribute
  - Search bar
- Allow creation of new attribute:
  - Name (required, unique)
  - Description (optional)
  - Type (dropdown, text, image)
  - Values (comma-separated list of valid values)
- Values must be unique per attribute
- Allow editing of attribute name and values
- Allow deletion of attribute only if not used by any product
- Log all changes with admin ID and timestamp

WHEN a seller creates a product, THE system SHALL:

- Show attribute selection based on product category
- For each attribute, show available values
- Allow selection of multiple values per attribute
- Generate variant combinations automatically
- Show preview of all variants
- Allow manual editing of variant pricing and inventory
- Require at least one variant to be created

WHEN a seller edits a product with variants, THE system SHALL:

- Allow editing of existing variant pricing and inventory
- Prevent removal of variants that have associated orders
- Allow addition of new variants if existing variants have no orders
- Allow deletion of variants with no orders
- If attribute values are changed:
  - Recalculate variants
  - Flag variants for review if changes affect existing orders
- Save changes as draft until product re-approved

### SKU Generation Rules

WHEN a product variant is created, THE system SHALL:

- Generate a unique SKU code using format: `PREFIX-CATEGORY-LONG-VERSION`
- Example: "SM-FASH-001-RED-XL"
- Prefix: "SM" (platform prefix)
- Category: Category slug
- Long version: Hash of variant attributes
- Avoid using human-readable values like "red" or "xl" in SKU
- Use unique identifier system for attribute values (e.g., "red" → "a1b2", "xl" → "c3d4")
- SKU must be globally unique across all products and variants
- SKU must be immutable after order placement
- SKU must be searchable by admin and seller
- Display SKU to customer in cart and order confirmation

WHEN an inventory count is updated for a variant, THE system SHALL:

- Update the variant's inventory count
- Log change with user ID, timestamp, old count, new count, and reason
- If inventory becomes zero:
  - Mark variant as "Out of Stock"
  - Prevent purchase unless "back in stock" notification is enabled
- If inventory becomes negative:
  - Flag for inventory discrepancy
  - Prevent further sales of variant
  - Notify admin

### Pricing Strategy per Variant

WHEN a variant is created, THE system SHALL:

- Inherit base product price as default
- Allow per-variant price adjustment:
  - Increase price for premium variants (e.g., larger size, premium material)
  - Decrease price for discounted variants (e.g., surplus stock)
- Price adjustment can be positive or negative, minimum $0.01 difference
- Validate that adjusted price is greater than 0
- If variant price becomes 0:
  - Require admin override
  - Display warning: "Product will be free. Confirm price adjustment."
- Log all price changes with admin/seller ID, timestamp, old price, and new price

WHEN a product price is changed at the base level, THE system SHALL:

- If variant prices were left as "inherit" (default):
  - Update variant price to match new base price
  - Log change with reason "Base price update"
- If variant prices were manually adjusted:
  - Leave variant price unchanged
  - Highlight variant as "Manually Adjusted"

WHEN a customer adds a variant to cart, THE system SHALL:

- Store variant ID and variant-specific price
- Display correct price in cart summary
- Include variant-specific price in order total calculation
- Show SKU in cart and order confirmation

### Inventory Tracking Requirements

WHEN inventory is tracked for a variant, THE system SHALL:

- Store inventory count as an integer field per variant
- Track inventory changes from:
  - Order fulfillment (decrease)
  - Returns (increase)
  - Manual adjustments (increase/decrease)
  - Inventory synchronization with seller system (increase/decrease)
- Update inventory immediately when order is placed
- Implement stock reservation:
  - Reserve inventory when cart is created (for 15 minutes)
  - Release reservation if cart not converted to order within 15 minutes
  - Release reservation if checkout fails before payment confirmation
- Show "Low Stock" notification when inventory < 5
- Show "Out of Stock" for inventory = 0
- Prevent purchase of variants with inventory = 0, except for reserved inventory
- Display estimated delivery time based on inventory level

WHEN inventory is low (≤ 5 units), THE system SHALL:

- Display "Only X left!" message on product page
- Display warning in seller dashboard
- Log low inventory event
- Allow seller to manually override "low stock" flag

WHEN inventory is negative, THE system SHALL:

- Flag the variant for inventory discrepancy
- Prevent further sales of variant
- Hide variant from customer views
- Notify admin and seller
- Require manual inventory adjustment to restore positive balance
- Log negative inventory event with user ID and timestamp

### Variant Selection Workflow

WHEN a customer views a product with variants, THE system SHALL:

- Display variant selection interface (color swatches, size buttons, etc.)
- Show current selected variant's price and inventory status
- Update displayed image to match selected variant
- Update cart add button to reflect selected variant
- Disable unavailable variants (e.g., color "red" not available in size "XL")
- Show message: "Out of stock" for unavailable variants

WHEN a customer selects a variant, THE system SHALL:

- Update displayed price
- Update inventory indicator
- Update available options for other attributes
- Highlight selected variant
- Store selected variant ID in session
- Enable "Add to Cart" button

WHEN a customer adds a variant to cart, THE system SHALL:

- Store variant ID and quantity in cart
- Display success message: "Added to Cart: [Variant Name]"
- Update cart counter
- Reserve inventory (see Inventory Tracking Requirements)
- Redirect to cart page if "Buy Now" was clicked

## Shopping Cart and Wishlist

### Cart Creation and Management

WHEN a customer adds a product to cart, THE system SHALL:

- Validate that product has available inventory
- Validate that user is not attempting to add an inactive/missing product
- Create cart item with:
  - Product ID
  - Variant ID
  - Quantity
  - Price (variant-specific)
  - Timestamp
  - Session ID (if guest)
  - User ID (if logged in)
- Update cart counter in navigation
- Show "Added to Cart" notification
- Allow customer to continue shopping

WHEN a guest adds a product to cart, THE system SHALL:

- Use browser localStorage to store cart items
- Generate anonymous session ID if not present
- Convert cart to user account cart during login
- Retain cart items for 30 days

WHEN a logged-in customer adds to cart, THE system SHALL:

- Store cart items in database linked to user ID
- Display cart contents during browser sessions
- Synchronize cart across devices after login

WHEN a customer views cart, THE system SHALL:

- Display cart items with:
  - Product image
  - Product name
  - Variant details (color, size)
  - SKU
  - Price per unit
  - Quantity (editable with + and - buttons)
  - Total price per item
  - Remove item button
- Show subtotal, shipping estimate, tax estimate, and order total
- Show "Continue Shopping" button
- Show "Proceed to Checkout" button
- Show cart summary in modal if viewed from product page

WHEN a customer updates quantity in cart, THE system SHALL:

- Validate new quantity against available inventory
- If quantity exceeds inventory:
  - Cap at available inventory
  - Show warning: "Maximum available: X"
  - Update total price
- If quantity is zero:
  - Remove item from cart
  - Show message: "Item removed from cart."
- Update cart total
- Save cart to database

WHEN a customer removes item from cart, THE system SHALL:

- Remove cart item from database
- Update cart total
- Show "Item removed from cart" message
- If cart becomes empty, show message: "Your cart is empty."
- Update cart counter

### Cart Persistence Behavior

WHEN a user leaves the site with items in cart, THE system SHALL:

- Retain cart items for logged-in users indefinitely in database
- Retain cart items for guest users for 30 days using browser storage
- If guest user returns within 30 days and has cookies enabled:
  - Restore cart from localStorage
- If guest user returns after 30 days:
  - Clear cart
  - Start new cart
- If user logs in after guest session:
  - Merge guest cart with logged-in cart
  - If duplicates exist:
    - Add quantities
    - Use highest price if variant prices differ
  - Clear guest cart

WHEN the system detects multiple carts for a user, THE system SHALL:

- Resolve by merging them into a single cart
- Use cart with most recent updated timestamp
- Log merge event

### Quantity Adjustment Rules

WHEN a customer increases cart quantity, THE system SHALL:

- Validate inventory availability
- Allow increase up to available inventory
- Limit maximum quantity per variant to 100 (configurable by admin)
- If inventory insufficient:
  - Show warning with available quantity
  - Do not allow increase beyond available

WHEN a customer decreases cart quantity, THE system SHALL:

- Allow decrease down to 1
- If quantity reaches 0:
  - Remove item from cart
  - Log removal

WHEN cart item quantity is adjusted on admin order management, THE system SHALL:

- Allow admin to increase or decrease quantity
- If increasing beyond available inventory:
  - Display warning: "Inventory may be insufficient. Confirm override?"
  - Proceed only if confirmed
- If decreasing:
  - Release reserved inventory
- Log adjustment with admin ID and timestamp

### Wishlist Functionality

WHEN a customer views product page, THE system SHALL:

- Show "Add to Wishlist" button
- Show "Remove from Wishlist" button if already in wishlist

WHEN a customer adds product to wishlist, THE system SHALL:

- Add product ID and variant ID (if applicable) to wishlist table
- Link to user ID
- Display confirmation: "Added to Wishlist"
- Update wishlist counter
- Allow user to view wishlist from navigation

WHEN a customer removes product from wishlist, THE system SHALL:

- Remove item from wishlist
- Display confirmation: "Removed from Wishlist"
- Update wishlist counter

WHEN a customer views wishlist, THE system SHALL:

- Display list of products with:
  - Product image
  - Product name
  - Price
  - Variant information
  - Remove button
  - "Add to Cart" button
- Show message: "Your wishlist is empty" if no items
- Allow sorting by "Added Date"
- Allow moving items to cart
- Allow bulk removal

WHEN a customer clicks "Add to Cart" from wishlist, THE system SHALL:

- Add exact item from wishlist to shopping cart
- Remove item from wishlist
- Show "Added to Cart" notification
- Update cart counter

WHEN a product in wishlist is out of stock, THE system SHALL:

- Show "Out of Stock" indicator
- Disable "Add to Cart" button
- Allow customer to "Notify Me When Available"

WHEN a customer selects "Notify Me When Available", THE system SHALL:

- Collect email address (if not logged in, require login)
- Store notification trigger
- Send automated email when inventory is back in stock
- Remove notification after triggering
- Log notification event

### Cart to Order Conversion

WHEN a customer clicks "Proceed to Checkout", THE system SHALL:

- Validate cart:
  - At least one item
  - All items have available inventory
  - All items are active
- Redirect to checkout page
- Preserve cart contents
- Pre-fill shipping address from primary address if available
- Pre-fill payment method if stored previously
- Calculate subtotal, shipping, tax, and total

WHEN a customer completes checkout, THE system SHALL:

- Validate shipping address
- Validate selected payment method
- Create order record
- Reserve inventory for all cart items (hold for 30 minutes)
- Clear cart
- Send confirmation email
- Redirect to order confirmation page
- Log order creation

### Guest Cart Handling

WHEN a guest accesses cart without login, THE system SHALL:

- Display cart contents if previously stored in localStorage
- Allow cart manipulation
- Show message: "Sign in to save your cart for future sessions"
- When attempting to checkout:
  - Require email input for order confirmation
  - Offer option to create account
  - If account created, merge guest cart with account

## Order Placement and Payment Processing

### Order Initiation Process

WHEN a customer clicks "Proceed to Checkout", THE system SHALL:

- Validate cart has items
- Validate all cart items have sufficient inventory
- Validate user has at least one active shipping address
- Redirect to checkout page
- Calculate and display:
  - Subtotal
  - Shipping cost (based on address and weight)
  - Tax estimate (based on location)
  - Order total
- Show order summary as accordion
- Show progress indicators: Shipping → Payment → Review

### Shipping Address Selection

WHEN a customer is on Checkout page, THE system SHALL:

- Show shipping address section with:
  - List of saved addresses
  - "Add New Address" button
  - Primary address highlighted
  - "Use different billing address" checkbox
- Allow selection of any saved address
- Allow editing to create new address
- Validate address fields before proceeding
- Show estimated shipping cost per address
- Default to primary address
- Allow saving new address as new option

WHEN customer selects different billing address, THE system SHALL:

- Show billing address fields
- Allow same as shipping or different
- Validate billing address if different
- Allow saving billing address to profile

### Payment Method Handling

WHEN customer reaches Payment step, THE system SHALL:

- Show payment methods:
  - Credit card (Visa, MasterCard, Amex, Discover)
  - PayPal
  - Apple Pay (if supported on device)
  - Google Pay (if supported on device)
- Show saved payment methods for logged-in customers
- Allow selection of new payment method
- For card payments:
  - Display secure iframe from payment processor
  - Collect card number, expiry, CVV
  - Validate card number with Luhn algorithm
- For PayPal:
  - Redirect to PayPal login page
  - Return to platform after successful authorization
- For Apple/Google Pay:
  - Use native browser API with tokenized payment
- Store payment method ID for future use (if user opts in)
- Show payment method summary
- Calculate total with payment processing fees

### Order Validation Rules

WHEN order is submitted, THE system SHALL:

- Validate:
  - Shipping address is complete and valid
  - Payment method is valid and authorized
  - All cart items have available inventory
  - Product prices match current database values
  - Cart items are still active
  - Order total is ≥ $0.01
  - No duplicate order within 5 minutes from same user/IP
  - If user has exceeded order limit (e.g., 5 orders per hour)
- Verify cart items have not been modified
- Confirm user has consented to terms of service and privacy policy

WHEN order validation fails, THE system SHALL:

- Return appropriate error messages
- Highlight the failed validation field
- Allow user to correct and resubmit
- Log validation error with IP, user ID, and timestamp
- Do not create order record
- Do not reserve inventory

### Order Creation Flow

WHEN order validation passes, THE system SHALL:

- Create order record with:
  - Order number (unique, sequential)
  - User ID
  - Shipping address
  - Billing address
  - Payment method ID
  - Payment status: "pending" or "authorized" depending on processor
  - Order total
  - Subtotal
  - Shipping cost
  - Tax
  - Discount (if applicable)
  - Coupon code (if applicable)
  - Status: "pending"
  - Created timestamp
  - Customer note (if provided)
- Create order items for each cart item:
  - Product ID
  - Variant ID
  - Quantity
  - Price per unit
  - Total price
  - SKU
- Reserve inventory:
  - Reduce variant inventory count by ordered quantity
  - Set reservation flag
  - Set expiration time: 30 minutes after creation
- Clear cart
- Send order confirmation email to customer
- Send notification to seller
- Log order with transaction ID
- Redirect to payment processing page

### Confirmation and Notification

WHEN order confirmation is processed, THE system SHALL:

- Display order confirmation page with:
  - Order number
  - Summary of items
  - Shipping and payment info
  - Estimated delivery date
  - Download receipt button
  - "Continue Shopping" button
- Send email to customer with:
  - Order summary
  - Tracking information (if available)
  - Customer service contact
  - Return policy
- Send email to seller with:
  - Order details
  - Customer contact information
  - Shipping instructions
- Log all notifications sent
- If payment was authorized (e.g., card):
  - Immediately process payment
  - Update order status to "paid"
  - Send payment confirmation to customer
  - Send payment confirmation to seller
  - Log payment
- If payment requires manual capture (e.g., PayPal):
  - Update order status to "awaiting_payment"
  - Send email: "Payment processing complete. Your order is being prepared."
  - Send payment request to seller for fulfillment

### Error Recovery Processes

WHEN payment processing fails, THE system SHALL:

- Return to payment page
- Show clear error message (e.g., "Insufficient funds", "Card declined", "Network error")
- Preserve order and cart state when available
- Provide option to:
  - Try different payment method
  - Try again with same method
  - Cancel order
- If payment failure is temporary:
  - Allow retries for up to 5 attempts
  - Increase delay between attempts
- If payment fails after 5 attempts:
  - Cancel order
  - Release inventory reservation
  - Delete order record
  - Send email: "Your order could not be completed. Please try again later."
  - Log payment failure with reason

WHEN inventory becomes insufficient during checkout, THE system SHALL:

- Check inventory for each item before final submission
- If any item has insufficient inventory:
  - Show warning: "{Product name} is out of stock. Removing from order."
  - Remove item from cart
  - Recalculate total
  - Allow customer to proceed or cancel
- If customer wishes to proceed:
  - Confirm removal of item
  - Submit order with remaining items
- If customer cancels:
  - Clear cart
  - Redirect to product page
- Log inventory change with reason

WHEN network error occurs during checkout, THE system SHALL:

- Show message: "Network error. Please check your connection and try again."
- Preserve all entered information
- Allow user to retry
- Do not create partial order
- Log network failure

WHEN server error occurs during order placement, THE system SHALL:

- Show message: "We're sorry, a temporary error occurred. Please try again."
- Preserve cart and form state
- Log system error with stack trace
- Attempt to retry order creation in background
- If retry fails:
  - Notify admin
  - Allow customer to submit support ticket

## Order Tracking and Shipping Status Updates

### Order Status Lifecycle

The order status lifecycle defines the progression of an order from creation to completion, with intermediate states for various processes and conditions.

The official order statuses are:

1. **Pending**: Order has been created but not yet paid
2. **Paid**: Payment has been successfully processed and confirmed
3. **Processing**: Seller has received order and is preparing items for shipment
4. **Shipped**: Items have been dispatched with tracking information
5. **Out for Delivery**: Package has been received by delivery carrier and is en route
6. **Delivered**: Package has been successfully delivered to customer
7. **Cancelled**: Order has been cancelled by customer or admin
8. **Refunded**: Payment has been refunded to customer

The status transitions must occur in sequence and cannot be skipped.

### Status Transition Rules

WHEN order status changes, THE system SHALL:

- Validate that transition is allowed
- Record timestamp and admin/seller ID responsible
- Send notification to customer and seller
- Update order record in database
- Update search index

#### Pending → Paid

WHEN customer completes payment successfully, THE system SHALL:

- Transition status from "pending" to "paid"
- Record payment confirmation ID
- Send email: "Your payment has been confirmed. Your order is now being prepared."
- Notify seller of paid order
- Log status transition with payment method and transaction ID

#### Paid → Processing

WHEN seller marks order as prepared for shipment, THE system SHALL:

- Transition status from "paid" to "processing"
- Require seller to update estimated shipping date
- Send email to customer: "Your order is being prepared for shipment."
- Send email to seller confirming they have actioned the order
- Log status transition with seller ID and timestamp

#### Processing → Shipped

WHEN seller provides tracking information, THE system SHALL:

- Transition status from "processing" to "shipped"
- Require entry of:
  - Carrier name (FedEx, UPS, USPS, etc.)
  - Tracking number
- Generate tracking link: https://tracking.[carrier].com/[tracking_number]
- Send notification to customer: "Your order has been shipped! View tracking: [link]"
- Send notification to seller confirmed shipping
- Update estimated delivery date based on carrier service level
- Log status transition with carrier and tracking number

#### Shipped → Out for Delivery

WHEN carrier scans package at distribution center, THE system SHALL:

- Automatically transition status via carrier API webhook
- Send notification to customer: "Your package is out for delivery today."
- Update estimated delivery time
- Log automated status transition with carrier event ID

#### Out for Delivery → Delivered

WHEN carrier marks delivery as complete, THE system SHALL:

- Automatically transition status via carrier API webhook
- Send notification to customer: "Your order has been delivered!"
- Start 30-day return period timer
- Enable customer to leave review
- Send notification to seller: "Order #123 has been delivered successfully."
- Log automated status transition with timestamp and carrier event ID

#### Paid → Cancelled

WHEN customer cancels order before processing, THE system SHALL:

- Transition status from "paid" to "cancelled"
- Initiate refund through payment processor
- Update refund status to "in_progress"
- Send notification: "Your order has been cancelled. Refund will be processed within 3-5 business days."
- Release reserved inventory
- Log cancellation reason (customer-requested, inventory shortage, fraud)

WHEN admin cancels order, THE system SHALL:

- Transition status to "cancelled"
- Require admin reason from dropdown:
  - Fraudulent activity
  - Payment error
  - Inventory shortage
  - Seller violation
  - Customer request
- Initiate refund
- Send notification explaining cancellation
- Release inventory
- Audit log entry with admin ID

#### Processing → Cancelled

WHEN cancellation occurs after processing begins but before shipment, THE system SHALL:

- Transition status to "cancelled"
- Request seller to cancel shipment if possible
- Initiate refund (but seller may be charged restocking fee)
- Send notification: "Your order has been cancelled. Refund will be processed within 3-5 business days."
- Release reserved inventory
- Charge seller restocking fee (if applicable)
- Log cancellation with reason

#### Shipped → Cancelled

WHEN cancellation occurs after shipment, THE system SHALL:

- Transition status to "cancelled"
- Send email to customer: "Your order has been cancelled. You will need to return the items."
- Send email to seller: "Customer requested cancellation after shipment. Prepare return label."
- Create return request automatically
- Do NOT initiate refund immediately
- Allow refund only upon return and receipt confirmation
- Log cancellation with reason

#### Delivered → Refunded

WHEN customer returns and returns are approved, THE system SHALL:

- Transition status from "delivered" to "refunded"
- Require:
  - Return tracking number (if applicable)
  - Reason for return
  - Refund amount (full or partial)
- Initiate refund
- Update inventory (return items)
- Send notification: "Your refund of $X has been processed."
- Log refund with admin ID and reason

### Shipping Provider Integration

WHEN shipping information is entered, THE system SHALL:

- Validate carrier name against allowed list (FedEx, UPS, USPS, DHL, etc.)
- Validate tracking number format per carrier
- Generate clickable link to carrier tracking page
- Validate tracking number via carrier APIs (if possible)
- Store original tracking number regardless of validation

WHEN carrier API webhook is received, THE system SHALL:

- Parse tracking event (out_for_delivery, delivered, etc.)
- Map event to corresponding order status
- Update order status automatically
- Send notification to customer
- Log event
- Validate order status transition is allowed
- Ignore duplicate events
- Retry failed webhook up to 3 times with exponential backoff

WHEN carrier API fails for 5 consecutive attempts, THE system SHALL:

- Flag order as "tracking_error"
- Send notification to admin
- Allow manual status update

### Delivery Estimation Logic

WHEN an order is placed, THE system SHALL:

- Calculate estimated delivery date based on:
  - Seller shipping location
  - Customer delivery location
  - Selected shipping method
  - Seller's processing time (default 1-2 processing days)
  - Carrier service level (standard: 3-7 days, express: 1-3 days)
- Display estimation on order confirmation page
- Show "Estimated Delivery: [Date]"
- Update estimation if shipping method changes

WHEN shipping status changes to "shipped", THE system SHALL:

- Recalculate estimated delivery date using carrier data
- Override previous estimate
- Show new estimate on order page
- Send email notification if estimate changes by more than 2 days

### Customer Notifications

WHEN an order status changes, THE system SHALL:

- Send push notification (if enabled)
- Send email notification
- Send SMS notification (if customer opted in)
- Include:
  - Order number
  - Status change description
  - Next steps or actions required
  - Links to order page and tracking

WHEN a tracking number is available, THE system SHALL:

- Send email with subject: "Your order #123 has been shipped!"
- Include tracking link as button
- Show carrier logo
- Include customer service contact

WHEN a delivery is confirmed, THE system SHALL:

- Send email: "Your order has been delivered! We hope you're satisfied."
- Enable "Leave a Review" button
- Include links to popular related products

WHEN a cancellation is processed, THE system SHALL:

- Send email: "Your order has been cancelled. Refund will be processed within [X] days."
- Include refund status
- Provide contact for questions

### Tracking Link Generation

WHEN a tracking number is entered, THE system SHALL:

- Auto-generate tracking link using predefined carrier URL patterns:
  - FedEx: https://www.fedex.com/fedextrack/?trknbr={tracking_number}
  - UPS: https://www.ups.com/track?tracknum={tracking_number}
  - USPS: https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={tracking_number}
  - DHL: https://www.dhl.com/en/track-tracked-packages.html?AWB={tracking_number}
- Validate URL pattern matches tracking number format
- Render link as HTML anchor tag with target _blank
- Display "Track Your Package" button on order page
- Log generated link

## Product Reviews and Ratings

### Review Submission Requirements

WHEN a customer submits a review, THE system SHALL:

- Allow submission only for products with "delivered" order status
- Require rating (1-5 stars)
- Require review text (min 5 characters)
- Allow optional product photo upload (JPG/PNG, max 5MB)
- Validate customer has purchased the product
- Prevent duplicate reviews from same customer for same product
- Require user to be logged in
- Display review submission form after order delivery
- Provide "Write a Review" button on product page

WHEN a customer submits a review, THE system SHALL:

- Store:
  - Review text
  - Rating
  - Timestamp
  - Product ID
  - User ID
  - Order ID (for verification)
  - Photo URL (if uploaded)
  - Approval status (pending/admin approved)
- Validate that product is approved (not inactive)
- Set default approval status to "pending" (to allow moderation)
- Send notification to admin
- Display confirmation: "Thank you for your review. It will appear after review by our team."
- Log submission

### Rating System Design

WHEN a product rating is calculated, THE system SHALL:

- Calculate average rating based on: (sum of all ratings) / (count of ratings)
- Round to nearest 0.5 stars
- Display as: ★★★★☆ (4.0 stars)
- Show total number of reviews (e.g., "234 reviews")
- Only include approved reviews in calculation
- Ignore reviews marked as "fraudulent" or "spam"
- Store rating as separate field for performance
> **Note**: The rating is updated continuously as new reviews are approved.

WHEN a customer views product page, THE system SHALL:

- Display overall rating prominently
- Show distribution of ratings (1 to 5 stars) as percentages or bar charts
- Show list of reviews sorted by newest first
- Allow sorting by: Newest, Highest Rating, Most Helpful
- Display "Most Helpful" votes per review

### Review Moderation Process

WHEN an admin views reviews, THE system SHALL:

- Display all reviews under administration
- Filter by status: Pending, Approved, Rejected, Flagged
- Show review text, rating, user, product, date, and flag reason if any
- Allow admin to:
  - Approve review
  - Reject review
  - Flag review for fraud
  - Delete review (permanently)
  - Hide review from public view
- Show reason field for rejection/flagging

WHEN an admin approves a review, THE system SHALL:

- Change status to "approved"
- Update product rating
- Send email notification to reviewer: "Your review has been published!"
- Log approval with admin ID and timestamp
- Display review to customers

WHEN an admin rejects a review, THE system SHALL:

- Change status to "rejected"
- Send email notification: "Unfortunately, your review could not be published. Review our review guidelines."
- Log rejection with admin ID and reason
- Do not include in product rating calculation

WHEN an admin flags a review for fraud, THE system SHALL:

- Change status to "flagged"
- Hide review from public view
- Notify security team
- Log flag with admin ID and reason
- Allow review to be reviewed by fraud team

WHEN a review is flagged for fraud, THE system SHALL:

- Block reviewer from submitting further reviews for 7 days
- Trigger additional review of other reviews by same user
- Send email notification of restriction
- Allow admin to review and unflag after investigation

### Review Verification Rules

WHEN a review is submitted, THE system SHALL:

- Automatically verify:
  - User has purchased the product (by matching Order ID)
  - Order status is "delivered"
  - Not previously submitted review for this product
  - Review text is not empty
- Allow override for admin
- Allow seller to verify review
- Use third-party tools (like ReviewMeta) to check for suspicious patterns

WHEN a review is submitted from new account, THE system SHALL:

- Increase review moderation level
- Require admin approval
- Tag as "New User Review"

WHEN a review is submitted from account with purchase history, THE system SHALL:

- Allow self-approval if review content is appropriate
- Skip admin approval if:
  - Review length > 50 characters
  - Contains specific keywords
  - No signs of spam
  - User has made 3+ purchases

### Review Display Logic

WHEN a product page loads, THE system SHALL:

- Show review count and overall rating at top of section
- Render reviews in reverse chronological order (newest first)
- Show "Load More" button if more than 10 reviews
- Show "Sort by" dropdown with: Newest, Highest Rating, Most Helpful
- For each review:
  - Show star rating
  - Show review text
  - Show user name (first name, last initial) or "Anonymous" if privacy enabled
  - Show date
  - Show "Helpful" upvote button (count)
  - Show "Helpful" downvote button
  - Show product photo if uploaded
  - Show "Reply to Review" button (for seller only)
- Show "Write a Review" button if user purchased product and hasn't reviewed

WHEN a customer uses "Helpful" button, THE system SHALL:

- Increment helpful count
- Store voter ID (user ID)
- Prevent multiple votes
- Display total helpful votes

WHEN seller replies to review, THE system SHALL:

- Add reply comment with:
  - Seller name and badge
  - Timestamp
  - Reply text
- Show reply below original review
- Include "Seller Response" label
- Log reply with seller ID and timestamp

### Reviewer Identity Protection

WHEN a customer submits a review, THE system SHALL:

- Allow option to remain anonymous
- If anonymous selected:
  - Display as "Anonymous Customer"
  - Do not display profile image
  - Do not display account creation date
  - Do not link to user profile
- Otherwise, show:
  - First name and last initial
  - Profile image if available
  - Account creation date
  - Number of purchases made on platform

WHEN reviewer has many reviews, THE system SHALL:

- Display badge: "Top Reviewer"
- Show number of reviews and helpful votes
- Allow filtering by top reviewers

WHEN reviewer account is suspended, THE system SHALL:

- Keep their reviews visible
- Hide reviewer identity
- Mark review as "Review from suspended user"
- Do not update product rating

## Seller Management

### Seller Registration Process

WHEN a customer chooses "Become a Seller" during registration, THE system SHALL:

- Display business registration form:
  - Business name (required)
  - Business descriptor (category selection)
  - Business address (required)
  - Business phone (required)
  - Tax ID or government registration number (required)
  - Bank account details for payout (required)
  - Business license (upload PDF or image)
- Validate:
  - Business name is unique
  - Tax ID is valid for country
  - Bank account details are valid and follow country-specific format
  - License document is readable
- Submit registration request
- Store request with status "pending"
- Send confirmation email: "We're reviewing your seller application. You will be notified within 24 hours."
- Notify admin dashboard of new seller application

WHEN an admin reviews seller application, THE system SHALL:

- View complete application details
- Verify:
  - Business name matches government records
  - Tax ID validates
  - License document is authentic
  - Bank account is active
  - Business category is legitimate
- If approved:
  - Update seller status to "active"
  - Send email: "Congratulations! Your seller account has been approved."
  - Send welcome email with onboarding guide
  - Create seller dashboard with empty catalog
  - Log approval with admin ID and timestamp
- If rejected:
  - Update seller status to "rejected"
  - Send email with reason: "Your application could not be approved due to: [reason]"
  - Allow resubmission
  - Log rejection with admin ID and reason

### Product Catalog Management

WHEN a seller accesses "My Products", THE system SHALL:

- Display product listing with:
  - Product name
  - Category
  - SKU count
  - Inventory level
  - Price range
  - Status (draft/pending/approved)
  - Sales count
  - Rating
- Allow filtering by status
- Allow search by product name
- Allow sorting by name, date added, sales, rating
- Show "Create New Product" button
- Show product card for each product

WHEN a seller uploads product images, THE system SHALL:

- Accept 1-10 images (JPG, PNG, max 3MB each)
- Auto-crop and resize to standard dimensions
- Generate thumbnails
- Show preview
- Validate format and size
- Store in secure cloud storage
- Link to product record
- Log upload with timestamp

WHEN a seller edits product details, THE system SHALL:

- Allow editing of:
  - Product name
  - Description
  - Category
  - Images
  - Price
  - Variants
  - Shipping options
- Save as draft
- If product was approved:
  - Change status to "pending"
  - Send notification to admin for re-approval
- Otherwise:
  - Save as draft
- Log edit with timestamp

### Inventory Update Procedures

WHEN a seller updates inventory, THE system SHALL:

- Allow editing of inventory count per variant
- Validate input is non-negative integer
- Apply change immediately to variant inventory
- Show warning if inventory falls below 5
- Log inventory change with:
  - Previous count
  - New count
  - Reason (manual adjustment, returned item, etc.)
  - Seller ID
  - Timestamp
- If inventory drops to 0:
  - Mark variant as "Out of Stock"
  - Hide from customer "add to cart" option
  - Show "Only X left!" when >1 and <5
- Allow seller to set low inventory notification threshold

WHEN inventory is adjusted by admin, THE system SHALL:

- Override seller's inventory count
- Display warning: "Admin has adjusted inventory. Seller view will update."
- Log adjustment with admin ID and reason
- Send notification to seller

WHEN inventory sync is enabled by seller, THE system SHALL:

- Provide integration settings:
  - API endpoint
  - API key
  - Polling frequency (every 1 hour, 2 hours, 4 hours)
- Make API call to seller's inventory system
- Compare received inventory with platform inventory
- If difference >10%:
  - Flag discrepancy
  - Send alert to admin
  - Suggest suspension of sync
- If difference ≤10%:
  - Update platform inventory to match
  - Log sync

### Order Fulfillment Workflow

WHEN a seller receives order notification, THE system SHALL:

- Display order in "Pending Orders" section
- Show:
  - Order number
  - Customer name and shipping address
  - Ordered items with variants
  - Payment method
  - Order total
  - Order status
- Allow download of packing slip
- Allow marking order as "Preparing"

WHEN a seller marks order as "Preparing", THE system SHALL:

- Update order status to "processing"
- Record processing start time
- Send notification to customer
- Update dashboard with status
- Allow editing of estimated ship date

WHEN a seller ships order, THE system SHALL:

- Display shipping form:
  - Carrier selection (FedEx, UPS, USPS, etc.)
  - Tracking number (required)
  - Package weight
  - Dimensions
- Validate tracking number matches carrier
- Send order to logistics provider API (if integrated)
- Generate shipping label (automatically if integrated)
- Update order status to "shipped"
- Record tracking number
- Send notification to customer with tracking link
- Log shipping with timestamp

WHEN seller marks order as fulfilled, THE system SHALL:

- Update order status to "shipped" if not already done
- Send notification to customer
- Update seller dashboard
- Log fulfillment

### Sales Analytics Dashboard

WHEN a seller views analytics, THE system SHALL:

- Display dashboard with:
  - Total sales (today, 7 days, 30 days)
  - Total units sold
  - Average order value
  - Net profit (sales minus fees)
  - Traffic sources
  - Top selling products
  - Customer locations
  - Review ratings
- Show charts (bar, line, pie)
- Allow date range selection
- Export data as CSV
- Display conversion rate (visitors to buyers)

WHEN a seller exports sales data, THE system SHALL:

- Generate CSV with columns:
  - Date
  - Order Number
  - Product Name
  - Variant Details
  - Quantity
  - Unit Price
  - Total
  - Shipping Cost
  - Tax
  - Payment Method
  - Customer
  - Shipping Address
- Include metadata with timestamp and seller name
- Deliver via secure download link (24-hour expiry)

### Seller Communication Channels

WHEN a customer leaves a review, THE system SHALL:

- Send email notification to seller
- Include: Review text, rating, product name, customer name
- Allow seller to reply to review
- Allow seller to flag review for moderation

WHEN a customer contacts a seller, THE system SHALL:

- Provide secure messaging system:
  - Message form on product page
  - Message inbox in seller dashboard
  - Notification system
- All messages stored in database
- Seller replies appear to customer as:
  - "[Seller Name] (seller)"
  - Original message
  - Response
- Allow attachment of files (image, PDF)
- Allow blocking abusive customers

WHEN a seller sends message to customer, THE system SHALL:

- Use platform email system (noreply@...) to avoid direct contact
- Include order reference
- Log message
- Allow template usage

## Inventory Management

### Inventory Overview

WHEN an admin views inventory dashboard, THE system SHALL:

- Display inventory summary:
  - Total SKUs across platform
  - Total units in stock
  - Total value of inventory (at cost)
  - Total value of inventory (at retail)
  - Percentage of SKUs with low inventory (<10 units)
  - Percentage of SKUs with zero inventory
  - Average inventory turnover rate
  - Number of SKUs with inventory mismatches
- Show inventory heatmap by category:
  - High inventory (green)
  - Medium inventory (yellow)
  - Low inventory (orange)
  - Zero inventory (red)
- Show trending chart of inventory changes (monthly)
- Display list of SKUs with inventory issues:
  - Low availability (1-10 units)
  - Negative stock
  - Mismatched counts between system and seller
- Allow sorting by SKU ID, product name, seller, category, stock level
- Allow filtering by seller name
- Allow filtering by category
- Allow filtering by stock level (under 5, under 10, under 50)

WHEN an admin clicks on an SKU record, THE system SHALL:

- Display complete product variant info:
  - Product title
  - Variant attributes (size, color, etc.)
  - SKU code
  - Current stock level (system)
  - Reported stock level (seller)
  - Difference between system and seller
  - Last inventory update timestamp (seller)
  - Last inventory sync timestamp (system)
  - Product cost price
  - Retail price
  - Total units sold
  - Return rate
- Show "Update inventory" button
- Show "Synchronize inventory" button
- Show "View inventory history" link
- Show "Export SKU data" button

WHEN an admin clicks "Update inventory", THE system SHALL:

- Open inventory adjustment modal
- Allow admin to enter:
  - New inventory count
  - Reason for adjustment (stock count error, returned items, damaged goods, etc.)
- Validate that reason is selected from predefined list
- Adjust inventory count in platform system
- Log adjustment with admin ID, timestamp, SKU ID, old count, new count, and reason
- If adjustment exceeds 50% of current stock:
  - Require secondary admin authorization
  - Send alert to seller
- Send notification to seller of inventory adjustment

WHEN an admin clicks "Synchronize inventory", THE system SHALL:

- Initiate inventory synchronization process
- Query seller's inventory system via API (if connected)
- Compare seller-reported inventory with platform inventory
- If difference exceeds 10%:
  - Flag the SKU for review
  - Log discrepancy with delta amount and seller ID
  - Send alert to admin dashboard
  - Suggest suspension of seller inventory sync until resolution
- If difference is less than 10%:
  - Update platform inventory to match seller count
  - Log synchronization with admin ID, timestamp, SKU ID, old count, new count
- If seller system unavailable:
  - Log sync failure
  - Schedule retry in 1 hour
  - Notify seller of sync failure

WHEN an admin clicks "View inventory history", THE system SHALL:

- Display chronological history of inventory changes for this SKU:
  - Date and timestamp of change
  - Previous inventory level
  - New inventory level
  - Change amount
  - Responsible party (system, admin, seller)
  - Reason for change
  - Source of change (manual update, sync, return, sale)
- Allow export of inventory history as CSV
- Allow filtering by date range

WHEN an admin clicks "Export SKU data", THE system SHALL:

- Generate ZIP file containing:
  - sku_details.json (SKU information)
  - inventory_history.csv (all inventory changes)
  - sales_data.csv (sales by time period)
  - return_data.csv (returns by time period)
  - seller_inventory_sync_logs.csv (synchronization attempts)
- Include metadata with export timestamp, admin ID, and export ID
- Encrypt file with AES-256 and deliver via secure download link (valid 24 hours)
- Log export request with admin ID, timestamp, and SKU ID

### Inventory Health System

IF inventory system detects negative stock for any SKU, THEN THE system SHALL:

- Immediately flag the product as "Inventory Error" in admin dashboard
- Lock the SKU from further sales
- Send notification to admin dashboard
- Send notification to seller of the affected SKU
- Create ticket for investigation

WHEN inventory sync fails for a seller account three times in 24 hours, THEN THE system SHALL:

- Automatically disable inventory sync for that seller
- Send notification to seller explaining the suspension
- Notify admin in inventory management section
- Require seller to contact support to re-enable sync

WHILE a SKU has negative inventory, THE system SHALL:

- Prevent any further sales of that variant
- Hide the variant from customer-facing product pages
- Continue to display existing reviews and ratings
- Allow admin to update inventory manually

## Admin Dashboard

### User Management Features

#### Admin User Account Control

WHEN an admin views the user list, THE system SHALL:

- Display paginated list of all registered customers with 50 items per page
- Show user ID, display name, email address, registration date, account status (active/inactive), and last login date
- Allow sorting by any column (registration date, last login, name)
- Allow filtering by account status (active, inactive)
- Allow filtering by registration date range
- Show user avatar if available
- Display badge for users flagged for suspicious activity

WHEN an admin clicks on a user record, THE system SHALL:

- Display complete user profile including:
  - Personal information (name, email, profile picture)
  - Address history (all addresses ever saved)
  - Order history (all orders placed)
  - Review history (all reviews posted)
  - Wishlist items
  - Account creation date
  - Last login timestamp
  - IP addresses used for login (last 5)
  - Device fingerprints (last 5)
- Show account status toggle (active/inactive)
- Show "Block user" button
- Show "Reset password" button
- Show "Export user data" button
- Show "Delete account" button

WHEN an admin toggles a user account status from active to inactive, THE system SHALL:

- Immediately revoke all active admin and user sessions for that account
- Delete all active cart items and wishlist items
- Prevent any new order placements from this account
- Hide all reviews and comments from public view (but retain in database)
- Send notification email to user explaining account suspension
- Log the status change with admin ID, timestamp, and reason (if provided)
- Update user status in database
- Display confirmation message to admin

WHEN an admin clicks "Block user", THE system SHALL:

- Perform all actions from account deactivation
- Add user to global block list
- Block IP addresses associated with the account from registration
- If the user is associated with any seller accounts, automatically suspend those seller accounts
- Send notification email to user explaining block
- Log the block action with admin ID, timestamp, and reason

WHEN an admin clicks "Reset password", THE system SHALL:

- Require admin to confirm the action with secondary verification
- Generate temporary one-time-use password with expiration 12 hours
- Store hashed temporary password in user record
- Send notification email to user with temporary password and instructions to change it upon next login
- Log password reset request with admin ID, timestamp, and reason
- Clear any pending 2FA authentication attempts for the user

WHEN an admin clicks "Delete account", THE system SHALL:

- Require admin to confirm the action with secondary verification and enter "DELETE" as text confirmation
- Perform all actions from account deactivation
- Anonymize all personally identifiable information:
  - Change email to "user_12345@removed.com"
  - Change display name to "Deleted User"
  - Clear all personal information
- Retain all associated orders, reviews, and products in the system
- Remove the user from all wishlists and carts
- Log delete action with admin ID, timestamp, and reason
- Display confirmation message with data retention notice

WHEN an admin clicks "Export user data", THE system SHALL:

- Generate compressed ZIP file containing:
  - user_profile.json (all personal data)
  - orders.csv (all order history with timestamps and amounts)
  - reviews.csv (all product reviews and ratings)
  - addresses.csv (all addresses saved by user)
  - wishlist.json (all items in wishlist)
- Include metadata with export timestamp, admin ID, and export ID
- Encrypt file with AES-256 and deliver via secure download link (valid 24 hours)
- Log export request with admin ID, timestamp, and user ID

### User Deletion Policy

IF a user account has been inactive for 2 years, THEN THE system SHALL:

- Send automated notification to user email explaining account closure
- Wait 30 days for user response
- If no response received:
  - Perform anonymization and deletion as described above
  - Log automated deletion with administrator system ID and timestamp

WHILE a user account is suspended, THE system SHALL:

- Retain all order history and review records
- Hide all content from public view
- Block all login attempts
- Allow admin to restore account with full data retention

### Product Oversight Tools

#### Product Listing Management

WHEN an admin views the product catalog, THE system SHALL:

- Display paginated list of all products with 50 items per page
- Show product ID, title, category, seller name, status (active/pending/inactive), and total inventory count
- Allow sorting by product ID, title, seller name, category, status, and creation date
- Allow filtering by product status (active, pending, inactive)
- Allow filtering by seller name
- Allow filtering by category
- Allow filtering by creation date range
- Show product image thumbnail
- Display badge for products with reviews under 3 stars
- Display badge for products with low inventory (<10 units)
- Display badge for products with high returns rate (>15%)

WHEN an admin clicks on a product record, THE system SHALL:

- Display complete product profile including:
  - Product title, description, and images
  - Seller information (name, contact, business verification status)
  - Product category and subcategory
  - All variants with their SKUs, pricing, inventory levels, and attributes
  - Average rating and total number of reviews
  - Total units sold
  - Return rate percentage
  - Creation date and last updated date
  - Status (active, pending, inactive)
  - Flags (low inventory, high returns, suspicious listing)
- Show status toggle (active/pending/inactive)
- Show "Suspend product" button
- Show "Approve product" button (for pending products)
- Show "Edit product" button
- Show "View all reviews for this product" link
- Show "Export product data" button
- Show "Delete product" button

WHEN an admin toggles a product status from pending to active, THE system SHALL:

- Remove "pending" badge from product
- Make product visible to all customers
- Allow customers to purchase the product
- Send notification email to seller confirming product activation
- Log the status change with admin ID, timestamp, and reason (if provided)
- Update product status in database
- Update search index to include the product
- Update category page to include the product

WHEN an admin toggles a product status from active to inactive, THE system SHALL:

- Remove product from search results and category pages
- Prevent new purchases of the product
- Keep existing orders and reviews intact
- Send notification email to seller explaining product deactivation
- Log the status change with admin ID, timestamp, and reason (if provided)
- Update product status in database
- Update search index to remove the product
- Notify customers who have the product in their cart or wishlist

IF a product has more than 10 returns in the past 30 days, THEN THE system SHALL:

- Automatically flag the product for review
- Send notification to admin dashboard with product ID, seller, return rate, and summary of return reasons
- Suggest temporary deactivation until seller responds

WHEN an admin clicks "Suspend product", THE system SHALL:

- Perform all actions from deactivating product
- Add product to global suspension list
- Notify seller that this action has been performed
- Block seller from creating new products in the same category for 7 days
- Log suspension action with admin ID, timestamp, and reason

WHEN an admin clicks "Approve product", THE system SHALL:

- If product status is pending:
  - Change status to active
  - Make product visible to customers
  - Send notification to seller
  - Log approval with admin ID and timestamp
- If product status is not pending:
  - Return error: "Product is not in pending status"

WHEN an admin clicks "Edit product", THE system SHALL:

- Open product editing modal with all fields editable
- Allow admin to edit:
  - Product title
  - Product description
  - Product images
  - Category assignment
  - Base price
  - Attributes and variants
  - Inventory thresholds
  - SEO metadata
  - Return policy
- Save changes when admin clicks "Update"
- Log all changes with admin ID, timestamp, and list of changed fields
- If product is already active, update search index
- If category changed, update category pages
- Send notification to seller of product modifications

WHEN an admin clicks "Delete product", THE system SHALL:

- Require admin to confirm the action with secondary verification and enter "DELETE" as text confirmation
- Perform all actions from product suspension
- Remove product from search index
- Remove product from all category pages
- Archive all product data (preserve for compliance)
- Delete product but retain:
  - All associated orders and order items
  - All associated reviews and ratings
  - All associated seller information
- Log deletion with admin ID, timestamp, and reason
- Display confirmation message with data retention notice

WHEN an admin clicks "Export product data", THE system SHALL:

- Generate compressed ZIP file containing:
  - product_details.json (all product data)
  - variants.csv (all SKUs with pricing and inventory)
  - reviews.csv (all reviews and ratings)
  - order_items.csv (all orders containing this product)
  - seller_info.json (seller information for this product)
- Include metadata with export timestamp, admin ID, and export ID
- Encrypt file with AES-256 and deliver via secure download link (valid 24 hours)
- Log export request with admin ID, timestamp, and product ID

### Product Monitoring System

WHILE an admin has dashboard open, THE system SHALL:

- Automatically refresh product health metrics every 30 minutes
- Calculate and display:
  - Percentage of products with low inventory (<10)
  - Percentage of products with high return rate (>15%)
  - Percentage of newly listed products without reviews
  - Percentage of products flagged for suspicious activity
  - Number of products in pending review
- Show dashboard charts:
  - Product approval rate trend (weekly)
  - Product suspension rate trend (weekly)
  - Return rate by category
  - Inventory depletion trend
- Send alert email to admin if:
  - More than 10% of products are pending review
  - More than 5% of products have high return rate
  - Suspicious activity detected on more than 3 seller accounts

### Order Supervision Capabilities

#### Order Processing Controls

WHEN an admin views the order list, THE system SHALL:

- Display paginated list of all orders with 50 items per page
- Show order ID, customer name, seller name, total amount, status, payment method, and created date
- Allow sorting by order ID, total amount, created date, customer, seller, or status
- Allow filtering by order status (pending, paid, processing, shipped, delivered, cancelled, refunded)
- Allow filtering by payment method (credit card, PayPal, etc.)
- Allow filtering by seller name
- Allow filtering by customer name
- Allow filtering by date range
- Show order summary (number of items, total amount)
- Display badge for orders with high return potential (>$1000)
- Display badge for orders from suspended/cancelled user accounts
- Display badge for orders from sellers with high dispute rate

WHEN an admin clicks on an order record, THE system SHALL:

- Display complete order profile including:
  - Customer information (name, email, shipping address)
  - Seller information (name, contact info)
  - Order items with product names, variants, quantities, unit prices, and total prices
  - Order total amount, taxes, and shipping fees
  - Payment information (method, transaction ID, last 4 digits)
  - Order status history with timestamps and who changed it
  - Shipping information (carrier, tracking number, delivery estimate)
  - Customer messages
  - Return/refund requests
  - Review status
- Show status change dropdown (all possible statuses)
- Show "Cancel order" button
- Show "Process refund" button
- Show "Manually ship order" button
- Show "Contact customer" button
- Show "Export order data" button
- Show "Close order" button

WHEN an admin changes order status from pending to paid, THE system SHALL:

- Verify the order has valid payment record matching amount
- Update order status in database
- Send notification to seller that payment has been confirmed
- Send notification to customer that order has been processed
- Log status change with admin ID, timestamp, and reason
- Update inventory on seller side (if sync is enabled)
- Start order fulfillment timer

WHEN an admin changes order status from processing to shipped, THE system SHALL:

- Require admin to enter or validate tracking number
- Update tracking number in order record
- Generate tracking link for customer
- Send notification to customer with tracking details
- Send notification to seller that order has been shipped
- Update inventory on seller side (if sync is enabled)
- Log status change with admin ID, timestamp, tracking number, and reason

WHEN an admin changes order status from shipped to delivered, THE system SHALL:

- Update order status in database
- Send notification to customer that order has been delivered
- Send notification to seller that order has been completed
- Start 7-day return window countdown
- Enable customer review submission for products in order
- Log status change with admin ID, timestamp, and reason

WHEN an admin clicks "Cancel order", THE system SHALL:

- Require admin to confirm the action with reason selection from:
  - Customer requested cancellation
  - Inventory shortage
  - Payment failure
  - Suspicious activity
  - Other (manual entry)
- If order is paid:
  - Initiate full refund through payment processor
  - Set refund status to "in progress"
  - Send notification to customer explaining cancellation and refund
  - Send notification to seller explaining cancellation
- If order is unpaid:
  - Simply cancel the order
  - Send notification to customer explaining cancellation
  - Send notification to seller explaining cancellation
- Update order status to cancelled
- Update inventory on seller side (if sync is enabled)
- Log cancellation with admin ID, timestamp, reason, and refund status

WHEN an admin clicks "Process refund", THE system SHALL:

- Require admin to specify:
  - Full refund or partial refund
  - Refund amount (if partial)
  - Refund reason (from pre-defined list)
- If partial refund:
  - Verify refund amount is less than order total
  - Verify refund amount is not less than $0.01
- Initiate refund through payment processor
- Set refund status to "in progress"
- Send notification to customer explaining refund and expected timeline
- Send notification to seller explaining refund
- If refund is successful:
  - Update refund status to "completed"
  - Update order total
  - Restore inventory on seller side (if sync is enabled)
- If refund fails:
  - Set refund status to "failed"
  - Send notification to admin with error from payment processor
  - Notify customer that refund could not be processed
- Log refund action with admin ID, timestamp, reason, amount, and payment processor status

WHEN an admin clicks "Manually ship order", THE system SHALL:

- Require admin to select shipping carrier from dropdown (FedEx, UPS, USPS, DHL, etc.)
- Require admin to enter or validate tracking number
- Generate tracking link
- Change order status to shipped
- Send notification to customer with tracking details
- Send notification to seller
- Update order record with carrier info and tracking number
- Log shipment action with admin ID, timestamp, carrier, and tracking number

WHEN an admin clicks "Contact customer", THE system SHALL:

- Open modal with pre-populated customer email address
- Allow admin to write custom message
- Provide email templates:
  - Order status inquiry
  - Shipping delay notification
  - Product replacement offer
  - Return authorization
  - General support
- Send email from platform email address (no-reply@shoppingmall.com)
- Log email sent with admin ID, timestamp, recipient, and template used
- Create ticket in support system with email context

WHEN an admin clicks "Export order data", THE system SHALL:

- Generate compressed ZIP file containing:
  - order_summary.json (complete order details)
  - items.csv (all products in order)
  - customer_info.json (customer profile at time of order)
  - seller_info.json (seller profile at time of order)
  - payment_log.json (payment transaction details)
  - shipping_info.json (carrier and tracking details)
- Include metadata with export timestamp, admin ID, and export ID
- Encrypt file with AES-256 and deliver via secure download link (valid 24 hours)
- Log export request with admin ID, timestamp, and order ID

WHEN an admin clicks "Close order", THE system SHALL:

- For orders with final status (delivered, cancelled, refunded):
  - Move order to archived status
  - Disable further status modifications
  - Allow viewing but prevent editing
  - Send confirmation message
- For orders with open status (pending, paid, processing, shipped):
  - Return error: "Cannot close order with open status. Please finalize first."
- Log close action with admin ID, timestamp, and reason

#### Order Dispute Resolution

WHEN an admin reviews an order with customer complaint, THE system SHALL:

- Display:
  - Customer complaint text and date
  - Seller response text and date
  - Order history and status
  - Product reviews for items in order
  - Return request details (if any)
  - Payment information
  - Shipping status
- Provide dispute resolution options:
  - Full refund to customer
  - Partial refund to customer
  - Product replacement
  - Store credit to customer
  - Side with seller
  - Require mediation (if multiple complaints)
- Allow admin to add internal note to dispute
- Allow admin to email both parties with decision
- Require admin to select decision reason from:
  - Customer complaint valid
  - Seller complaint valid
  - Partial blame on both
  - Insufficient evidence
  - Fraudulent claim
- Record dispute outcome in order audit log
- Send final decision to both parties with full explanation
- Update order status based on decision
- If refund issued, initiate via payment processor
- If replacement ordered, create new order item with appropriate flags
- Log dispute resolution with admin ID, timestamp, decision, and reason

### Inventory Management Controls

#### Inventory Overview

WHEN an admin views the inventory dashboard, THE system SHALL:

- Display inventory summary metrics:
  - Total SKUs across platform
  - Total units in stock
  - Total value of inventory (at cost)
  - Total value of inventory (at retail)
  - Percentage of SKUs with low inventory (<10 units)
  - Percentage of SKUs with zero inventory
  - Average inventory turnover rate
  - Number of SKUs with inventory mismatches
- Show inventory heatmap by category:
  - High inventory (green)
  - Medium inventory (yellow)
  - Low inventory (orange)
  - Zero inventory (red)
- Show trending chart of inventory changes (monthly)
- Display list of SKUs with inventory issues:
  - Low availability (1-10 units)
  - Negative stock
  - Mismatched counts between system and seller
- Allow sorting by SKU ID, product name, seller, category, stock level
- Allow filtering by seller name
- Allow filtering by category
- Allow filtering by stock level (under 5, under 10, under 50)

WHEN an admin clicks on an SKU record, THE system SHALL:

- Display complete product variant info:
  - Product title
  - Variant attributes (size, color, etc.)
  - SKU code
  - Current stock level (system)
  - Reported stock level (seller)
  - Difference between system and seller
  - Last inventory update timestamp (seller)
  - Last inventory sync timestamp (system)
  - Product cost price
  - Retail price
  - Total units sold
  - Return rate
- Show "Update inventory" button
- Show "Synchronize inventory" button
- Show "View inventory history" link
- Show "Export SKU data" button

WHEN an admin clicks "Update inventory", THE system SHALL:

- Open inventory adjustment modal
- Allow admin to enter:
  - New inventory count
  - Reason for adjustment (stock count error, returned items, damaged goods, etc.)
- Validate that reason is selected from predefined list
- Adjust inventory count in platform system
- Log adjustment with admin ID, timestamp, SKU ID, old count, new count, and reason
- If adjustment exceeds 50% of current stock:
  - Require secondary admin authorization
  - Send alert to seller
- Send notification to seller of inventory adjustment

WHEN an admin clicks "Synchronize inventory", THE system SHALL:

- Initiate inventory synchronization process
- Query seller's inventory system via API (if connected)
- Compare seller-reported inventory with platform inventory
- If difference exceeds 10%:
  - Flag the SKU for review
  - Log discrepancy with delta amount and seller ID
  - Send alert to admin dashboard
  - Suggest suspension of seller inventory sync until resolution
- If difference is less than 10%:
  - Update platform inventory to match seller count
  - Log synchronization with admin ID, timestamp, SKU ID, old count, new count
- If seller system unavailable:
  - Log sync failure
  - Schedule retry in 1 hour
  - Notify seller of sync failure

WHEN an admin clicks "View inventory history", THE system SHALL:

- Display chronological history of inventory changes for this SKU:
  - Date and timestamp of change
  - Previous inventory level
  - New inventory level
  - Change amount
  - Responsible party (system, admin, seller)
  - Reason for change
  - Source of change (manual update, sync, return, sale)
- Allow export of inventory history as CSV
- Allow filtering by date range

WHEN an admin clicks "Export SKU data", THE system SHALL:

- Generate ZIP file containing:
  - sku_details.json (SKU information)
  - inventory_history.csv (all inventory changes)
  - sales_data.csv (sales by time period)
  - return_data.csv (returns by time period)
  - seller_inventory_sync_logs.csv (synchronization attempts)
- Include metadata with export timestamp, admin ID, and export ID
- Encrypt file with AES-256 and deliver via secure download link (valid 24 hours)
- Log export request with admin ID, timestamp, and SKU ID

#### Inventory Health System

IF inventory system detects negative stock for any SKU, THEN THE system SHALL:

- Immediately flag the product as "Inventory Error" in admin dashboard
- Lock the SKU from further sales
- Send notification to admin dashboard
- Send notification to seller of the affected SKU
- Create ticket for investigation

WHEN inventory sync fails for a seller account three times in 24 hours, THEN THE system SHALL:

- Automatically disable inventory sync for that seller
- Send notification to seller explaining the suspension
- Notify admin in inventory management section
- Require seller to contact support to re-enable sync

WHILE a SKU has negative inventory, THE system SHALL:

- Prevent any further sales of that variant
- Hide the variant from customer-facing product pages
- Continue to display existing reviews and ratings
- Allow admin to update inventory manually

### System Configuration Settings

#### Platform Configuration Management

WHEN an admin accesses the system configuration section, THE system SHALL:

- Display configuration categories:
  - Platform settings (company info, branding, contact details)
  - Payment system settings (gateway configurations, fees)
  - Shipping settings (carriers, rates, options)
  - Review system settings (moderation, verification, display)
  - Notification settings (email templates, delivery schedules)
  - Security settings (login policies, rate limits, 2FA requirements)
  - Compliance settings (data retention, audit logs, export policies)
  - Developer settings (API keys, webhooks, rate limits)
- Allow expansion and collapse of each category
- Show warning badges for incomplete/unsecured settings
- Display status indicators for external integrations (payment gateway, shipping provider)

WHEN an admin edits platform settings, THE system SHALL:

- Allow editing:
  - Company name and description
  - Platform logo and favicon
  - Primary color theme
  - Contact information (support email, phone, physical address)
  - Copyright notice
  - Language preferences
- Save changes immediately
- Apply visual changes to frontend in real time (except logo which requires cache clearance)
- Log all changes with admin ID, timestamp, and list of modified fields
- Send notification to all admins of configuration change

WHEN an admin edits payment system settings, THE system SHALL:

- Allow editing:
  - Active payment gateways (credit card, PayPal, etc.)
  - Platform transaction fee percentage
  - Transaction fee cap (maximum amount charged)
  - Refund processing policy (time window, penalties)
  - Chargeback handling policy
  - Currency selection (primary, secondary)
  - Tax calculation settings
  - Payment processor API keys and credentials
- Validate API keys by test transaction before saving
- Log all changes with admin ID, timestamp, and description
- Send encrypted notification to platform security team
- Schedule system-wide notification to all sellers of payment change

WHEN an admin edits shipping settings, THE system SHALL:

- Allow editing:
  - Supported carriers (FedEx, UPS, USPS, DHL, etc.)
  - Default shipping methods (standard, express, overnight)
  - Free shipping threshold amount
  - Shipping rate calculator rules by weight, region, size
  - Packaging requirements
  - Handling fees
- Validate rules with test data
- Calculate estimated shipping costs for sample orders
- Log all changes with admin ID, timestamp, and description
- Send notification to all sellers of shipping policy changes

WHEN an admin edits review system settings, THE system SHALL:

- Allow editing:
  - Review moderation level (none, flagged, all)
  - Review verification requirement (purchase verified, email verified)
  - Review display rules (must have minimum stars to show)
  - Review rating scale (1-5, 1-10)
  - Review submission limit (per user per product)
  - Review edit/delete permissions
  - Review flagging rules
  - Review display sort order
- Log all changes with admin ID, timestamp, and description
- Schedule system-wide notification to all users of review policy changes

WHEN an admin edits notification settings, THE system SHALL:

- Allow editing:
  - Email templates (customer, seller, admin notifications)
  - Notification triggers (order status, payment success, inventory low)
  - Notification delays (immediate, 30 min, 2 hours)
  - Notification channels (email, SMS, in-app)
  - Scheduled newsletters and announcements
- Allow editing of HTML and plain text versions of templates
- Test template delivery to admin email
- Log all changes with admin ID, timestamp, and template name
- Send test notification to admin for each modified template

WHEN an admin edits security settings, THE system SHALL:

- Allow editing:
  - Admin password complexity requirements
  - Admin login attempt limits
  - Admin session timeout duration (15 min, 30 min, 1 hour)
  - Admin 2FA requirement (mandatory, optional)
  - Admin IP whitelisting
  - Admin logout policy (all devices, current only)
  - Customer login attempt limits
  - Customer password reset requirements
  - Password change interval requirements
- Log all changes with admin ID, timestamp, and description
- Send security alert to admin team
- Require reauthentication for all current admin sessions

WHEN an admin edits compliance settings, THE system SHALL:

- Allow editing:
  - Data retention policy (time periods for data deletion)
  - Data export policy (format, encryption, delivery)
  - Audit log retention period
  - GDPR/CCPA compliance settings
  - Child protection compliance
  - Tax compliance rules (region-specific)
- Log all changes with admin ID, timestamp, and description
- Send compliance notice to legal team
- Generate compliance report after change

WHEN an admin edits developer settings, THE system SHALL:

- Allow editing:
  - API key creation and revocation
  - API rate limits (per second, per minute, per hour)
  - Webhook endpoints and secrets
  - Webhook event subscriptions
  - Sandbox mode activation
  - Developer documentation access level
- Log all changes with admin ID, timestamp, and description
- Send notification to all registered developers of changes

### Configuration History and Version Control

WHILE any configuration change is made, THE system SHALL:

- Create automatic version snapshot with:
  - Timestamp
  - Admin ID
  - Changed fields
  - Old values
  - New values
- Store version history for every configuration setting
- Provide ability to:
  - View version history
  - Compare any two versions
  - Revert to any previous version
  - Export version history as JSON
- Display "last changed" timestamp on each configuration panel
- Show badge for configuration changes made in last 24 hours

### Audit and Reporting Functions

#### Audit Trail System

WHILE an admin performs any action in the dashboard, THE system SHALL:

- Log detailed audit record with:
  - Timestamp (ISO 8601)
  - Admin ID
  - Admin email address
  - IP address
  - Device fingerprint
  - Action performed (e.g., "delete_user", "update_product", "approve_order")
  - Target object ID (user ID, product ID, order ID)
  - Target object name/description
  - Before state
  - After state
  - Reason provided (if applicable)
  - Action status (success/failure)
  - Error message (if failure)
  - Client location (country, region, city)
- Store audit records in immutable database table
- Apply encryption at rest for sensitive fields
- Backup audit logs daily to encrypted offsite storage
- Retain audit logs for a minimum of 7 years
- Make audit logs available for download by authorized parties
- Allow searching of audit logs by:
  - Admin ID
  - Action type
  - Date range
  - Target object
  - IP address
- Allow export of audit logs as:
  - CSV
  - JSON
  - PDF (for legal compliance)

WHEN an admin views the audit log report, THE system SHALL:

- Display paginated list of audit records with 50 items per page
- Show timestamp, admin, action type, target, and status
- Allow filtering by:
  - Admin (by name or ID)
  - Action type (dropdown of common actions)
  - Date range
  - IP address
  - Success/failure
- Allow sorting by timestamp, admin, or action type
- Show summary statistics:
  - Total records
  - Percentage of successful actions
  - Top 5 admin actions
  - Top 5 target objects (products, users, orders)
- Export filtered results

#### Security Audit Reports

WHEN an admin generates security audit report, THE system SHALL:

- Generate report containing:
  - Number of successful logins
  - Number of failed login attempts
  - Number of account lockouts
  - Number of password resets
  - Number of suspicious activity flags raised
  - Number of sessions terminated
  - Number of admin actions with elevated privileges
  - Number of sensitive data exports
  - Number of configuration changes
- Highlight anomalies:
  - Multiple failed logins from one IP
  - Multiple logins from different countries within short period
  - Admin actions during unusual hours (12am-5am)
  - Bulk actions (delete 10+ users within 1 hour)
  - Configuration changes during maintenance window
- Include recommendations:
  - Strengthen password policies
  - Enable 2FA
  - Review admin permissions
  - Audit third-party integrations
  - Review API key usage
- Export as PDF with digital signature
- Deliver via secure admin notification
- Archive in compliance storage

#### Compliance Reports

WHEN an admin generates compliance report, THE system SHALL:

- Generate report containing:
  - Data retention compliance
  - GDPR consent records
  - Cookie policy compliance
  - Child protection compliance
  - Tax compliance status
  - Data breach response readiness
  - Export history
  - Audit log integrity verification
- Include evidence:
  - Screenshots of user consents
  - Proof of encrypted data storage
  - Access logs for privileged operations
  - Data deletion logs
  - Third-party vendor compliance certificates
- Highlight areas of non-compliance with severity ratings
- Include remediation plan with deadlines
- Export as PDF with digital signature
- Deliver via secure admin notification
- Archive in compliance storage

#### Financial Reports

WHEN an admin generates financial report, THE system SHALL:

- Generate report containing:
  - Total transactions processed
  - Total revenue generated
  - Platform commission earned
  - Total refunds processed
  - Chargeback rate
  - Payment processing fees
  - Net revenue
  - Revenue by category
  - Revenue by seller
  - Revenue by payment method
  - Active sellers count
  - Active customers count
  - Average order value
  - Customer acquisition cost
  - Customer lifetime value
- Include trends (weekly, monthly, quarterly)
- Compare with previous period
- Export as PDF and Excel
- Deliver via secure admin notification
- Archive in financial storage

## Summary

The e-commerce shopping mall platform provides a comprehensive marketplace connecting customers and sellers with robust features for product management, order fulfillment, payment processing, inventory control, and administrative oversight. This comprehensive requirements specification provides backend developers with complete business logic necessary to implement the platform with high integrity, scalability, and security.

All requirements are defined in EARS format with precise conditions, actions, and business logic necessary for implementation. The system ensures transactional integrity, customer trust, seller accountability, and operational efficiency through automated workflows, audit trails, and administrative controls.

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*