# Review and Rating System Requirements

## 1. Review and Rating System Overview

The review and rating system is a critical component of the e-commerce shopping mall platform that enables customers to share their product experiences and sellers to build reputation and trust. The system supports two primary rating categories: product ratings (reviews of specific products) and seller ratings (evaluations of seller performance). This comprehensive system ensures authentic feedback, prevents fraudulent reviews, moderates inappropriate content, and provides valuable insights to customers, sellers, and platform administrators.

### Purpose and Business Value

WHEN customers purchase products, THE system SHALL enable them to rate and review their experience, creating a feedback mechanism that improves product quality, seller accountability, and platform trust. THE review system SHALL serve multiple stakeholders:

- **Customers**: Reviews help potential buyers make informed purchasing decisions by reading authentic feedback from verified buyers
- **Sellers**: Ratings provide reputation metrics that influence store visibility, customer trust, and business success
- **Platform**: Reviews generate user-generated content that improves SEO, increases engagement, and creates competitive advantages
- **Administrators**: Review data provides insights into product quality issues, seller performance problems, and potential platform risks

### System Components

The review and rating system consists of five major components:

1. **Review Submission Engine**: Manages customer review creation and submission
2. **Content Moderation System**: Validates and moderates reviews before publication
3. **Rating Aggregation Engine**: Calculates average ratings and rating distributions
4. **Review Discovery System**: Displays reviews to other customers with sorting and filtering
5. **Analytics and Reporting**: Provides insights to sellers, admins, and the platform

### Rating Hierarchy

The system supports ratings at multiple levels:

- **Product-Level Ratings**: Individual reviews of specific products with SKU-specific feedback
- **Seller-Level Ratings**: Aggregate performance ratings based on all orders from that seller
- **Review Helpfulness**: Community voting on whether reviews are helpful to other customers

---

## 2. Customer Review Submission

### Review Eligibility Requirements

WHEN a customer attempts to submit a product review, THE system SHALL first verify purchase eligibility. A customer MAY submit a review for a product only if they have:

- A completed order containing that product (order status is "Delivered" or "Completed")
- NOT already submitted a review for that exact product/SKU combination from that order
- A verified and active customer account with confirmed email address
- NOT had their review privileges suspended or revoked by administrators

IF a customer does not meet these eligibility criteria, THEN THE system SHALL display an appropriate error message explaining why they cannot leave a review and what conditions must be met.

### Review Submission Form Requirements

THE customer review submission form SHALL collect the following mandatory information:

**Rating Scale (Required)**
- WHEN a customer submits a product review, THE system SHALL require a numeric rating on a 1-5 star scale
- THE rating scale SHALL be defined as: 1 Star = Poor/Unsatisfied, 2 Stars = Fair/Somewhat Dissatisfied, 3 Stars = Good/Neutral, 4 Stars = Very Good/Satisfied, 5 Stars = Excellent/Very Satisfied
- THE customer SHALL NOT be able to submit a review without selecting a rating

**Review Title (Required)**
- THE system SHALL require a review title (50-150 characters) that summarizes the customer's overall opinion
- The title must be clear, concise, and relevant to the product

**Review Text (Required)**
- THE system SHALL require a detailed review text (minimum 20 characters, maximum 5000 characters)
- The review text SHALL contain the customer's detailed experience, product quality assessment, and relevant observations
- THE system SHALL reject reviews that fall below the minimum character requirement with a validation error

**Detailed Rating Criteria (Required)**
- THE system SHALL present detailed rating dimensions specific to product category where applicable:
  - For apparel: Fit (does it match described size?), Quality (material durability), Color accuracy, Overall impression
  - For electronics: Performance (does it work as described?), Build quality, Value for money, Reliability
  - For general products: Product quality, Matches description, Value for money, Overall satisfaction
- Each dimension SHALL be rated on a 1-5 scale independently
- THE system SHALL use these dimension ratings in the moderation process and detailed analytics

**Verification Questions (Conditional)**
- THE system MAY ask verification questions such as:
  - "How long have you used this product?" (Less than 1 week, 1-4 weeks, 1-3 months, 3+ months)
  - "Are you a Verified Buyer?" (automatically checked if order is verified)
  - "Would you recommend this product to others?" (Yes/No toggle)
  - "Would you buy from this seller again?" (Yes/No toggle)

**Reviewer Information (Auto-populated)**
- THE system SHALL auto-populate:
  - Customer display name (or allow customer to edit to "Anonymous" if preferred)
  - Verified Buyer badge (automatically added if customer purchased the product)
  - Purchase date and verification badge
- THE customer MAY choose to post as "Anonymous" to hide their name, but MUST still be verified as a buyer

### Review Submission Workflow

THE review submission process SHALL follow these steps:

1. **Review Initiation**: Customer clicks "Write a Review" button on product detail page
2. **Eligibility Check**: System verifies customer has purchased and received the product
3. **Form Display**: System presents the review submission form with all required and optional fields
4. **Content Input**: Customer fills in rating, title, and detailed review text
5. **Preview**: Customer reviews their submission before final submission
6. **Submission**: Customer submits the review
7. **Moderation Queue**: Review enters the moderation system (see Section 5)
8. **Notification**: Customer receives confirmation that their review has been submitted for moderation

