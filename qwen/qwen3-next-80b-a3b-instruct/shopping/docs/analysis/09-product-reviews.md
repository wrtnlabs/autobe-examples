## Product Reviews and Ratings System

This document defines the complete requirements for the product review and rating system of the shopping mall platform. It specifies how customers submit feedback, how ratings are calculated, how content is moderated, and how sellers and administrators interact with reviews. All requirements are written in natural language using EARS format to ensure clarity, testability, and unambiguous implementation by backend developers.

### Review Submission

Customers can only submit reviews for products they have successfully purchased and received. Reviews cannot be submitted before the order status is marked as "delivered" by the fulfillment system.

WHEN a customer completes a purchase and the order status is "delivered", THE system SHALL enable the "Write a Review" button for that product in their order history.

WHEN a customer attempts to submit a review for a product without a completed purchase, THE system SHALL deny submission and display the message: "You must have purchased and received this item to leave a review."

THE system SHALL require a minimum of 10 characters in the review text field before submission is allowed.

THE system SHALL limit review text to 2,000 characters maximum.

WHILE a customer is writing a review, THE system SHALL display a real-time character counter showing remaining characters.

THE system SHALL allow review submission only once per unique SKU (product variant).

WHEN a customer has already submitted a review for a specific SKU, THE system SHALL display "You've already reviewed this item" instead of the review form.

### Rating System

The system shall use a 1 to 5-star rating scale for product evaluations. No decimal ratings are permitted.

WHEN a customer selects a star rating, THE system SHALL accept only integer values from 1 to 5 inclusive.

WHEN a customer clicks on the star rating component, THE system SHALL immediately display the selected number of stars visually.

WHEN a customer hovers over the star rating component, THE system SHALL highlight stars up to the hovered position as a visual indicator of the intended rating.

THE system SHALL calculate the average rating for each product as the arithmetic mean of all valid star ratings submitted by customers for that product.

WHEN calculating an average rating, THE system SHALL round the result to one decimal place using standard rounding rules (0.5 and above rounds up).

THE system SHALL display the average rating as a single value (e.g., "4.3") next to the product listing and on the product detail page.

THE system SHALL display the total number of reviews as a count (e.g., "127 reviews") next to the average rating.

WHEN there are no reviews for a product, THE system SHALL display "No reviews yet" instead of a numerical rating.

### Review Moderation

The system shall include automated filtering to identify inappropriate, spammy, or abusive content.

WHEN a customer submits a review containing profanity, slur words, or hate speech as defined by the platform's prohibited language list, THE system SHALL block submission and display the message: "Your review contains prohibited content. Please revise and submit again."

WHEN a customer submits a review containing excessive special characters, repeated characters, or meaningless text patterns (e.g., "!!!!", "123456789", "asdffdsa"), THE system SHALL flag it for manual review and display: "Your review is being reviewed for compliance. We'll notify you when it's approved."

WHEN a review is flagged for manual moderation, THE system SHALL automatically assign it to the admin moderation queue.

WHEN a review is flagged as spam, THE system SHALL reduce its visibility by hiding it from public view and excluding it from average rating calculations.

THE system SHALL store the moderation status for each review with values: "pending", "approved", "rejected", or "flagged".

WHEN an admin reviews a flagged review, THE system SHALL allow them to change the status to "approved" or "rejected" with an optional comment.

WHEN a review is marked as "rejected" by an admin, THE system SHALL notify the customer via email: "We're sorry, but your review could not be approved because it violated our community guidelines."

### Verified Purchase Indicator

Only reviews associated with completed, paid orders may display the "Verified Purchase" badge.

WHEN a customer submits a review for a product that was purchased through the shopping mall platform, THE system SHALL automatically attach the "Verified Purchase" badge to the review.

WHEN a customer attempts to submit a review for a product they did not purchase through the platform (e.g., a product imported from elsewhere), THE system SHALL NOT attach the "Verified Purchase" badge.

WHEN a review does not have a matching order record in the system, THE system SHALL display no badge.

THE system SHALL NOT allow sellers or administrators to manually add or remove the "Verified Purchase" badge.

WHEN a review is associated with an order that was later refunded and returned, THE system SHALL retain the review, but remove the "Verified Purchase" badge.

### Review Responses

Sellers may respond to customer reviews to clarify product information, apologize for issues, or thank customers for feedback.

WHEN a seller views a product review on their product's review page, THE system SHALL display a "Respond" button beneath the review.

WHEN a seller clicks the "Respond" button, THE system SHALL open a text field with a maximum limit of 1,000 characters.

WHEN a seller submits a response, THE system SHALL display the response publicly beneath the original review with a label: "Seller Response".

