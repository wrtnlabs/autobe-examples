## Exception Handling Requirements

This document defines all user-facing error conditions, failure recovery flows, and system response behaviors for the shoppingMall platform. All requirements are written from the user's perspective using natural language and EARS syntax. Technical error codes, HTTP status codes, and implementation details are intentionally excluded.

### Authentication Failure Scenarios

WHEN a user attempts to log in with an incorrect email or password, THE system SHALL display a clear message saying "Email or password is incorrect. Please try again or reset your password." and SHALL retain the email field value for user convenience.

WHEN a user attempts to log in with a non-existent account, THE system SHALL respond identically to an invalid password case - "Email or password is incorrect. Please try again or reset your password." - to prevent email harvesting attacks.

WHEN a user’s account is locked due to five consecutive failed login attempts, THE system SHALL show a message: "Your account has been temporarily locked for security reasons. Please reset your password or contact support to unlock it." and SHALL offer a "Reset Password" button that directs to the password reset flow.

WHEN a user attempts to register with an email that is already in use, THE system SHALL display: "This email is already registered. If this is your account, please sign in. If you’ve forgotten your password, use the reset option." and SHALL retain all other form data except the email.

IF a user’s email is not verified and they attempt to log in, THEN THE system SHALL show: "Your email address is not verified. Please check your inbox for a verification link, or resend the verification email." and SHALL provide a "Resend Verification Email" button.

### Product Availability Errors

WHEN a user searches for a product that does not exist, THE system SHALL display: "No products match your search. Try using different keywords or browse categories." and SHALL show top recommended products or recently viewed items.

WHEN a user navigates directly to a product URL that no longer exists or has been removed, THE system SHALL display: "This product is no longer available." with a button labeled "Browse Similar Products" that opens the product category page.

WHILE a product is marked as "discontinued" by the seller or admin, THE system SHALL show: "This product is no longer available for purchase. Similar items may be available below." and SHALL display up to three alternative products.

### Inventory Shortage Scenarios

WHEN a user adds an item to their cart that has insufficient stock, THE system SHALL display: "Only X items are available in stock. Try reducing your quantity or check back later." and SHALL update the cart to reflect the maximum available quantity.

WHEN a user attempts to proceed to checkout with an item that has since sold out, THE system SHALL display: "The item \"[Product Name]\" is no longer available due to high demand. It has been removed from your cart." and SHALL show a "Continue Shopping" button.

WHILE inventory levels are below the seller-defined threshold but still available, THE system SHALL display: "Low stock! Only X items left." in both product listing and product detail views to create urgency.

IF a user attempts to purchase more of an item than is available, THEN THE system SHALL show: "You requested X, but only Y are available. Would you like to proceed with Y instead?" with "Yes" and "No" options.

### Payment Processing Failures

WHEN a user’s payment card is declined due to insufficient funds, THE system SHALL display: "Your payment was declined. Please try another card or contact your bank for details." and SHALL allow the user to select a different payment method without resetting the cart.

WHEN a user’s payment card expires during checkout, THE system SHALL display: "Your payment method has expired. Please update your card details." and SHALL auto-select the expired card for easy editing.

WHEN the payment gateway is temporarily unavailable, THE system SHALL display: "We’re experiencing technical difficulties with payment processing. Please try again in a few minutes or contact our support team." and SHALL maintain the cart and user session for at least 30 minutes.

WHEN a user attempts to use an invalid or malformed credit card number, THE system SHALL validate immediately and respond with: "The card number you entered is invalid. Please check the number and try again." without submitting the form.

### Order Cancellation and Refund Errors

WHEN a user requests to cancel an order after it has been shipped, THE system SHALL display: "This order has already been shipped and cannot be canceled. You may initiate a return after delivery. Would you like to proceed with a return request?" and SHALL activate the return initiation flow.

WHEN a user requests a refund for an item that has already been fully refunded, THE system SHALL display: "This item has already been fully refunded. There are no further refund options available." and SHALL display the original refund date and amount.

IF a refund exceeds the original payment amount, THEN THE system SHALL display: "The requested refund amount exceeds the original payment. Your refund will be processed for the full amount paid, which is $X." and SHALL confirm the revised amount before submission.