### Attachment and Media Support

WHILE customers cannot attach files to reviews, THE system SHALL support these alternatives:

- Customers MAY add up to 5 product images/photos they took of the actual product (supporting JPEG, PNG formats, max 5MB each)
- THE system SHALL store these images and display them with the review to provide visual evidence
- Images MAY be added during review submission or within 7 days after initial submission

---

## 3. Rating Scale and Criteria

### Product Rating Dimensions

WHEN a customer submits a product review, THE system SHALL require detailed ratings across category-specific dimensions. Each dimension SHALL use the same 1-5 star scale:

**Universal Rating Dimensions (Applied to All Products)**
- **Overall Quality**: How well does the product meet quality expectations? (1=Poor quality, 5=Excellent quality)
- **Matches Description**: Does the product match the seller's description and photos? (1=Completely different, 5=Exactly as described)
- **Value for Money**: Is the product worth the asking price? (1=Very overpriced, 5=Great value)
- **Overall Satisfaction**: Overall, how satisfied are you with this purchase? (1=Very unsatisfied, 5=Extremely satisfied)

**Category-Specific Rating Dimensions**

**For Apparel and Fashion Products**:
- **Fit and Sizing**: Does the item fit as expected given the size selection? (1=Way too small/large, 5=Perfect fit)
- **Material and Comfort**: How comfortable is the material? Does it feel durable? (1=Uncomfortable/cheap, 5=Excellent material/comfort)
- **Color Accuracy**: Does the color match the product photos? (1=Completely different, 5=Exact match)