WHEN a seller has already responded to a specific review, THE system SHALL hide the "Respond" button and display the existing response.

Sellers may edit their responses only within 7 days of submission.

WHEN a seller attempts to edit their response after 7 days, THE system SHALL disable the edit function and display: "You can no longer edit this response."

WHEN a seller deletes a response, THE system SHALL replace it with the message: "This response was removed by the seller."

### Review Reporting

Customers may report reviews they believe violate platform guidelines.

WHEN a customer sees a review they believe is inappropriate, THE system SHALL display a "Report" link beneath the review.

WHEN a customer clicks the "Report" link, THE system SHALL open a modal with predefined reasons: "Spam", "Inappropriate Content", "False Information", "Other".

WHEN a customer selects a reason and submits the report, THE system SHALL flag the review for administrative review.

WHEN a review receives three or more valid reports, THE system SHALL automatically move it to the admin moderation queue.

THE system SHALL not notify the reviewing customer when their review is reported.

WHEN an admin processes a reported review, THE system SHALL log the reporter's user ID and selected reason in the moderation audit trail.

### Review Visibility Rules

Review visibility is governed by approval status and moderation actions.

WHEN a review status is "approved", THE system SHALL display it publicly on the product page and include it in average rating calculations.

WHEN a review status is "pending", THE system SHALL not display it publicly and shall exclude it from average rating calculations.

WHEN a review status is "flagged", THE system SHALL not display it publicly and shall exclude it from average rating calculations.

WHEN a review status is "rejected", THE system SHALL not display it publicly and shall exclude it from average rating calculations.

Reviews associated with refunded orders shall remain visible but without the ‘Verified Purchase’ badge.

Reviews may be ordered on the product page by: "Most Recent", "Highest Rated", "Lowest Rated", "Most Helpful".

WHEN a user selects "Most Helpful", THE system SHALL display reviews ordered by the number of "Helpful" votes received.

THE system SHALL allow customers to vote "Helpful" or "Not Helpful" on reviews (only one vote per user per review).

WHEN a customer clicks "Helpful" on a review, THE system SHALL increment the helpful vote count by 1 and prevent further voting.

WHEN a customer clicks "Not Helpful" on a review, THE system SHALL decrement the helpful vote count by 1 and prevent further voting.

THE system SHALL show the total "Helpful" vote count next to each review (e.g., "216 people found this helpful").

### Review Deletion

Customers may delete their own reviews.

WHEN a customer views their own review, THE system SHALL display a "Delete Review" link beneath it.

WHEN a customer clicks "Delete Review", THE system SHALL display a confirmation modal: "Are you sure you want to delete this review? This action cannot be undone."

WHEN a customer confirms deletion, THE system SHALL permanently remove the review from public view and exclude it from all aggregates.

WHEN a review is deleted by the customer, THE system SHALL log the action in the audit trail with the customer's user ID and timestamp.

THE system SHALL NOT permit review deletion after 7 days from the date of submission.

WHEN a customer attempts to delete a review older than 7 days, THE system SHALL display the message: "Reviews cannot be deleted after 7 days to maintain platform integrity."

WHEN an admin deletes a review, THE system SHALL retain the review data for audit purposes but remove it from public view.

WHEN an admin deletes a review, THE system SHALL send an email notification to the original reviewer explaining the reason for deletion (e.g., "Your review was removed by an administrator for violating our community guidelines.").

## Business Context

This product reviews system is essential to building trust and transparency on the shopping mall platform. Customers rely on peer feedback to make informed purchase decisions, especially with variants like colors and sizes. Sellers benefit from constructive feedback to improve products and customer service. The verified purchase system ensures reviews are authentic and credible.

The system balances freedom of expression with the need to maintain a respectful, trustworthy environment. Automated moderation reduces moderation burden, while human oversight ensures fairness. Customer control over their own reviews promotes engagement, while time limits on edits and deletions prevent manipulation.

All functionality must be consistent with the user actor model, where customers are consumers, sellers are merchants, and administrators have full control. The review system must integrate with the order processing, inventory, and authentication systems.

## Implementation Notes

All logic must be implemented on the server side. No review approval or moderation state should be stored on the client. All rating calculations, visibility rules, verification logic, and deletion controls must be validated at the API level.

Review data must be indexed for performance, with optimized queries for average ratings, review counts, and helpful votes.

All moderation actions and deletions must be logged for compliance and audit purposes.

The system must handle concurrent edits, votes, or deletions using database transactions to prevent data inconsistency.

All text inputs must be sanitized to prevent XSS attacks, and HTML tags are not allowed in reviews or responses.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*