WHILE an order is in "processing" status, THE system SHALL hide the "Cancel Order" button and show: "Your order is being prepared. You can request cancellation within 1 hour. After that, you’ll need to return the item after delivery."

### Review Submission Rejections

WHEN a user submits a review containing prohibited content (e.g., profanity, personal information), THE system SHALL display: "Your review contains content that violates our community guidelines. Please revise and resubmit." and SHALL highlight the flagged section if possible.

WHEN a user attempts to submit a review for a product they have not purchased, THE system SHALL display: "Only customers who purchased this product can leave a review. Please verify your purchase history before submitting." and SHALL link to their order history.

WHEN a user submits a review with less than 5 characters, THE system SHALL display: "Reviews must be at least 5 characters long. Please add more details about your experience." and SHALL retain the text for editing.

WHEN a user submits multiple reviews for the same product within 24 hours, THE system SHALL display: "You’ve already submitted a review for this product recently. Please wait 24 hours before submitting another review."

### Seller Application Rejections

WHEN a seller application is rejected due to incomplete documentation, THE system SHALL display: "Your application cannot be processed because some required documents are missing. Please upload valid business license, tax identification, and bank account details and try again."

WHEN a seller application is rejected due to high-risk business category, THE system SHALL display: "Your business type is currently restricted on this platform. Please contact support to discuss your application or explore alternative categories."

WHEN a seller’s identity verification fails, THE system SHALL display: "We were unable to verify your identity. Please upload a clear photo of your government-issued ID and try again. Ensure your name and photo are clearly visible."

WHEN a seller’s application is rejected by an admin, THE system SHALL notify the seller via email and display in their dashboard: "Your application has been rejected. You may reapply after 30 days. Contact support if you have questions about the reason."

### Administrator Action Errors

WHEN an admin attempts to delete a seller account that has active products or orders, THE system SHALL show: "This seller has active products and/or orders. To protect customer data, you must first archive all products and close all open orders before deleting."

WHEN an admin attempts to change a customer’s email address to one that already exists, THE system SHALL show: "This email address is already in use by another account. Please choose a different email." and SHALL highlight the conflicting account.

WHEN an admin attempts to approve a seller account that has already been approved or rejected, THE system SHALL show: "This seller application status cannot be changed. The current status is [Approved/Rejected]."

WHEN an admin performs a system-wide action that affects thousands of users (e.g., mass email, status change), THE system SHALL display: "This action affects X users. Are you sure you want to proceed? You cannot undo this change." and SHALL require a second confirmation checkbox.

### System Outage and Maintenance Modes

WHEN the entire platform experiences a system-wide outage, THE system SHALL display a static maintenance page with: "We’re currently experiencing technical difficulties. We apologize for the inconvenience and are working to restore service. Please check back in a few minutes."

WHILE scheduled maintenance is active, THE system SHALL display: "We’ll be performing scheduled maintenance from [Start Time] to [End Time] Korea Standard Time. During this time, you won’t be able to place orders or access your account. Thank you for your patience."

WHEN a core service (payment, shipping, search) is down but other functions are available, THE system SHALL display a contextually relevant message: "Checkout is currently unavailable. We’re fixing the issue and will restore service soon. You can continue browsing and save items to your wishlist."

WHEN the system detects an unknown internal error, THE system SHALL present a user-friendly message: "Something went wrong on our end. We’ve been notified and are working to fix this. Please try again later or contact support if the problem continues."

### Success Criteria for Error Handling

- All error messages must be written in clear, plain language avoiding technical jargon
- No error message shall direct users to contact technical support without offering a human-support contact option
- Every error scenario must provide a clear recovery path or next step
- Error messages must be consistent in tone and format across all actor types
- System states that prevent user action must explain WHY the action is blocked
- Users must never be left in a state where their action (purchase, review, delete) is incompletely processed
- Missing information must be retained during error recovery to avoid user re-entry
- All error messages must be displayed immediately upon failure detection, not after page reloads

All error handling must preserve the user’s shopping context, cart contents, and session state unless explicitly required to reset for security reasons. The goal is to make every failure a recoverable, understandable, and reassuring experience, never a dead end.