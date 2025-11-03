# Order History, Cancellation, and Refund Requirements

This document defines the business requirements for order history access, order cancellation, and refund processing in the shoppingMall platform. These requirements ensure customers and administrators have clear, consistent, and fair processes for managing completed and problematic transactions.

### Order History Access

Customers must be able to view their complete transaction history in a clear, chronological format. This provides transparency, supports customer service inquiries, and enables personal financial tracking.

- THE shoppingMall SHALL display a chronological list of all orders placed by the authenticated customer.
- THE shoppingMall SHALL display each order with its unique order ID, date of placement, total amount, current status, and number of items.
- THE shoppingMall SHALL allow customers to filter their order history by status (e.g., Delivered, Cancelled, Refunded, Returned).
- THE shoppingMall SHALL allow customers to search their order history by product name, order ID, or date range.
- THE shoppingMall SHALL display full item details for each order, including product name, variant details (color, size), quantity, and price per unit.
- THE shoppingMall SHALL preserve order history indefinitely, even after order status changes.
- THE shoppingMall SHALL prevent customers from viewing other users' order history.
- THE shoppingMall SHALL allow sellers to view orders where they are the product provider, but not orders from other sellers.
- THE shoppingMall SHALL allow admins to view the complete order history of any customer or seller.
- WHILE an order is in Pending status, THE shoppingMall SHALL display "Processing" in the order history summary for customer visibility.
- WHEN an order is archived or deleted (by admin), THE shoppingMall SHALL still retain it in the customer's order history for legal compliance purposes.

### Cancellation Eligibility

The platform must clearly define and enforce rules for when customers can cancel orders. This balances customer flexibility with seller operational stability.

- WHEN an order status is Pending, THE shoppingMall SHALL allow the customer to request cancellation.
- WHEN an order status is Confirmed, THE shoppingMall SHALL disallow customer-initiated cancellation.
- WHEN an order status is Shipped, Out for Delivery, or Delivered, THE shoppingMall SHALL disallow cancellation and instead require return or refund processes.
- THE shoppingMall SHALL not allow cancellations for digital products or services, regardless of status.
- WHEN a seller marks an order as Shipped, THE shoppingMall SHALL update the order status and disallow any subsequent customer cancellation requests.
- THE shoppingMall SHALL notify the customer immediately via in-app notification and email when cancellation eligibility changes due to status update.
- WHERE a product is marked as "Non-Returnable" by the seller, THE shoppingMall SHALL prevent cancellation even while status is Pending.
- WHERE a seller has enabled "Instant Shipment" for a product, THE shoppingMall SHALL override eligibility and disallow cancellation upon order placement.
- WHILE an order is being processed for shipment by the seller, THE shoppingMall SHALL prevent cancellation attempts.
- IF a customer attempts to cancel an ineligible order, THE shoppingMall SHALL display a clear message explaining the reason (e.g., "Shipping has begun" or "Product is non-returnable").

### Cancellation Requests

The process for initiating a cancellation must be explicit, documented, and tracked.

- WHEN a customer requests cancellation of an eligible order, THE shoppingMall SHALL open a cancellation request form.
- THE shoppingMall SHALL require the customer to select a cancellation reason from a predefined list: "Changed Mind", "Ordered by Mistake", "Found Cheaper Elsewhere", "Invalid Product Description", "Other".
- WHERE the customer selects "Other", THE shoppingMall SHALL require a short text explanation (5–200 characters).
- THE shoppingMall SHALL display the estimated refund amount based on current cart and shipping cost calculations.
- THE shoppingMall SHALL require customer confirmation before submitting the cancellation request.
- WHEN the cancellation request is submitted, THE shoppingMall SHALL change the order status to "Cancellation Requested" and notify the seller.
- THE shoppingMall SHALL log the cancellation request with timestamp, customer ID, reason, and explanation.
- THE shoppingMall SHALL allow the seller to approve or reject the cancellation request within 24 hours.
- WHEN a seller approves a cancellation request, THE shoppingMall SHALL immediately change the order status to "Cancelled".
- WHEN a seller rejects a cancellation request, THE shoppingMall SHALL change the order status back to "Confirmed" and notify the customer with the seller’s rejection reason.
- WHERE the seller does not respond within 24 hours, THE shoppingMall SHALL automatically approve the cancellation and change the order status to "Cancelled".
- IF a cancellation request is approved, THE shoppingMall SHALL reserve the inventory for the returned items and disable any associated auto-ship or fulfillment processes.

### Refund Eligibility

Refunds must be reliably processed under specific conditions that protect both customer rights and seller interests.

