## Review Submission

THE system SHALL allow only customers who have completed a verified purchase of a product to submit a review for that product.

WHEN a customer attempts to submit a review without having purchased the product, THE system SHALL deny submission and display a message: "You must have purchased this item to leave a review."

THE system SHALL prevent customers from submitting reviews for products they did not purchase, even if the product is visible in the catalog.

WHILE a customer has an active session, THE system SHALL permit the submission of one review per product variant (SKU) only.

IF a customer has already submitted a review for a specific SKU, THEN THE system SHALL prevent a second submission and display: "You have already reviewed this item."

WHEN review submission is initiated, THE system SHALL require the customer to select a star rating (1–5) and optionally provide written feedback.

THE system SHALL enforce a minimum review length of 10 characters for written feedback.

WHEN a review contains only symbols or non-alphabetic content (e.g., "!!!!", "???"), THEN THE system SHALL reject the submission and display: "Please provide meaningful feedback."

## Rating Scale

THE system SHALL use a 5-star rating scale for all product reviews.

WHEN a customer selects a rating, THE system SHALL display the selected number of stars visually, from 1 (lowest) to 5 (highest).

THE system SHALL store the numeric value of the rating (1–5) and not rely on visual representation for calculations.

WHEN a product has no reviews, THE system SHALL display "No ratings yet" and a 0.0 average rating.

## Review Moderation

WHEN a customer submits a review, THE system SHALL place it in a pending moderation state for 24 hours.

WHILE a review is in pending moderation status, THE system SHALL hide it from public display on product pages.

WHEN 24 hours have elapsed since submission, THE system SHALL automatically approve the review for public display, unless flagged otherwise by the moderation system.

IF a review contains profanity, hate speech, personal information, or promotional content not related to the product, THEN THE system SHALL flag it for admin review and maintain its hidden status.

WHEN an admin reviews a flagged review, THE system SHALL allow the admin to either approve or delete the review.

WHEN a review is deleted by an admin, THE system SHALL record the deletion reason and notify the reviewer via email: "Your review has been removed for violating our content guidelines."

## Helpful Vote

THE system SHALL allow other customers to mark a review as "Helpful" or "Not Helpful."

WHEN a customer clicks "Helpful," THE system SHALL increment the helpful vote counter for that review.

WHEN a customer clicks "Not Helpful," THE system SHALL increment the not helpful vote counter for that review.

WHILE a customer is logged in, THE system SHALL prevent them from voting more than once on the same review.

THE system SHALL display the total helpful votes next to each review in the format: "X people found this helpful."

WHEN a review has 10 or more helpful votes and fewer than 3 not helpful votes, THE system SHALL display a badge: "Most Helpful Review." The badge SHALL persist until the review is updated or deleted.

## Seller Response

THE system SHALL allow sellers to respond publicly to customer reviews.

WHEN a seller replies to a review, THE system SHALL append the reply to the original review with metadata: "Seller Response - [Date]."

WHILE a seller is responding to a review, THE system SHALL require the seller to verify the response before submission.

THE system SHALL allow sellers to edit or delete their own replies within 7 days of posting.

WHEN a seller replies to a review, THE system SHALL send an email notification to the customer: "The seller has responded to your review. View reply."

THE system SHALL NOT allow sellers to respond to their own reviews.

IF a seller attempts to respond to a review submitted by themselves, THEN THE system SHALL block submission and display: "You cannot respond to your own review."

WHEN a seller asks for clarification about a negative review, THE system SHALL permit responses that are professional, factual, and solution-oriented.

IF a seller's reply contains abusive language, false claims, or attempts to coerce customers, THEN THE system SHALL flag the response and notify an admin.

## Review Visibility Rules

THE system SHALL display reviews in descending order by submission date (newest first).

WHEN reviews have identical submission dates, THE system SHALL sort them by helpful vote count (highest first).

IF a review has been flagged as inappropriate and is under admin review, THE system SHALL hide the review from all public views.

WHEN a product has fewer than 5 reviews published, THE system SHALL display: "We’re still collecting reviews for this product."

THE system SHALL display the average rating next to all product listings and on individual product pages, presented as a number (e.g., 4.3) with a 5-star visual indicator.

THE system SHALL display the total number of reviews next to the average rating, formatted as: "(142 reviews)."

WHEN a customer searches for a product, THE system SHALL include average rating and review count in search result snippets.

## Anonymous Review

THE system SHALL permit customers to submit reviews anonymously.

WHEN a customer submits an anonymous review, THE system SHALL display the reviewer as "Anonymous Customer." and hide all identifiable information.

WHILE a review is marked anonymous, THE system SHALL NOT display the user’s name, profile picture, or any other personal details.

THE system SHALL NOT allow anonymous reviews to receive seller responses.

IF a customer attempts to submit a review as anonymous and then later creates a seller account, THEN THE system SHALL maintain the anonymity of past reviews and NOT link them to the new seller identity.

## Review Editing

THE system SHALL allow customers to edit their own reviews within 48 hours of submission.

WHEN a review is edited, THE system SHALL mark it with: "Last edited: [Date]" and preserve the original submission date.

THE system SHALL allow editing of both star rating and written feedback during the 48-hour window.

WHEN a customer edits a review after the 48-hour window, THE system SHALL block the edit and display: "You can no longer edit this review."

IF a review is flagged or deleted after editing, THE system SHALL preserve the edit history only for admin audit purposes.

## Review Deletion

THE system SHALL allow customers to delete their own reviews at any time.

WHEN a customer deletes a review, THE system SHALL remove it from public view and mark it as "Deleted by User."

THE system SHALL NOT allow customers to delete a review if a seller has responded to it.

IF a seller has responded to a review, THEN THE system SHALL prevent the customer from deleting it and display: "You cannot delete this review because the seller has responded."

WHEN an admin deletes a review, THE system SHALL permanently remove it and record the reason: "Deleted by admin: [reason]."

THE system SHALL retain a soft-deleted copy of all reviews for legal and audit purposes, even if publicly removed.

An admin SHALL be able to view and filter all deleted reviews via the admin dashboard.

THE system SHALL NOT allow review deletion to affect the product’s average rating.

WHEN a review is deleted, THE system SHALL recalculate the product’s average rating based on remaining reviews, with immediate update on all product pages.

THE system SHALL update the review count immediately upon deletion, and propagate changes to search results and product listings.

WHEN a product is removed from the catalog, THE system SHALL retain all associated reviews and ratings for historical reference.

THE system SHALL NOT delete reviews when a product is discontinued or deactivated.

WHEN a seller is banned, THE system SHALL retain all reviews submitted by customers for their products.

THE system SHALL NOT automatically delete reviews of products associated with banned sellers.