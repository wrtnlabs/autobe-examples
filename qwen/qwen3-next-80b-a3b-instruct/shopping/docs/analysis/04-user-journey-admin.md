## Admin Persona - Platform Operator

The Admin is the platform operator responsible for ensuring the integrity, compliance, and operational health of the shopping mall ecosystem. This actor does not interact with products or orders as a customer or seller would, but instead oversees the system as a whole, intervening when business rules are violated, system integrity is at risk, or user trust is compromised. The Admin has no commercial interest in individual transactions but is accountable for the platform’s overall performance, fairness, and legal compliance.

All admin actions must be logged, auditable, and conducted with the highest level of transparency to maintain trust between users and the platform.

### Dashboard Overview Flow

THE admin SHALL be presented with a real-time operational dashboard upon login that displays key metrics across the entire platform. The dashboard MUST include:

- Total active users (customers and sellers) categorized by status
- Pending seller applications by age (in hours)
- Current number of open order disputes
- Total pending refund requests by type (full refund, partial, chargeback)
- Recent product removals (last 24 hours)
- Top 5 categories by order volume
- System uptime percentage over the last 30 days
- Active threats (e.g., fraudulent login attempts, price manipulation patterns)

WHEN the admin opens the dashboard, THE system SHALL refresh all metrics automatically every 60 seconds without requiring manual refresh.

WHILE the admin is logged in, THE system SHALL highlight in red any metric that exceeds warning thresholds defined in the system configuration (e.g., pending applications > 200, disputes > 50).

### Seller Approval/Rejection Flow

WHEN a new buyer submits a seller application, THE system SHALL automatically flag the application for human review if:

- The business name matches known fraudulent patterns
- The provided bank account or tax ID is invalid or unverifiable
- The submitted documents are blurred, cropped, or otherwise unreadable
- The store name or description contains prohibited keywords (e.g., "guaranteed", "100% genuine", "replica")
- The application is submitted from a known VPN or proxy IP address

THE admin SHALL review each flagged application in a dedicated review queue with:

- The seller’s submitted documents (image files)
- The seller’s registered contact email and phone
- The business registration ID
- The store name, description, and category
- Any prior history of the seller’s email or IP address on the platform
- A verifiable digital signature attached to the application

IF the seller’s documentation is complete, accurate, and compliant with platform policies, THEN THE system SHALL enable the "Approve" button for the admin.

WHEN the admin clicks "Approve", THE system SHALL:

- Mark the seller as active in the system
- Send an automated welcome email to the seller
- Add the seller to the public directory of sellers
- Notify the seller via push notification that their store is live
- Grant the seller their initial product listing limit (10 products)

IF the seller’s documentation is incomplete, fraudulent, or violates business policies, THEN THE system SHALL enable the "Reject" button for the admin with a mandatory dropdown for rejection reason:

- Duplicate application (seller already approved under another email)
- False business information
- Incomplete or forged documents
- Prohibited business category
- Suspicious payment details
- Prior account termination on the platform
- National sanctions compliance violation
- Fraudulent identity

WHEN the admin selects a rejection reason and confirms rejection, THE system SHALL:

- Mark the application as rejected
- Send an automated email with the specific reason for rejection
- Lock the seller’s email and IP address from creating new applications for 90 days
- Log all details of the rejection for audit purposes
- Disable any associated payment profile if created

Wheeling a recommendation engine is temporarily prohibited.

### User Account Management Flow

WHEN an admin selects a user (customer or seller) from the user directory, THE system SHALL display all associated data in a read-only view except for the following editable controls:

- Lock / unlock account status
- Delete account permanently (requires secondary confirmation)
- Modify user role (only for special cases) 
- View all orders associated with the account
- View all products listed by the user
- View all reviews submitted by the user
- View all support tickets opened by the user
- View IP address history and login timestamps

THE admin SHALL NOT be able to:

- Change the user’s email address
- Modify the user’s real name or address
- Reset the user’s password
- Transfer ownership of products or orders

WHEN the admin chooses to "Lock Account", THE system SHALL:

- Immediately prevent the user from logging in
- Freeze all pending orders associated with the account
- Block the user from posting new reviews
- Prevent any new product listings
- Mark the account as "Locked - Admin Action" in all UI displays
- Send an automated notification to the user explaining the lock and providing contact info for appeal

WHEN the admin chooses to "Delete Account", THE system SHALL:

- Require a second confirmation using a unique 6-digit code sent to the admin’s registered email
- Remove all personal identifying information from the user’s profile (name, address, email, phone)
- Retain all order history, reviews, and product listings in anonymized form for legal compliance
- Invalidate all active sessions and tokens for the user
- Remove the user from any mailing lists
- Log the deletion with admin ID, timestamp, and reason

IF the user is flagged for violating payment or fraud policies, THEN THE system SHALL display a "Ban Payment Association" button. WHEN clicked, THE system SHALL:

- Lock all stored payment methods linked to the account
- Block any future payments using those methods
- Prevent the account from adding new payment methods
- Send a warning to the payment processor if possible

### Order Dispute Resolution Flow