**For Electronics and Technology**:
- **Performance**: Does the product perform as specified? (1=Doesn't work properly, 5=Performs excellently)
- **Build Quality**: How durable and well-made is the product? (1=Feels cheap/fragile, 5=Premium build quality)
- **Ease of Use**: How easy is it to set up and use? (1=Very difficult, 5=Easy and intuitive)

**For Home and Kitchen Products**:
- **Durability**: How durable and long-lasting does the product feel? (1=Feels fragile, 5=Very durable)
- **Functionality**: Does the product work as intended? (1=Doesn't work well, 5=Works perfectly)
- **Design and Appearance**: Does it look good and match the product photos? (1=Ugly/doesn't match, 5=Looks great)

**For Beauty and Personal Care**:
- **Effectiveness**: Does the product deliver the promised results? (1=No effect, 5=Very effective)
- **Safety and Compatibility**: Is it safe for your skin/body type? (1=Causes issues, 5=Perfectly safe)
- **Scent and Texture**: Is the scent and texture pleasant? (1=Unpleasant, 5=Very pleasant)

### Composite Rating Calculation

THE system SHALL calculate a composite product rating by:

1. **Weighted Average**: Taking a weighted average of all dimension ratings, where:
   - Overall Quality: 35% weight
   - Matches Description: 30% weight
   - Value for Money: 20% weight
   - Overall Satisfaction: 15% weight
   - Category-specific dimensions: Included in moderation scoring but not primary calculation

2. **Formula**: Composite Rating = (Overall Quality × 0.35) + (Matches Description × 0.30) + (Value for Money × 0.20) + (Overall Satisfaction × 0.15)

3. **Display**: THE system SHALL round the composite rating to 1 decimal place (e.g., 4.3 stars)

### Seller Rating Dimensions

WHEN THE system calculates seller ratings based on multiple orders, THE system SHALL evaluate sellers across these dimensions:

**Seller Service Ratings** (based on multiple purchases from that seller):
- **Seller Communication**: How responsive and helpful is the seller? (1=Never responds, 5=Excellent communication)
- **Shipping Speed**: How quickly does the seller ship orders? (1=Very slow, 5=Ships immediately)
- **Accuracy**: Does the seller send exactly what was ordered? (1=Often wrong, 5=Always accurate)
- **Item Description Accuracy**: How accurate are the seller's product descriptions? (1=Very inaccurate, 5=Always accurate)
- **Overall Seller Experience**: Overall seller performance (1=Terrible, 5=Excellent)

THE seller composite rating SHALL be calculated as the average of all customer ratings for that seller across all purchases over a specified time period (see Section 7).

---

## 4. Review Content Validation

### Automatic Content Filtering

WHEN a customer submits a review, THE system SHALL automatically validate the content against these criteria BEFORE the review enters the moderation queue:

**Character and Length Validation**
- WHEN a review title is submitted, THE system SHALL verify it contains between 50-150 characters
- IF a title is outside this range, THEN THE system SHALL reject the submission with a specific error message
- WHEN review text is submitted, THE system SHALL verify it contains minimum 20 characters
- IF review text is below minimum, THEN THE system SHALL reject the submission

**Spam and Repetition Detection**
- THE system SHALL detect and flag reviews that appear to be duplicates or near-duplicates (identical or >80% similar text)
- THE system SHALL prevent customers from submitting multiple reviews for the same product within a 30-day period
- THE system SHALL detect obvious spam patterns (excessive use of URLs, promotional codes, competitor references)

**Profanity and Offensive Language Detection**
- THE system SHALL scan review content against a profanity filter database
- IF profanity or offensive language is detected, THEN THE system SHALL flag the review for manual moderation review
- THE system SHALL NOT automatically reject reviews with profanity, but SHALL flag them for moderator evaluation

**Prohibited Content Detection**
- THE system SHALL scan for and flag reviews containing:
  - Seller or product contact information (emails, phone numbers, URLs)
  - Competitor promotion or cross-promotion
  - Requests for personal information
  - Threats, harassment, or illegal content
  - External payment scheme references
  - Sexual or adult content
- IF prohibited content is detected, THEN THE system SHALL automatically flag for moderation review

**Validation Error Messages**
- WHEN validation fails, THE system SHALL provide clear, specific error messages explaining:
  - Exactly what validation rule failed
  - What the requirement is (e.g., "minimum 50 characters in title")
  - How many characters are needed or what to fix
  - An actionable correction suggestion

### Review Quality Scoring

THE system SHALL assign each submitted review a quality score (0-100) based on:

- **Completeness Score** (0-30 points):
  - Includes detailed review text (20 characters+): +10 points
  - Includes product images/media: +10 points
  - Addresses multiple product dimensions: +10 points

- **Authenticity Score** (0-40 points):
  - Customer is verified buyer: +15 points
  - Customer has multiple reviews: +10 points
  - Review doesn't match typical spam patterns: +10 points
  - Time between purchase and review is reasonable (1-180 days): +5 points

- **Relevance Score** (0-30 points):
  - Review mentions specific product features: +10 points
  - Review compares to similar products: +5 points
  - Review provides balanced perspective (not all positive/negative): +10 points
  - Review text naturally flows and is coherent: +5 points

REVIEWS with quality scores below 40 shall be flagged for closer manual review during moderation.

---

## 5. Review Moderation Process

### Moderation Workflow Overview

THE review moderation system shall implement a two-tier moderation approach:

**Tier 1: Automated Moderation** (Immediate, occurring within seconds of submission)
- Automatic content filtering and spam detection (Section 4)
- Quality scoring and flagging
- Classification of moderation risk level

**Tier 2: Manual Moderation** (Occurring within 24-48 hours)
- Human moderator review of flagged content
- Approval, rejection, or revision requests
- Appeal review for rejected reviews

### Moderation Risk Classification

WHEN a review is submitted, THE system SHALL classify it into one of three risk categories:

**Low Risk - Auto-Approved** (typically 60-70% of reviews)
- Verified buyer with proven review history
- Quality score above 70
- Passes all automated filters
- No prohibited content detected
- No spam or duplicate patterns
- ACTION: Review is automatically approved and published immediately

**Medium Risk - Requires Review** (typically 25-30% of reviews)
- Verified buyer but limited review history
- Quality score between 40-70
- Minor issues with automated filters (mild profanity, borderline content)
- Some spam indicators but not definitive
- ACTION: Review placed in moderation queue for human review within 24 hours

**High Risk - Requires Priority Review** (typically 5-10% of reviews)
- Unverified customer or no purchase history
- Quality score below 40
- Prohibited content detected
- Clear spam or duplicate patterns
- Excessive profanity or offensive language
- ACTION: Review placed in priority moderation queue for human review within 4 hours

### Manual Moderation Process

WHEN a moderator reviews a flagged review, they SHALL evaluate the following:

**Content Appropriateness**
- Is the review respectful and not abusive toward seller, product, or other customers?
- Does the review comply with community guidelines and platform policies?
- Is the review relevant to the product being reviewed?

**Authenticity Assessment**
- Is the review likely from a genuine customer?
- Do patterns suggest fraudulent or paid review schemes?
- Does the reviewer have legitimate purchase history?

**Accuracy Evaluation**
- Are factual claims in the review accurate or clearly opinion?
- Does the review contain misinformation about the product?
- Does the review make reasonable assessments?

### Moderator Actions

THE system SHALL support these moderation actions:

**APPROVE**: Review is published and becomes visible to all customers
- Triggers notification to reviewer that their review was approved
- Review appears on product page and in search results

**REJECT**: Review is not published and is removed from moderation queue
- THE moderator MUST select a rejection reason from:
  - Violates community guidelines
  - Contains prohibited content
  - Appears to be fraudulent or fake review
  - Contains offensive language
  - Does not meet content quality standards
  - Duplicate review
  - Off-topic or irrelevant content
- THE system SHALL notify the reviewer with the rejection reason and option to revise and resubmit
- Rejected reviews are retained in the system with metadata about rejection reason

**REQUEST REVISION**: Moderator asks reviewer to modify review before publication
- THE moderator specifies what needs to be changed (e.g., "Please remove the seller's contact information")
- THE system notifies the reviewer that changes are needed and provides specific revision instructions
- Reviewer has 7 days to revise and resubmit
- IF reviewer does not revise within 7 days, THE review is automatically rejected

**UNLIST**: Approved reviews that are later flagged can be unlisted (hidden but not deleted)
- Review remains in system but is no longer visible to customers
- Reviewer is notified of the action and provided explanation
- Unlisted reviews can be appealed

### Moderation Queue Management

THE system SHALL implement queue management with these features:

- **Priority Sorting**: High-risk reviews appear first in moderator queue
- **Age Tracking**: Reviews are sorted by submission time with oldest reviews prioritized
- **Backlog Prevention**: IF moderation queue has >500 reviews waiting >24 hours, system shall auto-approve low-risk reviews
- **Moderator Assignment**: Reviews are assigned to individual moderators to prevent duplicates
- **Review History**: All moderation actions are logged with moderator ID, timestamp, and reason

### Review Publication Timeline

- **Low-risk reviews**: Published immediately upon submission (within 1 minute)
- **Medium-risk reviews**: Published within 24 hours of submission (or auto-published if moderator doesn't act)
- **High-risk reviews**: Reviewed within 4-12 hours, published if approved
- **Rejected reviews**: Notification sent within 24 hours with revision options

---

## 6. Rating Aggregation and Display

### Product Rating Display

WHEN customers view a product detail page, THE system SHALL display comprehensive rating information:

**Star Rating Summary**
- THE system SHALL display the product's composite rating as a star rating (e.g., 4.3 out of 5 stars)
- THE rating SHALL be displayed prominently at the top of the product reviews section
- THE system SHALL round ratings to 1 decimal place

**Rating Distribution**
- THE system SHALL display a bar chart showing the distribution of all ratings:
  - Number and percentage of 5-star reviews
  - Number and percentage of 4-star reviews
  - Number and percentage of 3-star reviews
  - Number and percentage of 2-star reviews
  - Number and percentage of 1-star reviews
- THE system SHALL display these in descending order (5 stars at top)

**Review Count and Helpful Statistics**
- THE system SHALL display total number of reviews for the product
- THE system SHALL display percentage of customers who found reviews helpful (if applicable)
- THE system SHALL display the date range of reviews shown (e.g., "based on 1,234 reviews")

**Dimension-Specific Ratings**
- THE system SHALL display average ratings for each category-specific dimension (see Section 3)
- FOR EXAMPLE, for apparel: Average Fit Rating (4.2★), Average Material Quality (4.5★), etc.
- These help customers understand specific aspects of the product

### Review Sorting and Filtering

THE system SHALL allow customers to sort and filter reviews by:

**Sorting Options**
- **Most Helpful**: Sort by number of "helpful" votes (default sort)
- **Most Recent**: Sort by submission date, newest first
- **Highest Rating**: Sort by star rating, 5-star reviews first
- **Lowest Rating**: Sort by star rating, 1-star reviews first
- **Most Verified**: Verified buyer reviews appear first

**Filtering Options**
- **By Rating**: Show only reviews with specific star ratings (filter by 1★, 2★, 3★, 4★, or 5★)
- **By Review Length**: Show only detailed reviews (minimum 100+ characters)
- **By Verified Buyer**: Show only verified buyer reviews
- **By Media**: Show only reviews with attached photos/videos

### Review Display Format

WHEN displaying individual reviews, THE system SHALL show:

- **Reviewer Information**:
  - Reviewer name (or "Anonymous" if customer chose anonymity)
  - Verified Buyer badge (if applicable)
  - Review submission date (formatted as "Posted on [date]" or "Posted 2 weeks ago")
  - Reviewer's average rating (if reviewer has submitted multiple reviews)

- **Review Content**:
  - Star rating (displayed prominently with color: gold for positive, neutral for 3-star, red for negative)
  - Review title (formatted as heading)
  - Review text (formatted for readability)
  - Attached images/media (if applicable)
  - Dimension ratings if displayed

- **Interaction Elements**:
  - "Helpful" button to upvote review (text: "Was this review helpful?" with Yes/No buttons)
  - "Report" button to flag inappropriate reviews
  - Reply box for sellers to respond to reviews (for seller reviews, see Section 6.3)

### Rating Age and Recency Weighting

THE system SHALL weight older reviews less heavily when calculating composite ratings:

- **Review Age Factor**: 
  - Reviews from last 30 days: 100% weight
  - Reviews from 30-90 days: 90% weight
  - Reviews from 90-180 days: 80% weight
  - Reviews from 180+ days: 70% weight

- **Updated Composite Rating Formula**:
  - Composite Rating = (Sum of [Weighted Reviews]) / (Sum of Weights)
  - This ensures recent feedback is weighted more heavily than older feedback
  - THE system SHALL recalculate composite ratings daily to maintain freshness

### Review Helpfulness Tracking

WHEN customers vote on whether a review was helpful, THE system SHALL:

- **Track Votes**: Record customer votes on review helpfulness (Yes/No)
- **Prevent Duplicate Voting**: Prevent customers from voting more than once per review
- **Display Helpfulness Score**: Show "X out of Y customers found this review helpful"
- **Influence Sorting**: Reviews with higher helpfulness votes appear first in the default sort
- **Threshold Enforcement**: IF a review accumulates more than 10 "not helpful" votes than "helpful" votes, THE system SHALL automatically hide it from primary display and flag for moderation review

---

## 7. Seller Ratings and Performance

### Seller Rating Calculation

THE seller rating system SHALL calculate ratings based on customer feedback across multiple orders from that seller. The seller composite rating is calculated differently from product ratings:

**Seller Composite Rating Components**

THE seller rating SHALL be calculated using:

1. **Seller Service Ratings** (40% weight):
   - Average of "Seller Communication" ratings from all recent reviews
   - Average of "Shipping Speed" ratings from all recent reviews
   - Average of "Seller Accuracy" ratings from all recent reviews
   - These three sub-dimensions are equally weighted: 13.3% each

2. **Item Description Accuracy** (30% weight):
   - Average accuracy ratings about whether items match seller's descriptions
   - Directly impacts seller trustworthiness

3. **Order Fulfillment Performance** (20% weight):
   - On-time delivery percentage (target: 95%+)
   - Order accuracy percentage (correct items, correct quantity)
   - Return/refund request rate (lower is better)

4. **Customer Satisfaction** (10% weight):
   - Percentage of orders with positive feedback
   - Repeat customer percentage
   - Net Promoter Score (would customers buy again?)

**Composite Seller Rating Formula**:
```
Seller Rating = (Seller Service Ratings × 0.40) + 
                (Item Description Accuracy × 0.30) + 
                (Order Fulfillment Performance × 0.20) + 
                (Customer Satisfaction × 0.10)
```

### Seller Rating Display

WHEN customers view a seller's store or products from that seller, THE system SHALL display:

**Seller Rating Summary**
- THE seller's composite rating displayed as stars (e.g., 4.6 out of 5 stars)
- Total number of reviews/ratings for that seller
- Seller badge status (e.g., "Top Seller", "Trusted Seller", "New Seller")
- Performance metrics: "Positive Feedback Rate: 96%"

**Seller Performance Metrics**
- THE system SHALL display:
  - Average response time (e.g., "Responds within 2 hours")
  - Shipping speed (e.g., "Ships within 1-2 business days")
  - Return policy clarity (e.g., "30-day returns accepted")
  - Join date (e.g., "Selling since 2020")
  - Total products sold (e.g., "10,000+ orders")

**Seller Badges**
- THE system SHALL award seller badges based on rating and performance:
  - **Top Seller Badge**: 4.6+ stars, 200+ reviews, 95%+ positive feedback
  - **Trusted Seller Badge**: 4.3+ stars, 100+ reviews, 90%+ positive feedback
  - **New Seller Badge**: Less than 30 days on platform or fewer than 10 reviews
  - **Verified Seller Badge**: Email verified, phone verified, payment method verified

### Seller Response to Reviews

WHEN a customer leaves a review for a product from a seller, THE seller MAY respond to that review:

**Seller Response Capabilities**
- THE seller can write up to one response per review
- THE seller response is limited to 1000 characters
- THE seller response must be professional and respectful
- THE seller response appears directly below or next to the original review
- THE system SHALL NOT allow sellers to edit or delete customer reviews

**Seller Response Moderation**
- THE system SHALL apply automatic content filtering to seller responses
- IF a seller response violates community guidelines (abusive, spam, etc.), THE system SHALL reject it
- THE system SHALL allow sellers to edit their own responses within 7 days of posting

**Seller Response Purpose**
- Sellers should use responses to:
  - Address customer concerns professionally
  - Provide additional context or clarification
  - Offer solutions to product issues
  - Thank customers for positive feedback
- Sellers should NOT use responses to argue with customers or solicit positive reviews

---

## 8. Review Authenticity and Helpfulness

### Fraud Detection System

THE system SHALL implement automated fraud detection to identify suspicious review patterns:

**Account-Based Fraud Indicators**
- THE system SHALL flag for review if:
  - Multiple reviews submitted from same IP address for same product (potential coordinated fake reviews)
  - Reviewer has no purchase history but submitted multiple reviews
  - Reviewer account is brand new (less than 1 day old) and submitting reviews
  - Reviewer account created right before suspicious reviews were submitted
  - Reviewer has submitted 20+ reviews in 7 days (potential review farm)

**Content-Based Fraud Indicators**
- THE system SHALL flag reviews for manual inspection if:
  - Review text is identical or nearly identical (>95%) to other reviews for same product
  - Review mentions competitor products or links to external stores
  - Review contains obvious promotional language or brand names
  - Review uses language patterns inconsistent with previous reviews by same user
  - Review rating and text sentiment are contradictory (e.g., 1-star rating with "excellent product" text)

**Behavior-Based Fraud Indicators**
- THE system SHALL flag accounts with:
  - Abnormally high concentration of extreme ratings (95%+ 5-star or 1-star reviews)
  - Reviews only for products from one seller (potential paid reviews)
  - Voting pattern showing unusually high "helpfulness" votes on all reviews
  - Multiple accounts voting on same review from similar IP addresses

### Authenticity Scoring

WHEN evaluating review authenticity, THE system SHALL assign an authenticity score (0-100):

**Authenticity Scoring Factors**
- **Verified Purchase**: Verified buyers score +30 points
- **Review History**: Reviewers with established history (5+ reviews) score +15 points
- **Account Age**: Accounts older than 90 days score +10 points
- **Content Quality**: Well-written, detailed reviews score +15 points
- **Balanced Feedback**: Reviews that aren't all positive or all negative score +10 points
- **Absence of Fraud Indicators**: No fraud patterns detected scores +20 points

REVIEWS with authenticity scores below 40 SHALL be flagged for manual moderation review. Reviews with scores below 20 may be automatically rejected.

### Verification Mechanisms

THE system SHALL use these mechanisms to verify review authenticity:

**Verified Buyer Requirement**
- THE system SHALL mark reviews as "Verified Purchase" only if:
  - Customer account that submitted review matches customer account on actual order
  - Order status is "Delivered" or "Completed"
  - Customer email is verified
  - System can confirm purchase within order database

**Time-Based Verification**
- THE system SHALL verify the review submission timing:
  - IF review is submitted less than 1 day after purchase, flag as potential "rush review"
  - IF review is submitted more than 365 days after purchase, flag as potential "outdated review"
  - IDEAL window: 7-180 days after purchase (most credible reviews)

**Product SKU Matching**
- THE system SHALL verify that reviews reference the correct product variant:
  - Reviews should reference product features actually available in the ordered SKU
  - IF review mentions features not in ordered SKU, flag for moderator review

**Purchase Intent Matching**
- THE system SHALL verify consistency between:
  - Customer purchase history (do they regularly buy similar products?)
  - Review content (does review mention relevant features for regular buyers?)
  - Rating patterns (are ratings consistent with customer's historical patterns?)

### Review Removal for Authenticity Violations

IF a review is found to violate authenticity requirements AFTER publication, THE system SHALL:

**Immediate Actions**
- UNLIST the review (hide from public view)
- FLAG the reviewer account for suspicious activity
- IF multiple authenticity violations: SUSPEND reviewer account and require manual approval for future reviews

**Notification**
- THE system SHALL notify the reviewer that their review was removed due to authenticity concerns
- THE system SHALL provide guidance on authentic review submission

**Appeal Process**
- THE reviewer MAY appeal the removal by contacting support
- Appeals are reviewed by senior moderators
- IF appeal is denied twice, THE system SHALL implement stricter review requirements for that reviewer

---

## 9. Review Removal and Appeals

### Review Removal Reasons

REVIEWS may be removed from public display under the following circumstances:

**Moderation Violations**
- Review contains prohibited content (threats, harassment, etc.)
- Review contains offensive language
- Review violates community guidelines
- Review is identified as fraudulent or fake
- Review contains external contact information

**Policy Violations**
- Review is duplicate or near-duplicate of another review by same user
- Review is off-topic and doesn't relate to the product
- Review is spam or promotional content
- Review contains seller or product contact information

**Authenticity Issues**
- Review fails authenticity verification (fraud indicators)
- Reviewer account is confirmed to be fake or compromised
- Review is part of coordinated review attack or manipulation scheme

**Customer Request**
- Customer who submitted review requests removal
- Customer requests anonymization of review

**Seller Request**
- Seller requests removal for specific reasons (request is reviewed by admin)

### Review Removal Process

WHEN THE system determines a review should be removed:

**Removal Levels**

1. **HIDE**: Review is hidden from public display but retained in system
   - Customer can still see their own review in their profile
   - Reason: Authenticity concerns, policy violations
   - Timeline: Immediate or after manual review

2. **ARCHIVE**: Review is removed from active display and archived
   - Review metadata retained for analytics
   - Only admins can view archived reviews
   - Reason: Harmful content, fraud confirmed
   - Timeline: After manual review

3. **DELETE**: Review is permanently deleted from system (rare)
   - Used only for illegal content or severe violations
   - Notification sent to reviewer
   - Timeline: After admin approval

**Removal Notification**
- WHEN a review is removed, THE system SHALL notify the reviewer within 24 hours
- Notification SHALL include:
  - Reason for removal (from predefined list)
  - Which policy or guideline was violated
  - Option to appeal the removal
  - Instructions for editing and resubmitting (if applicable)

### Review Removal Appeals

IF a customer disagrees with review removal, THE system SHALL support appeals:

**Appeal Process**
- WHEN a customer submits an appeal, THE system SHALL:
  - Log the appeal with timestamp and appeal reason
  - Assign the appeal to a senior moderator for review
  - Review the original moderation decision and appeal argument
  - Make a final determination within 7 days

**Appeal Grounds**
- Customer believes removal was made in error
- Customer believes the reason given is inaccurate
- Customer believes their review should be restored with revision
- Customer disputes authenticity allegations

**Appeal Outcomes**
- **Appeal Approved**: Review is restored to public display
- **Appeal Partially Approved**: Review is restored with modifications (e.g., removal of offensive language)
- **Appeal Denied**: Original removal decision is upheld
- Outcome notification is sent to reviewer within 24 hours

**Repeated Appeals**
- IF same reviewer submits more than 3 appeals on different reviews, THE system may require moderator approval for future appeals
- IF appeals become abusive or frivolous, THE system may restrict appeals for that account

### Customer Request for Review Removal

WHEN a customer who submitted a review requests its removal:

**Removal Request Conditions**
- Customer request can be submitted at any time
- Customer must provide reason for removal request
- THE system SHALL approve removal requests unless:
  - Review provides valuable feedback needed by other customers
  - Request appears to be retaliatory (customer received negative seller feedback)
  - Customer is attempting to manipulate ratings by removing negative review

**Typical Removal Reasons Accepted**
- "I wrote this in anger and don't stand by it"
- "Situation has been resolved with the seller"
- "Personal information was accidentally included"
- "I no longer own or use the product and don't want review to mislead"

**Processing**
- Customer requests are processed within 24-48 hours
- IF approved, review is hidden (not deleted) in case disputes arise
- Customer receives confirmation of removal

---

## 10. Analytics on Reviews and Ratings

### Review and Rating Metrics

THE system SHALL track and calculate the following metrics for products, sellers, and the platform:

**Product-Level Analytics**

- **Rating Metrics**:
  - Average composite rating (updated daily)
  - Rating trend over time (is rating trending up or down?)
  - Rating distribution (percentage of 1-star, 2-star, etc.)
  - Median rating (middle value of all ratings)
  - Standard deviation (measure of rating consistency)

- **Review Metrics**:
  - Total number of reviews
  - Reviews per month (trend)
  - Average review length (character count)
  - Percentage of detailed reviews (100+ characters)
  - Review velocity (how quickly reviews are accumulating)

- **Engagement Metrics**:
  - Average helpfulness rating (percentage who found review helpful)
  - Total helpfulness votes (up and down)
  - Number of reviews with seller responses
  - Number of reviews with images/media attached
  - Review publication rate (percentage approved vs rejected)

- **Dimension Analytics**:
  - For each category-specific dimension (fit, quality, performance, etc.):
    - Average rating per dimension
    - Dimension-specific trends
    - Which dimensions drive overall satisfaction most

**Seller-Level Analytics**

- **Rating Metrics**:
  - Composite seller rating (updated daily)
  - Rating trend (improving or declining)
  - Comparison to category average
  - Comparison to top sellers in category

- **Performance Metrics**:
  - On-time delivery rate (percentage of orders shipped on time)
  - Order accuracy rate (percentage of correct orders)
  - Return/refund rate (percentage of orders with returns)
  - Customer satisfaction score (percentage satisfied)
  - Repeat purchase rate (percentage of customers buying again)

- **Response Metrics**:
  - Average response time to customer questions
  - Number of reviews seller has responded to
  - Quality of seller responses (if rated)

**Platform-Level Analytics**

- **Aggregate Metrics**:
  - Total reviews on platform per month
  - Average product rating across all products
  - Review publication rate (percentage approved)
  - Review moderation metrics (average moderation time)
  - Most reviewed products
  - Lowest rated products (flagged for investigation)
  - Highest rated sellers vs lowest

- **Content Quality Metrics**:
  - Average review length platform-wide
  - Percentage of detailed vs brief reviews
  - Percentage of reviews with images
  - Percentage of reviews with seller responses

- **Fraud Metrics**:
  - Number of fraudulent reviews detected per month
  - Number of fake reviews removed
  - Number of accounts suspended for review fraud
  - Fraud detection rate (percentage caught)

### Analytics Dashboards

**Seller Analytics Dashboard**
WHEN a seller logs into their account, THE system SHALL provide an analytics dashboard showing:
- Current store rating and trend
- Number of reviews received this month
- Breakdown of 5-star, 4-star, 3-star, 2-star, 1-star reviews
- Average rating per product
- Recent customer reviews with seller's response status
- Performance metrics (on-time delivery, accuracy, etc.)
- Comparison to category average

**Admin Analytics Dashboard**
WHEN an admin accesses the platform analytics, THE system SHALL provide:
- Platform-wide review statistics
- Top reviewed products
- Lowest rated products (with alert if below 2.5 stars)
- Fraud and authenticity metrics
- Moderation queue status and metrics
- Seller performance benchmarks
- Customer satisfaction trends
- Searchable review database with filters

**Product Manager Analytics**
WHEN product managers access analytics, THE system SHALL provide:
- Product performance metrics
- Review trend analysis
- Dimension-specific feedback
- Customer feedback themes and patterns
- Feedback comparison across product lines

### Review Analytics Reports

THE system SHALL generate automated reports available to administrators:

**Monthly Review Report**
- Generated and sent on 1st of each month
- Contains: Review volume, ratings trends, fraud metrics, moderation performance
- Includes anomalies or products needing attention

**Seller Performance Report**
- Generated quarterly
- Contains: Rating trends, performance metrics, customer feedback themes
- Identifies top performers and at-risk sellers

**Content Quality Report**
- Generated monthly
- Analyzes: Review length, detail level, helpful votes, moderation decisions
- Identifies trends in content quality

### Fraud and Anomaly Detection Reporting

THE system SHALL automatically detect and report suspicious patterns:

**Fraud Alerts**
- WHEN a seller receives more than 5 reviews in a single day with nearly identical text, ALERT administrator
- WHEN a product receives 10+ 1-star reviews within 24 hours, ALERT administrator
- WHEN an account is detected submitting 20+ reviews from same IP in 24 hours, ALERT administrator

**Product Alerts**
- WHEN a product's rating drops below 2.5 stars, ALERT product manager and seller
- WHEN a product receives no reviews for 60 days after strong initial feedback, ALERT admin

**Seller Alerts**
- WHEN seller rating drops below 4.0 stars, ALERT seller
- WHEN seller response rate drops below 80%, ALERT seller
- WHEN on-time delivery rate falls below 90%, ALERT seller

---

## 11. Business Rules and Constraints

### Review Submission Constraints

- CUSTOMERS can submit maximum one review per product/SKU purchased (from same order)
- CUSTOMERS cannot submit reviews for products they haven't purchased
- CUSTOMERS cannot submit reviews until order is delivered/completed
- CUSTOMERS can submit reviews up to 365 days after purchase
- REVIEWS must include both rating and text (minimum 20 characters)
- REVIEWS must include specific dimension ratings for their product category
- CUSTOMERS can only edit their own reviews within 7 days of submission
- CUSTOMERS can delete their reviews at any time
- DELETED reviews are hidden but not removed from database

### Review Moderation Constraints

- ALL reviews require moderation within 48 hours maximum (24 hours target)
- LOW-RISK reviews auto-publish within 1 minute
- REJECTED reviews retain rejection reason in database for appeals
- MODERATORS cannot delete reviews, only hide/archive them
- MODERATORS must provide specific reason for any rejection or unlist action
- APPEALS must be reviewed within 7 days
- ADMIN must approve any account suspension related to fraudulent reviews

### Rating Calculation Constraints

- PRODUCT ratings are calculated only from approved, visible reviews
- SELLER ratings are calculated only from orders older than 3 days (ensure timely feedback)
- RATINGS are recalculated daily to reflect most current data
- HISTORICAL ratings are preserved in system for trend analysis
- RATING weights cannot be changed without admin approval and documentation

### Content Standards

- REVIEWS must be in the language of the product listing or English
- REVIEWS cannot contain URLs, email addresses, or phone numbers
- REVIEWS cannot contain seller contact information or promotional codes
- REVIEWS cannot contain competitor names or cross-promotion
- REVIEWS must stay relevant to the specific product reviewed
- REVIEWS cannot be abusive, harassing, or threatening toward any person or entity

---

## 12. Integration with Related Processes

### Review Eligibility Based on Order Status

THE review system SHALL integrate with the order management system to:

- **Prevent reviews before delivery**: WHEN customer attempts to submit review, THE system SHALL check if order status is "Delivered" or "Completed"
- **Prevent duplicate reviews**: THE system SHALL check if customer has already submitted review for that product from that order
- **Ensure verified purchase**: THE system SHALL mark reviews as "Verified Purchase" only if customer account matches order account
- **Return order eligibility**: IF order is returned/refunded, reviews can still remain but are clearly marked as "Customer returned this item"

### Seller Communication Integration

THE review system SHALL integrate with seller communication tools to:

- **Notify sellers of reviews**: WHEN review is published, THE system SHALL notify the seller via email
- **Review response notification**: WHEN seller responds to review, THE system SHALL notify customer
- **Quality alerts**: IF product from seller falls below 3.5-star rating, THE system SHALL notify seller

### Product Visibility Impact

RATINGS SHALL affect product visibility and search ranking:

- **Search Ranking Factor**: Higher-rated products appear higher in search results (weight: 15% of ranking algorithm)
- **Featured Product Eligibility**: Products must have 4.2+ stars and 20+ reviews to be eligible for featured placement
- **Low Rating Warnings**: Products below 2.5 stars display warning banner on product page

### Admin Dashboard Integration

THE review system SHALL feed data into admin analytics:

- **Platform Health Metrics**: Review quality, fraud rate, moderation performance
- **Seller Performance Monitoring**: Rating trends, product feedback, quality issues
- **Customer Feedback Analysis**: Common complaint themes, feature requests identified in reviews

---

## Conclusion

The Review and Rating System is fundamental to the e-commerce platform's success, creating trust, reducing purchase risk for customers, and providing actionable feedback to sellers and the platform. The system combines automated fraud detection with human moderation to ensure authenticity while maintaining operational efficiency. By providing transparent, aggregated rating data and detailed analytics, the platform enables data-driven decision-making for sellers and administrators while building customer confidence in the marketplace.

The system's sophistication in detecting fraudulent reviews, calculating meaningful ratings, and providing granular feedback dimensions ensures that the platform maintains integrity while delivering genuine value to all stakeholders.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, authentication mechanisms, caching strategies, etc.) are at the discretion of the development team. Developers have full autonomy to choose the best technical approach for review storage, rating calculations, fraud detection algorithms, and moderation workflows.*