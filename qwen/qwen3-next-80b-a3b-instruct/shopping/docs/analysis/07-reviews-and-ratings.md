# Product Reviews and Ratings

### Review Submission Rules

WHEN a customer completes an order, THE system SHALL enable the customer to submit a review for any product included in that order.

WHILE a product has been marked as delivered in the order tracking system, THE system SHALL allow review submission.

IF a review is submitted more than 90 days after the order delivery date, THEN THE system SHALL reject the submission with an error message stating "Too late to review - reviews must be submitted within 90 days of delivery."

IF a customer attempts to submit a review for a product they did not purchase, THEN THE system SHALL block the submission and display "You must purchase this item before reviewing it."

THE system SHALL prevent multiple reviews for the same product by the same customer.

WHERE a customer has previously submitted a review for a product, THE system SHALL allow the customer to edit their review before 14 days have passed since the review was published.

THE customer SHALL be allowed to submit one rating and one written review per product.

### Rating Scale and Display

THE system SHALL use a 5-star rating scale for product reviews, with whole-number values only (1, 2, 3, 4, 5).

WHEN a product page is loaded, THE system SHALL display the average customer rating rounded to one decimal place.

THE system SHALL show the total number of reviews for each product.

WHEN displaying individual reviews, THE system SHALL show each rating as five filled or empty star icons, with no half stars.

WHEN viewing a product catalog listing, THE system SHALL show a small star icon with rating number beside the product title if the product has 2 or more reviews.

### Moderation and Reporting

IF a review contains profanity, hate speech, threats, personal information, or spam, THEN THE system SHALL automatically flag it for moderation.

WHEN a review is flagged for moderation, THE system SHALL hide it from public view and notify admin.

WHEN a user reports a review, THE system SHALL log the report with reporter ID, reason selection, and timestamp, and notify admin.

WHERE a reported review has more than three reports, THE system SHALL automatically trigger a queue for admin review.

THE admin SHALL be able to reject and delete any review regardless of moderation flags.

THE system SHALL maintain an audit log of all reviews deleted by admin, including user ID, review ID, deletion timestamp, and reason.

### Seller Response Mechanism

WHEN a customer submits a review, THE system SHALL notify the seller of the associated product.

WHEN a seller logs in, THE system SHALL display a notification badge indicating if they have unread customer reviews.

THE seller SHALL be able to write a public response to any customer review, up to 500 characters.

WHEN a seller responds to a review, THE system SHALL display both the customer review and the seller response together on the product page.

THE seller response SHALL be clearly labeled "Seller Response" and shown below the customer review.

WHEN a seller edits their response, THE system SHALL update the response and record the edit timestamp.

WHEN a review is marked as fraudulent or removed by admin, THE system SHALL automatically remove the associated seller response.

### Review Eligibility Criteria

EVERY review submission SHALL require a verified purchase.

THE system SHALL verify purchase eligibility by matching the reviewing customer ID with the buyer ID from the order records.

THE system SHALL NOT accept reviews for products purchased through external channels or as gifts.

WHERE a customer purchases multiple units of the same product in one order, THE system SHALL allow one review per customer, not per unit.

### Review Verification

WHEN a review is published, THE system SHALL display a "Verified Purchase" badge to the left of the review title.

THE "Verified Purchase" badge SHALL only appear if the customer’s ID matches the buyer ID in a completed, non-canceled order for that exact product SKU.

WHERE a customer has purchased the product but the order was later canceled or refunded in full, THE system SHALL remove the "Verified Purchase" badge from their review.

IF the order payment failed and was never completed, THEN THE system SHALL prevent review submission entirely.

THE system SHALL NOT permit reviews from guest users unless they have created an account before attempting to submit a review.

WHEN a review is submitted under a guest account that is later registered to a customer account, THE system SHALL link the review to the new account and retain the "Verified Purchase" badge if eligibility criteria are met.