## Customer Persona - Everyday Shopper

The primary user of the shopping mall platform is the everyday shopper — an individual seeking convenience, variety, and trust when purchasing goods online. This customer is typically time-constrained, values transparent pricing and accurate product information, expects immediate feedback during interactions, and is highly sensitive to friction in the purchasing flow. They are not tech-savvy but are familiar with modern e-commerce platforms. Their core motivations are: finding desired products quickly, making confident purchase decisions, receiving orders on time, and feeling secure throughout the transaction.

This customer rarely shops as a bulk buyer, rarely compares prices across multiple platforms during a single session, and makes purchasing decisions based on product quality, brand reputation, shipping speed, and review credibility. They expect the platform to anticipate their needs by remembering preferences, providing personalized recommendations, and minimizing repetitive inputs.

They may be a working professional, a parent managing household purchases, a student on a budget, or an elderly individual shopping independently. They trust the platform when it behaves predictably, responds instantly, and communicates clearly.

## Onboarding Flow (Registration and Address Setup)

WHEN a new visitor accesses the shopping mall homepage for the first time, THE system SHALL display a prominent "Register" button in the top navigation bar.

WHEN a visitor clicks "Register", THE system SHALL present a registration form requiring only email address and password.

WHEN the visitor submits valid email and password, THE system SHALL create an unverified customer account and send a verification email to the provided address.

WHEN the visitor clicks the verification link in the email, THE system SHALL mark the account as verified and automatically redirect to the address setup screen.

WHILE the customer account is unverified, THE system SHALL prevent access to cart, wishlist, order placement, and product review functions.

WHEN the customer first reaches the address setup screen, THE system SHALL display a blank form with the following required fields: Full Name, Street Address, City, Postal Code, Country, and Phone Number. The country field SHALL default to "South Korea" based on the user's timezone (Asia/Seoul).

WHEN the customer submits a valid address, THE system SHALL save it as the primary shipping address and mark it as active.

WHEN the customer has no addresses saved, THE system SHALL display a persistent banner on all product and cart pages saying, "Complete your profile to shop — add your address now."

IF the visitor attempts to proceed to checkout without completing address setup, THEN THE system SHALL interrupt the process and display a modal stating, "You must add a shipping address before placing an order. Please visit your account profile to complete your address."

IF the customer submits an invalid postal code or unrecognizable street address, THEN THE system SHALL display a localized error message: "The address you entered could not be verified. Please check your input and try again. In South Korea, postal codes must be 5 digits.

WHEN the customer has saved one or more addresses, THE system SHALL allow them to select a default shipping address during checkout and to manage additional addresses in their profile.

## Product Discovery Flow (Search and Category Browsing)

WHEN a customer navigates to the homepage, THE system SHALL display a horizontal banner carousel with featured promotions and categories.

WHEN the customer selects a category from the main navigation (e.g., "Electronics", "Clothing", "Home & Kitchen"), THE system SHALL load a filtered product listing page with a breadcrumb trail showing the path: Home > Category > Subcategory (if applicable).

WHEN a customer types text into the global search bar, THE system SHALL begin suggesting autocomplete results within 400 milliseconds, displaying product names, categories, and brands matching the input. The suggestions SHALL display no more than 6 items.

WHEN the customer presses Enter or selects a suggestion, THE system SHALL immediately load the search results page with up to 40 products per page, sorted by relevance.

WHILE a search is in progress, THE system SHALL display a static spinner animation and a "Searching..." message below the search bar to indicate active processing.

IF the search returns no results, THEN THE system SHALL display a friendly message: "No products found for \"[search term]\". Try using broader terms, or browse our categories to find something similar."

WHEN the customer applies a filter (e.g., price range, brand, rating), THE system SHALL update the product grid instantly without reloading the page.

WHEN a filter is applied that results in zero products, THE system SHALL display: "No products match your filters. Try adjusting your selections — for example, widen the price range or remove a brand filter." and retain all active filters for modification.

WHERE the device screen width is less than 768 pixels, THE system SHALL collapse the category menu into a slide-out drawer triggered by a hamburger icon.

## Product Selection Flow (Variant Selection and Wishlist)

