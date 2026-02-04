# Reviews and Ratings

## Review Eligibility

- WHEN a customer completes the delivery of an order item, THE system SHALL allow the customer to write a review for that product.
- IF the order item status is not "delivered", THEN THE system SHALL prevent review creation and display an appropriate message to the customer.
- WHERE a customer has multiple order items for the same product in different orders, THE system SHALL allow one review per product per order.
- WHILE the product order item status is still "paid" or "shipped", THE system SHALL disable the review submission interface and indicate the item is not yet eligible for review.
- IF a product has been permanently deleted by the seller, THEN THE system SHALL prevent new review creation but preserve any existing reviews linked to that product.

## Review Creation

- WHEN a customer initiates review creation for an eligible product, THE system SHALL display a form with:
  - A star rating field (1 to 5 stars, required)
  - A text content field (optional, maximum 2,000 characters)
- THE system SHALL require at least one star to be selected before allowing form submission.
- WHEN the customer submits the review, THE system SHALL:
  - Associate the review with the specific product and the corresponding order item
  - Record the customer ID, review timestamp, and product ID
  - Store the rating and optional text content
- THE system SHALL prevent duplicate reviews for the same product within the same order by checking for an existing review record with matching customer_id and item_id.
- IF the customer has already submitted a review for this product in this order, THEN THE system SHALL display "Review already submitted" and disable form submission.

## Review Editing

- WHEN a customer edits their existing review, THE system SHALL:
  - Preserve the original review as a snapshot in immutable storage
  - Record the revision timestamp and the user who made the change
  - Update the display with the new rating and/or text content
- THE system SHALL allow editing only if the review was created within the last 30 days.
- WHERE a review is edited, THE system SHALL create a snapshot with:
  - Original rating (numeric value)
  - Original text content
  - Edited rating (numeric value)
  - Edited text content
  - Timestamp of edit
  - Customer ID
- THE system SHALL not allow editing if the product has been permanently deleted.
- IF the review has been edited before, THEN THE system SHALL preserve all previous snapshots in immutable history accessible for audit purposes.

## Review Deletion

- WHEN a customer deletes their review, THE system SHALL:
  - Mark the review as "deleted" in the active display list
  - Preserve the full review data (rating, text, timestamps) in an immutable snapshot
  - Change the displayed review text to "deleted user"
  - Retain the rating in calculation of the product's average rating
- THE system SHALL NOT delete the review record or its associated snapshot.
- IF a review is deleted, THE system SHALL preserve the history to support audit or dispute resolution.
- WHERE an administrator deletes a review, THE system SHALL create a snapshot with:
  - Reason for deletion (provided by admin)
  - Administrator ID
  - Timestamp
  - Original review content
- THE system SHALL prevent deletion by customers if more than 30 days have passed since review creation.

## Rating Calculation

- THE system SHALL calculate the average rating of a product using all non-deleted reviews.
- WHERE a review is deleted by the user, THE system SHALL retain its numeric rating in the average calculation but exclude its text from display.
- IF a review is deleted by an administrator, THE system SHALL remove its numeric rating from the average calculation.
- THE system SHALL calculate the average rating dynamically on every display.
- THE system SHALL round the average rating to one decimal place for display.
- IF no non-deleted reviews exist for the product, THE system SHALL show "No ratings yet".
- THE system SHALL display the total number of non-deleted reviews alongside the average rating.

## Review Visibility

- WHEN a customer views a product detail page, THE system SHALL display reviews sorted by newest first (by creation timestamp).
- THE system SHALL show:
  - Rating (stars)
  - Review text (or "deleted user" if the review was deleted by the customer)
  - Reviewer display name (or "deleted user" if review was deleted)
  - Creation timestamp
- WHEN a review is edited, THE system SHALL display only the latest version in the public list, but preserve the full edit history in snapshots.
- THE system SHALL not display reviews for deleted products.
- IF a customer attempts to view their own deleted review, THE system SHALL show their original content in a history panel accessible only to them.
- WHEN a seller views the product reviews dashboard, THE system SHALL show:
  - All non-deleted reviews (with customer display names)
  - Deleted reviews marked as "deleted by customer"
  - Admin-deleted reviews marked as "deleted by administrator"
  - Total review count and average rating
- THE system SHALL allow administrators to view all reviews including original content, even if deleted.
- WHERE a review contains profanity or violates platform policy, THE system SHALL allow administrators to hide it from public view without deleting it, while keeping it available for auditing.