WHEN a customer submits an order dispute (e.g., "item not received", "wrong item", "damaged"), THE system SHALL:

- Automatically pause any payout to the seller for that order
- Notify the seller with a 72-hour window to respond
- Assign the dispute a unique dispute ID and notify the admin via dashboard alert
- Flag the order as "Under Review"

WHEN the admin opens a dispute case, THE system SHALL display:

- Full order details: products, quantities, prices, shipping address
- Original buyer message
- Seller response
- Shipping carrier tracking history
- Photos submitted by both buyer and seller
- Any previous disputes involving this seller or buyer
- Order timing (purchase to delivery)
- Product category and typical return rate

IF the buyer provides photos showing damaged packaging or incorrect item, THEN THE system SHALL enable "Issue Full Refund" and "Issue Partial Refund" buttons.

IF the seller provides verified tracking proving delivery to the correct address with no damage, THEN THE system SHALL enable the "Dismiss Dispute" button.

IF the order value exceeds $500 OR the seller has 3+ disputes in the last 30 days, THEN THE system SHALL flag the case for Urgent Review and require the admin to escalate to a supervisor.

WHEN the admin clicks "Issue Full Refund", THE system SHALL:

- Automatically initiate refund through original payment channel
- Notify the buyer: "Your refund has been processed. It will appear in your account within 3-5 business days."
- Notify the seller: "This order has been refunded in full due to buyer complaint. Your account has been flagged for review."
- Deduct the refund amount from seller’s available balance
- Record the dispute outcome in the seller’s permanent record

WHEN the admin clicks "Issue Partial Refund", THE system SHALL:

- Require the admin to input refund amount in a modal (minimum 10%, maximum 100%)
- Confirm that the amount is less than the original order value
- Perform the refund for the specified amount
- Send a message to buyer: "We’ve issued a partial refund of ${amount} for this order."
- Send a message to seller: "A partial refund of ${amount} has been issued for this order. You are responsible for the remainder."
- Adjust the seller’s balance accordingly

WHEN the admin clicks "Dismiss Dispute", THE system SHALL:

- Release the hold on the seller’s payout
- Notify buyer: "We reviewed your dispute and found no evidence of an issue. Your order status remains confirmed."
- Notify seller: "The dispute for this order has been closed. Your payout will proceed."
- Record that the dispute was dismissed without refund
- Add a note to the seller’s reputation score

### Category and Taxonomy Management Flow

THE admin SHALL be responsible for maintaining the product category hierarchy for all products on the platform.

WHEN the admin receives a request to create a new category, THE system SHALL:

- Require the admin to input a unique category name
- Require a brief description of the category
- Require selection of a parent category (if nesting)
- Require specification of applicable seller permissions (e.g., "Only sellers in Food Industry may list here")
- Require upload of an icon (24x24 PNG)
- Require validation that no category with the same name exists

THE system SHALL NOT allow the creation of categories with:

- Names that are too similar to existing categories (e.g., "Phones" and "Mobile Phones" in same branch)
- Names containing profanity or banned keywords
- Duplicate nesting (e.g., "Electronics > Phones > Electronics")

WHEN the admin deletes a category, THE system SHALL:

- Require confirmation of deletion
- Display a list of all products currently assigned to that category
- Allow the admin to reassign those products to a new parent category before deletion
- Prevent deletion if the category has products and no alternative assignment is selected
- Archive category metadata for audit purposes

WHILE a category is inactive (not assigned to any product), THE system SHALL display it in "Archive" mode with an option to "Re-activate".

THE system SHALL prevent category names that are:

- Too generic (e.g., "Stuff", "Things")
- Brand-aligned (e.g., "Apple Products", "Nike Shoes")
- Politically, racially, or religiously sensitive

### Product Moderation and Removal Flow

WHEN a product is reported by a customer for:

- Misrepresentation
- Fraudulent claims
- Inappropriate imagery
- Intellectual property violation
- Prohibited content (weapons, drugs, etc.)

THE system SHALL:

- Automatically suspend the listing
- Notify the seller with 48 hours to respond
- Notify the admin via dashboard alert
- Hide the product from all search results and browse views
- Freeze any sales from the product

WHEN the admin opens a flagged product, THE system SHALL display:

- Product details (title, description, images, price, variant options)
- The reporter’s complaint text
- Any response from the seller
- Seller’s account history (number of prior removals)
- Number of reports on this product
- Similar products from the same seller

IF the product contains: illegal items, weapons, counterfeit goods, explicit content, or unauthorized use of trademarked logos, THEN THE system SHALL enable a "Permanent Removal" button.

WHEN the admin clicks "Permanent Removal", THE system SHALL:

- Delete the product listing from the database
- Issue a warning to the seller: "Your product has been permanently removed for violation of platform policies."
- Deduct 5 points from the seller’s trust score
- Log the removal with reporter ID, admin ID, timestamp, and reason
- If the seller has 3+ permanent removals in 12 months, THE system SHALL flag them for account review

IF the product is misleading but not illegal (e.g., exaggerated claims, missing specs), THEN THE system SHALL enable a "Edit Required" button.

WHEN the admin clicks "Edit Required", THE system SHALL:

