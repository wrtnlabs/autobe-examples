## Product Discovery and Purchase Flow

The product discovery and purchase flow is the core monetization path of the shoppingMall platform. This document defines the complete end-to-end journey from initial product discovery through to successful order confirmation, ensuring a seamless, secure, and intuitive experience for customers. This flow integrates directly with the product catalog, shopping cart, address management, and payment processing systems.

### Product Browsing

WHEN a guest or customer accesses the homepage of shoppingMall, THE system SHALL display a curated selection of featured products, trending items, and new arrivals based on current sales data and seasonal trends.

WHILE the user is viewing any product listing page, THE system SHALL ensure all products are displayed with their primary image, name, price, and average rating.

WHEN the user navigates to a category landing page, THE system SHALL load all products categorized under that specific term without requiring additional user input.

THE system SHALL support infinite scroll or pagination with 20 products per page for all product listing views.

WHEN an item in a product listing is hovered over or focused, THE system SHALL display a faint overlay with a quick-action button labeled "Add to Wishlist".

IF the user attempts to click on a product that has been deactivated or removed by an admin, THEN THE system SHALL redirect the user to a "Product Not Available" page with a link to return to the category.

### Category Navigation

WHEN a user selects a top-level category from the main navigation menu, THE system SHALL navigate to a page displaying only first-level subcategories.

WHEN a user selects a subcategory (second level), THE system SHALL display products filtered to that subcategory, including products from any nested third-level categories.

WHEN a user clicks on a third-level category, THE system SHALL display products belonging exclusively to that specific deepest-level category.

THE system SHALL maintain the full category hierarchy path in the breadcrumbs at the top of the product listing page for users to navigate back.

WHILE navigating categories, THE system SHALL remember the user’s most recently selected category path and pre-select it on future visits for 30 days.

IF the selected category contains no active products, THEN THE system SHALL display a message: "No products found in this category. Explore related categories or search for items using keywords."

### Search Functionality Requirements

WHEN a user enters one or more keywords in the global search bar and submits the query, THE system SHALL return all products matching any portion of the product name, description, or brand name.

THE system SHALL perform partial keyword matching (e.g., search "phone" should match "Smartphone", "Phone Case", "Wireless Headphone") regardless of word order or capitalization.

WHEN the search term is empty or contains only spaces, THEN THE system SHALL display the homepage’s featured products.

WHEN the search returns no results, THEN THE system SHALL display suggestions such as: "Did you mean: [similar product term]?" and list 3 popular related categories.

THE system SHALL apply search filters dynamically after results are displayed, including brand, price range, ratings, and product attributes (e.g., color, size).

WHERE user has been logged in, THE system SHALL prioritize products in search results based on past purchase behavior and wishlist items.

THE search results page SHALL load and render the first 20 products within 1.5 seconds of search submission.

### Product Detail View

WHEN a user clicks on any product from a listing or search result, THE system SHALL navigate to a dedicated product detail page.

THE product detail page SHALL display: product image gallery (with thumbnails), full product name, brand, short description, full description, average rating, number of reviews, main price, and all available variants.

THE product price SHALL be clearly visible and updated in real-time based on the currently selected variant.

WHEN there are no available variants, THE system SHALL display the single product price and disable the variant selector.

THE product description SHALL support rich text formatting including bold, italic, bullet points, and line breaks as provided by sellers.

IF the product has been reviewed, THE system SHALL display the top 3 reviews with verified purchase badges and an option to "View All Reviews".

WHEN the product description is empty or minimal, THE system SHALL show: "No product description available. Please check the specifications below for details."

### Variants Selection (SKU)

THE system SHALL represent product variants as unique SKUs, each with its own inventory, price, and images.

WHEN a product has multiple variants (e.g., color, size, capacity), THE system SHALL present each variant attribute as a selectable option using radio buttons or dropdown menus.

WHEN a user selects a combination of attributes (e.g., "Red" and "Large"), THE system SHALL enable only those options that are currently in stock for that combination.

WHEN a variant option is out of stock for any combination, THE system SHALL display "Out of Stock" as disabled and grayed out.

IF a user attempts to select a variant combination that is unavailable, THEN THE system SHALL display: "This combination is currently unavailable. Please select other options to continue." and highlight the conflicting choice.

THE selected variant SHALL update the displayed product price, image(s), and "Add to Cart" button label immediately upon selection.

WHERE a product has more than 10 variants, THE system SHALL use a grid-based variant selector with thumbnails and selectable swatches for color or material options.