## Snapshot Preservation

- THE system SHALL preserve every review modification through a snapshot mechanism as defined by the Snapshot Principle.
- Each snapshot SHALL contain:
  - The timestamp of change
  - The actor who performed the change (user or admin)
  - The before and after state of all changed fields
  - The unique identifier of the review being modified
  - The identity of the associated product and order item
- Snapshots SHALL be immutable and non-deletable.
- Snapshots SHALL be accessible to:
  - The review author (view only their own history)
  - The product seller (view review history for their products)
  - Administrators (view all review history)
- Snapshot data SHALL NOT be used for any purpose other than audit and dispute resolution.

## Access Control

- THE system SHALL enforce the following access control rules for review operations:
  - Customer: Can create, edit (within 30 days), and delete own reviews
  - Seller: Can view all reviews for their products, including deleted ones (marked as such), but cannot edit or delete
  - Administrator: Can view all reviews (including original content of deleted reviews), delete reviews with reason, and hide reviews from public view
- THE system SHALL prevent unauthorized access to review data based on actor role.
- THE system SHALL log all review modification attempts (successful and failed) for audit trails.

## Error Handling

- IF a customer attempts to write a review for an ineligible product (status not delivered), THE system SHALL return a clear error message: "You can only review products after they have been delivered."
- IF a customer attempts to edit a review after 30 days, THE system SHALL return: "Reviews can only be edited within 30 days of creation."
- IF a customer attempts to delete a review after 30 days, THE system SHALL return: "Reviews can only be deleted within 30 days of creation."
- IF a review submission fails due to system error, THE system SHALL display: "Unable to submit review. Please try again later."
- IF a snapshot creation fails, THE system SHALL log the error and display: "Review was submitted, but the history may not be preserved. Please contact support."

## Performance Requirements

- THE system SHALL calculate product average ratings and review counts in under 500 milliseconds on average.
- THE system SHALL retrieve a product's review list (including pagination) in under 1 second for up to 100 reviews.
- THE system SHALL respond to review creation, editing, or deletion requests within 2 seconds under normal load.
- THE system SHALL support concurrent review submissions by multiple users without data corruption.

## Scalability Requirements

- THE system SHALL support up to 10 million reviews per product category.
- THE system SHALL handle 1,000 review submissions per minute during peak traffic.
- THE system SHALL preserve snapshots of 100 million review edits while maintaining query performance.
- THE system SHALL store snapshots indefinitely with no expiration policy.

## Compliance and Audit Requirements

- THE system SHALL comply with all applicable data retention regulations (e.g., GDPR, CCPA) regarding review data.
- ALL snapshot data SHALL be stored in encrypted form and accessible only to authorized personnel.
- THE system SHALL provide exportable audit logs of all review modifications for legal compliance.
- THE system SHALL retain review data for a minimum of 7 years after product end-of-life.

## Integration Requirements

- THE review system SHALL integrate with the Order Service to validate order item status before allowing review creation.
- THE review system SHALL integrate with the Product Service to verify product existence and deletion status.
- THE review system SHALL emit events for key actions:
  - "ReviewCreated"
  - "ReviewEdited"
  - "ReviewDeleted"
  - "ReviewSnapshotPersisted"
- THE system SHALL expose a REST API endpoint for external systems to query review statistics (read-only).

## Business Rules Summary

| Rule Type | Rule | Status |
|-----------|------|--------|
| Creation | One review per product per order | Enforced |
| Editing | Editable within 30 days of creation | Enforced |
| Deletion | Deleteable within 30 days of creation | Enforced |
| Visibility | Deleted reviews show "deleted user" | Enforced |
| Rating | User-deleted reviews still affect average | Enforced |
| Admin | Admin-deleted reviews remove rating from average | Enforced |
| Snapshot | All edits and deletions create immutable snapshot | Enforced |
| Access | Sellers see review history, cannot delete | Enforced |
| Compliance | 7-year retention enforced | Enforced |

## Use Cases

### UC-1: Customer Writes Review After Delivery

1. Customer receives product (order item status becomes "delivered")
2. Customer navigates to product page
3. System displays "Write a review" button
4. Customer clicks button and opens review form
5. Customer selects 5 stars and writes: "Excellent product, highly recommend!"
6. Customer submits
7. System validates eligibility
8. System creates review record
9. System emits "ReviewCreated" event
10. System updates product average rating
11. Review appears on product detail page