WHEN a customer clicks on a product card in the listing, THE system SHALL navigate to the detailed product page.

ON the product detail page, THE system SHALL display the primary product image, name, price, brand, and a clear "Add to Cart" button.

WHEN the product has variants (e.g., size, color, material), THE system SHALL display a selector interface showing all available options as clearly labeled buttons or dropdowns.

WHEN a variant is selected, THE system SHALL instantly update the displayed price, available stock count, and primary image to reflect the selected variant.

WHILE the customer is viewing a product, THE system SHALL show the remaining available stock count below the "Add to Cart" button (e.g., "Only 3 left in stock").

IF a variant becomes out of stock while the customer is viewing the product, THEN THE system SHALL visually gray out that option, update the stock indicator to "Out of stock", and hide the "Add to Cart" button for that variant.

WHEN the customer clicks "Add to Wishlist", THE system SHALL toggle the wishlist icon to filled state, display a confirmation toast saying, "Added to Wishlist", and save the product to the customer’s wishlist.

WHEN the customer has already added the product to their wishlist, THE system SHALL show the wishlist button in filled state and not allow duplicate entries.

IF the customer is not logged in when clicking "Add to Wishlist", THEN THE system SHALL display a modal saying, "You must be logged in to save items to your wishlist. Would you like to sign in now?" with "Sign In" and "Continue as Guest" buttons.

WHEN the customer selects an unavailable variant (e.g., size "XL" is out of stock), THE system SHALL display a warning message: "This option is currently out of stock. We recommend checking back soon or selecting another color."

## Cart and Checkout Flow

WHEN the customer clicks "Add to Cart", THE system SHALL:
- Display a confirmation toast: "Added to cart"
- Increment the cart icon badge count in the header
- Add the product variant, quantity, and price to the cart object in memory and persist to server

WHEN the customer clicks the cart icon in the header, THE system SHALL display a mini-cart overlay showing:
- Product name, variant, price, and quantity
- Subtotal, tax, and estimated delivery fee
- A "View Full Cart" button
- "Continue Shopping" and "Proceed to Checkout" buttons

WHEN the customer clicks "Proceed to Checkout", THE system SHALL validate the cart for the following:
- At least one item is present
- All items have available stock
- A valid shipping address is selected
- All items are from the same seller (if mixed-seller cart is unsupported)

IF the cart contains items from different sellers, THEN THE system SHALL display an error: "We currently do not support mixed-seller checkout. Please complete the purchase for one seller’s items at a time. You can return to shop for items from other sellers after checkout."

IF an item in the cart is out of stock, THEN THE system SHALL remove it automatically, show a warning message: "The item \"[Product Name]\" is no longer available and has been removed from your cart.", and recalculate the order total.

WHEN the customer selects a shipping address, THE system SHALL immediately display the estimated delivery date range based on seller location and shipping method.

WHEN the customer selects a payment method (e.g., Credit Card, KakaoPay, NaverPay), THE system SHALL present corresponding input fields for payment details.

WHEN the customer clicks "Place Order", THE system SHALL:
- Validate all required fields (address, payment, terms acceptance)
- Create order record in system with status "Pending Payment"
- Redirect to secure payment gateway using server-generated token
- Do NOT show order confirmation until payment is successfully confirmed

IF the payment gateway returns an error (e.g., declined card, insufficient funds, invalid CVV), THEN THE system SHALL:
- Return the customer to the checkout page
- Display a specific error message based on error code: e.g., "Your card was declined. Please try another payment method or contact your bank."
- Retain all cart and address data for re-submission
- Highlight the payment field in red

IF the customer closes the browser tab during the payment process, THE system SHALL retain the "Pending Payment" order for 15 minutes and send a follow-up email: "Your order is waiting. Complete payment within 15 minutes to secure your items."

## Order Tracking and Delivery Flow

WHEN an order is successfully paid for, THE system SHALL:
- Save the order with status "Confirmed"
- Generate an order confirmation number
- Send an immediate email and push notification: "Order #12345 has been confirmed! We're preparing your items for shipment."

WHEN the seller updates the order status to "Shipped", THE system SHALL:
- Automatically update the order status in the customer’s dashboard
- Notify the customer via email and in-app alert: "Your order #12345 has been shipped! Track your delivery below."
- Include a tracking link to real-time carrier information