- WHEN an order is cancelled by customer or seller, THE shoppingMall SHALL initiate a refund eligibility check.
- WHEN an order is returned by customer, THE shoppingMall SHALL initiate a refund eligibility check.
- WHEN product quality is reported as defective by the customer, THE shoppingMall SHALL automatically qualify the order for refund.
- WHEN the wrong product is delivered (size, color, model mismatch), THE shoppingMall SHALL automatically qualify the order for refund.
- WHEN the customer receives the product in damaged condition, THE shoppingMall SHALL automatically qualify the order for refund.
- WHEN the product is not received within 15 days after "Out for Delivery" status, THE shoppingMall SHALL automatically qualify the order for refund.
- WHEN a customer requests a refund without return (e.g., lost item), THE shoppingMall SHALL verify through logistics data before approving.
- WHERE the customer has already used the product, THE shoppingMall SHALL disallow full refund unless product defect or delivery error is confirmed.
- WHERE the product was delivered in sealed condition and opened by the customer, THE shoppingMall SHALL allow partial refund based on condition assessment.
- WHERE a seller has declared "No Refunds" policy for specific category (e.g., custom-made items), THE shoppingMall SHALL override standard rules and disallow refund.
- WHERE a refund request is made after 30 days from delivery, THE shoppingMall SHALL disallow all refund types.
- IF a customer requests refund for a non-returnable item, THE shoppingMall SHALL disallow the refund unless corruption, delivery error, or defect is verified.

### Refund Processing

Refunds must be handled securely, transparently, and in compliance with financial regulations.

- WHEN a refund is approved, THE shoppingMall SHALL route the refund to the original payment method used for the purchase.
- THE shoppingMall SHALL not allow refunds to be processed to a different payment method unless explicitly authorized by customer and verified by admin.
- WHEN a payment method used was a gift card, THE shoppingMall SHALL credit the original gift card with the refund amount.
- WHEN a payment method used was a digital wallet, THE shoppingMall SHALL credit the same wallet account.
- WHEN a payment method was partially refunded or expired, THE shoppingMall SHALL credit the customer’s shoppingMall wallet as stored balance.
- THE shoppingMall SHALL calculate refund amounts based on: (product price × returned quantity) + original shipping cost if entire order returned.
- WHERE a partial refund is requested (e.g., one item of three returned), THE shoppingMall SHALL subtract non-returnable items and recalculate amount.
- WHERE non-returnable shipping fees were charged, THE shoppingMall SHALL not refund shipping unless the entire order is returned.
- THE shoppingMall SHALL generate a refund transaction ID for every approved refund.
- THE shoppingMall SHALL log refund processing details: amount, reason, timestamp, initiator, and payment method.
- THE shoppingMall SHALL prevent duplicate refunds for the same order.
- WHEN an admin manually approves a refund, THE shoppingMall SHALL require input of refund reason and approval note.
- WHILE a refund is being processed, THE shoppingMall SHALL display "Refund in Progress" status to customer.
- WHILE a refund is completed, THE shoppingMall SHALL update the order status to "Refunded" and notify customer via email and in-app message.
- WHEN a refund fails due to bank or payment gateway error, THE shoppingMall SHALL retry up to 3 times at 24-hour intervals.
- IF a refund fails after 3 retries, THE shoppingMall SHALL change status to "Refund Failed" and notify admin for manual intervention.

### Return Shipping

The return process must be simple, documented, and supported for the customer.

- WHEN a refund is approved after a return, THE shoppingMall SHALL generate a prepaid return shipping label.
- THE shoppingMall SHALL provide the return shipping label in downloadable PDF format and email it to the customer.
- THE return shipping label SHALL include: return address, customer ID, order ID, and barcode.
- THE return shipping label SHALL be valid for 14 days from generation date.
- THE shoppingMall SHALL hold the return shipping label until the customer initiates the return process.
- WHERE the return shipping label is lost, THE shoppingMall SHALL allow the customer to request a duplicate label from order detail page.
- WHERE the customer returns the item without the label, THE shoppingMall SHALL not accept the return unless otherwise confirmed by seller.
- WHEN the item is received at the warehouse, THE shoppingMall SHALL scan the barcode and update return status.
- THE shoppingMall SHALL notify the seller when a returned package arrives at the fulfillment center.
- The seller SHALL inspect the returned item within 48 hours and confirm condition (New, Used, Damaged, Missing) via admin panel.
- WHERE the seller confirms the item is "Damaged" or "Missing parts", THE shoppingMall SHALL automatically adjust refund amount or reject refund.
- WHERE the seller confirms the item is "New and Sealed", THE shoppingMall SHALL proceed to full refund.
- WHERE the seller does not respond within 48 hours, THE shoppingMall SHALL assume the item was received in acceptable condition and proceed to refund.
- THE shoppingMall SHALL calculate and deduct return shipping cost only if the return is due to customer's change of mind or wrong order.
- WHERE the return is due to seller’s fault (wrong item, defect), THE shoppingMall SHALL cover all return shipping costs.