### UC-2: Customer Edits Review Within 30 Days

1. Customer previously wrote review on Day 1
2. On Day 15, customer returns to product page
3. System displays "Edit review" option
4. Customer changes rating from 4 to 5 stars and adds: "Even better than I thought!"
5. Customer submits edit
6. System creates snapshot of original review
7. System updates visible review data
8. System preserves full edit history
9. System emits "ReviewEdited" event
10. Product average rating recalculated

### UC-3: Customer Deletes Review

1. Customer has written review on Day 1
2. On Day 10, customer decides to delete review
3. Customer clicks "Delete review"
4. System displays confirmation dialog
5. User confirms
6. System creates snapshot of review with deletion flag
7. System marks review as "deleted" in display
8. System retains rating in average calculation
9. Text display replaced with "deleted user"
10. System emits "ReviewDeleted" event

### UC-4: Admin Deletes Review for Policy Violation

1. Admin receives report of offensive review content
2. Admin reviews content and verifies violation
3. Admin clicks "Delete review"
4. Admin enters reason: "Violates hate speech policy"
5. Admin confirms deletion
6. System creates snapshot including original text and admin reason
7. System removes review rating from product average
8. System hides review from public view
9. System notifies customer: "Your review was removed for violating our community guidelines."
10. System emits "ReviewDeletedByAdmin" event

### UC-5: Customer Views Deleted Review History

1. Customer deleted their own review
2. Customer revisits product page
3. Customer clicks "View edit history"
4. System authenticates customer identity
5. System retrieves all snapshots for that customer's review
6. System displays:
   - Date: Day 1 - Rating: 5, Text: "Great product!"
   - Date: Day 15 - Rating: 4, Text: "Good but not great"
   - Date: Day 20 - Status: Deleted (self-deleted)
7. Customer cannot make further changes

### UC-6: Seller Views Review History for Their Product

1. Seller logs into dashboard
2. Seller navigates to "Product Reviews"
3. Seller selects their product
4. System shows:
   - 12 non-deleted reviews
   - 3 reviews marked "deleted by customer"
   - 1 review marked "deleted by administrator"
   - Average rating: 4.7
5. Seller clicks on "deleted by customer" to view original content (read-only)
6. Seller cannot edit, delete, or hide reviews
7. Seller exports review data for analysis (read-only CSV)

### UC-7: Admin Views All Reviews with Original Content

1. Admin logs into admin panel
2. Admin selects "Review Audit"
3. Admin searches for a specific product
4. System shows all reviews including:
   - Original content for all deleted reviews
   - Reason for admin deletion
   - Timestamp of each change
   - Actor who made changes
5. Admin can filter by:
   - Product ID
   - Customer ID
   - Date range
   - Deletion reason
6. Admin generates comprehensive audit report

### UC-8: Order Item Becomes Delivered - Review Eligibility Trigger

1. Shipping service notifies system that package has been delivered
2. System updates corresponding order item status to "delivered"
3. System scans all customer profiles
4. For each customer with an item now "delivered" and no existing review:
   - System sends one-time notification: "You can now review your purchase: [Product Name]"
   - System enables "Write a review" button in the product page UI
5. System emits "ReviewEligibilityUpdated" event

### UC-9: Product is Deleted by Seller

1. Seller deletes product from catalog
2. System updates product status to "deleted"
3. System locks all product attributes from modification
4. System prevents any NEW review creation for this product
5. System preserves all existing reviews and snapshots
6. System hides product from search and category results
7. System continues to display reviews for the product (with "deleted product" banner)
8. System emits "ProductDeleted", "ReviewEligibilityUpdated" events

### UC-10: Customer with Multiple Orders for Same Product

1. Customer orders Product A on Order #1 on April 1
2. Customer orders Product A on Order #2 on April 15
3. Order #1 delivers on April 5 - customer writes review
4. Order #2 delivers on April 20 - customer writes second review
5. System allows both reviews (different orders)
6. Both reviews appear on product page with timestamps
7. Average rating combines both
8. System shows: "2 reviews from this customer"
9. Customer can edit or delete each review independently
10. System does not treat these as duplicates

## Additional Notes

- This document provides a complete specification for the review and rating system.
- All business rules, workflows, and technical constraints are documented in EARS format.
- Snapshots, user roles, access controls, and audit trails are fully specified.
- Edge cases and error scenarios have been thoroughly addressed.
- This specification is implementation-ready for backend development.