WHILE the order is in transit, THE system SHALL display a visual progress bar on the order details page with milestones: Confirmed → Shipped → Out for Delivery → Delivered

WHEN the tracking system reports the package is "Out for Delivery", THE system SHALL send an SMS notification if a phone number is provided: "Your order #12345 will arrive today between 2–6 PM. Be ready!"

WHEN the delivery is successfully completed, THE system SHALL:
- Update order status to "Delivered"
- Trigger a 7-day review window
- Send notification: "Your order #12345 has been delivered! We’d love your feedback."

IF the tracking information shows an exception (e.g., "Failed Delivery", "Customs Clearance Issue"), THE system SHALL:
- Update status to "Delayed"
- Send alert to customer: "Your delivery has been delayed. Carrier has encountered an issue. We’re working to resolve it."
- Provide contact link to customer support

WHEN an order is delivered more than 5 days past the estimated date, THE system SHALL automatically generate a service ticket and notify customer: "Your order #12345 is overdue. We're investigating and will update you within 24 hours."

## Review Submission Flow

WHEN a customer’s order status changes to "Delivered", THE system SHALL enable the "Write a Review" button on the order details page.

WHEN the customer clicks "Write a Review", THE system SHALL display a form with:
- Star rating (1–5, mandatory)
- Written review (50–1000 characters, optional)
- Photo upload (up to 5 images, optional)
- Option to recommend product to others (Yes/No)

WHEN the customer submits a review, THE system SHALL:
- Immediately display a confirmation: "Thank you for your review!"
- Auto-publish the review for the seller to see
- Add a timestamp: "Reviewed on [Date]"
- Allow editing for 24 hours post-submission

WHILE pending approval delivery, THE system SHALL refrain from displaying the review on the product page.

IF the review contains profanity or violates community guidelines, THEN THE system SHALL automatically flag it and send email to customer: "Your review has been temporarily hidden because it contains language that goes against our community standards. Please edit your review or contact support if you believe this was a mistake."

WHEN the seller responds to a review, THE system SHALL:
- Display the seller’s response directly below the customer’s review
- Notify the customer via email: "[Seller Name] replied to your review."
- Allow the customer to follow up with one additional comment within 7 days

## Account Management Flow (Password Reset, Address Updates)

WHEN a customer clicks "Forgot Password?" on the login screen, THE system SHALL prompt for their email address.

WHEN a valid email is submitted, THE system SHALL send a password reset link valid for 30 minutes.

WHEN the customer clicks the password reset link, THE system SHALL navigate to a secure page where they can enter a new password twice.

WHEN the new password is submitted and verified, THE system SHALL:
- Update the password hash
- Log out of all active sessions
- Send confirmation email: "Your password has been changed. You are now logged out of all devices."

WHEN a customer accesses their "Account" section, THE system SHALL display:
- Personal information (name, email)
- Primary and secondary shipping addresses with "Edit" and "Delete" options
- Order history with status, date, price, and "View Details" links
- Wishlist items with "Add to Cart" and "Remove" options
- "Change Password" and "Log Out" buttons

WHEN the customer edits an existing address, THE system SHALL allow full editing except for the unique ID associated with the address.

WHEN the customer deletes an address, THE system SHALL:
- If it is the only address: prompt, "You are deleting your last address. You cannot place an order without an address. Are you sure?"
- If it is the primary address and there are other addresses: ask, "Would you like to make another address your primary shipping address?"

WHEN the customer attempts to delete the currently used address on an active order, THEN THE system SHALL block deletion and display: "This address is associated with an existing order. You may not delete it until that order is completed."

WHEN a customer logs out, THE system SHALL:
- Clear all local session tokens
- Return to homepage with "Sign In" banner
- Retain cart and wishlist contents for logged-out state (temporary local storage for 7 days)

WHEN an inactive account has not been accessed for 180 days, THE system SHALL send a reminder email: "We miss you! Log in within 14 days to keep your account and wishlist active."

IF the customer does not log in within 14 days of the reminder, THE system SHALL archive the account but retain email and order history for legal compliance. All wishlist, cart, and preference data SHALL be permanently deleted.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.