### Refund Timeline

Customers must have clear expectations regarding when refunds will be processed and credited.

- WHEN a cancellation is approved and no return is needed, THE shoppingMall SHALL initiate full refund within 2 hours.
- WHEN a return is initiated and the item is received and approved, THE shoppingMall SHALL initiate refund within 2 hours.
- THE shoppingMall SHALL display expected refund completion date based on payment processor timelines (typically 5–10 business days).
- WHERE the customer used credit card, THE shoppingMall SHALL state: "Refund will appear within 3–7 business days on your original payment method."
- WHERE the customer used digital wallet or gift card, THE shoppingMall SHALL state: "Refund will be credited to your wallet instantly."
- WHERE the refund fails and requires manual intervention, THE shoppingMall SHALL notify the customer within 1 business day.
- THE shoppingMall SHALL provide a tracking page for refund status: "Refund Requested → Processing → Completed → Failed".
- WHILE the refund is being processed by the financial institution, THE shoppingMall SHALL display "Refund in Transit" to the customer.
- WHEN the refund is fully completed through the payment network, THE shoppingMall SHALL mark status as "Completed" and record timestamp.
- WHEN a refund becomes overdue (beyond 14 calendar days), THE shoppingMall SHALL notify admin and escalate case for investigation.
- THE shoppingMall SHALL guarantee that all approved refunds are initiated within 48 hours of approval.

### Partial Refunds

In cases where customers return only part of an order, the system must handle partial refunds accurately and fairly.

- WHEN a customer returns only some items from a multi-item order, THE shoppingMall SHALL calculate partial refund amount as: (sum of returned items’ prices) + (proportional shipping cost).
- WHERE the original order had free shipping, THE shoppingMall SHALL not charge return shipping unless the customer keeps most items.
- WHERE the original order had discounted items or bundle pricing, THE shoppingMall SHALL calculate refund based on item’s original standalone price.
- WHEN a customer returns 2 items from an order of 5, THE shoppingMall SHALL deduct costs for the remaining 3 items.
- THE shoppingMall SHALL display item-by-item refund calculation breakdown to customer before final approval.
- WHEN a partial refund is approved, THE shoppingMall SHALL only refund the specific items returned, keeping the rest reserved.
- WHEN a partial refund is processed and a leftover item is still in customer’s possession, THE shoppingMall SHALL mark that item as "Paid and Retained".
- THE shoppingMall SHALL update the customer’s available wallet balance in real-time if the refund is credited as store credit.
- WHERE original discount code was applied, THE shoppingMall SHALL calculate partial refund without reinstating the discount value.
- WHERE seller offered free returns for entire order, THE shoppingMall SHALL offer free return for partial return.

### Dispute Handling

When customers and sellers disagree on refund outcomes, the system must provide a structured escalation path.

- IF a customer and seller disagree on refund eligibility, THE shoppingMall SHALL offer a dispute escalation option.
- WHEN dispute is initiated, THE shoppingMall SHALL suspend refund processing and notify both parties.
- THE shoppingMall SHALL require the customer to submit photographic evidence of damaged items or mismatched products.
- THE shoppingMall SHALL require the seller to submit proof of shipment, packaging condition, and item integrity before dispatch.
- WHEN dispute evidence is submitted, THE shoppingMall SHALL assign a support agent to review within 48 hours.
- THE shoppingMall SHALL make an impartial ruling based on evidence and policy.
- WHEN a dispute is resolved in the customer’s favor, THE shoppingMall SHALL approve the full refund and initiate processing.
- WHEN a dispute is resolved in the seller’s favor, THE shoppingMall SHALL reject refund and notify customer with final reasoning.
- WHERE a seller is found to have fraudulent behavior (e.g., false evidence, forged shipping records), THE shoppingMall SHALL suspend seller account pending investigation.
- WHERE a customer is found to have committed fraud (e.g., fake photos, return of different item), THE shoppingMall SHALL ban customer and initiate chargeback against payment method.
- THE shoppingMall SHALL log all disputes with case ID, participants, evidence, and resolution record.
- THE shoppingMall SHALL notify both parties of the final decision via email and in-app notification.
- Where the dispute resolution leads to a policy change, THE shoppingMall SHALL notify all users and update documentation within 1 week.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*