WHEN a variant is selected, THE system SHALL update the URL fragment to reflect the selection (e.g., #color=red&size=large) to enable sharing and bookmarking.

### Add to Cart

WHEN a user clicks the "Add to Cart" button on the product detail page, THE system SHALL add the currently selected SKU to the user’s shopping cart.

THE system SHALL immediately display a confirmation toast: "Added [Product Name] to your cart."

WHEN the user has not logged in and attempts to add an item to cart, THE system SHALL proceed with adding it to a temporary guest cart and display an alert: "You're browsing as guest. Log in to save your cart for later."

IF the requested quantity of the selected SKU exceeds available inventory at the time of submission, THEN THE system SHALL add the maximum available quantity and display: "Only [X] items in stock. Added [X] to your cart."

WHEN the item is already in the cart, THE system SHALL increase the existing quantity by one and update the cart counter.

THE system SHALL update the cart indicator icon in the header in real time with the updated total item count.

### Proceed to Checkout

WHEN a user clicks "Proceed to Checkout" from the cart, THE system SHALL validate that at least one item is present in the cart.

IF the cart is empty, THEN THE system SHALL redirect the user to the product catalog with a message: "Your cart is empty. Start shopping!"

WHEN a user proceeds to checkout, THE system SHALL check inventory levels for each item in the cart.

IF any cart item’s inventory has dropped below its current quantity since the item was added, THEN THE system SHALL reduce the cart quantity to the available stock and display: "[Product Name] stock reduced. Quantity updated to [new quantity]."

THE system SHALL require the user to be logged in to proceed to checkout. Users who are not logged in SHALL be prompted with: "Log in or create an account to complete your purchase."

WHEN a user logs in successfully during the checkout process, THE system SHALL merge their guest cart with their authenticated cart and proceed.

THE checkout page SHALL display: cart summary, subtotal, estimated tax, total, shipping options, and payment method selection.

### Shipping Address Selection

WHEN a logged-in user proceeds to checkout, THE system SHALL display their saved shipping addresses in a list with "Edit" and "Set as Default" options.

IF a user has no saved addresses, THE system SHALL display a form to enter a new shipping address and mark it as default.

WHEN a user selects a shipping address, THE system SHALL instantly update the shipping cost based on the selected address and delivery method.

THE system SHALL store the selected shipping address as the default address for future orders.

IF the user has more than five shipping addresses, THE system SHALL present the most recently used five addresses by default, with an option to "+ View All Addresses".

THE system SHALL validate address fields for completeness (first name, last name, street, city, postal code, country) before proceeding.

### Payment Processing

WHEN a user selects a payment method (credit card or digital wallet), THE system SHALL display the appropriate form for direct input or prompt tokenization via the integrated gateway.

THE system SHALL support: Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, and PayPal.

IF a user selects a credit card, THE system SHALL require: card number, expiration date, CVV, and cardholder name.

WHEN the payment form is submitted, THE system SHALL validate the card number format, expiration date, and CVV length before initiating the transaction.

IF the payment gateway declines the transaction, THEN THE system SHALL display: "Payment declined. Please check your card details or try another payment method."

THE system SHALL never store raw card numbers. All sensitive payment data shall be tokenized by the payment gateway.

WHEN payment is successfully processed, THE system SHALL immediately create an order record with status "Paid", generate a unique order number, and commit the transaction.

### Order Confirmation

WHEN order payment is confirmed, THE system SHALL display an order confirmation page with:
- Order number
- Items purchased with SKU details
- Shipping address
- Payment method (masked)
- Estimated delivery date
- Summary of costs

THE system SHALL send a confirmation email to the user within 15 seconds of successful payment, including order summary and tracking link.

THE system SHALL send a push notification (if enabled) or SMS confirmation within 30 seconds of successful payment.

WHERE a seller is registered to fulfill the product, THE system SHALL notify the seller via internal alert within 10 seconds of order confirmation.

THE system SHALL clear the shopping cart after successful order placement.

WHEN the user closes the confirmation page or navigates away, THE system SHALL redirect to the "Order History" page.

THE system SHALL allow the user to download a PDF receipt from the confirmation page or Order History.

WHEN a user returns to the platform within 24 hours of placing an order, THE system SHALL automatically display a "Thank You" banner on the homepage: "Thanks for your order #ORDER12345! Track your delivery."

### Cross-Functional Integration Notes

- Product availability during checkout must be synchronized with the inventory management system in real time.
- All pricing must reflect live SKU pricing from the seller’s management system.
- User address selection must be pulled from the account and address management system (03-account-and-address-management.md).
- Payment processing must interface with a third-party gateway via secure API (see system architecture).
- Confirmation messages must be triggered by sending events to the notification service.
- All order actions must be logged in the audit trail for admin oversight.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*