- Send the seller a notification: "Your product listing must be updated within 48 hours. Reason: [reason]."
- Place the product in "Under Review" status
- Disable purchasing
- Allow the admin to add a public note visible to customers: "This listing is under review. An updated version is pending."

WHEN the seller updates the product, THE system SHALL:

- Notify the admin to review the changes
- Enable an "Approve Update" button or "Request Further Changes" button
- After approval, restore the listing and remove the public notice

### Refund and Cancellation Approval Flow

WHEN a customer requests to cancel an order before it has shipped, THE system SHALL:

- Notify the seller to confirm cancellation
- Provide a 24-hour window for seller response
- Auto-cancel if seller does not respond
- Notify the admin if the order value > $500 or seller has 2+ cancellations in 7 days

WHEN a customer requests a refund after delivery, THE system SHALL:

- Require customer to select reason: "Wrong item", "Damaged", "Changed mind", "Not as described"
- Require upload of up to 3 photos
- Notify the seller
- Enable admin review for: returns > 30 days after delivery, items with no return policy, or items marked as "non-returnable"

WHEN the admin reviews a refund request that is outside standard policy, THE system SHALL display:

- Customer’s purchase history
- Seller’s return policy as stated on product page
- Shipping timeline from delivery to refund request
- Previous refund history between customer and seller
- Item category (e.g., perishable, digital, made-to-order)

IF the customer requested refund after 30 days, OR the seller specified "final sale" in product policy, THEN THE system SHALL require ADMIN approval before any refund can proceed. The "Grant Refund" button shall be enabled only for admin.

WHEN admin grants a refund that breaches seller policy, THE system SHALL:

- Deduct 1 point from seller’s trust score
- Send seller a message: "A refund was issued beyond your stated policy due to customer experience reasons."
- Record the exception in the seller’s audit log

IF a customer requests refund for a digital product (e.g., downloadable files), THE system SHALL prevent refund once downloaded unless:

- File is corrupted (verified by admin check)
- Product description misrepresents deliverables

WHEN a cancellation or refund is approved, THE system SHALL:

- Initiate payment reversal via original channel
- Notify both parties
- Update inventory if product is returned
- Add note to customer’s profile: "Refund granted on [date] for [reason]"

### System Health Monitoring Flow

WHILE the admin is logged in, THE system SHALL perform automatic diagnostics every 10 minutes and display results in a dedicated "System Health" module:

- Database query response times (must be <500ms on 95% of requests)
- API endpoint error rate (must be <0.5%)
- Active workers in message queues (e.g., email, notification)
- Storage usage across buckets
- Duplicate session tokens (must be <50 active)
- Cache hit rate (should be >85%)
- Background job backlog (number of unprocessed tasks)

IF any metric fails its threshold, THEN THE system SHALL:

- Change the status indicator to RED
- Send a priority alert email to the admin’s registered email
- Display a "View Details" button that shows:
   - Timestamp of failure
   - Current value vs. threshold
   - Last 5 log entries related to the failure
   - Recommended actions (e.g., "Restart workers", "Clear cache")

WHEN the admin clicks "View Details" and confirms the issue requires action, THE system SHALL enable "Run Diagnostics" and "Initiate Recovery" buttons.

WHEN "Initiate Recovery" is clicked, THE system SHALL:

- Stop high-load processes temporarily
- Restart underperforming services
- Clear stale sessions
- Refresh data caches
- Reconnect to external services if disconnected
- Log all recovery actions with admin identity and timestamp

WHILE recovery is running, THE system SHALL display: "System maintenance in progress. Minor delays may occur. Admin intervention required."

The system SHALL NOT automatically repair critical failures (e.g., database corruption) - these must be escalated as incidents.

### Access Control and Permissions Flow

THE system SHALL ensure that only authorized admins can perform administrative actions.

WHEN an admin logs in, THE system SHALL:

- Require 2-factor authentication using an authenticator app (TOTP)
- Display last login date and time, location, and device
- Require re-authentication if the last activity was >15 minutes ago

THE system SHALL maintain an auditable log of every admin action, including:

- Timestamp
- Admin ID
- Action performed (e.g., "Lock Account", "Approve Seller")
- Target user or product ID
- IP address used
- Device type (browser, app, API)
- Result (success, failure)

WHEN an admin attempts an action they are not permitted to perform, THE system SHALL:

- Deny the request immediately
- Log the attempt as a security violation
- Send an alert to the platform owner
- Require a 48-hour wait before the admin can attempt the action again

THE system SHALL bind admin permissions to roles:

- View-Only Admin: Can view data but not edit or act
- Standard Admin: Can perform all actions except role changes and system config
- Senior Admin: Can change admin roles and system-wide settings
- Owner: Has unrestricted access

IN CASE of emergency (e.g., mass duplication or hack), THE system SHALL allow the Owner to execute a "Suspend All Actions" command that:

- Freezes all seller account changes
- Freezes all customer order placements
- Blocks all new seller applications
- Places the site into restricted read-only mode
- Sends an emergency message to all users
- Requires manual confirmation from a second owner to restore normal operations

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.